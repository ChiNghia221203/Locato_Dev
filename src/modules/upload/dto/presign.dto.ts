import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class PresignDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    fileName!: string;

    @IsString()
    @IsNotEmpty()
    contentType!: string;
}
