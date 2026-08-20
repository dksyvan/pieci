# shared/

Code consommé **à l'identique** par `app/` (web) et `mobile/` (Expo).

Règle d'admission : un module n'entre ici que s'il ne dépend d'aucune API de
plateforme — ni `document`, ni `window`, ni `react-native`, ni
`import.meta.env`, ni `process.env`. Du TypeScript pur, rien d'autre.

| Module | Contenu |
|---|---|
| `types.ts` | Types de pièces d'identité, formes communes |
| `api-types.ts` | Formes échangées avec l'API NestJS |
| `matching.ts` | Algorithme de rapprochement, bandes de confiance |
| `communes.ts` | Communes et villes de Côte d'Ivoire, avec coordonnées |
| `format.ts` | Dates relatives, numéros, cadrage des compteurs |
| `dons.ts` | Coordonnées mobile money et lien Wave |
| `vitrine.ts` | Seuils d'affichage de la page d'accueil |

## Ce qui n'est délibérément pas ici

**Les clients HTTP.** `app/src/lib/api.ts` et `mobile/src/lib/api.ts` restent
séparés : l'URL de base ne se lit pas au même endroit (`import.meta.env` contre
`process.env`), et l'envoi de photo attend un `File` d'un côté, un
`{ uri, name, type }` de l'autre. Seuls leurs *types* sont partagés, via
`api-types.ts`.

**`echapperHtml`.** Elle utilise `document` et ne sert qu'aux popups Leaflet du
web. Elle vit dans `app/src/lib/format.ts`.

## Comment c'est câblé

- **Web** : alias `@partage` dans `vite.config.ts` et `tsconfig.app.json`.
- **Mobile** : `watchFolders` et alias de résolution dans `metro.config.js`,
  plus le même alias dans `tsconfig.json`.

Les tests de `matching.ts` tournent avec la suite du web (`cd app && npm test`).
