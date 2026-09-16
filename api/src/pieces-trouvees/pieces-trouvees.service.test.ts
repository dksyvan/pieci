import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { DataSource, MigrationInterface, QueryRunner, Repository } from 'typeorm';
import { TypePiece } from '../common/enums';
import { PieceTrouvee } from './entities/piece-trouvee.entity';
import { PiecesTrouveesService } from './pieces-trouvees.service';
import { PiecesTrouveesController } from './pieces-trouvees.controller';
import { CreatePieceTrouveeDto } from './dto/create-piece-trouvee.dto';
import { MESSAGE_RAISON_PHOTO_ABSENTE, RAISONS_PHOTO_ABSENTE } from './raisons-photo';
import { PhotoAbsenteRaison1750400000000 } from '../database/migrations/1750400000000-PhotoAbsenteRaison';
import type { Utilisateur } from '../utilisateurs/entities/utilisateur.entity';
import type { UtilisateursService } from '../utilisateurs/utilisateurs.service';
import type { MatchingService } from '../matching/matching.service';

function creerMatchingMock(): MatchingService {
  return {
    traiterNouvellePiece: vi.fn(async () => undefined),
    traiterNouvelleAlerte: vi.fn(async () => undefined),
  } as unknown as MatchingService;
}

describe('PiecesTrouveesService.create', () => {
  it('résout le déclarant et enregistre la position en GeoJSON', async () => {
    const declarant = { id: 'user-1', telephone: '+2250700000000' } as Utilisateur;
    const utilisateurs = {
      findOrCreate: vi.fn(async () => declarant),
    } as unknown as UtilisateursService;

    const create = vi.fn((p: Partial<PieceTrouvee>) => p as PieceTrouvee);
    const save = vi.fn(async (p: PieceTrouvee) => ({ id: 'piece-1', ...p }) as PieceTrouvee);
    const repo = { create, save } as unknown as Repository<PieceTrouvee>;
    const dataSource = {} as DataSource;

    const matching = creerMatchingMock();
    const service = new PiecesTrouveesService(repo, dataSource, utilisateurs, matching);

    await service.create({
      declarant: { telephone: '+2250700000000', prenom: 'Awa', nom: 'Koné' },
      typePiece: TypePiece.CNI,
      prenom: 'Mariam',
      nom: 'Traoré',
      commune: 'Cocody',
      lat: 5.345,
      lng: -3.978,
    });

    expect(matching.traiterNouvellePiece).toHaveBeenCalledWith('piece-1');
    expect(utilisateurs.findOrCreate).toHaveBeenCalledWith({
      telephone: '+2250700000000',
      prenom: 'Awa',
      nom: 'Koné',
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        declarant,
        position: { type: 'Point', coordinates: [-3.978, 5.345] },
        pointDepot: null,
      }),
    );
    expect(save).toHaveBeenCalled();
  });

  it('référence le point de dépôt par id sans le charger', async () => {
    const declarant = { id: 'user-1', telephone: '+2250700000000' } as Utilisateur;
    const utilisateurs = {
      findOrCreate: vi.fn(async () => declarant),
    } as unknown as UtilisateursService;

    const create = vi.fn((p: Partial<PieceTrouvee>) => p as PieceTrouvee);
    const save = vi.fn(async (p: PieceTrouvee) => ({ id: 'piece-1', ...p }) as PieceTrouvee);
    const repo = { create, save } as unknown as Repository<PieceTrouvee>;
    const dataSource = {} as DataSource;

    const service = new PiecesTrouveesService(repo, dataSource, utilisateurs, creerMatchingMock());

    await service.create({
      declarant: { telephone: '+2250700000000', prenom: 'Awa', nom: 'Koné' },
      typePiece: TypePiece.CNI,
      prenom: 'Mariam',
      nom: 'Traoré',
      commune: 'Cocody',
      lat: 5.345,
      lng: -3.978,
      pointDepotId: 'depot-1',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ pointDepot: { id: 'depot-1' } }),
    );
  });
});

describe('PiecesTrouveesService.findPublic', () => {
  it('interroge la vue publique v_pieces_trouvees_publiques', async () => {
    const query = vi.fn(async () => []);
    const dataSource = { query } as unknown as DataSource;
    const repo = {} as Repository<PieceTrouvee>;
    const utilisateurs = {} as UtilisateursService;

    const service = new PiecesTrouveesService(repo, dataSource, utilisateurs, creerMatchingMock());
    await service.findPublic();

    expect(query).toHaveBeenCalledWith(expect.stringContaining('v_pieces_trouvees_publiques'));
  });
});

