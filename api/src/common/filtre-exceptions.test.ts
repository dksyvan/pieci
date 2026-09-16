import { inspect } from 'node:util';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  HttpException,
  Module,
  Post,
  UploadedFile,
  UseInterceptors,
  ValidationPipe,
  type ArgumentsHost,
  type HttpServer,
  type LoggerService,
} from '@nestjs/common';
import { BaseExceptionFilter, NestFactory } from '@nestjs/core';
import { FileInterceptor, type NestExpressApplication } from '@nestjs/platform-express';
import { IsString, Length } from 'class-validator';
import { QueryFailedError } from 'typeorm';
import {
  FiltreExceptions,
  LONGUEUR_MESSAGE_JOURNAL,
  erreurDeCorpsEnHttp,
  installerGestionDesErreurs,
  messageSansValeurs,
  traduireErreurDeCorps,
} from './filtre-exceptions';

/*
 * Marqueurs : ils ne doivent apparaître dans aucune ligne de journal. Ni vrai
 * numéro ni vraie personne — un numéro inventé, un prénom courant, et la zone
 * de lecture du spécimen de passeport de la norme OACI.
 */
const NUMERO = 'FAUX-NUM-PG';
const PRENOM = 'Adjoua';
const TELEPHONE = '0700000001';
const MRZ_SPECIMEN = 'P<UTOERIKSSON<<ANNA<MARIA';
const MARQUEURS = [NUMERO, PRENOM, TELEPHONE, 'ERIKSSON', 'INSERT INTO'];

/** Erreur SQL telle que TypeORM la lève sur un doublon : valeurs partout. */
function erreurSql(): QueryFailedError {
  const pilote = Object.assign(
    new Error('duplicate key value violates unique constraint "uq_piece_numero"'),
    { code: '23505', detail: `Key (numero)=(${NUMERO}) already exists.` },
  );
  return new QueryFailedError(
    'INSERT INTO "pieces_trouvees"("numero", "prenom") VALUES ($1, $2)',
    [NUMERO, PRENOM],
    pilote,
  );
}

/** Variante où Postgres recopie la valeur dans le message lui-même. */
function erreurSqlValeurDansMessage(): QueryFailedError {
  const pilote = Object.assign(new Error(`invalid input syntax for type uuid: "${NUMERO}"`), {
    code: '22P02',
  });
  return new QueryFailedError('SELECT * FROM "points_depot" WHERE "id" = $1', [NUMERO], pilote);
}

/* --------------------------------------------------- Doublures unitaires */

function adaptateur(entetesEnvoyees = false) {
  return {
    reply: vi.fn(),
    end: vi.fn(),
    isHeadersSent: vi.fn(() => entetesEnvoyees),
  };
}

function hote(requete: object = { method: 'POST', route: { path: '/pieces-trouvees' }, baseUrl: '' }) {
  const reponse = { marque: 'reponse' };
  return {
    reponse,
    hote: {
      getType: () => 'http',
      getArgByIndex: (i: number) => [requete, reponse][i],
      switchToHttp: () => ({ getRequest: () => requete, getResponse: () => reponse }),
    } as unknown as ArgumentsHost,
  };
}

/**
 * Rend chaque argument comme la console le ferait : texte tel quel, objets et
 * erreurs par `inspect`, propriétés et objets imbriqués compris. C'est plus
 * large que ce que la console de Nest imprime, donc plus sévère.
 */
function rendre(args: unknown[]): string {
  return args.map((a) => (typeof a === 'string' ? a : inspect(a, { depth: 8 }))).join(' ');
}

function journalCapture() {
  const lignes: string[] = [];
  return { lignes, journal: { error: (...args: unknown[]) => lignes.push(rendre(args)) } };
}

