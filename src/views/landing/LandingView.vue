<template>
  <div
    ref="landingRef"
    class="landing-container"
    @scroll.passive="onLandingScroll"
  >
    <!-- 頂端漸進式模糊（參考 Screen Studio）：三層強度不同的背景模糊，
         各自用帶狀遮罩只顯示一段高度，疊起來就是「上面最模糊、往下逐漸清楚」 -->
    <div class="top-blur" aria-hidden="true">
      <div
        v-for="(layer, i) in BLUR_LAYERS"
        :key="layer"
        class="top-blur-layer"
        :style="blurLayerStyle(layer, i)"
      ></div>
    </div>

    <!-- 膠囊的液態玻璃濾鏡：依位移貼圖把背後畫面往外推，邊緣像透鏡一樣彎曲 -->
    <svg class="glass-filter-defs" aria-hidden="true">
      <filter
        id="pill-glass"
        x="0"
        y="0"
        width="100%"
        height="100%"
        color-interpolation-filters="sRGB"
      >
        <feImage
          :href="glassMapUrl"
          x="0"
          y="0"
          :width="pillSize.width"
          :height="pillSize.height"
          result="map"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="map"
          :scale="GLASS_STRENGTH"
          xChannelSelector="R"
          yChannelSelector="B"
        />
      </filter>
    </svg>

    <!-- Navbar：位置固定；往下捲超過門檻後，右側的連結與按鈕浮現膠囊外觀，logo 維持在外 -->
    <header class="navbar" :class="{ 'navbar--floating': isNavFloating }">
      <!-- 點 logo 平滑捲回頂端（本來就在首頁，跳轉網址不會有反應） -->
      <a
        href="/"
        class="logo-link"
        aria-label="Classcord，回到頂端"
        @click.prevent="scrollToTop"
      >
        <img class="logo" src="/favicon-cord-type1.svg" alt="" />
        <span class="logo-text"> Classcord </span>
      </a>
      <div
        ref="pillRefEl"
        class="navbar-items"
        :class="{ 'navbar-items--refraction': supportsRefraction && glassMapUrl }"
      >
        <!-- 連結共用一顆會滑動的指示膠囊：滑鼠或鍵盤焦點移到哪個連結，它就滑過去 -->
        <nav
          ref="navLinksRef"
          class="nav-links"
          @mouseleave="hideNavIndicator"
          @focusout="onNavFocusOut"
        >
          <span
            class="nav-indicator"
            :class="{
              'nav-indicator--visible': navIndicator.visible,
              'nav-indicator--instant': navIndicator.instant,
            }"
            :style="{
              width: `${navIndicator.width}px`,
              transform: `translateX(${navIndicator.x}px)`,
            }"
            aria-hidden="true"
          ></span>
          <a
            href="#features"
            @mouseenter="moveNavIndicator"
            @focus="moveNavIndicator"
            >特色功能</a
          >
          <!-- <a href="#about">關於我們</a> -->
          <a
            href="https://docs-classcord.hys-lab.com/#00--亮點摘要"
            target="_blank"
            @mouseenter="moveNavIndicator"
            @focus="moveNavIndicator"
            >技術文件</a
          >
          <a
            href="https://github.com/hysyoi/classcord-backend"
            target="_blank"
            @mouseenter="moveNavIndicator"
            @focus="moveNavIndicator"
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
        <div class="hero-text">
          <!-- 參考 Notion 首頁：置中大標題，中間的膠囊輪流替換詞語 -->
          <h1 class="hero-title" aria-label="學習，如即時交流般簡單流暢">
            <span aria-hidden="true">
              學習，如<span
                ref="pillRef"
                class="hero-pill"
                :style="pillWidth ? { width: `${pillWidth}px` } : undefined"
                ><span ref="pillInnerRef" class="hero-pill-inner"
                  ><span v-if="isTyping" class="typing-dots"
                    >&#8203;<i></i><i></i><i></i></span
                  ><span v-else :key="heroWord" class="hero-pill-word">{{
                    heroWord
                  }}</span></span
                ></span
              >般<br />簡單流暢。
            </span>
          </h1>
          <p class="hero-desc">結合班級聊天、AI 助教與即時測驗的線上課堂。</p>
          <div class="hero-actions">
            <button @click="handleActionClick" class="cta-primary-btn">
              {{
                authStore.isAuthenticated ? "開啟 ClassCord" : "進入 ClassCord"
              }}
            </button>
            <a href="#features" class="cta-secondary-btn"> 探索特色功能 </a>
          </div>
        </div>

        <!-- 產品畫面：外框做成瀏覽器視窗，後方墊一層品牌色光暈 -->
        <div class="hero-window-wrap">
          <div class="hero-window">
            <div class="hero-window-bar" aria-hidden="true">
              <div class="hero-window-left">
                <div class="hero-window-controls">
                  <span class="hero-window-dot hero-window-dot--close"></span>
                  <span class="hero-window-dot hero-window-dot--min"></span>
                  <span class="hero-window-dot hero-window-dot--max"></span>
                </div>
                <div class="hero-window-nav">
                  <ChevronLeft :size="16" />
                  <ChevronRight :size="16" />
                </div>
              </div>
              <div class="hero-window-url">
                <Lock :size="11" />
                <span>classcord.hys-lab.com</span>
              </div>
            </div>
            <div class="hero-media">
              <Skeleton v-if="!heroVideoLoaded" class="media-skeleton" />
              <video
                ref="heroVideoEl"
                src="https://cdn-classcord.hys-lab.com/page_intro_07_4K.mp4"
                muted
                loop
                playsinline
                class="media-video"
                :class="{ 'media-video--hidden': !heroVideoLoaded }"
                @loadeddata="onHeroVideoReady"
                @canplaythrough="startVideoQueue"
                @error="startVideoQueue"
              ></video>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="features">
      <div class="features-inner">
        <div class="features-header">
          <h2>從課堂討論到課後複習，都在同一個地方。</h2>
          <p>
            老師開好班級、上傳教材，學生就能在同一個空間裡聊天、提問和測驗。
          </p>
        </div>

        <!-- 三個核心功能：左右交錯的大面板 -->
        <div class="feature-rows">
          <div
            v-for="(item, index) in mainFeatures"
            :key="item.title"
            class="feature-row"
            :class="{ 'feature-row--reverse': index % 2 === 0 }"
          >
            <div class="feature-row-text">
              <h3 class="feature-row-title">
                <!-- 與 App 內相同的圖示，讓標題和旁邊影片裡的介面對得上 -->
                <component
                  :is="item.icon"
                  v-if="item.icon"
                  class="feature-title-icon"
                  aria-hidden="true"
                />
                {{ item.title }}
              </h3>
              <p class="feature-row-desc">{{ item.desc }}</p>
              <!-- 示範班級角色的訊息（AI 助教那格是一問一答），頭像與影片中的角色相同。
                   捲到這張面板才依序「送出」：輸入中 → 訊息 → 下一則輸入中 → 訊息 -->
              <div
                v-if="item.chat"
                :ref="(el) => (quoteEls[index] = el as HTMLElement | null)"
                class="feature-chat"
              >
                <figure
                  v-for="(msg, m) in item.chat"
                  :key="m"
                  class="feature-quote"
                  :class="{
                    'feature-quote--pending': m > (chatProgress[index] ?? 0),
                  }"
                >
                  <!-- AI 助教頭像：與 App 內 AI 助教使用同一張圖 -->
                  <img
                    v-if="msg.ai"
                    src="/ai-assistant-avatar-80.webp"
                    alt=""
                    width="80"
                    height="80"
                    class="feature-quote-avatar ai-avatar"
                  />
                  <Avatar
                    v-else
                    :name="msg.name"
                    variant="beam"
                    :size="40"
                    :colors="AVATAR_COLORS"
                    class="feature-quote-avatar"
                  />
                  <div class="feature-quote-body">
                    <div class="feature-quote-meta">
                      <span class="feature-quote-name">{{ msg.name }}</span>
                      <span class="role-tag">{{ msg.role }}</span>
                    </div>
                    <!-- 看不見的副本先把最終大小佔好，泡泡變大時面板高度不會跳動 -->
                    <div class="feature-quote-bubble-wrap">
                      <div
                        class="feature-quote-bubble feature-quote-bubble--ghost"
                        aria-hidden="true"
                      >
                        {{ msg.text }}
                      </div>
                      <blockquote
                        class="feature-quote-bubble feature-quote-bubble--live"
                        :class="{
                          'feature-quote-bubble--typing':
                            m >= (chatProgress[index] ?? 0),
                          'feature-quote-bubble--ai': msg.ai,
                        }"
                      >
                        <template v-if="m < (chatProgress[index] ?? 0)">
                          <span class="feature-quote-text">{{ msg.text }}</span>
                        </template>
                        <template v-else>
                          <span class="quote-typing" aria-hidden="true"
                            ><i></i><i></i><i></i
                          ></span>
                          <!-- 螢幕閱讀器直接讀到完整訊息 -->
                          <span class="sr-only">{{ msg.text }}</span>
                        </template>
                      </blockquote>
                    </div>
                  </div>
                </figure>
              </div>
            </div>
            <!-- 影片填滿面板的這一半，邊緣跟面板圓角切齊 -->
            <div class="feature-row-media">
              <div
                class="feature-row-video"
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
                <!-- src 先不給，由預載佇列依序填入（見 script 的「影片順序預載」） -->
                <video
                  :ref="(el) => (featureVideoEls[index] = el as HTMLVideoElement | null)"
                  :src="featureVideoSrc[index]"
                  preload="auto"
                  muted
                  loop
                  playsinline
                  class="media-video"
                  :class="{ 'media-video--hidden': !featureVideoLoaded[index] }"
                  @loadedmetadata="onFeatureVideoMeta($event, index)"
                  @loadeddata="onFeatureVideoReady($event, index)"
                  @canplaythrough="onFeatureVideoBuffered(index)"
                  @error="onFeatureVideoBuffered(index)"
                ></video>
              </div>
            </div>
          </div>
        </div>
        <p class="feature-quote-note">
          以上對話來自示範班級「JAVA學習社群」，人物皆為虛構。
        </p>

        <!-- 其餘功能：較小的卡片，兩欄排列 -->
        <div class="more-features">
          <h3 class="more-features-title">讓老師少花時間整理，多花時間教學。</h3>
          <div class="feature-cards">
            <article
              v-for="(item, i) in moreFeatures"
              :key="item.title"
              class="feature-card"
            >
              <div class="feature-card-media">
                <Skeleton
                  v-if="!featureVideoLoaded[i + mainFeatures.length]"
                  class="media-skeleton"
                />
                <video
                  :ref="
                    (el) =>
                      (featureVideoEls[i + mainFeatures.length] =
                        el as HTMLVideoElement | null)
                  "
                  :src="featureVideoSrc[i + mainFeatures.length]"
                  preload="auto"
                  muted
                  loop
                  playsinline
                  class="media-video"
                  :class="{
                    'media-video--hidden':
                      !featureVideoLoaded[i + mainFeatures.length],
                  }"
                  @loadeddata="
                    onFeatureVideoReady($event, i + mainFeatures.length)
                  "
                  @canplaythrough="
                    onFeatureVideoBuffered(i + mainFeatures.length)
                  "
                  @error="onFeatureVideoBuffered(i + mainFeatures.length)"
                ></video>
              </div>
              <h4>
                {{ item.title }}
                <span class="role-tag">{{ item.role }}</span>
              </h4>
              <p>{{ item.desc }}</p>
            </article>
          </div>
        </div>
      </div>
    </section>

    <!-- 收尾：再次引導進入 -->
    <section class="closing">
      <h2 class="closing-title">開一個班級，邀請學生加入。</h2>
      <p class="closing-desc">
        用 Google、GitHub 或 Discord
        帳號就能登入。<br>
        建好班級後，把邀請連結分享給學生即可。
      </p>
      <!-- 彩蛋：示範班級的角色們在群組裡等你，捲到這裡才依序送出 -->
      <div
        :ref="(el) => (quoteEls[CLOSING_CHAT_INDEX] = el as HTMLElement | null)"
        class="feature-chat closing-chat"
      >
        <figure
          v-for="(msg, m) in CLOSING_CHAT"
          :key="m"
          class="feature-quote"
          :class="{
            'feature-quote--pending':
              m > (chatProgress[CLOSING_CHAT_INDEX] ?? 0),
          }"
        >
          <Avatar
            :name="msg.name"
            variant="beam"
            :size="40"
            :colors="AVATAR_COLORS"
            class="feature-quote-avatar"
          />
          <div class="feature-quote-body">
            <div class="feature-quote-meta">
              <!-- 彩蛋對話是群組閒聊，不標示身分 -->
              <span class="feature-quote-name">{{ msg.name }}</span>
            </div>
            <div class="feature-quote-bubble-wrap">
              <div
                class="feature-quote-bubble feature-quote-bubble--ghost"
                aria-hidden="true"
              >
                <span v-if="msg.mention" class="mention">{{ msg.mention }}</span
                >{{ msg.text }}
              </div>
              <blockquote
                class="feature-quote-bubble feature-quote-bubble--live"
                :class="{
                  'feature-quote-bubble--typing':
                    m >= (chatProgress[CLOSING_CHAT_INDEX] ?? 0),
                }"
              >
                <template v-if="m < (chatProgress[CLOSING_CHAT_INDEX] ?? 0)">
                  <span class="feature-quote-text"
                    ><span v-if="msg.mention" class="mention">{{
                      msg.mention
                    }}</span
                    >{{ msg.text }}</span
                  >
                </template>
                <template v-else>
                  <span class="quote-typing" aria-hidden="true"
                    ><i></i><i></i><i></i
                  ></span>
                  <span class="sr-only">{{ msg.mention }}{{ msg.text }}</span>
                </template>
              </blockquote>
            </div>
          </div>
        </figure>
      </div>
      <!-- 彩蛋對話播完（「@你 快進來」之後）才浮現，位置先保留 -->
      <button
        @click="handleActionClick"
        class="cta-primary-btn closing-cta"
        :class="{
          'closing-cta--hidden':
            (chatProgress[CLOSING_CHAT_INDEX] ?? 0) < CLOSING_CHAT.length,
        }"
      >
        {{ authStore.isAuthenticated ? "開啟 ClassCord" : "➜ 進入 ClassCord" }}
      </button>
    </section>

    <!-- Footer -->
    <footer id="about" class="footer">
      <div class="footer-inner">
        <!-- 品牌放在右側；連結已在導覽列，不重複放 -->
        <div class="footer-brand">
          <div class="footer-logo">
            <img
              src="/favicon-cord-type1.svg"
              alt=""
              width="24"
              height="24"
              class="footer-logo-img"
            />
            <span class="logo-text">Classcord</span>
          </div>
          <p class="footer-subtext">
            讓學習變得更有趣、交流更簡單的智慧線上課堂。
          </p>
        </div>
      </div>
      <p class="footer-note">
      </p>
      <p class="footer-copy">© 2026 ClassCord. All Rights Reserved.</p>
    </footer>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/store/useAuthStore";
