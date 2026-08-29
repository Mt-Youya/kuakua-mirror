import { Controller, Post, Get, Patch, Body, Param } from "@nestjs/common"
import { DeviceService } from "./device.service"
import { RegisterDeviceDto, UpdateDeviceDto } from "./dto/device.dto"

@Controller("devices")
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Post("register")
  async register(@Body() registerDto: RegisterDeviceDto) {
    const device = await this.deviceService.register(registerDto)
    return {
      success: true,
      data: device,
      message: "Device registered successfully",
    }
  }

  @Get(":deviceId")
  async getDevice(@Param("deviceId") deviceId: string) {
    const device = await this.deviceService.findByDeviceId(deviceId)
    return {
      success: true,
      data: device,
    }
  }

  @Patch(":deviceId")
  async updateDevice(@Param("deviceId") deviceId: string, @Body() updateDto: UpdateDeviceDto) {
    const device = await this.deviceService.update(deviceId, updateDto)
    return {
      success: true,
      data: device,
      message: "Device updated successfully",
    }
  }

  @Get()
  async getAllDevices() {
    const devices = await this.deviceService.findAll()
    return {
      success: true,
      data: devices,
    }
  }
}
