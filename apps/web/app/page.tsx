import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Product Info */}
            <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                夸夸镜
              </h1>
              <p className="text-2xl md:text-3xl font-semibold mb-6 text-gray-800 dark:text-gray-200">
                AI 情绪支持镜
              </p>

              <div className="space-y-4 text-lg text-gray-600 dark:text-gray-400 mb-8">
                <p>
                  夸夸镜是一款创新的 AI 驱动情绪支持设备，通过温暖的语言和智能交互，为你的日常生活注入正能量。
                </p>
                <p>
                  采用独特的折叠镜面设计，夸夸镜不仅是一面镜子，更是你的情绪伙伴。当你需要鼓励时，它会用真诚的话语为你加油；当你感到疲惫时，它会用温柔的关怀陪伴你。
                </p>
                <p>
                  结合实时监控系统，你可以随时了解设备状态，确保每一次互动都流畅可靠。让 AI 成为你生活中的暖心存在。
                </p>
              </div>

              <Link
                href="/monitor"
                className="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-semibold rounded-full hover:shadow-lg hover:scale-105 transition-all duration-300"
              >
                查看演示 →
              </Link>
            </div>

            {/* Right: Product Visual */}
            <div className="flex justify-center">
              <div className="relative w-full max-w-md aspect-[3/4]">
                {/* Mirror Frame */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-400 dark:from-gray-700 dark:to-gray-900 rounded-[3rem] shadow-2xl">
                  {/* Mirror Surface */}
                  <div className="absolute inset-4 bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100 dark:from-blue-900 dark:via-purple-900 dark:to-pink-900 rounded-[2.5rem] overflow-hidden">
                    {/* Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/40 via-transparent to-transparent animate-pulse"></div>

                    {/* Center Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                      <div className="text-6xl mb-4">✨</div>
                      <p className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                        你真棒！
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        每一天都值得被鼓励
                      </p>
                    </div>
                  </div>

                  {/* Fold Line (optional) */}
                  <div className="absolute top-1/2 left-4 right-4 h-px bg-gray-400/30 dark:bg-gray-600/30"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-800 dark:text-gray-200">
            核心功能
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">
                智能情绪支持
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                AI 驱动的正向反馈，根据你的状态提供个性化鼓励和关怀
              </p>
            </div>

            <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">
                实时设备监控
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                实时查看设备状态、心跳检测、数据可视化，确保稳定运行
              </p>
            </div>

            <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">
                优雅折叠设计
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                创新的折叠镜面造型，兼具实用性和艺术感，融入任何空间
              </p>
            </div>

            <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">🔔</div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">
                智能告警系统
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                设备异常自动告警，历史数据完整记录，随时追溯查询
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gray-800 dark:text-gray-200">
            准备好体验了吗？
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            进入监控页面，实时查看夸夸镜的运行状态
          </p>
          <Link
            href="/monitor"
            className="inline-block px-8 py-4 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-lg font-semibold rounded-full hover:shadow-lg hover:scale-105 transition-all duration-300"
          >
            立即查看 →
          </Link>
        </div>
      </section>
    </div>
  );
}
