# Plan — Card scan dataset filling

## Objectif

Faire évoluer la fonctionnalité `card-scan` afin que chaque carte physique visible dans une image produise un crop stocké dans un stockage compatible S3 et un échantillon unitaire dans une collection MongoDB dédiée.

Ces échantillons serviront à constituer un futur dataset d'entraînement permettant de reconnaître une carte parmi plusieurs candidats. La prédiction initiale, les candidats Scryfall et la version finalement vérifiée doivent rester traçables séparément.

L'ensemble du pipeline doit rester isolé dans le domaine `card-scan` afin de pouvoir être déplacé simplement dans un worker dédié.

## Principes d'architecture

- Une carte physique visible correspond à un échantillon de dataset.
- Les coordonnées fournies par le modèle sont relatives et indépendantes de la résolution de l'image.
- La prédiction initiale n'est jamais écrasée par une correction utilisateur.
- Un label automatique est distingué d'un label confirmé manuellement.
- Les appels à OpenRouter, Scryfall, Sharp, MongoDB et S3 sont placés derrière des interfaces internes.
- Le pipeline ne dépend ni du contrôleur HTTP, ni de Multer, ni de l'authentification Nest.
- La création et la mise à jour des échantillons sont idempotentes pour supporter les retries d'un futur worker.
- Les données du dataset ont leur propre politique de rétention et ne disparaissent pas automatiquement à la fin d'un scan.

## Organisation cible

```text
src/card-scan/
├── application/
│   ├── process-card-scan.service.ts
│   ├── create-dataset-samples.service.ts
│   └── verify-dataset-sample.service.ts
├── domain/
│   ├── bounding-box.ts
│   ├── card-detection.ts
│   └── dataset-sample.ts
├── infrastructure/
│   ├── image/
│   ├── openrouter/
│   ├── persistence/
│   ├── scryfall/
│   └── storage/
└── card-scan.module.ts
```

Le contrôleur doit appeler un seul cas d'usage applicatif :

```ts
await processCardScan.execute({
  scanId,
  userId,
  image: {
    buffer,
    mimeType,
  },
});
```

## 1. Produire une détection par carte physique

Le prompt ne doit plus agréger plusieurs exemplaires identiques dans une seule détection. Le LLM doit retourner une entrée distincte pour chaque carte physique visible.

Exemple de sortie :

```json
{
  "cards": [
    {
      "printedName": "Anneau solaire",
      "canonicalName": "Sol Ring",
      "language": "fr",
      "set": "cmm",
      "collectorNumber": "395",
      "boundingBox": {
        "xMin": 0.05,
        "yMin": 0.12,
        "xMax": 0.26,
        "yMax": 0.47
      },
      "confidence": 0.94,
      "languageConfidence": 0.98
    }
  ]
}
```

Les coordonnées sont comprises entre `0` et `1`. Elles doivent délimiter la carte complète, bords inclus, dans l'image transmise au modèle.

Le champ `quantity` peut être maintenu à `1` pendant une phase de compatibilité, mais une détection du modèle doit toujours représenter une seule occurrence physique.

## 2. Valider strictement les bounding boxes

Le parseur OpenRouter doit vérifier :

- que `xMin`, `yMin`, `xMax` et `yMax` sont des nombres finis compris entre `0` et `1` ;
- que `xMin < xMax` et `yMin < yMax` ;
- que le nombre de détections physiques ne dépasse pas 60 ;
- que chaque détection possède une bounding box valide ;
- que chaque détection correspond à une quantité unitaire.

Une sortie géométriquement invalide doit être traitée comme une réponse fournisseur incorrecte avant toute écriture dans le stockage objet.

## 3. Créer la collection MongoDB dédiée

Créer une collection `card_scan_samples`. Un document représente une carte physique observée.

Structure cible :

