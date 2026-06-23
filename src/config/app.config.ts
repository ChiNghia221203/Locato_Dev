import { registerAs } from '@nestjs/config';
import { IsOptional, IsString } from 'class-validator';
import validateConfig from '../utils/validate-config';
import { AppConfig } from './config.type';

class EnvironmentVariablesValidator {
    @IsOptional()
    @IsString()
    PORT?: string;
}

export default registerAs<AppConfig>('app', () => {
    validateConfig(process.env, EnvironmentVariablesValidator);

    return {
        port: Number(process.env.PORT) || 3000,
    };
});
