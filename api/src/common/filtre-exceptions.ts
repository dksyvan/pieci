import {
  BadRequestException,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
  type ArgumentsHost,
  type ExceptionFilter,
  type HttpServer,
  type LoggerService,
} from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { ErrorRequestHandler, Request } from 'express';

/**
 * Erreurs de l'API : ce que voit le client, ce qu'écrit le journal.
 *
 * Pourquoi ce filtre existe : sur une erreur qui n'est pas une
 * `HttpException`, le gestionnaire par défaut de Nest 11 journalise l'objet
 * d'erreur entier — message, pile et toutes ses propriétés. Pour une
 * `QueryFailedError` de TypeORM, cela veut dire `query`, `parameters` (les
 * valeurs de la requête SQL) et `driverError.detail` (« Key (x)=(…) already
 * exists »). Un identifiant de point de dépôt inconnu suffit à faire échouer
 * l'insertion d'une déclaration : nom, prénoms et commune partaient alors
 * dans les journaux de l'hébergeur, conservés plusieurs jours et lisibles par
 * quiconque a accès au tableau de bord.
 *
 * Règle tenue ici : le journal n'écrit que le nom de l'erreur, le statut, la
 * route (modèle de chemin, jamais la query string) et un message court dont
 * les valeurs sont masquées. De l'erreur, on ne lit que `name` et `message`
 * (plus `type`, `statusCode` et `expose` pour reconnaître une erreur
 * d'analyse du corps) : jamais `parameters`, `query`, `driverError`, `detail`,
 * `body`, ni la pile. Le diagnostic y perd en confort ; on reproduit l'erreur
 * à partir de la route plutôt que de conserver des données personnelles pour
 * s'en épargner la peine.
 *
 * Les `HttpException` sont rendues à l'identique de Nest (statut et corps) :
 * le client s'appuie sur leurs messages et sur le code `DEFI_REQUIS`.
 */

/** Longueur maximale du message écrit au journal, masquage compris. */
export const LONGUEUR_MESSAGE_JOURNAL = 120;

/**
 * Au-delà, le message n'est même pas lu. Un message peut recopier un corps de
 * requête entier : borner l'entrée garde le masquage en temps linéaire et
 * négligeable, quelle que soit la taille de ce qu'on lui donne.
 */
const LONGUEUR_MESSAGE_LUE = 1_000;

/** Réponse unique pour tout ce que le code n'a pas prévu. */
export const MESSAGE_ERREUR_INATTENDUE = 'Une erreur est survenue.';

/**
 * Réduit un message d'erreur à ce qu'on peut écrire au journal.
 *
 * Les bibliothèques placent les valeurs dans leurs messages de façon assez
 * régulière : entre guillemets pour Postgres (« invalid input syntax for type
 * uuid: "…" »), JSON.parse et TypeORM ; en chiffres pour les numéros de
 * pièce, de téléphone et les adresses réseau. On masque donc :
 * - tout segment entre guillemets, droits, typographiques ou obliques — une
 *   apostrophe collée à une lettre (« l'enregistrement ») n'en ouvre pas ;
 * - tout mot qui contient un chiffre, en entier (« C0012345678 » devient
 *   « # », pas « C# ») ;
 * - toute adresse électronique.
 *
 * Seule la première ligne est gardée (une pile ou un détail SQL suit souvent
 * la première), et les caractères de contrôle deviennent des espaces : un
 * message ne peut pas fabriquer de fausses lignes de journal.
 *
 * Ce masquage est un filet, pas une garantie : un nom écrit en clair, sans
 * guillemets ni chiffres, passerait. D'où la convention pour le code de
 * l'API — aucune valeur saisie dans le message d'une erreur.
 */
export function messageSansValeurs(message: unknown): string {
  if (typeof message !== 'string') return '';

  const masque = (message.slice(0, LONGUEUR_MESSAGE_LUE).split(/[\r\n]/, 1)[0] ?? '')
    .replace(/[\x00-\x1f\x7f]/g, ' ')
    .replace(/"[^"]*"?|«[^»]*»?|“[^”]*”?|`[^`]*`?|(?<!\p{L})'[^']*'?/gu, '"…"')
    .replace(/[^\s@"]+@[^\s@"]+/g, '…@…')
    .replace(/[\p{L}\d_-]+/gu, (mot) => (/\d/.test(mot) ? '#' : mot))
    .replace(/\s+/g, ' ')
    .trim();

  return masque.length > LONGUEUR_MESSAGE_JOURNAL
    ? `${masque.slice(0, LONGUEUR_MESSAGE_JOURNAL - 1)}…`
    : masque;
}

