<template>
  <div class="message-area">
    <div class="message-header">
      <div class="header-left">
        <span class="hash"><TagRoundedIcon /></span>
        {{ store.activeChannel?.name }}
      </div>
      <button
        class="header-action-btn"
        @click="store.showMemberList = !store.showMemberList"
        title="切換顯示成員名單"
      >
        <SidebarRightIcon />
      </button>
    </div>

    <div class="message-body-wrapper">
      <div class="message-chat-container">
        <div
          class="message-list"
          :class="{
            'is-scrolling': isScrolling,
          }"
          ref="messageListRef"
          @scroll="handleScroll"
        >
          <!-- 佔位元素：當訊息較少時，自動將訊息推至底部，實現由下往上堆疊的 Discord 效果 -->
          <div class="message-spacer"></div>

          <!-- Discord 風格頻道歡迎區塊 -->
          <div v-if="store.activeChannel" class="channel-welcome-header">
            <div class="welcome-icon">
              <TagRoundedIcon />
            </div>
            <h1 class="welcome-title">
              歡迎來到 #{{ store.activeChannel.name }}!
            </h1>
            <p class="welcome-subtitle">
              這就是 #{{ store.activeChannel.name }} 頻道的起點。
            </p>
          </div>

          <template
            v-for="(message, index) in store.activeMessages"
            :key="message.id"
          >
            <!-- 日期分割線 -->
            <div
              v-if="shouldShowDateDivider(message, index)"
              class="date-divider"
            >
              <span class="date-text">{{
                formatDateDivider(message.createdAt)
              }}</span>
            </div>

            <div
              class="message"
              :class="{ 'is-continuation': isContinuation(message, index) }"
            >
              <!-- 大頭貼：若非連續發言則顯示頭像，否則顯示懸浮時間佔位符 -->
              <div
                v-if="!isContinuation(message, index)"
                class="avatar"
                :style="{ background: message.color }"
              >
                {{ message.initial }}
              </div>
              <div v-else class="continuation-time-placeholder">
                <span class="continuation-time">{{
                  getShortTime(message.createdAt)
                }}</span>
              </div>

              <div class="message-content">
                <!-- 只有非連續發言才顯示姓名與完整時間 -->
                <div
                  v-if="!isContinuation(message, index)"
                  class="message-meta"
                >
                  <span class="username">{{ message.username }}</span>
                  <span
                    class="timestamp"
                    @mouseenter="
                      showTooltip(
                        $event,
                        formatTooltipTime(message.createdAt),
                        'top',
                      )
                    "
                    @mouseleave="hideTooltip"
                  >
                    {{ formatMetaTime(message.createdAt) }}
                  </span>
                </div>
                <div class="message-text">{{ message.text }}</div>

                <!-- 教材顯示＆助教 -->
                <div
                  v-if="message.materials && message.materials.length > 0"
                  class="message-attachments"
                >
                  <div
                    v-for="file in message.materials"
                    :key="file.id"
                    class="attachment-container"
                  >
                    <button
                      class="attachment-hover-dl-btn"
                      @click="store.downloadMaterial(file.id)"
                      title="下載檔案"
                    >
                      <DownloadRoundedIcon />
                    </button>

                    <div class="attachment-card">
                      <div class="attachment-left">
                        <div class="attachment-icon-wrapper">
                          <lord-icon
                            src="https://cdn.lordicon.com/kydcudfv.json"
                            trigger="hover"
                            class="current-color"
                            style="width: 100%; height: 100%"
                          >
                          </lord-icon>
                        </div>
                        <div class="attachment-info">
                          <div
                            class="attachment-name"
                            :title="file.originalName"
                          >
                            {{ file.originalName }}
                          </div>
                          <div class="attachment-type">
                            {{
                              file.fileType.replace(".", "").toUpperCase() ||
                              "UNKNOWN"
                            }}
                          </div>
                        </div>
                      </div>

                      <div class="action-buttons-group">
                        <div class="ai-button-group">
                          <FlatButton
                            v-if="file.status === 'ENABLED'"
                            @click="openAiChat(file)"
                          >
                            <AiFillIcon />AI 助教
                          </FlatButton>

                          <FlatButton
                            v-slot:default
                            v-else-if="file.status === 'PROCESSING'"
                            :disabled="true"
                          >
                            <LoadingLoopIcon />AI 處理中...
                          </FlatButton>

                          <FlatButton
                            v-else-if="store.isTeacherOrTA"
                            @click="store.toggleAiAssistant(file.id)"
                          >
                            <ThunderIcon />啟用 AI
                          </FlatButton>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <MessageInput @send="store.sendMessage" />
      </div>

      <MemberList v-if="store.showMemberList" />
    </div>
    <!-- 全域 Teleport Tooltip (用於時間戳記) -->
    <Teleport to="body">
      <div
        v-if="tooltipVisible"
        class="global-custom-tooltip timestamp-tooltip"
        :class="[tooltipPlacement, { visible: tooltipVisible }]"
        :style="{ top: tooltipStyle.top, left: tooltipStyle.left }"
      >
        {{ tooltipText }}
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import TagRoundedIcon from "~icons/material-symbols/tag-rounded";
import DownloadRoundedIcon from "~icons/material-symbols/download-rounded";

