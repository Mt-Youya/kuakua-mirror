# 夸夸个性化升级 — 交付与部署指南

> 目标：拍照 → 后端视觉 AI 看图生成独一无二的夸夸 → 板子显示 + 语音念出。
> 本轮改动仅涉及后端两个文件，固件无需改动（已在板端验证链路与 16 字显示/TTS 协议匹配）。

## 1. 改动内容

| 文件 | 改动 |
| --- | --- |
| `src/main/java/com/kuakua/mirror/ai/infra/DashScopeService.java` | 视觉模型 prompt 改为先观察照片中人物的穿着、发型、表情、动作与环境，只给出对这张照片成立的具体夸奖；增加 `temperature(0.9)` 提高多样性（SDK 签名是 `Float`） |
| `src/main/java/com/kuakua/mirror/k10/K10Controller.java` | 新增 `clampPraise()`：夸夸文本兜底截断到 16 个字符，TTS 合成与 complete 事件共用同一文本，保证"屏幕显示 = 语音念出" |

完整 diff 见 `C:\kk-fw-build\praise-personalize.patch`（应用方式见下）。

## 2. 如何把改动带到真实的部署仓库

本机工作副本**不是 git 仓库**（没有 `.git`），且线上服务跑在 Railway（`kuakua-api.cyrusdoyle.me`，Java 服务，Dockerfile 在 `apps/backend/Dockerfile`）。请在有仓库和 Railway 权限的机器上二选一：

**方式 A（推荐，最不容易错）**：把本机这两个已改好的文件整体覆盖到仓库：
- `apps/backend/src/main/java/com/kuakua/mirror/ai/infra/DashScopeService.java`
- `apps/backend/src/main/java/com/kuakua/mirror/k10/K10Controller.java`

**方式 B（patch）**：在仓库根目录执行
```bash
git apply -p1 --ignore-whitespace praise-personalize.patch
```
（`--ignore-whitespace` 用于跨系统行尾差异，兼容 CRLF/LF。）

## 3. 部署

- Railway：push 到关联的远端分支即触发自动构建部署（Java 21，Maven）。
- 环境变量保持不变：`DASHSCOPE_API_KEY`、`DASHSCOPE_TTS_VOICE` 已在线上服务配置好，无需改动；板子也无需任何改动。

## 4. 部署后验证

1. `curl https://kuakua-api.cyrusdoyle.me/api/health` 应返回 `status: UP` 及新的部署时间。
2. 板子短按 A 拍照：夸夸应从"通用套话"变为具体到照片细节的句子（如提到衣着/表情/场景），且屏幕两行显示的内容与语音念出的完全一致。
3. 同一张照片重复拍，允许出现不同夸夸（temperature=0.9，属正常现象）。

## 5. 测试说明（给工程师）

- 本地验证方法：JDK 21 + Maven，`mvn -q compile` 通过（2026-08-30 已用 jdk-21.0.12.1 + maven-3.9.9 验证）。
- `mvn -q test` 有 6 个失败（`K10ApiControllerTest` 的 Async not started / 500 等）——**经基线对照，原始代码同样失败这 6 个**，属既有环境问题（本地 JDK/测试基建），与本次改动无关，勿被误导。