import { BorderBeam } from "@/components/ui/border-beam";
import { Skeleton } from "@/components/ui/skeleton";
import { afterSkeletonDelay } from "@/lib/debug";
import { ChevronLeft, ChevronRight, Lock } from "lucide-vue-next";
import Avatar from "vue-boring-avatars";
// 與 App 內相同的圖示：頻道的「#」、開始測驗、AI 助教
import TagRoundedIcon from "~icons/material-symbols/tag-rounded";
import PaperLineIcon from "~icons/mingcute/paper-line";
import AiFillIcon from "~icons/mingcute/ai-fill";

// 頭像配色，與 App 內（useAppStore 的 avatarColors）相同，
// 同樣的名字會產生跟影片裡一模一樣的頭像
const AVATAR_COLORS = [
  "#588b8b",
  "#f5e4d7",
  "#ffffff",
  "#087e8b",
  "#037171",
  "#7796cb",
  "#d6f8d6",
  "#4d7ea8",
  "#202330",
];

const router = useRouter();
const authStore = useAuthStore();

// Hero 標題的聊天泡泡：輪流顯示詞語，換詞前先出現「正在輸入…」的跳動點，
// 模擬在聊天室裡送出一則新訊息
const heroWords = ["即時交流", "傳訊息", "群組聊天"];
const heroWordIndex = ref(0);
const heroWord = computed(() => heroWords[heroWordIndex.value]);
const isTyping = ref(false);
let heroWordTimer: ReturnType<typeof setTimeout> | null = null;