describe('FiltreExceptions — HttpException', () => {
  /*
   * Parité avec Nest : on fait passer chaque exception dans le filtre par
   * défaut de Nest et dans le nôtre, et on compare ce qui part au client.
   * Le code DEFI_REQUIS et les messages de validation en dépendent.
   */
  const cas: Array<[string, HttpException]> = [
    ['message texte', new BadRequestException('Ça ne correspond pas.')],
    [
      'corps objet DEFI_REQUIS',
      new ForbiddenException({
        statusCode: 403,
        code: 'DEFI_REQUIS',
        message: 'Réponds d’abord à la question sur les prénoms inscrits sur la pièce.',
      }),
    ],
    [
      'messages de validation',
      new BadRequestException(['prenom must be shorter than or equal to 5 characters']),
    ],
    ['HttpException nue en 429', new HttpException('Trop d’essais. Réessaie dans trente minutes.', 429)],
  ];

  it.each(cas)('garde statut et corps : %s', (_nom, exception) => {
    const nest = adaptateur();
    new BaseExceptionFilter(nest as unknown as HttpServer).catch(exception, hote().hote);

    const nous = adaptateur();
    const { lignes, journal } = journalCapture();
    new FiltreExceptions(nous as unknown as HttpServer, journal).catch(exception, hote().hote);

    expect(nous.reply).toHaveBeenCalledOnce();
    expect(nous.reply.mock.calls[0]?.[1]).toEqual(nest.reply.mock.calls[0]?.[1]);
    expect(nous.reply.mock.calls[0]?.[2]).toBe(nest.reply.mock.calls[0]?.[2]);
    expect(lignes).toEqual([]);
  });

  it('ferme la réponse sans rien écrire si les en-têtes sont partis', () => {
    const a = adaptateur(true);
    new FiltreExceptions(a as unknown as HttpServer, journalCapture().journal).catch(
      new BadRequestException('x'),
      hote().hote,
    );
    expect(a.reply).not.toHaveBeenCalled();
    expect(a.end).toHaveBeenCalledOnce();
  });
});

describe('FiltreExceptions — erreur inattendue', () => {
  it.each([
    ['QueryFailedError', erreurSql()],
    ['QueryFailedError, valeur dans le message', erreurSqlValeurDansMessage()],
    [
      'Error chargée de propriétés',
      Object.assign(new Error(`échec pour ${TELEPHONE}`), {
        parameters: [PRENOM],
        detail: NUMERO,
        body: MRZ_SPECIMEN,
      }),
    ],
    ['valeur qui n’est pas une Error', NUMERO],
  ])('%s : 500 générique, journal sans aucune valeur', (_nom, exception) => {
    const a = adaptateur();
    const { lignes, journal } = journalCapture();
    const { hote: h, reponse } = hote();

    new FiltreExceptions(a as unknown as HttpServer, journal).catch(exception, h);

    expect(a.reply).toHaveBeenCalledWith(
      reponse,
      { statusCode: 500, message: 'Une erreur est survenue.' },
      500,
    );
    expect(lignes).toHaveLength(1);
    for (const marqueur of MARQUEURS) expect(lignes[0]).not.toContain(marqueur);
  });

  it('écrit le nom, le statut, la méthode et le modèle de route', () => {
    const { lignes, journal } = journalCapture();
    const requete = {
      method: 'POST',
      baseUrl: '',
      route: { path: '/correspondances/:id/defi' },
      originalUrl: `/correspondances/0f0e/defi?telephone=${TELEPHONE}`,
    };
    new FiltreExceptions(adaptateur() as unknown as HttpServer, journal).catch(
      erreurSql(),
      hote(requete).hote,
    );
    expect(lignes[0]).toBe(
      'QueryFailedError 500 POST /correspondances/:id/defi : duplicate key value violates unique constraint "…"',
    );
  });

  it('sans route résolue, écrit le chemin sans query string ni chiffres', () => {
    const { lignes, journal } = journalCapture();
    const requete = { method: 'GET', originalUrl: `/inconnu/${TELEPHONE}?prenom=${PRENOM}` };
    new FiltreExceptions(adaptateur() as unknown as HttpServer, journal).catch(
      new Error('boom'),
      hote(requete).hote,
    );
    expect(lignes[0]).toBe('Error 500 GET /inconnu/# : boom');
  });

  it('ne lève jamais, même sur une erreur piégée', () => {
    const piege = new Proxy(new Error('x'), {
      get() {
        throw new Error('piège');
      },
    });
    const a = adaptateur();
    const { lignes, journal } = journalCapture();
    expect(() => new FiltreExceptions(a as unknown as HttpServer, journal).catch(piege, hote().hote)).not.toThrow();
    expect(a.reply).toHaveBeenCalledOnce();
    expect(lignes).toEqual(['Erreur non décrite 500']);
  });
});

