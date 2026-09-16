import { describe, expect, it } from 'vitest';
import { lireMrz, MAX_CARACTERES_MRZ, MAX_LIGNES_MRZ, type LectureMrz } from './mrz';
import source from './mrz.ts?raw';

/**
 * La MRZ porte le numéro de la pièce, la date de naissance, le sexe, la
 * nationalité, l'expiration et probablement l'identifiant national. Pièci n'en
 * garde rien : ces tests vérifient d'abord que rien ne sort, ensuite que le nom
 * est bien lu.
 *
 * Données : uniquement les spécimens publiés dans la norme ICAO 9303 (État
 * fictif « UTO », titulaire ERIKSSON), parfois recopiés avec l'État « CIV »
 * pour exercer la règle du type, et des noms inventés. Tous les numéros et
 * dates sont ceux des spécimens, donc fictifs.
 */

// ---------------------------------------------------------------------------
// Spécimens et fabrication de MRZ valides
// ---------------------------------------------------------------------------

/** Partie 5, annexe A : carte TD1 d'Utopie. */
const TD1_UTO = ['I<UTOD231458907<<<<<<<<<<<<<<<', '7408122F1204159UTO<<<<<<<<<<<6', 'ERIKSSON<<ANNA<MARIA<<<<<<<<<<'];
/**
 * Même carte, État émetteur « CIV ». L'État (positions 3-5) n'entre dans aucun
 * chiffre de contrôle : la MRZ reste valide.
 */
const TD1_CIV = ['I<CIVD231458907<<<<<<<<<<<<<<<', TD1_UTO[1], TD1_UTO[2]];
/** Partie 3, figure 1, et partie 4, annexe A : passeport TD3, code « P< ». */
const TD3_P = ['P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<', 'L898902C36UTO7408122F1204159ZE184226B<<<<<10'];
/** Partie 4, amendement 1 : code de type « PP », obligatoire à partir de 2028. */
const TD3_PP = ['PPUTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<', 'L898902C36UTO7408122F3404159ZE184226B<<<<<16'];
/**
 * Partie 3, annexe A, exemple 3 : seule la ligne 2 est publiée (numéro court
 * complété d'un chevron, numéro personnel vide). La ligne 1 est complétée avec
 * le titulaire des autres spécimens.
 */
const TD3_HA = ['P<YTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<', 'HA672242<6YTO5802254M9601086<<<<<<<<<<<<<<08'];

/** Numéros, dates et données facultatives des spécimens : ne doivent jamais sortir. */
const SECRETS = [
  'D23145890', 'L898902C3', 'ZE184226B', 'HA672242', '740812', '120415', '340415', '580225', '960108',
  'A1B2C3D4E5F', 'D2314589077',
];

/** Chiffre de contrôle, recalculé indépendamment du module pour fabriquer des MRZ. */
function cle(champ: string): string {
  const val = (c: string) => (c === '<' ? 0 : /\d/.test(c) ? Number(c) : c.charCodeAt(0) - 55);
  let somme = 0;
  for (let i = 0; i < champ.length; i++) somme += val(champ[i]) * [7, 3, 1][i % 3];
  return String(somme % 10);
}

/** Carte TD1 aux chiffres de contrôle justes, numéro long compris. */
function carteTd1(o: { etat?: string; numero?: string; facultatif2?: string; nom: string }): string[] {
  const { etat = 'CIV', numero = 'D23145890', facultatif2 = '', nom } = o;
  const l1 = (
    numero.length <= 9
      ? `I<${etat}${numero.padEnd(9, '<')}${cle(numero.padEnd(9, '<'))}`
      : `I<${etat}${numero.slice(0, 9)}<${numero.slice(9)}${cle(numero)}<`
  ).padEnd(30, '<');
  let l2 = `7408122F1204159UTO${facultatif2.padEnd(11, '<')}`;
  l2 += cle(l1.slice(5, 30) + l2.slice(0, 7) + l2.slice(8, 15) + l2.slice(18, 29));
  return [l1, l2, nom.padEnd(30, '<')];
}