const WORD_VISIBLE_MS = 2400; // 每個詞停留的時間
const TYPING_MS = 900; // 「正在輸入」持續的時間

const scheduleNextWord = () => {
  heroWordTimer = setTimeout(() => {
    isTyping.value = true;
    heroWordTimer = setTimeout(() => {
      heroWordIndex.value = (heroWordIndex.value + 1) % heroWords.length;
      isTyping.value = false;
      scheduleNextWord();
    }, TYPING_MS);
  }, WORD_VISIBLE_MS);
};

// 膠囊寬度跟著詞的長度變化（參考 Notion）：
// 換詞或切換成輸入中後，量出內層的實際寬度，再設定到外層，由 CSS transition 做伸縮動畫
const pillRef = ref<HTMLElement | null>(null);
const pillInnerRef = ref<HTMLElement | null>(null);
const pillWidth = ref<number | null>(null);

const updatePillWidth = async () => {
  await nextTick();
  const pill = pillRef.value;
  const inner = pillInnerRef.value;
  if (!pill || !inner) return;
  const style = getComputedStyle(pill);
  pillWidth.value =
    inner.offsetWidth +
    parseFloat(style.paddingLeft) +
    parseFloat(style.paddingRight);
};

watch([heroWord, isTyping], updatePillWidth);

onMounted(() => {
  updatePillWidth();
  // 字型載入完成、視窗尺寸改變（標題字級會在 768px 斷點變大）時都要重新量
  document.fonts?.ready.then(updatePillWidth);
  window.addEventListener("resize", updatePillWidth);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updatePillWidth);
});

onMounted(() => {
  // 使用者偏好減少動態時不輪播，固定顯示第一個詞
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  scheduleNextWord();
});

onBeforeUnmount(() => {
  if (heroWordTimer) clearTimeout(heroWordTimer);
});

// 首頁的捲動容器（整頁是在這個 div 裡捲動，不是 window）
const landingRef = ref<HTMLElement | null>(null);

const scrollToTop = () => {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  landingRef.value?.scrollTo({
    top: 0,
    behavior: reduceMotion ? "auto" : "smooth",
  });
  // 拿掉網址上的錨點（例如 #features），重新整理或分享網址時才不會跳回那一區。
  // 用 replaceState 替換目前這筆紀錄，「上一頁」不會多一步；
  // 保留 history.state，vue-router 需要它記錄導航狀態
  if (location.hash) {
    history.replaceState(history.state, "", location.pathname + location.search);
  }
};

// ===== 導覽列：捲動後浮現膠囊外觀 =====
const NAV_FLOAT_AT = 80; // 往下捲超過幾 px 就浮現膠囊
const isNavFloating = ref(false);

const onLandingScroll = (e: Event) => {
  const floating = (e.target as HTMLElement).scrollTop > NAV_FLOAT_AT;
  // 剛變成懸浮時再量一次膠囊尺寸，確保扭曲貼圖跟膠囊一樣大
  if (floating && !isNavFloating.value) measurePill();
  isNavFloating.value = floating;
};

// ===== 角色訊息：捲到才依序送出 =====
// 對話依序編號：0～2 是三張功能面板，3 是收尾區的彩蛋對話。
// chatProgress[i]：第 i 段對話已經送出幾則訊息；
// 第 progress 則顯示「正在輸入」，更後面的先隱形佔位
type ChatMessage = {
  name: string;
  role: string;
  text: string;
  ai?: boolean;
  mention?: string; // 開頭的「@某人」，以提及樣式顯示
};

// 收尾區彩蛋：角色們在群組裡等使用者進來
const CLOSING_CHAT: ChatMessage[] = [
  { name: "韓勝平", role: "老師", text: "人都到齊了嗎？要開始上課囉。" },
  { name: "馬乒乓", role: "學生", text: "還差一個……" },
  {
    name: "沈亦晴",
    role: "學生",
    mention: "@你",
    text: " 快進來，位子幫你留好了！",
  },
];

// 第 index 段對話的訊息（功能面板的資料在下方 features 中，用到時才讀取）
const getChat = (index: number): ChatMessage[] =>
  index < mainFeatures.length
    ? (mainFeatures[index].chat ?? [])
    : CLOSING_CHAT;
const QUOTE_REVEAL_DELAY_MS = 500; // 進入畫面後，第一則訊息送出的等待時間
const QUOTE_REPLY_DELAY_MS = 1200; // 下一則訊息「正在輸入」的時間
const quoteEls: (HTMLElement | null)[] = [];
const chatProgress = ref<number[]>([]);
let quoteObserver: IntersectionObserver | null = null;
const quoteTimers: ReturnType<typeof setTimeout>[] = [];

const playChat = (index: number) => {
  const total = getChat(index).length;
  for (let m = 0; m < total; m++) {
    quoteTimers.push(
      setTimeout(
        () => {
          chatProgress.value[index] = m + 1;
        },
        QUOTE_REVEAL_DELAY_MS + m * QUOTE_REPLY_DELAY_MS,
      ),
    );
  }
};

