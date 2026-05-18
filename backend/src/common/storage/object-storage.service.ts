import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { createHash, randomUUID } from 'crypto';
import { extname } from 'path';
import { Readable } from 'stream';

export type StorageBucketName =
  | 'originalDocuments'
  | 'signedDocuments'
  | 'signatureAssets'
  | 'profileImages'
  | 'temp';

export interface StoredObject {
  bucket: string;
  key: string;
  reference: string;
  hash: string;
  size: number;
  mimeType: string;
}

const DEFAULT_BUCKETS: Record<StorageBucketName, string> = {
  originalDocuments: 'deaa-original-documents',
  signedDocuments: 'deaa-signed-documents',
  signatureAssets: 'deaa-signature-assets',
  profileImages: 'deaa-profile-images',
  temp: 'deaa-temp',
};

@Injectable()
export class ObjectStorageService implements OnModuleInit {
  private readonly logger = new Logger(ObjectStorageService.name);
  private readonly client?: Client;
  private readonly buckets: Record<StorageBucketName, string>;

  constructor(private readonly config: ConfigService) {
    this.buckets = {
      originalDocuments:
        this.config.get<string>('MINIO_BUCKET_ORIGINAL_DOCUMENTS') ??
        DEFAULT_BUCKETS.originalDocuments,
      signedDocuments:
        this.config.get<string>('MINIO_BUCKET_SIGNED_DOCUMENTS') ??
        DEFAULT_BUCKETS.signedDocuments,
      signatureAssets:
        this.config.get<string>('MINIO_BUCKET_SIGNATURE_ASSETS') ??
        DEFAULT_BUCKETS.signatureAssets,
      profileImages:
        this.config.get<string>('MINIO_BUCKET_PROFILE_IMAGES') ??
        DEFAULT_BUCKETS.profileImages,
      temp:
        this.config.get<string>('MINIO_BUCKET_TEMP') ?? DEFAULT_BUCKETS.temp,
    };

    const endpoint = this.config.get<string>('MINIO_ENDPOINT');
    if (!endpoint) {
      this.logger.warn(
        'MINIO_ENDPOINT is not set; MinIO-backed storage is disabled',
      );
      return;
    }

    this.client = new Client({
      endPoint: endpoint,
      port: Number(this.config.get<string>('MINIO_PORT') ?? 9000),
      useSSL: this.config.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.config.get<string>('MINIO_ACCESS_KEY') ?? '',
      secretKey: this.config.get<string>('MINIO_SECRET_KEY') ?? '',
    });
  }

  async onModuleInit() {
    if (!this.client) return;
    await Promise.all(
      Object.values(this.buckets).map(async (bucket) => {
        const exists = await this.client!.bucketExists(bucket);
        if (!exists) {
          await this.client!.makeBucket(bucket);
          this.logger.log(`Created MinIO bucket ${bucket}`);
        }
      }),
    );
    this.logger.log('MinIO storage ready');
  }

  get isEnabled() {
    return Boolean(this.client);
  }

  bucket(name: StorageBucketName) {
    return this.buckets[name];
  }

  objectReference(bucket: string, key: string) {
    return `minio://${bucket}/${key}`;
  }

  parseReference(reference: string) {
    const match = /^minio:\/\/([^/]+)\/(.+)$/.exec(reference);
    if (!match) return null;
    return { bucket: match[1], key: match[2] };
  }

  async healthCheck() {
    if (!this.client) return false;
    await this.client.listBuckets();
    return true;
  }

  async uploadBuffer(params: {
    bucketName: StorageBucketName;
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    folder?: string;
    allowedMimeTypes?: string[];
    maxSizeBytes?: number;
  }): Promise<StoredObject> {
    if (!this.client) {
      throw new Error(
        'MinIO is not configured. Set MINIO_* environment variables.',
      );
    }
    if (
      params.allowedMimeTypes &&
      !params.allowedMimeTypes.includes(params.mimeType)
    ) {
      throw new BadRequestException('Unsupported file type');
    }
    if (params.maxSizeBytes && params.buffer.length > params.maxSizeBytes) {
      throw new BadRequestException('File is too large');
    }
    if (
      params.mimeType === 'application/pdf' &&
      !params.buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))
    ) {
      throw new BadRequestException('Invalid PDF file');
    }

    const bucket = this.bucket(params.bucketName);
    const extension = extname(params.originalName).toLowerCase();
    const hash = createHash('sha256').update(params.buffer).digest('hex');
    const prefix = params.folder ? `${this.cleanPath(params.folder)}/` : '';
    const key = `${prefix}${Date.now()}-${randomUUID()}${extension}`;

    await this.client.putObject(
      bucket,
      key,
      params.buffer,
      params.buffer.length,
      {
        'Content-Type': params.mimeType,
        'X-Amz-Meta-Sha256': hash,
        'X-Amz-Meta-Original-Name': encodeURIComponent(params.originalName),
      },
    );

    return {
      bucket,
      key,
      reference: this.objectReference(bucket, key),
      hash,
      size: params.buffer.length,
      mimeType: params.mimeType,
    };
  }

  async getObject(reference: string): Promise<Readable> {
    if (!this.client) {
      throw new Error(
        'MinIO is not configured. Set MINIO_* environment variables.',
      );
    }
    const parsed = this.parseReference(reference);
    if (!parsed) throw new Error('Invalid MinIO object reference');
    return this.client.getObject(parsed.bucket, parsed.key);
  }

  async deleteObject(reference: string) {
    if (!this.client) return;
    const parsed = this.parseReference(reference);
    if (!parsed) return;
    await this.client.removeObject(parsed.bucket, parsed.key);
  }

  async signedUrl(reference: string, expirySeconds = 300) {
    if (!this.client) {
      throw new Error(
        'MinIO is not configured. Set MINIO_* environment variables.',
      );
    }
    const parsed = this.parseReference(reference);
    if (!parsed) throw new Error('Invalid MinIO object reference');
    return this.client.presignedGetObject(
      parsed.bucket,
      parsed.key,
      expirySeconds,
    );
  }

  private cleanPath(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9/_-]+/g, '-')
      .replace(/\/+/g, '/')
      .replace(/^\/+|\/+$/g, '')
      .toLowerCase();
  }
}
