<template>
  <div class="ai-session-list">
    <!-- 頂部：返回與標題 -->
    <div class="list-header">
      <button class="back-btn" @click="store.exitAiMode" title="回到班級頻道">
        <ArrowLeftBoldIcon />返回班級頻道
      </button>
      <!--      <div class="material-title" :title="store.aiMaterial?.originalName">-->
      <!--        {{ store.aiMaterial?.originalName }}-->
      <!--      </div>-->
    </div>

    <!-- Tab 切換器 (對話會話 vs 測驗紀錄) -->
    <div class="tab-switcher">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'chat' }"
        @click="handleTabClick('chat')"
      >
        <AiFillIcon /> AI 對話
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'quiz' }"
        @click="handleTabClick('quiz')"
      >
        <PaperLineIcon />測驗紀錄
      </button>
    </div>

    <!-- 內容區依據 Tab 切換 -->
    <div class="list-content-area">
      <!-- 狀態 A：對話會話 Tab -->
      <div v-if="activeTab === 'chat'" class="tab-panel">
        <!-- 新增對話按鈕 -->
        <div class="action-section">
          <button class="new-chat-btn" @click="store.createNewAiSession">
            <PlusIcon />新建對話
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
            <span class="session-icon"></span>
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
        <div
          ref="quizHistoryScrollRef"
          @scroll="handleQuizHistoryScroll"
          class="session-items-container quiz-history-container"
        >
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
            :title="'得分' + (quiz.score ?? '無') + ' 分'"
          >
            <span class="session-icon"></span>
            <div class="quiz-history-info">
              <span class="session-text"> 得分 {{ quiz.score }} 分 </span>
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
import { ref, watch, nextTick, onMounted } from "vue";
import { useAppStore } from "../store/useAppStore";
import ArrowLeftBoldIcon from "~icons/ep/arrow-left-bold";
import AiFillIcon from "~icons/mingcute/ai-fill";
import PaperLineIcon from "~icons/mingcute/paper-line";
import PlusIcon from "~icons/typcn/plus";
const store = useAppStore();

const activeTab = ref<"chat" | "quiz">(store.isQuizMode ? "quiz" : "chat");
const quizHistory = ref<any[]>([]);
const isLoadingHistory = ref(false);
const quizHistoryScrollRef = ref<HTMLElement | null>(null);

// 載入該教材的測驗歷史紀錄
const loadQuizHistory = async () => {
  if (!store.aiMaterial) return;
  isLoadingHistory.value = true;
  try {
    const history = await store.fetchUserQuizzes(store.aiMaterial.id);
    quizHistory.value = history;
    nextTick(() => {
      if (quizHistoryScrollRef.value && store.aiMaterial) {
        const saved = store.quizHistoryScrollPositions[store.aiMaterial.id];
        if (saved !== undefined) {
          quizHistoryScrollRef.value.scrollTop = saved;
        }
      }
    });
  } catch (err) {
    console.error(err);
  } finally {
    isLoadingHistory.value = false;
  }
};

const handleQuizHistoryScroll = () => {
  if (quizHistoryScrollRef.value && store.aiMaterial) {
    store.quizHistoryScrollPositions[store.aiMaterial.id] =
      quizHistoryScrollRef.value.scrollTop;
  }
};

// 處理 Tab 點擊事件
const handleTabClick = async (tab: "chat" | "quiz") => {
  store.isManagingPool = false;
  if (tab === "quiz") {
    store.isQuizMode = true;
    // 如果點擊時已經是 quiz，watch 沒觸發，手動載入與選擇歷史紀錄
    if (activeTab.value === "quiz") {
      await loadQuizHistory();
      if (!store.activeQuiz) {
        const currentReportId = store.quizReport?.id;
        const hasCurrentReport =
          currentReportId &&
          quizHistory.value.some((q) => q.id === currentReportId);
        if (hasCurrentReport) {
          selectPastQuiz(currentReportId);
        } else if (quizHistory.value.length > 0) {
          selectPastQuiz(quizHistory.value[0].id);
        } else {
          store.activeAiSessionId = null;
          store.quizReport = null;
        }
      }
    } else {
      activeTab.value = "quiz";
    }
  } else {
    store.isQuizMode = false;
    if (activeTab.value === "chat") {
      store.activeQuiz = null;
      if (store.aiSessions.length > 0) {
        const currentId = store.activeAiSessionId;
        const hasCurrent =
          currentId && store.aiSessions.some((s) => s.id === currentId);
        if (hasCurrent) {
          store.selectAiSession(currentId);
        } else {
          store.selectAiSession(store.aiSessions[0].id);
        }
      } else {
        store.activeAiSessionId = null;
      }
    } else {
      activeTab.value = "chat";
    }
  }
};

