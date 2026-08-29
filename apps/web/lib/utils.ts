// 简化版的 className 合并工具
export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(" ")
}
