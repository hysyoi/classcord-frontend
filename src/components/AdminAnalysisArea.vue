<template>
  <div class="admin-analysis-container">
    <!-- 左側：分析內容區 -->
    <div class="analysis-content-area">
      <!-- 錯誤提示橫幅 -->
      <div v-if="errorMessage" class="error-banner">
        <div class="error-banner-content">
          <AlertTriangleIcon class="w-5 h-5 shrink-0 text-red-400" />
          <span class="error-message-text">{{ errorMessage }}</span>
        </div>
        <button class="close-error-btn" @click="errorMessage = null">✕</button>
      </div>

      <!-- 狀態 1: 尚未選擇教材 -->
      <div v-if="!selectedMaterial" class="welcome-view">
        <div class="welcome-card">
          <div class="icon-glow">
            <FileTextIcon class="w-12 h-12 text-pink-400" />
          </div>
          <h2 class="text-2xl font-bold mt-5 mb-3 text-white">
            班級教材分析儀表板
          </h2>
          <p class="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
            請在右側清單點選已上傳的課程教材，查看學生的個人自主測驗錯題分佈，或是查看
            AI 針對學生日常提問彙整出的疑問焦點與教學對策。
          </p>
        </div>
      </div>

      <!-- 狀態 2: 載入中 -->
      <div v-else-if="loadingAnalysis" class="analysis-loading-view">
        <RefreshCwIcon class="animate-spin w-10 h-10 text-pink-400" />
        <span class="mt-4 text-sm text-slate-400">正在獲取班級分析數據...</span>
      </div>

      <!-- 狀態 3: 顯示分析詳情 -->
      <div v-else class="analysis-detail-view">
        <!-- 頂部教材名稱與分頁按鈕 -->
        <div class="detail-header">
          <div class="header-title-row">
            <span class="book-badge">教材</span>
            <h2 class="material-title-text">
              {{ selectedMaterial.originalName }}
            </h2>
          </div>
          <!-- Tabs 分頁 -->
          <div class="tabs-list">
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'wrong-questions' }"
              @click="toggleTab('wrong-questions')"
            >
              ❌ 錯題分佈統計
            </button>
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'doubts' }"
              @click="toggleTab('doubts')"
            >
              💡 學生疑問焦點 (AI)
            </button>
          </div>
        </div>

        <div class="tab-body">
          <!-- 錯題分佈分頁 -->
          <div
            v-if="activeTab === 'wrong-questions'"
            class="wrong-questions-tab"
          >
            <div v-if="wrongQuestions.length === 0" class="empty-state">
              <CheckCircleIcon class="w-12 h-12 text-slate-500 mb-2" />
              <p class="text-slate-400">目前尚無此教材的測驗作答記錄</p>
            </div>

            <div v-else class="questions-list-wrapper">
              <div
                v-for="(q, idx) in wrongQuestions"
                :key="q.questionId"
                class="question-card"
              >
                <!-- 卡片頂部資訊 -->
                <div class="q-card-header">
                  <div class="q-index-badge">第 {{ idx + 1 }} 題</div>
                  <h3 class="q-title-text">{{ q.question }}</h3>

                  <!-- 錯誤率 Badge -->
                  <span
                    class="error-badge"
                    :class="getErrorRateClass(q.errorRate)"
                  >
                    錯誤率 {{ (q.errorRate * 100).toFixed(0) }}%
                  </span>
                </div>

                <!-- 答題次數簡報 -->
                <div class="q-stats-row">
                  <span
                    >總作答次數：<strong>{{ q.totalAttempts }}</strong></span
                  >
                  <span class="divider">|</span>
                  <span
                    >答錯人數：<strong class="text-pink-400">{{
                      q.wrongAttempts
                    }}</strong></span
                  >
                </div>

                <!-- 選項比例分佈圖 -->
                <div class="option-distribution-section">
                  <div
                    v-for="(opt, oIdx) in q.options"
                    :key="opt"
                    class="option-row"
                  >
                    <div class="option-label-bar">
                      <span
                        class="option-key"
                        :class="{
                          'is-correct': isCorrectOption(q.correctAnswer, oIdx),
                        }"
                      >
                        {{ getOptionKey(oIdx) }}
                      </span>
                      <span class="option-content-text">{{ opt }}</span>
                      <span
                        class="option-count"
                        v-if="getOptionCount(q.optionDistribution, oIdx) > 0"
                      >
                        {{ getOptionCount(q.optionDistribution, oIdx) }} 票 ({{
                          getOptionPercentage(
                            q.optionDistribution,
                            q.totalAttempts,
                            oIdx,
                          )
                        }}%)
                      </span>
                      <span class="option-count text-slate-500" v-else
                        >0 票</span
                      >
                    </div>
                    <!-- 比例條 -->
                    <div class="progress-bar-bg">
                      <div
                        class="progress-bar-fill"
                        :class="{
                          'is-correct-fill': isCorrectOption(
                            q.correctAnswer,
                            oIdx,
                          ),
                        }"
                        :style="{
                          width:
                            getOptionPercentage(
                              q.optionDistribution,
                              q.totalAttempts,
                              oIdx,
                            ) + '%',
                        }"
                      ></div>
                    </div>
                  </div>
                </div>

                <!-- 展開解析部分 -->
                <div class="explanation-accordion">
                  <button
                    class="accordion-toggle"
                    @click="toggleExplanation(q.questionId)"
                  >
                    <span>📖 查看本題詳解與回饋</span>
                    <ChevronDownIcon
                      class="accordion-arrow w-4 h-4 transition-transform duration-200"
                      :class="{
                        'rotate-180': expandedExplanations.has(q.questionId),
                      }"
                    />
                  </button>
                  <div
                    class="accordion-content"
                    v-if="expandedExplanations.has(q.questionId)"
                  >
                    <div class="explanation-block">
                      <div class="block-title">本題正解</div>
                      <div class="correct-answer-text">
                        {{ q.correctAnswer.join(", ") }}
                      </div>
                    </div>

                    <div
                      class="explanation-block"
                      v-if="q.explanation?.general"
                    >
                      <div class="block-title">通用解析</div>
                      <p class="explanation-text">
                        {{ q.explanation.general }}
                      </p>
                    </div>

                    <div
                      class="explanation-block"
                      v-if="hasOptionExplanations(q.explanation)"
                    >
                      <div class="block-title">各選項針對性解析</div>
                      <div class="option-explanations">
                        <div
                          v-for="(exp, optKey) in q.explanation.options"
                          :key="optKey"
                          class="opt-exp-item"
                        >
                          <span
                            class="opt-key-badge"
                            :class="{
                              'is-correct': isCorrectOptionKey(
                                String(optKey),
                                q.correctAnswer,
                              ),
                            }"
                          >
                            選項 {{ optKey }}
                          </span>
                          <span class="opt-exp-text">{{ exp }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- AI 疑問焦點分頁 -->
          <div v-else-if="activeTab === 'doubts'" class="doubts-tab">
            <!-- 重新分析按鈕與頂部摘要 -->
            <div class="doubts-controls">
              <p class="summary-text text-sm text-slate-400">
                本分析為彙整學生最近與 AI 助理的對話紀錄。AI
                會自動過濾打招呼、感謝等非學習的閒聊對話。
              </p>
              <button
                class="btn-regenerate"
                @click="loadDoubtAnalysis(true)"
                :disabled="loadingDoubt"
              >
                <RefreshCwIcon
                  class="w-4 h-4 mr-2"
                  :class="{ 'animate-spin': loadingDoubt }"
                />
                {{
                  loadingDoubt
                    ? "正在運行 AI 分析..."
                    : doubtAnalysis && doubtAnalysis.totalQuestionsAnalyzed > 0
                      ? "重新分析"
                      : "開始分析"
                }}
              </button>
            </div>

            <!-- 分析載入中 -->
            <div v-if="loadingDoubt" class="doubts-loading-state">
              <RefreshCwIcon class="animate-spin w-8 h-8 text-pink-400 mb-2" />
              <p class="text-sm text-slate-400">
                正在分析學生對話記錄、歸納學習焦點...
              </p>
            </div>

            <!-- 分析結果 -->
            <div v-else-if="doubtAnalysis" class="doubts-result-wrapper">
              <!-- 總問題數資訊 -->
              <div class="doubt-stats-banner">
                💡 本教材共分析了
                <strong class="text-pink-400">{{
                  doubtAnalysis.totalQuestionsAnalyzed
                }}</strong>
                筆學生向 AI 助理發問的學習對話。
              </div>

              <!-- 無問題資料 -->
              <div
                v-if="
                  !doubtAnalysis.themes || doubtAnalysis.themes.length === 0
                "
                class="empty-state"
              >
                <CheckCircleIcon class="w-12 h-12 text-slate-500 mb-2" />
                <p class="text-slate-400">
                  此教材最近無相關的學生發問對話，尚無歸納主題
                </p>
              </div>

              <!-- 主題列表 -->
              <div v-else class="themes-list">
                <div
                  v-for="(theme, index) in doubtAnalysis.themes"
                  :key="index"
                  class="theme-card"
                >
                  <!-- 主題頂部 -->
                  <div class="theme-header">
                    <span class="theme-index">主題 {{ index + 1 }}</span>
                    <h3 class="theme-name">{{ theme.themeName }}</h3>
                  </div>

                  <!-- 主題描述 -->
                  <p class="theme-description">{{ theme.description }}</p>

                  <!-- 學生發問代表語句 -->
                  <div
                    class="student-questions-section"
                    v-if="theme.questions?.length"
                  >
                    <div class="section-label">代表性學生提問：</div>
                    <ul class="quotes-list">
                      <li
                        v-for="(q, qIdx) in theme.questions"
                        :key="qIdx"
                        class="quote-item"
                      >
                        「 {{ q }} 」
                      </li>
                    </ul>
                  </div>

                  <!-- 教學改善對策建議 -->
                  <div
                    class="teaching-recommendation-box"
                    v-if="theme.recommendation"
                  >
                    <div class="rec-header">
                      <LightbulbIcon class="w-4 h-4 text-amber-400 shrink-0" />
                      <span class="rec-title">給教師與助教的教學建議：</span>
                    </div>
                    <p class="rec-text">{{ theme.recommendation }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- 無分析資料的初始狀態 -->
            <div v-else class="empty-state">
              <HelpCircleIcon class="w-12 h-12 text-slate-500 mb-2" />
              <p class="text-slate-400">
                此教材尚未進行過 AI 疑問分析。請點擊上方「開始分析
                (AI)」按鈕開啟分析。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右側：教材選擇清單 -->
    <div class="materials-sidebar">
      <div class="sidebar-header">
        <h3 class="title">選擇教材</h3>
        <span class="count-badge" v-if="materials.length">{{
          materials.length
        }}</span>
      </div>
      <div class="materials-list" v-if="!loadingMaterials">
        <button
          v-for="mat in materials"
          :key="mat.id"
          class="material-item"
          :class="{ active: selectedMaterial?.id === mat.id }"
          @click="selectMaterial(mat)"
        >
          <span class="file-icon"><BookOpenIcon class="w-4 h-4" /></span>
          <span class="file-name" :title="mat.originalName">{{
            mat.originalName
          }}</span>
          <ChevronRightIcon class="chevron-icon w-4 h-4" />
        </button>
        <div v-if="materials.length === 0" class="empty-list-text">
          此伺服器尚無已上傳之教材
        </div>
      </div>
      <div v-else class="sidebar-loading">
        <RefreshCwIcon class="animate-spin w-5 h-5 text-slate-400" />
        <span class="mt-2 text-xs text-slate-500">正在讀取教材...</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from "vue";
import { useAppStore } from "@/store/useAppStore";
import {
  BookOpen as BookOpenIcon,
  ChevronRight as ChevronRightIcon,
  ChevronDown as ChevronDownIcon,
  FileText as FileTextIcon,
  RefreshCw as RefreshCwIcon,
  CheckCircle as CheckCircleIcon,
  Lightbulb as LightbulbIcon,
  HelpCircle as HelpCircleIcon,
  AlertTriangle as AlertTriangleIcon,
} from "lucide-vue-next";

const store = useAppStore();

const materials = ref<any[]>([]);
const selectedMaterial = ref<any | null>(null);
const activeTab = ref<"wrong-questions" | "doubts">("wrong-questions");

const loadingMaterials = ref(false);
const loadingAnalysis = ref(false);
const loadingDoubt = ref(false);
const errorMessage = ref<string | null>(null);

const wrongQuestions = ref<any[]>([]);
const doubtAnalysis = ref<any | null>(null);

const expandedExplanations = ref<Set<string>>(new Set());

// 載入教材清單
const loadMaterials = async () => {
  loadingMaterials.value = true;
  errorMessage.value = null;
  try {
    materials.value = await store.fetchServerMaterials();
  } catch (err: any) {
    console.error("載入伺服器教材清單失敗:", err);
    errorMessage.value =
      "載入教材清單失敗：" +
      (err.response?.data?.message || err.message || "未知錯誤");
  } finally {
    loadingMaterials.value = false;
  }
};

// 選擇教材並載入分析
const selectMaterial = async (mat: any) => {
  selectedMaterial.value = mat;
  activeTab.value = "wrong-questions"; // 切換教材時，自動切回到錯題統計，防範觸發 AI 分析
  expandedExplanations.value.clear();
  wrongQuestions.value = [];
  doubtAnalysis.value = null;
  errorMessage.value = null;

  loadingAnalysis.value = true;
  try {
    await loadWrongQuestions();
  } catch (err: any) {
    console.error("載入教材分析資料失敗:", err);
    errorMessage.value =
      "載入教材分析失敗：" +
      (err.response?.data?.message || err.message || "未知錯誤");
  } finally {
    loadingAnalysis.value = false;
  }
};

// 載入錯題分析
const loadWrongQuestions = async () => {
  if (!selectedMaterial.value) return;
  errorMessage.value = null;
  try {
    wrongQuestions.value =
      (await store.fetchWrongQuestionsAnalysis(selectedMaterial.value.id)) ||
      [];
  } catch (err: any) {
    console.error("載入錯題分析失敗:", err);
    errorMessage.value =
      "載入錯題分析失敗：" +
      (err.response?.data?.message || err.message || "未知錯誤");
  }
};

// 載入疑問分析 (force: 是否強制重新召喚 AI 重新分析)
const loadDoubtAnalysis = async (force = false) => {
  if (!selectedMaterial.value) return;
  errorMessage.value = null;
  if (force) {
    loadingDoubt.value = true;
  }
  try {
    doubtAnalysis.value = await store.fetchDoubtAnalysis(
      selectedMaterial.value.id,
      force,
    );
  } catch (err: any) {
    console.error("載入學生疑問分析失敗:", err);
    if (err.response?.status === 404) {
      // 404 表示尚未進行過 AI 分析，屬於正常初始狀態
      doubtAnalysis.value = null;
    } else {
      errorMessage.value =
        err.response?.data?.message || err.message || "AI 疑問分析失敗";
    }
  } finally {
    if (force) {
      loadingDoubt.value = false;
    }
  }
};

// 監聽 Tab 切換，自動加載對應數據
const toggleTab = async (tab: "wrong-questions" | "doubts") => {
  activeTab.value = tab;
  if (!selectedMaterial.value) return;
  errorMessage.value = null;

  if (tab === "wrong-questions" && wrongQuestions.value.length === 0) {
    loadingAnalysis.value = true;
    await loadWrongQuestions();
    loadingAnalysis.value = false;
  } else if (tab === "doubts" && !doubtAnalysis.value) {
    loadingAnalysis.value = true;
    await loadDoubtAnalysis(false);
    loadingAnalysis.value = false;
  }
};

// 展開/收合題目詳解
const toggleExplanation = (questionId: string) => {
  if (expandedExplanations.value.has(questionId)) {
    expandedExplanations.value.delete(questionId);
  } else {
    expandedExplanations.value.add(questionId);
  }
};

// 計算錯誤率的樣式類型
const getErrorRateClass = (rate: number) => {
  if (rate >= 0.6) return "error-high";
  if (rate >= 0.3) return "error-medium";
  return "error-low";
};

// 解析選項中的代號 (根據陣列 index 轉換成 A, B, C, D)
const getOptionKey = (index: number) => {
  return String.fromCharCode(65 + index);
};

// 檢查是否為正確答案選項
const isCorrectOption = (correctAnswers: string[], index: number) => {
  const key = getOptionKey(index);
  return correctAnswers.includes(key);
};

// 檢查選項代號是否在正確答案中
const isCorrectOptionKey = (key: string, correctAnswers: string[]) => {
  return correctAnswers.includes(key);
};

// 取得特定選項的票數
const getOptionCount = (
  distribution: Record<string, number>,
  index: number,
) => {
  if (!distribution) return 0;
  const key = getOptionKey(index);
  return distribution[key] || 0;
};

// 取得特定選項的百分比
const getOptionPercentage = (
  distribution: Record<string, number>,
  total: number,
  index: number,
) => {
  if (total === 0 || !distribution) return 0;
  const count = getOptionCount(distribution, index);
  return Math.round((count / total) * 100);
};

// 檢查是否有選項級解析
const hasOptionExplanations = (explanation: any) => {
  return (
    explanation &&
    explanation.options &&
    Object.keys(explanation.options).length > 0
  );
};

onMounted(() => {
  loadMaterials();
});
</script>

<style scoped>
.admin-analysis-container {
  display: flex;
  height: 100%;
  background: var(--bg-dark);
  color: #dbdee1;
  overflow: hidden;
  width: 100%;
}

/* 左側分析主內容區 */
.analysis-content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  min-width: 0;
}

/* 錯誤提示橫幅 */
.error-banner {
  background: rgba(239, 68, 68, 0.15);
  border-bottom: 1px solid rgba(239, 68, 68, 0.25);
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-shrink: 0;
}

.error-banner-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.error-message-text {
  font-size: 13px;
  color: #f87171;
  font-weight: bold;
}

.close-error-btn {
  background: transparent;
  border: none;
  color: #949ba4;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  transition: color 0.15s ease;
}

.close-error-btn:hover {
  color: #ffffff;
}

/* 右側側邊欄 (現在移至右手邊) */
.materials-sidebar {
  width: 250px;
  background: var(--bg-darkest);
  border-left: 1px solid rgba(255, 255, 255, 0.04);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-header .title {
  font-size: 14px;
  font-weight: bold;
  color: #949ba4;
  letter-spacing: 0.5px;
}

.count-badge {
  background: rgba(255, 102, 125, 0.2);
  color: var(--brand-color);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: bold;
}

.materials-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.material-item {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 4px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #949ba4;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  gap: 8px;
}

.material-item:hover {
  background: rgba(255, 255, 255, 0.03);
  color: #dbdee1;
}

.material-item.active {
  background: rgba(255, 102, 125, 0.1);
  color: var(--brand-color);
  font-weight: bold;
}

.file-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
}

.file-name {
  flex: 1;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chevron-icon {
  opacity: 0;
  transition: opacity 0.15s ease;
}

.material-item:hover .chevron-icon,
.material-item.active .chevron-icon {
  opacity: 0.8;
}

.empty-list-text {
  padding: 16px;
  text-align: center;
  font-size: 12px;
  color: #80848e;
}

.sidebar-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* 歡迎區 / 載入區 */
.welcome-view {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--bg-dark);
}

.welcome-card {
  text-align: center;
  background: rgba(30, 31, 34, 0.4);
  padding: 40px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(8px);
}

.icon-glow {
  display: inline-flex;
  padding: 16px;
  border-radius: 50%;
  background: rgba(255, 102, 125, 0.1);
  box-shadow: 0 0 20px rgba(255, 102, 125, 0.2);
}

.analysis-loading-view,
.doubts-loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.analysis-detail-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-header {
  padding: 20px 24px 0 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  background: rgba(30, 31, 34, 0.2);
  flex-shrink: 0;
}

.header-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.book-badge {
  background: rgba(255, 255, 255, 0.1);
  color: #dbdee1;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: bold;
}

.material-title-text {
  font-size: 18px;
  font-weight: bold;
  color: #ffffff;
}

.tabs-list {
  display: flex;
  gap: 16px;
}

.tab-btn {
  padding: 8px 16px;
  font-size: 14px;
  color: #949ba4;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  padding-bottom: 12px;
}

.tab-btn:hover {
  color: #dbdee1;
}

.tab-btn.active {
  color: var(--brand-color);
  border-bottom-color: var(--brand-color);
  font-weight: bold;
}

.tab-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.wrong-questions-tab {
  height: 100%;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  text-align: center;
}

.questions-list-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.question-card {
  background: rgba(30, 31, 34, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 20px;
  transition:
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.question-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 102, 125, 0.2);
}

.q-card-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.q-index-badge {
  background: rgba(255, 255, 255, 0.08);
  color: #949ba4;
  font-size: 11px;
  font-weight: bold;
  padding: 3px 8px;
  border-radius: 4px;
  flex-shrink: 0;
  margin-top: 2px;
}

.q-title-text {
  font-size: 15px;
  font-weight: bold;
  color: #ffffff;
  flex: 1;
  line-height: 1.5;
}

.error-badge {
  font-size: 12px;
  font-weight: bold;
  padding: 4px 10px;
  border-radius: 20px;
  flex-shrink: 0;
}

.error-high {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.error-medium {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.error-low {
  background: rgba(148, 155, 164, 0.15);
  color: #949ba4;
}

.q-stats-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #949ba4;
  margin-bottom: 16px;
}

.q-stats-row .divider {
  opacity: 0.3;
}

.option-distribution-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(20, 21, 23, 0.3);
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.option-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.option-label-bar {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #dbdee1;
  gap: 8px;
}

.option-key {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: bold;
  color: #949ba4;
}

.option-key.is-correct {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
}

.option-content-text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.option-count {
  font-size: 12px;
  font-weight: bold;
  color: #949ba4;
}

.progress-bar-bg {
  height: 6px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: rgba(255, 102, 125, 0.5);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-bar-fill.is-correct-fill {
  background: rgba(34, 197, 94, 0.5);
}

.explanation-accordion {
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  padding-top: 12px;
}

.accordion-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: none;
  background: transparent;
  color: #949ba4;
  font-size: 13px;
  cursor: pointer;
  padding: 4px 0;
  transition: color 0.15s ease;
}

.accordion-toggle:hover {
  color: #dbdee1;
}

.accordion-content {
  margin-top: 12px;
  background: rgba(20, 21, 23, 0.5);
  border-radius: 6px;
  padding: 16px;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.explanation-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.explanation-block .block-title {
  font-size: 11px;
  font-weight: bold;
  color: #80848e;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.correct-answer-text {
  color: #4ade80;
  font-weight: bold;
}

.explanation-text {
  color: #dbdee1;
  line-height: 1.5;
}

.option-explanations {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.opt-exp-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  line-height: 1.5;
}

.opt-key-badge {
  font-size: 10px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  flex-shrink: 0;
  margin-top: 2px;
}

.opt-key-badge.is-correct {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
}

.opt-exp-text {
  color: #949ba4;
}

.doubts-tab {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.doubts-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(30, 31, 34, 0.3);
  padding: 16px 20px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.03);
  gap: 16px;
}

.summary-text {
  max-w: 70%;
  line-height: 1.4;
}

.btn-regenerate {
  display: flex;
  align-items: center;
  background: var(--brand-color);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.15s ease;
  white-space: nowrap;
}

.btn-regenerate:hover:not(:disabled) {
  background: #ff8597;
}

.btn-regenerate:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.doubt-stats-banner {
  background: rgba(255, 102, 125, 0.08);
  border-left: 4px solid var(--brand-color);
  padding: 12px 16px;
  border-radius: 0 8px 8px 0;
  font-size: 14px;
  color: #dbdee1;
}

.themes-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.theme-card {
  background: rgba(30, 31, 34, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-left: 4px solid var(--brand-color);
  border-radius: 0 8px 8px 0;
  padding: 20px;
  transition: border-color 0.2s ease;
}

.theme-card:hover {
  border-left-color: #ff8597;
}

.theme-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.theme-index {
  font-size: 11px;
  font-weight: bold;
  color: var(--brand-color);
  background: rgba(255, 102, 125, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.theme-name {
  font-size: 16px;
  font-weight: bold;
  color: #ffffff;
}

.theme-description {
  font-size: 14px;
  color: #dbdee1;
  line-height: 1.6;
  margin-bottom: 16px;
}

.student-questions-section {
  margin-bottom: 16px;
}

.student-questions-section .section-label {
  font-size: 12px;
  font-weight: bold;
  color: #80848e;
  margin-bottom: 8px;
}

.quotes-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.quote-item {
  font-size: 13px;
  font-style: italic;
  color: #949ba4;
  background: rgba(20, 21, 23, 0.3);
  padding: 8px 12px;
  border-radius: 4px;
  border-left: 2px solid rgba(255, 255, 255, 0.1);
}

.teaching-recommendation-box {
  background: rgba(245, 158, 11, 0.06);
  border: 1px solid rgba(245, 158, 11, 0.15);
  border-radius: 6px;
  padding: 14px 16px;
}

.rec-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.rec-title {
  font-size: 12px;
  font-weight: bold;
  color: #fbbf24;
}

.rec-text {
  font-size: 13px;
  color: #fbbf24;
  line-height: 1.5;
  opacity: 0.9;
}
</style>
