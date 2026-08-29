import { Controller, Get } from "@nestjs/common"

@Controller("health")
export class HealthController {
  @Get()
  healthCheck() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "kuakua-mirror-service",
    }
  }

  @Get("ping")
  ping() {
    return {
      message: "pong",
      timestamp: new Date().toISOString(),
    }
  }
}