// 監聽 Tab 切換，切換時自動引導至對應視圖與內容
watch(activeTab, async (newTab) => {
  store.isManagingPool = false;
  if (newTab === "quiz") {
    await loadQuizHistory();
    // 只有在當前沒有進行中測驗時，才載入歷史紀錄報告
    if (!store.activeQuiz) {
      const currentReportId = store.quizReport?.id;
      const hasCurrentReport =
        currentReportId &&
        quizHistory.value.some((q) => q.id === currentReportId);
      if (hasCurrentReport) {
        selectPastQuiz(currentReportId);
      } else if (quizHistory.value.length > 0) {
        selectPastQuiz(quizHistory.value[0].id);
      } else {
        store.activeAiSessionId = null;
        store.quizReport = null;
        store.activeQuiz = null;
        store.isQuizMode = true;
      }
    }
  } else {
    // 切換回 AI 對話
    store.activeQuiz = null;
    store.isQuizMode = false;
    if (store.aiSessions.length > 0) {
      const currentId = store.activeAiSessionId;
      const hasCurrent =
        currentId && store.aiSessions.some((s) => s.id === currentId);
      if (hasCurrent) {
        store.selectAiSession(currentId);
      } else {
        store.selectAiSession(store.aiSessions[0].id);
      }
    } else {
      store.activeAiSessionId = null;
    }
  }
});

// 當進行中測驗狀態改變時（例如退出或提交測驗），若在測驗頁籤下，自動載入並選取最新的一筆歷史紀錄
watch(
  () => store.activeQuiz,
  async (newVal, oldVal) => {
    if (!newVal && oldVal && store.isQuizMode) {
      await loadQuizHistory();
      if (quizHistory.value.length > 0) {
        selectPastQuiz(quizHistory.value[0].id);
      } else {
        store.quizReport = null;
      }
    }
  },
);

// 監聽測驗模式與題庫管理狀態，同步更新左側 Tab 高亮
watch(
  () => [store.isQuizMode, store.isManagingPool],
  ([isQuiz, isManaging]) => {
    if (isQuiz) {
      activeTab.value = "quiz";
    } else if (!isManaging) {
      activeTab.value = "chat";
    }
  },
);

onMounted(async () => {
  if (activeTab.value === "quiz") {
    await loadQuizHistory();
    // 只有在當前沒有進行中測驗時，才載入歷史紀錄報告
    if (!store.activeQuiz) {
      const currentReportId = store.quizReport?.id;
      const hasCurrentReport =
        currentReportId &&
        quizHistory.value.some((q) => q.id === currentReportId);
      if (hasCurrentReport) {
        selectPastQuiz(currentReportId);
      } else if (quizHistory.value.length > 0) {
        selectPastQuiz(quizHistory.value[0].id);
      }
    }
  }
});

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
  background: var(--bg-main-dark);
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.list-header {
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  color: var(--bg-main-dark-text-muted);
  font-size: 13px;
  font-weight: 500;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition:
    background 0.15s,
    color 0.15s;
}

.back-btn:hover {
  background: var(--bg-main-dark-hover);
  color: white;
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
  padding-left: 3px;
  margin-top: 4px;
}

/* Tab 切換器樣式 */
.tab-switcher {
  display: flex;
  padding: 5px 6px 5px 6px;
  margin: 0 12px;
  flex-shrink: 0;
  gap: 5px;
  background: var(--bg-surface);
  border-radius: 6px;
}

.tab-btn {
  flex: 1;
  background: transparent;
  border: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  color: var(--bg-surface-light-text-muted);
  font-size: 13px;
  font-weight: 600;
  padding: 8px 8px;
  border-radius: 4px;
  text-align: center;
  justify-content: center;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.tab-btn:hover {
  color: #ffffff;
}

.tab-btn.active {
  background: var(--bg-surface-light);
  color: var(--primary);
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
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  background: var(--primary);
  justify-content: center;
  border: none;
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  padding: 10px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.new-chat-btn:hover {
  background: var(--primary-muted);
}

.session-items-container {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px 0 12px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.quiz-history-container {
  padding-top: 12px;
}

.no-session-tip,
.loading-history-tip {
  color: var(--bg-main-dark-text-muted);
  font-size: 12px;
  text-align: center;
  margin-top: 24px;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 2px;
  border-radius: 6px;
  color: var(--bg-main-dark-text-muted);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.session-item:hover {
  background: var(--bg-main-dark-hover);
  color: #ffffff;
}

.session-item.active {
  background: var(--bg-main-dark-hover);
  color: #ffffff;
}

.quiz-history-item {
  align-items: flex-start;
  padding: 10px 2px;
}

.quiz-history-info {
  display: flex;
  min-width: 0;
  /*flex-direction: column;*/
  justify-content: space-between;
  width: 100%;
  padding-right: 8px;
}

.quiz-time {
  font-size: 10px;
  color: var(--bg-main-text-muted);
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
