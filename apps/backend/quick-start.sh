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

# macOS 的 /usr/bin/java 可能只是系统占位程序；优先使用已安装的 SDKMAN JDK 21。
if [ -z "${JAVA_HOME:-}" ] && [ -x "$HOME/.sdkman/candidates/java/current/bin/java" ]; then
    export JAVA_HOME="$HOME/.sdkman/candidates/java/current"
fi
if [ -n "${JAVA_HOME:-}" ]; then
    export PATH="$JAVA_HOME/bin:$PATH"
fi

# 检查百炼凭证
if [ -z "$DASHSCOPE_API_KEY" ]; then
    echo "⚠️  DASHSCOPE_API_KEY 未设置，AI 接口不可用"
    echo "请在终端环境中设置后重试。"
fi

echo ""
echo "✅ 配置信息:"
echo "   数据库: H2 内存数据库"
echo "   端口: $PORT"
if [ -n "$DASHSCOPE_API_KEY" ]; then
    echo "   百炼凭证: 已设置"
else
    echo "   百炼凭证: 未设置"
fi
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
