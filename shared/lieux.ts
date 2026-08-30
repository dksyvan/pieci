import { COMMUNES } from './communes';
import { levenshtein, normaliser } from './matching';

/**
 * Reconnaissance de la commune à partir d'un lieu écrit librement.
 *
 * Pourquoi du texte libre plutôt qu'une liste : une commune ivoirienne est
 * vaste — Yopougon dépasse le million d'habitants. « Yopougon » ne dit donc
 * presque rien à quelqu'un qui cherche sa pièce, alors que « Niangon Sud à
 * Gauche » lui parle immédiatement. Et personne ne dit spontanément le nom de
 * sa commune : on dit Gesco, Siporex, le carrefour Ananeraie.
 *
 * La commune reste pourtant nécessaire en coulisses — elle fournit les
 * coordonnées de repli, alimente la carte, et fait vivre les pages
 * `/trouvees/<commune>`. On la déduit donc du texte au lieu de la demander,
 * avec deux tolérances : les fautes de frappe (« Cocodi » vaut « Cocody ») et
 * les quartiers, qu'on rattache à leur commune.
 */

/**
 * Quartiers et lieux-dits usuels, rattachés à leur commune.
 *
 * Volontairement conservateur : mieux vaut ne rien reconnaître que rattacher
 * une pièce à la mauvaise commune — une erreur ici l'envoie sur une page de
 * registre où son propriétaire ne la cherchera pas.
 *
 * Sont donc écartés :
 * - les noms partagés par plusieurs communes — « Grand Marché » (Treichville
 *   et Koumassi), « Remblais » (Marcory et Koumassi) ;
 * - les mots trop courants pour être un lieu — « Habitat », « Résidentiel »,
 *   « Nouveau Quartier », « Camp Militaire » ;
 * - « Port-Bouët 2 », qui est un quartier de Yopougon : le piège parfait.
 *
 * Sont gardés en revanche des noms qui ressemblent à des pièges, parce que la
 * règle du nom le plus long — et, à égalité, la priorité donnée aux communes —
 * les résout correctement : « Abobo-Doumé » est à Attécoubé et non à Abobo,
 * « Zone 3 » à Treichville quand « Zone 4 » est à Marcory, et « Yopougon
 * Sicogi » reste Yopougon bien que « Sicogi » seul désigne Koumassi.
 */
export const QUARTIERS: Record<string, string> = {
  // Yopougon
  Gesco: 'Yopougon',
  Siporex: 'Yopougon',
  Niangon: 'Yopougon',
  'Toits Rouges': 'Yopougon',
  Ananeraie: 'Yopougon',
  Sideci: 'Yopougon',
  Wassakara: 'Yopougon',
  Andokoi: 'Yopougon',
  Selmer: 'Yopougon',
  Maroc: 'Yopougon',
  Koweït: 'Yopougon',
  Yaosséhi: 'Yopougon',
  Micao: 'Yopougon',
  Doukouré: 'Yopougon',

  // Cocody
  Riviera: 'Cocody',
  Angré: 'Cocody',
  'Deux-Plateaux': 'Cocody',
  'II Plateaux': 'Cocody',
  Danga: 'Cocody',
  Blockhauss: 'Cocody',
  Bonoumin: 'Cocody',
  Attoban: 'Cocody',
  Palmeraie: 'Cocody',
  Vallon: 'Cocody',
  Mermoz: 'Cocody',
  'Saint-Jean': 'Cocody',
  Akouédo: 'Cocody',
  Abatta: 'Cocody',

  // Abobo
  'Abobo Gare': 'Abobo',
  PK18: 'Abobo',
  Avocatier: 'Abobo',
  'Anonkoua-Kouté': 'Abobo',
  Sagbé: 'Abobo',
  'N’Dotré': 'Abobo',
  'Abobo Baoulé': 'Abobo',
  'Abobo Té': 'Abobo',
  Plaque: 'Abobo',
  Agbékoi: 'Abobo',

  // Adjamé
  'Forum des Marchés': 'Adjamé',
  Williamsville: 'Adjamé',
  Roxy: 'Adjamé',
  '220 Logements': 'Adjamé',
  Liberté: 'Adjamé',
  Bracodi: 'Adjamé',
  'Saint-Michel': 'Adjamé',
  Paillet: 'Adjamé',

  // Marcory
  'Zone 4': 'Marcory',
  Biétry: 'Marcory',
  Anoumabo: 'Marcory',
  Aliodan: 'Marcory',

  // Koumassi
  Prodomo: 'Koumassi',
  Soweto: 'Koumassi',
  'Nord-Est': 'Koumassi',
  // « Sicogi » désigne un bailleur social qui a bâti dans plusieurs communes,
  // ce qui avait d'abord fait écarter le nom. Il est rétabli sur indication
  // du terrain : employé seul, à Abidjan, il désigne Koumassi Sicogi. Le cas
  // gênant — « Yopougon Sicogi » — se règle tout seul, la commune nommée
  // l'emportant sur le quartier à égalité de score (voir resoudreCommune).
  Sicogi: 'Koumassi',

  // Bingerville
  'Nouveau Goudron': 'Bingerville',

  // Port-Bouët
  Vridi: 'Port-Bouët',
  Gonzagueville: 'Port-Bouët',
  Adjouffou: 'Port-Bouët',
  Anani: 'Port-Bouët',
  'Jean-Folly': 'Port-Bouët',
  Aéroport: 'Port-Bouët',

  // Treichville
  Biafra: 'Treichville',
  Arras: 'Treichville',
  'Zone 3': 'Treichville',

  // Attécoubé
  Locodjro: 'Attécoubé',
  Boribana: 'Attécoubé',
  'Abobo-Doumé': 'Attécoubé',

  // Plateau
  'Cité Administrative': 'Plateau',
  Sorbonne: 'Plateau',

  // Bouaké
  Koko: 'Bouaké',
  'Dar-es-Salam': 'Bouaké',
  'N’Gattakro': 'Bouaké',
};

