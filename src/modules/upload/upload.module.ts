import { Module } from '@nestjs/common';
import { FileAssetModule } from '../file-asset/file-asset.module';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
    imports: [FileAssetModule],
    controllers: [UploadController],
    providers: [UploadService],
})
export class UploadModule {}