/**
 * Erreurs émises par les analyseurs de corps d'Express (body-parser, et
 * raw-body en dessous) : objets `http-errors` porteurs d'un `type` stable
 * (« entity.parse.failed », « entity.too.large »…).
 *
 * Elles ne sont pas des `HttpException`. Laissées à Nest, elles posent deux
 * problèmes :
 * - un JSON mal formé revient au client avec le message de `JSON.parse`, qui
 *   recopie les premiers caractères du corps (« Unexpected token 'P',
 *   "P<UTOERIKS"... is not valid JSON ») — et l'application affiche ce
 *   message tel quel ;
 * - un corps trop gros part au journal avec sa pile et ses propriétés, et
 *   l'erreur d'analyse porte le corps brut entier dans sa propriété `body`.
 *
 * On les convertit en `HttpException` au message fixe, en français, en
 * gardant le statut 4xx : ce sont des erreurs du client, pas du serveur.
 * Seules les erreurs « exposables » (4xx) sont concernées ; une 5xx de
 * l'analyseur reste une erreur inattendue.
 *
 * @returns l'exception à renvoyer, ou `null` si l'erreur n'en est pas une.
 */
export function erreurDeCorpsEnHttp(erreur: unknown): HttpException | null {
  if (typeof erreur !== 'object' || erreur === null) return null;
  const { type, statusCode, expose } = erreur as {
    type?: unknown;
    statusCode?: unknown;
    expose?: unknown;
  };
  if (typeof type !== 'string' || typeof statusCode !== 'number' || expose !== true) return null;
  if (!Number.isInteger(statusCode) || statusCode < 400 || statusCode > 499) return null;

  switch (type) {
    case 'entity.parse.failed':
      return new BadRequestException('Le contenu envoyé est illisible.');
    case 'entity.too.large':
    case 'parameters.too.many':
      return new PayloadTooLargeException('Le contenu envoyé est trop volumineux.');
    case 'charset.unsupported':
    case 'encoding.unsupported':
      return new UnsupportedMediaTypeException('Ce format d’envoi n’est pas pris en charge.');
    default:
      return new HttpException('Requête invalide.', statusCode);
  }
}

/**
 * Intercale la conversion ci-dessus juste après les analyseurs de corps.
 *
 * Nécessaire en plus du filtre : pour un JSON mal formé, Nest transforme
 * lui-même l'erreur (une `SyntaxError`) en `BadRequestException(err.message)`
 * avant d'appeler les filtres. Le filtre recevrait alors une `HttpException`
 * ordinaire, sans rien qui la distingue des nôtres, message recopié compris.
 * Placé derrière les analyseurs, ce gestionnaire Express à quatre arguments
 * voit l'erreur d'origine, avec son `type`.
 */
export const traduireErreurDeCorps: ErrorRequestHandler = (erreur, _requete, _reponse, suite) => {
  suite(erreurDeCorpsEnHttp(erreur) ?? erreur);
};

/** Nom de classe d'erreur plausible ; sinon on ne l'écrit pas. */
const FORME_NOM_ERREUR = /^[A-Za-z_$][\w$]{0,59}$/;

/** Méthode HTTP plausible ; une méthode inventée n'entre pas au journal. */
const FORME_METHODE = /^[A-Z]{1,10}$/;

function nomDe(exception: unknown): string {
  if (exception instanceof Error) {
    return FORME_NOM_ERREUR.test(exception.name) ? exception.name : 'Error';
  }
  return exception === null ? 'null' : typeof exception;
}

function messageDe(exception: unknown): string {
  if (typeof exception !== 'object' || exception === null) return '';
  return messageSansValeurs((exception as { message?: unknown }).message);
}

/**
 * Méthode et chemin de la requête, sans query string.
 *
 * Le modèle de la route (« /correspondances/:id/defi ») est préféré au chemin
 * réel : il dit où chercher sans écrire d'identifiant. Faute de route
 * résolue (erreur levée avant le routage), le chemin réel est écrit, masqué
 * comme un message.
 */
