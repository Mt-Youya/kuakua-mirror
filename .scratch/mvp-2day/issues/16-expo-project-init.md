# 16: Expo 项目初始化

**What to build:** 创建 Expo 项目（目录名：`mobile/`），配置 TypeScript、React Navigation。创建基本的导航结构和聊天界面骨架。

**Blocked by:** 无（可立即开始）

**Status:** ready-for-agent

**Acceptance criteria:**

- [ ] 运行 `npx create-expo-app mobile --template` 创建项目（选择 blank-typescript）
- [ ] 安装 React Navigation：`npm install @react-navigation/native @react-navigation/native-stack`
- [ ] 安装依赖：`npx expo install react-native-screens react-native-safe-area-context`
- [ ] 创建 `screens/ChatScreen.tsx` 聊天界面
- [ ] 配置导航（单屏 APP，直接显示聊天界面）
- [ ] 运行 `npx expo start`，使用 Expo Go 扫码能打开 APP
- [ ] 看到基本的空白聊天界面