import { ref, watch, onMounted, onUnmounted, nextTick } from "vue";
import MessageInput from "./MessageInput.vue";
import MemberList from "./MemberList.vue";
import FlatButton from "./FlatButton.vue";
import { useAppStore } from "../store/useAppStore";
import SidebarRightIcon from "~icons/akar-icons/sidebar-right";
import AiFillIcon from "~icons/mingcute/ai-fill";
import LoadingLoopIcon from "~icons/line-md/loading-loop";
import ThunderIcon from "~icons/boxicons/thunder";

const store = useAppStore();
const messageListRef = ref<HTMLDivElement | null>(null);

// 滾動至底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
    }
  });
};

// 滾動狀態監控 (Pure CSS :hover 負責懸停顯隱，JS 只輔助滾動時顯隱)
const isScrolling = ref(false);
let scrollTimeout: number | null = null;
let resizeObserver: ResizeObserver | null = null;

const handleScroll = () => {
  isScrolling.value = true;
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }
  // 停止滾動 1.2 秒後判定
  scrollTimeout = window.setTimeout(() => {
    isScrolling.value = false;
  }, 1200);
};

// 監聽歷史訊息載入與新訊息發送/接收，並重設滾動狀態，防止頻道切換 DOM 重排殘留
watch(
  () => store.activeChannelId,
  () => {
    isScrolling.value = false;
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
      scrollTimeout = null;
    }
    scrollToBottom();
  },
);

watch(
  () => store.activeMessages.length,
  () => {
    scrollToBottom();
  },
);

onMounted(() => {
  scrollToBottom();

  // 監聽聊天區高度變化 (如新增檔案預覽、文字輸入增高)，自動滾動至底部，防止被遮擋
  if (typeof ResizeObserver !== "undefined" && messageListRef.value) {
    resizeObserver = new ResizeObserver(() => {
      scrollToBottom();
    });
    resizeObserver.observe(messageListRef.value);
  }
});

// 懸浮提示框 (Tooltip) 狀態與方法 - 仿照 ChannelList.vue 的全域 Teleport 實作
const tooltipText = ref("");
const tooltipPlacement = ref<"top" | "bottom">("top");
const tooltipVisible = ref(false);
const tooltipStyle = ref({ top: "0px", left: "0px" });
let tooltipTimeout: number | null = null;

const showTooltip = (
  event: MouseEvent,
  text: string,
  placement: "top" | "bottom" = "top",
) => {
  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout);
    tooltipTimeout = null;
  }
  const target = (event.currentTarget ||
    (event.target as HTMLElement).closest(".timestamp")) as HTMLElement;
  if (!target) return;

  // 延遲 600ms 觸發出現，移開時 instant dismissal 避免閃爍
  tooltipTimeout = window.setTimeout(() => {
    const rect = target.getBoundingClientRect();
    tooltipText.value = text;
    tooltipPlacement.value = placement;

    let top = 0;
    let left = 0;

    if (placement === "top") {
      top = rect.top;
      left = rect.left + rect.width / 2;
    } else if (placement === "bottom") {
      top = rect.bottom;
      left = rect.left + rect.width / 2;
    } else {
      top = rect.top + rect.height / 2;
      left = rect.left;
    }

    tooltipStyle.value = {
      top: `${top}px`,
      left: `${left}px`,
    };
    tooltipVisible.value = true;
  }, 600);
};