describe('messageSansValeurs', () => {
  it('masque les segments entre guillemets, les mots à chiffres et les adresses', () => {
    expect(messageSansValeurs(`invalid input syntax for type uuid: "${NUMERO}"`)).toBe(
      'invalid input syntax for type uuid: "…"',
    );
    expect(messageSansValeurs(`Unexpected token 'P', "P<UTOERIKS"... is not valid JSON`)).toBe(
      'Unexpected token "…", "…"... is not valid JSON',
    );
    expect(messageSansValeurs(`numéro C0012345678 ou ${TELEPHONE}`)).toBe('numéro # ou #');
    expect(messageSansValeurs('écrire à adjoua.kone@exemple.ci')).toBe('écrire à …@…');
    expect(messageSansValeurs('connect ECONNREFUSED 127.0.0.1:5432')).toBe('connect ECONNREFUSED #.#.#.#:#');
  });

  it('garde les apostrophes de mots et la première ligne seulement', () => {
    expect(messageSansValeurs("Échec de l'enregistrement\n    at detail " + NUMERO)).toBe(
      "Échec de l'enregistrement",
    );
  });

  it('tronque, et borne son temps même sur un message énorme', () => {
    const debut = performance.now();
    const resultat = messageSansValeurs('a'.repeat(5_000_000));
    expect(performance.now() - debut).toBeLessThan(200);
    expect(resultat.length).toBeLessThanOrEqual(LONGUEUR_MESSAGE_JOURNAL);
    expect(resultat.endsWith('…')).toBe(true);
  });

  it('rend une chaîne vide pour ce qui n’est pas du texte', () => {
    expect(messageSansValeurs(undefined)).toBe('');
    expect(messageSansValeurs({ toString: () => NUMERO })).toBe('');
  });
});

describe('erreurDeCorpsEnHttp', () => {
  /** Forme des erreurs de body-parser (http-errors) : statut, type, exposition. */
  function erreurHttp(statusCode: number, type: string, extra: object = {}) {
    return Object.assign(new Error('message d’origine'), {
      statusCode,
      status: statusCode,
      expose: statusCode < 500,
      type,
      ...extra,
    });
  }

  it('JSON mal formé : 400 au message fixe, sans rien du corps', () => {
    const erreur = erreurHttp(400, 'entity.parse.failed', { body: MRZ_SPECIMEN });
    const http = erreurDeCorpsEnHttp(erreur);
    expect(http?.getStatus()).toBe(400);
    expect(JSON.stringify(http?.getResponse())).not.toContain('UTO');
    expect(http?.getResponse()).toMatchObject({ message: 'Le contenu envoyé est illisible.' });
  });

  it('corps trop gros : 413', () => {
    expect(erreurDeCorpsEnHttp(erreurHttp(413, 'entity.too.large'))?.getStatus()).toBe(413);
  });

  it('garde le statut 4xx d’un type inconnu, au message neutre', () => {
    const http = erreurDeCorpsEnHttp(erreurHttp(400, 'request.aborted'));
    expect(http?.getStatus()).toBe(400);
    expect(http?.getResponse()).toBe('Requête invalide.');
  });

  it('ignore les 5xx et tout ce qui n’a pas la forme http-errors', () => {
    expect(erreurDeCorpsEnHttp(erreurHttp(500, 'stream.not.readable'))).toBeNull();
    expect(erreurDeCorpsEnHttp(erreurSql())).toBeNull();
    expect(erreurDeCorpsEnHttp(new Error('x'))).toBeNull();
    expect(erreurDeCorpsEnHttp(null)).toBeNull();
    expect(erreurDeCorpsEnHttp({ type: 'entity.too.large', statusCode: 413 })).toBeNull();
  });

  it('le gestionnaire Express passe l’exception convertie, ou l’erreur d’origine', () => {
    const suite = vi.fn();
    const autre = new Error('autre');
    traduireErreurDeCorps(erreurHttp(400, 'entity.parse.failed'), {} as never, {} as never, suite);
    traduireErreurDeCorps(autre, {} as never, {} as never, suite);
    expect(suite.mock.calls[0]?.[0]).toBeInstanceOf(BadRequestException);
    expect(suite.mock.calls[1]?.[0]).toBe(autre);
  });
});

