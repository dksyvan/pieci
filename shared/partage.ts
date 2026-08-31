import type { PieceTrouveePublique } from './api-types';
import type { TypePiece } from './types';

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

/**
 * Termine une phrase sans doubler le point.
 *
 * Toutes ces phrases finissent par l'identité, qui finit elle-même par
 * l'initiale et son point. Ajouter la ponctuation sans regarder donnait
 * « au nom de Serge Alan D.. » — dans un message destiné à circuler tel quel.
 */
function ponctuer(phrase: string): string {
  return phrase.endsWith('.') ? phrase : `${phrase}.`;
}

/** URL publique d'une pièce du registre. */
export function urlPiece(id: string, origine: string = ORIGINE): string {
  return `${origine}/piece/${id}`;
}

/**
 * Identité publique : prénom et initiale, jamais le nom entier.
 *
 * Le point est déjà dans la donnée — la vue `v_pieces_trouvees_publiques`
 * renvoie `left(nom, 1) || '.'`. L'ajouter ici en écrirait un second, ce que
 * quatre endroits de l'interface faisaient chacun de leur côté : le registre
 * affichait « Serge Alan D.. ». D'où cette fonction, qui n'existe pas pour
 * factoriser deux mots mais pour qu'il n'y ait plus qu'un seul endroit où se
 * tromper.
 */
export function nomPublic(piece: Pick<PieceTrouveePublique, 'prenom' | 'nomInitiale'>): string {
  return `${piece.prenom} ${piece.nomInitiale}`;
}

/**
 * Lieu tel qu'on le prononce : l'endroit précis d'abord, la commune ensuite.
 * « Niangon Sud, Yopougon » parle à quelqu'un ; « Yopougon » seul, beaucoup
 * moins — c'est un million d'habitants.
 */
export function lieuDe(piece: Pick<PieceTrouveePublique, 'commune' | 'quartier'>): string {
  return piece.quartier ? `${piece.quartier}, ${piece.commune}` : piece.commune;
}

/** Une ligne qui suffit à comprendre : sert de titre de page et d'objet de partage. */
export function titreDePartage(
  piece: Pick<PieceTrouveePublique, 'typePiece' | 'prenom' | 'nomInitiale' | 'commune' | 'quartier'>,
): string {
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
export function texteDePartage(
  piece: Pick<PieceTrouveePublique, 'typePiece' | 'prenom' | 'nomInitiale' | 'commune' | 'quartier'>,
): string {
  return [
    `🪪 ${ponctuer(titreDePartage(piece))}`,
    '',
    'Si tu reconnais ce nom, préviens la personne : sa pièce est enregistrée sur Pièci. La récupération est gratuite, et aucun numéro n’est publié.',
  ].join('\n');
}

/** Message complet, lien compris — pour le presse-papiers et les partages bruts. */
export function messageComplet(
  piece: Pick<PieceTrouveePublique, 'id' | 'typePiece' | 'prenom' | 'nomInitiale' | 'commune' | 'quartier'>,
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
export function descriptionDePartage(
  piece: Pick<PieceTrouveePublique, 'typePiece' | 'prenom' | 'nomInitiale' | 'commune' | 'quartier'>,
): string {
  const declaree = GENRE[piece.typePiece] === 'f' ? 'déclarée' : 'déclaré';
  return (
    ponctuer(
      `${piece.typePiece} ${declaree} à ${lieuDe(piece)} au nom de ${nomPublic(piece)}`,
    ) +
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