const remplacer = (s: string, i: number, c: string) => s.slice(0, i) + c + s.slice(i + 1);
const cles = (sortie: LectureMrz | null) => Object.keys(sortie ?? {}).sort();

/**
 * Un chiffre écrit avec la lettre qu'on lui confond (0→O, 1→I, 2→Z, 5→S, 6→G,
 * 8→B), recodé ici indépendamment du module. Le parseur fait cette conversion
 * dans le nom : une date qui prendrait la place du nom sortirait sous cette
 * forme (« 01022005 » → « OIOZZOOS »), invisible pour une recherche de chiffres.
 */
const LETTRE_CONFONDUE: Record<string, string> = { 0: 'O', 1: 'I', 2: 'Z', 5: 'S', 6: 'G', 8: 'B' };
const enLettres = (s: string) => s.replace(/[012568]/g, (c) => LETTRE_CONFONDUE[c]);

/**
 * Aucun chiffre, aucun numéro ni date de spécimen dans la sortie sérialisée,
 * ni en clair, ni écrit en lettres confondues, espaces retirées.
 */
function expectSansFuite(sortie: LectureMrz | null, secrets: readonly string[] = SECRETS) {
  const s = JSON.stringify(sortie) ?? '';
  expect(s).not.toMatch(/\d/);
  const compact = s.replace(/\s/g, '');
  for (const secret of secrets) {
    expect(compact).not.toContain(secret);
    expect(compact).not.toContain(enLettres(secret));
  }
}

// ---------------------------------------------------------------------------

describe('fabrication des MRZ de test', () => {
  it('suit les exemples de chiffre de contrôle de la norme (partie 3, § 4.9)', () => {
    expect(cle('520727')).toBe('3');
    expect(cle('AB2134<<<')).toBe('5');
    expect(carteTd1({ etat: 'UTO', nom: 'ERIKSSON<<ANNA<MARIA' })).toEqual(TD1_UTO);
  });
});

describe('lireMrz — spécimens ICAO', () => {
  it.each([
    ['TD1 émis par CIV', TD1_CIV, { typePiece: 'CNI', nom: 'ERIKSSON', prenom: 'ANNA MARIA' }],
    ['TD3 « P< »', TD3_P, { typePiece: 'Passeport', nom: 'ERIKSSON', prenom: 'ANNA MARIA' }],
    ['TD3 « PP » (2028)', TD3_PP, { typePiece: 'Passeport', nom: 'ERIKSSON', prenom: 'ANNA MARIA' }],
    ['TD3 numéro court, numéro personnel vide', TD3_HA, { typePiece: 'Passeport', nom: 'ERIKSSON', prenom: 'ANNA MARIA' }],
  ])('%s', (_, lignes, attendu) => {
    const sortie = lireMrz(lignes);
    expect(sortie).toEqual(attendu);
    expect(cles(sortie)).toEqual(['nom', 'prenom', 'typePiece']);
    expectSansFuite(sortie);
  });

  it("TD1 d'un autre État : MRZ acceptée, type laissé vide", () => {
    const sortie = lireMrz(TD1_UTO);
    expect(sortie).toEqual({ nom: 'ERIKSSON', prenom: 'ANNA MARIA' });
    expect(cles(sortie)).toEqual(['nom', 'prenom']);
    expectSansFuite(sortie);
  });

  it("carte CIV qui n'est pas une carte d'identité (code A ou C) : type laissé vide", () => {
    for (const code of ['A', 'C']) {
      const sortie = lireMrz([remplacer(TD1_CIV[0], 0, code), TD1_CIV[1], TD1_CIV[2]]);
      expect(sortie).toEqual({ nom: 'ERIKSSON', prenom: 'ANNA MARIA' });
    }
  });

  it('passeport émis par un autre État : reste un passeport', () => {
    expect(lireMrz(TD3_P)?.typePiece).toBe('Passeport');
  });
});

