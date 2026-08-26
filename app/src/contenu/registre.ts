import { COMMUNES } from '@partage/communes';
import { TYPES_PIECE, type TypePiece } from '@partage/types';

/**
 * Pages d'agrégat du registre : une par commune, une par type de document.
 *
 * Le choix de fond : on indexe le lieu, jamais la personne. Une fiche
 * individuelle exposerait un prénom, un quartier et une date dans un cache
 * Google qui survit des mois à la restitution de la pièce — une trace publique
 * permanente pour un épisode privé. Une page de commune, elle, garde la même
 * URL pendant que son contenu tourne entièrement : rien ne s'y fige.
 *
 * Ces pages ne font pas doublon avec les guides. Le guide répond à « j'ai
 * perdu ma pièce à Yopougon, que faire » ; la page de registre répond à
 * « quelles pièces sont trouvées à Yopougon en ce moment ». Deux intentions,
 * deux requêtes, et un lien croisé entre les deux.
 */

/**
 * Accents détachés par la normalisation NFD.
 *
 * Écrit en échappement plutôt qu'en caractères littéraux : ces signes sont
 * invisibles dans un éditeur, et un seul perdu en recopiant le fichier casserait
 * silencieusement toutes les URL accentuées.
 */
const ACCENTS = /[̀-ͯ]/g;

/**
 * Réduit un libellé à une forme utilisable dans une URL.
 * « Port-Bouët » devient « port-bouet », « Adjamé » devient « adjame ».
 */