```ts
interface CardScanSample {
  scanId: ObjectId;
  scanCardId: string;
  userId: ObjectId;
  occurrenceIndex: number;

  crop: {
    objectKey: string;
    mimeType: string;
    width: number;
    height: number;
    size: number;
    sha256: string;
  };

  boundingBox: {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
  };

  detected: {
    printedName?: string;
    canonicalName?: string;
    language?: string;
    set?: string;
    collectorNumber?: string;
    confidence?: number;
    languageConfidence?: number;
  };

  candidates: Array<{
    scryfallId: string;
    oracleId: string;
    name: string;
    printedName?: string;
    language: string;
    set: string;
    collectorNumber: string;
  }>;

  label: {
    status: "pending" | "auto_verified" | "user_verified";
    printing?: {
      scryfallId: string;
      oracleId: string;
      name: string;
      printedName?: string;
      language: string;
      set: string;
      collectorNumber: string;
    };
    source?: "card_scanner" | "user";
    verifiedAt?: Date;
    verifiedBy?: ObjectId;
  };

  labelHistory: Array<{
    status: "auto_verified" | "user_verified";
    printing: ValidatedPrinting;
    source: "card_scanner" | "user";
    verifiedAt: Date;
    verifiedBy?: ObjectId;
  }>;

  recognition: {
    model: string;
    promptVersion: string;
    pipelineVersion: string;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

Indexes recommandés :

- index unique sur `{ scanId, scanCardId, occurrenceIndex }` ;
- index sur `label.status` ;
- index sur `label.printing.scryfallId` ;
- index sur `label.printing.oracleId` ;
- index sur `crop.sha256` ;
- index sur `createdAt`.

Le hash sert à identifier les doublons potentiels, sans les supprimer automatiquement : plusieurs photographies de la même carte peuvent être utiles pour l'entraînement.

## 4. Séparer observation, candidats et vérité vérifiée

Le document doit conserver trois niveaux distincts :

1. `detected` : sortie originale du modèle, jamais écrasée ;
2. `candidates` : versions Scryfall disponibles au moment du traitement ;
3. `label` : version Scryfall considérée comme correcte à cet instant.

Cette séparation permettra :

- de mesurer les erreurs du modèle ;
- de comparer plusieurs versions du pipeline ;
- d'entraîner sur les seules validations humaines ;
- d'étudier les cas où le bon résultat se trouvait ou non parmi les candidats.

## 5. Générer les labels automatiques

Après la résolution Scryfall actuelle :

- une carte résolue automatiquement produit un label `auto_verified` ;
- une carte ambiguë produit un label `pending` et conserve ses candidats ;
- une carte introuvable produit un label `pending` et conserve les données OCR disponibles ;
- la version Scryfall complète est copiée dans `label.printing` lorsqu'elle est connue.

Le statut `auto_verified` ne doit pas être traité comme équivalent à une validation humaine lors de la constitution du dataset final.

## 6. Mettre à jour le label après la review utilisateur

Lorsque l'utilisateur sélectionne un candidat via :

```text
PATCH /card-scans/:scanId/cards/:cardId
```

le flux existant continue de mettre à jour le scan, puis met également à jour l'échantillon correspondant :

```ts
label.status = "user_verified";
label.printing = selectedCandidate;
label.source = "user";
label.verifiedAt = now;
label.verifiedBy = userId;
```

La nouvelle valeur est aussi ajoutée à `labelHistory`. La prédiction initiale et l'ancien label automatique restent conservés.

La mise à jour doit vérifier que le sample appartient bien au scan et à l'utilisateur concernés. Elle doit être idempotente afin qu'un retry ne duplique pas inutilement la même entrée d'historique.

## 7. Générer un crop normalisé

Ajouter `sharp` et un service de traitement d'image propre à `card-scan`.

Pour chaque détection :

1. appliquer l'orientation EXIF avec `rotate()` ;
2. lire les dimensions réelles de l'image orientée ;
3. convertir la bounding box relative en pixels ;
4. ajouter une marge configurable, par exemple 2 % ;
5. borner le rectangle aux limites de l'image ;
6. extraire le crop ;
7. produire un WebP avec une qualité stable ;
8. calculer un SHA-256 sur le fichier produit ;
9. retourner le buffer et ses métadonnées.

Le crop doit préserver la carte complète. La normalisation plus agressive nécessaire au futur réseau de neurones devra être réalisée lors de la construction du dataset ou dans le pipeline d'entraînement, pas de manière destructive pendant l'ingestion.

## 8. Ajouter un stockage compatible S3

Créer un port interne :

```ts
interface CardCropStorage {
  put(input: PutCardCrop): Promise<StoredCardCrop>;
  delete(objectKey: string): Promise<void>;
  getSignedReadUrl?(objectKey: string): Promise<string>;
}
```

Fournir un adaptateur basé sur `@aws-sdk/client-s3`, compatible avec AWS S3, Cloudflare R2 et MinIO.

Configuration dédiée :

```text
CARD_SCAN_STORAGE_ENDPOINT=
CARD_SCAN_STORAGE_REGION=
CARD_SCAN_STORAGE_BUCKET=
CARD_SCAN_STORAGE_ACCESS_KEY_ID=
CARD_SCAN_STORAGE_SECRET_ACCESS_KEY=
CARD_SCAN_STORAGE_FORCE_PATH_STYLE=false
CARD_SCAN_CROP_PADDING_RATIO=0.02
CARD_SCAN_CROP_FORMAT=webp
CARD_SCAN_CROP_QUALITY=90
CARD_SCAN_PROMPT_VERSION=v1
CARD_SCAN_PIPELINE_VERSION=v1
```

`CARD_SCAN_STORAGE_FORCE_PATH_STYLE=true` permettra notamment l'utilisation de MinIO.

Le bucket doit être privé. MongoDB conserve uniquement la clé objet et les métadonnées, jamais une URL signée temporaire.

## 9. Utiliser des clés objet stables

Structure recommandée :

```text
card-scans/dataset/{scanId}/{scanCardId}/{occurrenceIndex}.webp
```

Cette clé est déterministe. Un retry du traitement peut ainsi remplacer le même objet sans créer de doublon.

Le stockage ne doit pas dépendre du nom détecté, du label Scryfall ou du fournisseur utilisé.

## 10. Orchestrer le pipeline

Ordre de traitement initial :

```text
Réception de l'image
→ création du scan
→ reconnaissance LLM et bounding boxes
→ validation des détections
→ résolution Scryfall
→ attribution des scanCardId
→ génération des crops
→ upload dans le stockage objet
→ upsert des card_scan_samples
→ sauvegarde finale du scan
```

Le service applicatif principal orchestre ce flux, mais chaque opération externe reste accessible via une interface.

## 11. Préparer le déplacement vers un worker

Le futur fonctionnement devra pouvoir devenir :

```text
API
→ valide l'upload
→ stocke l'image source
→ crée le scan en statut processing
→ publie un job { scanId, userId, sourceImageKey }
→ répond HTTP 202

