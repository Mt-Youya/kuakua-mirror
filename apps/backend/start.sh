#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== KuaKua Mirror Backend 启动脚本 ===${NC}\n"

# 检查 OPENAI_API_KEY
if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${YELLOW}警告: OPENAI_API_KEY 环境变量未设置${NC}"
    echo -e "请设置: export OPENAI_API_KEY=your_api_key\n"
fi

# 检查 Java 版本
echo -e "${GREEN}检查 Java 版本...${NC}"
if ! command -v java &> /dev/null; then
    echo -e "${RED}错误: 未找到 Java，请安装 JDK 21+${NC}"
    exit 1
fi

JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d'.' -f1)
if [ "$JAVA_VERSION" -lt 21 ]; then
    echo -e "${RED}错误: Java 版本过低，需要 JDK 21+，当前版本: $JAVA_VERSION${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Java 版本检查通过${NC}\n"

# 检查 Maven
echo -e "${GREEN}检查 Maven...${NC}"
if [ ! -f "./mvnw" ]; then
    echo -e "${RED}错误: 未找到 mvnw，请确保在项目根目录下运行${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Maven wrapper 就绪${NC}\n"

# 清理并编译
echo -e "${GREEN}开始编译项目...${NC}"
./mvnw clean compile
if [ $? -ne 0 ]; then
    echo -e "${RED}编译失败${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 编译成功${NC}\n"

# 启动应用
echo -e "${GREEN}启动应用...${NC}"
echo -e "${YELLOW}访问地址: http://localhost:8080${NC}"
echo -e "${YELLOW}健康检查: http://localhost:8080/api/health${NC}"
echo -e "${YELLOW}WebSocket: ws://localhost:8080/v1/realtime${NC}\n"

./mvnw spring-boot:run