describe('lireMrz — nom et prénoms', () => {
  it("n'invente pas d'apostrophe : NGUESSAN reste NGUESSAN, N<GUESSAN devient « N GUESSAN »", () => {
    expect(lireMrz(carteTd1({ nom: 'NGUESSAN<<KOUASSI<ADJOUA' }))).toEqual({
      typePiece: 'CNI', nom: 'NGUESSAN', prenom: 'KOUASSI ADJOUA',
    });
    expect(lireMrz(carteTd1({ nom: 'N<GUESSAN<<SERGE<YVAN' }))).toEqual({
      typePiece: 'CNI', nom: 'N GUESSAN', prenom: 'SERGE YVAN',
    });
  });

  it('garde les noms composés entiers : TIE<BI << KOUAME', () => {
    expect(lireMrz(carteTd1({ nom: 'TIE<BI<<KOUAME<ESTELLE' }))).toEqual({
      typePiece: 'CNI', nom: 'TIE BI', prenom: 'KOUAME ESTELLE',
    });
  });

  it('nom qui remplit tout le champ (tronqué par l’émetteur) : lu tel quel', () => {
    const nom = 'KOUADIO<AFFOUE<<MARIE<CHRISTI';
    expect(nom.length + 1).toBe(30);
    expect(lireMrz(carteTd1({ nom: `${nom}N` }))).toEqual({
      typePiece: 'CNI', nom: 'KOUADIO AFFOUE', prenom: 'MARIE CHRISTIN',
    });
  });

  it('sans double chevron : patronyme seul, prénoms vides', () => {
    expect(lireMrz(carteTd1({ nom: 'ERIKSSON' }))).toEqual({ typePiece: 'CNI', nom: 'ERIKSSON', prenom: '' });
  });

  it('patronyme vide, ou chiffre qui ne se confond avec aucune lettre : rejet', () => {
    expect(lireMrz(carteTd1({ nom: '<<ANNA<MARIA' }))).toBeNull();
    expect(lireMrz(carteTd1({ nom: 'ERIK4SON<<ANNA' }))).toBeNull();
  });
});

describe('lireMrz — tous les chiffres de contrôle sont exigés', () => {
  it('le spécimen de départ est accepté', () => {
    expect(lireMrz(TD1_CIV)).not.toBeNull();
    expect(lireMrz(TD3_P)).not.toBeNull();
  });

  it.each([
    ['numéro', 0, 14],
    ['date de naissance', 1, 6],
    ['date d’expiration', 1, 14],
    ['composite', 1, 29],
  ])('TD1 : chiffre de contrôle du %s faux → null', (_, ligne, position) => {
    const lignes = [...TD1_CIV];
    const juste = Number(lignes[ligne][position]);
    lignes[ligne] = remplacer(lignes[ligne], position, String((juste + 1) % 10));
    expect(lireMrz(lignes)).toBeNull();
  });

  it('TD1 : donnée facultative modifiée, que seul le composite couvre → null', () => {
    // « B » et non « A » : A, K et U valent 10, 20 et 30, donc zéro modulo 10.
    // Mis à la place d'un chevron, ils sont invisibles pour tout chiffre de
    // contrôle 7-3-1 — une propriété de la norme, pas du parseur.
    expect(lireMrz([TD1_CIV[0], remplacer(TD1_CIV[1], 20, 'B'), TD1_CIV[2]])).toBeNull();
    expect(lireMrz([remplacer(TD1_CIV[0], 20, 'B'), TD1_CIV[1], TD1_CIV[2]])).toBeNull();
  });

  it.each([
    ['numéro', 9],
    ['date de naissance', 19],
    ['date d’expiration', 27],
    ['numéro personnel', 42],
    ['composite', 43],
  ])('TD3 : chiffre de contrôle du %s faux → null', (_, position) => {
    const juste = Number(TD3_P[1][position]);
    expect(lireMrz([TD3_P[0], remplacer(TD3_P[1], position, String((juste + 1) % 10))])).toBeNull();
  });

  it('TD3 : numéro personnel vide mais chiffre de contrôle non nul → null', () => {
    expect(lireMrz([TD3_HA[0], remplacer(TD3_HA[1], 42, '3')])).toBeNull();
  });

  it('TD3 : une date qui contient une lettre non confondable → null', () => {
    expect(lireMrz([TD3_P[0], remplacer(TD3_P[1], 15, 'A')])).toBeNull();
  });
});

