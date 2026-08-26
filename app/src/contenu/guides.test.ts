import { describe, expect, it } from 'vitest';
import { GUIDES, RUBRIQUES, guideParSlug } from './index';

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

  it('rattache chaque guide à une rubrique et une seule', () => {
    const compte = new Map<string, number>();
    for (const r of RUBRIQUES) {
      for (const g of r.guides) compte.set(g.slug, (compte.get(g.slug) ?? 0) + 1);
    }
    for (const g of GUIDES) expect(compte.get(g.slug), g.slug).toBe(1);
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

/** Texte utile d'un guide, tel qu'un moteur le lira une fois rendu. */
function corpsDe(guide: (typeof GUIDES)[number]): string {
  return guide.sections
    .flatMap((s) =>
      s.blocs.map((b) => {
        switch (b.type) {
          case 'paragraphe':
            return b.texte;
          case 'liste':
            return b.items.join(' ');
          case 'etapes':
            return b.items.map((e) => `${e.titre} ${e.texte}`).join(' ');
          case 'encadre':
            return `${b.titre} ${b.texte}`;
          case 'tableau':
            return b.lignes.flat().join(' ');
        }
      }),
    )
    .join(' ');
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
