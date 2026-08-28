import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from './entities/device.entity';
import { RegisterDeviceDto, UpdateDeviceDto } from './dto/device.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DeviceService {
  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
  ) {}

  async register(registerDto: RegisterDeviceDto): Promise<Device> {
    const existingDevice = await this.deviceRepository.findOne({
      where: { deviceId: registerDto.deviceId },
    });

    if (existingDevice) {
      // 更新现有设备
      existingDevice.deviceName = registerDto.deviceName || existingDevice.deviceName;
      existingDevice.deviceType = registerDto.deviceType;
      existingDevice.macAddress = registerDto.macAddress || existingDevice.macAddress;
      existingDevice.firmwareVersion = registerDto.firmwareVersion || existingDevice.firmwareVersion;
      existingDevice.isOnline = true;
      existingDevice.lastSeenAt = new Date();
      return this.deviceRepository.save(existingDevice);
    }

    // 创建新设备
    const device = this.deviceRepository.create({
      ...registerDto,
      isOnline: true,
      lastSeenAt: new Date(),
    });

    return this.deviceRepository.save(device);
  }

  async findByDeviceId(deviceId: string): Promise<Device> {
    const device = await this.deviceRepository.findOne({
      where: { deviceId },
    });

    if (!device) {
      throw new NotFoundException(`Device with ID ${deviceId} not found`);
    }

    return device;
  }

  async update(deviceId: string, updateDto: UpdateDeviceDto): Promise<Device> {
    const device = await this.findByDeviceId(deviceId);

    if (updateDto.deviceName) {
      device.deviceName = updateDto.deviceName;
    }

    if (updateDto.firmwareVersion) {
      device.firmwareVersion = updateDto.firmwareVersion;
    }

    return this.deviceRepository.save(device);
  }

  async updateOnlineStatus(deviceId: string, isOnline: boolean): Promise<void> {
    await this.deviceRepository.update(
      { deviceId },
      { isOnline, lastSeenAt: new Date() },
    );
  }

  async findAll(): Promise<Device[]> {
    return this.deviceRepository.find({
      order: { createdAt: 'DESC' },
    });
  }
}
