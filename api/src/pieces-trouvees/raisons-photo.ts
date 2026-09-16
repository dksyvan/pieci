/**
 * Raisons pour lesquelles une déclaration part sans photo de la pièce.
 *
 * La photo n'est pas strictement obligatoire, et c'est voulu : mauvaise
 * lumière, téléphone plein, pièce déjà remise au guichet au moment de
 * déclarer — un blocage dur ferait perdre des déclarations légitimes, et la
 * personne qui déclare rend service, elle ne reviendra pas. Le formulaire
 * garde donc une sortie explicite vers la saisie à la main. Cette colonne sert
 * à mesurer combien l'empruntent, et pourquoi : si la sortie reste marginale,
 * on pourra durcir ; sinon, on saura quel obstacle lever.
 *
 * La liste est fermée, sans texte libre — pas même derrière « autre ». La
 * raison est rattachée à une déclaration, donc à une personne : un champ
 * libre finirait tôt ou tard par recevoir un numéro de téléphone ou le nom
 * inscrit sur la pièce. Une valeur prise dans six mots ne dit rien de
 * personne.
 *
 * Contrairement à `scans-qr/sources.ts`, une valeur inconnue est refusée (400)
 * au lieu d'être rangée ailleurs : ici le client est le nôtre, pas un QR déjà
 * imprimé qu'on ne peut plus corriger. Une valeur hors liste signale un bug du
 * formulaire, et l'enregistrer sous un fourre-tout fausserait la mesure en
 * silence.
 *
 * - `plus_en_main`  — la pièce n'est plus entre ses mains (déjà déposée,
 *   rendue, laissée à quelqu'un). Cas légitime : ne jamais le retirer, même
 *   pour durcir.
 * - `appareil`      — l'appareil photo ne marche pas, ou pas d'autorisation.
 * - `photo_ratee`   — photos floues ou sombres, la personne abandonne.
 * - `prefere_pas`   — ne veut pas photographier la pièce.
 * - `autre`         — aucune des raisons ci-dessus.
 * - `non_precisee`  — posée par le formulaire, pas choisie : publication via
 *   « Saisir à la main » sans photo ni raison. Elle n'est pas un refus de
 *   répondre, et se lit à part.
 *
 * NULL a un sens distinct de `non_precisee` : la question n'a pas été posée.
 * C'est le cas d'une déclaration avec photo (le serveur efface alors toute
 * raison, voir `PiecesTrouveesService.create`), de la saisie en série, qui ne
 * propose pas de photo, et de toute déclaration venue d'un formulaire qui ne
 * pose pas encore la question : avant cette colonne, mais aussi entre le
 * déploiement de l'API et celui du formulaire de déclaration qui transmet la
 * raison.
 *
 * Le taux de la sortie sans photo se calcule donc en deux temps. D'abord, ne
 * garder que les lignes dont `created_at` suit la mise en ligne de ce
 * formulaire, avec une marge : un onglet resté ouvert, ou le premier
 * chargement encore servi par l'ancien service worker, envoie l'ancienne
 * version. Ensuite, parmi elles, ne compter que celles où la photo floutée ou
 * la raison est renseignée, ce qui écarte la saisie en série. Sans la borne de
 * date, les déclarations avec photo d'avant la question entrent dans le
 * calcul, tandis que celles sans photo de la même période en sortent (raison
 * NULL) : la part des déclarations avec photo est surestimée. La règle suppose
 * que ce formulaire envoie toujours une photo ou une raison, au pire
 * `non_precisee`.
 *
 * Jumeau de `RAISONS_PHOTO_ABSENTE` dans `shared/types.ts`, que l'API ne peut
 * pas importer (elle se compile seule). La contrainte CHECK de la migration
 * `1750400000000-PhotoAbsenteRaison` en fige une troisième copie, en SQL. Les
 * trois sont comparées par `pieces-trouvees.service.test.ts` : changer la
 * liste ici demande de reporter le changement dans `shared/` et d'écrire une
 * nouvelle migration qui remplace la contrainte.
 */
export const RAISONS_PHOTO_ABSENTE = [
  'plus_en_main',
  'appareil',
  'photo_ratee',
  'prefere_pas',
  'autre',
  'non_precisee',
] as const;

export type RaisonPhotoAbsente = (typeof RAISONS_PHOTO_ABSENTE)[number];

/**
 * Message du refus, en français. Il ne cite pas la valeur reçue : le message
 * d'erreur remonte tel quel jusqu'au navigateur, et rien de ce qu'envoie le
 * client n'a à y revenir.
 */
export const MESSAGE_RAISON_PHOTO_ABSENTE = "La raison de l'absence de photo n'est pas reconnue.";
