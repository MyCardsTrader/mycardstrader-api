# mycardstrader-api

API NestJS pour l’application MyCardsTrader.

Ce dépôt expose les endpoints backend du projet, s’appuie sur MongoDB, et publie une documentation Swagger au démarrage.

## Stack

- Node.js
- NestJS
- MongoDB
- Mongoose
- Jest
- Swagger / OpenAPI

## Prérequis

- Node.js 22 ou supérieur
- npm
- Docker et Docker Compose

## Installation

Utiliser la version Node du projet :

```bash
nvm use
```

Puis installer les dépendances :

```bash
npm install
```

## Configuration

L’application charge son fichier d’environnement en fonction de `NODE_ENV`.

- `NODE_ENV=development` charge `development.env`
- `NODE_ENV=test` charge `test.env`

### Développement

Le fichier `development.env` contient actuellement une configuration MongoDB Atlas active, et une configuration locale commentée.

Si tu veux utiliser MongoDB local avec Docker :

```env
# Online DB
# DATABASE_URI=mongodb+srv://...
# Locale
DATABASE_URI=mongodb://localhost/mycardstrader
```

Si tu veux utiliser Atlas, laisse l’URI Atlas active.

Variables utilisées en développement :

- `DATABASE_URI`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `FRONT_URL`
- `JWT_SECRET`
- `JWT_EXPIRE`
- `PORT`

