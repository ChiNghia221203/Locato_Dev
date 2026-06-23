import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { FileAssetService } from '../file-asset/file-asset.service';
import { StorageObjectNotFoundError, StorageOperationError } from '../storage/errors/storage.errors';
import { StorageService } from '../storage/storage.service';
import { StoredFileResult } from './upload.types';

export interface UploadFileInput {
    buffer: Buffer;
    key: string;
    contentType: string;
    fileName?: string;
    folder?: string;
    isPublic?: boolean;
}

export interface PresignUploadInput {
    key: string;
    contentType: string;
    folder?: string;
    expiresInSeconds?: number;
}

export interface ConfirmUploadInput {
    key: string;
    fileName?: string;
    contentType?: string;
    isPublic?: boolean;
}

@Injectable()
export class UploadService {
    constructor(
        private readonly storage: StorageService,
        private readonly fileAsset: FileAssetService,
    ) {}

    async uploadFile(input: UploadFileInput): Promise<StoredFileResult> {
        const key = this.buildKey(input.key, input.folder);

        try {
            await this.storage.put({
                key,
                body: input.buffer,
                contentType: input.contentType,
            });
        } catch (error) {
            throw this.toHttpException(error, 'Upload file failed');
        }

        try {
            return await this.persistFileAsset({
                key,
                contentType: input.contentType,
                size: input.buffer.length,
                fileName: input.fileName,
                isPublic: input.isPublic,
            });
        } catch (error) {
            await this.storage.delete(key).catch(() => {});
            throw this.toHttpException(error, 'Save file metadata failed');
        }
    }

    async createPresignedUpload(
        input: PresignUploadInput,
    ): Promise<{ key: string; uploadUrl: string }> {
        const key = this.buildKey(input.key, input.folder);

        try {
            const uploadUrl = await this.storage.createPresignedPutUrl({
                key,
                contentType: input.contentType,
                expiresInSeconds: input.expiresInSeconds,
            });

            return { key, uploadUrl };
        } catch (error) {
            throw this.toHttpException(error, 'Create presigned upload URL failed');
        }
    }

    async confirmPresignedUpload(input: ConfirmUploadInput): Promise<StoredFileResult> {
        try {
            const metadata = await this.storage.head(input.key);

            if (metadata.contentLength <= 0) {
                throw new BadRequestException('Object size is invalid');
            }

            const contentType =
                metadata.contentType ?? input.contentType ?? 'application/octet-stream';

            return await this.persistFileAsset({
                key: input.key,
                contentType,
                size: metadata.contentLength,
                fileName: input.fileName,
                isPublic: input.isPublic,
            });
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }

            if (error instanceof StorageObjectNotFoundError) {
                throw new NotFoundException(error.message);
            }

            throw this.toHttpException(error, 'Confirm presigned upload failed');
        }
    }

    async deleteFile(key: string): Promise<void> {
        try {
            await this.storage.delete(key);
            await this.fileAsset.deleteByBucketKey(this.storage.getBucket(), key);
        } catch (error) {
            throw this.toHttpException(error, 'Delete file failed');
        }
    }

    private async persistFileAsset(input: {
        key: string;
        contentType: string;
        size: number;
        fileName?: string;
        isPublic?: boolean;
    }): Promise<StoredFileResult> {
        const bucket = this.storage.getBucket();
        const url = this.storage.getPublicUrl(input.key);
        const fileName = input.fileName ?? input.key.split('/').pop() ?? input.key;

        const asset = await this.fileAsset.upsertByBucketKey({
            bucket,
            key: input.key,
            fileName,
            mimeType: input.contentType,
            size: input.size,
            url,
            isPublic: input.isPublic,
        });

        return {
            id: asset.id,
            key: asset.key,
            bucket: asset.bucket,
            url: asset.url ?? undefined,
            contentType: asset.mimeType,
            size: asset.size,
        };
    }

    private buildKey(key: string, folder?: string): string {
        const safeKey = key.replace(/^\/+/, '').replace(/\s+/g, '-');
        if (!folder) return safeKey;
        return `${folder.replace(/^\/+|\/+$/g, '')}/${safeKey}`;
    }

    private toHttpException(error: unknown, message: string): InternalServerErrorException {
        if (error instanceof StorageOperationError) {
            return new InternalServerErrorException(`${message}: ${error.message}`);
        }

        if (error instanceof Error) {
            return new InternalServerErrorException(`${message}: ${error.message}`);
        }

        return new InternalServerErrorException(message);
    }
}
