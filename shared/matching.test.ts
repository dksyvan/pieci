import { describe, expect, it } from 'vitest';
import type { PersonnePiece, Trouvaille } from './types';
import {
  bandeConfiance,
  haversine,
  levenshtein,
  normaliser,
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

  it('retourne 1 quand les deux chaînes sont vides, 0 si une seule l\'est', () => {
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

  it('tolère les variantes ivoiriennes avec apostrophe (N\'Guessan / Nguessan)', () => {
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

  it('retourne environ 111 km pour un écart d\'un degré de latitude', () => {
    expect(haversine(0, 0, 1, 0)).toBeCloseTo(111.2, 1);
  });
});

describe('scoreMatch — pondération du type de pièce', () => {
  const base: PersonnePiece = {
    nom: 'Traoré',
    prenom: 'Mariam',
    typePiece: 'CNI',
    lat: 5.42,
    lng: -4.02,
    date: '2026-06-10',
  };

  it('atteint le score maximal (1) pour une correspondance parfaite', () => {
    const { score } = scoreMatch(base, { ...base });
    expect(score).toBeCloseTo(1, 10);
  });

  it('pénalise exactement le poids du type (20 %) en cas de type différent', () => {
    const memeType = scoreMatch(base, { ...base, typePiece: 'CNI' });
    const autreType = scoreMatch(base, { ...base, typePiece: 'Passeport' });
    expect(memeType.score - autreType.score).toBeCloseTo(POIDS.type, 10);
  });
});

describe('bandeConfiance', () => {
  it('classe correctement les bornes de confiance', () => {
    expect(bandeConfiance(0.95).label).toBe('Forte');
    expect(bandeConfiance(0.8).label).toBe('Forte');
    expect(bandeConfiance(0.79).label).toBe('Probable');
    expect(bandeConfiance(0.65).label).toBe('Probable');
    expect(bandeConfiance(0.64).label).toBe('À vérifier');
    expect(bandeConfiance(0.55).label).toBe('À vérifier');
  });
});

describe('trouverMatches — scénarios de bout en bout', () => {
  it('retrouve une correspondance malgré une variante orthographique avec accents', () => {
    // Cas "N'Guessan" (alerte) vs "Nguessan" (trouvaille), même prénom/type/lieu, 1 jour d'écart
    const perte: PersonnePiece = {
      nom: "N'Guessan",
      prenom: 'Akissi',
      typePiece: 'Carte étudiante',
      lat: 5.323,
      lng: -4.022,
      date: '2026-06-09',
    };
    const trouvaille: Trouvaille = {
      id: 1,
      nom: 'Nguessan',
      prenom: 'Akissi',
      typePiece: 'Carte étudiante',
      lat: 5.323,
      lng: -4.022,
      date: '2026-06-08',
      commune: 'Plateau',
      depot: 'Mairie du Plateau',
      contact: '+225 0700000000',
    };

    const [resultat] = trouverMatches(perte, [trouvaille]);
    expect(resultat).toBeDefined();
    expect(resultat.score).toBeGreaterThanOrEqual(0.94);
    expect(bandeConfiance(resultat.score).label).toBe('Forte');
  });

  it('retrouve une correspondance malgré une faute de frappe dans le nom', () => {
    const perte: PersonnePiece = {
      nom: 'Kouassi',
      prenom: 'Yao',
      typePiece: 'Passeport',
      lat: 5.345,
      lng: -4.071,
      date: '2026-06-05',
    };
    const trouvaille: Trouvaille = {
      id: 2,
      nom: 'Kouasi', // faute de frappe : une lettre manquante
      prenom: 'Yao',
      typePiece: 'Passeport',
      lat: 5.345,
      lng: -4.071,
      date: '2026-06-05',
      commune: 'Yopougon',
      depot: 'Mairie de Yopougon',
      contact: '+225 0700000000',
    };

    const resultats = trouverMatches(perte, [trouvaille]);
    expect(resultats).toHaveLength(1);
    expect(resultats[0].score).toBeGreaterThanOrEqual(SEUIL_AFFICHAGE);
  });

  it('retrouve une correspondance quand le nom et le prénom sont inversés dans le champ "nom"', () => {
    const perte: PersonnePiece = {
      nom: 'Kouassi Aké',
      prenom: 'Marie',
      typePiece: 'CNI',
      lat: 6.82,
      lng: -5.276,
      date: '2026-06-02',
    };
    const trouvaille: Trouvaille = {
      id: 3,
      nom: 'Aké Kouassi', // ordre inversé
      prenom: 'Marie',
      typePiece: 'CNI',
      lat: 6.82,
      lng: -5.276,
      date: '2026-06-01',
      commune: 'Yamoussoukro',
      depot: 'Mairie de Yamoussoukro',
      contact: '+225 0700000000',
    };

    const [resultat] = trouverMatches(perte, [trouvaille]);
    expect(resultat).toBeDefined();
    expect(resultat.score).toBeGreaterThanOrEqual(SEUIL_AFFICHAGE);
  });

  it('exclut une correspondance dont le type de pièce ne correspond pas, même proche par le nom', () => {
    // Nom proche ("Kouassi" / "Kouadio") mais type différent, lieu éloigné et date ancienne :
    // le cumul fait passer le score sous le seuil d'affichage.
    const perte: PersonnePiece = {
      nom: 'Kouassi',
      prenom: 'Jean',
      typePiece: 'CNI',
      lat: 5.345,
      lng: -3.978, // Cocody
      date: '2026-06-10',
    };
    const trouvaille: Trouvaille = {
      id: 4,
      nom: 'Kouadio',
      prenom: 'Jean',
      typePiece: 'Passeport', // mauvais type
      lat: 7.69,
      lng: -5.03, // Bouaké, loin
      date: '2026-05-31', // 10 jours avant
      commune: 'Bouaké',
      depot: 'Préfecture de police – Bouaké',
      contact: '+225 0700000000',
    };

    expect(trouverMatches(perte, [trouvaille])).toHaveLength(0);
  });

  it('ne fait pas correspondre une personne différente, même avec type/lieu/date alignés', () => {
    const perte: PersonnePiece = {
      nom: 'Kouassi',
      prenom: 'Adjoua',
      typePiece: 'CNI',
      lat: 5.345,
      lng: -3.978,
      date: '2026-06-10',
    };
    const autrePersonne: PersonnePiece = {
      nom: 'Diomandé',
      prenom: 'Sékou',
      typePiece: 'Carte consulaire', // type également différent
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
      typePiece: 'Carte étudiante',
      lat: 5.345,
      lng: -3.978, // Cocody
      date: '2026-06-10',
    };

    // Score = 1 (correspondance parfaite)
    const excellent: Trouvaille = {
      id: 1,
      ...perte,
      commune: 'Cocody',
      depot: 'Bureau Pièci – Université FHB',
      contact: '+225 0700000000',
    };

    // Nom + type identiques (>= 0.45 + 0.20 = 0.65) mais prénom/lieu/date différents
    const moyen: Trouvaille = {
      id: 2,
      nom: 'Brou',
      prenom: 'Marie-Claire',
      typePiece: 'Carte étudiante',
      lat: 6.82,
      lng: -5.276, // Yamoussoukro
      date: '2026-05-01',
      commune: 'Yamoussoukro',
      depot: 'Mairie de Yamoussoukro',
      contact: '+225 0700000000',
    };

    // Nom et type différents : score plafonné à 0.35 (< seuil)
    const horsSeuil: Trouvaille = {
      id: 3,
      nom: 'Zadi',
      prenom: 'Aboubacar',
      typePiece: 'CNI',
      lat: 5.345,
      lng: -3.978,
      date: '2026-06-10',
      commune: 'Cocody',
      depot: 'Commissariat du 12e – Cocody',
      contact: '+225 0700000000',
    };

    const resultats = trouverMatches(perte, [horsSeuil, moyen, excellent]);

    expect(resultats.map((r) => r.id)).toEqual([1, 2]);
    expect(resultats[0].score).toBeCloseTo(1, 10);
    expect(resultats[0].score).toBeGreaterThan(resultats[1].score);
    resultats.forEach((r) => expect(r.score).toBeGreaterThanOrEqual(SEUIL_AFFICHAGE));
  });
});
