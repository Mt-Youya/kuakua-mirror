import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { ValidationPipe } from "@nestjs/common"
import { WsAdapter } from "@nestjs/platform-ws"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // 启用全局验证
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  )

  // 启用 CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })

  // 使用 WebSocket 适配器
  app.useWebSocketAdapter(new WsAdapter(app))

  // 设置全局 API 版本前缀
  app.setGlobalPrefix("api/v1", {
    exclude: ["api/health", "api/version"],
  })

  const port = process.env.PORT || 5090
  await app.listen(port)

  console.log(`🚀 Application is running on: http://localhost:${port}`)
}

bootstrap()
