# Notifications push natives — état et mise en service

Le code est écrit des deux côtés. Il reste trois opérations à faire une fois,
dans cet ordre.

## Ce qui est fait

**Côté API.** Table `expo_push_tokens` (migration
`1749900000000-AddExpoPushTokens`), route `POST /push/expo`, et
`PushService.sendToTelephone()` qui diffuse maintenant sur les deux transports :
Web Push pour les navigateurs, API Expo pour les applications natives. Les
jetons dont l'appareil s'est désinscrit (`DeviceNotRegistered`) sont supprimés
automatiquement, comme l'étaient déjà les abonnements web sur un 410.

Une panne d'Expo n'interrompt jamais l'appelant : la correspondance reste
visible dans l'onglet Suivi. Sept tests couvrent ces cas
(`api/src/push/push.service.test.ts`).

**Côté application.** `activerNotifications()` dans `src/lib/push.ts`, proposé
par le bandeau après une déclaration ou une alerte. Un tap sur la notification
ouvre l'onglet Suivi.

## Ce qu'il reste à faire

### 1. Créer le projet EAS

```bash
cd mobile
npx eas login      # compte Expo, gratuit
npx eas init
```

Cela écrit `extra.eas.projectId` dans `app.json`. **Sans cet identifiant,
`getExpoPushTokenAsync` échoue** — l'app affiche alors un message clair plutôt
que de planter, mais aucune notification ne peut arriver.

### 2. Appliquer la migration en production

```bash
cd api
npm run migration:run
```

À lancer avec le `DATABASE_URL` de production. La migration crée une table
neuve : elle ne touche à rien d'existant, et `down()` la supprime proprement
si besoin.

### 3. Compiler une build de développement

**Le push distant ne fonctionne pas dans Expo Go sur Android depuis le SDK 53.**
Tester les notifications demande une vraie build :

```bash
npx eas build --profile development --platform android
```

Le reste de l'application se teste normalement dans Expo Go.

## Pour vérifier que ça marche

Une fois le jeton enregistré, on peut déclencher une notification à la main
sans passer par une correspondance :

```bash
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '[{"to":"ExponentPushToken[…]","title":"Pièci","body":"Test","channelId":"correspondances"}]'
```

Le jeton se lit dans la table `expo_push_tokens`, ou dans les logs de l'app.

## Notes

**Aucune clé n'est nécessaire** pour envoyer via Expo — ni FCM, ni APNs. Expo
s'en charge. Une clé serveur Expo (`EXPO_ACCESS_TOKEN`) devient utile plus tard
si tu veux restreindre qui peut envoyer en ton nom.

**Le format du `FormData` diffère** entre web et natif pour l'envoi de photo :
React Native transmet `{ uri, name, type }` au lieu d'un `Blob`. Multer le
reçoit de la même façon — rien à changer côté serveur.
