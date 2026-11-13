<template>
  <Teleport to="body">
    <Transition name="slow-notice">
      <div
        v-if="isVisible"
        class="slow-notice"
        role="status"
        aria-live="polite"
      >
        <span class="slow-notice-spinner" aria-hidden="true" />
        <div class="slow-notice-text">
          <p class="slow-notice-main">伺服器處理中，可能需要多等幾秒。</p>
          <p class="slow-notice-sub">
            （示範主機記憶體較小，閒置後的操作可能因 swap 變慢）
            <a
              class="slow-notice-link"
              :href="DOCS_URL"
              target="_blank"
              rel="noopener"
              >為什麼？</a
            >
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts" setup>
/**
 * 非阻斷式的「伺服器處理中」提示。
 * 任何 API 請求超過 3 秒沒回應就出現，全部請求結束後自動消失 (計數邏輯在 lib/slowRequest.ts)。
 * 跟 GlobalNoticeModal 不同：這裡不擋住畫面、不需要使用者按確認。
 */
import { onBeforeUnmount, ref, watch } from "vue";
import { isSlowRequestActive } from "@/lib/slowRequest";

// 技術文件中「排程與資源調校」一節，說明兩台主機的記憶體配置
const DOCS_URL =
  "https://docs-classcord.hys-lab.com/#排程與資源調校都是從實際觀測數據回推的";
// 出現後至少停留這麼久，避免請求剛好在 3 秒多完成時提示一閃而過
const MIN_VISIBLE_MS = 1200;

const isVisible = ref(false);
let shownAt = 0;
let hideTimer: number | undefined;

watch(isSlowRequestActive, (active) => {
  window.clearTimeout(hideTimer);
  if (active) {
    if (!isVisible.value) shownAt = Date.now();
    isVisible.value = true;
    return;
  }
  const remaining = MIN_VISIBLE_MS - (Date.now() - shownAt);
  hideTimer = window.setTimeout(
    () => {
      isVisible.value = false;
    },
    Math.max(0, remaining),
  );
});

onBeforeUnmount(() => window.clearTimeout(hideTimer));
</script>

<style scoped>
.slow-notice {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 99998; /* 在 GlobalNoticeModal (99999) 之下 */
  width: max-content;
  max-width: calc(100vw - 32px);
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-main);
  border: 1px solid var(--bg-main-border);
  border-radius: 12px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  color: #ffffff;
  pointer-events: auto;
}

.slow-notice-spinner {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-top: 3px;
  border: 2px solid rgba(255, 255, 255, 0.25);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: slow-notice-spin 0.8s linear infinite;
}

.slow-notice-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.5;
}

.slow-notice-main {
  margin: 0;
  font-size: 0.95rem;
}

.slow-notice-sub {
  margin: 0;
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.65);
}

.slow-notice-link {
  margin-left: 4px;
  color: #ffffff;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.slow-notice-link:hover {
  color: var(--primary);
}

@keyframes slow-notice-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .slow-notice-spinner {
    animation-duration: 2.4s;
  }
}

.slow-notice-enter-active,
.slow-notice-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.slow-notice-enter-from,
.slow-notice-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}
</style>
