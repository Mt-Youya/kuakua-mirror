import { Module } from '@nestjs/common';
import { MonitorGateway } from './monitor.gateway';

@Module({
  providers: [MonitorGateway],
  exports: [MonitorGateway],
})
export class MonitorModule {}
