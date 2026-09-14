import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { LimiteVisiteur, LimiteVisiteurGuard } from '../common/limite-visiteur.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PiecesTrouveesService } from './pieces-trouvees.service';
import { CreatePieceTrouveeDto } from './dto/create-piece-trouvee.dto';

const TAILLE_MAX_PHOTO = 8 * 1024 * 1024; // 8 Mo

@Controller('pieces-trouvees')
export class PiecesTrouveesController {
  constructor(private readonly piecesTrouvees: PiecesTrouveesService) {}

  /**
   * Ne renvoie que l'identifiant : l'entité porte le compte du déclarant,
   * retrouvé par un numéro que rien ne vérifie (voir AlertesPerteController).
   */
  /*
   * Soixante déclarations par visiteur sur dix minutes : la saisie en série
   * d'un tiroir de mairie en envoie une trentaine d'affilée, parfois à deux
   * agents derrière la même connexion ; une boucle de fausses déclarations au
   * même nom bien davantage.
   */
  @Post()
  @UseGuards(LimiteVisiteurGuard)
  @LimiteVisiteur('declarations', 60, 10 * 60_000)
  async create(@Body() dto: CreatePieceTrouveeDto): Promise<{ id: string }> {
    const { id } = await this.piecesTrouvees.create(dto);
    return { id };
  }

  @Post('photo')
  @UseGuards(LimiteVisiteurGuard)
  @LimiteVisiteur('photos', 60, 10 * 60_000)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: TAILLE_MAX_PHOTO },
    }),
  )
  uploaderPhoto(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /^image\/(jpe?g|png|webp)$/ })
        .addMaxSizeValidator({ maxSize: TAILLE_MAX_PHOTO })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
  ) {
    return this.piecesTrouvees.uploaderPhoto(file);
  }

  @Get()
  findPublic() {
    return this.piecesTrouvees.findPublic();
  }

  /** Comptes agrégés, consommés par le Worker Cloudflare (cache de 10 min). */
  @Get('stats')
  stats() {
    return this.piecesTrouvees.stats();
  }

  /**
   * Une pièce seule, pour sa page publique et l'aperçu au partage.
   *
   * Déclarée après `stats` : Nest éprouve les routes dans l'ordre du fichier,
   * et un `:id` placé plus haut avalerait `/pieces-trouvees/stats`. Le filtre
   * d'UUID n'est pas décoratif non plus — il répond 400 sur un identifiant
   * malformé au lieu de laisser Postgres refuser la conversion en 500.
   */
  @Get(':id')
  findOnePublic(@Param('id', ParseUUIDPipe) id: string) {
    return this.piecesTrouvees.findOnePublic(id);
  }
}
