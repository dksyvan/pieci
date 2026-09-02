import { describe, expect, it } from 'vitest';
import { NiveauConfiance, TypePiece } from '../common/enums';
import {
  haversine,
  levenshtein,
  niveauConfiance,
  normaliser,
  type PersonnePiece,
  POIDS,
  scoreMatch,
  SEUIL_AFFICHAGE,
  simNom,
  tokenSet,
  trouverMatches,
} from './matching';

describe('normaliser', () => {
  it('met en minuscules et compacte les espaces', () => {
    expect(normaliser('  Kouassi   Aké ')).toBe('kouassi ake');
  });

  it('retire les accents/diacritiques', () => {
    expect(normaliser('Aké')).toBe('ake');
    expect(normaliser('Aké')).toBe(normaliser('Ake'));
  });

  it("transforme apostrophes et tirets en espaces (N'Guessan)", () => {
    expect(normaliser("N'Guessan")).toBe('n guessan');
    expect(normaliser('Yao-Koffi')).toBe('yao koffi');
  });

  it('gère les valeurs vides ou nulles', () => {
    expect(normaliser('')).toBe('');
    expect(normaliser(undefined)).toBe('');
    expect(normaliser(null)).toBe('');
  });
});

describe('levenshtein (ratio de similarité)', () => {
  it('retourne 1 pour deux chaînes identiques', () => {
    expect(levenshtein('Kouassi', 'Kouassi')).toBe(1);
  });

  it('tolère une faute de frappe (une lettre manquante)', () => {
    // "kouassi" -> "kouasi" : suppression d'un seul caractère => distance 1
    expect(levenshtein('Kouassi', 'Kouasi')).toBeCloseTo(6 / 7, 10);
  });

  it("retourne 1 quand les deux chaînes sont vides, 0 si une seule l'est", () => {
    expect(levenshtein('', '')).toBe(1);
    expect(levenshtein('Kouassi', '')).toBe(0);
    expect(levenshtein('', 'Kouassi')).toBe(0);
  });
});

describe('tokenSet (similarité par jetons)', () => {
  it('retourne 1 pour deux noms composés écrits dans un ordre différent', () => {
    expect(tokenSet('Kouassi Aké', 'Aké Kouassi')).toBe(1);
  });

  it("retourne l'intersection / union pour des jetons partiellement communs", () => {
    expect(tokenSet('Jean Paul', 'Paul')).toBeCloseTo(0.5, 10);
  });

  it('retourne 0 si une des chaînes est vide', () => {
    expect(tokenSet('', 'Kouassi')).toBe(0);
  });
});

describe('simNom', () => {
  it('prend le meilleur des deux signaux (jetons inversés)', () => {
    expect(simNom('Kouassi Aké', 'Aké Kouassi')).toBe(1);
  });

  it("tolère les variantes ivoiriennes avec apostrophe (N'Guessan / Nguessan)", () => {
    // "n guessan" -> "nguessan" : un seul caractère (l'espace) diffère
    expect(simNom("N'Guessan", 'Nguessan')).toBeCloseTo(8 / 9, 10);
  });

  it('tolère une faute de frappe via le ratio de Levenshtein', () => {
    expect(simNom('Kouassi', 'Kouasi')).toBeCloseTo(6 / 7, 10);
  });
});

describe('haversine', () => {
  it('retourne 0 pour deux points identiques', () => {
    expect(haversine(5.345, -3.978, 5.345, -3.978)).toBe(0);
  });

  it("retourne environ 111 km pour un écart d'un degré de latitude", () => {
    expect(haversine(0, 0, 1, 0)).toBeCloseTo(111.2, 1);
  });
});

describe('scoreMatch — pondération du type de pièce', () => {
  const base: PersonnePiece = {
    nom: 'Traoré',
    prenom: 'Mariam',
    typePiece: TypePiece.CNI,
    lat: 5.42,
    lng: -4.02,
    date: '2026-06-10',
  };

  it('atteint le score maximal (1) pour une correspondance parfaite', () => {
    const { score } = scoreMatch(base, { ...base });
    expect(score).toBeCloseTo(1, 10);
  });

  it('pénalise exactement le poids du type (20 %) en cas de type différent', () => {
    const memeType = scoreMatch(base, { ...base, typePiece: TypePiece.CNI });
    const autreType = scoreMatch(base, { ...base, typePiece: TypePiece.PASSEPORT });
    expect(memeType.score - autreType.score).toBeCloseTo(POIDS.type, 10);
  });
});

