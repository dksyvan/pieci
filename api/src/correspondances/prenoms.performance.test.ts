import { describe, expect, it } from 'vitest';
import { prenomsConcordent } from './prenoms';

/**
 * La comparaison tourne sur la boucle d'événements de l'unique instance de
 * l'API : si elle traîne, c'est tout Pièci qui s'arrête. Une première version
 * essayait tous les appariements de prénoms — treize lettres isolées, que le
 * champ accepte, occupaient l'instance pendant des heures.
 */
const lettres = (n: number, derniere = '') =>
  Array.from({ length: n }, (_, i) => String.fromCharCode(97 + (i % 26))).join(' ') + derniere;

describe('prenomsConcordent reste instantané, quelle que soit la saisie', () => {
  it.each([
    ['13 lettres isolées, une différente', lettres(12, ' z'), lettres(13)],
    ['50 lettres isolées contre 49', lettres(50), lettres(49)],
    ['6 prénoms longs, une faute chacun', 'adjuoa akisis amenna aminaat affoeu ahuo z', 'adjoua akissi amenan aminata affoue ahou'],
    ['7 saisis contre 6 attendus, tous faux', 'aaaaaa bbbbbb cccccc dddddd eeeeee ffffff gggggg', 'hhhhhh iiiiii jjjjjj kkkkkk llllll mmmmmm'],
    // Cas de la vérification finale : cinq appariements gratuits, puis deux mots très longs.
    ['cinq « ab » puis 182 lettres', `ab ab ab ab ab ab ${'d'.repeat(182)}`, `ab ab ab ab ab ${'c'.repeat(85)}`],
    ['100 caractères de chaque côté', `ab ab ab ab ab ${'e'.repeat(85)}`, `ab ab ab ab ab ${'c'.repeat(85)}`],
    // Des prénoms répétés n'élaguent rien : l'exploration doit rester faite d'additions.
    ['prénoms répétés', Array(7).fill('abcdefghijklmno').join(' '), `${Array(5).fill('abcdefghijklmno').join(' ')} zz`],
  ])('%s', (_cas, saisis, attendus) => {
    const debut = performance.now();
    prenomsConcordent(saisis, attendus);
    expect(performance.now() - debut).toBeLessThan(75);
  });

  it('refuse au-delà de six prénoms attendus, sauf égalité exacte', () => {
    expect(prenomsConcordent(lettres(7), lettres(7))).toBe(true);
    expect(prenomsConcordent('amenan adjoua akissi aya awa ahou affoue', 'adjoua amenan akissi aya awa ahou affoue')).toBe(false);
  });
});
