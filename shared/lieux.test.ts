import { describe, expect, it } from 'vitest';
import { COMMUNES } from './communes';
import { QUARTIERS, resoudreCommune } from './lieux';

/**
 * Ce module décide dans quelle commune une pièce est rangée à partir d'une
 * phrase écrite à la main. Se tromper n'a rien d'anodin : la pièce part sur
 * la mauvaise page de registre et le propriétaire ne la voit pas. D'où deux
 * exigences symétriques — reconnaître ce qui doit l'être, et se taire sur le
 * reste plutôt que de deviner.
 */

describe('reconnaissance directe', () => {
  it('reconnaît une commune écrite correctement', () => {
    for (const commune of Object.keys(COMMUNES)) {
      expect(resoudreCommune(commune).commune, commune).toBe(commune);
    }
  });

  it('tolère les fautes de frappe courantes', () => {
    // Le cas cité par l'utilisateur, et ses voisins.
    expect(resoudreCommune('Cocodi').commune).toBe('Cocody');
    expect(resoudreCommune('Yopugon').commune).toBe('Yopougon');
    expect(resoudreCommune('Koumassy').commune).toBe('Koumassi');
    expect(resoudreCommune('Trechville').commune).toBe('Treichville');
  });

  it('se moque des accents et de la casse', () => {
    expect(resoudreCommune('ADJAME').commune).toBe('Adjamé');
    expect(resoudreCommune('port bouet').commune).toBe('Port-Bouët');
  });
});

describe('reconnaissance par le quartier', () => {
  it('rattache chaque quartier connu à sa commune', () => {
    for (const [quartier, commune] of Object.entries(QUARTIERS)) {
      expect(resoudreCommune(quartier).commune, quartier).toBe(commune);
    }
  });

  it('retrouve le quartier au milieu d’une phrase', () => {
    expect(resoudreCommune('trouvée au carrefour Gesco vers 7h').commune).toBe('Yopougon');
    expect(resoudreCommune('devant la pharmacie de Niangon Sud').commune).toBe('Yopougon');
    expect(resoudreCommune('gare routière d’Abobo Gare').commune).toBe('Abobo');
  });

  it('préfère le nom le plus long à égalité', () => {
    // « Abobo Gare » et « Abobo » désignent ici la même commune : ce qui
    // compte est que le plus précis soit retenu comme explication.
    expect(resoudreCommune('Abobo Gare').via).toBe('Abobo Gare');
  });
});

describe('phrases réelles', () => {
  it('démêle un lieu écrit comme on parle', () => {
    const cas: Array<[string, string]> = [
      ['Niangon Sud à Gauche, Yopougon', 'Yopougon'],
      ['Cocodi Angré 8e tranche', 'Cocody'],
      ['marché de Siporex', 'Yopougon'],
      ['carrefour Zone 4', 'Marcory'],
      ['vers Vridi', 'Port-Bouët'],
      ['quartier Koko à Bouaké', 'Bouaké'],
    ];
    for (const [texte, attendu] of cas) {
      expect(resoudreCommune(texte).commune, texte).toBe(attendu);
    }
  });
});

describe('prudence', () => {
  it('ne devine rien sur un texte vide ou insignifiant', () => {
    for (const texte of ['', '   ', 'près du grand arbre', 'dans la rue', '???']) {
      expect(resoudreCommune(texte).commune, JSON.stringify(texte)).toBeNull();
    }
  });

  it('ne confond pas deux noms simplement voisins', () => {
    // « Daloa » et « Dabou » partagent trois lettres : ce n'est pas assez.
    expect(resoudreCommune('Dabou').commune).not.toBe('Daloa');
  });

  /**
   * Limite connue, et assumée : « Kouassi », l'un des noms les plus répandus
   * du pays, est à une lettre de « Koumassi ». Exactement la même distance
   * que « Cocodi » à « Cocody », qu'on veut justement corriger — aucun seuil
   * ne sépare les deux cas, et rien dans la chaîne de caractères ne dit qu'un
   * mot est un nom de famille plutôt qu'un lieu.
   *
   * La parade n'est donc pas ici mais dans l'interface : la commune déduite
   * est toujours affichée avec un bouton pour la corriger. Ce test fige le
   * comportement réel plutôt qu'une garantie qu'on ne peut pas tenir.
   */
  it('rapproche « Kouassi » de Koumassi — d’où l’affichage du résultat', () => {
    const { commune, via } = resoudreCommune('Kouassi');
    expect(commune).toBe('Koumassi');
    // `via` est ce que l'interface montre : « reconnu via Koumassi ».
    expect(via).toBe('Koumassi');
  });
});
