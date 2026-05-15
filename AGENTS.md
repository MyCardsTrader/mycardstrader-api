# AGENTS.md

## Objectif

Ce dépôt contient une application **NestJS**.  
Ton rôle est de produire des modifications **cohérentes avec l’architecture du projet**, **sûres**, **testées** et **documentées**.

Tu dois toujours chercher à faire des changements :
- minimaux,
- lisibles,
- maintenables,
- compatibles avec les conventions existantes du repo.

---

## Sources de vérité du projet

Avant toute modification, base-toi **toujours** sur les documents suivants :

1. `README.md` à la racine du projet
2. `PLAN.md` à la racine du projet, **si présent**

En cas de conflit :
- le `README.md` est la référence principale pour l’usage et l’installation,
- le `PLAN.md` précise l’intention produit / roadmap / architecture cible,
- le code existant sert à confirmer les conventions réellement appliquées.

Tu ne dois **jamais** ignorer ces fichiers avant de proposer une implémentation.

---

## Principes généraux de développement

### Règles de base
- Respecte les conventions idiomatiques de **NestJS**.
- Privilégie une architecture modulaire claire :
  - `module`
  - `controller`
  - `service`
  - `dto`
  - `entities` / `schemas` / `models`
  - `guards`
  - `interceptors`
  - `pipes`
  - `filters`
- Sépare clairement :
  - la validation d’entrée,
  - la logique métier,
  - l’accès aux données,
  - la sérialisation des réponses.
- Ne mets pas de logique métier complexe dans les controllers.
- Utilise les DTO pour toutes les entrées/sorties pertinentes.
- Utilise `class-validator` et `class-transformer` pour la validation.
- Préfère des noms explicites et cohérents avec le domaine métier.
- N’introduis pas de duplication inutile.
- Utilise des **barrel imports** (`index.ts`) dans les dossiers qui exposent plusieurs fichiers liés, notamment `modules`, `dto`, `config`, `common`.
- Quand un dossier possède un `index.ts`, préfère importer depuis ce barrel plutôt que via des chemins relatifs profonds.
- Lors de l’ajout d’un nouveau fichier exporté publiquement par un module, mets à jour le `index.ts` correspondant.
- Évite les barrel imports uniquement dans les cas où ils introduiraient une dépendance circulaire ou une ambiguïté claire.
- Applique une règle de structure **flat first** à l’échelle de tout le repo : garde les dossiers aussi plats que possible tant qu’il n’y a pas de raison claire de les subdiviser.
- N’introduis pas de sous-dossiers “par anticipation” ou uniquement pour ranger visuellement.
- Commence à envisager une séparation lorsqu’un dossier dépasse environ **7 à 10 fichiers utiles**.
- Ne crée un sous-dossier que s’il représente une responsabilité explicite et stable, par exemple : `dto`, `schemas`, `entities`, `guards`, `strategies`, `decorators`, `repositories`, `interfaces`, `common`.
- Évite les arborescences profondes sans forte valeur ajoutée ; au-delà de **2 niveaux de profondeur fonctionnelle**, revalide que la structure reste réellement plus lisible qu’une version plus plate.
- Préfère l’organisation **par feature** puis, à l’intérieur d’une feature, une structure minimale et lisible.

### Style NestJS attendu
- Un controller doit rester mince.
- Un service doit porter la logique métier.
- Les dépendances doivent être injectées via le système d’injection NestJS.
- Les modules doivent exposer uniquement ce qui est nécessaire.
- Les erreurs attendues doivent être gérées explicitement avec les exceptions Nest adaptées :
  - `BadRequestException`
  - `UnauthorizedException`
  - `ForbiddenException`
  - `NotFoundException`
  - `ConflictException`
  - `UnprocessableEntityException`
  - `InternalServerErrorException`
  - etc.

---

## Configuration

### Config module obligatoire
La configuration doit toujours utiliser **`@nestjs/config`**.

