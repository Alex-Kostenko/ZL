import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ErrorsModule } from './common/errors/errors.module';
import { ConfigModule } from './config/config.module';
import { LoggingModule } from './logging/logging.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [ConfigModule, LoggingModule, ErrorsModule, PrismaModule],
  controllers: [AppController],
})
export class AppModule {}
