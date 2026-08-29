# Frontend - KuaKua Mirror 前端项目

## 项目结构

```
frontend/
├── app/                    # Next.js App Router 目录
│   ├── layout.tsx         # 根布局
│   ├── page.tsx           # 首页
│   ├── globals.css        # 全局样式
│   └── monitor/           # 监控页面
│       └── page.tsx
├── lib/                    # 工具库
│   └── api.ts             # API 封装
├── package.json           # 项目配置
├── tsconfig.json          # TypeScript 配置
├── tailwind.config.ts     # Tailwind CSS 配置
├── postcss.config.js      # PostCSS 配置
├── next.config.ts         # Next.js 配置
└── .eslintrc.json         # ESLint 配置
```

## 技术栈

- **框架**: Next.js 15.0.3 (App Router)
- **语言**: TypeScript 5
- **样式**: Tailwind CSS 3.4
- **包管理**: npm/pnpm

## 安装依赖

```bash
cd frontend
npm install
# 或使用 pnpm
pnpm install
```

## 开发

```bash
npm run dev
```

访问 http://localhost:3000 查看应用。

## 构建

```bash
npm run build
npm run start
```

## 页面说明

### 首页 (`/`)
- 欢迎页面
- 功能特性展示
- 链接到监控页面

### 监控页面 (`/monitor`)
- 显示所有设备状态
- 实时心跳信息
- 设备在线/离线状态

## API 集成

API 封装在 `lib/api.ts`，包含以下模块：

- `deviceApi`: 设备管理相关 API
- `heartbeatApi`: 心跳检测相关 API  
- `dataApi`: 数据上报相关 API

默认 API 地址: `http://localhost:8080/api`

可通过环境变量 `NEXT_PUBLIC_API_BASE_URL` 配置。

## 环境变量

创建 `.env.local` 文件：

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api
```

## 待完成任务

- [ ] 安装 npm 依赖
- [ ] 配置 shadcn/ui (需要先安装依赖)
- [ ] 集成真实后端 API
- [ ] 添加数据可视化组件
- [ ] 添加实时刷新功能
- [ ] 添加错误处理和加载状态

## 配置 shadcn/ui

依赖安装完成后，运行：

```bash
npx shadcn-ui@latest init
```

按提示选择配置选项。
