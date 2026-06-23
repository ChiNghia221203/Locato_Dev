import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { AllConfigType } from '../config/config.type';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor(config: ConfigService<AllConfigType>) {
        const { url } = config.getOrThrow('database', { infer: true });

        super({ datasources: { db: { url } } });
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