export function slugifier(valeur: string): string {
  return valeur
    .normalize('NFD')
    .replace(ACCENTS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export type GenreFiltre = 'commune' | 'type';

export interface PageRegistre {
  slug: string;
  genre: GenreFiltre;
  /** Valeur exacte à comparer aux données — accents et casse compris. */
  valeur: string;
  titre: string;
  description: string;
  /** Texte propre à la page, affiché sous le titre. */
  intro: string;
  /** Guide lié, quand il en existe un pour ce territoire. */
  guide?: string;
}

/**
 * Contexte local. C'est la seule partie réellement propre à chaque commune, et
 * donc la seule qui justifie une page distincte : sans elle, seize pages
 * identiques au nom près se feraient concurrence pour rien.
 */
const CONTEXTE_COMMUNE: Record<string, string> = {
  Cocody:
    'À Cocody, les pièces se perdent moins dans la rue que dans les lieux où on les sort : postes de sécurité, réceptions, campus, salles de sport. Elles sont donc souvent rapportées par un vigile ou un agent d’accueil, plusieurs jours après la perte.',
  Yopougon:
    'Yopougon est la commune la plus peuplée d’Abidjan : une pièce tombée y est ramassée très vite, mais par quelqu’un que le propriétaire ne croisera jamais. Gesco, Siporex, Niangon et les Toits Rouges concentrent l’essentiel des déclarations.',
  Abobo:
    'À Abobo, tout converge vers quelques points de passage — Abobo Gare, PK18, le marché. C’est là que les pièces tombent, et c’est de là que viennent la plupart des déclarations de la commune.',
  Plateau:
    'Le Plateau est un lieu de travail plus que de résidence. Les pièces y sont perdues aux guichets, dans les halls d’immeubles et aux arrêts de bus, puis rapportées par des agents d’accueil qui ne savent pas où les déposer.',
  Treichville:
    'Entre le Grand Marché, la gare de Bassam et les abords du port, Treichville brasse une population qui n’y habite pas. Une pièce ramassée ici appartient souvent à quelqu’un d’une autre commune.',
  Marcory:
    'Zone 4, Biétry, Anoumabo : commerces, bureaux et vie nocturne se superposent sur un territoire compact. Les pièces y sont fréquemment retrouvées par des établissements qui les gardent au comptoir.',
  Koumassi:
    'Le Grand Marché et les Remblais font de Koumassi un point de forte densité. Les déclarations y viennent autant de commerçants installés que de passants.',
  Adjamé:
    'Adjamé est le carrefour du pays : gare routière, marché, Forum des Marchés. Une pièce perdue ici peut être ramassée par quelqu’un qui prend un car le soir même pour l’intérieur — d’où l’intérêt de consulter aussi le registre national.',
  'Port-Bouët':
    'Aéroport, Vridi, Gonzagueville : Port-Bouët mêle voyageurs, activité portuaire et quartiers résidentiels. Les pièces de voyageurs y sont surreprésentées.',
  Attécoubé:
    'Attécoubé est traversée par les flux entre le Plateau et l’ouest de l’agglomération. Les pertes s’y concentrent sur les axes et les points d’embarquement.',
  Bingerville:
    'Bingerville s’étend et se traverse en voiture. Une pièce tombée sur un parking ou au bord d’une route y est ramassée par quelqu’un de passage, pas par un voisin.',
  Bouaké:
    'Deuxième ville du pays et carrefour entre le Sud et le Nord. À Bouaké, l’information circule bien à l’échelle du quartier, mais pas pour les voyageurs de passage — qui sont nombreux.',
  Yamoussoukro:
    'Capitale politique et pôle de formation : administrations, écoles et grands axes structurent les pertes à Yamoussoukro, avec une population étudiante importante.',
  'San-Pédro':
    'L’activité portuaire et logistique amène à San-Pédro une population mobile. Les pièces déclarées ici appartiennent souvent à des personnes qui n’y résident pas.',
  Daloa:
    'Daloa vit au rythme du commerce agricole et voit passer beaucoup de monde en saison. Les pertes suivent le marché et la gare routière.',
  Korhogo:
    'Korhogo est le point d’attache du Nord et le départ de nombreux trajets vers le Sud. Une pièce perdue ici peut être déclarée depuis Abidjan, et inversement.',
};

/** Guide territorial correspondant, quand il existe. */
const GUIDE_COMMUNE: Record<string, string> = {
  Abidjan: 'piece-perdue-abidjan',
  Yopougon: 'piece-perdue-yopougon',
  Cocody: 'piece-perdue-cocody',
  Abobo: 'piece-perdue-abobo',
  Adjamé: 'piece-perdue-adjame',
  Bouaké: 'piece-perdue-bouake',
};

/** Ce qu'il faut savoir sur chaque type de document, et rien de générique. */
const CONTEXTE_TYPE: Record<TypePiece, { intro: string; guide: string }> = {
  CNI: {
    intro:
      'La carte nationale d’identité est le document le plus déclaré, parce que c’est celui qu’on sort le plus souvent. Le numéro et la date de naissance sont floutés avant publication : la pièce reste reconnaissable par son propriétaire sans être exploitable par un inconnu.',
    guide: 'cni-perdue-que-faire',
  },
  Passeport: {
    intro:
      'Un passeport trouvé est presque toujours rapporté — c’est un document que personne ne jette. Il est aussi celui dont l’absence coûte le plus cher à son propriétaire, qui ne peut ni voyager ni justifier son séjour.',
    guide: 'passeport-perdu',
  },
  'Permis de conduire': {
    intro:
      'Le permis se perd le plus souvent dans le véhicule lui-même, ou chez celui qui l’a manipulé en dernier. Pour son propriétaire, chaque jour sans lui est un risque au premier contrôle — et parfois une perte de revenu.',
    guide: 'permis-conduire-perdu',
  },
  'Carte étudiante': {
    intro:
      'Les cartes d’étudiant ramassées sur un campus le sont presque toujours par d’autres étudiants, qui les gardent des semaines faute de savoir où les déposer. Leur propriétaire, lui, s’en aperçoit souvent à la porte d’une salle d’examen.',
    guide: 'carte-etudiant-perdue',
  },
  'Carte consulaire': {
    intro:
      'Une carte consulaire perdue met son titulaire dans une situation plus difficile qu’un national : les démarches de remplacement passent par une représentation diplomatique, et il n’a souvent aucun réseau local pour l’aider à chercher.',
    guide: 'trouve-piece-etranger',
  },
};

function pageCommune(commune: string): PageRegistre {
  return {
    slug: slugifier(commune),
    genre: 'commune',
    valeur: commune,
    titre: `Pièces d’identité trouvées à ${commune} | Pièci`,
    description: `Consultez les pièces d’identité déclarées trouvées à ${commune}. Recherche par nom, sans numéro à fournir. Gratuit.`,
    intro: CONTEXTE_COMMUNE[commune] ?? '',
    guide: GUIDE_COMMUNE[commune],
  };
}

function pageType(type: TypePiece): PageRegistre {
  const { intro, guide } = CONTEXTE_TYPE[type];
  return {
    slug: slugifier(type),
    genre: 'type',
    valeur: type,
    titre: `${type} trouvée en Côte d’Ivoire — registre | Pièci`,
    description: `Toutes les déclarations de ${type.toLowerCase()} trouvée en Côte d’Ivoire. Cherchez par votre nom, sans numéro. Gratuit.`,
    intro,
    guide,
  };
}

/** Toutes les pages d'agrégat, communes d'abord. */
export const PAGES_REGISTRE: PageRegistre[] = [
  ...Object.keys(COMMUNES).map(pageCommune),
  ...TYPES_PIECE.map(pageType),
];

/** Résout un segment d'URL en filtre, ou `undefined` s'il ne correspond à rien. */
export function pageRegistreParSlug(slug: string | undefined): PageRegistre | undefined {
  return PAGES_REGISTRE.find((p) => p.slug === slug);
}

/** Chemins à pré-rendre et à publier dans le sitemap. */
export const CHEMINS_REGISTRE = PAGES_REGISTRE.map((p) => `/trouvees/${p.slug}`);
