import {
  Body,
  Controller,
  Get,
  HttpStatus,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PiecesTrouveesService } from './pieces-trouvees.service';
import { CreatePieceTrouveeDto } from './dto/create-piece-trouvee.dto';

const TAILLE_MAX_PHOTO = 8 * 1024 * 1024; // 8 Mo

@Controller('pieces-trouvees')
export class PiecesTrouveesController {
  constructor(private readonly piecesTrouvees: PiecesTrouveesService) {}

  @Post()
  create(@Body() dto: CreatePieceTrouveeDto) {
    return this.piecesTrouvees.create(dto);
  }

  @Post('photo')
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
}
