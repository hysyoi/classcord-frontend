<template>
  <Teleport to="body">
    <Transition name="notice-fade">
      <div
        v-if="globalNotice.isOpen"
        class="global-notice-overlay"
        @click.self="closeNotice"
      >
        <div class="global-notice-modal">
          <div class="notice-header">
            <div class="notice-icon-wrapper" :class="noticeIconClass">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="notice-svg-icon"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h3 class="notice-title">{{ globalNotice.title || '系統流量管制提示' }}</h3>
          </div>

          <div class="notice-body">
            <p class="notice-message">{{ globalNotice.message }}</p>
          </div>

          <div class="notice-footer">
            <button class="notice-confirm-btn" @click="closeNotice">
              我知道了
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useAppStore } from '@/store/useAppStore';

const store = useAppStore();
const globalNotice = computed(() => store.globalNotice);

const noticeIconClass = computed(() => {
  if (store.globalNotice.code === 'SYS_AI_RATE_LIMIT') return 'icon-ai';
  if (store.globalNotice.code === 'SYS_AUTH_RATE_LIMIT') return 'icon-auth';
  return 'icon-default';
});

function closeNotice() {
  store.closeGlobalNotice();
}
</script>

<style scoped>
.global-notice-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
}

.global-notice-modal {
  width: 90%;
  max-width: 420px;
  background: #1e1f22;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.notice-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.notice-icon-wrapper {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-ai {
  background: rgba(138, 43, 226, 0.2);
  color: #a855f7;
  border: 1px solid rgba(168, 85, 247, 0.4);
}

.icon-auth {
  background: rgba(234, 179, 8, 0.2);
  color: #eab308;
  border: 1px solid rgba(234, 179, 8, 0.4);
}

.icon-default {
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.4);
}

.notice-svg-icon {
  width: 24px;
  height: 24px;
}

.notice-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: #f2f3f5;
}

.notice-body {
  line-height: 1.6;
}

.notice-message {
  margin: 0;
  font-size: 0.95rem;
  color: #dbdee1;
}

.notice-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.notice-confirm-btn {
  padding: 10px 24px;
  background: #5865f2;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.1s ease;
}

.notice-confirm-btn:hover {
  background: #4752c4;
}

.notice-confirm-btn:active {
  transform: scale(0.97);
}

/* 進入與離開動畫 */
.notice-fade-enter-active,
.notice-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.notice-fade-enter-from,
.notice-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
