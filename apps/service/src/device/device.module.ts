import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from './entities/device.entity';
import { DeviceService } from './device.service';
import { DeviceController } from './device.controller';
import { DeviceGateway } from './device.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Device])],
  controllers: [DeviceController],
  providers: [DeviceService, DeviceGateway],
  exports: [DeviceService],
})
export class DeviceModule {}
