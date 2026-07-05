<template>
  <div class="ai-session-list">
    <!-- 頂部：返回與標題 -->
    <div class="list-header">
      <button class="back-btn" @click="store.exitAiMode" title="回到班級頻道">
        ← 返回班級頻道
      </button>
      <div class="material-title" :title="store.aiMaterial?.originalName">
        📖 {{ store.aiMaterial?.originalName }}
      </div>
    </div>

    <!-- Tab 切換器 (對話會話 vs 測驗紀錄) -->
    <div class="tab-switcher">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'chat' }"
        @click="activeTab = 'chat'"
      >
        💬 AI 對話
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'quiz' }"
        @click="activeTab = 'quiz'"
      >
        📊 測驗紀錄
      </button>
    </div>

    <!-- 內容區依據 Tab 切換 -->
    <div class="list-content-area">
      <!-- 狀態 A：對話會話 Tab -->
      <div v-if="activeTab === 'chat'" class="tab-panel">
        <!-- 新增對話按鈕 -->
        <div class="action-section">
          <button class="new-chat-btn" @click="store.createNewAiSession">
            + 新建立對話
          </button>
        </div>

        <!-- 會話清單 -->
        <div class="session-items-container">
          <div v-if="store.aiSessions.length === 0" class="no-session-tip">
            尚未建立對話會話
          </div>
          <div
            v-for="(session, index) in store.aiSessions"
            :key="session.id"
            class="session-item"
            :class="{ active: session.id === store.activeAiSessionId }"
            @click="store.selectAiSession(session.id)"
          >
            <span class="session-icon">💬</span>
            <span class="session-text">
              會話 {{ store.aiSessions.length - index }} ({{
                formatDate(session.createdAt)
              }})
            </span>
          </div>
        </div>
      </div>

      <!-- 狀態 B：歷史測驗紀錄 Tab -->
      <div v-else class="tab-panel">
        <div class="session-items-container quiz-history-container">
          <div v-if="isLoadingHistory" class="loading-history-tip">
            載入歷史紀錄中...
          </div>
          <div v-else-if="quizHistory.length === 0" class="no-session-tip">
            尚無任何測驗紀錄
          </div>
          <div
            v-else
            v-for="quiz in quizHistory"
            :key="quiz.id"
            class="session-item quiz-history-item"
            :class="{ active: store.quizReport?.id === quiz.id }"
            @click="selectPastQuiz(quiz.id)"
            :title="'得分: ' + (quiz.score ?? '無') + ' 分'"
          >
            <span class="session-icon">📊</span>
            <div class="quiz-history-info">
              <span class="session-text"> 得分: {{ quiz.score }} 分 </span>
              <span class="quiz-time">
                {{ formatDate(quiz.createdAt) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useAppStore } from "../store/useAppStore";

const store = useAppStore();

const activeTab = ref<"chat" | "quiz">("chat");
const quizHistory = ref<any[]>([]);
const isLoadingHistory = ref(false);

// 載入該教材的測驗歷史紀錄
const loadQuizHistory = async () => {
  if (!store.aiMaterial) return;
  isLoadingHistory.value = true;
  try {
    const history = await store.fetchUserQuizzes(store.aiMaterial.id);
    quizHistory.value = history;
  } catch (err) {
    console.error(err);
  } finally {
    isLoadingHistory.value = false;
  }
};

// 監聽 Tab 切換，如果是切換到測驗紀錄則自動重整
// 監聽 Tab 切換，切換時自動引導至對應視圖與內容
watch(activeTab, async (newTab) => {
  store.isManagingPool = false;
  if (newTab === "quiz") {
    await loadQuizHistory();
    if (quizHistory.value.length > 0) {
      // 有歷史紀錄，自動載入最新的一筆報告
      selectPastQuiz(quizHistory.value[0].id);
    } else {
      // 沒歷史紀錄，顯示預設提示頁面
      store.activeAiSessionId = null;
      store.quizReport = null;
      store.activeQuiz = null;
      store.isQuizMode = true;
    }
  } else {
    // 切換回 AI 對話
    store.quizReport = null;
    store.activeQuiz = null;
    store.isQuizMode = false;
    if (store.aiSessions.length > 0) {
      // 預設切換至最新一個會話
      store.selectAiSession(store.aiSessions[0].id);
    } else {
      store.activeAiSessionId = null;
    }
  }
});

// 當進入測驗模式時，自動將 Tab 設定為測驗紀錄，方便退出後直接查看
watch(
  () => store.isQuizMode,
  (newVal) => {
    if (newVal) {
      activeTab.value = "quiz";
    }
  },
);

// 點擊過去的測驗紀錄查看報告
const selectPastQuiz = async (quizId: string) => {
  try {
    const report = await store.fetchQuizReportData(quizId);
    store.quizReport = report;
    store.activeQuiz = null; // 關閉答題視窗，顯示報告
    store.isQuizMode = true;
  } catch (err) {
    console.error(err);
    alert("載入測驗報告失敗！");
  }
};

// 格式化會話時間
const formatDate = (dateStr?: string) => {
  if (!dateStr) return "未知時間";
  try {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`;
  } catch {
    return "未知時間";
  }
};
</script>

<style scoped>
.ai-session-list {
  background: var(--bg-darker);
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  border-right: 0.5px solid var(--bg-darkest);
}

.list-header {
  padding: 16px 12px;
  border-bottom: 0.5px solid var(--bg-darkest);
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.back-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #dbdee1;
  font-size: 13px;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition:
    background 0.15s,
    color 0.15s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: white;
  border-color: rgba(255, 255, 255, 0.3);
}

.material-title {
  color: #949ba4;
  font-size: 11px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 4px;
}

/* Tab 切換器樣式 */
.tab-switcher {
  display: flex;
  padding: 12px 12px 6px;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  flex-shrink: 0;
}

.tab-btn {
  flex: 1;
  background: transparent;
  border: none;
  color: #949ba4;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 0;
  border-radius: 4px;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.tab-btn:hover {
  background: rgba(255, 255, 255, 0.04);
  color: #dbdee1;
}

.tab-btn.active {
  background: var(--brand-alpha-15);
  color: var(--brand-color);
}

.list-content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tab-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.action-section {
  padding: 12px;
  flex-shrink: 0;
}

.new-chat-btn {
  width: 100%;
  background: var(--brand-color);
  border: none;
  color: white;
  font-size: 13px;
  font-weight: 500;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.new-chat-btn:hover {
  background: var(--brand-hover);
}

.session-items-container {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.quiz-history-container {
  padding-top: 12px;
}

.no-session-tip,
.loading-history-tip {
  color: #949ba4;
  font-size: 12px;
  text-align: center;
  margin-top: 24px;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  color: #949ba4;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.session-item:hover {
  background: rgba(255, 255, 255, 0.04);
  color: #dbdee1;
}

.session-item.active {
  background: #404249;
  color: white;
}

.quiz-history-item {
  align-items: flex-start;
}

.quiz-history-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.quiz-time {
  font-size: 10px;
  color: #6b6f78;
  margin-top: 2px;
}

.session-icon {
  font-size: 15px;
  flex-shrink: 0;
}

.session-text {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