### Règles
- Utilise le **ConfigModule NestJS**.
- Utilise `dotenv` pour charger les variables d’environnement en local et en test.
- Évite les accès directs à `process.env` en dehors de la couche de configuration.
- Centralise les variables d’environnement.
- Valide les variables d’environnement si possible.
- Prévois des fichiers de configuration adaptés aux environnements :
  - local
  - test
  - éventuellement dev / prod si le projet le prévoit

### Attendu minimal
- `ConfigModule.forRoot(...)`
- gestion explicite des fichiers `.env`
- configuration dédiée pour les tests e2e si nécessaire

---

## Documentation OpenAPI

La documentation OpenAPI / Swagger doit être **toujours à jour**.

### Règles obligatoires
Pour chaque endpoint :
- documenter le comportement nominal,
- documenter les paramètres,
- documenter le body de requête si applicable,
- documenter les réponses,
- documenter **aussi les erreurs** possibles.

### À faire systématiquement
Utiliser les décorateurs Swagger adaptés, par exemple :
- `@ApiTags`
- `@ApiOperation`
- `@ApiParam`
- `@ApiQuery`
- `@ApiBody`
- `@ApiResponse`
- `@ApiOkResponse`
- `@ApiCreatedResponse`
- `@ApiBadRequestResponse`
- `@ApiUnauthorizedResponse`
- `@ApiForbiddenResponse`
- `@ApiNotFoundResponse`
- `@ApiConflictResponse`
- `@ApiUnprocessableEntityResponse`
- `@ApiInternalServerErrorResponse`

### Exigence
Aucun endpoint ne doit être ajouté ou modifié sans mise à jour de la documentation OpenAPI correspondante.

---

## Tests

Les tests sont obligatoires et doivent couvrir à la fois les cas nominaux et les cas d’erreur.

### Tests unitaires
- Chaque unité métier doit avoir des tests unitaires.
- La couverture unitaire doit rester à **100%**.
- Si une modification casse cet objectif, tu dois compléter les tests avant de considérer le travail terminé.
- Ne masque pas artificiellement les problèmes de couverture en excluant des fichiers métier comme les `controller`, `service`, `guard`, `repository` ou assimilés.
- Les exclusions de couverture doivent rester limitées aux fichiers purement déclaratifs ou structurels, par exemple :
  - `*.module.ts`
  - `dto/*`
  - `schemas/*`
  - `index.ts`
- Si une anomalie de couverture apparaît sur du code NestJS décoré, cherche d’abord une correction de **toolchain de test** plutôt qu’un contournement par exclusion ou par baisse des seuils.

### Toolchain Jest / Coverage
- Ce repo doit conserver un **`tsconfig.spec.json` dédié aux tests unitaires**, distinct du `tsconfig.json` runtime.
- Pour préserver une couverture branche correcte avec NestJS, Jest doit s’appuyer sur ce `tsconfig.spec.json` avec au minimum :
  - `module: "commonjs"`
  - `moduleResolution: "node"`
  - `isolatedModules: false`
  - `types: ["node", "jest"]`
- La configuration Jest du repo doit continuer à pointer explicitement vers `tsconfig.spec.json` via `ts-jest`.
- Ne reviens pas à une configuration de test directement alignée sur `module: "nodenext"` / `isolatedModules: true` sans revalider explicitement :
  - les tests unitaires,
  - la couverture globale,
  - et en particulier les **branches** sur les fichiers NestJS décorés.
- Si la couverture baisse à cause de branches fantômes générées par les décorateurs, n’ajoute pas en premier réflexe des `ignore` Istanbul/c8 sur le code métier ; privilégie une correction de configuration ou de transpilation.

### Exigence stricte
Toujours viser et maintenir :
- **100% statements**
- **100% branches**
- **100% functions**
- **100% lines**

### Tests end-to-end
Pour chaque endpoint :
- écrire des tests e2e pour les **green cases**
- écrire des tests e2e pour les **red cases**

