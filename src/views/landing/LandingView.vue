<template>
  <div class="landing-container">
    <!-- Navbar -->
    <header class="navbar">
      <div class="logo" @click="router.push('/')">
        <img class="logo" src="/favicon-cord-type1.svg" alt="" />
        <span class="logo-text"> Classcord </span>
      </div>
      <div class="navbar-items">
        <nav class="nav-links">
          <a href="#features">特色功能</a>
          <!-- <a href="#about">關於我們</a> -->
          <a href="https://docs-classcord.hys-lab.com/" target="_blank"
            >技術文件</a
          >
          <a href="https://github.com/hysyoi/classcord-backend" target="_blank"
            >GitHub</a
          >
        </nav>
        <div>
          <button @click="handleActionClick" class="nav-btn">
            {{ authStore.isAuthenticated ? " 開啟 " : " 進入 " }}
          </button>
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="hero">
      <!-- Background glowing orb -->
      <div class="glowing-orb"></div>
      <div class="announce">
        #1 生成Anki記憶卡片功能即將上線！─ 敬請期待。
        <BorderBeam
          :size="200"
          :height="18"
          :duration="20"
          :border-width="0.5"
          :glow="3"
          color-from="#fff"
          color-to="#353a50e6"
        />
      </div>

      <div class="hero-content">
        <div class="hero-content-inner">
          <div class="hero-text">
            <h1 class="hero-title">
              <template v-for="(seg, i) in renderedTitleSegments" :key="i">
                <br v-if="seg.type === 'br' && seg.reached" />
                <span
                  v-else-if="seg.type === 'gradient'"
                  :class="heroTitleAccentClass"
                  >{{ seg.visible }}</span
                >
                <template v-else-if="seg.type === 'text'">{{
                  seg.visible
                }}</template>
              </template>
              <span
                class="typing-cursor"
                :class="{ 'is-blinking': isTitleTypingDone }"
              ></span>
            </h1>
            <p class="hero-desc">
              Classcord 是一款 AI 驅動的社群學習網路應用。
            </p>
          </div>
          <div class="hero-media">
            <Skeleton v-if="!heroVideoLoaded" class="media-skeleton" />
            <video
              src="https://cdn-classcord.hys-lab.com/page_intro_02.mp4"
              muted
              loop
              playsinline
              class="media-video"
              :class="{ 'media-video--hidden': !heroVideoLoaded }"
              @loadeddata="onHeroVideoReady"
            ></video>
          </div>
        </div>
        <div class="hero-actions">
          <a href="#features" class="cta-secondary-btn"> 探索特色功能 </a>
          <button @click="handleActionClick" class="cta-primary-btn">
            {{
              authStore.isAuthenticated ? "開啟 ClassCord" : "進入 ClassCord"
            }}
          </button>
        </div>
      </div>
    </section>

    <!-- Features Section (Discord 風格：一張張卡片直接呈現) -->
    <section id="features" class="features">
      <div class="features-inner">
        <!-- <div class="features-header">
          <h2>為現代學習量身打造的平台</h2>
          <p>整合即時交談與強大課堂管理，這就是您在尋找的 ClassCord。</p>
        </div> -->

        <div class="feature-rows">
          <svg
            class="feature-rows-line"
            viewBox="0 0 100 700"
            preserveAspectRatio="none"
            fill="none"
          >
            <defs>
              <!-- #353a50 -->
              <linearGradient
                id="featureLineGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stop-color="#ff879a" />
                <stop offset="17%" stop-color="#ffffff" />
                <stop offset="33%" stop-color="#365bff" />
                <stop offset="50%" stop-color="#ffffff" />
                <stop offset="67%" stop-color="#ff879a" />
                <stop offset="83%" stop-color="#ffffff" />
                <stop offset="100%" stop-color="#365bff" />
              </linearGradient>
            </defs>
            <path
              d="M30,50 C30,83 70,117 70,150 C70,183 30,217 30,250 C30,283 70,317 70,350 C70,383 30,417 30,450 C30,483 70,517 70,550 C70,583 30,617 30,650"
              stroke="url(#featureLineGradient)"
              stroke-width="0.6"
              stroke-linecap="round"
            />
          </svg>
          <div
            v-for="(item, index) in features"
            :key="item.title"
            class="feature-row"
            :class="{ 'feature-row--reverse': index % 2 === 0 }"
          >
            <div class="feature-row-text">
              <!--<div class="icon-box" :class="`icon-box--${item.color}`">{{ item.icon }}</div>-->
              <h3>{{ item.title }}</h3>
              <p>{{ item.desc }}</p>
            </div>
            <div
              class="feature-row-media"
              :style="
                featureVideoRatio[index]
                  ? { aspectRatio: String(featureVideoRatio[index]) }
                  : undefined
              "
            >
              <Skeleton
                v-if="!featureVideoLoaded[index]"
                class="media-skeleton"
              />
              <video
                :src="item.video"
                muted
                loop
                playsinline
                class="media-video"
                :class="{ 'media-video--hidden': !featureVideoLoaded[index] }"
                @loadedmetadata="onFeatureVideoMeta($event, index)"
                @loadeddata="onFeatureVideoReady($event, index)"
              ></video>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer id="about" class="footer">
      <p>© 2026 ClassCord. All Rights Reserved.</p>
      <p class="footer-subtext">讓學習變得更有趣、交流更簡單的智慧線上課堂</p>
    </footer>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/store/useAuthStore";
