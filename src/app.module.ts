import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import databaseConfig from './config/database.config';
import appConfig from './config/app.config';
import storageConfig from './config/storage.config';
import { FileAssetModule } from './modules/file-asset/file-asset.module';
import { StorageModule } from './modules/storage/storage.module';
import { UploadModule } from './modules/upload/upload.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
            load: [appConfig, databaseConfig, storageConfig],
        }),
        PrismaModule,
        StorageModule,
        FileAssetModule,
        UploadModule,
    ],
})
export class AppModule {}