describe('lireMrz — numéro de carte de plus de 9 caractères', () => {
  const longue = carteTd1({ numero: 'D2314589077', facultatif2: 'A1B2C3D4E5F', nom: 'ERIKSSON<<ANNA<MARIA' });

  it('suite du numéro et son contrôle dans les données facultatives : accepté, rien ne sort', () => {
    expect(longue[0][14]).toBe('<');
    const sortie = lireMrz(longue);
    expect(sortie).toEqual({ typePiece: 'CNI', nom: 'ERIKSSON', prenom: 'ANNA MARIA' });
    expectSansFuite(sortie);
  });

  it('contrôle du numéro long faux → null', () => {
    // Positions 16-17 : suite « 77 », position 18 : chiffre de contrôle.
    const juste = Number(longue[0][17]);
    expect(lireMrz([remplacer(longue[0], 17, String((juste + 1) % 10)), longue[1], longue[2]])).toBeNull();
  });

  it('suite du numéro sans chiffre de contrôle, ou sans chevron final → null', () => {
    // Un seul caractère avant le chevron : pas de place pour un chiffre de contrôle.
    expect(lireMrz([remplacer(longue[0], 16, '<'), longue[1], longue[2]])).toBeNull();
    expect(lireMrz([`${longue[0].slice(0, 15)}${'7'.repeat(15)}`, longue[1], longue[2]])).toBeNull();
  });
});

