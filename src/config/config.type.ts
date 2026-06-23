export type StorageProvider = 'r2' | 's3' | 'minio';

export interface StorageConfig {
    provider: StorageProvider;
    endpoint?: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    publicBaseUrl?: string;
    defaultPublic: boolean;
}

export interface DatabaseConfig {
    url: string;
    directUrl: string;
}

export interface AppConfig {
    port: number;
}

export type AllConfigType = {
    app: AppConfig;
    database: DatabaseConfig;
    storage: StorageConfig;
};