import { BorderBeam } from "@/components/ui/border-beam";
import { Skeleton } from "@/components/ui/skeleton";
import { afterSkeletonDelay } from "@/lib/debug";

const router = useRouter();
const authStore = useAuthStore();

// Hero 標題「即時交流」的強調樣式：改這個值就能切換兩種效果
// - "gradient"：原本的漸層文字填色
// - "highlight"：新的螢光筆畫線效果
const HERO_TITLE_ACCENT_STYLE: "gradient" | "highlight" = "gradient";
const heroTitleAccentClass =
  HERO_TITLE_ACCENT_STYLE === "gradient"
    ? "hero-title-gradient"
    : "hero-title-highlight";

// Hero 標題打字機效果
const titleSegments = [
  { type: "text", text: "學習，" },
  { type: "br" },
  { type: "text", text: "如 " },
  { type: "gradient", text: "即時交流" },
  { type: "text", text: " 般" },
  { type: "br" },
  { type: "text", text: "簡單流暢" },
] as const;

const titleTotalChars = titleSegments.reduce(
  (sum, seg) => sum + ("text" in seg ? seg.text.length : 0),
  0,
);

const typedCharCount = ref(0);
const isTitleTypingDone = computed(
  () => typedCharCount.value >= titleTotalChars,
);

const renderedTitleSegments = computed(() => {
  let offset = 0;
  return titleSegments.map((seg) => {
    if (seg.type === "br") {
      return { type: "br" as const, reached: offset <= typedCharCount.value };
    }
    const start = offset;
    offset += seg.text.length;
    const visibleLen = Math.max(
      0,
      Math.min(seg.text.length, typedCharCount.value - start),
    );
    return { type: seg.type, visible: seg.text.slice(0, visibleLen) };
  });
});

let typingTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  typingTimer = setInterval(() => {
    if (typedCharCount.value >= titleTotalChars) {
      if (typingTimer) clearInterval(typingTimer);
      return;
    }
    typedCharCount.value++;
  }, 90);
});

onBeforeUnmount(() => {
  if (typingTimer) clearInterval(typingTimer);
});

const handleActionClick = () => {
  if (authStore.isAuthenticated) {
    router.push("/channels/@me");
  } else {
    router.push("/login");
  }
};

