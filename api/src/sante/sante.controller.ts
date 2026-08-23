import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/** Instant de démarrage du processus, pour calculer sa durée de vie. */
const DEMARRAGE = Date.now();

interface EtatSante {
  statut: 'ok';
  /** Secondes écoulées depuis le démarrage — révèle les redémarrages en boucle. */
  depuis: number;
  /** État de la connexion Supabase, informatif : voir la note ci-dessous. */
  baseDeDonnees: 'ok' | 'injoignable';
}

@Controller('sante')
export class SanteController {
  constructor(@InjectDataSource() private readonly source: DataSource) {}

  /**
   * Sonde de vivacité, utilisée par Render et par la supervision.
   *
   * Répond **toujours 200 si le processus tourne**, même quand la base est
   * injoignable — et l'indique dans le corps. C'est délibéré : une sonde qui
   * échoue sur une coupure passagère de Supabase ferait redémarrer l'API en
   * boucle, ce qui n'y remédie en rien et aggrave l'indisponibilité.
   *
   * L'état de la base est donc une information à lire, pas un motif de
   * redémarrage.
   */
  @Get()
  async etat(): Promise<EtatSante> {
    let baseDeDonnees: EtatSante['baseDeDonnees'] = 'injoignable';
    try {
      await this.source.query('SELECT 1');
      baseDeDonnees = 'ok';
    } catch {
      // Volontairement silencieux : l'état est déjà porté par la réponse.
    }

    return {
      statut: 'ok',
      depuis: Math.round((Date.now() - DEMARRAGE) / 1000),
      baseDeDonnees,
    };
  }
}