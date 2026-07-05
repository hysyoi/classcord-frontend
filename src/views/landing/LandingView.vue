<template>
  <div class="landing-container text-[#dbdee1]">
    <!-- Navbar -->
    <header
      class="navbar flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[var(--bg-black)]/80 backdrop-blur-md sticky top-0 z-50"
    >
      <div
        class="logo flex items-center gap-2 cursor-pointer"
        @click="router.push('/')"
      >
        <span
          class="text-2xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent"
        >
          ClassCord
        </span>
      </div>
      <nav
        class="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300"
      >
        <a href="#features" class="hover:text-white transition">特色功能</a>
        <a href="#about" class="hover:text-white transition">關於我們</a>
        <a
          href="https://github.com/hysyoi"
          target="_blank"
          class="hover:text-white transition"
          >GitHub</a
        >
      </nav>
      <div>
        <button
          @click="handleActionClick"
          class="nav-btn bg-white text-black font-semibold px-5 py-2 rounded-full text-sm hover:bg-slate-200 transition cursor-pointer"
        >
          {{ authStore.isAuthenticated ? "開啟 ClassCord" : "登入" }}
        </button>
      </div>
    </header>

    <!-- Hero Section -->
    <section
      class="hero flex flex-col items-center justify-center text-center px-6 py-24 md:py-32 relative overflow-hidden"
    >
      <!-- Background glowing orb -->
      <div
        class="glowing-orb absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none"
      ></div>

      <div class="max-w-3xl space-y-6 relative z-10">
        <h1
          class="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight"
        >
          讓課堂學習，如
          <span
            class="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent"
          >
            即時交流
          </span>
          般簡單流暢
        </h1>
        <p
          class="text-slate-400 md:text-lg max-w-xl mx-auto font-light leading-relaxed"
        >
          ClassCord 是一款專為師生打造的課堂討論平台。結合 Discord
          般即時頻道聊天、智慧 AI
          助教、線上測驗與教材管理，讓學習打破教室的邊界。
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <button
            @click="handleActionClick"
            class="cta-primary-btn bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3.5 rounded-full text-base transition shadow-lg shadow-indigo-500/20 cursor-pointer"
          >
            {{
              authStore.isAuthenticated
                ? "開啟網頁版 ClassCord"
                : "進入 ClassCord 聊天室"
            }}
          </button>
          <a
            href="#features"
            class="cta-secondary-btn border border-slate-700 hover:bg-white/5 text-slate-300 hover:text-white font-medium px-8 py-3.5 rounded-full text-base transition flex items-center justify-center gap-2"
          >
            探索特色功能 ↓
          </a>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section
      id="features"
      class="features px-6 py-20 bg-[var(--bg-darkest)]/50 border-t border-white/5"
    >
      <div class="max-w-6xl mx-auto space-y-12">
        <div class="text-center space-y-3">
          <h2 class="text-2xl md:text-4xl font-extrabold">
            為現代學習量身打造的平台
          </h2>
          <p class="text-slate-400 text-sm max-w-md mx-auto">
            整合即時交談與強大課堂管理，這就是您在尋找的 ClassCord。
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            class="feature-card border border-white/5 bg-[var(--bg-darker)]/40 backdrop-blur-sm p-6 rounded-2xl hover:border-indigo-500/30 transition-all duration-300 hover:-translate-y-1 group"
          >
            <div
              class="icon-box text-2xl text-indigo-400 mb-4 bg-indigo-500/10 w-12 h-12 flex items-center justify-center rounded-xl group-hover:scale-110 transition"
            >
              💬
            </div>
            <h3 class="text-lg font-bold mb-2">即時頻道討論</h3>
            <p class="text-slate-400 text-xs leading-relaxed">
              自訂不同的課程分組與作業討論頻道，資訊井然有序，訊息隨時即時更新。
            </p>
          </div>

          <div
            class="feature-card border border-white/5 bg-[var(--bg-darker)]/40 backdrop-blur-sm p-6 rounded-2xl hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-1 group"
          >
            <div
              class="icon-box text-2xl text-blue-400 mb-4 bg-blue-500/10 w-12 h-12 flex items-center justify-center rounded-xl group-hover:scale-110 transition"
            >
              🤖
            </div>
            <h3 class="text-lg font-bold mb-2">智慧 AI 助教</h3>
            <p class="text-slate-400 text-xs leading-relaxed">
              內建 Google Gemini 提供 24
              小時線上回覆，自動分析教材，解答學生各種課後難題。
            </p>
          </div>

          <div
            class="feature-card border border-white/5 bg-[var(--bg-darker)]/40 backdrop-blur-sm p-6 rounded-2xl hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-1 group"
          >
            <div
              class="icon-box text-2xl text-purple-400 mb-4 bg-purple-500/10 w-12 h-12 flex items-center justify-center rounded-xl group-hover:scale-110 transition"
            >
              📝
            </div>
            <h3 class="text-lg font-bold mb-2">隨堂線上測驗</h3>
            <p class="text-slate-400 text-xs leading-relaxed">
              即時提交隨堂考與練習題，系統自動對答案並給予 AI 解析回饋。
            </p>
          </div>

          <div
            class="feature-card border border-white/5 bg-[var(--bg-darker)]/40 backdrop-blur-sm p-6 rounded-2xl hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-1 group"
          >
            <div
              class="icon-box text-2xl text-emerald-400 mb-4 bg-emerald-500/10 w-12 h-12 flex items-center justify-center rounded-xl group-hover:scale-110 transition"
            >
              📂
            </div>
            <h3 class="text-lg font-bold mb-2">教材與檔案共享</h3>
            <p class="text-slate-400 text-xs leading-relaxed">
              支援 S3 雲端儲存，輕鬆上傳與分享教材簡報、PDF 或錄影資源。
            </p>
          </div>

          <div
            class="feature-card border border-white/5 bg-[var(--bg-darker)]/40 backdrop-blur-sm p-6 rounded-2xl hover:border-amber-500/30 transition-all duration-300 hover:-translate-y-1 group"
          >
            <div
              class="icon-box text-2xl text-amber-400 mb-4 bg-amber-500/10 w-12 h-12 flex items-center justify-center rounded-xl group-hover:scale-110 transition"
            >
              📊
            </div>
            <h3 class="text-lg font-bold mb-2">錯題分佈統計</h3>
            <p class="text-slate-400 text-xs leading-relaxed">
              視覺化展示班級測驗的錯題率與選項分佈比例，幫助老師精準捕捉學生的學習盲點，因材施教。
            </p>
          </div>

          <div
            class="feature-card border border-white/5 bg-[var(--bg-darker)]/40 backdrop-blur-sm p-6 rounded-2xl hover:border-rose-500/30 transition-all duration-300 hover:-translate-y-1 group"
          >
            <div
              class="icon-box text-2xl text-rose-400 mb-4 bg-rose-500/10 w-12 h-12 flex items-center justify-center rounded-xl group-hover:scale-110 transition"
            >
              💡
            </div>
            <h3 class="text-lg font-bold mb-2">學生疑問焦點分析</h3>
            <p class="text-slate-400 text-xs leading-relaxed">
              智慧分析聊天頻道中的學生提問，由 AI
              自動提煉核心疑問焦點報告，教師一鍵掌握學生痛點。
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer
      id="about"
      class="px-6 py-12 border-t border-white/5 bg-[var(--bg-black)] text-center text-slate-500 text-xs space-y-2"
    >
      <p>© 2026 ClassCord. All Rights Reserved.</p>
      <p class="text-slate-600 font-light">
        讓學習變得更有趣、交流更簡單的智慧線上課堂
      </p>
    </footer>
  </div>
</template>

<script lang="ts" setup>
import { useRouter } from "vue-router";
import { useAuthStore } from "@/store/useAuthStore";

const router = useRouter();
const authStore = useAuthStore();

const handleActionClick = () => {
  if (authStore.isAuthenticated) {
    router.push("/channels/@me");
  } else {
    router.push("/login");
  }
};
</script>

<style scoped>
.landing-container {
  width: 100%;
  height: 100%;
  background-color: var(--bg-black);
  overflow-x: hidden;
  overflow-y: auto;
}

.navbar {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.glowing-orb {
  animation: floatOrb 10s ease-in-out infinite alternate;
}

@keyframes floatOrb {
  0% {
    transform: translate(-50%, 0px) scale(1);
  }
  100% {
    transform: translate(-50%, -20px) scale(1.1);
  }
}
</style>
