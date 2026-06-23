import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllConfigType } from './config/config.type';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const logger = new Logger('Bootstrap');
    const configService = app.get(ConfigService<AllConfigType>);

    app.enableShutdownHooks();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
        }),
    );

    const port = configService.getOrThrow('app.port', { infer: true });
    await app.listen(port);
    logger.log(`Server running on http://localhost:${port}`);
}

bootstrap();
