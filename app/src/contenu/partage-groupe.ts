import { ORIGINE } from '@partage/partage';
import { slugifier } from './registre';
import { COMMUNES_PUBLIEES } from './registre';

/**
 * Les messages qu'on colle dans un groupe WhatsApp ou Facebook.
 *
 * Pourquoi cet écran existe : le registre attend qu'on vienne à lui, et
 * presque personne ne vient. Quelqu'un qui ramasse une pièce à Yopougon ne
 * cherche pas « registre national des pièces trouvées » — il la photographie
 * et la publie dans le groupe du quartier, où le post disparaît sous
 * cinquante autres en trois heures. C'est là qu'il faut être, et c'est un
 * membre du groupe qui peut y aller, pas nous.
 *
 * Trois règles ont dicté ces textes :
 *
 * 1. **On répond, on ne démarche pas.** Un lien collé à froid dans un groupe
 *    est du spam, et se fait supprimer — avec la réputation qui va avec. Deux
 *    des trois messages sont donc écrits pour répondre à quelqu'un qui vient
 *    de parler. Le troisième, celui qui présente le service, le dit de la
 *    façon la plus brève possible.
 * 2. **Le message rend service avant de citer Pièci.** Celui qui répond à un
 *    trouveur commence par le vrai risque — une pièce photographiée en clair
 *    donne le numéro et la date de naissance à qui veut usurper une identité.
 *    L'information vaut d'être donnée même si personne ne clique.
 * 3. **Le texte reste modifiable.** Personne ne parle à son groupe comme une
 *    marque parle à un public. Ces textes sont un point de départ, affiché en
 *    entier et éditable avant l'envoi.
 */

export type Moment = 'trouvee' | 'perdue' | 'presentation';

export interface ChoixMoment {
  cle: Moment;
  /** Ce qu'on lit sur le bouton. */
  libelle: string;
  /** Quand s'en servir, en une ligne. */
  quand: string;
}

export const MOMENTS: ChoixMoment[] = [
  {
    cle: 'trouvee',
    libelle: 'Quelqu’un a trouvé une pièce',
    quand: 'Quelqu’un vient de publier la photo d’une pièce ramassée.',
  },
  {
    cle: 'perdue',
    libelle: 'Quelqu’un a perdu la sienne',
    quand: 'Quelqu’un demande de l’aide après avoir perdu sa pièce.',
  },
  {
    cle: 'presentation',
    libelle: 'Je présente Pièci au groupe',
    quand: 'Personne n’a rien demandé — à réserver aux groupes d’objets trouvés.',
  },
];

/** Les communes qui ont leur page de registre, seules à pouvoir être citées. */
export const COMMUNES_CITABLES = COMMUNES_PUBLIEES;

/**
 * Où mène le lien du message.
 *
 * Toujours une page réelle du site, jamais une redirection : un lien qui
 * rebondit n'affiche pas d'aperçu dans WhatsApp, et un lien sans aperçu dans
 * un fil de discussion ressemble à un lien douteux — personne ne l'ouvre.
 */
export function cheminDuMessage(moment: Moment, commune: string): string {
  if (moment === 'trouvee') return '/declarer';
  if (moment === 'perdue') return '/perdu';
  return commune ? `/trouvees/${slugifier(commune)}` : '/';
}

/** Le lien complet, tel qu'il apparaîtra dans le message. */
export function lienDuMessage(moment: Moment, commune: string, origine = ORIGINE): string {
  const chemin = cheminDuMessage(moment, commune);
  return chemin === '/' ? origine : `${origine}${chemin}`;
}

/**
 * Le message proposé.
 *
 * Écrit au tutoiement, comme le reste du site, et sans majuscule commerciale :
 * ce qui est collé dans un groupe doit ressembler à ce qu'écrirait un membre
 * du groupe, pas à une annonce.
 */
export function texteDuMessage(moment: Moment, commune: string, origine = ORIGINE): string {
  const lien = lienDuMessage(moment, commune, origine);
  const ici = commune ? ` à ${commune}` : '';

  if (moment === 'trouvee') {
    return [
      'Attention à la photo en clair : le numéro et la date de naissance suffisent à quelqu’un pour usurper une identité.',
      '',
      `Le plus sûr, c’est de la déclarer sur Pièci. Le numéro est flouté automatiquement, ton téléphone n’est jamais affiché, et le propriétaire est prévenu dès qu’il cherche son nom. C’est gratuit et ivoirien :`,
      lien,
    ].join('\n');
  }

  if (moment === 'perdue') {
    return [
      `Tu peux chercher ton nom dans le registre de Pièci : ça marche sans le numéro de la pièce, il suffit du nom.`,
      '',
      'Si elle n’y est pas encore, tu laisses une alerte et tu es prévenu automatiquement le jour où quelqu’un la déclare. C’est gratuit :',
      lien,
    ].join('\n');
  }

  return [
    `Si quelqu’un ici trouve ou perd une pièce d’identité${ici} : Pièci est un registre ivoirien gratuit.`,
    '',
    'On déclare la pièce ramassée, et le propriétaire la retrouve en cherchant son nom — sans numéro à donner, sans frais, et sans mettre son téléphone en public.',
    lien,
  ].join('\n');
}

/**
 * Ce qu'il faut savoir avant de coller ça quelque part.
 *
 * Ces quatre lignes ne sont pas de la politesse : un lien posté au mauvais
 * moment se fait supprimer, et c'est le nom de Pièci qui reste associé au
 * spam dans la tête des administrateurs du groupe. Mieux vaut un message de
 * moins et une réputation intacte.
 */
export const REGLES: string[] = [
  'Le meilleur moment, c’est en réponse à quelqu’un qui vient de parler d’une pièce perdue ou trouvée. Pas à froid.',
  'Une fois suffit. Répéter dans le même groupe transforme un service utile en publicité.',
  'Choisis un groupe où la question se pose : objets trouvés, quartier, campus, taxi. Pas n’importe lequel.',
  'Si le groupe interdit les liens, écris simplement de chercher « Pièci » — le nom suffit à nous trouver.',
];
