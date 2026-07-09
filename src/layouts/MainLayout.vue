<template>
  <div class="top-announcement-bar">
    {{
      store.isLoading
        ? "載入中..."
        : store.servers.length === 0
          ? "尚未加入班級"
          : (store.activeServer?.name ?? "請選擇班級")
    }}
  </div>
  <div class="app-layout" :class="{ 'quiz-active-layout': store.activeQuiz }">
    <!-- 左側獨立的伺服器列表 -->
    <ServerList v-if="!store.activeQuiz" />

    <!-- 右側的主面板容器，將頻道、聊天區整合在一起 -->
    <div
      class="main-panel shadow-2xl"
      :class="{ 'quiz-mode-layout': store.isAiMode && store.activeQuiz }"
    >
      <splitpanes
        v-if="!store.activeQuiz"
        class="main-splitpanes"
        @resize="handlePaneResize"
      >
        <pane
          :size="21"
          :min-size="minSidebarPercent"
          :max-size="maxSidebarPercent"
        >
          <div ref="sidebarContainerRef" style="height: 100%; width: 100%">
            <AiSessionList v-if="store.isAiMode" />
            <ChannelList v-else />
          </div>
        </pane>
        <pane>
          <router-view />
        </pane>
      </splitpanes>
      <router-view v-else />
    </div>

    <!-- 懸浮式用戶卡片 -->
    <div
      class="user-card-floating"
      v-if="store.currentUser && !store.activeQuiz"
      :style="{ width: userCardWidth + 'px' }"
    >
      <div class="user-card-avatar-info">
        <div class="user-avatar" :style="{ backgroundColor: avatarColor }">
          <img
            v-if="store.currentUser.avatarUrl"
            :src="store.currentUser.avatarUrl"
            class="user-avatar-img"
          />
          <span v-else>{{ userInitial }}</span>
          <div class="user-status-dot"></div>
        </div>
        <div class="user-info">
          <div class="user-username">{{ store.currentUser.username }}</div>
          <div class="user-status user-status-flip">
            <div class="user-status-flip-inner">
              <div class="status-front">在線</div>
              <div class="status-back" :title="store.currentUser.email">
                {{ store.currentUser.email }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="user-controls">
        <button class="control-btn" title="設定" @click.stop="toggleUserMenu">
          <lord-icon
            src="https://cdn.lordicon.com/umuwriak.json"
            trigger="hover"
            state="hover-cog-4"
            colors="primary:#b5bac1"
            class="current-color"
          >
          </lord-icon>
        </button>

        <!-- 使用者設定下拉選單 -->
        <div v-if="showUserMenu" class="user-dropdown-menu" @click.stop>
          <div class="menu-item user-info-item">
            <div class="menu-user-email">{{ store.currentUser?.email }}</div>
          </div>
          <div class="menu-divider"></div>
          <button class="menu-item logout-item" @click="handleLogout">
            <span class="logout-icon">🚪</span> 登出
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, computed, ref, onUnmounted } from "vue";
import ChannelList from "@/components/ChannelList.vue";
import ServerList from "@/components/ServerList.vue";
import AiSessionList from "@/components/AiSessionList.vue";
import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Splitpanes, Pane } from "splitpanes";
import "splitpanes/dist/splitpanes.css";
import { useRouter } from "vue-router";

const store = useAppStore();
const authStore = useAuthStore();
const router = useRouter();

const sidebarWidth = ref(240);
const windowWidth = ref(
  typeof window !== "undefined" ? window.innerWidth : 1200,
);
const sidebarContainerRef = ref<HTMLDivElement | null>(null);

const handlePaneResize = () => {
  if (sidebarContainerRef.value) {
    sidebarWidth.value = sidebarContainerRef.value.offsetWidth;
  }
};

const handleWindowResize = () => {
  windowWidth.value = window.innerWidth;
  handlePaneResize();
};

const minSidebarPercent = computed(() => {
  const mainPanelWidth = windowWidth.value - 72;
  if (mainPanelWidth <= 0) return 15;
  return (200 / mainPanelWidth) * 100;
});

const maxSidebarPercent = computed(() => {
  const mainPanelWidth = windowWidth.value - 72;
  if (mainPanelWidth <= 0) return 40;
  return (360 / mainPanelWidth) * 100;
});

const userCardWidth = computed(() => {
  return 72 + sidebarWidth.value - 16;
});

const userInitial = computed(() => {
  return store.currentUser?.username
    ? store.currentUser.username.charAt(0).toUpperCase()
    : "?";
});

const avatarColor = computed(() => {
  return store.currentUser?.id
    ? store.getRandomColor(store.currentUser.id)
    : "var(--brand-color)";
});

const showUserMenu = ref(false);

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value;
};

const closeUserMenu = () => {
  showUserMenu.value = false;
};

const handleLogout = async () => {
  await authStore.logout();
  router.push("/login");
};

onMounted(() => {
  store.fetchServers();
  store.fetchCurrentUserProfile();
  window.addEventListener("resize", handleWindowResize);
  window.addEventListener("click", closeUserMenu);
  // Measure pane size after rendering completes
  setTimeout(() => {
    handlePaneResize();
  }, 150);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleWindowResize);
  window.removeEventListener("click", closeUserMenu);
});
</script>

<style scoped>
.top-announcement-bar {
  top: 0;
  width: 100%;
  height: 33px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  background: var(--bg-darkest);
}