function routeDe(requete: Request | undefined): string {
  const methode =
    typeof requete?.method === 'string' && FORME_METHODE.test(requete.method)
      ? requete.method
      : '-';

  const modele: unknown = requete?.route?.path;
  if (typeof modele === 'string') {
    return `${methode} ${requete?.baseUrl ?? ''}${modele}`;
  }

  const brut = typeof requete?.originalUrl === 'string' ? requete.originalUrl : (requete?.url ?? '');
  const chemin = messageSansValeurs(String(brut).split(/[?#]/, 1)[0]);
  return `${methode} ${chemin || '-'}`;
}

/**
 * Filtre global de l'API.
 *
 * Il n'étend pas `BaseExceptionFilter` : la branche « erreur inconnue » de
 * celui-ci journalise l'objet entier, et aucun chemin de ce fichier ne doit
 * pouvoir y mener. La réponse des `HttpException` reprend donc à la lettre
 * celle de Nest 11 — corps objet renvoyé tel quel, corps texte enveloppé dans
 * `{ statusCode, message }` — et un test compare les deux.
 */
@Catch()
export class FiltreExceptions implements ExceptionFilter {
  constructor(
    private readonly adaptateur: HttpServer,
    private readonly journal: Pick<LoggerService, 'error'> = new Logger(FiltreExceptions.name),
  ) {}

  catch(exception: unknown, hote: ArgumentsHost): void {
    let prevue: HttpException | null;
    try {
      prevue = exception instanceof HttpException ? exception : erreurDeCorpsEnHttp(exception);
    } catch {
      // Objet piégé (accesseur qui lève) : traité comme une erreur inattendue.
      prevue = null;
    }

    if (prevue) {
      // Erreur voulue par le code ou erreur du client : rien au journal,
      // comme le faisait Nest.
      const brut = prevue.getResponse();
      const corps =
        typeof brut === 'object' && brut !== null
          ? brut
          : { statusCode: prevue.getStatus(), message: brut };
      this.repondre(hote, corps, prevue.getStatus());
      return;
    }

    const statut = HttpStatus.INTERNAL_SERVER_ERROR;
    this.repondre(hote, { statusCode: statut, message: MESSAGE_ERREUR_INATTENDUE }, statut);
    this.journaliser(exception, statut, hote);
  }

  private repondre(hote: ArgumentsHost, corps: unknown, statut: number): void {
    const reponse: unknown = hote.getArgByIndex(1);
    if (this.adaptateur.isHeadersSent(reponse)) {
      this.adaptateur.end(reponse);
      return;
    }
    this.adaptateur.reply(reponse, corps, statut);
  }

  /**
   * Une ligne, sans jamais lever : une exception jaillie d'un filtre laisse la
   * requête sans réponse et part, elle, dans le journal par défaut.
   */
  private journaliser(exception: unknown, statut: number, hote: ArgumentsHost): void {
    let ligne: string;
    try {
      const requete =
        hote.getType() === 'http' ? hote.switchToHttp().getRequest<Request>() : undefined;
      const message = messageDe(exception);
      ligne = `${nomDe(exception)} ${statut} ${routeDe(requete)}${message ? ` : ${message}` : ''}`;
    } catch {
      ligne = `Erreur non décrite ${statut}`;
    }
    try {
      this.journal.error(ligne);
    } catch {
      // Un journal indisponible ne doit pas empêcher de répondre.
    }
  }
}

/**
 * Branche la gestion des erreurs sur l'application : analyseurs de corps,
 * conversion de leurs erreurs, filtre global.
 *
 * L'application doit être créée avec `bodyParser: false`. Les analyseurs sont
 * posés ici, avec les réglages que Nest aurait pris (JSON, et formulaire
 * `extended`), pour que `traduireErreurDeCorps` s'insère entre eux et les
 * routes : Nest ne pose les siens qu'à l'initialisation, après tout
 * gestionnaire enregistré dans `main.ts`. Oublier l'option ne doublerait rien
 * (Nest reconnaît les analyseurs déjà posés à leur nom), mais la rendre
 * explicite évite de reposer sur ce détail.
 *
 * Partagée par `main.ts` et par le test d'intégration : ce qui est vérifié est
 * exactement ce qui tourne en production.
 */
export function installerGestionDesErreurs(app: NestExpressApplication): void {
  app.useBodyParser('json');
  app.useBodyParser<{ extended: boolean }>('urlencoded', { extended: true });
  app.use(traduireErreurDeCorps);
  app.useGlobalFilters(new FiltreExceptions(app.getHttpAdapter()));
}