// Features 區塊卡片資料
const features = [
  {
    color: "indigo",
    icon: "💬",
    title: "群組聊天",
    desc: "自訂不同的課程分組與作業討論頻道，資訊井然有序，訊息隨時即時更新。",
    video: "https://cdn-classcord.hys-lab.com/group_chat.mp4",
  },
  {
    color: "blue",
    icon: "🤖",
    title: "AI 助教",
    desc: "內建 Google Gemini 提供 24 小時線上回覆，自動分析教材，解答學生各種課後難題。",
    video: "https://cdn-classcord.hys-lab.com/ai.mp4",
  },
  {
    color: "purple",
    icon: "📝",
    title: "生成題目",
    desc: "上傳教材後，AI 自動分析內容並生成對應的練習題目，省去老師手動出題的時間。",
    video: "https://cdn-classcord.hys-lab.com/generate_quiz.mp4",
  },
  {
    color: "emerald",
    icon: "📋",
    title: "即時測驗",
    desc: "學生可即時進入測驗作答，系統同步計時與收卷，讓老師隨時掌握班級即時作答狀況。",
    video: "https://cdn-classcord.hys-lab.com/start_quiz.mp4",
  },
  {
    color: "amber",
    icon: "📜",
    title: "測驗紀錄",
    desc: "完整保存每一次測驗成績與作答明細，老師與學生都能隨時回顧歷史表現。",
    video: "https://cdn-classcord.hys-lab.com/score.mp4",
  },
  {
    color: "rose",
    icon: "📊",
    title: "班級錯題分析",
    desc: "視覺化展示班級測驗的錯題率與選項分佈比例，幫助老師精準捕捉學生的學習盲點，因材施教。",
    video: "https://cdn-classcord.hys-lab.com/quiz_analysis.mp4",
  },
  {
    color: "cyan",
    icon: "💡",
    title: "班級焦點報告",
    desc: "智慧統計學生提問，由 AI 自動提煉核心疑問焦點報告，教師一鍵掌握學生痛點。",
    video: "https://cdn-classcord.hys-lab.com/students_analysis.mp4",
  },
];

// Vue 的 `muted` 樣板屬性不會可靠地反映到 <video> 的實際 DOM 屬性上，
// 導致 Chrome 判定影片其實沒有靜音而在自動播放數秒後強制暫停。
// 改成等 loadeddata 事件（瀏覽器真的準備好可播放）才手動設定 muted + 呼叫 play()。
const onVideoReady = (e: Event) => {
  const el = e.target as HTMLVideoElement;
  el.muted = true;
  el.play().catch(() => {});
};

// 影片載入前用 Skeleton 佔位，loadeddata 觸發後才淡入影片本身
const heroVideoLoaded = ref(false);
const featureVideoLoaded = ref(features.map(() => false));

// loadedmetadata 比 loadeddata 更早觸發，此時已知影片真實尺寸，
// 用來即時校正容器比例，避免用固定 16:9 裁切到非 16:9 的影片內容。
const featureVideoRatio = ref<(number | null)[]>(features.map(() => null));

const onHeroVideoReady = (e: Event) => {
  onVideoReady(e);
  afterSkeletonDelay(() => {
    heroVideoLoaded.value = true;
  });
};

const onFeatureVideoMeta = (e: Event, index: number) => {
  const el = e.target as HTMLVideoElement;
  if (el.videoWidth && el.videoHeight) {
    featureVideoRatio.value[index] = el.videoWidth / el.videoHeight;
  }
};

const onFeatureVideoReady = (e: Event, index: number) => {
  onVideoReady(e);
  afterSkeletonDelay(() => {
    featureVideoLoaded.value[index] = true;
  });
};
</script>

<style scoped>
.landing-container {
  width: 100%;
  height: 100%;
  background-color: var(--bg-surface-dark);
  color: #ffffff;
  overflow-x: hidden;
  overflow-y: auto;
}

/* Navbar */
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 9.2rem;
  /*border-bottom: 1px solid rgba(255, 255, 255, 0.05);*/
  /*background-color: rgba(0, 0, 0, 0.8);*/
  background: linear-gradient(
    to bottom,
    var(--bg-surface-dark) 0%,
    transparent 100%
  );
  /*backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);*/
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

