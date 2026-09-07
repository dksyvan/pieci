# QR codes imprimés

Chaque fichier encode une adresse de **notre propre domaine**, jamais un
raccourcisseur. La raison tient en une phrase : un QR imprimé ne se corrige
pas. Le jour où un service tiers ferme ou expire, tous les supports déjà
distribués pointent vers rien. Ici, la destination se change par un
déploiement.

| Fichier | Adresse encodée | Support |
| --- | --- | --- |
| `pieci-qr-sticker.svg` | `https://pieci.ci/qr?s=sticker` | **En service** — points de dépôt |
| `pieci-qr-flyer.svg` | `https://pieci.ci/qr?s=flyer` | Disponible |
| `pieci-qr-event.svg` | `https://pieci.ci/qr?s=event` | Disponible — kakémono |
| `pieci-qr-casquette.svg` | `https://pieci.ci/qr?s=casquette` | Disponible |
| `pieci-qr-polo.svg` | `https://pieci.ci/qr?s=polo` | Écarté — les polos sont partis sans QR |

Chaque support existe en deux versions : nue, et `-logo` avec le pin Pièci au
centre. La version nue a le plus de marge à l'impression ; prenez-la au
moindre doute sur le rendu.

## Réglages d'impression

- **SVG vectoriel** — s'agrandit sans perte.
- **Correction d'erreur niveau H** (30 %) — tolère les plis, l'usure et un
  logo au centre.
- Modules `#0F2A43` sur fond blanc, zone de silence de 4 modules. Ne rognez
  pas cette marge blanche : sans elle, les lecteurs ne trouvent plus les
  repères.
- **8 cm de côté au minimum** sur un support qu'on lit à distance de bras.

Chaque fichier a été rendu en image puis relu par un décodeur, à 600 px et à
240 px. Testez tout de même sur le support imprimé avant une série : un
décodeur sur une image parfaite n'est pas un téléphone sur du papier mat.

## Refaire la série

Les fichiers sont générés — voir `pieci-qr-*.svg`. Pour ajouter un support,
déclarez-le d'abord dans `api/src/scans-qr/sources.ts` et dans `SOURCES_QR`
de `app/worker/index.js`, sans quoi les scans se rangeront sous « inconnu ».
