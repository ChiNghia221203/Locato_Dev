import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import databaseConfig from './config/database.config';
import appConfig from './config/app.config';
import storageConfig from './config/storage.config';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
            load: [appConfig, databaseConfig, storageConfig],
        }),
        PrismaModule,
        StorageModule,
    ],
})
export class AppModule {}
