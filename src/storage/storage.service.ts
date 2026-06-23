import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AllConfigType } from '../config/config.type';
import { PrismaService } from '../prisma/prisma.service';

export interface UploadObjectInput {
    buffer: Buffer;
    key: string;
    contentType: string;
    fileName?: string;
    folder?: string;
    isPublic?: boolean;
}

export interface CreatePresignedUploadInput {
    key: string;
    contentType: string;
    expiresInSeconds?: number;
    folder?: string;
}

export interface ConfirmPresignedUploadInput {
    key: string;
    fileName?: string;
    contentType?: string;
    isPublic?: boolean;
}

export interface StoredObjectResult {
    id?: string;
    key: string;
    bucket: string;
    url?: string;
    contentType: string;
    size?: number;
}

@Injectable()
export class StorageService {
    private readonly client: S3Client;
    private readonly bucket: string;
    private readonly publicBaseUrl?: string;
    private readonly defaultAclPublic: boolean;

    constructor(
        private readonly config: ConfigService<AllConfigType>,
        private readonly prisma: PrismaService,
    ) {
        const storageConfig = this.config.getOrThrow('storage', { infer: true });

        this.bucket = storageConfig.bucket;
        this.publicBaseUrl = storageConfig.publicBaseUrl;
        this.defaultAclPublic = storageConfig.defaultPublic;

        const { provider, region, endpoint, accessKeyId, secretAccessKey } = storageConfig;

        this.client = new S3Client({
            region,
            ...(endpoint ? { endpoint } : {}),
            credentials: { accessKeyId, secretAccessKey },
            forcePathStyle: provider === 'r2' || provider === 'minio',
            requestChecksumCalculation: 'WHEN_REQUIRED',
            responseChecksumValidation: 'WHEN_REQUIRED',
        });
    }

    async uploadObject(input: UploadObjectInput): Promise<StoredObjectResult> {
        const key = this.buildKey(input.key, input.folder);

        try {
            await this.client.send(
                new PutObjectCommand({
                    Bucket: this.bucket,
                    Key: key,
                    Body: input.buffer,
                    ContentType: input.contentType,
                }),
            );

            return this.saveFileAsset({
                key,
                contentType: input.contentType,
                size: input.buffer.length,
                fileName: input.fileName,
                isPublic: input.isPublic,
            });
        } catch (error) {
            throw new InternalServerErrorException(
                `Upload storage object failed: ${this.getErrorMessage(error)}`,
            );
        }
    }

    async createPresignedUploadUrl(
        input: CreatePresignedUploadInput,
    ): Promise<{ key: string; uploadUrl: string }> {
        const key = this.buildKey(input.key, input.folder);
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: input.contentType,
        });

        const uploadUrl = await getSignedUrl(this.client, command, {
            expiresIn: input.expiresInSeconds ?? 300,
        });

        return { key, uploadUrl };
    }

    async confirmPresignedUpload(input: ConfirmPresignedUploadInput): Promise<StoredObjectResult> {
        const exists = await this.objectExists(input.key);
        if (!exists) {
            throw new NotFoundException(`Object with key "${input.key}" not found in storage`);
        }

        try {
            const head = await this.client.send(
                new HeadObjectCommand({ Bucket: this.bucket, Key: input.key }),
            );

            const contentType =
                head.ContentType ?? input.contentType ?? 'application/octet-stream';
            const size = head.ContentLength ?? 0;

            if (size <= 0) {
                throw new BadRequestException('Object size is invalid');
            }

            return this.saveFileAsset({
                key: input.key,
                contentType,
                size,
                fileName: input.fileName,
                isPublic: input.isPublic,
            });
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }

            throw new InternalServerErrorException(
                `Confirm presigned upload failed: ${this.getErrorMessage(error)}`,
            );
        }
    }

    async createPresignedReadUrl(key: string, expiresInSeconds = 300): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });

        return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
    }

    async deleteObject(key: string): Promise<void> {
        await this.client.send(
            new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key,
            }),
        );

        await this.prisma.fileAsset.deleteMany({ where: { bucket: this.bucket, key } });
    }

    async objectExists(key: string): Promise<boolean> {
        try {
            await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
            return true;
        } catch {
            return false;
        }
    }

    getPublicUrl(key: string): string | undefined {
        if (!this.publicBaseUrl) return undefined;
        return `${this.publicBaseUrl.replace(/\/$/, '')}/${key.replace(/^\//, '')}`;
    }

    private async saveFileAsset(input: {
        key: string;
        contentType: string;
        size: number;
        fileName?: string;
        isPublic?: boolean;
    }): Promise<StoredObjectResult> {
        const url = this.getPublicUrl(input.key);
        const fileName = input.fileName ?? input.key.split('/').pop() ?? input.key;
        const isPublic = input.isPublic ?? this.defaultAclPublic;

        const data = {
            url,
            fileName,
            mimeType: input.contentType,
            size: input.size,
            isPublic,
        };

        const existing = await this.prisma.fileAsset.findFirst({
            where: { bucket: this.bucket, key: input.key },
        });

        const asset = existing
            ? await this.prisma.fileAsset.update({
                  where: { id: existing.id },
                  data,
              })
            : await this.prisma.fileAsset.create({
                  data: {
                      ...data,
                      key: input.key,
                      bucket: this.bucket,
                  },
              });

        return {
            id: asset.id,
            key: input.key,
            bucket: this.bucket,
            url,
            contentType: input.contentType,
            size: input.size,
        };
    }

    private buildKey(key: string, folder?: string): string {
        const safeKey = key.replace(/^\/+/, '').replace(/\s+/g, '-');
        if (!folder) return safeKey;
        return `${folder.replace(/^\/+|\/+$/g, '')}/${safeKey}`;
    }

    private getErrorMessage(error: unknown): string {
        if (error instanceof Error) return error.message;
        return 'unknown error';
    }
}
