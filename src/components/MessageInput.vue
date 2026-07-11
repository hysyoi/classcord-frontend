<template>
  <div class="input-area">
    <!-- 附加檔案預覽卡片 (若已選取檔案) -->
    <div v-if="selectedFile" class="attachment-preview-wrapper">
      <div class="attachment-preview-card" :class="{ uploading: isUploading }">
        <div class="file-icon-wrapper" :class="{ 'is-uploading': isUploading }">
          <FileFillIcon v-if="!isUploading" class="preview-file-icon" />
          <!-- 上傳中旋轉圖示 -->
          <div v-else class="upload-spinner"></div>
        </div>
        <div class="file-details">
          <span class="file-name" :title="selectedFile.name">{{
            selectedFile.name
          }}</span>
          <span class="file-size">{{
            isUploading ? "正在上傳至伺服器..." : formatBytes(selectedFile.size)
          }}</span>
        </div>
        <button
          v-if="!isUploading"
          class="remove-file-btn"
          @click="clearSelectedFile"
          title="取消夾帶檔案"
        >
          ✕
        </button>
        <div v-else class="upload-status-indicator" title="上傳中">
          <svg
            class="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
              style="opacity: 0.25"
            ></circle>
            <path
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              style="opacity: 0.75"
            ></path>
          </svg>
        </div>

        <!-- 虛擬進度條 -->
        <div v-if="isUploading" class="upload-progress-bar">
          <div class="upload-progress-fill"></div>
        </div>
      </div>
    </div>

    <!-- 底部輸入框與按鈕 -->
    <div class="input-box" :class="{ disabled: isDisabled || isUploading }">
      <!-- 夾帶檔案按鈕 (僅教材頻道且為教師或助教時顯示) -->
      <div class="file-icon">
        <button
          v-if="showUploadButton"
          class="upload-btn"
          @click="triggerFileSelect"
          :title="
            isUploading
              ? '檔案上傳中'
              : selectedFile
                ? '已夾帶檔案'
                : '夾帶教材檔案'
          "
          :class="{ 'has-file': selectedFile, disabled: isUploading }"
          :disabled="isUploading"
        >
          <lord-icon
            src="https://cdn.lordicon.com/ucjqqgja.json"
            trigger="hover"
            state="hover-upload-2"
            style="width: 25px; height: 25px"
            class="current-color"
          >
          </lord-icon>
        </button>

        <!-- 隱藏的檔案選擇 input -->
        <input
          v-if="showUploadButton"
          type="file"
          ref="fileInputRef"
          class="hidden-file-input"
          @change="onFileSelected"
        />
      </div>

      <textarea
        ref="textareaRef"
        v-model="inputText"
        :placeholder="placeholderText"
        :disabled="isDisabled || isUploading"
        rows="1"
        @keydown="handleKeydown"
      />

      <!-- 發送按鈕 (選填，若夾帶檔案時更需要明顯的按鈕點擊，所以顯示一個紙飛機或送出圖示) -->
      <!--      <button -->
      <!--        v-if="selectedFile || inputText"-->
      <!--        class="send-btn" -->
      <!--        @click="handleSend"-->
      <!--        title="傳送訊息"-->
      <!--        :disabled="store.isLoading"-->
      <!--      >-->
      <!--      </button>-->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from "vue";
import { useAppStore } from "../store/useAppStore";
import FileFillIcon from "~icons/mingcute/file-fill";

const store = useAppStore();
const emit = defineEmits<{
  (e: "send", text: string): void;
}>();

const inputText = ref("");
const selectedFile = ref<File | null>(null);
const isUploading = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

// 動態調整輸入框高度 (限制最高 180px，低於時隱藏拉條以防抖動，超出時才顯現)
const adjustHeight = () => {
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.style.height = "auto";
      const scrollHeight = textareaRef.value.scrollHeight;
      if (scrollHeight >= 180) {
        textareaRef.value.style.height = "180px";
        textareaRef.value.style.overflowY = "auto";
      } else {
        textareaRef.value.style.height = `${scrollHeight}px`;
        textareaRef.value.style.overflowY = "hidden";
      }
    }
  });
};

// 監聽文字輸入與頻道切換，自動調整高度
watch(inputText, () => {
  adjustHeight();
});

watch(
  () => store.activeChannelId,
  () => {
    inputText.value = "";
    adjustHeight();
  },
);

onMounted(() => {
  adjustHeight();
});