/**
 * Similarité minimale pour affirmer une reconnaissance.
 *
 * 0,82 laisse passer une lettre fautive sur un mot courant (« Cocodi » vaut
 * 0,83 face à « Cocody ») sans rapprocher deux noms simplement voisins :
 * « Koumassi » et « Koumassi » d'accord, mais pas « Koko » et « Koto ».
 */
const SEUIL = 0.82;

export interface LieuResolu {
  /** Commune reconnue, ou `null` si le texte n'a rien donné de sûr. */
  commune: string | null;
  /** Ce qui a permis de la reconnaître — sert à l'expliquer à l'utilisateur. */
  via: string | null;
}

/** Découpe le texte en groupes de `n` mots consécutifs. */
function fenetres(mots: string[], n: number): string[] {
  if (n > mots.length) return [];
  const sortie: string[] = [];
  for (let i = 0; i + n <= mots.length; i += 1) sortie.push(mots.slice(i, i + n).join(' '));
  return sortie;
}

/**
 * Déduit la commune d'un lieu écrit librement.
 *
 * Le texte est comparé aux noms de communes et de quartiers, groupe de mots
 * par groupe de mots : « trouvée au carrefour Cocodi Angré » reconnaît
 * « Cocodi » comme « Cocody » sans que les autres mots ne brouillent la
 * comparaison. À égalité, le nom le plus long l'emporte — « Abobo Gare » est
 * une information plus sûre qu'« Abobo » attrapé au passage.
 */
export function resoudreCommune(texte: string): LieuResolu {
  const mots = normaliser(texte).split(' ').filter(Boolean);
  if (mots.length === 0) return { commune: null, via: null };

  const candidats: Array<[nom: string, commune: string]> = [
    ...Object.keys(COMMUNES).map((c) => [c, c] as [string, string]),
    ...Object.entries(QUARTIERS).map(([q, c]) => [q, c] as [string, string]),
  ];

  let meilleur: LieuResolu & { score: number; longueur: number } = {
    commune: null,
    via: null,
    score: 0,
    longueur: 0,
  };

  for (const [nom, commune] of candidats) {
    const motsNom = normaliser(nom).split(' ').filter(Boolean);
    for (const fenetre of fenetres(mots, motsNom.length)) {
      const score = levenshtein(fenetre, motsNom.join(' '));
      if (score < SEUIL) continue;
      if (score > meilleur.score || (score === meilleur.score && motsNom.length > meilleur.longueur)) {
        meilleur = { commune, via: nom, score, longueur: motsNom.length };
      }
    }
  }

  return { commune: meilleur.commune, via: meilleur.via };
}