Les tests e2e doivent couvrir au minimum :
- succès nominal,
- payload invalide,
- ressource absente,
- conflit fonctionnel si applicable,
- authentification / autorisation si applicable,
- erreurs métier attendues.

---

## Dépendances externes pour les tests e2e

Les tests e2e doivent pouvoir s’exécuter avec des dépendances externes isolées.

### Règle obligatoire
Mettre en place un **`docker-compose` dédié** pour lancer les dépendances nécessaires aux tests e2e, notamment :
- **MongoDB**
- **runner de validation**
- toute autre dépendance externe utile au scénario e2e

### Attendu
Prévoir une organisation claire, par exemple :
- `docker-compose.e2e.yml`
- ou un dossier dédié `test/e2e/docker-compose.yml`

### Objectif
Permettre des tests e2e :
- reproductibles,
- isolés,
- simples à lancer localement et en CI.

---

## Qualité de code avant validation

Avant de terminer une modification, exécute systématiquement les vérifications suivantes.

### Version de Node
- Utilise la version de Node définie dans `.nvmrc` via `nvm use` avant d’installer des dépendances, de modifier la toolchain de test ou de lancer les validations.
- Ne valide pas une modification de tooling avec une autre version majeure de Node que celle attendue par le projet.

### Workflow Git local
- Le repo utilise **Husky** pour les hooks locaux ; conserve ce mécanisme et garde le script `prepare` opérationnel.
- Le hook `pre-commit` doit continuer à :
  - bloquer les commits directs sur la branche `main`
  - lancer `prettier` sur les fichiers stagés
  - lancer `eslint --fix` sur les fichiers TypeScript stagés
- Le contrôle de branche doit rester explicite et scripté ; ne compte pas uniquement sur une convention d’équipe pour protéger `main`.
- Si tu modifies les hooks ou la stratégie de commit, garde une configuration cohérente entre :
  - `package.json`
  - `.husky/`
  - les éventuels scripts du dossier `scripts/`
  - et les workflows GitHub Actions

### 1. Lint
Tu dois lancer le linter et corriger les problèmes détectés.

Commandes attendues selon le projet :
```bash
npm run lint
```

Si possible, appliquer aussi l’autofix :
```bash
npm run lint -- --fix
```

Aucune modification ne doit être considérée comme terminée si des erreurs de lint subsistent.

### 2. Audit sécurité

Tu dois lancer :
```bash
npm audit --omit-dev
```

Tu dois résoudre les vulnérabilités remontées qui affectent les dépendances runtime.

Règles :

ne pas ignorer une vulnérabilité sans justification,
privilégier les mises à jour sûres et compatibles,
vérifier que les changements n’introduisent pas de régressions.

### 3. Tests

Tu dois exécuter au minimum :

```bash
npm test
npm run test:e2e
```

Si le projet prévoit une commande de coverage :

```bash
npm run test:cov
```

Le travail n’est pas terminé tant que :

les tests unitaires passent,
les tests e2e passent,
la couverture unitaire est à 100%.
Règles d’implémentation par type de changement
Si tu ajoutes un endpoint

Tu dois systématiquement :

ajouter ou mettre à jour le DTO,
ajouter la validation,
ajouter la documentation Swagger complète,
gérer explicitement les erreurs,
écrire les tests unitaires associés,
écrire les tests e2e green + red cases.
Si tu modifies un endpoint existant

Tu dois systématiquement :

vérifier l’impact sur les DTO,
vérifier l’impact sur la doc Swagger,
mettre à jour les tests unitaires,
mettre à jour les tests e2e,
vérifier la compatibilité avec le contrat d’API existant.
Si tu ajoutes une nouvelle dépendance

Tu dois :

