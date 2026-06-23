import { registerAs } from '@nestjs/config';
import { IsOptional, IsString } from 'class-validator';
import validateConfig from '../utils/validate-config';
import { DatabaseConfig } from './config.type';

class EnvironmentVariablesValidator {
    @IsString()
    DATABASE_URL!: string;

    @IsOptional()
    @IsString()
    DIRECT_URL?: string;
}

export default registerAs<DatabaseConfig>('database', () => {
    validateConfig(process.env, EnvironmentVariablesValidator);

    const url = process.env.DATABASE_URL!;
    // Supabase: DIRECT_URL dùng cho prisma migrate (port 5432). Không set thì dùng chung DATABASE_URL.
    const directUrl = process.env.DIRECT_URL ?? url;

    return {
        url,
        directUrl,
    };
});
