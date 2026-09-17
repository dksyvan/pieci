import { describe, expect, it } from 'vitest';
import { fusionner, LONGUEUR_MAX_CHAMP, type LectureFusionnee } from './fusion-lecture';
import { lireMrz, type LectureMrz } from './mrz';
import { lireRecto, type LectureRecto } from './recto';
import source from './fusion-lecture.ts?raw';

/**
 * La MRZ tranche le découpage, le recto donne l'orthographe. Ces tests fixent
 * la règle de concordance (celle de `normaliser()`, partagée avec le
 * rapprochement et le défi), le calcul de la coupure possible, et la liste
 * fermée des clés que la page reçoit.
 *
 * Données : noms inventés, et bandes MRZ tirées des spécimens de la norme
 * ICAO 9303 (seule la ligne du nom, qu'aucun chiffre de contrôle ne couvre,
 * est remplacée).
 */

const CLES_AUTORISEES = ['decoupage', 'nom', 'peutEtreCoupe', 'prenom', 'typePiece'];
const clesDe = (lecture: LectureFusionnee | null) => Object.keys(lecture ?? {});

describe('fusionner — orthographe du recto, découpage de la MRZ', () => {
  it("N'GUESSAN (recto) et NGUESSAN (MRZ) : l'apostrophe revient", () => {
    expect(
      fusionner(
        { typePiece: 'CNI', nom: 'NGUESSAN', prenom: 'KOUASSI ADJOUA' },
        { typePiece: 'CNI', nom: "N'GUESSAN", prenom: 'KOUASSI ADJOUA', decoupage: 'libelles' },
      ),
    ).toEqual({ typePiece: 'CNI', nom: "N'GUESSAN", prenom: 'KOUASSI ADJOUA', peutEtreCoupe: false });
  });

  it('accents, tirets et apostrophe typographique reviennent aussi', () => {
    expect(
      fusionner(
        { typePiece: 'CNI', nom: 'TIE BI', prenom: 'KOUAME SERGE YVAN' },
        { nom: 'TIÉ BI', prenom: 'KOUAMÉ SERGE-YVAN', decoupage: 'libelles' },
      ),
    ).toEqual({ typePiece: 'CNI', nom: 'TIÉ BI', prenom: 'KOUAMÉ SERGE-YVAN', peutEtreCoupe: false });
    expect(fusionner({ nom: 'N GUESSAN', prenom: 'AYA' }, { nom: 'N’GUESSAN', prenom: 'AYA' })?.nom).toBe('N’GUESSAN');
  });

  it('une lettre diffère : la MRZ est gardée, champ par champ', () => {
    // « H » lu à la place de « N » sur le recto : on ne l'adopte pas.
    expect(
      fusionner(
        { typePiece: 'CNI', nom: 'NGUESSAN', prenom: 'KOUAME' },
        { typePiece: 'CNI', nom: "H'GUESSAN", prenom: 'KOUAMÉ', decoupage: 'libelles' },
      ),
    ).toEqual({ typePiece: 'CNI', nom: 'NGUESSAN', prenom: 'KOUAMÉ', peutEtreCoupe: false });
  });

  it('mêmes lettres, découpage différent : le recto est recoupé là où la MRZ place la fin du nom', () => {
    // « Nom et prénoms : KOUADIO KOFFI YAO », deviné en KOUADIO + KOFFI YAO.
    expect(
      fusionner(
        { typePiece: 'CNI', nom: 'KOUADIO KOFFI', prenom: 'YAO' },
        { nom: 'KOUADIO', prenom: 'KOFFI YAO', decoupage: 'devine' },
      ),
    ).toEqual({ typePiece: 'CNI', nom: 'KOUADIO KOFFI', prenom: 'YAO', peutEtreCoupe: false });
    expect(
      fusionner({ typePiece: 'CNI', nom: 'TIE BI', prenom: 'KOUAME' }, { nom: 'TIÉ', prenom: 'BI KOUAMÉ', decoupage: 'position' }),
    ).toEqual({ typePiece: 'CNI', nom: 'TIÉ BI', prenom: 'KOUAMÉ', peutEtreCoupe: false });
    // Accents décomposés (forme NFD) : ils suivent la lettre qu'ils portent.
    const decompose = 'TIÉ'.normalize('NFD');
    expect(fusionner({ nom: 'TIE', prenom: 'BI KOUAME' }, { nom: `${decompose} BI`, prenom: 'KOUAMÉ' })).toEqual({
      nom: decompose, prenom: 'BI KOUAMÉ', peutEtreCoupe: false,
    });
  });

  it('coupure impossible entre deux mots (ou sur une apostrophe) : la MRZ est gardée', () => {
    expect(fusionner({ nom: 'N', prenom: 'GUESSAN KOFFI' }, { nom: "N'GUESSAN", prenom: 'KOFFI' })).toEqual({
      nom: 'N', prenom: 'GUESSAN KOFFI', peutEtreCoupe: false,
    });
    expect(fusionner({ nom: 'KOUAS', prenom: 'SI ADJOUA' }, { nom: 'KOUASSI', prenom: 'ADJOUA' })).toEqual({
      nom: 'KOUAS', prenom: 'SI ADJOUA', peutEtreCoupe: false,
    });
  });

  it('MRZ sans prénoms : seul le nom peut prendre l’orthographe du recto', () => {
    expect(fusionner({ typePiece: 'Passeport', nom: 'NDRI', prenom: '' }, { nom: "N'DRI", prenom: 'AYA' })).toEqual({
      typePiece: 'Passeport', nom: "N'DRI", peutEtreCoupe: false,
    });
  });

  it('MRZ sans recto : ses champs, sans découpage à confirmer', () => {
    const lecture = fusionner({ typePiece: 'Passeport', nom: 'ERIKSSON', prenom: 'ANNA MARIA' }, null);
    expect(lecture).toEqual({ typePiece: 'Passeport', nom: 'ERIKSSON', prenom: 'ANNA MARIA', peutEtreCoupe: false });
    expect(clesDe(lecture)).not.toContain('decoupage');
  });
});