describe('PiecesTrouveesService.stats', () => {
  it('agrege les comptes par commune, par type, et en tout', async () => {
    const query = vi.fn(async () => [
      { commune: 'Yopougon', type_piece: 'CNI', n: '3' },
      { commune: 'Yopougon', type_piece: 'Passeport', n: '1' },
      { commune: 'Cocody', type_piece: 'CNI', n: '2' },
    ]);
    const service = new PiecesTrouveesService(
      {} as Repository<PieceTrouvee>,
      { query } as unknown as DataSource,
      {} as UtilisateursService,
      creerMatchingMock(),
    );

    const stats = await service.stats();

    // COUNT() arrive en chaine depuis Postgres : le total prouve la conversion.
    expect(stats.total).toBe(6);
    expect(stats.parCommune).toEqual({ Yopougon: 4, Cocody: 2 });
    expect(stats.parType).toEqual({ CNI: 5, Passeport: 1 });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('v_pieces_trouvees_publiques'));
  });

  it('rend des agregats vides quand le registre est vide', async () => {
    const service = new PiecesTrouveesService(
      {} as Repository<PieceTrouvee>,
      { query: vi.fn(async () => []) } as unknown as DataSource,
      {} as UtilisateursService,
      creerMatchingMock(),
    );

    await expect(service.stats()).resolves.toEqual({ total: 0, parCommune: {}, parType: {} });
  });
});

describe('PiecesTrouveesService.findOnePublic', () => {
  function creerService(lignes: unknown[]) {
    const query = vi.fn(async () => lignes);
    const service = new PiecesTrouveesService(
      {} as Repository<PieceTrouvee>,
      { query } as unknown as DataSource,
      {} as UtilisateursService,
      creerMatchingMock(),
    );
    return { service, query };
  }

  it('lit la vue publique, jamais la table', async () => {
    const ligne = { id: 'piece-1', nom: "N'GUESSAN", prenom_initiales: 'A.', commune: 'Yopougon' };
    const { service, query } = creerService([ligne]);

    await expect(service.findOnePublic('piece-1')).resolves.toBe(ligne);

    // La vue est ce qui garantit qu'aucun nom entier ni contact ne sort d'ici.
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('v_pieces_trouvees_publiques'),
      ['piece-1'],
    );
  });

  it('passe l’identifiant en parametre, sans le concatener', async () => {
    const { service, query } = creerService([{ id: 'x' }]);

    await service.findOnePublic("' OR 1=1 --");

    const [sql, parametres] = query.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).not.toContain('OR 1=1');
    expect(parametres).toEqual(["' OR 1=1 --"]);
  });

  it('refuse une piece absente de la vue plutot que de rendre du vide', async () => {
    // Restituee, expiree ou jamais existante : de l'exterieur, c'est pareil.
    // Un lien partage il y a trois mois doit cesser de repondre, pas afficher
    // une fiche a moitie vide.
    const { service } = creerService([]);
    await expect(service.findOnePublic('inconnue')).rejects.toThrow(/registre/);
  });
});

/*
 * Raison de l'absence de photo (`photo_absente_raison`).
 *
 * Quatre garanties, testées ici plutôt qu'éparpillées : le serveur efface la
 * raison dès qu'une photo existe ; une valeur hors liste est refusée à
 * l'entrée ; la liste existe en trois copies (API, shared/, contrainte SQL)
 * qui ne doivent pas diverger ; et la colonne ne sort jamais dans une
 * réponse. Même logique que les tests de `sourceConnue` dans
 * scans-qr.service.test.ts.
 */

/** Déclaration minimale valide — noms inventés. */
const DECLARATION = {
  declarant: { telephone: '0700000000', prenom: 'Awa', nom: 'Koné' },
  typePiece: TypePiece.CNI,
  prenom: 'Mariam',
  nom: 'Traoré',
  commune: 'Cocody',
  lat: 5.345,
  lng: -3.978,
};

const PHOTO_FLOUTEE = 'https://stockage.exemple/photos/floutees/piece.webp';

function creerServiceCreation() {
  const declarant = { id: 'user-1', telephone: '0700000000' } as Utilisateur;
  const utilisateurs = { findOrCreate: vi.fn(async () => declarant) } as unknown as UtilisateursService;
  const create = vi.fn((p: Partial<PieceTrouvee>) => p as PieceTrouvee);
  const save = vi.fn(async (p: PieceTrouvee) => ({ ...p, id: 'piece-1' }) as PieceTrouvee);
  const repo = { create, save } as unknown as Repository<PieceTrouvee>;
  const service = new PiecesTrouveesService(repo, {} as DataSource, utilisateurs, creerMatchingMock());
  return { service, create };
}

