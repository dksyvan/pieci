/**
 * Métadonnées des pages fixes. Séparées des guides parce qu'elles décrivent
 * l'outil, pas un contenu de lecture — mais elles suivent le même contrat, ce
 * qui permet au pré-rendu et au sitemap de les traiter d'un seul geste.
 */
export interface PageFixe {
  chemin: string;
  titre: string;
  description: string;
  priorite: string;
}

/**
 * Pages pré-rendues mais tenues hors de l'index.
 *
 * `/suivi` est une consultation par numéro de téléphone : rien à y indexer.
 * Le laisser au repli SPA aurait pourtant deux défauts — le HTML servi serait
 * celui de l'accueil, ce qui décale l'hydratation, et l'onglet porterait un
 * titre qui n'est pas le sien. On le rend donc comme les autres, avec un
 * `noindex` explicite et sans entrée au sitemap.
 */
export const PAGES_NON_INDEXEES: Array<Omit<PageFixe, 'priorite'>> = [
  {
    chemin: '/suivi',
    titre: 'Mes correspondances — suivre ma déclaration | Pièci',
    description:
      'Consultez l’avancement de votre déclaration ou de votre alerte avec votre numéro de téléphone.',
  },
  {
    // Gabarit des fiches `/piece/:id`. Le Worker le sert pour chaque
    // identifiant et y écrit les balises d'aperçu (voir worker/index.js) :
    // sans ce fichier, le repli SPA renverrait le HTML de l'accueil sous une
    // URL de fiche. Hors index par principe — on indexe le lieu, jamais la
    // personne (voir contenu/registre.ts).
    chemin: '/piece',
    titre: 'Pièce trouvée — fiche du registre | Pièci',
    description:
      'Fiche d’une pièce d’identité trouvée et déclarée sur Pièci. Récupération gratuite, sans intermédiaire.',
  },
];

export const PAGES_FIXES: PageFixe[] = [
  {
    chemin: '/',
    titre: 'Pièci — Retrouver sa pièce d’identité perdue en Côte d’Ivoire',
    description:
      'Pièce d’identité perdue ou trouvée en Côte d’Ivoire ? Déclarez-la sur Pièci : la recherche se fait par nom, sans numéro. Gratuit.',
    priorite: '1.0',
  },
  {
    chemin: '/perdu',
    titre: 'J’ai perdu ma pièce d’identité — rechercher par nom | Pièci',
    description:
      'Cherchez votre CNI, passeport ou permis perdu à partir de votre nom seulement. Aucun numéro demandé. Soyez prévenu dès qu’on la déclare.',
    priorite: '0.9',
  },
  {
    chemin: '/declarer',
    titre: 'J’ai trouvé une pièce d’identité — la déclarer | Pièci',
    description:
      'Vous avez ramassé une pièce d’identité ? Déclarez-la en 45 secondes. Le numéro est flouté, votre téléphone reste privé.',
    priorite: '0.9',
  },
  {
    chemin: '/guides',
    titre: 'Guides — pièce d’identité perdue en Côte d’Ivoire | Pièci',
    description:
      'Que faire en cas de perte ou de découverte d’une pièce d’identité en Côte d’Ivoire : les démarches expliquées simplement.',
    priorite: '0.8',
  },
  {
    chemin: '/trouvees',
    titre: 'Registre des pièces d’identité trouvées | Pièci',
    description:
      'Toutes les pièces d’identité déclarées trouvées en Côte d’Ivoire, commune par commune. Consultation libre et gratuite.',
    priorite: '0.7',
  },
  {
    chemin: '/carte',
    titre: 'Carte des pièces trouvées en Côte d’Ivoire | Pièci',
    description:
      'Visualisez sur une carte où les pièces d’identité ont été trouvées, d’Abidjan à l’intérieur du pays.',
    priorite: '0.5',
  },
  {
    chemin: '/soutenir',
    titre: 'Soutenir Pièci',
    description:
      'Pièci est gratuit et le restera. Votre soutien paie l’hébergement et les notifications.',
    priorite: '0.4',
  },
];