onMounted(() => {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  // 減少動態或不支援 IntersectionObserver：直接顯示全部訊息
  const chatCount = mainFeatures.length + 1;
  if (reduceMotion || !("IntersectionObserver" in window)) {
    chatProgress.value = Array.from(
      { length: chatCount },
      (_, i) => getChat(i).length,
    );
    return;
  }
  chatProgress.value = Array(chatCount).fill(0);
  quoteObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        quoteObserver?.unobserve(entry.target);
        playChat(quoteEls.indexOf(entry.target as HTMLElement));
      }
    },
    // 對話區露出一大半才算「看到了」
    { threshold: 0.6 },
  );
  quoteEls.forEach((el) => el && quoteObserver?.observe(el));
});

onBeforeUnmount(() => {
  quoteObserver?.disconnect();
  quoteTimers.forEach(clearTimeout);
});

// ===== 導覽連結的滑動指示膠囊 =====
// visible：是否顯示；instant：這次移動要不要跳過滑動動畫
// （從隱藏狀態第一次出現時直接定位、只做淡入，避免從上一個位置飛過來）
const navLinksRef = ref<HTMLElement | null>(null);
const navIndicator = ref({ x: 0, width: 0, visible: false, instant: true });

const moveNavIndicator = (e: Event) => {
  const link = e.currentTarget as HTMLElement;
  navIndicator.value = {
    x: link.offsetLeft,
    width: link.offsetWidth,
    visible: true,
    instant: !navIndicator.value.visible,
  };
};

const hideNavIndicator = () => {
  navIndicator.value = { ...navIndicator.value, visible: false };
};

// 鍵盤焦點離開整排連結時才隱藏（在連結之間 Tab 切換不隱藏）
const onNavFocusOut = (e: FocusEvent) => {
  if (!navLinksRef.value?.contains(e.relatedTarget as Node)) hideNavIndicator();
};

// ===== 膠囊液態玻璃 =====
// 位移貼圖：中間是中性灰（不位移），往邊緣過渡到紅（左右）、藍（上下）的漸層，
// feDisplacementMap 依顏色把背後像素推開，邊緣就會像透鏡一樣扭曲。
// 貼圖要跟膠囊一樣大，所以膠囊尺寸改變時重新產生。
const GLASS_STRENGTH = -60; // 扭曲強度，絕對值越大越彎；負值讓邊緣往外鼓
const pillRefEl = ref<HTMLElement | null>(null);
const pillSize = ref({ width: 0, height: 0 });

const glassMapUrl = computed(() => {
  const { width: w, height: h } = pillSize.value;
  if (!w || !h) return "";
  const radius = h / 2; // 全圓角
  // 邊緣扭曲帶的寬度，約為高度的 20%
  const edge = Math.round(h * 0.2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <linearGradient id="r" x1="100%" y1="0%" x2="0%" y2="0%">
        <stop offset="0%" stop-color="#000"/><stop offset="100%" stop-color="#f00"/>
      </linearGradient>
      <linearGradient id="b" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#000"/><stop offset="100%" stop-color="#00f"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="#000"/>
    <rect width="${w}" height="${h}" rx="${radius}" fill="url(#r)"/>
    <rect width="${w}" height="${h}" rx="${radius}" fill="url(#b)" style="mix-blend-mode:difference"/>
    <rect x="${edge}" y="${edge}" width="${w - edge * 2}" height="${h - edge * 2}"
      rx="${radius - edge}" fill="hsl(0 0% 50%)" style="filter:blur(${edge * 0.6}px)"/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
});

// backdrop-filter 套用 SVG 濾鏡目前只有 Chromium（Chrome、Edge）支援，
// 其他瀏覽器維持一般毛玻璃
const supportsRefraction = ref(false);
let pillObserver: ResizeObserver | null = null;

const measurePill = () => {
  const el = pillRefEl.value;
  if (!el) return;
  const box = el.getBoundingClientRect();
  pillSize.value = {
    width: Math.round(box.width),
    height: Math.round(box.height),
  };
};

onMounted(() => {
  const brands: { brand: string }[] =
    (navigator as any).userAgentData?.brands ?? [];
  supportsRefraction.value = brands.some((b) => /Chromium/.test(b.brand));

  // 掛載時先量一次；之後尺寸改變（視窗縮放、字型載入）由 ResizeObserver 接手
  measurePill();
  if (pillRefEl.value) {
    pillObserver = new ResizeObserver(measurePill);
    pillObserver.observe(pillRefEl.value);
  }
});

onBeforeUnmount(() => {
  pillObserver?.disconnect();
});

// ===== 頂端漸進式模糊 =====
// 由下往上的三層模糊強度（px）。每層的遮罩是「透明 → 實心 → 實心 → 透明」的帶狀漸層，
// 往上錯開三分之一，相鄰兩層互相交疊淡入淡出，模糊強度就會平滑地由上往下遞減
const BLUR_LAYERS = [1, 4, 16];

const blurLayerStyle = (blur: number, index: number) => {
  const step = 100 / BLUR_LAYERS.length;
  const at = (n: number) => `${(index + n) * step}%`;
  const mask = `linear-gradient(to top, transparent ${at(0)}, #000 ${at(1)}, #000 ${at(2)}, transparent ${at(3)})`;
  return {
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
    maskImage: mask,
    WebkitMaskImage: mask,
  };
};

const handleActionClick = () => {
  if (authStore.isAuthenticated) {
    router.push("/channels/@me");
  } else {
    router.push("/login");
  }
};

// Features 區塊資料
// 前 3 個是核心功能，依一堂課的流程排列（課前討論 → 課中測驗 → 課後問 AI）
// 其餘以小卡片呈現，role 標示是給誰用的
const features = [
  {
    title: "群組聊天",
    icon: TagRoundedIcon,
    desc: "依課程與作業開設討論頻道，公告、教材和提問都整理在同一個地方，訊息即時更新。",
    video: "https://cdn-classcord.hys-lab.com/group_chat_crf20.mp4",
    chat: [
      {
        name: "韓勝平",
        role: "老師",
        text: "以前公告丟在群組，一下就被洗掉。現在討論、教材各有頻道，學生找得到，我也不用一直重講。",
      },
    ],
  },
  {
    title: "即時測驗",
    icon: PaperLineIcon,
    desc: "學生可即時進入測驗作答，系統同步計時與收卷，讓老師隨時掌握班級即時作答狀況。",
    video: "https://cdn-classcord.hys-lab.com/start_quiz_crf20.mp4",
    chat: [
      {
        name: "馬乒乓",
        role: "學生",
        text: "上課當下就測一輪，交卷馬上知道錯在哪，比考前才發現好太多了。",
      },
    ],
  },
  {
    title: "AI 助教",
    icon: AiFillIcon,
    desc: "回家複習卡住了，直接問 AI 助教。它讀過老師上傳的教材，24 小時都能依教材內容回答。",
    video: "https://cdn-classcord.hys-lab.com/ai_crf20.mp4",
    // 一問一答，示範「問了就有人回」
    chat: [
      {
        name: "沈亦晴",
        role: "學生",
        text: "Stream API 的 filter 跟 map 差在哪？講義看了還是有點混。",
      },
      {
        name: "AI 助教",
        role: "AI",
        ai: true,
        text: "filter 是挑出符合條件的資料，map 是把每一筆轉換成新的樣子。照講義的例子，可以先 filter 出及格的成績，再 map 成學生名單。",
      },
    ],
  },
  {
    role: "老師",
    title: "生成題目",
    desc: "上傳教材後，AI 自動分析內容並生成對應的練習題目，省去手動出題的時間。",
    video: "https://cdn-classcord.hys-lab.com/generate_quiz_crf20.mp4",
  },
  {
    role: "老師與學生",
    title: "測驗紀錄",
    desc: "完整保存每一次測驗成績與作答明細，老師與學生都能隨時回顧歷史表現。",
    video: "https://cdn-classcord.hys-lab.com/score_crf20.mp4",
  },
  {
    role: "老師",
    title: "班級錯題分析",
    desc: "顯示每題的錯題率與選項分佈，一眼看出學生卡在哪裡。",
    video: "https://cdn-classcord.hys-lab.com/quiz_analysis_crf20.mp4",
  },
  {
    role: "老師",
    title: "班級焦點報告",
    desc: "統計學生向 AI 助教提出的問題，整理出全班最常卡住的觀念。",
    video: "https://cdn-classcord.hys-lab.com/students_analysis_crf20.mp4",
  },
];

const MAIN_FEATURE_COUNT = 3;
const mainFeatures = features.slice(0, MAIN_FEATURE_COUNT);
// 收尾區彩蛋對話排在三張功能面板之後
const CLOSING_CHAT_INDEX = MAIN_FEATURE_COUNT;
const moreFeatures = features.slice(MAIN_FEATURE_COUNT);

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
  const el = e.target as HTMLVideoElement;
  el.muted = true;
  // 只播看得到的影片；看不到的先載好、等捲到時再播
  if (visibleVideos.has(index)) el.play().catch(() => {});
  afterSkeletonDelay(() => {
    featureVideoLoaded.value[index] = true;
  });
};

