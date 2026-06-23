export interface PutObjectParams {
    key: string;
    body: Buffer;
    contentType: string;
    metadata?: Record<string, string>;
}

export interface ObjectMetadata {
    key: string;
    contentType?: string;
    contentLength: number;
    etag?: string;
    lastModified?: Date;
}

export interface PresignPutParams {
    key: string;
    contentType: string;
    expiresInSeconds?: number;
}