Worker card-scan
→ charge l'image source
→ appelle ProcessCardScan
→ écrit les résultats du scan
→ écrit les samples du dataset
→ supprime ou conserve l'image source selon la politique choisie
```

Pour rendre ce déplacement simple dès maintenant :

- ne jamais passer d'objet Express ou Multer au cœur du pipeline ;
- utiliser des entrées sérialisables et des buffers ou clés objet ;
- ne pas dépendre du contexte de requête ou de l'utilisateur authentifié ;
- centraliser la configuration dans le module `card-scan` ;
- utiliser des opérations idempotentes ;
- persister les statuts nécessaires à une reprise ;
- rendre les erreurs classifiables entre erreurs permanentes et temporaires ;
- ne pas démarrer de retry implicite non borné dans les adaptateurs.

## 12. Gérer la cohérence MongoDB/S3

MongoDB et S3 ne partagent pas de transaction. Le pipeline doit donc :

- utiliser des clés objet déterministes ;
- effectuer des upserts MongoDB idempotents ;
- suivre les objets envoyés pendant une tentative ;
- supprimer les nouveaux objets si le traitement échoue avant la persistance des samples ;
- tolérer qu'un retry remplace un objet déjà présent ;
- prévoir un nettoyage périodique des objets sans document MongoDB ;
- journaliser les clés concernées sans exposer les credentials ou les URL signées.

Une transaction MongoDB pourra regrouper la mise à jour finale du scan et les samples si l'environnement MongoDB supporte les transactions. L'idempotence reste obligatoire même avec cette transaction.

## 13. Définir la rétention

Les crops du dataset ne doivent pas être supprimés lorsque le scan passe à `imported`.

Prévoir séparément :

- la rétention de l'image source complète ;
- la rétention du scan applicatif ;
- la rétention longue durée des crops et des samples du dataset ;
- la suppression explicite des données utilisateur si elle devient nécessaire juridiquement ou fonctionnellement.

## 14. Préparer l'export du dataset

Un futur exporteur devra pouvoir sélectionner notamment :

```text
label.status = user_verified
crop.objectKey existe
label.printing.scryfallId existe
```

Exemple de manifest exporté :

```json
{
  "image": "crop.webp",
  "scryfallId": "...",
  "oracleId": "...",
  "set": "sth",
  "collectorNumber": "134",
  "language": "fr",
  "labelSource": "user",
  "modelVersion": "...",
  "promptVersion": "v1",
  "pipelineVersion": "v1"
}
```

Deux niveaux de qualité pourront être exportés séparément :

- dataset haute confiance : labels `user_verified` ;
- dataset élargi : labels `auto_verified`, avec leur provenance et leur niveau de confiance.

La séparation train/validation/test devra se faire au minimum par scan ou par image source, et non aléatoirement crop par crop, afin d'éviter qu'une même photographie ou une série quasi identique se retrouve dans plusieurs partitions.

## 15. Tests à prévoir

### Reconnaissance

- validation des coordonnées relatives ;
- rejet des rectangles inversés, nuls ou hors limites ;
- une détection par occurrence physique ;
- limite de 60 cartes ;
- conservation exacte des données OCR initiales.

### Image

- conversion des coordonnées relatives en pixels ;
- prise en compte de l'orientation EXIF ;
- application de la marge ;
- bornage aux limites de l'image ;
- production d'un format, d'une qualité et d'un hash stables.

### Stockage

- upload et suppression simulés ;
- construction de clés déterministes ;
- configuration AWS S3, R2 et MinIO ;
- comportement lors d'un échec partiel ;
- absence de secrets dans les logs.

### MongoDB et labels

- création d'un sample par carte physique ;
- unicité et idempotence des upserts ;
- label automatique pour une carte résolue ;
- label en attente pour une carte ambiguë ou introuvable ;
- passage à `user_verified` après review ;
- conservation du label précédent dans l'historique ;
- conservation de la prédiction initiale ;
- contrôle de propriété du scan et du sample.

### Pipeline

- nettoyage après upload partiellement échoué ;
- reprise d'un traitement interrompu ;
- absence de doublon après retry ;
- maintien de la couverture de tests à 100 % ;
- tests end-to-end du scan et de la review utilisateur.

## Découpage d'implémentation conseillé

1. Introduire les types de bounding box et modifier le schéma de sortie OpenRouter.
2. Faire produire une détection par carte physique et adapter le resolver sans régression fonctionnelle.
3. Ajouter le schéma et le repository `card_scan_samples`.
4. Ajouter le service Sharp de génération des crops.
5. Ajouter le port de stockage et l'adaptateur S3.
6. Créer les samples idempotents pendant le traitement du scan.
7. Enregistrer les labels `auto_verified` issus du resolver actuel.
8. Synchroniser les labels `user_verified` pendant la qualification manuelle.
9. Ajouter l'historique des labels et les versions du prompt et du pipeline.
10. Ajouter la gestion des échecs partiels et le nettoyage des objets orphelins.
11. Documenter la configuration S3, R2 et MinIO.
12. Ajouter les tests unitaires, MongoDB, stockage simulé et end-to-end.

## Critères d'acceptation

- Chaque carte physique détectée possède son propre crop et son propre document `card_scan_samples`.
- Le crop correspond aux coordonnées relatives retournées par le modèle.
- Une résolution automatique renseigne un label `auto_verified`.
- Une review utilisateur remplace le label courant par un label `user_verified` sans perdre l'observation ou l'historique.
- Les candidats Scryfall présentés lors de la résolution sont conservés.
- Les opérations sont idempotentes et supportent un retry.
- Le cœur du pipeline peut être appelé sans contexte HTTP.
- Les adaptateurs MongoDB, S3, OpenRouter et Scryfall sont remplaçables.
- Le stockage fonctionne avec AWS S3, R2 et MinIO par configuration.
- Les données du dataset survivent au passage du scan à l'état `imported`.
- La suite de tests, le lint et le build restent valides.