describe('lireMrz — tolérance au bruit de l’OCR', () => {
  const attendu = { typePiece: 'CNI', nom: 'ERIKSSON', prenom: 'ANNA MARIA' };

  it('espaces, minuscules et texte du recto autour de la bande', () => {
    const lignes = [
      "RÉPUBLIQUE D'UTOPIE",
      'CARTE D’IDENTITÉ — SPÉCIMEN',
      ...TD1_CIV.map((l) => l.replace(/(.{5})/g, '$1 ').toLowerCase()),
      'Signature',
    ];
    expect(lireMrz(lignes)).toEqual(attendu);
  });

  it('lignes reçues en un seul bloc, fins de ligne Windows comprises', () => {
    expect(lireMrz([TD1_CIV.join('\r\n')])).toEqual(attendu);
    expect(lireMrz([TD3_P.join('\n')])?.nom).toBe('ERIKSSON');
  });

  it('« lu à la place d’un chevron', () => {
    expect(lireMrz(TD1_CIV.map((l) => l.replace(/<</g, '«<')))).toEqual(attendu);
  });

  it('lettres lues dans les dates et les chiffres de contrôle, chiffres isolés lus dans le nom', () => {
    expect(lireMrz([TD1_CIV[0], TD1_CIV[1].replace(/0/g, 'O').replace(/1/g, 'I'), TD1_CIV[2]])).toEqual(attendu);
    expect(lireMrz([TD1_CIV[0], TD1_CIV[1], TD1_CIV[2].replace('ERIKSSON', 'ER1KSS0N')])).toEqual(attendu);
    expect(lireMrz([TD3_P[0].replace('MARIA', 'MAR1A'), TD3_P[1].replace('740812', '74O8I2')])).toEqual({
      ...attendu, typePiece: 'Passeport',
    });
  });

  it('État lu avec un chiffre (C1V) : reste une CNI', () => {
    expect(lireMrz([TD1_CIV[0].replace('CIV', 'C1V'), TD1_CIV[1], TD1_CIV[2]])).toEqual(attendu);
  });

  it('remplissage final lu « K »', () => {
    expect(lireMrz([TD1_CIV[0], TD1_CIV[1], TD1_CIV[2].replace(/<{3,}$/, (m) => 'K'.repeat(m.length))])).toEqual(attendu);
  });

  it('ligne du nom ou ligne 1 écourtée par l’OCR (chevrons finaux perdus)', () => {
    expect(lireMrz([TD1_CIV[0], TD1_CIV[1], TD1_CIV[2].slice(0, 28)])).toEqual(attendu);
    expect(lireMrz([TD1_CIV[0].slice(0, 28), TD1_CIV[1], TD1_CIV[2]])).toEqual(attendu);
  });

  it('caractère utile perdu en ligne 1 : le composite le voit → null', () => {
    expect(lireMrz([TD1_CIV[0].slice(0, 5) + TD1_CIV[0].slice(6), TD1_CIV[1], TD1_CIV[2]])).toBeNull();
  });

  it('fuzz : 1 000 MRZ bruitées (O/0, I/1, S/5, B/8, Z/2) → null ou la bonne identité, jamais une donnée chiffrée', () => {
    const PERMUTATIONS: Record<string, string> = { 0: 'O', O: '0', 1: 'I', I: '1', 5: 'S', S: '5', 8: 'B', B: '8', 2: 'Z', Z: '2' };
    const identite = { nom: 'ERIKSSON', prenom: 'ANNA MARIA' };
    const MODELES: [string[], LectureMrz][] = [
      [TD1_CIV, { typePiece: 'CNI', ...identite }],
      [TD1_UTO, identite],
      [TD3_P, { typePiece: 'Passeport', ...identite }],
      [TD3_PP, { typePiece: 'Passeport', ...identite }],
      [TD3_HA, { typePiece: 'Passeport', ...identite }],
    ];
    let graine = 20260916;
    const hasard = () => (graine = (graine * 1664525 + 1013904223) >>> 0) / 4294967296;

    let bruitees = 0;
    let bruiteesAcceptees = 0;
    for (let n = 0; n < 1000; n++) {
      const [modele, attendu] = MODELES[Math.floor(hasard() * MODELES.length)];
      const lignes = [...modele];
      const substitutions = 1 + Math.floor(hasard() * 3);
      let bruitee = false;
      for (let s = 0; s < substitutions; s++) {
        const l = Math.floor(hasard() * lignes.length);
        const p = Math.floor(hasard() * lignes[l].length);
        const c = PERMUTATIONS[lignes[l][p]];
        if (c) {
          lignes[l] = remplacer(lignes[l], p, c);
          bruitee = true;
        }
      }
      const sortie = lireMrz(lignes);
      expectSansFuite(sortie);
      // Ces confusions touchent des lettres que la correction par type de champ
      // sait rétablir : une lecture acceptée est forcément la bonne.
      if (sortie) expect(sortie).toEqual(attendu);
      if (bruitee) {
        bruitees++;
        if (sortie) bruiteesAcceptees++;
      }
    }
    // Mesuré avec cette graine : 469 MRZ réellement bruitées, 367 relues.
    // Sans les corrections, presque toutes seraient rejetées.
    expect(bruitees).toBeGreaterThan(400);
    expect(bruiteesAcceptees).toBeGreaterThan(300);
  });
});