/** Exécute une étape de migration contre un faux QueryRunner, et rend le SQL émis. */
async function sqlEmis(etape: (queryRunner: QueryRunner) => Promise<void>): Promise<string[]> {
  const requetes: string[] = [];
  const queryRunner = {
    query: vi.fn(async (sql: string) => {
      requetes.push(sql);
      return [];
    }),
  } as unknown as QueryRunner;
  await etape(queryRunner);
  return requetes;
}

/** Les littéraux entre apostrophes d'un extrait de source ou de SQL, dans l'ordre. */
const litteraux = (extrait: string) => [...extrait.matchAll(/'([^']*)'/g)].map((m) => m[1]);

describe('PiecesTrouveesService.create — raison de l’absence de photo', () => {
  it('efface la raison quand une photo floutée accompagne la déclaration', async () => {
    // Raison choisie, puis photo prise malgré tout : la déclaration est
    // illustrée, et la compter parmi les « sans photo » fausserait la mesure.
    const { service, create } = creerServiceCreation();

    await service.create({
      ...DECLARATION,
      photoFlouteeUrl: PHOTO_FLOUTEE,
      photoAbsenteRaison: 'plus_en_main',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ photoFlouteeUrl: PHOTO_FLOUTEE, photoAbsenteRaison: null }),
    );
  });

  it.each(RAISONS_PHOTO_ABSENTE)('conserve la raison « %s » d’une déclaration sans photo', async (raison) => {
    const { service, create } = creerServiceCreation();

    await service.create({ ...DECLARATION, photoAbsenteRaison: raison });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ photoFlouteeUrl: null, photoAbsenteRaison: raison }),
    );
  });

  it('écrit NULL quand la question n’a pas été posée (saisie en série, ancien client)', async () => {
    // NULL et `non_precisee` ne disent pas la même chose : le serveur ne
    // choisit jamais une raison à la place du formulaire.
    const { service, create } = creerServiceCreation();

    await service.create({ ...DECLARATION });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ photoAbsenteRaison: null }));
  });
});

describe('CreatePieceTrouveeDto.photoAbsenteRaison — à l’entrée', () => {
  // Réglages identiques à main.ts : c'est ce tuyau-là que traverse une requête.
  const pipe = new ValidationPipe({ whitelist: true, transform: true });
  const valider = (corps: object) =>
    pipe.transform(corps, { type: 'body', metatype: CreatePieceTrouveeDto }) as Promise<CreatePieceTrouveeDto>;

  it('accepte chaque raison de la liste, et son absence', async () => {
    for (const raison of RAISONS_PHOTO_ABSENTE) {
      const dto = await valider({ ...DECLARATION, photoAbsenteRaison: raison });
      expect(dto.photoAbsenteRaison, raison).toBe(raison);
    }
    const sansRaison = await valider({ ...DECLARATION });
    expect(sansRaison.photoAbsenteRaison).toBeUndefined();
  });

  it('refuse une valeur hors liste par un 400 en français, sans recopier la valeur', async () => {
    const MARQUEUR = 'VALEUR-MARQUEUR-7Q2';
    for (const valeur of [MARQUEUR, 'PLUS_EN_MAIN', ' autre', '', 42, ['autre'], { raison: 'autre' }]) {
      const refus = await valider({ ...DECLARATION, photoAbsenteRaison: valeur }).then(
        () => null,
        (erreur: unknown) => erreur,
      );

      expect(refus, JSON.stringify(valeur)).toBeInstanceOf(BadRequestException);
      const exception = refus as BadRequestException;
      expect(exception.getStatus()).toBe(400);
      expect((exception.getResponse() as { message: string[] }).message).toContain(
        MESSAGE_RAISON_PHOTO_ABSENTE,
      );
    }

    // Le message remonte tel quel au navigateur : rien de ce que le client a
    // envoyé ne doit y revenir.
    const refus = await valider({ ...DECLARATION, photoAbsenteRaison: MARQUEUR }).catch((e: unknown) => e);
    expect(JSON.stringify((refus as BadRequestException).getResponse())).not.toContain(MARQUEUR);
  });
});

