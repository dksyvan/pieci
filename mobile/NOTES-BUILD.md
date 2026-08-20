# Compiler l'application

## Le piège du chemin du projet

Le dépôt vit dans un dossier dont le nom contient des espaces **et une
apostrophe** :

```
…\APPLICATION POUR RECHERCHER SA PIÈCE D'IDENTITÉ ÉGARÉE EN CI\pieci
```

Cette apostrophe casse plusieurs outils, parce qu'elle termine prématurément une
chaîne citée. Elle a déjà provoqué trois incidents :

1. Le serveur de développement web refusait de démarrer (`'C:\Program' n'est pas
   reconnu`) — résolu avec le nom court 8.3 pour l'exécutable npm.
2. Vite rejetait le dossier partagé hors racine.
3. **EAS Build ne peut pas cloner le dépôt** :
   `git clone file:///…/D'IDENTITÉ… exited with non-zero code: 128`.

### Contournement en place

Toutes les commandes `eas build` doivent être lancées avec :

```bash
EAS_NO_VCS=1 npx eas build --platform android --profile development
```

`EAS_NO_VCS=1` copie le dossier au lieu de le cloner par git, ce qui évite
l'URL `file://` mal formée. Les fichiers ignorés par `.gitignore` restent
exclus de l'envoi.

Sous PowerShell :

```powershell
$env:EAS_NO_VCS = "1"; npx eas build --platform android --profile development
```

### Le vrai correctif

Renommer le dossier parent pour retirer l'apostrophe et les accents — par
exemple `PIECI-IDENTITE-CI`. Un quart d'heure de travail qui supprime toute
cette classe de problèmes. À faire dès que possible : chaque nouvel outil de la
chaîne de compilation retombera dessus.

## Expo Go ne suffit pas

**Expo Go ne supporte qu'un seul SDK à la fois**, celui de sa dernière version
publiée sur les stores. Le projet est en SDK 57, très récent : l'Expo Go du
Play Store et de l'App Store est probablement encore en SDK 56, d'où l'erreur
*« The project you requested requires a newer version of Expo Go »*. Avoir « la
dernière version installée » ne signifie pas qu'elle supporte le SDK 57.

De toute façon, **le push distant ne fonctionne pas dans Expo Go sur Android
depuis le SDK 53**. Une build de développement est nécessaire dans les deux cas.

## Les profils de build

| Profil | Usage | Sortie |
|---|---|---|
| `development` | Tests quotidiens, rechargement à chaud | APK avec `expo-dev-client` |
| `apk` | Partager une version testable sans store | APK autonome |
| `production` | Publication sur les stores | AAB (Android App Bundle) |

## Android

```bash
EAS_NO_VCS=1 npx eas build --platform android --profile development
```

Compte Expo requis (gratuit), pas de matériel particulier. La compilation se
fait dans le cloud, environ un quart d'heure. On récupère un lien de
téléchargement pour l'APK.

## iOS

Installer une build sur un iPhone physique **exige un compte Apple Developer à
99 $/an**. Aucun outil ne contourne cette exigence : Apple impose la signature
et l'enregistrement de l'appareil.

En revanche, **aucun Mac n'est nécessaire** : EAS compile l'iOS dans le cloud.
C'est le compte qui bloque, pas le matériel.

```bash
EAS_NO_VCS=1 npx eas build --platform ios --profile development
```

## Identifiants du projet

- Projet EAS : `5385277c-4458-458d-93ce-94c6bd34b409`, compte `dksyvan`
- Bundle Android et iOS : `com.dibyyvan.pieci` — **définitif dès la première
  publication sur un store**