describe('fusionner — sans MRZ, le recto tel quel', () => {
  it.each<[string, LectureRecto]>([
    ['découpage deviné', { typePiece: 'Permis de conduire', nom: 'KONAN', prenom: 'KOFFI JEAN-MARC', decoupage: 'devine' }],
    ['nom seul', { typePiece: 'CNI', nom: 'KOUASSI', decoupage: 'libelles' }],
    ['type seul', { typePiece: 'Carte étudiante' }],
  ])('%s', (_, recto) => {
    expect(fusionner(null, recto)).toEqual(recto);
    expect(fusionner(undefined, recto)).toEqual(recto);
  });

  it('rien d’exploitable : null', () => {
    expect(fusionner(null, null)).toBeNull();
    expect(fusionner(undefined, {})).toBeNull();
  });
});

describe('fusionner — peutEtreCoupe, calculé sur la MRZ avant fusion', () => {
  /** Prénoms de `n` caractères, espaces compris (une espace = un chevron). */
  const prenomsDe = (n: number) => 'ANNA MARIA CHRISTINE ELODIE AFFOUE ADJOUA'.slice(0, n).trimEnd().padEnd(n, 'X');

  it('CNI (TD1, 30 positions) : ERIKSSON + « << » + 20 caractères → vrai ; 19 → faux', () => {
    expect(fusionner({ typePiece: 'CNI', nom: 'ERIKSSON', prenom: prenomsDe(20) }, null)?.peutEtreCoupe).toBe(true);
    expect(fusionner({ typePiece: 'CNI', nom: 'ERIKSSON', prenom: prenomsDe(19) }, null)?.peutEtreCoupe).toBe(false);
  });

  it('passeport (TD3, 39 positions) : 39 → vrai ; 38 → faux', () => {
    expect(fusionner({ typePiece: 'Passeport', nom: 'ERIKSSON', prenom: prenomsDe(29) }, null)?.peutEtreCoupe).toBe(true);
    expect(fusionner({ typePiece: 'Passeport', nom: 'ERIKSSON', prenom: prenomsDe(28) }, null)?.peutEtreCoupe).toBe(false);
  });

  it('carte au type resté vide : c’est un TD1, 30 positions', () => {
    expect(fusionner({ nom: 'ERIKSSON', prenom: prenomsDe(20) }, null)?.peutEtreCoupe).toBe(true);
    expect(fusionner({ nom: 'ERIKSSON', prenom: prenomsDe(19) }, null)?.peutEtreCoupe).toBe(false);
  });

  it('sans prénoms, pas de séparateur à compter : le nom seul doit remplir le champ', () => {
    expect(fusionner({ typePiece: 'CNI', nom: 'A'.repeat(30), prenom: '' }, null)?.peutEtreCoupe).toBe(true);
    expect(fusionner({ typePiece: 'CNI', nom: 'A'.repeat(29), prenom: '' }, null)?.peutEtreCoupe).toBe(false);
  });

  it('l’apostrophe rendue par le recto ne compte pas : la place prise dans la bande seule compte', () => {
    // MRZ : NGUESSAN (8) + 2 + 19 = 29 → faux, même si « N'GUESSAN » fait 9 caractères.
    const mrz: LectureMrz = { typePiece: 'CNI', nom: 'NGUESSAN', prenom: prenomsDe(19) };
    const lecture = fusionner(mrz, { nom: "N'GUESSAN", prenom: prenomsDe(19) });
    expect(lecture?.nom).toBe("N'GUESSAN");
    expect(lecture?.peutEtreCoupe).toBe(false);
  });

  it('absent sans MRZ : le recto ne dit rien de la bande', () => {
    expect(clesDe(fusionner(null, { nom: 'KOUASSI', decoupage: 'libelles' }))).not.toContain('peutEtreCoupe');
  });
});