const hideTooltip = () => {
  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout);
    tooltipTimeout = null;
  }
  tooltipVisible.value = false;
};

onUnmounted(() => {
  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout);
  }
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

const getDateKey = (isoString: string): string => {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  } catch {
    return "";
  }
};

const shouldShowDateDivider = (msg: any, index: number): boolean => {
  if (index === 0) return true;
  const prevMsg = store.activeMessages[index - 1];
  if (!prevMsg) return true;
  return getDateKey(msg.createdAt) !== getDateKey(prevMsg.createdAt);
};

const formatDateDivider = (isoString: string): string => {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
  } catch {
    return "";
  }
};

const isContinuation = (msg: any, index: number): boolean => {
  if (index === 0) return false;
  if (shouldShowDateDivider(msg, index)) return false; // 日期分開時，不合併頭像
  const prevMsg = store.activeMessages[index - 1];
  if (!prevMsg) return false;

  // 1. 必須是同一個發言者
  if (msg.username !== prevMsg.username) return false;

  // 2. 時間差小於等於 5 分鐘 (300,000 毫秒)
  if (!msg.createdAt || !prevMsg.createdAt) return false;
  try {
    const timeDiff =
      new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime();
    return timeDiff >= 0 && timeDiff <= 5 * 60 * 1000;
  } catch {
    return false;
  }
};

const getShortTime = (isoString: string): string => {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    const hour = date.getHours();
    const minute = date.getMinutes();
    const ampm = hour >= 12 ? "下午" : "上午";
    let h12 = hour % 12;
    if (h12 === 0) h12 = 12;
    const mStr = minute.toString().padStart(2, "0");
    return `${ampm}${h12}:${mStr}`;
  } catch {
    return "";
  }
};

const formatMetaTime = (isoString: string): string => {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const ampm = hour >= 12 ? "下午" : "上午";
    let h12 = hour % 12;
    if (h12 === 0) h12 = 12;
    const mStr = minute.toString().padStart(2, "0");
    return `${year}/${month}/${day} ${ampm}${h12}:${mStr}`;
  } catch {
    return "";
  }
};

const formatTooltipTime = (isoString: string): string => {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDay = [
      "星期日",
      "星期一",
      "星期二",
      "星期三",
      "星期四",
      "星期五",
      "星期六",
    ][date.getDay()];
    const hour = date.getHours();
    const minute = date.getMinutes();
    const ampm = hour >= 12 ? "下午" : "上午";
    let h12 = hour % 12;
    if (h12 === 0) h12 = 12;
    const mStr = minute.toString().padStart(2, "0");
    return `${year}年${month}月${day}日 ${weekDay} ${ampm}\n${h12}:${mStr}`;
  } catch {
    return "";
  }
};

const openAiChat = (file: any) => {
  store.enterAiMode(file);
};
</script>

<style scoped>
.message-area {
  background: var(--bg-dark);
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.message-body-wrapper {
  display: flex;
  flex: 1;
  min-height: 0;
  width: 100%;
}

.message-chat-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0; /* 確保子容器在 Flex 佈局中能正常縮放，防止內容溢出被裁切 */
  height: 100%;
}

.message-header {
  height: 48px;
  box-sizing: border-box;
  padding: 0 8px 0 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: #ffffff;
  font-weight: 600;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-action-btn {
  background: transparent;
  border: none;
  color: #b5bac1;
  font-size: 16px;
  cursor: pointer;
  padding: 6px 6px;
  border-radius: 7px;
  transition:
    background 0.15s,
    color 0.15s;
}

.header-action-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
}

.hash {
  color: #6b6f78;
  font-size: 20px;
}