/* ------------------------------------------------ Application Nest réelle */

class DtoEssai {
  @IsString()
  @Length(1, 5)
  prenom!: string;
}

@Controller('essai')
class ControleurEssai {
  @Post('json')
  json(@Body() _corps: unknown) {
    return { ok: true };
  }

  @Post('valide')
  valide(@Body() _corps: DtoEssai) {
    return { ok: true };
  }

  @Post('base/:id')
  base() {
    throw erreurSql();
  }

  @Post('defi')
  defi() {
    throw new ForbiddenException({ statusCode: 403, code: 'DEFI_REQUIS', message: 'Réponds d’abord.' });
  }

  @Post('photo')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 16 } }))
  photo(@UploadedFile() fichier: { size: number } | undefined) {
    return { taille: fichier?.size };
  }
}

// Le transformateur des tests n'émet pas les métadonnées de type : on les
// pose à la main pour que le ValidationPipe connaisse le DTO.
Reflect.defineMetadata('design:paramtypes', [DtoEssai], ControleurEssai.prototype, 'valide');

@Module({ controllers: [ControleurEssai] })
class ModuleEssai {}

/** Journal de Nest capturé à tous les niveaux, rendu comme ci-dessus. */
const journal: string[] = [];
const noter = (...a: unknown[]) => void journal.push(rendre(a));
const capture: LoggerService = {
  log: noter,
  error: noter,
  warn: noter,
  debug: noter,
  verbose: noter,
  fatal: noter,
};

async function demarrer(protegee: boolean): Promise<{ app: NestExpressApplication; base: string }> {
  const app = await NestFactory.create<NestExpressApplication>(ModuleEssai, {
    logger: capture,
    bodyParser: !protegee,
  });
  if (protegee) installerGestionDesErreurs(app);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(0, '127.0.0.1');
  return { app, base: await app.getUrl() };
}

interface Reponse {
  statut: number;
  corps: unknown;
  journal: string;
}

async function appeler(base: string, chemin: string, init: RequestInit): Promise<Reponse> {
  journal.length = 0;
  const r = await fetch(`${base}${chemin}`, { method: 'POST', ...init });
  const texte = await r.text();
  let corps: unknown = texte;
  try {
    corps = JSON.parse(texte);
  } catch {
    // corps non JSON : gardé en texte
  }
  return { statut: r.status, corps, journal: journal.join('\n') };
}

const json = (corps: string): RequestInit => ({ headers: { 'content-type': 'application/json' }, body: corps });

function photoTropGrosse(): RequestInit {
  const formulaire = new FormData();
  formulaire.append('photo', new Blob(['X'.repeat(64)], { type: 'image/jpeg' }), 'recto.jpg');
  return { body: formulaire };
}

