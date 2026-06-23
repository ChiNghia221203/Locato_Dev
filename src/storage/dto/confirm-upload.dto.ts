import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmUploadDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(1024)
    key!: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    fileName?: string;

    @IsOptional()
    @IsString()
    contentType?: string;

    @IsOptional()
    @IsBoolean()
    isPublic?: boolean;
}
