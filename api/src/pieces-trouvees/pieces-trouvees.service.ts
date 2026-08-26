import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { PieceTrouvee } from './entities/piece-trouvee.entity';
import { PointDepot } from '../points-depot/entities/point-depot.entity';
import { CreatePieceTrouveeDto } from './dto/create-piece-trouvee.dto';
import { PieceTrouveePubliqueDto } from './dto/piece-trouvee-publique.dto';
import { UtilisateursService } from '../utilisateurs/utilisateurs.service';
import { MatchingService } from '../matching/matching.service';
import { toGeoJsonPoint } from '../common/geo/geo.util';

const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'photos';
const LARGEUR_MAX_PHOTO = 1600;
const FLOU_SIGMA = 25;

@Injectable()
export class PiecesTrouveesService {
  constructor(
    @InjectRepository(PieceTrouvee)
    private readonly piecesTrouvees: Repository<PieceTrouvee>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly utilisateurs: UtilisateursService,
    private readonly matching: MatchingService,
  ) {}

  async create(dto: CreatePieceTrouveeDto): Promise<PieceTrouvee> {
    const declarant = await this.utilisateurs.findOrCreate(dto.declarant);

    const piece = this.piecesTrouvees.create({
      declarant,
      typePiece: dto.typePiece,
      prenom: dto.prenom,
      nom: dto.nom,
      commune: dto.commune,
      quartier: dto.quartier ?? null,
      position: toGeoJsonPoint({ lat: dto.lat, lng: dto.lng }),
      pointDepot: dto.pointDepotId ? ({ id: dto.pointDepotId } as PointDepot) : null,
      pointDepotAutre: dto.pointDepotId ? null : (dto.pointDepotAutre ?? null),
      photoOriginaleUrl: dto.photoOriginaleUrl ?? null,
      photoFlouteeUrl: dto.photoFlouteeUrl ?? null,
    });

    const saved = await this.piecesTrouvees.save(piece);
    await this.matching.traiterNouvellePiece(saved.id);
    return saved;
  }

  /**
   * Enregistre la photo originale et génère une version floutée (cf. principe
   * de confidentialité, CLAUDE.md section 2 : seule la version floutée est
   * exposée publiquement avant confirmation d'une correspondance).
   */
  async uploaderPhoto(file: Express.Multer.File): Promise<{ photoOriginaleUrl: string; photoFlouteeUrl: string }> {
    const nomFichier = `${randomUUID()}.webp`;
    const image = sharp(file.buffer).rotate().resize({ width: LARGEUR_MAX_PHOTO, withoutEnlargement: true });

    let originale: Buffer;
    let floutee: Buffer;
    try {
      originale = await image.clone().webp({ quality: 85 }).toBuffer();
      floutee = await image.clone().blur(FLOU_SIGMA).webp({ quality: 70 }).toBuffer();
    } catch {
      throw new BadRequestException('Image illisible ou format non supporté.');
    }

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const cheminOriginale = `originales/${nomFichier}`;
    const cheminFloutee = `floutees/${nomFichier}`;

    const [resultOriginale, resultFloutee] = await Promise.all([
      supabase.storage.from(SUPABASE_STORAGE_BUCKET).upload(cheminOriginale, originale, { contentType: 'image/webp' }),
      supabase.storage.from(SUPABASE_STORAGE_BUCKET).upload(cheminFloutee, floutee, { contentType: 'image/webp' }),
    ]);
    if (resultOriginale.error || resultFloutee.error) {
      throw new BadRequestException("Échec de l'enregistrement de la photo.");
    }

    return {
      photoOriginaleUrl: supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(cheminOriginale).data.publicUrl,
      photoFlouteeUrl: supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(cheminFloutee).data.publicUrl,
    };
  }

  /**
   * Vue publique : aucune donnée d'identification complète ni de contact
   * (cf. CLAUDE.md section 2 et `v_pieces_trouvees_publiques`).
   */
  findPublic(): Promise<PieceTrouveePubliqueDto[]> {
    return this.dataSource.query<PieceTrouveePubliqueDto[]>(
      `SELECT * FROM v_pieces_trouvees_publiques ORDER BY date_trouvaille DESC`,
    );
  }

  /**
   * Comptes agrégés du registre public, pour l'injection au bord.
   *
   * Le Worker Cloudflare écrit ces nombres dans le HTML pré-rendu des pages
   * de registre, afin qu'un robot voie une page vivante et non « 0 entrée ».
   * L'agrégat part de la même vue que la liste publique : on ne peut donc
   * compter que ce qui est réellement visible — jamais les pièces restituées,
   * expirées ou en attente.
   */
  async stats(): Promise<{
    total: number;
    parCommune: Record<string, number>;
    parType: Record<string, number>;
  }> {
    const lignes = await this.dataSource.query<
      Array<{ commune: string; type_piece: string; n: string }>
    >(
      `SELECT commune, type_piece, COUNT(*) AS n
         FROM v_pieces_trouvees_publiques
        GROUP BY commune, type_piece`,
    );

    const parCommune: Record<string, number> = {};
    const parType: Record<string, number> = {};
    let total = 0;

    for (const { commune, type_piece, n } of lignes) {
      // COUNT() arrive en chaîne : le pilote Postgres renvoie les bigint
      // ainsi pour ne pas perdre de précision.
      const compte = Number(n);
      total += compte;
      parCommune[commune] = (parCommune[commune] ?? 0) + compte;
      parType[type_piece] = (parType[type_piece] ?? 0) + compte;
    }

    return { total, parCommune, parType };
  }
}
