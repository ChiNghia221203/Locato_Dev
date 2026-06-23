import {
    BadRequestException,
    Body,
    Controller,
    Post,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { PresignDto } from './dto/presign.dto';
import { UploadService } from './upload.service';

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

@Controller('storage')
export class UploadController {
    constructor(private readonly uploadService: UploadService) {}

    @Post('upload')
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_SIZE } }))
    async upload(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('File is required');
        }

        return this.uploadService.uploadFile({
            buffer: file.buffer,
            key: `${Date.now()}-${file.originalname}`,
            folder: 'uploads',
            contentType: file.mimetype,
            fileName: file.originalname,
        });
    }

    @Post('presign')
    async presign(@Body() body: PresignDto) {
        return this.uploadService.createPresignedUpload({
            key: `${Date.now()}-${body.fileName}`,
            folder: 'uploads',
            contentType: body.contentType,
            expiresInSeconds: 300,
        });
    }

    @Post('confirm')
    async confirm(@Body() body: ConfirmUploadDto) {
        return this.uploadService.confirmPresignedUpload({
            key: body.key,
            fileName: body.fileName,
            contentType: body.contentType,
            isPublic: body.isPublic,
        });
    }
}