describe('lireMrz — une autre ligne à la place de la ligne du nom', () => {
  /*
   * Aucun chiffre de contrôle ne couvre le nom. Quand la vraie ligne du nom est
   * perdue (trop courte pour être candidate, illisible), la ligne suivante
   * prend sa place derrière deux lignes contrôlées justes. Relevé en revue :
   * convertis en lettres, les chiffres de cette ligne sortaient comme nom.
   */
  const [l1, l2] = TD1_CIV;

  it.each([
    [
      'ligne du nom perdue, puis la ligne de la date de naissance',
      [l1, l2, 'KONE<<AWA', 'Date de naissance 01/02/2005 ABIDJAN'],
      ['01022005'],
    ],
    ['identifiant national espacé', [l1, l2, 'NNI 1052 6812 0588 1256 0218 2256 01'], ['1052681205881256']],
    ['une ligne 2 en troisième position', [l1, l2, '8508122F2506158CIV<<<<<<<<<<<6'], ['850812', '250615']],
    // Même ligne 2 (dates contrôlées justes), lue entièrement en lettres : aucun chiffre à compter.
    ['une ligne 2 lue tout en lettres confondues', [l1, l2, 'BSOBIZZFZGOBISGCIV<<<<<<<<<<<S'], ['850812', '260815']],
    [
      'passeport : une ligne de texte commençant par « PASSEPORT » à la place de la ligne 1',
      ['Passeport ((Date de naissance: 01/02/2005 à ABIDJAN) CI', TD3_P[1]],
      ['01022005'],
    ],
  ])('%s → null', (_, lignes, secrets) => {
    const sortie = lireMrz(lignes);
    expectSansFuite(sortie, secrets);
    expect(sortie).toBeNull();
  });

  it('limite assumée : trois chiffres, deux chiffres voisins ou aucun double chevron dans le nom → null', () => {
    expect(lireMrz([l1, l2, TD1_CIV[2].replace('ERIKSSON', 'ER1KSS0N').replace('MARIA', 'MAR1A')])).toBeNull();
    expect(lireMrz([l1, l2, TD1_CIV[2].replace('SS', '55')])).toBeNull();
    // Tous les chevrons lus « K » : le nom sortait collé, « ERIKSSONKKANNAKMARIA ».
    expect(lireMrz([l1, l2, TD1_CIV[2].replace(/</g, 'K')])).toBeNull();
  });

  it('un nom qui a la silhouette d’une ligne 2 sans ses chiffres de contrôle reste lu', () => {
    // Quinze lettres confondables et un « M » à la huitième place, mais aucune date contrôlée juste.
    expect(lireMrz(carteTd1({ nom: 'DIOBO<<MOISSOGO' }))).toEqual({ typePiece: 'CNI', nom: 'DIOBO', prenom: 'MOISSOGO' });
  });

  it('fuzz : 2 000 lignes de texte et de nombres à la place du nom → jamais un nombre écrit en lettres', () => {
    let graine = 20260916;
    const hasard = () => (graine = (graine * 1664525 + 1013904223) >>> 0) / 4294967296;
    const choix = <T,>(a: readonly T[]): T => a[Math.floor(hasard() * a.length)];
    // Seuls ces chiffres ont une lettre confondue : les autres font déjà rejeter le nom.
    const nombre = (n: number) => Array.from({ length: n }, () => choix(['0', '1', '2', '5', '6', '8'])).join('');
    const MOTS = ['Date de naissance', 'NNI', 'N°', 'ABIDJAN', 'KONE', '<<', '(', '«', 'le', 'Taille'];
    const nettoyee = (l: string) => l.toUpperCase().replace(/[«‹(\[{]/g, '<').replace(/[^A-Z0-9<]/g, '');

    let candidates = 0;
    for (let n = 0; n < 2000; n++) {
      const nombres: string[] = [];
      const morceaux: string[] = [];
      for (let m = 0, k = 3 + Math.floor(hasard() * 6); m < k; m++) {
        if (hasard() < 0.5) {
          const x = nombre(1 + Math.floor(hasard() * 8));
          nombres.push(x);
          morceaux.push(hasard() < 0.5 ? x : x.split('').join(choix([' ', '/', '.', '(', '<'])));
        } else {
          morceaux.push(choix(MOTS));
        }
      }
      const ligne = morceaux.join(choix([' ', '', '<', '<<']));
      const longueur = nettoyee(ligne).length;
      if (longueur >= 28 && longueur <= 46) candidates++;
      const sortie = lireMrz([l1, l2, ligne]);
      // Deux chiffres isolés au plus peuvent passer pour des confusions ; trois, jamais.
      expectSansFuite(sortie, nombres.filter((x) => x.length >= 3));
    }
    // Le fuzz n'est pas vide : une bonne part des lignes a la longueur d'une ligne de MRZ.
    expect(candidates).toBeGreaterThan(500);
  });
});

describe('lireMrz — entrées inexploitables', () => {
  it.each([
    ['tableau vide', []],
    ['ligne vide', ['']],
    ['texte d’un permis, sans MRZ', ['PERMIS DE CONDUIRE', 'Nom : KOUASSI', 'Prénoms : ADJOUA']],
    ['une seule ligne de la bande', [TD1_CIV[0]]],
  ])('%s → null', (_, lignes) => {
    expect(lireMrz(lignes)).toBeNull();
  });

  it('valeurs qui ne sont pas des lignes : null, sans exception', () => {
    for (const entree of [null, undefined, 42, 'I<CIV', {}, [null, 3, {}], [TD1_CIV[0], 7, TD1_CIV[1], TD1_CIV[2]]]) {
      expect(() => lireMrz(entree as unknown as string[])).not.toThrow();
    }
    // Les éléments qui ne sont pas des chaînes sont ignorés, pas fatals.
    expect(lireMrz([TD1_CIV[0], 7, TD1_CIV[1], TD1_CIV[2]] as unknown as string[])).not.toBeNull();
    expect(lireMrz(null as unknown as string[])).toBeNull();
  });
});

describe('lireMrz — coût borné', () => {
  it('entrée au-delà des bornes : rejet immédiat', () => {
    expect(lireMrz([`${'<'.repeat(MAX_CARACTERES_MRZ)}`, ...TD1_CIV])).toBeNull();
    expect(lireMrz([...Array(MAX_LIGNES_MRZ).fill(''), ...TD1_CIV])).toBeNull();
    expect(lireMrz([Array(MAX_LIGNES_MRZ + 1).fill('').join('\n')])).toBeNull();
  });

  it('entrée hostile de grande taille : réponse en quelques millisecondes', () => {
    // 10 Mo en un seul bloc ; 10 millions de lignes vides.
    const bloc = 'I<CIV'.repeat(2_000_000);
    const lignesVides: string[] = Array(10_000_000).fill('');
    // À la limite : toutes les lignes sont candidates, aucune fenêtre n'est valide.
    const presque = remplacer(TD1_CIV[0], 14, '8').replace(/(.)/g, '$1 ');
    const limite: string[] = Array(Math.min(MAX_LIGNES_MRZ, Math.floor(MAX_CARACTERES_MRZ / presque.length))).fill(presque);
    expect(limite.length).toBeGreaterThan(100);
    expect(limite.join('').length).toBeLessThanOrEqual(MAX_CARACTERES_MRZ);
    // Une ligne unique très longue, sans fin de ligne, sous la borne.
    const longueLigne = 'A<'.repeat(MAX_CARACTERES_MRZ / 2 - 1);

    const debut = performance.now();
    expect(lireMrz([bloc])).toBeNull();
    expect(lireMrz(lignesVides)).toBeNull();
    for (let i = 0; i < 20; i++) expect(lireMrz(limite)).toBeNull();
    expect(lireMrz([longueLigne])).toBeNull();
    expect(performance.now() - debut).toBeLessThan(500);
  });
});

describe('mrz.ts — ne journalise rien, ne lève rien', () => {
  it('aucun appel à la console ni throw dans le code source', () => {
    expect(source).not.toMatch(/\bconsole\s*\./);
    expect(source).not.toMatch(/\bthrow\b/);
  });
});
