# Plan backend — Achat de tokens avec Stripe

Statut : proposition d’implémentation, aucune intégration activée. Date de mise à jour : 20 septembre 2026.
Plan associé : [frontend](https://github.com/MyCardsTrader/cardtrader-front/blob/master/docs/STRIPE_IMPLEMENTATION_PLAN.md).

## 1. Périmètre et hypothèses

Permettre à un utilisateur connecté d’acheter un bundle depuis son profil, créditer son compte après paiement confirmé et envoyer une facture PDF avec TVA à son e-mail et à une adresse administrateur configurée sur l’API.

| Identifiant métier | Tokens crédités | Prix HT | Montant en centimes |
| ------------------ | --------------: | ------: | ------------------: |
| `tokens_10`        |              10 |     5 € |                 500 |
| `tokens_25`        |              25 |    15 € |                1500 |
| `tokens_40`        |              40 |    15 € |                1500 |
| `token_unit_trade` |               1 |  0,75 € |                  75 |

Hypothèses de travail : prix HT fixes, EUR uniquement, un bundle par paiement, achats ponctuels, carte bancaire pour la première version. Le token unitaire proposé depuis un trade avec solde nul coûte 0,75 € HT (75 centimes) ; la TVA applicable est ajoutée dans Checkout. Les frais Stripe sont supportés par le marchand. Pas de quantité libre, de promotion Checkout ni de conversion automatique de devise pour cette version.

Décisions à fixer avant activation en production :

- Les prix catalogue sont HT : 5 €, 15 €, 15 € et 0,75 € pour le token unitaire. Checkout doit afficher la TVA ajoutée et le total TTC avant validation.
- Préciser le pays de l’entreprise, les pays de vente et le régime fiscal applicable aux tokens. Leur qualification fiscale ne se déduit pas de leur nom : service numérique, crédit ou bon doivent être examinés selon leur utilisation réelle.
- Déterminer le ou les taux, les immatriculations nécessaires et les informations légales du vendeur. Le plan prévoit une TVA sur chaque vente prise en charge ; ne pas imposer arbitrairement 20 % à tous les pays.
- Fixer les règles de remboursement, notamment lorsque des tokens sont déjà dépensés ou immobilisés, et les conditions de consommation immédiate.

Ces décisions ne bloquent pas la préparation technique ; elles conditionnent le paramétrage commercial et fiscal final.

## 2. Intégration dans le code existant

- NestJS 11, Mongoose/MongoDB, configuration centralisée `src/config`, authentification `JwtAuthGuard`.
- `src/user/schema/user.schema.ts` contient `availableCoins`, `holdCoins`, `spentCoins` ; `GET /user/me` fournit ces compteurs au profil.
- Les tokens achetés alimenteront uniquement `availableCoins`, par incrément atomique. Le vocabulaire métier et les nouveaux contrats Billing/Trade utilisent « token » ; les champs historiques `availableCoins`, `holdCoins`, `spentCoins` restent inchangés pour compatibilité avec MongoDB et `GET /user/me`.
- `src/mail/mail.service.ts` utilise Resend et des templates Handlebars. Son contrat ne permet actuellement ni pièces jointes ni clé d’idempotence : l’étendre de façon rétrocompatible.
- Aucun module de paiement ni SDK Stripe dans les dépendances consultées.
- Les Compose Mongo actuels ne configurent pas de replica set : évolution nécessaire pour les transactions multi-documents proposées.
- Respecter `README.md`, `PLAN.md` et `AGENTS.md` : structure par fonctionnalité, contrôleurs minces, DTO validés, Swagger complet et couverture unitaire à 100 %.
- La messagerie est maintenant limitée aux trades `success`, avec création, modification, suppression, marquage comme lu et résumé via `GET /message/trades/summary`. Billing et Wallet ne doivent pas modifier ces autorisations ni rendre le chargement des trades dépendant du résumé de messages.

## 3. Architecture proposée

Utiliser Stripe Checkout hébergé. L’API choisit les prix, crée la session et orchestre la génération d’une facture Stripe après paiement. Le navigateur suit l’URL de Checkout. Stripe gère la saisie des données bancaires et l’authentification du paiement.

Créer un module `src/billing` avec une structure initiale simple :

- `billing.module.ts`, `billing.controller.ts`, `billing.service.ts`, `index.ts`.
- `stripe.service.ts` : SDK injectable, création/récupération des objets et vérification de signature.
- `stripe-webhook.controller.ts` et `stripe-webhook.service.ts` : réception et traitement durable des événements.
- `billing-worker.service.ts` : reprise des événements, factures et e-mails en attente, avec verrou à durée limitée.
- `dto/` et `schemas/` pour les contrats et les modèles réellement nécessaires ; tests colocalisés.

Réutiliser `MailModule` et la configuration Nest. Ajouter uniquement le SDK officiel `stripe` pour le paiement. Utiliser Mongo pour la file durable ; ne pas introduire Redis pour cette première version. Le scheduler Nest déjà présent comme dépendance pourra exécuter le worker, après enregistrement explicite et vérification de son fonctionnement sur l’hébergement.

## 4. Catalogue, Stripe et configuration

Créer quatre prix ponctuels EUR dans les environnements Stripe test et production, avec `tax_behavior=exclusive`. L’API maintient la correspondance entre identifiant métier, nombre de tokens et identifiant Stripe ; le frontend ne choisit jamais un `priceId` arbitraire.

L’offre `token_unit_trade` est contextuelle : elle est proposée uniquement lors d’une tentative de création de trade avec `availableCoins === 0` et ne figure pas parmi les trois cartes de bundles du profil.

Ajouter `src/config/billing.config.ts`, les exports et la validation associée :

| Variable proposée               | Usage                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| `BILLING_ENABLED`               | Autoriser les nouveaux achats ; désactivé au premier déploiement                      |
| `STRIPE_SECRET_KEY`             | Secret API, backend uniquement                                                        |
| `STRIPE_WEBHOOK_SECRET`         | Secret de signature propre à l’endpoint et à l’environnement                          |
| `STRIPE_PRICE_TOKENS_10`        | Prix du bundle 10                                                                     |
| `STRIPE_PRICE_TOKENS_25`        | Prix du bundle 25                                                                     |
| `STRIPE_PRICE_TOKENS_40`        | Prix du bundle 40                                                                     |
| `STRIPE_PRICE_TOKEN_UNIT_TRADE` | Prix HT de 0,75 € du token unitaire proposé uniquement depuis un trade avec solde nul |
| `BILLING_ADMIN_EMAIL`           | Destinataire administratif des factures, obligatoire si achats activés                |
| `STRIPE_TAX_MODE`               | `manual` ou `automatic`, choix explicite                                              |
| `STRIPE_TAX_RATE_ID`            | Taux Stripe inclusif, requis uniquement en mode manuel                                |
| `BILLING_ALLOWED_COUNTRIES`     | Pays de facturation couverts par le dispositif fiscal validé                          |

Réutiliser `FRONT_URL`, `RESEND_API_KEY`, `EMAIL_FROM`. Valider les e-mails, les URL et la cohérence des variables au démarrage. Versionner la version API Stripe choisie avec le SDK et l’endpoint webhook. Ne placer aucun secret dans le frontend ou les fichiers d’exemple.

Contrôler avant ouverture du catalogue que les prix Stripe sont actifs, ponctuels, en EUR, au montant attendu et avec le bon comportement fiscal. Une incohérence rend l’achat indisponible et déclenche une alerte. Désactiver les achats ne doit pas arrêter le traitement des paiements existants ni des webhooks.

## 5. TVA et informations de facture

Deux modes d’implémentation, à choisir selon le périmètre fiscal validé :

- Périmètre à taux unique : appliquer explicitement le `TaxRate` exclusif validé aux lignes Checkout. Le taux est configurable, jamais codé à 20 % par défaut.
- Plusieurs juridictions : utiliser Stripe Tax avec `automatic_tax.enabled=true`, code fiscal du produit et immatriculations configurés. Ne pas activer simultanément des taux manuels. Une configuration automatique ne garantit pas, à elle seule, une TVA positive sur toutes les ventes. [Documentation Stripe Tax](https://docs.stripe.com/tax/products-prices-tax-codes-tax-behavior).

Collecter dans Checkout le nom et l’adresse de facturation, dont le pays. Le pays du profil est une aide de préremplissage, pas une preuve fiscale suffisante. Définir les restrictions effectives de vente avant encaissement, y compris la modification du pays dans Checkout ; si Checkout ne permet pas de faire respecter le périmètre retenu, prévoir une étape de collecte/validation serveur avant création de session et adapter le parcours. Un contrôle après paiement sert à détecter une anomalie, pas à empêcher une vente déjà encaissée.

Le projet couvre plusieurs pays européens. Les règles des services électroniques peuvent dépendre du lieu de consommation et d’exceptions : faire valider leur applicabilité aux tokens et le recours éventuel au guichet OSS. [DGFiP — guichet TVA](https://www.impots.gouv.fr/professionnel/suis-je-concerne-0), [BOFiP — services électroniques](https://bofip.impots.gouv.fr/bofip/11964-PGP.html/identifiant%3DBOI-TVA-CHAMP-20-50-40-20-20190925).

Configurer le vendeur dans Stripe : raison sociale, adresse, identifiants légaux et TVA, coordonnées de contact, numérotation et mentions adaptées. Prévoir sur la facture l’acheteur, le numéro/date, le bundle, la devise, le montant HT, le taux et le montant de TVA, le total TTC et le paiement. Conserver les montants et données historiques de la facture ; une modification ultérieure du profil ou des prix ne les change pas.

Exemple de contrôle uniquement si le taux validé est 20 % :

| Offre     |      HT |    TVA |     TTC |
| --------- | ------: | -----: | ------: |
| 1 token   |  0,75 € | 0,15 € |  0,90 € |
| 10 tokens |  5,00 € | 1,00 € |  6,00 € |
| 25 tokens | 15,00 € | 3,00 € | 18,00 € |
| 40 tokens | 15,00 € | 3,00 € | 18,00 € |

Stripe est la source des montants fiscaux enregistrés. Toutes les sommes internes sont des entiers en centimes ; le frontend ne recalcule pas la TVA.

## 6. Données et garanties de cohérence

Prévoir les modèles suivants :

| Modèle              | Champs principaux et contraintes                                                                                                                                                                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Purchase`          | `userId`, bundle, tokens, prix HT attendu, devise, version du catalogue, e-mail acheteur figé, `stripeCustomerId`, session, PaymentIntent, facture, dates ; index uniques partiels sur identifiants Stripe présents et unicité `(userId, idempotencyKey)` |
| `WalletTransaction` | `userId`, origine `purchaseId` ou `tradeId`, type `purchase_credit`/`trade_hold`/`trade_consume`/`trade_release`, deltas disponibles/réservés/dépensés, date ; index uniques partiels `(purchaseId, type)` pour achats et `(tradeId, type)` pour trades   |
| `StripeEvent`       | identifiant événement unique, type, objet Stripe, statut de traitement, tentatives, prochaine tentative, verrou, erreur expurgée                                                                                                                          |
| `Invoice`           | identifiant Stripe unique, `purchaseId` unique, numéro, statut, détails fiscaux et acheteur/vendeur figés, référence PDF, dates                                                                                                                           |
| `EmailDelivery`     | facture, rôle du destinataire, adresse figée, version du message, état, identifiant Resend, tentatives/verrou ; unicité `(invoiceId, recipientRole, version)`                                                                                             |

Ajouter `stripeCustomerId` facultatif et index unique partiel sur `User`. Créer le Customer avec une clé d’idempotence stable par utilisateur et environnement, en gérant la concurrence. Aucun de ces identifiants techniques ne doit être ajouté au DTO public du profil sans besoin explicite.

Séparer les états : `paymentStatus` (`pending`, `paid`, `failed`, `expired`), `fulfillmentStatus` (`pending`, `credited`, `review_required`), `invoiceStatus` (`pending`, `ready`, `attention_required`). Le statut d’envoi ne change pas le statut du paiement. Un remboursement ou litige est enregistré séparément, sans effacer la vente initiale.

Dans une transaction Mongo : vérifier le paiement admissible et l’absence de crédit, insérer le mouvement unique, faire `$inc` sur `availableCoins`, marquer l’achat crédité. Réessayer les erreurs transitoires ; une livraison concurrente ou un rejeu ne doit jamais doubler le solde. Ne pas effectuer d’appel Stripe ou Resend dans cette transaction.

Déployer Mongo en replica set en local et e2e, puis vérifier les capacités de la base de production. Prévoir initialisation et health check du replica set, connexion utilisable depuis l’API et le runner CI. Normaliser d’éventuels compteurs anciens absents/null avant les incréments. Le journal commence aux nouveaux achats : les soldes et crédits promotionnels historiques restent inchangés et ne sont pas reconstruits fictivement.

## 7. Contrat API à partager avec le frontend

Toutes les routes métier utilisent le JWT et `req.user.userId`. Ne jamais accepter un `userId` du navigateur. Les réponses sont des DTO explicites.

| Route proposée                               | Contrat et résultat                                                                                                                                                                                                                                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `GET /billing/bundles`                       | `200 { enabled, currency: 'eur', taxIncluded: false, bundles: [{ id, tokens, amountExcludingTax, purchaseContext }] }` ; catalogue contrôlé côté API. Les entrées exposent leur `purchaseContext` (`profile` ou `trade_zero_balance`) afin que le produit unitaire ne soit pas présenté comme un bundle général. |
| `POST /billing/checkout-sessions`            | Body `{ bundleId, locale: 'fr'                                                                                                                                                                                                                                                                                   | 'en' }`, header `Idempotency-Key`UUID ;`201 { purchaseId, checkoutUrl, expiresAt }` |
| `GET /billing/purchases/:purchaseId`         | Achat du compte connecté : bundle, montants, statuts séparés, dates, disponibilité facture et état de l’envoi utilisateur ; aucune adresse admin                                                                                                                                                                 |
| `GET /billing/purchases?cursor=…&limit=…`    | Historique paginé du compte, tri date décroissante, limite plafonnée                                                                                                                                                                                                                                             |
| `GET /billing/purchases/:purchaseId/invoice` | PDF via API authentifiée, `application/pdf` et nom de fichier ; `409 INVOICE_NOT_READY` si pas encore disponible                                                                                                                                                                                                 |
| `POST /billing/webhooks/stripe`              | Corps brut + signature Stripe, sans JWT ; `200` après enregistrement durable, traitement asynchrone                                                                                                                                                                                                              |

Documenter les erreurs pertinentes : `400` validation/signature, `401` JWT, `404` achat absent ou appartenant à un autre compte, `409` clé réutilisée avec autre payload/facture indisponible, `429` limitation, `503` achats désactivés ou prestataire indisponible, `500` défaillance interne. Définir des codes métier stables, sans transmettre les messages techniques Stripe.

Au POST, valider strictement le DTO et refuser montant, quantité, devise, e-mail et URL de retour fournis arbitrairement. Persister l’achat avant l’appel Stripe. Utiliser une clé Stripe dérivée de l’achat ; mémoriser les paramètres exacts pour une reprise après timeout. Une même clé client rejoue le même achat ; une tentative réellement nouvelle utilise une nouvelle clé. Ne pas recréer aveuglément une session si le résultat précédent est inconnu ou si la fenêtre d’idempotence fournisseur est dépassée : réconcilier d’abord.

Paramètres Checkout : `mode=payment`, Customer du compte, un `price` serveur et `quantity=1`, adresse de facturation requise, langue, TVA configurée, `invoice_creation.enabled=true`. Mettre `purchaseId` dans `client_reference_id` et dans les metadata de session, PaymentIntent et `invoice_creation.invoice_data` pour retrouver l’achat quel que soit l’ordre des événements. L’e-mail du compte est celui de destination de la facture applicative.

Construire les retours depuis `FRONT_URL` : `/profile?purchaseId=…&payment=return` et `/profile?purchaseId=…&payment=cancel`. Ces paramètres servent à retrouver un achat ; ils ne prouvent jamais son paiement.

## 8. Webhooks et reprise

Activer la conservation du corps brut dans `src/main.ts` avec l’option Nest adaptée (`rawBody: true`). Vérifier la signature et sa tolérance temporelle avant de persister l’événement. Stripe peut livrer plusieurs fois et dans un ordre différent ; acquitter rapidement après écriture durable. Si Mongo est indisponible, renvoyer une erreur permettant à Stripe de réessayer. [Documentation webhooks](https://docs.stripe.com/webhooks).

| Événement                                                      | Traitement attendu                                                            |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `checkout.session.completed`                                   | Récupérer/contrôler la session ; crédit uniquement si `payment_status=paid`   |
| `checkout.session.async_payment_succeeded`                     | Même traitement idempotent si des moyens différés sont activés ultérieurement |
| `checkout.session.async_payment_failed`                        | Échec du paiement encore en attente ; aucun crédit                            |
| `checkout.session.expired`                                     | Expiration d’un achat non payé ; ne pas rétrograder un achat payé             |
| `invoice.paid`                                                 | Récupérer et vérifier la facture liée, préparer PDF et envois                 |
| `invoice.finalization_failed`                                  | Alerter et déclencher la procédure de reprise de facture                      |
| Événements de remboursement/litige retenus avec la version API | Enregistrer montant/statut, ouvrir une revue métier et une alerte             |

Contrôler la session réellement récupérée : environnement test/live, compte marchand, Customer, achat, prix, quantité, devise, total attendu, statut payé et cohérence fiscale. Le crédit repose sur le paiement vérifié, même si le navigateur ne revient pas. [Fulfillment Stripe](https://docs.stripe.com/checkout/fulfillment).

Éviter toute transition rétrograde due à un ancien événement. Une facture reçue avant la confirmation Checkout est conservée puis rapprochée. Les événements sans lien avec ce catalogue sont ignorés de façon explicite ; les incohérences de nos achats sont mises en revue, sans crédit automatique.

Le worker reprend avec délai progressif et plafond les événements, PDF et envois échoués ; verrou récupérable après crash et compatible avec plusieurs instances. Ajouter une réconciliation planifiée des achats en attente trop longtemps et des achats payés sans facture/crédit. Elle récupère l’état Stripe et réutilise les mêmes fonctions idempotentes. Définir alertes et reprise manuelle des cas épuisés.

## 9. Facture et envoi aux deux destinataires

La facture est créée par Stripe à la demande de l’API via Checkout ; ne pas créer une deuxième facture indépendante après le paiement. `invoice.paid` permet d’accéder à la facture générée pour un paiement ponctuel. Cette option a une tarification distincte, à intégrer au coût d’exploitation. [Factures après paiement](https://docs.stripe.com/receipts), [tarification spécifique](https://support.stripe.com/questions/pricing-for-post-payment-invoices-for-one-time-purchases-via-checkout-and-payment-links).

Une fois la facture payée et son PDF disponible :

1. Récupérer l’objet Invoice côté serveur ; vérifier son association avec l’achat et enregistrer numéro et détails fiscaux.
2. Récupérer le PDF depuis une URL obtenue de Stripe, avec timeout, limite de taille et contrôle du contenu. Reprendre si le PDF n’est pas encore prêt. Aucune URL fournie par le client ne sert au téléchargement serveur.
3. Prévoir un archivage privé durable des factures, avec contrôle d’accès et sauvegarde ; choisir le stockage et la durée de conservation selon les obligations validées. Le disque éphémère Heroku et une ancienne URL Stripe ne constituent pas une archive comptable.
4. Créer deux tâches d’envoi indépendantes : e-mail utilisateur figé sur l’achat et `BILLING_ADMIN_EMAIL` figé pour la livraison administrative. Envoyer la même facture PDF en pièce jointe, avec numéro, bundle, HT/TVA/TTC et référence d’achat dans le message.
5. Étendre `MailService`/`mail.types.ts` avec pièces jointes et options d’idempotence, puis ajouter les templates de facture FR/EN. Garder les destinataires séparés pour ne pas exposer l’adresse admin à l’utilisateur.
6. Persister l’identifiant fournisseur et l’état de chaque livraison. Une erreur admin ne renvoie pas le mail utilisateur et ne retouche jamais le solde.

Resend accepte les pièces jointes et les clés d’idempotence ; leur fenêtre de déduplication est limitée à 24 h. Associer une clé stable par facture/destinataire/version à la trace durable en base. Un timeout ambigu au-delà de cette fenêtre nécessite une réconciliation ou une revue, pas une promesse d’envoi « exactement une fois ». [API Resend](https://resend.com/docs/api-reference/emails/send-email), [idempotence Resend](https://resend.com/docs/dashboard/emails/idempotency-keys).

L’API assure ici les deux envois. Vérifier les réglages des e-mails Stripe pour éviter un second e-mail de facture non souhaité. Distinguer accepté par Resend, livré et rejeté ; intégrer les événements de livraison/rebond nécessaires à la supervision, ou conserver explicitement un statut limité à « accepté par le fournisseur ».

## 10. Sécurité et exploitation

- Limiter les créations de sessions par compte et IP ; contrôler l’appartenance de chaque achat et PDF.
- Auditer les routes existantes pouvant modifier/supprimer un utilisateur avant activation : `DELETE /user` apparaît sans guard dans le code consulté et devient particulièrement sensible avec des achats. Corriger ses autorisations et définir la conservation des écritures financières lors de la suppression d’un compte.
- Journaliser des identifiants d’achat/événement, jamais secrets, corps complets contenant des données personnelles ou liens de facture sensibles. Réduire et limiter la conservation des payloads webhook.
- Suivre paiements confirmés sans crédit, factures manquantes, erreurs fiscales, e-mails rejetés et retard du worker.
- Prévoir remboursements/avoirs sans altérer une facture finalisée. La première version peut traiter ces opérations administrativement dans Stripe, mais doit recevoir leurs événements et signaler les conséquences sur les tokens. Toute compensation de solde doit être idempotente ; pas de retrait aveugle si le solde est insuffisant.

## 11. Lots d’implémentation et critères de sortie

| Lot                         | Travaux                                                                                   | Critère de sortie                                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| B0 — Cadrage                | HT confirmé, périmètre/taux, qualification, vendeur, remboursement, stockage archive      | Décisions consignées et catalogue fiscal test défini                                                           |
| B1 — Fondations             | SDK/config/flag, Customer, modèles/index, replica set, sûreté suppression compte          | Démarrage validé et transaction Mongo testée                                                                   |
| B2 — Achat                  | Catalogue, POST Checkout, idempotence, ownership, Swagger                                 | Trois bundles de profil et le token unitaire contextuel ouvrent le bon Checkout test ; payload falsifié rejeté |
| B3 — Crédit                 | Webhooks signés, inbox durable, worker, journal, réconciliation                           | Paiement sans retour navigateur crédité une fois malgré rejeux et concurrence                                  |
| B4 — Factures               | TVA, invoice.paid, PDF, archivage, deux envois et reprises                                | Facture correcte reçue par les deux destinataires ; panne mail sans impact solde                               |
| B5 — Consultation           | Détail, historique paginé, téléchargement PDF                                             | Contrat frontend disponible et accès intercomptes refusé                                                       |
| B6 — Portefeuille et trades | Service partagé, réservation, consommation, libération, autorisations, DTO et idempotence | Un crédit réservé par création, consommé ou restitué une fois                                                  |
| B7 — Recette                | Tests, alertes, runbook, documentation, déploiement progressif                            | Recette achats et trades complète et contrôles qualité réussis                                                 |

B0/B1 précèdent B2 ; B3 et B4 s’appuient sur les données B1/B2 ; le frontend peut démarrer sur les DTO stabilisés avant B5. Prévoir des PR limitées par lot plutôt qu’une refonte globale.

B6 dépend du socle transactionnel B1 et partage le journal avec B3. Il fonctionne avec des crédits existants même si les achats Stripe sont désactivés. Stabiliser ses DTO avec les lots frontend F6/F7 ; B7 couvre également les achats simultanés aux réservations.

## 12. Tests et mise en production

Tests unitaires : mapping des trois bundles et de l’offre unitaire contextuelle, validation de configuration/DTO, arrondis attendus selon taux, validation des objets Stripe, transitions, autorisation, idempotence, erreurs réseau et reprise des e-mails. Respecter les 100 % statements/branches/functions/lines exigés par le dépôt sans exclusions métier.

Tests e2e avec Mongo replica set isolé et doubles Stripe/Resend : paiement nominal par bundle ; JWT absent ; achat d’un autre compte ; montant/quantité/priceId injectés ; signature absente/invalide ; événement signé rejoué simultanément ; deux événements distincts pour le même achat ; facture avant Checkout ; crash entre les opérations ; échec de transaction ; session expirée ; timeout de création ; panne Stripe/Mongo/Resend ; deux achats simultanés du même compte ; PDF absent puis disponible ; remboursement et anomalie fiscale. Ajouter le runner de validation au Compose e2e.

Ajouter pour `token_unit_trade` : refus lorsque le solde n’est pas nul, refus hors contexte de trade, prix serveur non falsifiable, crédit unique de 1, intention expirée ou altérée, paiement concurrent avec changement de solde, absence de création automatique du trade et réutilisation indépendante des clés d’idempotence Billing/Trade.

Recette Stripe sandbox avec véritables Checkout et webhooks : carte acceptée, refusée, authentification 3DS réussie/abandonnée, retour annulé, onglet fermé, retards de webhook, factures TVA des pays autorisés et réception des deux PDF. Les tests automatisés ordinaires ne doivent ni payer réellement ni envoyer des e-mails externes.

Validation de l’implémentation, sous la version `.nvmrc` : `npm run build`, `npm run lint`, `npm test`, `npm run test:cov`, `npm run test:e2e`, `npm audit --omit-dev`. Ces commandes seront exécutées lors de l’implémentation ; ce document ne prétend pas les avoir validées.

Avant production : configurer et vérifier prix/taxes/vendeur, secrets live et endpoint webhook HTTPS ; créer les index et sauvegardes ; vérifier archivage, worker et alertes ; déployer backend avec achats désactivés, puis frontend ; activer après recette et décisions B0. Un test live éventuel doit être explicitement organisé. En cas d’incident, fermer les nouveaux achats mais laisser fonctionner crédits, factures et reprises des paiements déjà reçus.

## 13. Réservation et consommation dans les trades

### Règles retenues

Un trade réserve un token chez son créateur (`trade.user`). La validation finale correspond au comportement actuel : les deux participants ont accepté et le trade passe à `success`. Le premier accord conserve la réservation. Le second participant ne supporte aucun crédit. Le hold concerne le portefeuille applicatif, sans autorisation bancaire Stripe supplémentaire.

| Opération        | Précondition                           | Variation disponibles / réservés / dépensés | Réservation |
| ---------------- | -------------------------------------- | ------------------------------------------- | ----------- |
| Création         | Disponible ≥ 1 et trade valide         | −1 / +1 / 0                                 | `held`      |
| Premier accord   | `pending`, participant autorisé        | 0 / 0 / 0                                   | `held`      |
| Second accord    | Deux accords, `pending`, hold actif    | 0 / −1 / +1                                 | `consumed`  |
| Refus/annulation | `pending`, hold actif, acteur autorisé | +1 / −1 / 0                                 | `released`  |
| Rejeu identique  | Opération déjà appliquée               | 0 / 0 / 0                                   | Inchangé    |

Ne pas décrémenter une deuxième fois `availableCoins` à la validation : le crédit est déjà réservé. Ces transitions conservent la somme des trois compteurs et ne créent aucun compteur négatif. Un solde disponible nul n’empêche pas de valider un trade ayant son hold. La consommation ne déclenche pas une deuxième facture.

### Modèles et service partagé

Extraire journal et mutations dans un `WalletModule` indépendant de Stripe, utilisé par BillingModule et TradeModule. Les méthodes utilisent la session Mongo de l’appelant pour valider ensemble solde, journal, trade et cartes.

Ajouter sur Trade : `tokenCost`, `tokenPayerId`, `tokenReservationStatus` (`held`, `consumed`, `released`, `not_applicable` pour l’historique), dates associées et clé de création. Index unique partiel `(user, creationIdempotencyKey)`. Coût et payeur sont fixés par le serveur. Ajouter `cancelled` aux statuts du trade.

L’unicité du journal par trade/type évite les mouvements répétés ; la transition conditionnelle `held → consumed|released` empêche aussi de consommer ET restituer le même crédit. Exposer les champs utiles via un DTO trade explicite. `GET /user/me` alimente le badge près du profil et les compteurs du compte connecté ; ne pas exposer le solde privé de l’autre participant.

### Création atomique

Lorsque `POST /trade` répond `409 INSUFFICIENT_TOKENS`, le frontend peut demander une session Checkout pour `token_unit_trade`. Le backend vérifie que le compte authentifié a toujours `availableCoins === 0`, lie l’achat à une intention de trade non exécutable et refuse ce produit hors de ce contexte. Le paiement crédite exactement 1 token via le webhook commun ; il ne crée jamais le trade lui-même. Après crédit confirmé, le client soumet de nouveau le trade avec une clé d’idempotence de trade distincte. Une variation concurrente du solde ne doit provoquer ni débit ni création automatique supplémentaire.

Adapter `POST /trade` et `TradeService.createTrade` avec `Idempotency-Key`. Valider créateur JWT, autre participant, absence d’auto-échange, propriété/existence/disponibilité des cartes. Dans une transaction Mongo :

1. Retrouver la même clé et retourner le trade si le payload correspond ; sinon `409 IDEMPOTENCY_CONFLICT`.
2. Incrément conditionnel sur le créateur, filtre `availableCoins >= 1` : disponibles −1 et réservés +1. Si impossible, `409 INSUFFICIENT_TOKENS`.
3. Créer trade en `held` et écriture `trade_hold`, puis commit. Tout échec annule également la réservation.

Gérer conflits transitoires et collisions d’index. Deux créations distinctes avec un seul crédit produisent un seul trade ; deux appels avec la même clé retrouvent le même trade. Documenter header, DTO, réponses et erreurs Swagger ; mettre à jour les deux créations frontend.

### Acceptation, refus et annulation

Le service actuel modifie accords et cartes sans transaction commune. Reprendre l’acceptation dans une transaction : vérifier participant et état, enregistrer uniquement son accord puis, si les deux acceptent, vérifier cartes et hold, passer à `success`, marquer les cartes `traded`, déplacer réservé −1/dépensé +1, insérer `trade_consume`, marquer `consumed`.

Conditionner les écritures et vérifier leurs résultats. Si carte déjà échangée ou réservation incohérente, annuler la validation finale entière. Réessayer après conflit concurrent en relisant les accords à jour. Aucun appel externe dans la transaction. Une acceptation répétée d’un trade réussi par un participant retourne l’état sans nouveau débit.

Pour le refus, passer uniquement de `pending` à `rejected`, libérer le hold, insérer `trade_release` et marquer `released` dans la même transaction, y compris après un seul accord. Un refus répété ne restitue pas deux fois. Une course validation contre refus doit aboutir à un seul résultat terminal.

Remplacer la suppression physique d’un trade porteur d’un crédit par une annulation traçable : conserver si utile `DELETE /trade/:id`, documenter sa nouvelle sémantique, autoriser le créateur et passer à `cancelled`. Restituer uniquement un hold actif ; conserver trade et journal. Refus/annulation après succès : `409 TRADE_NOT_PENDING`. Prévoir `404` si absent, `403` si non participant et préserver ces erreurs métier au lieu des captures actuelles en `520` générique.

Le `PUT /trade/:id` consulté ne contrôle pas le participant et son DTO expose les accords. Ajouter autorisation et validation stricte : exclure `userAccept`, `traderAccept`, statut, payeur, coût et hold. Seules les actions dédiées enregistrent les accords. Permettre l’édition des cartes uniquement en attente sans accord déjà donné, conformément à l’interface actuelle. Une édition ne réserve pas un second crédit.

Fermer une page ne libère rien. Aucun délai d’expiration automatique n’est défini ; une politique future utilisera la même restitution idempotente. Lors de la suppression d’un compte, prévoir la clôture contrôlée des trades actifs et de leurs holds pour éviter les réservations orphelines.

### Migration, exploitation et tests

Inventorier les anciens trades et soldes avant activation. Proposition de migration à valider : trades antérieurs `not_applicable`, coût 0, sans débit rétroactif ni restitution d’un crédit jamais réservé. Rapprocher les éventuels holds préexistants avant migration, sans les remettre arbitrairement à zéro. Définir une date/version d’activation. Désactiver les achats Stripe ne bloque ni les crédits existants ni la clôture des holds.

Superviser trades sans hold attendu, holds actifs sur trades terminaux et divergences journal/compteurs. Tracer les corrections et tenir compte des crédits promotionnels : le solde ne se reconstruit pas uniquement depuis les achats.

Tests unitaires/e2e replica set : transitions du tableau ; solde nul ; deux créations pour un crédit ; même clé et payload différent ; panne après incrément ; acceptations simultanées ; rejeux ; validation contre refus/annulation ; cartes déjà échangées ; injection de statut/hold ; édition après accord ; tiers non autorisé ; absent ; ancien trade exempté ; achat Stripe simultané au hold ; clôture de compte avec réservations. Vérifier ensemble trade, cartes, compteurs et nombre d’écritures, avec les mêmes exigences de coverage, Swagger et qualité que les autres lots.
