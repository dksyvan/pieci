import { describe, expect, it } from 'vitest';
import { GUIDES } from './index';
import { PAGES_REGISTRE } from './registre';
import {
  COMMUNES_CITABLES,
  MOMENTS,
  REGLES,
  cheminDuMessage,
  lienDuMessage,
  texteDuMessage,
  type Moment,
} from './partage-groupe';

const MOMENTS_CLES = MOMENTS.map((m) => m.cle);
const ORIGINE_ESSAI = 'https://pieci.ci';

describe('les liens du message', () => {
  /**
   * Un lien mort collé dans un groupe est pire que pas de message : il est vu
   * par cinquante personnes d'un coup, et personne ne revient vérifier.
   */
  it('mène toujours à une page qui existe', () => {
    const cheminsConnus = new Set<string>([
      '/',
      '/declarer',
      '/perdu',
      '/trouvees',
      ...PAGES_REGISTRE.map((p) => `/trouvees/${p.slug}`),
      ...GUIDES.map((g) => `/guides/${g.slug}`),
    ]);

    for (const moment of MOMENTS_CLES) {
      for (const commune of ['', ...COMMUNES_CITABLES]) {
        const chemin = cheminDuMessage(moment, commune);
        expect(cheminsConnus.has(chemin), `${moment} / ${commune || 'sans commune'} → ${chemin}`).toBe(
          true,
        );
      }
    }
  });

  it('ne cite que des communes qui ont leur page', () => {
    for (const commune of COMMUNES_CITABLES) {
      const chemin = cheminDuMessage('presentation', commune);
      expect(PAGES_REGISTRE.some((p) => `/trouvees/${p.slug}` === chemin), commune).toBe(true);
    }
  });

  it('écrit une adresse absolue, la seule qui marche hors du site', () => {
    for (const moment of MOMENTS_CLES) {
      expect(lienDuMessage(moment, '', ORIGINE_ESSAI)).toMatch(/^https:\/\/pieci\.ci(\/|$)/);
    }
  });

  it('ne laisse pas traîner de barre oblique en trop', () => {
    expect(lienDuMessage('presentation', '', ORIGINE_ESSAI)).toBe('https://pieci.ci');
    expect(lienDuMessage('presentation', 'Yopougon', ORIGINE_ESSAI)).toBe(
      'https://pieci.ci/trouvees/yopougon',
    );
  });

  it('suit l’origine qu’on lui donne, pour que l’essai ne renvoie pas en production', () => {
    expect(texteDuMessage('trouvee', '', 'http://localhost:4173')).toContain(
      'http://localhost:4173/declarer',
    );
  });
});

describe('le texte du message', () => {
  it('porte son lien, quelle que soit la situation', () => {
    for (const moment of MOMENTS_CLES) {
      const texte = texteDuMessage(moment, '', ORIGINE_ESSAI);
      expect(texte, moment).toContain(lienDuMessage(moment, '', ORIGINE_ESSAI));
    }
  });

  it('tient dans un message de groupe', () => {
    // Au-delà, on ne lit plus : WhatsApp replie le texte derrière « Lire la
    // suite », et un message replié dans un fil de cinquante messages est un
    // message perdu.
    for (const moment of MOMENTS_CLES) {
      for (const commune of ['', 'Yopougon', 'San-Pédro']) {
        const n = texteDuMessage(moment, commune, ORIGINE_ESSAI).length;
        expect(n, `${moment} / ${commune}`).toBeLessThanOrEqual(400);
        expect(n, `${moment} / ${commune}`).toBeGreaterThan(120);
      }
    }
  });

  it('cite la commune quand on présente le service, et seulement là', () => {
    expect(texteDuMessage('presentation', 'Yopougon', ORIGINE_ESSAI)).toContain('à Yopougon');
    // Les deux autres mènent à un formulaire qui demandera le lieu exact :
    // nommer la commune dans le texte ferait croire qu'elle est déjà prise en
    // compte.
    expect(texteDuMessage('trouvee', 'Yopougon', ORIGINE_ESSAI)).not.toContain('Yopougon');
    expect(texteDuMessage('perdue', 'Yopougon', ORIGINE_ESSAI)).not.toContain('Yopougon');
  });

  /**
   * Le message part dans un groupe où personne n'a rien demandé. S'il ne dit
   * pas ce qu'il protège, il ne reste qu'une publicité — et il se fait
   * supprimer comme telle.
   */
  it('dit ce qu’il protège, pas seulement où cliquer', () => {
    expect(texteDuMessage('trouvee', '', ORIGINE_ESSAI)).toMatch(/usurper|flout/i);
    expect(texteDuMessage('perdue', '', ORIGINE_ESSAI)).toMatch(/sans le numéro|gratuit/i);
    expect(texteDuMessage('presentation', '', ORIGINE_ESSAI)).toMatch(/gratuit/i);
  });

  it('ne promet jamais un montant', () => {
    for (const moment of MOMENTS_CLES) {
      expect(texteDuMessage(moment, '', ORIGINE_ESSAI)).not.toMatch(/\d+\s*(FCFA|F\b|francs?)/i);
    }
  });

  it('n’annonce rien au nom d’une administration', () => {
    for (const moment of MOMENTS_CLES) {
      const texte = texteDuMessage(moment, '', ORIGINE_ESSAI);
      expect(texte, moment).not.toMatch(/officiel|ministère|gouvernement|ONECI/i);
    }
  });
});

describe('les situations proposées', () => {
  it('n’en propose pas plus qu’on n’en choisit d’un coup d’œil', () => {
    expect(MOMENTS).toHaveLength(3);
  });

  it('donne à chacune un libellé et le moment de s’en servir', () => {
    for (const m of MOMENTS) {
      expect(m.libelle.length, m.cle).toBeGreaterThan(10);
      expect(m.quand.length, m.cle).toBeGreaterThan(30);
    }
  });

  it('n’a pas deux fois la même clé', () => {
    expect(new Set(MOMENTS_CLES).size).toBe(MOMENTS.length);
  });

  it('couvre toutes les clés du type', () => {
    const attendues: Moment[] = ['trouvee', 'perdue', 'presentation'];
    expect([...MOMENTS_CLES].sort()).toEqual([...attendues].sort());
  });
});

describe('les règles de partage', () => {
  it('tiennent en quelques lignes lisibles avant d’envoyer', () => {
    expect(REGLES.length).toBeGreaterThanOrEqual(3);
    expect(REGLES.length).toBeLessThanOrEqual(5);
    for (const r of REGLES) expect(r.length).toBeLessThanOrEqual(170);
  });

  it('disent de répondre plutôt que de démarcher', () => {
    expect(REGLES.join(' ')).toMatch(/réponse|répondre/i);
  });
});
