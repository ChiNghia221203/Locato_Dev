export interface StoredFileResult {
    id: string;
    key: string;
    bucket: string;
    url?: string;
    contentType: string;
    size: number;
}
