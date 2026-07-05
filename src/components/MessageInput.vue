<template>
  <div class="input-area">
    <!-- 附加檔案預覽卡片 (若已選取檔案) -->
    <div v-if="selectedFile" class="attachment-preview-wrapper">
      <div class="attachment-preview-card">
        <span class="file-icon">📄</span>
        <div class="file-details">
          <span class="file-name" :title="selectedFile.name">{{ selectedFile.name }}</span>
          <span class="file-size">{{ formatBytes(selectedFile.size) }}</span>
        </div>
        <button class="remove-file-btn" @click="clearSelectedFile" title="取消夾帶檔案">✕</button>
      </div>
    </div>

    <!-- 底部輸入框與按鈕 -->
    <div class="input-box" :class="{ 'disabled': isDisabled }">
      <!-- 夾帶檔案按鈕 (僅教材頻道且為教師或助教時顯示) -->
      <button 
        v-if="showUploadButton"
        class="upload-btn" 
        @click="triggerFileSelect"
        :title="selectedFile ? '已夾帶檔案' : '夾帶教材檔案'"
        :class="{ 'has-file': selectedFile }"
      >
        📎
      </button>

      <!-- 隱藏的檔案選擇 input -->
      <input 
        v-if="showUploadButton"
        type="file" 
        ref="fileInputRef" 
        class="hidden-file-input" 
        @change="onFileSelected" 
      />

      <input
        v-model="inputText"
        type="text"
        :placeholder="placeholderText"
        :disabled="isDisabled"
        @keyup.enter="handleSend"
      />

      <!-- 發送按鈕 (選填，若夾帶檔案時更需要明顯的按鈕點擊，所以顯示一個紙飛機或送出圖示) -->
      <button 
        v-if="selectedFile || inputText.trim()"
        class="send-btn" 
        @click="handleSend"
        title="傳送訊息"
        :disabled="store.isLoading"
      >
        🚀
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppStore } from '../store/useAppStore'

const store = useAppStore()
const emit = defineEmits<{
  (e: 'send', text: string): void
}>()

const inputText = ref('')
const selectedFile = ref<File | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

// 檢查是否為限制發言頻道且使用者為學生
const isDisabled = computed(() => {
  const channelType = store.activeChannel?.type
  return (channelType === 'MATERIAL' || channelType === 'ADMIN') && !store.isTeacherOrTA
})

// 是否顯示檔案上傳按鈕 (只有教材頻道且是教師/助教時可以夾帶檔案)
const showUploadButton = computed(() => {
  return store.activeChannel?.type === 'MATERIAL' && store.isTeacherOrTA
})

const placeholderText = computed(() => {
  if (isDisabled.value) {
    if (store.activeChannel?.type === 'MATERIAL') {
      return '此頻道為唯讀教材頻道，僅教師或助教可傳送訊息與教材'
    } else if (store.activeChannel?.type === 'ADMIN') {
      return '此頻道為管理員頻道，僅教師或助教可傳送訊息'
    }
  }
  if (selectedFile.value) {
    return '新增說明文字 (選填)，按下 Enter 或傳送按鈕發布教材...'
  }
  return `傳送訊息至 #${store.activeChannel?.name || '頻道'}`
})

const triggerFileSelect = () => {
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

const onFileSelected = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0]
  }
}

const clearSelectedFile = () => {
  selectedFile.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const handleSend = async () => {
  if (store.isLoading) return

  const text = inputText.value.trim()
  
  if (selectedFile.value) {
    // 夾帶檔案發送流程
    try {
      await store.uploadAndPublishMaterial(selectedFile.value, text)
      // 發布成功後清空
      clearSelectedFile()
      inputText.value = ''
    } catch (err) {
      // 錯誤已在 store 內處理
    }
  } else {
    // 一般純文字發送流程
    if (!text) return
    emit('send', text)
    inputText.value = ''
  }
}

// 輔助函式：檔案大小轉換
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}
</script>

<style scoped>
.input-area {
  padding: 0 16px 8px 9px; /* 底部與兩側留空，使其懸浮 */
  background: transparent; /* 背景透明，與聊天視窗完美融為一體 */
  border-top: none; /* 移除頂部實線，消除分割感 */
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-box {
  display: flex;
  align-items: center;
  height: 60px;
  background: #2E2F41; /* Discord 用戶卡片背景色 */
  border-radius: 12px; /* 仿照 user 卡片，改為 12px 圓角 */
  border: 1px solid rgba(255, 255, 255, 0.05); /* 疊加計算後的不透明灰色邊框 */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35); /* 仿照 user 卡片，增加細緻陰影 */
  padding: 4px 14px; /* 稍加擴充 padding，使其觸感與 user 卡片一樣舒適 */
  gap: 8px;
  transition: opacity 0.2s;
}

.input-box.disabled {
  background: #2e3035; /* 唯讀狀態下稍暗 */
  opacity: 0.6;
}

.input-box input {
  flex: 1;
  background: transparent;
  border: none;
  padding: 10px 4px;
  color: #dbdee1;
  font-size: 14px;
  outline: none;
}

.input-box input:disabled {
  cursor: not-allowed;
  color: #72767d;
}

.input-box input::placeholder {
  color: #6b6f78;
}

.upload-btn {
  background: transparent;
  border: none;
  color: #b5bac1;
  font-size: 18px;
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}

.upload-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: white;
}

.upload-btn.has-file {
  color: #23a55a;
  background: rgba(35, 165, 90, 0.1);
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
  transition: background 0.15s, transform 0.15s;
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
}

.attachment-preview-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-darker);
  border: 1px solid var(--brand-alpha-30);
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
  transition: background 0.15s, color 0.15s;
  margin-left: 8px;
}

.remove-file-btn:hover {
  background: #da373c;
  color: white;
  border-color: transparent;
}
</style>