justifier qu’elle est réellement nécessaire,
préférer une dépendance déjà présente dans le repo si elle répond au besoin,
vérifier l’impact sécurité avec npm audit --omit-dev,
éviter les dépendances non maintenues.
Bonnes pratiques de structure
DTO
Un DTO par intention claire.
Validation explicite.
Pas de types implicites ambigus.
Les DTO d’update doivent être distincts ou dérivés proprement (PartialType si pertinent).
Structure des dossiers
Appliquer partout la règle “flat first” : un dossier reste plat tant qu’il reste facile à lire, parcourir et maintenir.
Lorsqu’un dossier grossit, ne pas le découper automatiquement par type technique ; ne le faire que si plusieurs fichiers partagent une responsabilité claire et durable.
Favoriser des sous-dossiers nommés par responsabilité réelle plutôt que des hiérarchies artificielles ou trop profondes.
Une séparation devient pertinente quand elle améliore concrètement la découverte des fichiers, réduit les imports verbeux ou clarifie les frontières d’un module.
Imports
Les dossiers structurants doivent exposer un `index.ts` quand ils commencent à contenir plusieurs fichiers utilisés à l’extérieur.
Privilégier les imports depuis le barrel du dossier plutôt que les chemins relatifs verbeux de type `../../dto/...`.
Maintenir les barrels à jour fait partie de la définition de terminé d’un refactor ou d’un ajout de fichier.
Erreurs
Les erreurs doivent être explicites et cohérentes.
Les messages d’erreur doivent être utiles sans exposer d’informations sensibles.
Logging
Utiliser les mécanismes NestJS de logging ou les conventions du projet.
Ne jamais logger de secrets, tokens, mots de passe ou données sensibles.
Sécurité
Valider toutes les entrées.
Éviter toute confiance implicite dans les données entrantes.
Vérifier les guards / auth / rôles si concernés par le changement.
Ne pas exposer d’informations internes dans les réponses d’erreur.
Convention de travail attendue

Quand tu travailles sur ce dépôt, suis cet ordre :

Lire README.md
Lire PLAN.md si présent
Comprendre la structure actuelle du module concerné
Implémenter le plus petit changement cohérent possible
Mettre à jour la doc OpenAPI
Ajouter / mettre à jour les tests unitaires
Ajouter / mettre à jour les tests e2e green + red cases
Lancer le lint et corriger
Lancer npm audit --omit-dev et corriger les vulnérabilités runtime
Vérifier que la couverture unitaire reste à 100%
Définition de terminé

Une tâche est considérée terminée uniquement si :

le code respecte les conventions NestJS du projet,
le README.md et éventuellement le PLAN.md ont été pris en compte,
la documentation OpenAPI est à jour,
les erreurs HTTP sont documentées,
la configuration passe par @nestjs/config avec dotenv pour local/test,
les tests unitaires passent avec 100% de coverage,
les tests e2e couvrent green cases et red cases,
les dépendances e2e externes sont gérées via docker-compose,
le lint est propre,
npm audit --omit-dev ne remonte pas de vulnérabilité runtime non traitée.
Ce qu’il ne faut pas faire
Ne pas coder sans avoir lu README.md.
Ne pas ignorer PLAN.md s’il existe.
Ne pas ajouter un endpoint sans Swagger complet.
Ne pas oublier de documenter les erreurs.
Ne pas accéder directement à process.env partout dans le code.
Ne pas laisser la logique métier dans les controllers.
Ne pas terminer une modification avec du lint cassé.
Ne pas valider une modification avec des vulnérabilités runtime non traitées.
Ne pas livrer un endpoint sans tests e2e green et red.
Ne pas faire baisser la couverture unitaire sous 100%.
Résumé opérationnel

À chaque modification :

lis README.md et PLAN.md si présent,
respecte les bonnes pratiques NestJS,
maintiens Swagger à jour avec les erreurs,
utilise @nestjs/config + dotenv,
utilise docker-compose pour les dépendances e2e,
fais passer le lint,
fais passer npm audit --omit-dev,
garde 100% de coverage unitaire,
écris des tests e2e pour les cas nominaux et les cas d’erreur.
Met à jour la documentation général sur le README.md ou une documentation particulière (par module ou pour un module shared)
