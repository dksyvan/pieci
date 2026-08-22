import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

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
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: originesAutorisees() });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();