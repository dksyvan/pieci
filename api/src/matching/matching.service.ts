import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Correspondance } from '../correspondances/entities/correspondance.entity';
import { PieceTrouvee } from '../pieces-trouvees/entities/piece-trouvee.entity';
import { AlertePerte } from '../alertes-perte/entities/alerte-perte.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { StatutAlerte, StatutTrouvaille, TypePiece } from '../common/enums';
import { PersonnePiece, niveauConfiance, trouverMatches } from './matching';

/**
 * Rayon de pré-filtrage ST_DWithin, en mètres. Le poids géo (10%) ne suffit
 * pas, à lui seul, à faire passer un score sous SEUIL_AFFICHAGE : il ne
 * s'agit que d'une borne sur la taille du candidat-set avant scoreMatch
 * (cf. matching.ts, specs section 3.6).
 */
const RAYON_PREFILTRE_M = 100_000;

interface AlerteAvecPosition {
  id: string;
  prenom: string;
  nom: string;
  type_piece: TypePiece;
  created_at: Date;
  utilisateur_id: string;
  lat: number | null;
  lng: number | null;
}

interface PieceAvecPosition {
  id: string;
  prenom: string;
  nom: string;
  type_piece: TypePiece;
  date_trouvaille: Date;
  declarant_id: string;
  lat: number;
  lng: number;
}

interface CandidatPiece extends PersonnePiece {
  id: string;
  declarantId: string;
}

interface CandidatAlerte extends PersonnePiece {
  id: string;
  utilisateurId: string;
}

interface PaireCorrespondance {
  pieceTrouveeId: string;
  pieceDeclarantId: string;
  alertePerteId: string;
  alerteUtilisateurId: string;
  score: number;
}