describe('scoreMatch — une perte sans lieu reste appariable', () => {
  /**
   * Le lieu est facultatif quand on declare une perte : on ne sait pas
   * toujours ou on a perdu sa piece. Ces alertes etaient ecartees avant
   * meme d'etre scorees, ce qui rendait la promesse « on te previent »
   * fausse pour elles.
   *
   * L'identite et le type valent 0,85 a eux seuls — le seuil est a 0,55.
   * La geographie affine un classement, elle ne decide pas d'un
   * rapprochement.
   */
  const perteSansLieu: PersonnePiece = {
    nom: 'Traoré',
    prenom: 'Mariam',
    typePiece: TypePiece.CNI,
    lat: null,
    lng: null,
    date: '2026-06-10',
  };
  const trouvaille: PersonnePiece = {
    nom: 'Traoré',
    prenom: 'Mariam',
    typePiece: TypePiece.CNI,
    lat: 5.42,
    lng: -4.02,
    date: '2026-06-10',
  };

  it('depasse largement le seuil sans aucune coordonnee', () => {
    const { score, dist } = scoreMatch(perteSansLieu, trouvaille);
    expect(score).toBeGreaterThanOrEqual(SEUIL_AFFICHAGE);
    expect(score).toBeCloseTo(1 - POIDS.geo, 10);
    // La distance n'est pas zero : elle est inconnue, et le dit.
    expect(dist).toBeNull();
  });

  it('laisse l’avantage aux rapprochements situes', () => {
    const situe = scoreMatch({ ...perteSansLieu, lat: 5.42, lng: -4.02 }, trouvaille);
    const sansLieu = scoreMatch(perteSansLieu, trouvaille);
    expect(situe.score).toBeGreaterThan(sansLieu.score);
  });

  it('n’apparie toujours pas deux personnes differentes', () => {
    const autre = scoreMatch(perteSansLieu, { ...trouvaille, nom: 'Ouattara', prenom: 'Ibrahim' });
    expect(autre.score).toBeLessThan(SEUIL_AFFICHAGE);
  });
});

describe('niveauConfiance', () => {
  it('classe correctement les bornes de confiance', () => {
    expect(niveauConfiance(0.95)).toBe(NiveauConfiance.FORTE);
    expect(niveauConfiance(0.8)).toBe(NiveauConfiance.FORTE);
    expect(niveauConfiance(0.79)).toBe(NiveauConfiance.PROBABLE);
    expect(niveauConfiance(0.65)).toBe(NiveauConfiance.PROBABLE);
    expect(niveauConfiance(0.64)).toBe(NiveauConfiance.A_VERIFIER);
    expect(niveauConfiance(0.55)).toBe(NiveauConfiance.A_VERIFIER);
  });
});