// ===== 影片順序預載 =====
// 首頁影片合計很大，一次全部下載會互相搶頻寬，連 Hero 都變慢。改成：
// 1. 一開始只載 Hero
// 2. Hero 能順暢播放（canplaythrough）後，依頁面由上往下的順序，一支一支在背景預載；
//    前一支能順暢播放才換下一支
// 3. 使用者捲得快、某支影片快進入畫面但還沒輪到時，直接插隊先載
// 4. 看不到的影片暫停，捲回來再播
// 5. 瀏覽器開啟「節省數據」時不做背景預載，只在快看到時才載
const featureVideoSrc = ref<(string | undefined)[]>(features.map(() => undefined));
const featureVideoEls: (HTMLVideoElement | null)[] = [];
const heroVideoEl = ref<HTMLVideoElement | null>(null);
const visibleVideos = new Set<number>();
let queueStarted = false;
let videoObserver: IntersectionObserver | null = null;
let queueFallbackTimer: ReturnType<typeof setTimeout> | null = null;

const saveData = (): boolean =>
  !!(navigator as any).connection?.saveData;

const startVideoLoad = (index: number) => {
  if (featureVideoSrc.value[index]) return;
  featureVideoSrc.value[index] = features[index].video;
};

// 載入佇列中下一支還沒開始的影片
const loadNextVideo = () => {
  if (saveData()) return;
  const next = featureVideoSrc.value.findIndex((src) => !src);
  if (next !== -1) startVideoLoad(next);
};

const startVideoQueue = () => {
  if (queueStarted) return;
  queueStarted = true;
  if (queueFallbackTimer) clearTimeout(queueFallbackTimer);
  loadNextVideo();
};

// 一支影片能順暢播放（或載入失敗）就換下一支
const onFeatureVideoBuffered = (_index: number) => {
  if (queueStarted) loadNextVideo();
};

onMounted(() => {
  // 保險：Hero 一直沒觸發 canplaythrough（例如網路很慢），幾秒後還是開始預載
  queueFallbackTimer = setTimeout(startVideoQueue, 6000);

  if (!("IntersectionObserver" in window)) {
    // 不支援就退回全部直接載入
    features.forEach((_, i) => startVideoLoad(i));
    return;
  }
  videoObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLVideoElement;
        const index = featureVideoEls.indexOf(el);
        if (index === -1) continue;
        if (entry.isIntersecting) {
          // 進入預載範圍（畫面下方 800px 內）：還沒輪到就插隊
          startVideoLoad(index);
        }
      }
    },
    { rootMargin: "0px 0px 800px 0px" },
  );
  // 另一個觀察者：真的出現在畫面上才播放，離開就暫停（Hero 的 4K 影片也包含在內）
  const playObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const el = entry.target as HTMLVideoElement;
      if (el === heroVideoEl.value) {
        if (entry.isIntersecting) {
          if (el.readyState >= 2) el.play().catch(() => {});
        } else {
          el.pause();
        }
        continue;
      }
      const index = featureVideoEls.indexOf(el);
      if (index === -1) continue;
      if (entry.isIntersecting) {
        visibleVideos.add(index);
        if (el.readyState >= 2) el.play().catch(() => {});
      } else {
        visibleVideos.delete(index);
        el.pause();
      }
    }
  });
  featureVideoEls.forEach((el) => {
    if (!el) return;
    videoObserver?.observe(el);
    playObserver.observe(el);
  });
  if (heroVideoEl.value) playObserver.observe(heroVideoEl.value);
  videoObservers.push(videoObserver, playObserver);
});

const videoObservers: IntersectionObserver[] = [];

onBeforeUnmount(() => {
  videoObservers.forEach((o) => o.disconnect());
  if (queueFallbackTimer) clearTimeout(queueFallbackTimer);
});
</script>

<style scoped>
/* 源泉圓體 2（SIL OFL 授權，見 assets/fonts/gensen-rounded/OFL.txt）。
   原檔每個字重約 16MB，已子集化成只含首頁用到的字（約 740 字），每個約 190KB。
   ⚠️ 首頁新增文字後要重新產生子集，否則新字會退回粉圓字型。
   只載入三個字重：400 內文、700 按鈕與小標、800 大標題，其他粗細由瀏覽器挑最接近的 */
@font-face {
  font-family: "GenSen Rounded 2 TW";
  src: url("@/assets/fonts/gensen-rounded/GenSenRounded2TW-R.subset.woff")
    format("woff");
  font-weight: 400;
  font-display: swap;
}

@font-face {
  font-family: "GenSen Rounded 2 TW";
  src: url("@/assets/fonts/gensen-rounded/GenSenRounded2TW-B.subset.woff")
    format("woff");
  font-weight: 700;
  font-display: swap;
}

@font-face {
  font-family: "GenSen Rounded 2 TW";
  src: url("@/assets/fonts/gensen-rounded/GenSenRounded2TW-H.subset.woff")
    format("woff");
  font-weight: 800;
  font-display: swap;
}