.message-list {
  flex: 1;
  /*padding: 15px;*/
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding-bottom: 20px;
  /*gap: 10px;*/
  scrollbar-width: auto; /* 要auto */
  scrollbar-color: transparent transparent; /* Firefox 預設隱藏 */
  min-height: 0; /* 確保在彈性容器中能正常收縮，防止新增預覽卡片時遮擋訊息 */
  /* 核心技術：
  讓最頂部 0% 到 15% 的區域從「透明(transparent)」漸變到「不透明(black)」。
  這樣當對話文字滾動進入頂部 15% 的範圍時，就會自動產生淡出溶解的效果！
*/
  -webkit-mask-image: linear-gradient(to top, transparent 0%, black 20px);
  mask-image: linear-gradient(to top, transparent 0%, black 20px);
}

/* 當有滾動或滑鼠懸停時才在 Firefox 顯示滾動條 */
.message-list:hover,
.message-list.is-scrolling {
  scrollbar-color: rgba(255, 255, 255, 0.25) transparent;
}

/* 聊天區域滾動條樣式 - 配方A (整合內縮留白技巧，滑鼠直接在滾動條感應區上或滾動時才顯示) */
.message-list::-webkit-scrollbar {
  width: 8px; /* 加寬至 8px 以容納內縮留白，同時方便滑鼠點擊 */
}

.message-list::-webkit-scrollbar-track {
  background: transparent;
}

.message-list::-webkit-scrollbar-thumb {
  background-color: transparent; /* 預設透明隱藏 */
  border-radius: 99px; /* 改為圓形膠囊狀 */
  border: 2px solid transparent; /* 👈 關鍵：四周內縮 2px，視覺滑塊實際為 4px 寬 */
  background-clip: padding-box; /* 👈 關鍵：讓內縮留白生效 */
  transition: background-color 0.2s ease; /* 平滑淡入淡出 */
}

/* 懸浮在容器上，或者正在滾動時，才顯示 Webkit 滾動條滑塊 */
.message-list:hover::-webkit-scrollbar-thumb,
.message-list.is-scrolling::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.25); /* 使用半透明白調 */
}

/* 當滑鼠直接懸浮在滑塊本身上時，亮度提升 */
.message-list::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.45) !important;
}

.message {
  display: flex;
  gap: 18px;
  padding: 0 0 5px 15px;
  margin-top: 17px;
  border-top-right-radius: 4px;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.message:hover {
  background: #404249;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-top: 4px;
  font-size: 18px;
  font-weight: 500;
  cursor: pointer;
}

.message-meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}

.username {
  color: #ffffff;
  font-weight: 500;
  font-size: 16px;
  cursor: pointer;
}

.username:hover {
  text-decoration: underline;
}

.timestamp {
  color: #6b6f78;
  font-size: 11px;
  position: relative;
  white-space: nowrap; /* 防止日期與時間之間換行 */
}

.message-text {
  color: #ffffff;
  font-size: 16px;
  line-height: 1.4; /* 調整行高以適配多行換行，防止重疊 */
  word-break: break-word;
  white-space: pre-wrap; /* 關鍵：保留並顯示訊息中的換行符號 */
}

/* 附件與 AI 助教樣式 */
/* ==========================================
   附件與 AI 助教樣式整理
========================================== */
.message-attachments {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  height: 90px;
  gap: 6px;
}

/* 1. 外層容器：負責整體寬高、外邊距與下載按鈕的定位基準 */
.attachment-container {
  position: relative;
  width: 424px;
  max-width: 100%;
  height: 100%;
  margin-bottom: 10px;
  box-sizing: border-box;
  color: #dbdee1;
}

