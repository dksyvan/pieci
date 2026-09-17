import { describe, expect, it } from 'vitest';
import { ALIAS, GUIDES, GUIDES_PUBLIES, RUBRIQUES, RUBRIQUES_PUBLIEES, guideParSlug } from './index';
import { texteBrut, type Guide, type Texte } from './types';
import { PAGES_REGISTRE, slugifier } from './registre';

/**
 * Le contenu est du code : il se casse comme du code.
 *
 * Ces vérifications visent les fautes qui ne se voient pas à la relecture et
 * ne font pas échouer le build — un slug renommé qui laisse un lien mort, un
 * guide écrit puis jamais rattaché à une rubrique, une description trop longue
 * que Google tronquera au milieu d'un mot.
 */

describe('registre des guides', () => {
  it('publie au moins les vingt guides annoncés', () => {
    expect(GUIDES.length).toBeGreaterThanOrEqual(20);
  });

  it('n’a aucun slug en double', () => {
    const slugs = GUIDES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('n’expose que des slugs utilisables dans une URL', () => {
    for (const g of GUIDES) {
      expect(g.slug, g.titre).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('rattache chaque guide publié à une rubrique et une seule', () => {
    const compte = new Map<string, number>();
    for (const r of RUBRIQUES) {
      for (const g of r.guides) compte.set(g.slug, (compte.get(g.slug) ?? 0) + 1);
    }
    for (const g of GUIDES_PUBLIES) expect(compte.get(g.slug), g.slug).toBe(1);
  });
});

/**
 * Un brouillon se lit à son adresse, et nulle part ailleurs. C'est toute la
 * différence entre « relire une page en ligne » et « publier une page » : une
 * seule fuite — une entrée d'index, une ligne de sitemap, un « à lire aussi » —
 * et Google l'indexe dans la journée.
 */
describe('brouillons', () => {
  const brouillons = GUIDES.filter((g) => g.brouillon);

  it('reste résolvable à son adresse', () => {
    for (const g of brouillons) expect(guideParSlug(g.slug), g.slug).toBeDefined();
  });

  it('n’apparaît dans aucune rubrique affichée', () => {
    const affiches = RUBRIQUES_PUBLIEES.flatMap((r) => r.guides.map((g) => g.slug));
    for (const g of brouillons) expect(affiches, g.slug).not.toContain(g.slug);
  });

  it('n’est proposé par aucun autre guide', () => {
    for (const g of GUIDES_PUBLIES) {
      for (const slug of g.connexes ?? []) {
        const cible = guideParSlug(slug);
        expect(cible?.brouillon, `${g.slug} renvoie vers le brouillon ${slug}`).toBeUndefined();
      }
    }
  });

  it('sort de la liste publiée', () => {
    for (const g of brouillons) {
      expect(GUIDES_PUBLIES.map((p) => p.slug), g.slug).not.toContain(g.slug);
    }
  });

  /**
   * Les pages de commune et de type de document renvoient chacune vers « son »
   * guide (voir GUIDE_COMMUNE et CONTEXTE_TYPE dans registre.ts). Ce sont des
   * chaînes écrites à la main, hors du typage : rien n'empêche d'y pointer un
   * brouillon, et une seule de ces pages suffirait à le faire découvrir.
   */
  it('n’est atteignable depuis aucune page du registre', () => {
    for (const page of PAGES_REGISTRE) {
      if (!page.guide) continue;
      const cible = guideParSlug(page.guide);
      expect(cible, `/trouvees/${page.slug} renvoie vers ${page.guide}, qui n’existe pas`)
        .toBeDefined();
      expect(
        cible?.brouillon,
        `/trouvees/${page.slug} renvoie vers le brouillon ${page.guide}`,
      ).toBeUndefined();
    }
  });
});

/**
 * Les alias sont des redirections, pas des pages. Un alias qui porterait le nom
 * d'un slug existant redirigerait une page vers une autre en boucle, ou
 * masquerait un guide entier — et rien, au build, ne s'en plaindrait.
 */
describe('adresses alternatives', () => {
  it('ne porte jamais le nom d’un guide existant', () => {
    for (const alias of Object.keys(ALIAS)) {
      expect(guideParSlug(alias), `l’alias ${alias} masque un guide`).toBeUndefined();
    }
  });

  it('n’est jamais revendiqué par deux guides', () => {
    const tous = GUIDES.flatMap((g) => (g.alias ?? []).map((a) => `${a}`));
    expect(new Set(tous).size, tous.join(', ')).toBe(tous.length);
  });

  it('vise toujours un guide qui existe', () => {
    for (const [alias, slug] of Object.entries(ALIAS)) {
      expect(guideParSlug(slug), `${alias} vise ${slug}`).toBeDefined();
    }
  });

  it('s’écrit comme un segment d’URL', () => {
    for (const alias of Object.keys(ALIAS)) {
      expect(alias).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });
});

describe('liens entre guides', () => {
  it('ne pointe jamais vers un guide inexistant', () => {
    for (const g of GUIDES) {
      for (const slug of g.connexes ?? []) {
        expect(guideParSlug(slug), `${g.slug} renvoie vers ${slug}`).toBeDefined();
      }
    }
  });

  it('ne se cite pas lui-même', () => {
    for (const g of GUIDES) {
      expect(g.connexes ?? [], g.slug).not.toContain(g.slug);
    }
  });
});

describe('métadonnées', () => {
  it('garde des descriptions dans la fenêtre affichée par Google', () => {
    for (const g of GUIDES) {
      expect(g.description.length, `${g.slug} (${g.description.length} car.)`).toBeGreaterThan(70);
      expect(g.description.length, `${g.slug} (${g.description.length} car.)`).toBeLessThanOrEqual(
        165,
      );
    }
  });

  it('garde des titres assez courts pour ne pas être tronqués', () => {
    // 60 caractères pour le titre, le reste pour le « | Pièci » ajouté au
    // pré-rendu.
    for (const g of GUIDES) {
      expect(g.titre.length, `${g.slug} (${g.titre.length} car.)`).toBeLessThanOrEqual(60);
    }
  });

  it('date chaque guide au format ISO', () => {
    for (const g of GUIDES) {
      expect(g.miseAJour, g.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(g.miseAJour)), g.slug).toBe(false);
    }
  });

  it('pose une question par guide, et la termine', () => {
    for (const g of GUIDES) {
      expect(g.question, g.slug).toMatch(/\?$/);
    }
  });
});

/**
 * Tous les `Texte` d'un guide, avertissement et questions fréquentes compris.
 *
 * Passe obligatoirement par là tout ce qui inspecte le contenu : depuis qu'un
 * texte peut être une suite de fragments, un `.join(' ')` naïf rendrait
 * « [object Object] » à la place de chaque lien — sans faire échouer le moindre
 * test, ce qui est exactement le genre de faute que ce fichier existe pour
 * attraper.
 */
function textesDe(guide: Guide): Texte[] {
  const blocs = guide.sections.flatMap((s) =>
    s.blocs.flatMap((b): Texte[] => {
      switch (b.type) {
        case 'paragraphe':
          return [b.texte];
        case 'liste':
          return b.items;
        case 'etapes':
          return b.items.flatMap((e) => [e.titre, e.texte]);
        case 'encadre':
          return [b.titre, b.texte];
        case 'tableau':
          return [...b.entetes, ...b.lignes.flat()];
      }
    }),
  );

  return [
    guide.titre,
    guide.description,
    guide.chapo,
    ...guide.sections.map((s) => s.titre),
    ...blocs,
    ...(guide.avertissement ? [guide.avertissement.titre, guide.avertissement.texte] : []),
    ...(guide.faq ?? []).flatMap((q) => [q.question, q.reponse]),
  ];
}

/** Texte utile d'un guide, tel qu'un moteur le lira une fois rendu. */
function corpsDe(guide: Guide): string {
  return textesDe(guide).map(texteBrut).join(' ');
}

/** Toutes les destinations citées par un guide. */
function liensDe(guide: Guide): string[] {
  return textesDe(guide)
    .filter((t): t is Array<string | { texte: string; href: string }> => Array.isArray(t))
    .flatMap((t) => t.filter((p) => typeof p !== 'string').map((p) => p.href));
}

describe('corps des guides', () => {
  it('donne assez de texte pour être indexable', () => {
    // Le seuil vise le contenu creux : une page qui répète le pitch sans rien
    // apprendre est déclassée, et à juste titre.
    const MINIMUM = 1200;
    const maigres = GUIDES.map((g) => [g.slug, corpsDe(g).length] as const)
      .filter(([, n]) => n < MINIMUM)
      .sort((a, b) => a[1] - b[1])
      .map(([slug, n]) => `${slug} (${n} car.)`);

    expect(maigres, `guides à étoffer, minimum ${MINIMUM} caractères`).toEqual([]);
  });

  it('ne laisse aucune section vide', () => {
    for (const g of GUIDES) {
      expect(g.sections.length, g.slug).toBeGreaterThan(0);
      for (const s of g.sections) {
        expect(s.blocs.length, `${g.slug} / ${s.titre}`).toBeGreaterThan(0);
      }
    }
  });

  it('garde des tableaux dont chaque ligne a le bon nombre de colonnes', () => {
    for (const g of GUIDES) {
      for (const s of g.sections) {
        for (const b of s.blocs) {
          if (b.type !== 'tableau') continue;
          for (const ligne of b.lignes) {
            expect(ligne.length, `${g.slug} / ${s.titre}`).toBe(b.entetes.length);
          }
        }
      }
    }
  });
});

describe('liens dans les guides', () => {
  it('n’accepte que trois formes de destination', () => {
    for (const g of GUIDES) {
      for (const href of liensDe(g)) {
        expect(href, `${g.slug} : ${href}`).toMatch(/^(\/|https:\/\/|tel:)/);
      }
    }
  });

  it('ne laisse aucun lien sans texte visible', () => {
    for (const g of GUIDES) {
      for (const t of textesDe(g)) {
        if (!Array.isArray(t)) continue;
        for (const part of t) {
          if (typeof part === 'string') continue;
          expect(part.texte.trim(), `${g.slug} : lien vide vers ${part.href}`).not.toBe('');
          // « ici », « ce lien », « cliquez » : le texte d'un lien doit dire où
          // il mène. C'est vrai pour un lecteur d'écran, qui parcourt souvent
          // la liste des liens seule, et c'est vrai pour un moteur.
          expect(part.texte.toLowerCase(), `${g.slug} : ${part.texte}`).not.toMatch(
            /^(ici|ce lien|cliquez ici|lien)$/,
          );
        }
      }
    }
  });

  /**
   * Les fragments sont recollés bout à bout au rendu : un espace oublié à la
   * fin d'une chaîne colle le mot au lien suivant, et la faute est invisible
   * dans le source — elle n'apparaît que sur la page publiée.
   */
  it('ne colle pas les mots autour d’un lien', () => {
    const FIN_OK = /[\s([«'’"/—–-]$/;
    const DEBUT_OK = /^[\s.,;:!?)\]»'’"/…—–-]/;

    for (const g of GUIDES) {
      for (const t of textesDe(g)) {
        if (!Array.isArray(t)) continue;
        t.forEach((part, i) => {
          if (typeof part === 'string') return;
          const avant = t[i - 1];
          const apres = t[i + 1];
          if (typeof avant === 'string' && avant !== '') {
            expect(FIN_OK.test(avant), `${g.slug} : « …${avant.slice(-18)}|${part.texte} »`).toBe(
              true,
            );
          }
          if (typeof apres === 'string' && apres !== '') {
            expect(
              DEBUT_OK.test(apres),
              `${g.slug} : « ${part.texte}|${apres.slice(0, 18)}… »`,
            ).toBe(true);
          }
        });
      }
    }
  });

  /**
   * Ce test n'exige aucun renvoi, et c'est délibéré : citer l'office dans le
   * corps d'un guide est une décision éditoriale, et une décision éditoriale
   * n'a pas à casser un build. Le jour où l'on voudra retirer un lien, il
   * faudra pouvoir le faire sans négocier avec la suite de tests.
   *
   * Ce qu'il interdit, c'est l'autre dérive, celle qui ne se voit pas en
   * relisant une page : porter le nom de l'office dans un titre, une adresse
   * ou une métadonnée. Là, on n'informe plus le lecteur — on se place sur une
   * requête qui appartient à son site officiel, qui la gagnera toujours, et on
   * laisse croire que Pièci est l'administration.
   */
  it('ne porte le nom de l’office ni dans un titre, ni dans une URL, ni dans une métadonnée', () => {
    const OFFICE = /oneci|office national de l[’']état civil/i;

    /** Tout ce qu'un moteur lit comme un intitulé, par opposition au corps. */
    function intitulesDe(guide: Guide): Array<[string, string]> {
      return [
        ['slug', guide.slug],
        ['titre', guide.titre],
        ['description', guide.description],
        ['question', guide.question],
        ...(guide.alias ?? []).map((a): [string, string] => ['alias', a]),
        ...(guide.avertissement ? [['titre d’avertissement', guide.avertissement.titre] as [string, string]] : []),
        ...guide.sections.map((s): [string, string] => ['titre de section', s.titre]),
        ...guide.sections.flatMap((s) =>
          s.blocs.flatMap((b): Array<[string, string]> => {
            if (b.type === 'encadre') return [['titre d’encadré', texteBrut(b.titre)]];
            if (b.type === 'etapes')
              return b.items.map((e): [string, string] => ['titre d’étape', texteBrut(e.titre)]);
            return [];
          }),
        ),
        ...(guide.faq ?? []).map((q): [string, string] => ['question de la FAQ', q.question]),
      ];
    }

    for (const guide of GUIDES) {
      for (const [ou, valeur] of intitulesDe(guide)) {
        expect(OFFICE.test(valeur), `${guide.slug} — ${ou} : « ${valeur} »`).toBe(false);
      }
    }
  });
});

/**
 * « Aucun tarif n'est affiché, et c'est délibéré » : les sources se
 * contredisent, les montants changent, et un chiffre périmé envoie quelqu'un
 * au guichet avec la mauvaise somme. On renvoie à rnpp.ci et au 1340.
 *
 * Ce qui est interdit, c'est un chiffre SUIVI d'une unité monétaire — pas le
 * mot seul. « Vous n'avez pas à avancer le moindre franc » est une tournure et
 * dit exactement ce qu'on veut dire ; « 5 000 FCFA » est un tarif, et il sera
 * faux avant la fin de l'année. Un nombre seul reste libre : les 90 jours, le
 * 1340, les horaires du call center.
 *
 * Les espaces insécables sont écrits en échappement : ce sont précisément ceux
 * qu'on emploie pour séparer les milliers, ils sont invisibles dans un
 * éditeur, et le test les manquerait sans qu'on comprenne pourquoi.
 */
describe('tarifs', () => {
  it('n’affiche aucun montant', () => {
    const MONTANT = /\d[\d\s.,\u00A0\u202F]*(f\s?cfa|fcfa|xof|francs?|f)\b/i;
    for (const g of GUIDES) {
      const trouve = corpsDe(g).match(MONTANT);
      expect(trouve?.[0], `${g.slug} affiche « ${trouve?.[0]} »`).toBeUndefined();
    }
  });
});

/**
 * Les questions fréquentes nourrissent à la fois la page et le `FAQPage` du
 * balisage structuré (voir scripts/prerender.mjs). Google sanctionne une page
 * qui déclare des questions absentes du texte : ici c'est impossible par
 * construction, les deux sortent du même tableau. Restent les fautes de
 * contenu, que voici.
 */
describe('questions fréquentes', () => {
  const avecFaq = GUIDES.filter((g) => g.faq?.length);

  it('pose de vraies questions', () => {
    for (const g of avecFaq) {
      for (const q of g.faq!) {
        expect(q.question.trim(), g.slug).not.toBe('');
        expect(q.question, `${g.slug} : ${q.question}`).toMatch(/[?.]$/);
      }
    }
  });

  it('répond à chacune', () => {
    for (const g of avecFaq) {
      for (const q of g.faq!) {
        const reponse = texteBrut(q.reponse);
        // Une réponse d'un mot ne produit pas de résultat enrichi et ne rend
        // service à personne : si on n'a pas la réponse, on ne pose pas la
        // question.
        expect(reponse.length, `${g.slug} : « ${q.question} »`).toBeGreaterThan(40);
      }
    }
  });

  it('ne pose jamais deux fois la même question', () => {
    for (const g of avecFaq) {
      const questions = g.faq!.map((q) => q.question);
      expect(new Set(questions).size, g.slug).toBe(questions.length);
    }
  });
});

/**
 * Le sommaire renvoie vers les ancres des `<h2>`, calculées à partir des
 * titres de section par le même `slugifier` que le registre. Deux sections
 * dont les titres se réduisent au même slug produiraient deux `id` identiques
 * et un sommaire qui ramène toujours au premier.
 */
describe('ancres de sommaire', () => {
  it('donne à chaque section une ancre unique', () => {
    for (const g of GUIDES) {
      const ancres = g.sections.map((s) => slugifier(s.titre));
      expect(new Set(ancres).size, `${g.slug} : ${ancres.join(', ')}`).toBe(ancres.length);
    }
  });

  it('ne produit jamais d’ancre vide', () => {
    for (const g of GUIDES) {
      for (const s of g.sections) {
        expect(slugifier(s.titre), `${g.slug} / ${s.titre}`).not.toBe('');
      }
    }
  });

  it('n’entre pas en collision avec l’ancre des questions fréquentes', () => {
    for (const g of GUIDES.filter((x) => x.faq?.length)) {
      const ancres = g.sections.map((s) => slugifier(s.titre));
      expect(ancres, g.slug).not.toContain('questions-frequentes');
    }
  });
});