// 處理鍵盤按鍵事件 (支援 IME 選字確認、Shift + Enter 換行，與單純 Enter 送出)
const handleKeydown = (e: KeyboardEvent) => {
  if (e.isComposing) {
    return;
  }

  if (e.key === "Enter") {
    if (e.shiftKey) {
      // Shift + Enter 換行：放行，並在 nextTick 調整高度
      nextTick(() => {
        adjustHeight();
      });
      return;
    }

    // 單純 Enter 送出：阻止預設換行並執行發送
    e.preventDefault();
    handleSend();
  }
};

// 檢查是否為限制發言頻道且使用者為學生
const isDisabled = computed(() => {
  const channelType = store.activeChannel?.type;
  return (
    (channelType === "MATERIAL" || channelType === "ADMIN") &&
    !store.isTeacherOrTA
  );
});

// 是否顯示檔案上傳按鈕 (只有教材頻道且是教師/助教時可以夾帶檔案)
const showUploadButton = computed(() => {
  return store.activeChannel?.type === "MATERIAL" && store.isTeacherOrTA;
});

const placeholderText = computed(() => {
  if (isUploading.value) {
    return "檔案上傳中，請稍候...";
  }
  if (isDisabled.value) {
    if (store.activeChannel?.type === "MATERIAL") {
      return "此頻道為唯讀教材頻道，僅教師或助教可傳送訊息與教材";
    } else if (store.activeChannel?.type === "ADMIN") {
      return "此頻道為管理員頻道，僅教師或助教可傳送訊息";
    }
  }
  if (selectedFile.value) {
    return "新增說明文字 (選填)，按下 Enter 或傳送按鈕發布教材...";
  }
  return `傳送訊息至 #${store.activeChannel?.name || "頻道"}`;
});

const triggerFileSelect = () => {
  if (isUploading.value) return;
  if (fileInputRef.value) {
    fileInputRef.value.click();
  }
};

const onFileSelected = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0];
  }
};

const clearSelectedFile = () => {
  selectedFile.value = null;
  if (fileInputRef.value) {
    fileInputRef.value.value = "";
  }
};

const handleSend = async () => {
  if (store.isLoading || isUploading.value) return;

  const text = inputText.value.trim();

  if (selectedFile.value) {
    // 夾帶檔案發送流程
    isUploading.value = true;
    try {
      await store.uploadAndPublishMaterial(selectedFile.value, text);
      // 發布成功後清空
      clearSelectedFile();
      inputText.value = "";
    } catch (err) {
      // 錯誤已在 store 內處理
    } finally {
      isUploading.value = false;
    }
  } else {
    // 一般純文字發送流程
    if (!text) return;
    emit("send", text);
    inputText.value = "";
  }
};

// 輔助函式：檔案大小轉換
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};
</script>

<style scoped>
.input-area {
  margin: 0 8px 8px 9px; /* 底部與兩側留空，使其懸浮 */
  background: transparent; /* 背景透明，與聊天視窗完美融為一體 */
  border-top: none; /* 移除頂部實線，消除分割感 */
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0; /* 關鍵：防止垂直高度吃緊時被壓縮，導致卡片與輸入框重疊或溢出 */
}

.file-icon {
  display: flex;
  justify-content: center; /* 左右置中 (主軸) */
  align-items: center; /* 上下對齊 (交叉軸) */
  padding-left: 10px;
  margin-right: 6px;
  /*margin: 12px 0;*/
}

.input-box {
  display: flex;
  align-items: center; /* 恢復置中對齊，使單行時按鈕與文字居中，多行時依舊和諧 */
  min-height: 60px; /* 原為 height: 60px，改為最小高度以支援向上長高並保留使用者美化的高度 */
  height: auto; /* 移除固定的 60px，支援動態換行長高 */
  background: var(--bg-surface-light); /* Discord 用戶卡片背景色 */
  border-radius: 12px; /* 仿照 user 卡片，改為 12px 圓角 */
  border: 1px solid var(--bg-surface-light-border); /* 疊加計算後的不透明灰色邊框 */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35); /* 仿照 user 卡片，增加細緻陰影 */
  padding: 0 5px 0 0; /* 保留使用者自訂的 padding */
  /*gap: 8px;*/
  transition: opacity 0.2s;
}

.input-box.disabled {
  background: var(--bg-main-dark); /* 唯讀狀態下稍暗 */
  opacity: 0.6;
}

.input-box textarea {
  flex: 1;
  background: transparent;
  border: none;
  padding: 0 4px 0 10px; /* 恢復原本 input 的 padding，使其上下高度適配 */
  color: #ffffff;
  font-size: 17px;
  outline: none;
  resize: none; /* 禁用手動拉伸 */
  font-family: inherit;
  line-height: 1.4;
  height: 44px; /* 適配 17px 字型高度 (17px * 1.4 + 20px padding = 43.8px) */
  max-height: 180px; /* 最大高度限制，超出後出現捲軸 */
  overflow-y: hidden; /* 預設隱藏，由 JS 動態決定何時開啟 */
  box-sizing: border-box; /* 確保 padding 包含在高度內 */
}