/* 2. 內層卡片：負責背景、圓角、左側漸層線的 overflow 裁剪 */
.attachment-card {
  width: 100%;
  height: 90px;
  background: #202330;
  /*background: #2E2F41;*/
  border-top-right-radius: 6px;
  border-bottom-right-radius: 6px;
  border-top-left-radius: 6px;
  border-bottom-left-radius: 6px;
  overflow: hidden; /* 👈 核心：完美裁剪 ::before 裝飾線 */
  position: relative; /* 👈 讓 ::before 相對於卡片定位 */
  padding: 0 14px 0 20px; /* 左側推 25px，給裝飾線留空間 */
  /*box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);*/
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  /*border: 1px solid transparent; /* 預留邊框，防 hover 時畫面抖動 */
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

/* 3. 左側漸層裝飾線 */
.attachment-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 4px; /* 線條寬度 */
  height: 100%;
  background: linear-gradient(to bottom, #dbdee1, #ff667d); /*1B7FFF*/
  background-size: 100% 600%;
  transition: background-position 0.5s ease; /* 平滑流動 */
}

/* 整個卡片區塊 hover 效果 */
.attachment-container:hover .attachment-card {
  border-color: rgb(255 255 255 / 0.24);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
}

.attachment-container:hover .attachment-card::before {
  background-position: 0 100%;
}

.attachment-left {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1;
}

.attachment-icon-wrapper {
  width: 45px;
  height: 45px;
  /*background: #202225;*/
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
  padding: 6px; /* 👈 加上 padding 以利內部百分比 Icon 自動留白 */
  box-sizing: border-box; /* 👈 確保寬高始終鎖定在 44px，防止被 padding 撐開 */
}

.attachment-info {
  display: flex;
  flex-direction: column;
  margin-left: 5px;
  gap: 2px;
  min-width: 0;
}

.attachment-name {
  color: #dbdee1;
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-type {
  color: #949ba4;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.8px;
}

.action-buttons-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

/* 4. 右上角懸浮下載按鈕（改為相對於 container 定位，不再被裁剪） */
.attachment-hover-dl-btn {
  position: absolute;
  top: -15px;
  right: -15px;
  width: 33px;
  height: 33px;
  background: #414249;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  font-size: 20px;
  color: #dbdee1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  opacity: 0;
  pointer-events: none;
  transform: scale(0.9);
  transition:
    opacity 0.15s ease,
    transform 0.15s ease,
    background-color 0.15s,
    color 0.15s;
  z-index: 10;
}

/* 當 hover container 時顯示按鈕 */
.attachment-container:hover .attachment-hover-dl-btn {
  opacity: 1;
  pointer-events: auto;
  transform: scale(1);
}

.attachment-hover-dl-btn:hover {
  background: rgb(115 116 129);
  color: #ffffff;
  border-color: transparent;
}

/* AI 助教按鈕 */
.ai-button-group {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

/* 連續發言（無大頭貼）樣式 */
.message.is-continuation {
  margin-top: 2px !important;
  padding-top: 2px !important;
  padding-bottom: 2px !important;
}

.continuation-time-placeholder {
  width: 40px;
  height: 20px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
}

.continuation-time {
  color: #6b6f78;
  font-size: 11px;
  opacity: 0;
  transition: opacity 0.15s ease;
  user-select: none;
  white-space: nowrap; /* 防止時間折行 */
}

.message.is-continuation:hover .continuation-time {
  opacity: 1;
}

/* 佔位元素，將訊息推至底端，實現由下往上堆疊 */
.message-spacer {
  margin-top: auto !important;
}

/* 日期分割線樣式 */
.date-divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 17px 16px -8px 16px;
  user-select: none;
}

.date-divider::before,
.date-divider::after {
  content: "";
  flex: 1;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.date-divider:not(:empty)::before {
  margin-right: 0.8em;
}

.date-divider:not(:empty)::after {
  margin-left: 0.8em;
}

.date-text {
  color: #949ba4;
  font-size: 12px;
  font-weight: 700;
}

/* Discord 風格歡迎區塊 */
.channel-welcome-header {
  padding: 32px 16px 16px 15px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  user-select: none;
  margin-bottom: 8px;
}

.welcome-icon {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  transition:
    transform 0.2s ease,
    background-color 0.2s ease;
}

.welcome-icon:hover {
  transform: scale(1.05);
  background-color: rgba(255, 255, 255, 0.12);
}

.welcome-icon svg {
  width: 42px;
  height: 42px;
  color: #ffffff;
}

.welcome-title {
  font-size: 32px;
  font-weight: 800;
  color: #ffffff;
  margin: 8px 0;
  line-height: 1.2;
}

.welcome-subtitle {
  font-size: 14px;
  color: #b5bac1;
  margin: 0;
  line-height: 1.4;
}
</style>

<style>
/* 自訂時間戳記專屬的 Tooltip 樣式 (覆蓋全域 .global-custom-tooltip 值) */
.global-custom-tooltip.timestamp-tooltip {
  font-size: 12px; /* 您可以在此修改想要的字型大小 (例如 12px, 13px) */
  padding: 6px 10px;
  line-height: 1.35;
}
</style>