describe('trouverMatches — scénarios de bout en bout', () => {
  it('retrouve une correspondance malgré une variante orthographique avec accents', () => {
    // Cas "N'Guessan" (alerte) vs "Nguessan" (trouvaille), même prénom/type/lieu, 1 jour d'écart
    const perte: PersonnePiece = {
      nom: "N'Guessan",
      prenom: 'Akissi',
      typePiece: TypePiece.CARTE_ETUDIANTE,
      lat: 5.323,
      lng: -4.022,
      date: '2026-06-09',
    };
    const trouvaille = {
      id: 1,
      nom: 'Nguessan',
      prenom: 'Akissi',
      typePiece: TypePiece.CARTE_ETUDIANTE,
      lat: 5.323,
      lng: -4.022,
      date: '2026-06-08',
    };

    const [resultat] = trouverMatches(perte, [trouvaille]);
    expect(resultat).toBeDefined();
    expect(resultat.score).toBeGreaterThanOrEqual(0.94);
    expect(niveauConfiance(resultat.score)).toBe(NiveauConfiance.FORTE);
  });

  it('retrouve une correspondance malgré une faute de frappe dans le nom', () => {
    const perte: PersonnePiece = {
      nom: 'Kouassi',
      prenom: 'Yao',
      typePiece: TypePiece.PASSEPORT,
      lat: 5.345,
      lng: -4.071,
      date: '2026-06-05',
    };
    const trouvaille = {
      id: 2,
      nom: 'Kouasi', // faute de frappe : une lettre manquante
      prenom: 'Yao',
      typePiece: TypePiece.PASSEPORT,
      lat: 5.345,
      lng: -4.071,
      date: '2026-06-05',
    };

    const resultats = trouverMatches(perte, [trouvaille]);
    expect(resultats).toHaveLength(1);
    expect(resultats[0].score).toBeGreaterThanOrEqual(SEUIL_AFFICHAGE);
  });

  it('retrouve une correspondance quand le nom et le prénom sont inversés dans le champ "nom"', () => {
    const perte: PersonnePiece = {
      nom: 'Kouassi Aké',
      prenom: 'Marie',
      typePiece: TypePiece.CNI,
      lat: 6.82,
      lng: -5.276,
      date: '2026-06-02',
    };
    const trouvaille = {
      id: 3,
      nom: 'Aké Kouassi', // ordre inversé
      prenom: 'Marie',
      typePiece: TypePiece.CNI,
      lat: 6.82,
      lng: -5.276,
      date: '2026-06-01',
    };

    const [resultat] = trouverMatches(perte, [trouvaille]);
    expect(resultat).toBeDefined();
    expect(resultat.score).toBeGreaterThanOrEqual(SEUIL_AFFICHAGE);
  });

  it('exclut une correspondance dont le type de pièce ne correspond pas, même proche par le nom', () => {
    // Nom proche ("Kouassi" / "Kouadio") mais type différent, lieu éloigné et date ancienne :
    // le cumul fait passer le score sous le seuil de rétention.
    const perte: PersonnePiece = {
      nom: 'Kouassi',
      prenom: 'Jean',
      typePiece: TypePiece.CNI,
      lat: 5.345,
      lng: -3.978, // Cocody
      date: '2026-06-10',
    };
    const trouvaille = {
      id: 4,
      nom: 'Kouadio',
      prenom: 'Jean',
      typePiece: TypePiece.PASSEPORT, // mauvais type
      lat: 7.69,
      lng: -5.03, // Bouaké, loin
      date: '2026-05-31', // 10 jours avant
    };

    expect(trouverMatches(perte, [trouvaille])).toHaveLength(0);
  });

  it('ne fait pas correspondre une personne différente, même avec type/lieu/date alignés', () => {
    const perte: PersonnePiece = {
      nom: 'Kouassi',
      prenom: 'Adjoua',
      typePiece: TypePiece.CNI,
      lat: 5.345,
      lng: -3.978,
      date: '2026-06-10',
    };
    const autrePersonne: PersonnePiece = {
      nom: 'Diomandé',
      prenom: 'Sékou',
      typePiece: TypePiece.CARTE_CONSULAIRE, // type également différent
      lat: 9.458,
      lng: -5.629, // Korhogo, loin de Cocody
      date: '2026-04-01', // ancien
    };

    const { score } = scoreMatch(perte, autrePersonne);
    expect(score).toBeLessThan(SEUIL_AFFICHAGE);
  });

  it('filtre les correspondances sous le seuil et trie les résultats par score décroissant', () => {
    const perte: PersonnePiece = {
      nom: 'Brou',
      prenom: 'Christelle',
      typePiece: TypePiece.CARTE_ETUDIANTE,
      lat: 5.345,
      lng: -3.978, // Cocody
      date: '2026-06-10',
    };

    // Score = 1 (correspondance parfaite)
    const excellent = { id: 1, ...perte };

    // Nom + type identiques (>= 0.45 + 0.20 = 0.65) mais prénom/lieu/date différents
    const moyen = {
      id: 2,
      nom: 'Brou',
      prenom: 'Marie-Claire',
      typePiece: TypePiece.CARTE_ETUDIANTE,
      lat: 6.82,
      lng: -5.276, // Yamoussoukro
      date: '2026-05-01',
    };

    // Nom et type différents : score plafonné à 0.35 (< seuil)
    const horsSeuil = {
      id: 3,
      nom: 'Zadi',
      prenom: 'Aboubacar',
      typePiece: TypePiece.CNI,
      lat: 5.345,
      lng: -3.978,
      date: '2026-06-10',
    };

    const resultats = trouverMatches(perte, [horsSeuil, moyen, excellent]);

    expect(resultats.map((r) => r.id)).toEqual([1, 2]);
    expect(resultats[0].score).toBeCloseTo(1, 10);
    expect(resultats[0].score).toBeGreaterThan(resultats[1].score);
    resultats.forEach((r) => expect(r.score).toBeGreaterThanOrEqual(SEUIL_AFFICHAGE));
  });
});
