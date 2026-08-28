import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceModule } from './device/device.module';
import { AudioModule } from './audio/audio.module';
import { ConversationModule } from './conversation/conversation.module';
import { AiModule } from './ai/ai.module';
import { MonitorModule } from './monitor/monitor.module';
import { HealthController } from './shared/controllers/health.controller';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 数据库模块
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DATABASE_PATH || 'data/kuakua-mirror.db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),

    // 业务模块
    DeviceModule,
    AudioModule,
    ConversationModule,
    AiModule,
    MonitorModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
