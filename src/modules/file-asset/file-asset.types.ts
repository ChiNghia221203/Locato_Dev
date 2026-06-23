export interface UpsertFileAssetInput {
    bucket: string;
    key: string;
    fileName: string;
    mimeType: string;
    size: number;
    url?: string;
    isPublic?: boolean;
}

export interface FileAssetResult {
    id: string;
    bucket: string;
    key: string;
    fileName: string;
    mimeType: string;
    size: number;
    url?: string | null;
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
}
