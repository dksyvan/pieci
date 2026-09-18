import { describe, expect, it } from 'vitest';
import { COMMUNES } from '@partage/communes';
import { TYPES_PIECE } from '@partage/types';
import { COMMUNES_PUBLIEES, PAGES_REGISTRE, pageRegistreParSlug, slugifier } from './registre';
import { GUIDES } from './index';

/**
 * Les pages d'agrégat du registre.
 *
 * Le risque propre à ces pages n'est pas la panne, c'est le silence : une
 * commune publiée sans texte de contexte produirait une page indexée, vide de
 * tout ce qui la distingue des quinze autres. Rien dans le build ne le
 * signalerait.
 *
 * C'est ce test qui a attrapé l'extension de `COMMUNES` à tout le pays : elle
 * aurait mis en ligne cent soixante-cinq pages sans une ligne propre. Les
 * pages publiées viennent donc de `CONTEXTE_COMMUNE`, pas de `COMMUNES`.
 */

describe('slugifier', () => {
  it('retire les accents et les caractères hors URL', () => {
    expect(slugifier('Port-Bouët')).toBe('port-bouet');
    expect(slugifier('Adjamé')).toBe('adjame');
    expect(slugifier('San-Pédro')).toBe('san-pedro');
    expect(slugifier('Attécoubé')).toBe('attecoube');
    expect(slugifier('Permis de conduire')).toBe('permis-de-conduire');
    expect(slugifier('Carte étudiante')).toBe('carte-etudiante');
    expect(slugifier('CNI')).toBe('cni');
  });

  it('ne laisse jamais de tiret en bordure', () => {
    for (const p of PAGES_REGISTRE) {
      expect(p.slug, p.valeur).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });
});

describe('couverture', () => {
  it('publie une page par commune rédigée et une par type', () => {
    expect(PAGES_REGISTRE).toHaveLength(COMMUNES_PUBLIEES.length + TYPES_PIECE.length);
  });

  /**
   * Les pages publiées sont un sous-ensemble choisi, pas toute la table des
   * communes — celle-ci couvre le pays entier depuis le 18 septembre 2026,
   * pour que quelqu'un à Man puisse déclarer. Mais chaque page publiée doit
   * désigner une commune qui existe vraiment : une faute de frappe dans
   * `CONTEXTE_COMMUNE` fabriquerait une page indexée pour un lieu qu'aucune
   * déclaration ne portera jamais.
   */
  it('ne publie que des communes qui existent dans la table', () => {
    const inconnues = COMMUNES_PUBLIEES.filter((c) => !(c in COMMUNES));
    expect(inconnues, 'communes publiées absentes de COMMUNES').toEqual([]);
  });

  it('couvre beaucoup plus de communes qu’elle n’en publie', () => {
    // Le garde-fou de l'inverse : si les deux listes se rejoignaient, c'est
    // qu'on serait revenu à publier une page par commune.
    expect(Object.keys(COMMUNES).length).toBeGreaterThan(COMMUNES_PUBLIEES.length * 5);
  });

  it('n’a aucun slug en double entre communes et types', () => {
    const slugs = PAGES_REGISTRE.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('se résout par slug', () => {
    for (const p of PAGES_REGISTRE) {
      expect(pageRegistreParSlug(p.slug)?.valeur, p.slug).toBe(p.valeur);
    }
    expect(pageRegistreParSlug('commune-inventee')).toBeUndefined();
    expect(pageRegistreParSlug(undefined)).toBeUndefined();
  });
});

describe('contenu propre à chaque page', () => {
  it('donne un contexte à chaque commune et à chaque type', () => {
    // Sans ce texte, la page ne se distingue plus que par son titre : c'est
    // exactement le contenu dupliqué que Google déclasse.
    const sansIntro = PAGES_REGISTRE.filter((p) => p.intro.trim().length < 120).map(
      (p) => `${p.valeur} (${p.intro.trim().length} car.)`,
    );
    expect(sansIntro, 'pages sans contexte propre').toEqual([]);
  });

  it('n’écrit pas deux fois le même contexte', () => {
    const intros = PAGES_REGISTRE.map((p) => p.intro);
    expect(new Set(intros).size).toBe(intros.length);
  });

  it('renvoie vers un guide qui existe, quand il en indique un', () => {
    for (const p of PAGES_REGISTRE) {
      if (!p.guide) continue;
      expect(
        GUIDES.some((g) => g.slug === p.guide),
        `${p.valeur} renvoie vers ${p.guide}`,
      ).toBe(true);
    }
  });

  it('garde des titres et des descriptions dans la fenêtre de Google', () => {
    for (const p of PAGES_REGISTRE) {
      expect(p.titre.length, `titre ${p.valeur} (${p.titre.length} car.)`).toBeLessThanOrEqual(65);
      expect(
        p.description.length,
        `description ${p.valeur} (${p.description.length} car.)`,
      ).toBeLessThanOrEqual(165);
      expect(p.description.length, `description ${p.valeur}`).toBeGreaterThan(70);
    }
  });
});
