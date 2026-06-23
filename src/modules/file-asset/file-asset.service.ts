import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AllConfigType } from '../../config/config.type';
import { FileAssetResult, UpsertFileAssetInput } from './file-asset.types';

@Injectable()
export class FileAssetService {
    private readonly defaultIsPublic: boolean;

    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService<AllConfigType>,
    ) {
        this.defaultIsPublic = this.config.getOrThrow('storage', { infer: true }).defaultPublic;
    }

    async upsertByBucketKey(input: UpsertFileAssetInput): Promise<FileAssetResult> {
        const isPublic = input.isPublic ?? this.defaultIsPublic;

        const data = {
            fileName: input.fileName,
            mimeType: input.mimeType,
            size: input.size,
            url: input.url,
            isPublic,
        };

        const existing = await this.prisma.fileAsset.findFirst({
            where: { bucket: input.bucket, key: input.key },
        });

        const asset = existing
            ? await this.prisma.fileAsset.update({
                  where: { id: existing.id },
                  data,
              })
            : await this.prisma.fileAsset.create({
                  data: {
                      ...data,
                      bucket: input.bucket,
                      key: input.key,
                  },
              });

        return asset;
    }

    async findByBucketKey(bucket: string, key: string): Promise<FileAssetResult | null> {
        return this.prisma.fileAsset.findFirst({
            where: { bucket, key },
        });
    }

    async deleteByBucketKey(bucket: string, key: string): Promise<void> {
        await this.prisma.fileAsset.deleteMany({ where: { bucket, key } });
    }
}
