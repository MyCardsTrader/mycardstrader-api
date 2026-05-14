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
- `SMTP_URI`
- `EMAIL_FROM`
- `FRONT_URL`
- `JWT_SECRET`
- `JWT_EXPIRE`
- `PORT`

### Test

Les tests e2e utilisent `test.env`.

Variables actuellement attendues :

- `DATABASE_URI`
- `JWT_SECRET`
- `JWT_EXPIRE`
- `PORT`

## Lancer MongoDB localement

Le repo contient un [docker-compose.yml](./docker-compose.yml) qui démarre une instance MongoDB locale avec volume persistant.

Démarrer MongoDB :

```bash
npm run docker:dev:up
```

Arrêter MongoDB :

```bash
npm run docker:dev:down
```

Le service expose Mongo sur `localhost:27017` et persiste les données dans le volume Docker `mongo_data`.

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
- Swagger UI : `/api`

Par défaut, avec `PORT=3000`, Swagger est accessible sur :

```text
http://localhost:3000/api
```

## Tests

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

### Lint

```bash
npm run lint
```

### Format

```bash
npm run format
```

## Notes de fonctionnement

- `start:dev` et `start:debug` démarrent Mongo local avant Nest.
- Si `development.env` pointe sur Atlas, Docker Mongo local ne sera pas utilisé par l’application.
- La documentation Swagger est générée au boot dans `src/main.ts`.
- Le health check est exposé par `AppController`.
