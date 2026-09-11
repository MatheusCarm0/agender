import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  Get,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { StorageService } from './storage.service';

interface RequestUser {
  userId: string;
  businessId: string;
  role: string;
}

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_SIZE = 5 * 1024 * 1024;

@Controller('upload')
export class UploadController {
  constructor(private readonly storage: StorageService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    // memoryStorage (default do multer sem `storage`): o arquivo fica em
    // file.buffer e é gravado pelo StorageService — nunca em disco de request.
    FileInterceptor('file', {
      fileFilter: (
        _req: Express.Request,
        file: Express.Multer.File,
        cb: (error: Error | null, accept: boolean) => void,
      ) => {
        const ext = extname(file.originalname).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          return cb(new BadRequestException('Only JPG, PNG and WebP images are allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: MAX_SIZE },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() _user: RequestUser,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const ext = extname(file.originalname).toLowerCase();
    const filename = `${randomUUID()}${ext}`;
    const url = await this.storage.save(
      filename,
      file.buffer,
      this.storage.contentTypeFor(ext),
    );
    return { url, filename };
  }

  @Get('files/:filename')
  async serveFile(@Param('filename') filename: string, @Res() res: Response) {
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).send('Invalid filename');
    }
    const obj = await this.storage.read(filename);
    if (!obj) {
      return res.status(404).send('Not found');
    }
    // Impede o browser de "sniffar" o conteúdo como outro tipo (ex.: HTML) — o
    // arquivo é validado só pela extensão no upload.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', obj.contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    obj.stream.on('error', () => {
      if (!res.headersSent) res.status(500);
      res.end();
    });
    obj.stream.pipe(res);
  }
}
