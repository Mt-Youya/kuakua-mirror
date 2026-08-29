import { IsNotEmpty, IsString, IsOptional, MaxLength } from "class-validator"

export class RegisterDeviceDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  deviceId: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceName?: string

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  deviceType: string

  @IsOptional()
  @IsString()
  @MaxLength(17)
  macAddress?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  firmwareVersion?: string
}

export class UpdateDeviceDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceName?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  firmwareVersion?: string
}
