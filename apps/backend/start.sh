#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== KuaKua Mirror Backend 启动脚本 ===${NC}\n"

# macOS 的 /usr/bin/java 可能只是系统占位程序；优先使用已安装的 SDKMAN JDK 21。
if [ -z "${JAVA_HOME:-}" ] && [ -x "$HOME/.sdkman/candidates/java/current/bin/java" ]; then
    export JAVA_HOME="$HOME/.sdkman/candidates/java/current"
fi
if [ -n "${JAVA_HOME:-}" ]; then
    export PATH="$JAVA_HOME/bin:$PATH"
fi

# 检查百炼配置
if [ -z "$DASHSCOPE_API_KEY" ]; then
    echo -e "${YELLOW}警告: DASHSCOPE_API_KEY 环境变量未设置，AI 接口不可用${NC}"
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
if ! command -v mvn &> /dev/null; then
    echo -e "${RED}错误: 未找到 Maven，请确保已安装 Maven${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Maven 就绪${NC}\n"

# 清理并编译
echo -e "${GREEN}开始编译项目...${NC}"
mvn clean compile
if [ $? -ne 0 ]; then
    echo -e "${RED}编译失败${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 编译成功${NC}\n"

# 启动应用
echo -e "${GREEN}启动应用...${NC}"
echo -e "${YELLOW}访问地址: http://localhost:8080${NC}"
echo -e "${YELLOW}健康检查: http://localhost:8080/api/health${NC}"
echo -e "${YELLOW}K10 文档: ../../docs/API_SPECIFICATION.md${NC}\n"

mvn spring-boot:run