Transactional emails are sent with [Resend](https://resend.com). `EMAIL_FROM` must use a sender address on a domain verified in Resend, for example:

```env
RESEND_API_KEY=re_...
EMAIL_FROM=NearbyCardTrader <noreply@nearbycardtrader.com>
```

Never commit a real Resend API key. Configure production values as Heroku config vars.

### Test

Les tests e2e utilisent `test.env`.

Variables actuellement attendues :

- `DATABASE_URI`
- `JWT_SECRET`
- `JWT_EXPIRE`
- `PORT`

## Lancer MongoDB localement

Le repo contient un [docker-compose.yml](./docker-compose.yml) qui démarre une instance MongoDB locale avec volume persistant.

Démarrer MongoDB et charger les données de référence locales :

```bash
npm run docker:dev:up
```

Arrêter MongoDB :

```bash
npm run docker:dev:down
```

Le service expose Mongo sur `localhost:27017` et persiste les données dans le volume Docker `mongo_data`.

À chaque `npm run docker:dev:up`, le service `mongo-seed` charge [`docker/mongo/foils.json`](./docker/mongo/foils.json) dans la collection `mycardstrader.foils`. L’import utilise l’identifiant Mongo comme clé d’upsert : il crée le document s’il est absent et le met à jour sans produire de doublon.

## Lancer l’application

### Mode développement

Cette commande démarre MongoDB local via Docker Compose puis lance Nest en watch mode :

```bash
npm run start:dev
```

### Mode debug

```bash
npm run start:debug
```

### Mode build

```bash
npm run build
```

### Mode production

```bash
npm run start:prod
```

## Endpoints utiles au démarrage

- Health check : `GET /health-check`
- Login : `POST /auth/login`
- Profil authentifié : `GET /user/me`
- Mise à jour de la géolocalisation : `PATCH /user/me/location`
- Changement du mot de passe : `PATCH /user/me/password`
- Swagger UI : `/api`

Les trois routes de profil nécessitent un jeton Bearer valide. Elles utilisent exclusivement l’identifiant contenu dans le JWT : aucun identifiant utilisateur fourni par le client n’est accepté. La réponse du profil exclut le mot de passe, le sel et les jetons techniques.

Par défaut, avec `PORT=3000`, Swagger est accessible sur :

```text
http://localhost:3000/api
```

## Tests

### Endpoints batch transactionnels

`PATCH /card/batch` et `DELETE /card/batch` utilisent le JWT du compte connecté. Limite : 1 à 100 identifiants Mongo hexadécimaux minuscules, uniques. Tous les champs inconnus, les modifications vides et les valeurs nulles sont rejetés avant écriture.

```json
{
  "items": [
    { "cardId": "507f191e810c19729de860ea", "changes": { "lang": "fr" } },
    {
      "cardId": "507f191e810c19729de860eb",
      "changes": { "grading": "near mint", "foil_treatment": "nonfoil" }
    }
  ]
}
```

Le PATCH autorise uniquement `lang`, `grading` et `foil_treatment`. Il répond `200 { updatedCount, cards }`, avec les valeurs enregistrées des champs éditables. Le DELETE attend un corps JSON `{ "cardIds": ["507f191e810c19729de860ea"] }` et répond `200 { deletedCount, deletedIds }`.

Une transaction Mongo englobe vérification du propriétaire/disponibilité, `bulkWrite` ou `deleteMany` et lecture du résultat. Un échec connu annule le lot entier. Les appels sont séquentiels dans la transaction, et le navigateur envoie un seul lot sans découpage implicite. Le code utilise [Connection.transaction de Mongoose](https://mongoosejs.com/docs/transactions.html) pour le commit, le rollback et la reprise des conflits transitoires.

| HTTP | Code                                | Comportement frontend                                                                 |
| ---- | ----------------------------------- | ------------------------------------------------------------------------------------- |
| 400  | `CARD_BATCH_INVALID`                | Corriger sélection/champs ; aucune écriture                                           |
| 401  | Réponse standard d’authentification | Se reconnecter                                                                        |
| 404  | `CARD_BATCH_NOT_FOUND`              | Carte absente ou étrangère au classeur, sans divulgation du propriétaire ; lot annulé |
| 409  | `CARD_BATCH_CONFLICT`               | Carte indisponible ou sélection modifiée ; lot annulé                                 |
| 500  | `CARD_BATCH_FAILED`                 | Résultat non confirmé : actualiser avant de réessayer                                 |

Les erreurs batch ont `{ code, message, cardIds? }` ; les 404/409 indiquent les identifiants concernés pour signaler les lignes. Aucun message Mongo interne n’est exposé. Une coupure réseau pendant le commit peut rendre le résultat inconnu côté client : conserver les brouillons et actualiser, sans annoncer à tort que rien n’a été appliqué. Répéter un DELETE contenant une carte déjà supprimée retourne 404 et annule le nouveau lot.

MongoDB doit fonctionner en **replica set** (ou cluster supportant les transactions), en local et en production. Le Compose local est configuré en `rs0` ; son application requiert `docker compose up -d --wait mongo`. Utiliser par exemple `mongodb://localhost:27017/mycardstrader?replicaSet=rs0&directConnection=true` en local. Ne pas utiliser cette configuration mono-nœud comme modèle de haute disponibilité en production. Le conteneur de développement déjà en cours n’est pas redémarré par les tests.

Les e2e batch démarrent une vraie application HTTP avec JWT et Mongo, dans une base aléatoire `card_batch_e2e_*`, supprimée en fin de suite. Aucune base de développement n’est utilisée. Démarrer Mongo dédié avec `docker compose -f docker-compose.e2e.yml up -d --wait mongo`, puis `npm run test:e2e -- --runInBand`. L’URI locale par défaut utilise le port 27018 ; `BATCH_E2E_MONGO_URI` permet l’adresse du service Docker, limitée aux hôtes locaux du dispositif de tests. Le nom de projet Compose e2e est distinct du Compose de développement.

Runner conteneurisé facultatif : `docker compose -f docker-compose.e2e.yml --profile test run --rm runner`. Les tests vérifient cas nominaux, 100/101 cartes, authentification, accès intercomptes, payloads invalides, cartes échangées et rollback après de vraies écritures/suppressions injectant une panne avant commit. Jest impose 100 % sur les quatre métriques de couverture unitaire.

### Tests unitaires

```bash
npm test
```

### Watch mode

```bash
npm run test:watch
```

### Couverture

```bash
npm run test:cov
```

### Tests end-to-end

```bash
npm run test:e2e
```

Pour lancer une stack Mongo isolée dédiée aux e2e :

```bash
npm run test:e2e:deps:up
npm run test:e2e
npm run test:e2e:deps:down
```

Ou en une seule commande pour le démarrage + exécution :

```bash
npm run test:e2e:local
```

La stack e2e utilise [docker-compose.e2e.yml](./docker-compose.e2e.yml) et expose Mongo sur `localhost:27018`, ce qui évite les collisions avec la base de développement locale sur `27017`.

## Qualité

Le projet utilise Husky pour installer un hook `pre-commit` via le script `prepare`.

Avant chaque commit, le hook :

- bloque les commits directs sur la branche `main`,
- lance Prettier sur les fichiers stagés,
- lance `eslint --fix` sur les fichiers TypeScript stagés,
- remet en stage les fichiers automatiquement corrigés.

### Lint

```bash
npm run lint
```

### Format

```bash
npm run format
```

### Validation complète

Avant de considérer une modification comme prête :

```bash
npm run lint
npm test
npm run test:cov
npm run test:e2e
npm audit --omit-dev
```

## Notes de fonctionnement

- `start:dev` et `start:debug` démarrent Mongo local avant Nest.
- Si `development.env` pointe sur Atlas, Docker Mongo local ne sera pas utilisé par l’application.
- La documentation Swagger est générée au boot dans `src/main.ts`.
- Le health check est exposé par `AppController`.
