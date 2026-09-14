import type { PieceTrouveePublique } from './api-types';
import type { TypePiece } from './types';
import { normaliser } from './matching';

/**
 * Composition des messages de partage d'une pièce trouvée.
 *
 * Pourquoi ce module existe : les gens qui trouvent une pièce en Côte
 * d'Ivoire la publient déjà — sur les groupes Facebook et dans les groupes
 * WhatsApp de quartier. Ce réflexe est bon, mais le support est mauvais : un
 * post descend dans le fil en quelques heures, ne sort jamais du groupe, et
 * oblige le trouveur à publier son propre numéro, qu'il paiera en appels
 * parasites pendant des mois.
 *
 * Plutôt que d'aller chercher ces publications — ce qui reviendrait à
 * recopier l'identité de gens qui n'ont rien demandé — on donne au trouveur
 * quelque chose de meilleur à publier : un lien qui ne se périme pas, lisible
 * hors du groupe, et qui ne divulgue le numéro de personne.
 *
 * Le texte est donc écrit pour être lu tel quel dans un fil de discussion,
 * sans le site autour : il dit ce qui a été trouvé, où, au nom de qui, et ce
 * qu'il faut faire. Le lien vient après, parce qu'un message qui commence par
 * une URL se lit comme une publicité.
 */

/** Origine publique du site, pour les liens absolus des messages partagés. */
export const ORIGINE = 'https://pieci.ci';

/**
 * Genre grammatical de chaque type de pièce.
 *
 * « CNI trouvé » dans un message qui circule de main en main fait amateur, et
 * l'amateurisme est précisément ce dont un service qui manipule des pièces
 * d'identité n'a pas les moyens. Cinq entrées coûtent moins cher que ce doute.
 */
const GENRE: Record<TypePiece, 'f' | 'm'> = {
  CNI: 'f',
  Passeport: 'm',
  'Permis de conduire': 'm',
  'Carte étudiante': 'f',
  'Carte consulaire': 'f',
};

/** Ce qu'il faut d'une pièce pour la nommer publiquement. */
type IdentitePublique = Pick<PieceTrouveePublique, 'nom' | 'prenomInitiales'>;

/** Ce qu'il faut d'une pièce pour composer ses messages. */
type PiecePartagee = Pick<PieceTrouveePublique, 'typePiece' | 'nom' | 'prenomInitiales' | 'commune' | 'quartier'>;

/**
 * Termine une phrase sans doubler le point.
 *
 * Presque toutes ces phrases finissent par des initiales, qui portent déjà
 * leur point. Ajouter la ponctuation sans regarder donnait « au nom de
 * Serge Alan D.. » — dans un message destiné à circuler tel quel. Un nom sans
 * prénom (« ZAMBLE LOU ») reçoit en revanche le sien.
 */
function ponctuer(phrase: string): string {
  return phrase.endsWith('.') ? phrase : `${phrase}.`;
}

/** URL publique d'une pièce du registre. */
export function urlPiece(id: string, origine: string = ORIGINE): string {
  return `${origine}/piece/${id}`;
}

/**
 * Initiales d'un prénom, séparateurs conservés.
 *
 * « Serge-Yvan » → « S-Y. », « Marie Ange » → « M.A. », « N'Da » → « N. » :
 * le tiret reste un tiret, les espaces deviennent un point, l'apostrophe
 * n'est pas un séparateur. Même règle que la vue SQL
 * `v_pieces_trouvees_publiques` et que `api/src/common/affichage.ts` — les
 * trois portent la même table de cas dans leurs tests.
 *
 * Ne sert qu'aux écrans qui détiennent déjà le prénom complet, parce que la
 * personne vient de le saisir (la fin d'une déclaration). Tout ce qui vient
 * de l'API arrive déjà réduit : le prénom entier ne quitte pas la base.
 */
export function initialesPrenom(prenom: string | null | undefined): string | null {
  const propre = (prenom ?? '').trim();
  if (!propre) return null;

  const initiales = propre
    .replace(/([^\s-])[^\s-]*/gu, '$1')
    .replace(/\s+/g, '.')
    .replace(/\.+$/, '')
    .toUpperCase();

  return initiales ? `${initiales}.` : null;
}

/** « N'Guessan », « Adjoua » → « N'GUESSAN A. ». Jamais les deux en entier. */
export function nomAffiche(nom: string | null | undefined, prenom: string | null | undefined): string {
  return nomPublic({ nom: (nom ?? '').trim().toUpperCase(), prenomInitiales: initialesPrenom(prenom) });
}

