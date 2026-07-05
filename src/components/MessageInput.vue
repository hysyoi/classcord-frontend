<template>
  <div class="input-area">
    <!-- 附加檔案預覽卡片 (若已選取檔案) -->
    <div v-if="selectedFile" class="attachment-preview-wrapper">
      <div class="attachment-preview-card">
        <span class="file-icon">📄</span>
        <div class="file-details">
          <span class="file-name" :title="selectedFile.name">{{
            selectedFile.name
          }}</span>
          <span class="file-size">{{ formatBytes(selectedFile.size) }}</span>
        </div>
        <button
          class="remove-file-btn"
          @click="clearSelectedFile"
          title="取消夾帶檔案"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- 底部輸入框與按鈕 -->
    <div class="input-box" :class="{ disabled: isDisabled }">
      <!-- 夾帶檔案按鈕 (僅教材頻道且為教師或助教時顯示) -->
      <div class="file-icon">
        <button
          v-if="showUploadButton"
          class="upload-btn"
          @click="triggerFileSelect"
          :title="selectedFile ? '已夾帶檔案' : '夾帶教材檔案'"
          :class="{ 'has-file': selectedFile }"
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
        :disabled="isDisabled"
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

const store = useAppStore();
const emit = defineEmits<{
  (e: "send", text: string): void;
}>();

const inputText = ref("");
const selectedFile = ref<File | null>(null);
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
  if (store.isLoading) return;

  const text = inputText.value.trim();

  if (selectedFile.value) {
    // 夾帶檔案發送流程
    try {
      await store.uploadAndPublishMaterial(selectedFile.value, text);
      // 發布成功後清空
      clearSelectedFile();
      inputText.value = "";
    } catch (err) {
      // 錯誤已在 store 內處理
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
  width: 52px;
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
  max-height: 60px;
  height: auto; /* 移除固定的 60px，支援動態換行長高 */
  background: #2e2f41; /* Discord 用戶卡片背景色 */
  border-radius: 12px; /* 仿照 user 卡片，改為 12px 圓角 */
  border: 1px solid rgba(255, 255, 255, 0.05); /* 疊加計算後的不透明灰色邊框 */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35); /* 仿照 user 卡片，增加細緻陰影 */
  padding: 0 5px 0 0; /* 保留使用者自訂的 padding */
  /*gap: 8px;*/
  transition: opacity 0.2s;
}

.input-box.disabled {
  background: #2e3035; /* 唯讀狀態下稍暗 */
  opacity: 0.6;
}

.input-box textarea {
  flex: 1;
  background: transparent;
  border: none;
  padding: 0 4px 0 4px; /* 恢復原本 input 的 padding，使其上下高度適配 */
  color: #dbdee1;
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
  color: #72767d;
}

.input-box textarea::placeholder {
  color: #6b6f78;
}

.upload-btn {
  background: transparent;
  border: none;
  color: #b5bac1;
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
  background: rgba(255, 255, 255, 0.06);
  color: #ffffff;
}

.upload-btn.has-file {
  color: #ffffff;
  background: #ff667d;
}

.send-btn {
  background: transparent;
  border: none;
  color: var(--brand-color);
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
  margin-bottom: 4px;
  height: 100px;
  padding-top: 12px;
}

.attachment-preview-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #2e2f41;
  border: 1px solid #42434a;
  border-radius: 8px;
  padding: 8px 12px;
  max-width: 320px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  position: relative;
}

.file-icon {
  font-size: 20px;
}

.file-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.file-name {
  color: #dbdee1;
  font-size: 12px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  color: #949ba4;
  font-size: 10px;
}

.remove-file-btn {
  background: var(--bg-dark);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #dbdee1;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.15s,
    color 0.15s;
  margin-left: 8px;
}

.remove-file-btn:hover {
  background: #da373c;
  color: white;
  border-color: transparent;
}

.input-box textarea::-webkit-scrollbar {
  width: 4px;
}
.input-box textarea::-webkit-scrollbar-track {
  background: transparent;
}
.input-box textarea::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 99px;
}
.input-box textarea::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.3);
}
.input-box textarea {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}
</style>