@font-face {
  font-family: "Round Pop";
  src: url("@/assets/RoundPop.ttf") format("truetype");
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

.logo-text {
  font-family: "Round Pop", sans-serif;
  font-size: 1.3rem;
  font-weight: 800;
  /*background: linear-gradient(to right, #60a5fa, #818cf8);*/
  background: #ffffff;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.nav-links {
  display: none;
  align-items: center;
  /*gap: 2rem;*/
  font-size: 1rem;
  font-weight: 500;
  color: #ffffff;
}

.nav-links a {
  color: inherit;
  text-decoration: none;
  transition: color 0.15s ease;
  padding: 10px 16px;
  border-radius: 14px;
}

.nav-links a:hover {
  color: #fff;
  background-color: var(--bg-surface-hover);
}

.nav-btn {
  background-color: #fff;
  color: #000;
  font-weight: 600;
  padding: 10px 16px;
  border-radius: 24px;
  font-size: 1rem;
  border: none;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.nav-btn:hover {
  background-color: #e2e8f0;
}

.navbar-items {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Hero */
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 10rem 1.5rem 6rem 1.5rem;
  position: relative;
  overflow: hidden;
  background-image:
    linear-gradient(
      to bottom,
      rgba(10, 10, 14, 0.5) 0%,
      rgba(10, 10, 14, 1) 50%,
      var(--bg-surface-dark) 100%
    ),
    url("@/assets/hero-bg-mobile.webp");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.announce {
  position: relative;
  color: #ffffff;
  padding: 6px 16px;
  border-radius: 99px;
  border: 1px solid
    color-mix(in srgb, var(--bg-surface-border) 90%, transparent);
  font-size: 0.85rem;
  background-color: color-mix(
    in srgb,
    var(--bg-surface-border) 10%,
    transparent
  );
  margin: 24px 0 56px 0;
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px); /* 舊版 Safari 相容 */
}

.glowing-orb {
  position: absolute;
  top: -10rem;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 300px;
  /*background-color: rgba(99, 102, 241, 0.1);*/
  background-color: color-mix(
    in srgb,
    var(--bg-surface-lighter) 10%,
    transparent
  );
  filter: blur(120px);
  border-radius: 9999px;
  pointer-events: none;
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

.hero-content {
  width: 82%;
  max-width: 110rem;
  display: flex;
  flex-direction: column;
  gap: 5rem;
  position: relative;
  z-index: 10;
}

.hero-content-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rem;
  width: 100%;
}

.hero-text {
  flex: 1;
  min-width: 0;
}

.hero-media {
  position: relative;
  flex: 1.6;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 18px;
  background-color: rgba(255, 255, 255, 0.05);
  /*border: 1px solid rgba(255, 255, 255, 0.08);*/
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: var(--bg-surface-text-muted-dark);
}

.hero-media img,
.hero-media video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 50%;
  display: block;
}

/* 影片載入 Skeleton 佔位 */
.media-skeleton {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background-color: rgba(255, 255, 255, 0.08);
}

.media-video {
  opacity: 1;
  transition: opacity 0.3s ease;
}

.media-video--hidden {
  opacity: 0;
}

.hero-title {
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  line-height: 1.2;
}

.hero-title-gradient {
  /* 原本的漸層文字填色效果 */
  /* #002fff */ /* #365bff */ /* ff879a */
  /*background: linear-gradient(to right, #4a7fd4, #e8548a);*/
  background: linear-gradient(61deg, #1f7afe 0%, #b67fff 70%, #e9505e);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero-title-highlight {
  /* 螢光筆效果：色塊蓋住整個字高，文字本身半透明讓顏色透出來，
     製造「螢光筆蓋在文字上」而不是「色塊只在文字底下」的感覺 */
  /* rgba(255, 135, 154, 1) */ /* rgb(0 46 255), */
  background-image: linear-gradient(to right, rgb(36 40 56), rgb(0 46 255));
  color: rgba(255, 255, 255, 0.88);
  background-repeat: no-repeat;
  background-size: 100% 0.85em;
  background-position: 0 55%;
  padding: 0 0.06em;
}

.typing-cursor {
  display: inline-block;
  width: 0.06em;
  height: 0.9em;
  margin-left: 0.05em;
  background-color: #ffffff;
  vertical-align: -0.1em;
}

.typing-cursor.is-blinking {
  animation: typing-cursor-blink 1s steps(1, end) infinite;
}

@keyframes typing-cursor-blink {
  0%,
  50% {
    opacity: 1;
  }
  50.01%,
  100% {
    opacity: 0;
  }
}

.hero-desc {
  color: var(--bg-surface-text-muted-dark);
  max-width: 40rem;
  margin: 0 auto;
  font-weight: 300;
  line-height: 1.7;
  padding-top: 2rem;
}

.hero-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  justify-content: center;
  padding-top: 1rem;
}

.cta-primary-btn {
  /*background-color: var(--primary);*/
  background-color: #ffffff;
  color: #000;
  font-weight: 600;
  padding: 0.875rem 2rem;
  border-radius: 9999px;
  font-size: 1.1rem;
  border: none;
  cursor: pointer;
  transition: background-color 0.15s ease;
  /*box-shadow: 0 10px 15px -3px color-mix(in srgb, var(--primary) 30%, transparent);*/
}

.cta-primary-btn:hover {
  /*background-color: var(--primary-muted);*/
  background-color: #e2e8f0;
}

.cta-secondary-btn {
  border: 2px solid var(--bg-surface-border);
  color: #ffffff;
  font-weight: 500;
  padding: 0.875rem 2rem;
  border-radius: 9999px;
  font-size: 1.1rem;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.cta-secondary-btn:hover {
  background-color: var(--bg-surface-border);
  color: #fff;
}

/* Features */
.features {
  padding: 5rem 1.5rem;
  /*background-color: rgba(17, 17, 20, 0.5);*/
  background-color: var(--bg-surface-dark);
  /*border-top: 1px solid rgba(255, 255, 255, 0.05);*/
  scroll-margin-top: 6rem;
}

.features-inner {
  max-width: 76rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  padding: 0 12px;
  gap: 3rem;
}

.features-header {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.features-header h2 {
  font-size: 1.5rem;
  font-weight: 800;
}

.features-header p {
  color: #94a3b8;
  font-size: 0.875rem;
  max-width: 28rem;
  margin: 0 auto;
}

/* Feature Rows (Discord 風格：一張張卡片直接呈現) */
.feature-rows {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8rem;
}

.feature-rows-line {
  display: none;
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

.feature-row {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  /*gap: 2rem;*/
}

.feature-row-text {
  flex: 1;
  min-width: 0;
}

.feature-row-text h3 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.feature-row-text p {
  color: var(--bg-surface-text-muted);
  font-size: 1.2rem;
  line-height: 1.7;
  padding-bottom: 1.7rem;
}

.feature-row-media {
  position: relative;
  flex: 1.6;
  min-width: 0;
  /* 拿到影片真實尺寸前的暫時佔位比例，metadata 讀到後會被行內 style 覆蓋成該影片的真實比例 */
  aspect-ratio: 16 / 9;
  border-radius: 18px;
  /*border: 2px solid rgba(255, 255, 255, 0.08);*/
  /*border: 6px solid var(--bg-main-text-muted);*/
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  background-color: rgba(24, 24, 27, 0.4);
}

.feature-row-media video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.icon-box {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  transition: transform 0.15s ease;
}

.feature-card:hover .icon-box {
  transform: scale(1.1);
}

.icon-box--indigo {
  color: #818cf8;
  background-color: rgba(99, 102, 241, 0.1);
}

.icon-box--blue {
  color: #60a5fa;
  background-color: rgba(59, 130, 246, 0.1);
}

.icon-box--purple {
  color: #c084fc;
  background-color: rgba(168, 85, 247, 0.1);
}

.icon-box--emerald {
  color: #34d399;
  background-color: rgba(16, 185, 129, 0.1);
}

.icon-box--amber {
  color: #fbbf24;
  background-color: rgba(245, 158, 11, 0.1);
}

.icon-box--rose {
  color: #fb7185;
  background-color: rgba(244, 63, 94, 0.1);
}

.icon-box--cyan {
  color: #22d3ee;
  background-color: rgba(34, 211, 238, 0.1);
}

/* Footer */
.footer {
  padding: 3rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  background-color: var(--bg-black);
  text-align: center;
  color: #ffffff;
  font-size: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  scroll-margin-top: 6rem;
}

.footer-subtext {
  color: var(--bg-surface-text-muted-dark);
  font-weight: 300;
}

.logo {
  width: 1.5rem;
  height: 1.5rem;
}

/* Responsive */
@media (min-width: 640px) {
  .hero-actions {
    flex-direction: row;
  }
}

@media (min-width: 768px) {
  .nav-links {
    display: flex;
  }

  .hero {
    padding: 6rem 1.5rem 6rem 1.5rem;
    background-image:
      linear-gradient(
        to bottom,
        rgba(10, 10, 14, 0.5) 0%,
        rgba(10, 10, 14, 1) 50%,
        var(--bg-surface-dark) 100%
      ),
      url("@/assets/hero-bg.webp");
  }

  .hero-title {
    font-size: 3.75rem;
  }

  .hero-desc {
    font-size: 1.125rem;
  }

  .hero-content-inner {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    text-align: left;
  }

  .features-header h2 {
    font-size: 2.25rem;
  }

  .feature-rows-line {
    display: block;
  }

  .feature-row {
    flex-direction: row;
    align-items: center;
    gap: 4rem;
  }

  .feature-row--reverse {
    flex-direction: row-reverse;
  }
}
</style>