/**
 * Identité publique : NOM en capitales, puis les initiales du prénom.
 *
 * Le patronyme d'abord, parce que c'est lui qui fait qu'on se reconnaît. En
 * Côte d'Ivoire, les prénoms usuels — Adjoua, Kouassi, Aya, Konan — sont
 * portés par des milliers de personnes et ne désignent presque personne ; un
 * nom de famille lu dans un groupe de quartier fait dire « c'est pas le petit
 * N'Guessan ? ». Jamais les deux en entier.
 *
 * Le nom est affiché tel que la vue le renvoie, sans découpage : les noms
 * composés — « N'GUESSAN KOUASSI », « TIÉ BI », « ZAMBLE LOU » — se
 * casseraient.
 */
export function nomPublic(piece: IdentitePublique): string {
  return piece.prenomInitiales ? `${piece.nom} ${piece.prenomInitiales}` : piece.nom;
}

/**
 * Lieu tel qu'on le prononce : l'endroit précis d'abord, la commune ensuite.
 * « Niangon Sud, Yopougon » parle à quelqu'un ; « Yopougon » seul, beaucoup
 * moins — c'est un million d'habitants.
 *
 * La commune n'est ajoutée que si elle manque. Depuis que l'endroit s'écrit
 * librement, les gens la nomment d'eux-mêmes — « Cocody Angré 8e tranche »,
 * « Mairie de Yopougon » — et la coller derrière donnait « Mairie de Yopougon,
 * Yopougon » jusque dans le titre des pages et les messages partagés.
 */
export function lieuDe(piece: Pick<PieceTrouveePublique, 'commune' | 'quartier'>): string {
  if (!piece.quartier) return piece.commune;
  const detail = normaliser(piece.quartier);
  return detail.includes(normaliser(piece.commune))
    ? piece.quartier
    : `${piece.quartier}, ${piece.commune}`;
}

/** Une ligne qui suffit à comprendre : sert de titre de page et d'objet de partage. */
export function titreDePartage(piece: PiecePartagee): string {
  const trouvee = GENRE[piece.typePiece] === 'f' ? 'trouvée' : 'trouvé';
  return `${piece.typePiece} ${trouvee} à ${lieuDe(piece)}, au nom de ${nomPublic(piece)}`;
}

/**
 * Message prêt à coller dans un groupe.
 *
 * Trois choses, dans cet ordre : ce qui a été trouvé, ce que le lecteur doit
 * faire, et pourquoi il peut le faire sans crainte. La gratuité est dite
 * explicitement parce que la question se pose vraiment — une pièce trouvée
 * est parfois monnayée, et le propriétaire s'attend à devoir payer.
 */
export function texteDePartage(piece: PiecePartagee): string {
  return [
    `🪪 ${ponctuer(titreDePartage(piece))}`,
    '',
    'Si tu reconnais ce nom, préviens la personne : sa pièce est enregistrée sur Pièci. La récupération est gratuite, et aucun numéro n’est publié.',
  ].join('\n');
}

/** Message complet, lien compris — pour le presse-papiers et les partages bruts. */
export function messageComplet(
  piece: PiecePartagee & Pick<PieceTrouveePublique, 'id'>,
  origine: string = ORIGINE,
): string {
  return `${texteDePartage(piece)}\n\n${urlPiece(piece.id, origine)}\n\nFais tourner, ça peut sauver quelqu’un 🙏`;
}

/**
 * Description d'aperçu — celle que WhatsApp et Facebook affichent sous le
 * titre, et que le Worker écrit dans les balises `og:` (voir
 * app/worker/index.js). Elle vit ici pour la même raison que le reste : une
 * phrase recopiée au bord aurait fini par ne plus dire la même chose que le
 * site, et par perdre l'accord au passage.
 */
export function descriptionDePartage(piece: PiecePartagee): string {
  const declaree = GENRE[piece.typePiece] === 'f' ? 'déclarée' : 'déclaré';
  return (
    ponctuer(`${piece.typePiece} ${declaree} à ${lieuDe(piece)} au nom de ${nomPublic(piece)}`) +
    ' Si c’est ta pièce, ou celle de quelqu’un que tu connais, la récupération est gratuite et sans intermédiaire.'
  );
}

/**
 * Partage WhatsApp.
 *
 * `wa.me` plutôt que le schéma `whatsapp://` : le premier fonctionne aussi
 * depuis un ordinateur et se dégrade en page d'installation, le second reste
 * inerte quand l'application manque.
 */
export function lienWhatsApp(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Partage Facebook.
 *
 * Le partageur n'accepte plus de texte pré-rempli depuis 2017 : tout ce que
 * verra le groupe vient des balises `og:` de la page visée, écrites au bord
 * par le Worker (voir app/worker/index.js). Si elles manquent, le partage
 * n'échoue pas — il devient seulement muet, ce qui est pire.
 */
export function lienFacebook(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}
