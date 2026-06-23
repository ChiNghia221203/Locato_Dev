import { registerAs } from '@nestjs/config';
import { IsIn, IsOptional, IsString } from 'class-validator';
import validateConfig from '../utils/validate-config';
import { StorageConfig, StorageProvider } from './config.type';

class EnvironmentVariablesValidator {
    @IsOptional()
    @IsIn(['r2', 's3', 'minio'])
    STORAGE_PROVIDER?: StorageProvider;

    @IsOptional()
    @IsString()
    STORAGE_ENDPOINT?: string;

    @IsOptional()
    @IsString()
    STORAGE_REGION?: string;

    @IsString()
    STORAGE_BUCKET!: string;

    @IsString()
    STORAGE_ACCESS_KEY_ID!: string;

    @IsString()
    STORAGE_SECRET_ACCESS_KEY!: string;

    @IsOptional()
    @IsString()
    STORAGE_PUBLIC_BASE_URL?: string;

    @IsOptional()
    @IsString()
    STORAGE_DEFAULT_PUBLIC?: string;
}

export default registerAs<StorageConfig>('storage', () => {
    validateConfig(process.env, EnvironmentVariablesValidator);

    const provider = (process.env.STORAGE_PROVIDER ?? 'r2') as StorageProvider;
    const endpoint = process.env.STORAGE_ENDPOINT;

    if ((provider === 'r2' || provider === 'minio') && !endpoint) {
        throw new Error(`STORAGE_ENDPOINT is required when STORAGE_PROVIDER=${provider}`);
    }

    const defaultRegion =
        provider === 'r2' ? 'auto' : provider === 'minio' ? 'us-east-1' : 'ap-southeast-1';

    return {
        provider,
        endpoint,
        region: process.env.STORAGE_REGION ?? defaultRegion,
        bucket: process.env.STORAGE_BUCKET!,
        accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
        secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
        publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL,
        defaultPublic: process.env.STORAGE_DEFAULT_PUBLIC === 'true',
    };
});
