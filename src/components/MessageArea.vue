<template>
  <div class="message-area">
    <div class="message-header">
      <div class="header-left">
        <span class="hash"><TagRoundedIcon/></span> {{ store.activeChannel?.name }}
      </div>
      <button 
        class="header-action-btn"
        @click="store.showMemberList = !store.showMemberList"
        title="切換顯示成員名單"
      >
        👥
      </button>
    </div>

    <div class="message-body-wrapper">
      <div class="message-chat-container">
        <div class="message-list" ref="messageListRef">
          <!-- 佔位元素：當訊息較少時，自動將訊息推至底部，實現由下往上堆疊的 Discord 效果 -->
          <div class="message-spacer"></div>
          <div 
            v-for="(message, index) in store.activeMessages" 
            :key="message.id" 
            class="message"
            :class="{ 'is-continuation': isContinuation(message, index) }"
          >
            <!-- 大頭貼：若非連續發言則顯示頭像，否則顯示懸浮時間佔位符 -->
            <div v-if="!isContinuation(message, index)" class="avatar" :style="{ background: message.color }">
              {{ message.initial }}
            </div>
            <div v-else class="continuation-time-placeholder">
              <span class="continuation-time">{{ getShortTime(message.createdAt) }}</span>
            </div>

            <div class="message-content">
              <!-- 只有非連續發言才顯示姓名與完整時間 -->
              <div v-if="!isContinuation(message, index)" class="message-meta">
                <span class="username">{{ message.username }}</span>
                <span class="timestamp">{{ message.timestamp }}</span>
              </div>
              <div class="message-text">{{ message.text }}</div>

              <!-- 教材附件顯示與下載、AI 助教整合 -->
              <div v-if="message.materials && message.materials.length > 0" class="message-attachments">
                <div v-for="file in message.materials" :key="file.id" class="attachment-card">
                  <div class="attachment-left">
                    <div class="attachment-icon-wrapper">📄</div>
                    <div class="attachment-info">
                      <div class="attachment-name" :title="file.originalName">{{ file.originalName }}</div>
                      <div class="attachment-type">{{ file.fileType.replace('.', '').toUpperCase() || 'UNKNOWN' }}</div>
                    </div>
                  </div>
                  
                  <div class="action-buttons-group">
                    <!-- 下載按鈕 -->
                    <button class="attachment-dl-button" @click="store.downloadMaterial(file.id)">
                      下載
                    </button>

                    <!-- AI 助教控制按鈕 -->
                    <div class="ai-button-group">
                      <!-- 已啟用：所有人皆可使用 -->
                      <button 
                        v-if="file.status === 'ENABLED'" 
                        class="attachment-ai-button active" 
                        @click="openAiChat(file)"
                      >
                        🤖 AI 助教
                      </button>

                      <!-- 處理中：顯示處理中且為 disabled -->
                      <button 
                        v-else-if="file.status === 'PROCESSING'" 
                        class="attachment-ai-button processing" 
                        disabled
                      >
                        ⏳ AI 處理中...
                      </button>

                      <!-- 尚未啟用：僅教師與助教能點擊「啟用 AI 助教」 -->
                      <button 
                        v-else-if="store.isTeacherOrTA" 
                        class="attachment-ai-button enable-btn" 
                        @click="store.toggleAiAssistant(file.id)"
                      >
                        ⚡ 啟用 AI 助教
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <MessageInput @send="store.sendMessage" />
      </div>

      <MemberList v-if="store.showMemberList" />
    </div>
  </div>
</template>

<script setup lang="ts">
import TagRoundedIcon from '~icons/material-symbols/tag-rounded';

import { ref, watch, onMounted, nextTick } from 'vue';
import MessageInput from './MessageInput.vue';
import MemberList from './MemberList.vue';
import { useAppStore } from '../store/useAppStore';

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

// 監聽歷史訊息載入與新訊息發送/接收
watch(() => store.activeChannelId, () => {
  scrollToBottom();
});

watch(() => store.activeMessages.length, () => {
  scrollToBottom();
});

onMounted(() => {
  scrollToBottom();
});

const isContinuation = (msg: any, index: number): boolean => {
  if (index === 0) return false;
  const prevMsg = store.activeMessages[index - 1];
  if (!prevMsg) return false;

  // 1. 必須是同一個發言者
  if (msg.username !== prevMsg.username) return false;

  // 2. 時間差小於等於 5 分鐘 (300,000 毫秒)
  if (!msg.createdAt || !prevMsg.createdAt) return false;
  try {
    const timeDiff = new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime();
    return timeDiff >= 0 && timeDiff <= 5 * 60 * 1000;
  } catch {
    return false;
  }
};

const getShortTime = (isoString: string): string => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
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
  height: 100%;
}

.message-header {
  height: 48px;
  box-sizing: border-box;
  padding: 0 16px;
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
  padding: 4px;
  border-radius: 4px;
  transition: background 0.15s, color 0.15s;
}

.header-action-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #dbdee1;
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
}

.message {
  display: flex;
  gap: 18px;
  padding: 0 15px 5px 15px;
  margin-top: 17px;
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
  font-size: 14px;
  font-weight: 500;
}

.message-meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}

.username {
  color: #dbdee1;
  font-weight: 500;
  font-size: 16px;
}

.timestamp {
  color: #6b6f78;
  font-size: 11px;
}

.message-text {
  color: #dbdee1;
  font-size: 16px;
  line-height: 0.8;
  word-break: break-word;
}

/* 附件與 AI 助教樣式 */
.message-attachments {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.attachment-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 560px; /* 統一固定寬度，視覺極具協調感 */
  background: var(--bg-darker);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 14px 20px; /* 整體放大邊距 */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.attachment-card:hover {
  border-color: var(--brand-alpha-40);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
}

.attachment-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  flex: 1;
}

.attachment-icon-wrapper {
  width: 44px;
  height: 44px;
  background: #202225;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.attachment-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.attachment-name {
  color: #dbdee1;
  font-size: 14px;
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

.attachment-dl-button {
  background: #248046;
  border: none;
  color: white;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  flex-shrink: 0;
}

.attachment-dl-button:hover {
  background: #1a6535;
}

.attachment-dl-button:active {
  transform: scale(0.95);
}

/* AI 助教按鈕 */
.ai-button-group {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.attachment-ai-button {
  border: none;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s, transform 0.1s;
  flex-shrink: 0;
}

.attachment-ai-button:active {
  transform: scale(0.95);
}

.attachment-ai-button.enable-btn {
  background: var(--brand-color);
  color: white;
}

.attachment-ai-button.enable-btn:hover {
  background: var(--brand-hover);
}

.attachment-ai-button.active {
  background: #4f545c;
  color: #dbdee1;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.attachment-ai-button.active:hover {
  background: #686d73;
  color: white;
}

.attachment-ai-button.processing {
  background: var(--bg-darkest);
  color: #72767d;
  cursor: not-allowed;
  border: 1px dashed rgba(255, 255, 255, 0.08);
}

/* 連續發言（無大頭貼）樣式 */
.message.is-continuation {
  margin-top: 0 !important;
  padding-top: 2px !important;
  padding-bottom: 2px !important;
  align-items: center;
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
}

.message.is-continuation:hover .continuation-time {
  opacity: 1;
}

/* 佔位元素，將訊息推至底端，實現由下往上堆疊 */
.message-spacer {
  margin-top: auto !important;
}
</style>