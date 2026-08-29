# 构建阶段
FROM maven:3.9-eclipse-temurin-21-alpine AS builder

WORKDIR /app

# 复制依赖描述文件
COPY pom.xml .

# 下载依赖（利用 Docker 缓存层）
RUN mvn dependency:go-offline -B

# 复制源代码（包含 src/main/resources/static/openapi.json）
COPY src ./src

# 构建应用
RUN mvn clean package -DskipTests -B

# 运行阶段
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# 创建非 root 用户
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# 从构建阶段复制 jar 文件
COPY --from=builder /app/target/*.jar app.jar

# 暴露端口
EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# 启动应用
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", \
  "app.jar"]
