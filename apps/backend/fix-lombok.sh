#!/bin/bash

# 夸夸镜后端编译错误批量修复脚本
# 此脚本将修复所有 Lombok 相关的编译错误

echo "开始修复后端编译错误..."

BACKEND_DIR="/Users/yonjay/codes/hubs/kuakua-mirror/apps/backend/src/main/java/com/kuakua/mirror"

# 1. 为所有缺少 @Slf4j 的类添加注解
echo "1. 添加 @Slf4j 注解..."

FILES_NEED_SLF4J=(
    "ai/infra/OpenAIService.java"
    "ai/infra/OpenAIRealtimeService.java"
    "audio/api/AudioWebSocketHandler.java"
    "conversation/api/ConversationController.java"
    "monitor/service/MonitorEventService.java"
)

for file in "${FILES_NEED_SLF4J[@]}"; do
    FILE_PATH="$BACKEND_DIR/$file"
    if [ -f "$FILE_PATH" ]; then
        # 检查是否已有 @Slf4j
        if ! grep -q "@Slf4j" "$FILE_PATH"; then
            # 在 package 声明后添加 import
            if ! grep -q "import lombok.extern.slf4j.Slf4j;" "$FILE_PATH"; then
                sed -i '' '/^package /a\
\
import lombok.extern.slf4j.Slf4j;
' "$FILE_PATH"
            fi

            # 在类声明前添加 @Slf4j
            sed -i '' '/^public class\|^@RestController\|^@Service\|^@Component/i\
@Slf4j
' "$FILE_PATH"

            echo "  ✓ 已为 $file 添加 @Slf4j"
        else
            echo "  - $file 已有 @Slf4j，跳过"
        fi
    else
        echo "  ✗ 文件不存在: $file"
    fi
done

echo ""
echo "修复完成！请在 IntelliJ IDEA 中："
echo "1. 点击 文件 → 使现有源代码无效并重启"
echo "2. 或者点击 构建 → 重新构建项目"
echo ""
echo "然后重新运行: mvn clean compile"
