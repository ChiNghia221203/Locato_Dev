export class StorageObjectNotFoundError extends Error {
    constructor(public readonly key: string) {
        super(`Object with key "${key}" not found in storage`);
        this.name = 'StorageObjectNotFoundError';
    }
}

export class StorageOperationError extends Error {
    constructor(
        message: string,
        public readonly cause?: unknown,
    ) {
        super(message);
        this.name = 'StorageOperationError';
    }
}