.landing-container {
  font-family: "GenSen Rounded 2 TW", var(--font-sans), sans-serif;
  /* 首頁底色：帶品牌藍調的近黑（亮度 4%，約 #08090d）。
     比原本的深藍（10%）暗很多，深藍面板浮得出來；
     又不用純黑：保留品牌色調、跟 App 介面接得起來，也避免 OLED 螢幕捲動時拖影 */
  --landing-bg: hsl(var(--bg-surface-base) 4%);
  /* 頁尾比底色再深一點，視覺上最沉 */
  --landing-footer-bg: hsl(var(--bg-surface-base) 2.5%);
  width: 100%;
  height: 100%;
  background-color: var(--landing-bg);
  color: #ffffff;
  overflow-x: hidden;
  overflow-y: auto;
}

/* 頂端漸進式模糊：固定在導覽列底下，高度與 Screen Studio 相同（88px） */
.top-blur {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 5.5rem;
  z-index: 49;
  pointer-events: none;
}

.top-blur-layer {
  position: absolute;
  inset: 0;
}

/* 隱藏的 SVG，只用來放濾鏡定義 */
.glass-filter-defs {
  position: absolute;
  width: 0;
  height: 0;
}

/* Navbar：logo 與「進入」按鈕距離畫面邊緣維持原本的位置（手機 1.25rem、桌面 9.2rem），
   捲動時不會移動 */
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: fixed;
  top: 0.75rem;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 2.5rem);
  z-index: 50;
}

/* logo 連結：外層用獨立的 class，避免被下方 .logo（圖示 24×24）縮小成只剩圖示大小的可點範圍 */
.logo-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: inherit;
  text-decoration: none;
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
  /* 讓指示膠囊以這一排為定位基準 */
  position: relative;
  display: none;
  align-items: center;
  font-size: 1rem;
  font-weight: 500;
}

/* 平常略暗，hover 或鍵盤焦點時變全白 */
.nav-links a {
  position: relative;
  z-index: 1;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: color 0.2s ease;
  padding: 10px 16px;
}

.nav-links a:hover,
.nav-links a:focus-visible {
  color: #ffffff;
}

/* 滑動指示膠囊：全圓角，形狀與外層膠囊、「進入」按鈕一致 */
.nav-indicator {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 0.08);
  opacity: 0;
  pointer-events: none;
  transition:
    transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.2s ease;
}

.nav-indicator--visible {
  opacity: 1;
}

/* 第一次出現：直接定位，只做淡入 */
.nav-indicator--instant {
  transition: opacity 0.2s ease;
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
  white-space: nowrap;
  transition: background-color 0.15s ease;
}

.nav-btn:hover {
  background-color: #e2e8f0;
}

/* 右側連結與按鈕：頁面頂端時透明，捲動後浮現全圓角的毛玻璃膠囊。
   內距 0.8rem 用等量的負右邊距抵銷，按鈕位置不變；四邊內距相同，右端弧線與按鈕圓角同心 */
.navbar-items {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.8rem;
  margin-right: -0.8rem;
  border-radius: 999px;
  border: 1px solid transparent;
  background-color: transparent;
  transition:
    border-color 0.3s ease,
    background-color 0.3s ease,
    box-shadow 0.3s ease,
    backdrop-filter 0.3s ease;
}

.navbar--floating .navbar-items {
  border-color: rgba(255, 255, 255, 0.08);
  background-color: rgba(18, 20, 28, 0.55);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 10px 30px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
}

