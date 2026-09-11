import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import {
  existsSync,
  mkdirSync,
  createReadStream,
  createWriteStream,
} from 'fs';
import { Readable } from 'stream';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

// Fallback de disco APENAS para dev (efêmero, não compartilhado entre réplicas).
// Em produção use object storage: defina S3_* (R2/S3/Spaces). Ver docs.
const UPLOADS_DIR = join(process.cwd(), 'uploads');

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export interface StoredObject {
  stream: Readable;
  contentType: string;
}

/**
 * Abstrai onde os uploads (logo, capa, galeria, favicon) são gravados e lidos.
 *
 * - **Object storage (R2/S3-compatible):** ativado quando as variáveis S3_* estão
 *   definidas. Durável e compartilhado entre réplicas — sobrevive a redeploy.
 * - **Disco local:** fallback de dev quando as S3_* não estão definidas. Efêmero.
 *
 * Os arquivos são servidos pela própria API (proxy em `GET /upload/files/:name`),
 * então a URL retornada é relativa e funciona igual nos dois modos e em qualquer
 * réplica.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client | null;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = config.get<string>('S3_ENDPOINT');
    const bucket = config.get<string>('S3_BUCKET');
    const accessKeyId = config.get<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('S3_SECRET_ACCESS_KEY');
    this.bucket = bucket ?? '';

    if (endpoint && bucket && accessKeyId && secretAccessKey) {
      this.s3 = new S3Client({
        region: config.get<string>('S3_REGION') ?? 'auto',
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: true,
      });
      this.logger.log(`Storage: object storage (bucket "${bucket}").`);
    } else {
      this.s3 = null;
      if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
      this.logger.warn(
        'Storage: disco local (efêmero, some no redeploy). Defina S3_ENDPOINT, ' +
          'S3_BUCKET, S3_ACCESS_KEY_ID e S3_SECRET_ACCESS_KEY para usar object storage.',
      );
    }
  }

  contentTypeFor(ext: string): string {
    return CONTENT_TYPES[ext.toLowerCase()] ?? 'application/octet-stream';
  }

  /** Grava o arquivo e devolve a URL relativa servida pela API. */
  async save(
    filename: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    if (this.s3) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: filename,
          Body: buffer,
          ContentType: contentType,
        }),
      );
    } else {
      await new Promise<void>((resolve, reject) => {
        const out = createWriteStream(join(UPLOADS_DIR, filename));
        out.on('error', reject);
        out.on('finish', () => resolve());
        out.end(buffer);
      });
    }
    return `/upload/files/${filename}`;
  }

  /** Abre o arquivo para servir via proxy da API. `null` se não existir. */
  async read(filename: string): Promise<StoredObject | null> {
    if (this.s3) {
      try {
        const res = await this.s3.send(
          new GetObjectCommand({ Bucket: this.bucket, Key: filename }),
        );
        if (!res.Body) return null;
        return {
          stream: res.Body as Readable,
          contentType: res.ContentType ?? 'application/octet-stream',
        };
      } catch {
        return null;
      }
    }

    const filepath = join(UPLOADS_DIR, filename);
    if (!existsSync(filepath)) return null;
    const ext = filename.slice(filename.lastIndexOf('.'));
    return {
      stream: createReadStream(filepath),
      contentType: this.contentTypeFor(ext),
    };
  }
}