/* 外層佈局：劃分伺服器列表與主面板 */
.app-layout {
  display: grid;
  grid-template-columns: 72px 1fr;
  height: calc(100vh - 33px); /* 扣除頂部宣告欄的高度，防止螢幕溢出滾動 */
  overflow: hidden;
  background: var(--bg-darkest);
}

/* 當處於測驗狀態時，左側伺服器選單被隱藏，主面板佔滿全螢幕 */
.app-layout.quiz-active-layout {
  grid-template-columns: 1fr;
}

.app-layout {
  position: relative;
}

/* 懸浮式用戶卡片 */
.user-card-floating {
  position: absolute;
  bottom: 8px;
  left: 8px;
  height: 60px;
  max-width: 416px; /* 限制最大寬度 (與側邊欄 max-width: 360px 對齊) */
  border-radius: 12px;
  background: #2e2f41; /* Discord 用戶卡片背景色 */
  border: 1px solid rgba(255, 255, 255, 0.05); /* 疊加計算後的不透明灰色邊框 */
  display: flex;
  align-items: center;
  padding-left: 8px;
  padding-right: 12px;
  gap: 8px;
  z-index: 100; /* 高於側邊欄 */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  box-sizing: border-box;
}

.user-card-avatar-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  cursor: pointer;
  padding: 5px;
  border-radius: 6px;
}

.user-card-avatar-info:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #dbdee1;
}

/* 靜音按鈕的斜線 */
.mic-btn.muted {
  position: relative;
}

.mute-slash {
  position: absolute;
  font-size: 14px;
  color: #f23f43;
  font-weight: bold;
  transform: rotate(-15deg);
  left: 5px;
  top: 3px;
  pointer-events: none;
}

/* 帶有向下箭頭的按鈕群組 */
.control-btn-group {
  display: flex;
  align-items: center;
  gap: 1px;
}

.control-arrow {
  font-size: 9px;
  color: #949ba4;
  cursor: pointer;
  padding: 2px;
  border-radius: 3px;
  transition:
    background 0.15s,
    color 0.15s;
  user-select: none;
}

.control-arrow:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #dbdee1;
}

/* 右側主面板：整合邊框與左上角圓角，還原 Discord 經典面板設計 */
.main-panel {
  display: block; /* 取消 grid 欄位設定，改由內層 splitpanes 控制 */
  height: 100%;
  background: var(--bg-dark);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  border-top-left-radius: 10px;
  overflow: hidden; /* 確保圓角裁切子組件背景 */
}

/* 測驗模式下的寬度分配 */
.main-panel.quiz-mode-layout {
  border-top-left-radius: 0; /* 滿版測驗時可取消圓角 */
}

/* Splitpanes 元件樣式整合 */
.main-splitpanes {
  height: 100%;
  width: 100%;
}

.main-splitpanes :deep(.splitpanes__pane) {
  background: transparent;
}

/* 極簡 Discord 拖拽分割線樣式 - 0px 物理寬度，完全隱形，不擠壓任何空間 */
.main-splitpanes :deep(.splitpanes__splitter) {
  width: 0px !important; /* 設為 0px，使左右板塊無縫貼合，沒有任何物理間隙 */
  background-color: transparent !important;
  cursor: col-resize;
  position: relative;
  z-index: 10;
}

/* 滑鼠懸停感應區 (Hitbox) - 雖然分割線是 0px，也能藉由這層透明懸浮區輕鬆抓取 */
.main-splitpanes :deep(.splitpanes__splitter::before) {
  content: "";
  position: absolute;
  left: -5px; /* 左右延伸 5px，共 10px 的感應區，易於拖拽 */
  top: 0;
  width: 10px;
  height: 100%;
  background: transparent;
  cursor: col-resize;
  z-index: 20;
}

/* 浮現引導粗線 - 平常完全隱形，hover 時浮現在邊界正上方 */
.main-splitpanes :deep(.splitpanes__splitter::after) {
  content: "";
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: 0;
  bottom: 0;
  width: 4px; /* 浮現的導引粗線為 4px */
  background-color: rgba(
    255,
    255,
    255,
    0.25
  ); /* 顯著的引導灰色線條，與 Discord 原生懸浮拖拽條效果一致 */
  border-radius: 2px;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 15;
  pointer-events: none; /* 讓滑鼠點擊直接穿透給 Hitbox */
}

/* 當滑鼠懸停（hover）或正在拖拽（active）時，引導粗線浮現 */
.main-splitpanes :deep(.splitpanes__splitter:hover::after),
.main-splitpanes :deep(.splitpanes__splitter:active::after) {
  opacity: 1;
}

.control-btn :deep(lord-icon) {
  pointer-events: none;
}

/* 使用者下拉選單樣式 */
.user-dropdown-menu {
  position: absolute;
  bottom: 50px;
  right: 0;
  width: 160px;
  background: rgba(30, 31, 34, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  padding: 6px 0;
  z-index: 200;
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  animation: popIn 0.15s ease-out;
}

@keyframes popIn {
  from {
    transform: translateY(10px) scale(0.95);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

.menu-item {
  width: 100%;
  background: none;
  border: none;
  padding: 8px 12px;
  text-align: left;
  color: #dbdee1;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.15s, color 0.15s;
  box-sizing: border-box;
}

.menu-item:hover {
  background: var(--brand-color);
  color: white;
}

.user-info-item {
  cursor: default;
  padding: 6px 12px;
}

.user-info-item:hover {
  background: none;
}

.menu-user-email {
  font-size: 11px;
  color: #949ba4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.menu-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 4px 0;
}

.logout-item {
  color: #f23f43;
}

.logout-item:hover {
  background: #f23f43;
  color: white;
}
</style>
