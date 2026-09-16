import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { installerGestionDesErreurs } from './common/filtre-exceptions';

/**
 * Origines autorisées à appeler l'API.
 *
 * `FRONTEND_URL` accepte plusieurs valeurs séparées par des virgules : le
 * domaine change (workers.dev -> pieci.ci) mais les anciens liens continuent de
 * circuler, et une origine oubliée se traduit par un « Une erreur est survenue »
 * côté utilisateur, sans indice sur la cause.
 *
 * Variable vide : CORS permissif, pour le développement local.
 */
function originesAutorisees(): string[] | true {
  const brut = process.env.FRONTEND_URL?.trim();
  if (!brut) return true;

  const liste = brut
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  return liste.length > 0 ? liste : true;
}

async function bootstrap() {
  // Analyseurs de corps posés par installerGestionDesErreurs, pas par Nest :
  // c'est ce qui permet d'intercepter leurs erreurs avant qu'un JSON mal formé
  // ne soit recopié dans la réponse. Voir common/filtre-exceptions.ts.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.enableCors({ origin: originesAutorisees() });
  // Avant tout déploiement : sans ce filtre, une erreur SQL écrit les valeurs
  // de la requête (noms, prénoms, commune) dans les journaux de l'hébergeur.
  installerGestionDesErreurs(app);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();