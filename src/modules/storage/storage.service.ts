import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    CopyObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    NotFound,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AllConfigType } from '../../config/config.type';
import { StorageObjectNotFoundError, StorageOperationError } from './errors/storage.errors';
import { ObjectMetadata, PresignPutParams, PutObjectParams } from './storage.types';

@Injectable()
export class StorageService {
    private readonly client: S3Client;
    private readonly bucket: string;
    private readonly publicBaseUrl?: string;

    constructor(private readonly config: ConfigService<AllConfigType>) {
        const storageConfig = this.config.getOrThrow('storage', { infer: true });

        this.bucket = storageConfig.bucket;
        this.publicBaseUrl = storageConfig.publicBaseUrl;

        const { region, endpoint, accessKeyId, secretAccessKey, forcePathStyle } = storageConfig;

        this.client = new S3Client({
            region,
            ...(endpoint ? { endpoint } : {}),
            credentials: { accessKeyId, secretAccessKey },
            forcePathStyle,
            requestChecksumCalculation: 'WHEN_REQUIRED',
            responseChecksumValidation: 'WHEN_REQUIRED',
        });
    }

    getBucket(): string {
        return this.bucket;
    }

    async put(params: PutObjectParams): Promise<void> {
        try {
            await this.client.send(
                new PutObjectCommand({
                    Bucket: this.bucket,
                    Key: params.key,
                    Body: params.body,
                    ContentType: params.contentType,
                    ...(params.metadata ? { Metadata: params.metadata } : {}),
                }),
            );
        } catch (error) {
            throw new StorageOperationError(
                `Put object failed for key "${params.key}"`,
                error,
            );
        }
    }

    async head(key: string): Promise<ObjectMetadata> {
        try {
            const result = await this.client.send(
                new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
            );

            return {
                key,
                contentType: result.ContentType,
                contentLength: result.ContentLength ?? 0,
                etag: result.ETag,
                lastModified: result.LastModified,
            };
        } catch (error) {
            if (this.isNotFoundError(error)) {
                throw new StorageObjectNotFoundError(key);
            }

            throw new StorageOperationError(`Head object failed for key "${key}"`, error);
        }
    }

    async exists(key: string): Promise<boolean> {
        try {
            await this.head(key);
            return true;
        } catch (error) {
            if (error instanceof StorageObjectNotFoundError) {
                return false;
            }

            throw error;
        }
    }

    async delete(key: string): Promise<void> {
        try {
            await this.client.send(
                new DeleteObjectCommand({
                    Bucket: this.bucket,
                    Key: key,
                }),
            );
        } catch (error) {
            if (this.isNotFoundError(error)) {
                return;
            }

            throw new StorageOperationError(`Delete object failed for key "${key}"`, error);
        }
    }

    async copy(sourceKey: string, destinationKey: string): Promise<void> {
        try {
            await this.client.send(
                new CopyObjectCommand({
                    Bucket: this.bucket,
                    Key: destinationKey,
                    CopySource: `${this.bucket}/${sourceKey}`,
                }),
            );
        } catch (error) {
            throw new StorageOperationError(
                `Copy object failed from "${sourceKey}" to "${destinationKey}"`,
                error,
            );
        }
    }

    async createPresignedPutUrl(params: PresignPutParams): Promise<string> {
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: params.key,
            ContentType: params.contentType,
        });

        try {
            return await getSignedUrl(this.client, command, {
                expiresIn: params.expiresInSeconds ?? 300,
            });
        } catch (error) {
            throw new StorageOperationError(
                `Create presigned put URL failed for key "${params.key}"`,
                error,
            );
        }
    }

    async createPresignedReadUrl(key: string, expiresInSeconds = 300): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });

        try {
            return await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
        } catch (error) {
            throw new StorageOperationError(
                `Create presigned read URL failed for key "${key}"`,
                error,
            );
        }
    }

    getPublicUrl(key: string): string | undefined {
        if (!this.publicBaseUrl) return undefined;
        return `${this.publicBaseUrl.replace(/\/$/, '')}/${key.replace(/^\//, '')}`;
    }

    private isNotFoundError(error: unknown): boolean {
        return error instanceof NotFound || (error as { name?: string })?.name === 'NotFound';
    }
}
