<template>
  <button
    class="btn-flat"
    :class="{ disabled: disabled }"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <span>
      <slot></slot>
    </span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  disabled?: boolean;
}>();

defineEmits<{
  (e: "click", event: MouseEvent): void;
}>();
</script>

<style scoped>
.btn-flat {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px; /* 適合聊天卡片內按鈕大小的預設 padding */
  color: #fff;
  border-radius: 6px; /* 配合 Discord 卡片風格，使用舒適圓角 */
  background: transparent;
  border: 1px solid var(--bg-main-border);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 0.3s,
    box-shadow 0.3s;
  outline: none;
  box-sizing: border-box;
}

.btn-flat span {
  position: relative;
  z-index: 2; /* 確保文字/圖標始終蓋在滑入背景之上 */
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 滑入的背景動畫 */
.btn-flat::before {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  content: "";
  z-index: 1;
  transition: transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1); /* 平滑過渡 */
  transform: translateX(-100%); /* 完全隱藏在左側，Hover 時才推入 */
  background: var(--primary); /* 使用品牌粉紅色作為滑動背景 */
}

/* Hover 狀態 */
.btn-flat:hover:not(:disabled)::before {
  transform: translateX(0%);
}

.btn-flat:hover:not(:disabled) {
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(255, 102, 125, 0.25);
  color: var(--bg-surface);
}

/* Disabled 唯讀/處理中狀態 */
.btn-flat:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  background: rgba(0, 0, 0, 0.2);
}

.btn-flat:disabled::before {
  display: none; /* 停用時不顯示滑動動畫 */
}
</style>
