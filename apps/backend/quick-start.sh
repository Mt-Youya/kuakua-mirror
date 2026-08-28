#!/bin/bash

echo "========================================="
echo "夸夸镜后端快速启动脚本"
echo "========================================="
echo ""

# 设置环境变量
export DATABASE_URL=jdbc:h2:mem:kuakua_mirror
export DATABASE_USERNAME=sa
export DATABASE_PASSWORD=
export DATABASE_DRIVER=org.h2.Driver
export HIBERNATE_DIALECT=org.hibernate.dialect.H2Dialect
export JWT_SECRET=default_jwt_secret_for_development_only_at_least_32_characters_long
export WEBSOCKET_ALLOWED_ORIGINS=*
export PORT=8080

# 检查 OPENAI_API_KEY
if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  警告: OPENAI_API_KEY 未设置"
    echo "使用方法: OPENAI_API_KEY=sk-your-key ./quick-start.sh"
    echo ""
    read -p "请输入你的 OpenAI API Key (或按 Enter 跳过): " input_key
    if [ -n "$input_key" ]; then
        export OPENAI_API_KEY="$input_key"
    else
        echo "⚠️  将使用空的 API Key（部分功能将不可用）"
        export OPENAI_API_KEY=""
    fi
fi

echo ""
echo "✅ 配置信息:"
echo "   数据库: H2 内存数据库"
echo "   端口: $PORT"
echo "   OpenAI API Key: ${OPENAI_API_KEY:0:20}..."
echo ""

# 检查 Maven
if command -v mvn &> /dev/null; then
    echo "🚀 使用系统 Maven 启动..."
    echo ""
    mvn spring-boot:run
elif [ -f "./mvnw" ] && [ -f ".mvn/wrapper/maven-wrapper.jar" ]; then
    echo "🚀 使用 Maven Wrapper 启动..."
    echo ""
    ./mvnw spring-boot:run
else
    echo "❌ 错误: 未找到 Maven"
    echo ""
    echo "请先安装 Maven:"
    echo "  brew install maven"
    echo ""
    echo "或者使用 IDE (IntelliJ IDEA) 打开项目并运行 MirrorApplication"
    exit 1
fi