/* Chromium 才加上折射：先依位移貼圖扭曲背景，再輕微模糊 */
.navbar--floating .navbar-items--refraction {
  background-color: rgba(18, 20, 28, 0.35);
  backdrop-filter: url(#pill-glass) blur(2px) saturate(160%);
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
  /* 只裁左右（避免光暈撐出水平捲軸），上下放行：
     用 hidden 會把視窗後方的光暈在區塊底部切齊，形成一條明顯的分界線 */
  overflow-x: clip;
  overflow-y: visible;
  background-image:
    linear-gradient(
      to bottom,
      rgba(10, 10, 14, 0.5) 0%,
      rgba(10, 10, 14, 1) 50%,
      var(--landing-bg) 100%
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
  width: 100%;
  max-width: 84rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rem;
  position: relative;
  z-index: 10;
}

.hero-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 56rem;
}

/* 產品畫面視窗 */
.hero-window-wrap {
  position: relative;
  width: 100%;
  /* 影片為 4K（3840px），Retina 螢幕 2 倍像素下最寬到 1920px 都清晰；
     取 1344px 讓畫面夠大，又不會在大螢幕上撐得過寬 */
  max-width: 84rem;
}

/* 視窗後方的品牌色光暈：粉紅到藍，呼應標題配色，讓視窗從背景浮起來 */
.hero-window-wrap::before {
  content: "";
  position: absolute;
  inset: 6% 4% -4%;
  background: linear-gradient(
    100deg,
    color-mix(in srgb, var(--primary) 55%, transparent),
    rgba(54, 91, 255, 0.5)
  );
  filter: blur(70px);
  opacity: 0.35;
  border-radius: 40px;
  z-index: 0;
  pointer-events: none;
}

.hero-window {
  position: relative;
  z-index: 1;
  width: 100%;
  border-radius: 14px;
  border: 1px solid var(--bg-surface-light-border);
  background-color: var(--bg-surface);
  overflow: hidden;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 30px 80px rgba(0, 0, 0, 0.5);
}

/* 標題列：左側視窗按鈕與上下頁，中間網址列。
   左右兩欄等寬（右欄空著），網址列就會落在正中央 */
.hero-window-bar {
  display: grid;
  grid-template-columns: 1fr minmax(0, 26rem) 1fr;
  align-items: center;
  gap: 1rem;
  padding: 0.6rem 1rem;
  background-color: var(--bg-surface-light);
  border-bottom: 1px solid var(--bg-surface-border);
  color: var(--bg-surface-text-muted-dark);
}

.hero-window-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.hero-window-controls {
  display: flex;
  gap: 0.45rem;
}

.hero-window-dot {
  width: 0.72rem;
  height: 0.72rem;
  border-radius: 50%;
}

/* macOS 視窗按鈕的配色，降低亮度以融入深色背景 */
.hero-window-dot--close {
  background-color: #e0605a;
}

.hero-window-dot--min {
  background-color: #d9a63b;
}

.hero-window-dot--max {
  background-color: #54b847;
}

.hero-window-nav {
  display: flex;
  gap: 0.35rem;
}

.hero-window-url {
  justify-self: center;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  justify-content: center;
  padding: 0.3rem 1rem;
  border-radius: 999px;
  background-color: var(--bg-surface);
  border: 1px solid var(--bg-surface-border);
  font-size: 0.75rem;
  color: var(--bg-surface-text-muted);
}

.hero-media {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background-color: rgba(255, 255, 255, 0.03);
  overflow: hidden;
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

/* 標題中的膠囊與輪播詞 */
/* 用 inline-block 而非 inline-flex：
   inline-flex 會拿第一個子元素（沒有文字的圓點）的底部當基準線，整個膠囊會被往下拉；
   inline-block 則以裡面的文字對齊，跟旁邊的字在同一條基準線上 */
/* 聊天泡泡：右下角收成小角，像自己剛送出的一則訊息（iMessage 慣例）。
   用 inline-block 而非 inline-flex，讓泡泡以裡面的文字對齊標題基準線 */
.hero-pill {
  display: inline-block;
  margin: 0 0.15em;
  padding: 0 0.4em;
  /* 順序：左上、右上、右下、左下 */
  border-radius: 0.5em 0.5em 0.12em 0.5em;
  /* 實心的品牌漸層，像自己送出的訊息泡泡；色票沿用原本標題漸層（藍 → 紫 → 粉紅） */
  background: linear-gradient(61deg, #1f7afe 0%, #b67fff 70%, #e9505e 100%);
  box-shadow: 0 0.1em 0.4em rgba(0, 0, 0, 0.3);
  text-align: center;
  white-space: nowrap;
  transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.hero-pill-inner {
  display: inline-block;
}

/* 「正在輸入」的三個跳動點。
   前面放一個零寬字元，讓這段有文字基準線，泡泡高度與對齊才不會在切換時跳動 */
.typing-dots i {
  display: inline-block;
  width: 0.16em;
  height: 0.16em;
  margin: 0 0.07em;
  border-radius: 50%;
  background-color: currentColor;
  vertical-align: 0.24em;
  animation: typing-dot 0.9s ease-in-out infinite;
}

.typing-dots i:nth-child(2) {
  animation-delay: 0.15s;
}

.typing-dots i:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes typing-dot {
  0%,
  60%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }
  30% {
    opacity: 1;
    transform: translateY(-0.12em);
  }
}

.hero-pill-word {
  display: inline-block;
}

/* 換詞時的淡入：用 CSS 動畫而非 Vue <Transition>，
   動畫沒跑完（例如分頁在背景被節流）時文字仍然看得到，不會卡在透明狀態 */
.hero-pill-word {
  animation: pill-word-in 0.35s ease;
}

@keyframes pill-word-in {
  from {
    opacity: 0;
    transform: translateY(0.35em);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero-desc {
  /* 需要閱讀的說明文字用亮一級的灰（76%），在背景圖上也讀得清楚 */
  color: var(--bg-surface-text-muted);
  max-width: 40rem;
  margin: 0 auto;
  font-weight: 300;
  line-height: 1.7;
  padding-top: 1.5rem;
}

.hero-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  justify-content: center;
  padding-top: 2.25rem;
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
  background-color: var(--landing-bg);
  /*border-top: 1px solid rgba(255, 255, 255, 0.05);*/
  scroll-margin-top: 6rem;
}

.features-inner {
  /* 與 Hero 產品視窗同寬（.hero-window-wrap 的 84rem），左右留白也一致 */
  max-width: 84rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

/* 字級階層（桌面版）：頁面主標 4.5rem → 區塊標題 3rem → 次區塊標題 2.5rem → 功能標題 2rem */
.features-header {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
}

.features-header h2 {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.25;
}

/* 說明文字與 Hero 副標同一級 */
.features-header p {
  /* 需要閱讀的說明文字用亮一級的灰（76%），在背景圖上也讀得清楚 */
  color: var(--bg-surface-text-muted);
  font-size: 1.05rem;
  line-height: 1.7;
  max-width: 38rem;
  margin: 0 auto;
}

/* 核心功能：參考 Discord，每個功能是一張大圓角面板，左右交錯 */
.feature-rows {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.feature-row {
  display: flex;
  flex-direction: column;
  border-radius: 28px;
  border: 1px solid var(--bg-surface-border);
  background-color: color-mix(in srgb, var(--bg-surface) 70%, transparent);
  /* 讓滿版的影片沿著面板圓角裁切 */
  overflow: hidden;
}

.feature-row-text {
  flex: 1;
  min-width: 0;
  padding: 1.75rem 1.5rem 2rem;
}

.feature-row-text h3 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.feature-row-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* 標題前的小圖示：比標題小、用說明文字的灰，不搶標題 */
.feature-title-icon {
  flex: none;
  width: 0.8em;
  height: 0.8em;
  color: var(--bg-surface-text-muted-dark);
}

.feature-row-desc {
  color: var(--bg-surface-text-muted);
  font-size: 1.05rem;
  line-height: 1.7;
}

/* 示範角色的一句話：頭像在左，泡泡尖角在左上（收到的訊息） */
.feature-quote {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin: 1.75rem 0 0;
}

.feature-quote-avatar {
  flex: none;
  border-radius: 50%;
  /* 細邊框：頭像的深色配色容易跟面板背景融在一起，描邊與身分標籤（.role-tag）的邊框一致 */
  box-shadow: 0 0 0 1px var(--bg-surface-light-border);
}

.feature-quote-body {
  min-width: 0;
}

.feature-quote-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}

.feature-quote-name {
  font-size: 0.9rem;
  font-weight: 700;
}

.feature-quote-bubble {
  margin: 0;
  padding: 0.7rem 1rem;
  /* 順序：左上、右上、右下、左下 */
  border-radius: 4px 16px 16px 16px;
  background-color: var(--bg-surface-light);
  color: var(--bg-surface-light-text-muted);
  font-size: 0.95rem;
  line-height: 1.6;
}

/* 一問一答之間的間距 */
.feature-chat {
  margin-top: 1.75rem;
}

.feature-chat .feature-quote {
  margin: 0;
}

.feature-chat .feature-quote + .feature-quote {
  margin-top: 1rem;
}

/* 還沒輪到的訊息：隱形但保留位置，面板高度不會跳動 */
.feature-quote--pending {
  visibility: hidden;
}

/* AI 助教頭像：圖片是 80×80（HTML 屬性寫真實尺寸），這裡縮成 40×40 顯示，Retina 螢幕上才清楚 */
.ai-avatar {
  width: 40px;
  height: 40px;
  object-fit: cover;
}

/* AI 回覆的泡泡帶一點品牌色，跟學生的訊息區分 */
.feature-quote-bubble--ai {
  background-color: color-mix(
    in srgb,
    #7f6bff 22%,
    var(--bg-surface-light)
  );
}

/* 泡泡容器：看不見的副本（ghost）撐出最終大小，真正的泡泡（live）疊在上面 */
.feature-quote-bubble-wrap {
  position: relative;
}

.feature-quote-bubble--ghost {
  visibility: hidden;
}

.feature-quote-bubble--live {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

/* 正在輸入：泡泡縮成剛好包住三個點的大小 */
.feature-quote-bubble--live.feature-quote-bubble--typing {
  right: auto;
  bottom: auto;
}

.feature-quote-text {
  display: block;
  animation: quote-text-in 0.3s ease;
}

@keyframes quote-text-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 「正在輸入」的三個跳動點 */
.quote-typing {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 1.6em;
}

.quote-typing i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
  animation: typing-dot 0.9s ease-in-out infinite;
}

.quote-typing i:nth-child(2) {
  animation-delay: 0.15s;
}

.quote-typing i:nth-child(3) {
  animation-delay: 0.3s;
}

/* 只給螢幕閱讀器讀的文字 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.feature-quote-note {
  margin-top: 1.25rem;
  text-align: center;
  font-size: 0.8rem;
  color: var(--bg-surface-text-muted-dark);
}

/* 影片滿版填滿面板的這一半 */
.feature-row-media {
  flex: 1.6;
  min-width: 0;
  /* 手機版影片排在文字上方 */
  order: -1;
}

.feature-row-video {
  position: relative;
  width: 100%;
  height: 100%;
  /* 拿到影片真實尺寸前的暫時佔位比例，metadata 讀到後會被行內 style 覆蓋成該影片的真實比例 */
  aspect-ratio: 16 / 9;
  background-color: rgba(24, 24, 27, 0.6);
}

.feature-row-video video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* 面板被文字撐高時影片需要裁切：對齊左邊，優先保留 App 左側的頻道列表，從右側（成員列表）裁 */
  object-position: left center;
  display: block;
}

/* 其餘功能：小卡片 */
.more-features {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  margin-top: 4rem;
  /* 參考 Screen Studio：兩張卡片約佔畫面寬度的 84%，可超出上方內容的 76rem 寬度限制。
     在置中的 flex 欄裡，比父層寬的子元素會往左右兩側平均延伸 */
  align-self: center;
  width: min(84vw, 80rem);
}

.more-features-title {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.25;
  text-align: center;
}

.feature-cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: 3.5rem 1.25rem;
}

.feature-card {
  display: flex;
  flex-direction: column;
  text-align: center;
}

/* 小卡片的框比例與影片原始尺寸（2016×1080）相同，影片完整顯示不裁切。
   之前用 16:10 會讓影片放大 1.167 倍、左右各被切掉約 7%。
   ⚠️ 換影片時若尺寸不同，這裡的比例要跟著改 */
.feature-card-media {
  position: relative;
  aspect-ratio: 2016 / 1080;
  border-radius: 24px;
  border: 1px solid var(--bg-surface-border);
  background-color: var(--bg-surface);
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.feature-card-media video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  display: block;
}

.feature-card h4 {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.6rem;
  font-size: 1.35rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

/* 標示這個功能給誰用 */
.role-tag {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  border: 1px solid var(--bg-surface-light-border);
  color: var(--bg-surface-text-muted);
}

.feature-card p {
  color: var(--bg-surface-text-muted);
  line-height: 1.7;
}

/* 收尾區 */
.closing {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 7rem 1.5rem 12rem;
  /* 沿用 Hero 的背景圖，對齊圖片底部（桌椅、檯燈那段），
     上方用頁面底色的漸層蓋住、往下漸漸透出來，跟頁首的場景首尾呼應 */
  background-color: var(--landing-bg);
  background-image:
    linear-gradient(
      to bottom,
      var(--landing-bg) 0%,
      color-mix(in srgb, var(--landing-bg) 80%, transparent) 35%,
      color-mix(in srgb, var(--landing-bg) 55%, transparent) 100%
    ),
    url("@/assets/hero-bg-mobile.webp");
  background-size: 160% auto;
  background-position: center bottom;
  background-repeat: no-repeat;
}

/* 收尾區彩蛋對話：置中的窄欄，訊息靠左 */
.closing-chat {
  width: min(100%, 26rem);
  margin: 0 0 2.5rem;
  text-align: left;
}

/* 收尾按鈕：對話播完後淡入並輕微上浮 */
.closing-cta {
  transition:
    opacity 0.4s ease 0.3s,
    transform 0.4s ease 0.3s,
    visibility 0s linear 0.3s,
    background-color 0.15s ease;
}

/* 隱形但保留位置；visibility: hidden 讓它不能被點到、也不能被 Tab 鍵選到 */
.closing-cta--hidden {
  opacity: 0;
  transform: translateY(0.5rem);
  visibility: hidden;
  transition: none;
}

/* @提及：像聊天室裡被點名 */
.mention {
  padding: 0 0.25em;
  margin-right: 0.1em;
  border-radius: 4px;
  background-color: rgba(88, 101, 242, 0.3);
  color: #dee4ff;
  font-weight: 700;
}

.closing-title {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.25;
}

.closing-desc {
  /* 需要閱讀的說明文字用亮一級的灰（76%），在背景圖上也讀得清楚 */
  color: var(--bg-surface-text-muted);
  max-width: 34rem;
  line-height: 1.7;
  margin: 1.25rem 0 2.5rem;
}

/* Footer */
.footer {
  padding: 3rem 1.5rem 2.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  background-color: var(--landing-footer-bg);
  color: #ffffff;
  scroll-margin-top: 6rem;
}

.footer-inner,
.footer-note,
.footer-copy {
  max-width: 76rem;
  margin: 0 auto;
}

.footer-inner {
  display: flex;
  /* 品牌靠右 */
  justify-content: flex-end;
  padding-bottom: 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.footer-brand {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
  text-align: right;
}

.footer-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.footer-logo-img {
  width: 1.5rem;
  height: 1.5rem;
}

.footer-subtext {
  color: var(--bg-surface-text-muted-dark);
  font-size: 0.875rem;
  font-weight: 300;
}

.footer-note {
  color: var(--bg-surface-text-muted-dark);
  font-size: 0.8rem;
  line-height: 1.6;
  padding-top: 1.5rem;
}

.footer-copy {
  color: var(--bg-surface-text-muted-dark);
  font-size: 0.75rem;
  padding-top: 0.5rem;
}

/* 鍵盤操作時看得到焦點位置 */
.landing-container a:focus-visible,
.landing-container button:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 3px;
}

/* 使用者偏好減少動態時，停掉背景光暈的漂浮動畫 */
@media (max-width: 639px) {
  .hero-window-nav {
    display: none;
  }

  .hero-window-bar {
    grid-template-columns: auto 1fr;
    gap: 0.75rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .glowing-orb,
  .hero-pill-word,
  .typing-dots i,
  .quote-typing i,
  .feature-quote-text {
    animation: none;
  }

  .hero-pill,
  .navbar-items,
  .nav-indicator,
  .closing-cta {
    transition: none;
  }
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
  .navbar {
    width: calc(100% - 18.4rem);
  }

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
        var(--landing-bg) 100%
      ),
      url("@/assets/hero-bg.webp");
  }

  .hero-title {
    font-size: 4.5rem;
    line-height: 1.15;
  }

  .hero-desc {
    font-size: 1.125rem;
  }

  .features-header h2 {
    font-size: 3rem;
  }

  .features-header p {
    font-size: 1.125rem;
  }

  .feature-rows {
    gap: 3rem;
  }

  .feature-row {
    flex-direction: row;
    /* 影片撐滿面板高度，文字垂直置中 */
    align-items: stretch;
    border-radius: 32px;
  }

  .feature-row-text {
    align-self: center;
    padding: 2rem 2.5rem;
  }

  .feature-row-media {
    order: 0;
  }

  .feature-row--reverse {
    flex-direction: row-reverse;
  }

  .more-features {
    margin-top: 6rem;
  }

  .more-features-title {
    font-size: 2.5rem;
  }

  .feature-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .closing-title {
    font-size: 3rem;
  }

  .closing {
    background-image:
      linear-gradient(
        to bottom,
        var(--landing-bg) 0%,
        color-mix(in srgb, var(--landing-bg) 80%, transparent) 35%,
        color-mix(in srgb, var(--landing-bg) 55%, transparent) 100%
      ),
      url("@/assets/hero-bg.webp");
  }

}
</style>