@Injectable()
export class MatchingService {
  constructor(
    @InjectRepository(Correspondance)
    private readonly correspondances: Repository<Correspondance>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * À appeler après la création d'une alerte de perte : recherche les
   * trouvailles disponibles compatibles et enregistre les correspondances.
   *
   * Fonctionne avec ou sans position. Le lieu est facultatif sur « j'ai perdu
   * ma pièce » — on ne sait pas toujours où on l'a perdue — et une alerte
   * sans lieu était jusqu'ici abandonnée en silence : la personne lisait
   * « ton alerte est enregistrée, on te prévient » et n'était jamais
   * prévenue, même pour une pièce déclarée le lendemain à son nom exact.
   */
  async traiterNouvelleAlerte(alerteId: string): Promise<void> {
    const [alerte] = await this.dataSource.query<AlerteAvecPosition[]>(
      `SELECT id, prenom, nom, type_piece, created_at, utilisateur_id,
              ST_Y(position::geometry) AS lat, ST_X(position::geometry) AS lng
       FROM alertes_perte WHERE id = $1`,
      [alerteId],
    );

    if (!alerte) return;

    const situee = alerte.lat !== null && alerte.lng !== null;

    // Le filtre géographique borne la taille du candidat-set ; il ne décide
    // de rien. Sans position, on renonce à la borne plutôt qu'au
    // rapprochement — le filtre par type suffit à garder la requête sobre.
    const candidats = await this.dataSource.query<PieceAvecPosition[]>(
      `SELECT id, prenom, nom, type_piece, date_trouvaille, declarant_id,
              ST_Y(position::geometry) AS lat, ST_X(position::geometry) AS lng
       FROM pieces_trouvees
       WHERE statut = $1
         AND type_piece = $2
         ${situee ? 'AND ST_DWithin(position, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, $5)' : ''}`,
      situee
        ? [StatutTrouvaille.DISPONIBLE, alerte.type_piece, alerte.lng, alerte.lat, RAYON_PREFILTRE_M]
        : [StatutTrouvaille.DISPONIBLE, alerte.type_piece],
    );

    const perte: PersonnePiece = {
      nom: alerte.nom,
      prenom: alerte.prenom,
      typePiece: alerte.type_piece,
      lat: alerte.lat === null ? null : Number(alerte.lat),
      lng: alerte.lng === null ? null : Number(alerte.lng),
      date: alerte.created_at,
    };

    const base: CandidatPiece[] = candidats.map((c) => ({
      id: c.id,
      declarantId: c.declarant_id,
      nom: c.nom,
      prenom: c.prenom,
      typePiece: c.type_piece,
      lat: Number(c.lat),
      lng: Number(c.lng),
      date: c.date_trouvaille,
    }));

    await this.enregistrerCorrespondances(
      trouverMatches(perte, base).map((m) => ({
        pieceTrouveeId: m.id,
        pieceDeclarantId: m.declarantId,
        alertePerteId: alerteId,
        alerteUtilisateurId: alerte.utilisateur_id,
        score: m.score,
      })),
    );
  }

  /**
   * Symétrique de `traiterNouvelleAlerte`, à appeler après la création d'une
   * trouvaille : recherche les alertes actives compatibles (avec position) et
   * enregistre les correspondances.
   */
  async traiterNouvellePiece(pieceId: string): Promise<void> {
    const [piece] = await this.dataSource.query<PieceAvecPosition[]>(
      `SELECT id, prenom, nom, type_piece, date_trouvaille, declarant_id,
              ST_Y(position::geometry) AS lat, ST_X(position::geometry) AS lng
       FROM pieces_trouvees WHERE id = $1`,
      [pieceId],
    );

    if (!piece) return;

    // `position IS NULL` est retenu, pas écarté : c'est le cas de quelqu'un
    // qui ignore où il a perdu sa pièce, et c'est précisément celui qui a le
    // plus besoin qu'on la retrouve pour lui.
    const candidats = await this.dataSource.query<AlerteAvecPosition[]>(
      `SELECT id, prenom, nom, type_piece, created_at, utilisateur_id,
              ST_Y(position::geometry) AS lat, ST_X(position::geometry) AS lng
       FROM alertes_perte
       WHERE statut = $1
         AND type_piece = $2
         AND (position IS NULL
              OR ST_DWithin(position, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, $5))`,
      [StatutAlerte.ACTIVE, piece.type_piece, piece.lng, piece.lat, RAYON_PREFILTRE_M],
    );

    const trouvaille: PersonnePiece = {
      nom: piece.nom,
      prenom: piece.prenom,
      typePiece: piece.type_piece,
      lat: Number(piece.lat),
      lng: Number(piece.lng),
      date: piece.date_trouvaille,
    };

    const base: CandidatAlerte[] = candidats.map((c) => ({
      id: c.id,
      utilisateurId: c.utilisateur_id,
      nom: c.nom,
      prenom: c.prenom,
      typePiece: c.type_piece,
      lat: c.lat === null ? null : Number(c.lat),
      lng: c.lng === null ? null : Number(c.lng),
      date: c.created_at,
    }));

    await this.enregistrerCorrespondances(
      trouverMatches(trouvaille, base).map((m) => ({
        pieceTrouveeId: pieceId,
        pieceDeclarantId: piece.declarant_id,
        alertePerteId: m.id,
        alerteUtilisateurId: m.utilisateurId,
        score: m.score,
      })),
    );
  }

  /**
   * Enregistre les correspondances suggérées et notifie les deux parties.
   * Le score/niveau de confiance est la seule donnée mise à jour en cas de
   * conflit : `statut` (décision humaine) n'est jamais écrasé.
   */
  private async enregistrerCorrespondances(paires: PaireCorrespondance[]): Promise<void> {
    if (paires.length === 0) return;

    await this.correspondances.upsert(
      paires.map((p) => ({
        pieceTrouvee: { id: p.pieceTrouveeId } as PieceTrouvee,
        alertePerte: { id: p.alertePerteId } as AlertePerte,
        score: p.score,
        niveauConfiance: niveauConfiance(p.score),
      })),
      { conflictPaths: ['pieceTrouvee', 'alertePerte'] },
    );

    for (const p of paires) {
      const correspondance = await this.correspondances.findOne({
        where: { pieceTrouvee: { id: p.pieceTrouveeId }, alertePerte: { id: p.alertePerteId } },
      });

      await Promise.all([
        this.notifications.creer({
          utilisateurId: p.pieceDeclarantId,
          titre: 'Correspondance trouvée',
          contenu:
            'Une correspondance potentielle a été trouvée pour la pièce que vous avez déclarée.',
          correspondanceId: correspondance?.id,
        }),
        this.notifications.creer({
          utilisateurId: p.alerteUtilisateurId,
          titre: 'Correspondance trouvée',
          contenu: 'Une correspondance potentielle a été trouvée pour votre alerte de perte.',
          correspondanceId: correspondance?.id,
        }),
      ]);
    }
  }
}