.input-box textarea:disabled {
  cursor: not-allowed;
  color: var(--bg-main-dark-text-muted);
}

.input-box textarea::placeholder {
  color: var(--bg-surface-text-muted-dark);
}

.upload-btn {
  background: transparent;
  border: none;
  color: var(--bg-main-dark-text-muted);
  font-size: 18px;
  cursor: pointer;
  padding: 6px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.15s,
    color 0.15s;
}

.upload-btn:hover {
  background: var(--bg-surface-hover);
  color: #ffffff;
}

.upload-btn.has-file {
  color: #ffffff;
  background: var(--primary);
}

.send-btn {
  background: transparent;
  border: none;
  color: var(--primary);
  font-size: 16px;
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.15s,
    transform 0.15s;
}

.send-btn:hover:not(:disabled) {
  background: var(--brand-alpha-15);
  transform: scale(1.05);
}

.send-btn:disabled {
  color: #4f545c;
  cursor: not-allowed;
}

.hidden-file-input {
  display: none;
}

/* 夾帶檔案預覽 */
.attachment-preview-wrapper {
  display: flex;
  height: 72px;
  margin-bottom: 8px;
  animation: slideInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideInUp {
  from {
    transform: translateY(12px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.attachment-preview-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: hsl(
    var(--bg-surface-base) 21% / 0.75
  ); /* --bg-surface-light with opacity */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--bg-surface-light-border);
  border-radius: 12px;
  padding: 8px 14px;
  max-width: 340px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  position: relative;
  transition: all 0.25s ease;
}

.attachment-preview-card:hover {
  border-color: hsl(
    var(--primary-base) 70% / 0.5
  ); /* Glow using primary base hue */
  box-shadow:
    0 10px 28px rgba(0, 0, 0, 0.45),
    0 0 16px hsl(var(--primary-base) 70% / 0.2);
  transform: translateY(-2px);
}

.file-icon-wrapper {
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: 8px;
  background: linear-gradient(
    135deg,
    var(--primary) 0%,
    var(--primary-light) 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.attachment-preview-card:hover .file-icon-wrapper {
  transform: scale(1.05);
}

.file-icon-wrapper .preview-file-icon {
  font-size: 22px;
  color: #ffffff; /* Contrast on primary gradient background */
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.file-name {
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  color: var(--bg-surface-text-muted);
  font-size: 11px;
  margin-top: 2px;
}

.remove-file-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #b5bac1;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  margin-left: 8px;
  flex-shrink: 0;
}

.remove-file-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.45);
  color: #ff6b6b;
  transform: scale(1.15) rotate(90deg);
}

/* 上傳檔案載入中狀態樣式 */
.attachment-preview-card.uploading {
  border-color: var(--primary);
  background: hsl(
    var(--bg-surface-base) 21% / 0.9
  ); /* --bg-surface-light with higher opacity */
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.45),
    0 0 20px hsl(var(--primary-base) 70% / 0.35);
  pointer-events: none; /* 上傳中禁用卡片交互 */
}

.file-icon-wrapper.is-uploading {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: none;
}

/* Spinner 旋轉動畫 */
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.upload-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid hsl(var(--primary-base) 70% / 0.25);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.upload-status-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  color: var(--primary);
  flex-shrink: 0;
}

.upload-status-indicator svg {
  width: 18px;
  height: 18px;
  animation: spin 1s linear infinite;
}

/* 虛擬上傳進度條 */
.upload-progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  overflow: hidden;
}

.upload-progress-fill {
  height: 100%;
  width: 40%;
  background: linear-gradient(
    90deg,
    var(--primary) 0%,
    var(--primary-light) 100%
  );
  animation: progressShimmy 1.8s infinite ease-in-out;
}

@keyframes progressShimmy {
  0% {
    width: 0%;
    margin-left: 0%;
  }
  50% {
    width: 40%;
    margin-left: 30%;
  }
  100% {
    width: 0%;
    margin-left: 100%;
  }
}

/* 上傳中禁用上傳按鈕 */
.upload-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.input-box textarea::-webkit-scrollbar {
  width: 4px;
}
.input-box textarea::-webkit-scrollbar-track {
  background: transparent;
}
.input-box textarea::-webkit-scrollbar-thumb {
  background-color: var(--bg-main);
  border-radius: 99px;
}
.input-box textarea::-webkit-scrollbar-thumb:hover {
  background-color: var(--bg-surface-hover);
}
.input-box textarea {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}
</style>