describe('photo_absente_raison — une seule liste, trois copies', () => {
  it('le jumeau de shared/types.ts porte exactement la même liste, dans le même ordre', () => {
    // L'API ne peut pas importer shared/ : on lit le fichier en texte. Si la
    // déclaration change de forme, ce test échoue plutôt que de passer à vide.
    const source = readFileSync(resolve(__dirname, '../../../shared/types.ts'), 'utf8');
    const declaration = /export const RAISONS_PHOTO_ABSENTE = \[([^\]]*)\] as const;/.exec(source);

    expect(declaration, 'RAISONS_PHOTO_ABSENTE introuvable dans shared/types.ts').not.toBeNull();
    expect(litteraux(declaration![1])).toEqual([...RAISONS_PHOTO_ABSENTE]);
  });

  it('la contrainte CHECK de la migration accepte exactement la même liste, et NULL', async () => {
    // Quand la liste changera, une nouvelle migration remplacera la
    // contrainte : c'est elle qu'il faudra importer ici à la place.
    const up = await sqlEmis((qr) => new PhotoAbsenteRaison1750400000000().up(qr));
    const contrainte = up.find((sql) => /ADD CONSTRAINT "chk_photo_absente_raison"/.test(sql));

    expect(contrainte, 'contrainte chk_photo_absente_raison absente de up()').toBeDefined();
    expect(contrainte).toMatch(/"photo_absente_raison" IS NULL/);
    const liste = /IN \(([^)]*)\)/.exec(contrainte!);
    expect(litteraux(liste![1])).toEqual([...RAISONS_PHOTO_ABSENTE]);
  });

  it('la migration ajoute une colonne varchar(30) nullable, sans toucher à la vue publique', async () => {
    const up = await sqlEmis((qr) => new PhotoAbsenteRaison1750400000000().up(qr));

    expect(up[0]).toMatch(/ADD COLUMN IF NOT EXISTS "photo_absente_raison" varchar\(30\)$/);
    expect(up.join('\n')).not.toMatch(/NOT NULL|DEFAULT/i);
    expect(up.join('\n')).not.toContain('v_pieces_trouvees_publiques');
  });

  it('down() retire la contrainte, puis la colonne', async () => {
    const down = await sqlEmis((qr) => new PhotoAbsenteRaison1750400000000().down(qr));

    expect(down).toHaveLength(2);
    expect(down[0]).toMatch(/DROP CONSTRAINT IF EXISTS "chk_photo_absente_raison"/);
    expect(down[1]).toMatch(/DROP COLUMN IF EXISTS "photo_absente_raison"/);
  });
});

describe('photo_absente_raison — jamais dans une réponse', () => {
  it('POST /pieces-trouvees ne renvoie que l’identifiant', async () => {
    const enregistree = {
      id: 'piece-1',
      ...DECLARATION,
      photoFlouteeUrl: null,
      photoAbsenteRaison: 'prefere_pas',
    } as unknown as PieceTrouvee;
    const service = { create: vi.fn(async () => enregistree) } as unknown as PiecesTrouveesService;

    const reponse = await new PiecesTrouveesController(service).create({
      ...DECLARATION,
      photoAbsenteRaison: 'prefere_pas',
    });

    expect(reponse).toEqual({ id: 'piece-1' });
  });

  it('la dernière définition de la vue publique ne sélectionne pas la colonne', async () => {
    // Les lectures publiques (liste, fiche, stats) passent toutes par la vue.
    // On rejoue la migration la plus récente qui la (re)crée et on lit ce
    // qu'elle sélectionne — une migration future qui l'ajouterait, ou qui
    // passerait à `SELECT *`, fera échouer ce test.
    const CREE_LA_VUE = /CREATE\s+(OR\s+REPLACE\s+)?VIEW\s+"?v_pieces_trouvees_publiques/i;
    const dossier = resolve(__dirname, '../database/migrations');
    const derniere = readdirSync(dossier)
      .filter((f) => /^\d{13}-[\w-]+\.ts$/.test(f))
      .sort()
      .filter((f) => CREE_LA_VUE.test(readFileSync(join(dossier, f), 'utf8')))
      .at(-1);
    expect(derniere, 'aucune migration ne crée la vue publique').toBeDefined();

    const module = (await import(join(dossier, derniere!))) as Record<string, new () => MigrationInterface>;
    const [Migration] = Object.values(module);
    const up = await sqlEmis((qr) => new Migration().up(qr));
    const vue = up.filter((sql) => CREE_LA_VUE.test(sql)).at(-1);

    // Garde-fou du garde-fou : on lit bien une liste de colonnes.
    expect(vue).toContain('photo_floutee_url');
    expect(vue).not.toContain('photo_absente_raison');
    expect(vue).not.toMatch(/SELECT\s+\*|\bpt\.\*/i);
  });
});
