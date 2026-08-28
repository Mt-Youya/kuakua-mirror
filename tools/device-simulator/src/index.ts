import { DeviceSimulator } from "./simulator";

/**
 * 设备模拟器入口
 */
async function main() {
  console.log("╔════════════════════════════════════════╗");
  console.log("║   KuaKua Mirror Device Simulator      ║");
  console.log("║   v1.0.0                               ║");
  console.log("╚════════════════════════════════════════╝\n");

  // 从环境变量或使用默认值
  const config = {
    backendUrl: process.env.BACKEND_URL || "http://localhost:8080",
    deviceId: process.env.DEVICE_ID || "mirror-simulator-001",
    activationCode: process.env.ACTIVATION_CODE || "ABC123",
    firmwareVersion: "simulator-v1.0.0",
    model: "kuakua-mirror-simulator",
    serialNumber: "SIM-" + Date.now(),
    macAddress: "AA:BB:CC:DD:EE:FF",
  };

  const simulator = new DeviceSimulator(config);

  // 优雅退出
  process.on("SIGINT", () => {
    console.log("\n\n⚠️  收到退出信号 (Ctrl+C)");
    simulator.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\n\n⚠️  收到退出信号 (SIGTERM)");
    simulator.stop();
    process.exit(0);
  });

  try {
    await simulator.start();

    console.log("\n✅ 模拟器运行中...");
    console.log("   按 Ctrl+C 停止\n");
  } catch (error: any) {
    console.error("\n❌ 模拟器启动失败:", error.message);
    process.exit(1);
  }
}

// 运行
main().catch((error) => {
  console.error("💥 未捕获的错误:", error);
  process.exit(1);
});