describe('fusionner — type de pièce', () => {
  it('celui de la MRZ l’emporte', () => {
    expect(fusionner({ typePiece: 'CNI', nom: 'KONAN', prenom: 'AYA' }, { typePiece: 'Permis de conduire' })?.typePiece).toBe('CNI');
  });

  it('MRZ valide sans type (carte étrangère ou autre titre) : pas de « CNI » ni de « Passeport » du recto', () => {
    expect(fusionner({ nom: 'OUEDRAOGO', prenom: 'SALIF' }, { typePiece: 'Carte consulaire' })?.typePiece).toBe('Carte consulaire');
    expect(clesDe(fusionner({ nom: 'OUEDRAOGO', prenom: 'SALIF' }, { typePiece: 'CNI' }))).not.toContain('typePiece');
    expect(clesDe(fusionner({ nom: 'OUEDRAOGO', prenom: 'SALIF' }, { typePiece: 'Passeport' }))).not.toContain('typePiece');
  });
});

describe('fusionner — liste fermée des clés, entrées bornées', () => {
  it('une clé inconnue dans une entrée ne passe jamais', () => {
    const intrus = { numero: 'D23145890', dateNaissance: '740812', nni: 'A1B2C3D4E5F' };
    const avecMrz = fusionner(
      { typePiece: 'CNI', nom: 'ERIKSSON', prenom: 'ANNA', ...intrus } as LectureMrz,
      { nom: 'ERIKSSON', prenom: 'ANNA', decoupage: 'libelles', ...intrus } as LectureRecto,
    );
    const sansMrz = fusionner(null, { typePiece: 'CNI', nom: 'ERIKSSON', decoupage: 'libelles', ...intrus } as LectureRecto);
    for (const lecture of [avecMrz, sansMrz]) {
      for (const cle of clesDe(lecture)) expect(CLES_AUTORISEES).toContain(cle);
      expect(JSON.stringify(lecture)).not.toMatch(/\d/);
    }
  });

  it('valeurs de mauvais type ou démesurées : ignorées, sans exception', () => {
    const long = 'A'.repeat(LONGUEUR_MAX_CHAMP + 1);
    expect(fusionner({ nom: long, prenom: 'AYA' }, null)).toBeNull();
    expect(fusionner({ nom: 'KONAN', prenom: long }, null)).toEqual({ nom: 'KONAN', peutEtreCoupe: false });
    expect(fusionner(null, { nom: long, prenom: 'AYA', decoupage: 'libelles' })).toEqual({ prenom: 'AYA', decoupage: 'libelles' });
    expect(fusionner(null, { typePiece: 'Carte vitale' as never, nom: 'KONAN', decoupage: 'inventé' as never })).toEqual({ nom: 'KONAN' });
    for (const entree of [42, 'KONAN', [], { nom: 7 }, { nom: null }]) {
      expect(() => fusionner(entree as unknown as LectureMrz, entree as unknown as LectureRecto)).not.toThrow();
    }
    expect(fusionner({ nom: 7 } as unknown as LectureMrz, null)).toBeNull();
  });

  it('entrée hostile de grande taille : coût constant', () => {
    const enorme = `${"N'".repeat(500_000)}GUESSAN`;
    const limite = `${"N'GUESSAN ".repeat(12)}KOFFI`.slice(0, LONGUEUR_MAX_CHAMP);
    const limiteMrz = limite.replace(/'/g, '');
    const debut = performance.now();
    expect(fusionner({ nom: enorme, prenom: enorme }, { nom: enorme, prenom: enorme })).toBeNull();
    for (let i = 0; i < 2_000; i++) fusionner({ nom: limiteMrz, prenom: limiteMrz }, { nom: limite, prenom: limite });
    // Marge large et assumée : ce plafond attrape un changement de CLASSE de
    // coût (le calcul qui repart en factoriel ou en quadratique, mesuré 10 à
    // 100 fois plus lent), pas la vitesse de la machine. Trop serré, il
    // échouait au hasard quand la suite tournait sous charge.
    expect(performance.now() - debut).toBeLessThan(5000);
  });
});

describe('fusionner — chaîne complète sur des spécimens', () => {
  /** Carte TD1 du spécimen ICAO, émise par « CIV » ; seule la ligne du nom change. */
  const bande = (nom: string) => ['I<CIVD231458907<<<<<<<<<<<<<<<', '7408122F1204159UTO<<<<<<<<<<<6', nom.padEnd(30, '<')];

  it("verso lu en MRZ, recto lu en clair : N'GUESSAN, rien d'autre ne sort", () => {
    const mrz = lireMrz(bande('NGUESSAN<<KOUASSI<ADJOUA'));
    const recto = lireRecto("RÉPUBLIQUE D'UTOPIE — SPÉCIMEN\nCARTE NATIONALE D'IDENTITÉ\nNom : N'GUESSAN\nPrénoms : KOUASSI ADJOUA\nNé le 01/01/1990 à TIASSALÉ");
    const lecture = fusionner(mrz, recto);
    expect(lecture).toEqual({ typePiece: 'CNI', nom: "N'GUESSAN", prenom: 'KOUASSI ADJOUA', peutEtreCoupe: false });
    expect(JSON.stringify(lecture)).not.toMatch(/\d|TIASSAL|D23145890|740812/);
  });

  it('prénoms qui remplissent la bande : signalés, même quand le recto les écrit en entier', () => {
    const mrz = lireMrz(bande('KOUADIO<AFFOUE<<MARIE<CHRISTIN'));
    const recto = lireRecto("CARTE NATIONALE D'IDENTITÉ\nNom : KOUADIO AFFOUÉ\nPrénoms : MARIE CHRISTINE");
    expect(fusionner(mrz, recto)).toEqual({
      typePiece: 'CNI', nom: 'KOUADIO AFFOUÉ', prenom: 'MARIE CHRISTIN', peutEtreCoupe: true,
    });
  });
});

describe('fusion-lecture.ts — ne journalise rien, ne lève rien', () => {
  it('aucun appel à la console ni throw dans le code source', () => {
    expect(source).not.toMatch(/\bconsole\s*\./);
    expect(source).not.toMatch(/\bthrow\b/);
  });
});