describe('Application Nest — avec et sans gestion des erreurs', () => {
  let temoin: { app: NestExpressApplication; base: string };
  let protegee: { app: NestExpressApplication; base: string };

  beforeAll(async () => {
    temoin = await demarrer(false);
    protegee = await demarrer(true);
  });

  afterAll(async () => {
    await temoin?.app.close();
    await protegee?.app.close();
  });

  beforeEach(() => {
    journal.length = 0;
  });

  /**
   * Témoin : sans le filtre, Nest 11 écrit bien les valeurs de la requête
   * SQL. Sans ce constat, un test « aucun marqueur au journal » pourrait
   * passer simplement parce que la capture ne capte rien.
   */
  it('témoin : Nest par défaut journalise parameters et detail', async () => {
    const r = await appeler(temoin.base, '/essai/base/abc', {});
    expect(r.statut).toBe(500);
    expect(r.journal).toContain(NUMERO);
    expect(r.journal).toContain(PRENOM);
  });

  it('QueryFailedError : 500 générique, aucun marqueur au journal, route sans query string', async () => {
    const r = await appeler(protegee.base, `/essai/base/abc?telephone=${TELEPHONE}`, {});
    expect(r.statut).toBe(500);
    expect(r.corps).toEqual({ statusCode: 500, message: 'Une erreur est survenue.' });
    for (const marqueur of MARQUEURS) expect(r.journal).not.toContain(marqueur);
    expect(r.journal).toContain('QueryFailedError 500 POST /essai/base/:id');
    expect(r.journal).not.toContain('telephone');
  });

  it.each([
    ['validation', '/essai/valide', json(JSON.stringify({ prenom: 'Trop long pour passer' }))],
    ['DEFI_REQUIS', '/essai/defi', {}],
    ['fichier trop gros (multer)', '/essai/photo', photoTropGrosse()],
    ['route inconnue', '/essai/nulle-part', {}],
  ])('HttpException identique au comportement de Nest : %s', async (_nom, chemin, init) => {
    const attendu = await appeler(temoin.base, chemin, init);
    const obtenu = await appeler(protegee.base, chemin, init);
    expect(obtenu.statut).toBe(attendu.statut);
    expect(obtenu.corps).toEqual(attendu.corps);
    expect(obtenu.journal).toBe('');
  });

  it('JSON valide : toujours lu, les analyseurs posés à la main fonctionnent', async () => {
    const r = await appeler(protegee.base, '/essai/valide', json(JSON.stringify({ prenom: 'Anna' })));
    expect(r.statut).toBe(201);
    expect(r.corps).toEqual({ ok: true });
  });

  it('JSON mal formé : Nest recopie le corps, nous non', async () => {
    const temoinR = await appeler(temoin.base, '/essai/json', json(MRZ_SPECIMEN));
    expect(JSON.stringify(temoinR.corps)).toContain('P<UTO');

    const r = await appeler(protegee.base, '/essai/json', json(MRZ_SPECIMEN));
    expect(r.statut).toBe(400);
    expect(r.corps).toEqual({
      statusCode: 400,
      message: 'Le contenu envoyé est illisible.',
      error: 'Bad Request',
    });
    expect(r.journal).not.toContain('ERIKSSON');
  });

  it('corps JSON au-delà de 100 Kio : 413 sans pile ni propriétés au journal', async () => {
    const gros = JSON.stringify({ prenom: PRENOM, bourrage: 'X'.repeat(200_000) });
    const temoinR = await appeler(temoin.base, '/essai/json', json(gros));
    expect(temoinR.statut).toBe(413);
    expect(temoinR.journal).toContain('entity.too.large');

    const r = await appeler(protegee.base, '/essai/json', json(gros));
    expect(r.statut).toBe(413);
    expect(r.corps).toMatchObject({ statusCode: 413, message: 'Le contenu envoyé est trop volumineux.' });
    expect(r.journal).toBe('');
  });
});
