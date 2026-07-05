<template>
  <div class="ai-chat-area">
    <!-- 頂部標頭 -->
    <div class="chat-header">
      <div class="header-left">
        <span class="bot-badge">🤖 AI 助教</span>
        <span class="header-divider">/</span>
        <span class="file-name" :title="store.aiMaterial?.originalName">
          {{ store.aiMaterial?.originalName }}
        </span>
      </div>
      <div class="header-actions">
        <!-- 狀態 1：處於題庫管理頁面，顯示「返回對話」 -->
        <template v-if="isManagingPool">
          <button 
            class="action-btn exit-quiz-btn" 
            @click="isManagingPool = false"
          >
            🚪 返回對話
          </button>
        </template>
        <!-- 狀態 2：測驗進行中，顯示「退出測驗」 -->
        <template v-else-if="activeQuiz">
          <button 
            class="action-btn exit-quiz-btn" 
            @click="exitQuiz"
            title="退出當前測驗"
          >
            🚪 退出測驗
          </button>
        </template>
        <!-- 狀態 3：一般狀態，未在答題中 -->
        <template v-else-if="!activeQuiz">
          <!-- 老師/助教：管理題庫 -->
          <button 
            v-if="store.isTeacherOrTA" 
            class="action-btn config-btn" 
            @click="openQuizManager"
          >
            ⚙️ 產生/管理題庫
          </button>
          <!-- 開始測驗按鈕 -->
          <button 
            class="action-btn quiz-btn" 
            @click="startQuiz"
          >
            📝 開始測驗
          </button>
        </template>

        <!-- 成員列表切換按鈕 (永久顯示於右上角，除了作答中) -->
        <button 
          v-if="!activeQuiz"
          class="action-btn member-toggle-btn"
          @click="store.showMemberList = !store.showMemberList"
          title="切換顯示成員名單"
        >
          👥
        </button>
      </div>
    </div>

    <div class="ai-chat-body-wrapper">
      <!-- 主內容區：依據狀態切換對話視窗、測驗中、測驗結果報告 -->
      <div class="main-content-container">
      
      <!-- 狀態 A: 測驗進行中 -->
      <div v-if="activeQuiz" class="quiz-container">
        <div class="quiz-card">
          <div class="quiz-card-header">
            <span class="quiz-badge">📝 教材測驗進行中</span>
            <span class="quiz-progress">第 {{ currentQuestionIndex + 1 }} / {{ activeQuiz.questions?.length }} 題</span>
          </div>

          <!-- 題型與題目 -->
          <div class="question-body">
            <div class="question-type-tag">
              {{ currentQuestion?.type === 'SINGLE_CHOICE' ? '單選題' : currentQuestion?.type === 'TRUE_FALSE' ? '是非題' : '問答題' }}
            </div>
            <h4 class="question-text markdown-body" v-html="renderMarkdown(currentQuestion?.question)"></h4>

            <!-- 單選題/是非題選項 (改為極具質感的自訂 Radio 卡片) -->
            <div v-if="currentQuestion?.options && currentQuestion.options.length > 0" class="options-list">
              <div 
                v-for="(opt, idx) in currentQuestion.options" 
                :key="opt" 
                class="option-card"
                :class="{ 'selected': isOptionSelected(opt) }"
                @click="selectOption(opt)"
              >
                <div class="radio-indicator" :class="{ 'checked': isOptionSelected(opt) }"></div>
                <span class="option-text markdown-body" v-html="renderMarkdown(formatOptionText(opt, idx))"></span>
              </div>
            </div>
          </div>

          <div class="quiz-card-footer">
            <button 
              class="btn btn-secondary" 
              :disabled="currentQuestionIndex === 0" 
              @click="prevQuestion"
            >
              上一題
            </button>
            <button 
              v-if="currentQuestionIndex < (activeQuiz.questions?.length || 0) - 1"
              class="btn btn-primary" 
              :disabled="!hasAnsweredCurrent"
              @click="nextQuestion"
            >
              下一題
            </button>
            <button 
              v-else
              class="btn btn-success" 
              :disabled="!hasAnsweredCurrent || isSubmittingQuiz"
              @click="submitQuiz"
            >
              {{ isSubmittingQuiz ? '提交批改中...' : '提交測驗 🚀' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 狀態 B: 顯示測驗報告報告 -->
      <div v-else-if="quizReport" class="report-container">
        <div class="report-card">
          <div class="report-header">
            <div class="score-circle">
              <span class="score-num">{{ quizReport.score }}</span>
              <span class="score-label">分</span>
            </div>
            <div class="report-meta">
              <h3>測驗批改報告</h3>
              <p>作答時間: {{ store.formatTimestamp ? store.formatTimestamp(quizReport.createdAt || '') : '剛剛' }}</p>
            </div>
          </div>

          <div class="report-body">
            <div 
              v-for="(rev, idx) in quizReport.reviews" 
              :key="rev.id" 
              class="review-item"
              :class="isQuestionCorrect(rev) ? 'correct' : 'incorrect'"
            >
              <div class="review-title">
                <span class="q-num">Q{{ idx + 1 }}</span>
                <span class="status-icon">{{ isQuestionCorrect(rev) ? '✓' : '✗' }}</span>
                <span class="question-text markdown-body" v-html="renderMarkdown(rev.question)"></span>
              </div>

              <!-- 顯示選項 -->
              <!-- 顯示選項 -->
              <div v-if="rev.options && rev.options.length > 0" class="review-options">
                <div 
                  v-for="(opt, idx) in rev.options" 
                  :key="opt" 
                  class="review-opt"
                  :class="getReviewOptClass(opt, rev)"
                >
                  <span class="markdown-body" v-html="renderMarkdown(formatOptionText(opt, idx))"></span>
                  <span v-if="isCorrectAnswer(opt, rev)" class="opt-badge correct">標準答案</span>
                  <span v-if="isUserAnswer(opt, rev)" class="opt-badge user">您的選擇</span>
                </div>
              </div>

              <!-- 解析說明 -->
              <div v-if="rev.explanation" class="review-explanation">
                <div class="exp-title">💡 AI 詳解分析：</div>
                <div class="exp-content markdown-body" v-html="renderMarkdown(rev.explanation.general)"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 狀態 D: 預設測驗頁面 (無歷史紀錄且未開始測驗) -->
      <div v-else-if="store.isQuizMode" class="quiz-default-container">
        <div class="quiz-default-card">
          <div class="default-icon">📊</div>
          <h3>尚無測驗紀錄</h3>
          <p>您目前在此教材中沒有任何測驗成果。點擊右上角的 <strong>「📝 開始測驗」</strong> 來挑戰自己吧！</p>
        </div>
      </div>

      <!-- 狀態 E: 題庫管理頁面 (專屬面板) -->
      <div v-else-if="isManagingPool" class="pool-dashboard-container">
        <div class="pool-dashboard-grid">
          
          <!-- 左側出題面板 -->
          <div class="pool-left-panel">
            <div class="panel-card">
              <h3>🤖 AI 題庫出題設定</h3>
              
              <div class="form-group">
                <label>出題題數</label>
                <select v-model="genCount" class="select-control">
                  <option :value="5">5 題</option>
                  <option :value="10">10 題</option>
                  <option :value="15">15 題</option>
                  <option :value="20">20 題</option>
                </select>
              </div>

              <div class="form-group">
                <label>難易度等級</label>
                <select v-model="genDifficulty" class="select-control">
                  <option value="EASY">容易 (EASY)</option>
                  <option value="MEDIUM">中等 (MEDIUM)</option>
                  <option value="HARD">困難 (HARD)</option>
                </select>
              </div>

              <button 
                class="btn btn-success start-gen-btn" 
                :disabled="isGeneratingQuestions"
                @click="startGeneratingQuestions"
              >
                {{ isGeneratingQuestions ? 'AI 正在出題中...' : '🚀 開始 AI 出題' }}
              </button>
            </div>

            <!-- SSE 出題進度條 -->
            <div v-if="isGeneratingQuestions" class="panel-card progress-card">
              <div class="progress-header">
                <h3>📡 AI 出題任務進度</h3>
                <span class="status-badge" :class="progressStatus.toLowerCase()">
                  {{ progressStatus }}
                </span>
              </div>
              <div class="progress-bar-bg">
                <div 
                  class="progress-bar-fill" 
                  :class="progressStatus.toLowerCase()"
                  :style="{ width: progressPercent + '%' }"
                ></div>
              </div>
              <div class="progress-text-info">
                <span>{{ progressText }}</span>
                <span v-if="progressStatus === 'RUNNING'">⏳ AI 分析教材出題中...</span>
                <span v-else-if="progressStatus === 'COMPLETED'" class="text-success">✓ 題庫生成成功！</span>
                <span v-else-if="progressStatus === 'FAILED'" class="text-danger">✗ 出題失敗：{{ progressError }}</span>
              </div>
            </div>
          </div>

          <!-- 右側題庫清單 -->
          <div class="pool-right-panel">
            <div class="pool-list-header">
              <h3>📚 現有題庫審查池 (目前共 {{ questionPool.length }} 題，最少需 10 題供測驗)</h3>
              <button class="btn btn-secondary refresh-btn" @click="refreshQuestionPool">
                🔃 重新整理
              </button>
            </div>

            <div v-if="isLoadingQuestionPool" class="loading-questions-tip">
              載入題庫中...
            </div>
            <div v-else-if="questionPool.length === 0" class="empty-pool-tip">
              此教材尚未產生題庫，請在左側面板設定並點擊「開始 AI 出題」。
            </div>
            <div v-else class="pool-questions-list">
              <div v-for="(q, idx) in questionPool" :key="q.id" class="pool-q-card">
                <div class="q-header">
                  <span class="q-number">第 {{ idx + 1 }} 題</span>
                  <button class="btn btn-danger delete-q-btn" @click="deleteQuestion(q.id)">
                    🗑️ 刪除此題
                  </button>
                </div>
                <div class="q-question-text markdown-body" v-html="renderMarkdown(q.question)"></div>
                
                <!-- 選項清單 -->
                <div v-if="q.options && q.options.length > 0" class="q-options-list">
                  <div 
                    v-for="(opt, oIdx) in q.options" 
                    :key="oIdx" 
                    class="q-option-item"
                    :class="{ correct: q.correctAnswer?.includes(String.fromCharCode(65 + oIdx)) }"
                  >
                    <span class="markdown-body" v-html="renderMarkdown(String.fromCharCode(65 + oIdx) + '. ' + opt)"></span>
                    <span v-if="q.correctAnswer?.includes(String.fromCharCode(65 + oIdx))" class="correct-tag">✔ 標準答案</span>
                  </div>
                </div>

                <!-- 詳解 -->
                <div v-if="q.explanation" class="q-explanation-box">
                  <strong>💡 AI 詳解與解析：</strong>
                  <div class="markdown-body" v-html="renderMarkdown(q.explanation.general)"></div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div v-else class="chat-main-flow">
        <!-- 訊息對話列表 -->
        <div class="chat-messages" ref="msgListRef">
          <!-- 歡迎導引 (無會話訊息時) -->
          <div v-if="store.aiMessages.length === 0 && !store.isAiLoading" class="welcome-guide">
            <div class="guide-logo">🤖</div>
            <h3>我是此教材的專屬 AI 助教</h3>
            <p>我已經研讀過本教材並完成了背景向量化。現在，您可以針對教材中的概念、公式、程式碼或任何疑問對我進行提問！</p>
            <div class="guide-tips">
              <div class="tip-card" @click="prefillMessage('請幫我摘要這份教材的核心重點。')">
                "請幫我摘要這份教材的核心重點。"
              </div>
              <div class="tip-card" @click="prefillMessage('這份教材裡有哪些重要的專有名詞與概念？')">
                "這份教材裡有哪些重要的專有名詞與概念？"
              </div>
            </div>
          </div>

          <!-- 對話渲染 -->
          <div v-for="msg in store.aiMessages" :key="msg.id" class="msg-row" :class="msg.role === 'user' ? 'user' : 'assistant'">
            <div class="msg-avatar" :class="msg.role === 'user' ? 'user' : 'assistant'">
              {{ msg.role === 'user' ? 'U' : '🤖' }}
            </div>
            <div class="msg-bubble">
              <div class="msg-meta">
                <span class="msg-sender">{{ msg.role === 'user' ? '您' : 'AI 助教' }}</span>
              </div>
              <!-- 使用 v-html 渲染 Markdown，如果是 user 則直接顯示純文字 -->
              <div 
                v-if="msg.role === 'model' || msg.role === 'assistant'" 
                class="msg-text markdown-body" 
                v-html="renderMarkdown(msg.content)"
              ></div>
              <div v-else class="msg-text user-text">{{ msg.content }}</div>
            </div>
          </div>

          <!-- AI 思考中動畫 -->
          <div v-if="store.isAiLoading && isLastMessageUser" class="msg-row assistant loading">
            <div class="msg-avatar assistant">🤖</div>
            <div class="msg-bubble">
              <div class="msg-meta">
                <span class="msg-sender">AI 助教</span>
              </div>
              <div class="loading-animation">
                <div class="bounce-dot"></div>
                <div class="bounce-dot"></div>
                <div class="bounce-dot"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部輸入框 (Gemini 膠囊式設計) -->
        <div class="chat-input-area">
          <div class="pill-input-wrapper">
            <textarea
              v-model="inputText"
              placeholder="向 AI 助教發送提問... (按 Enter 送出，Shift+Enter 換行)"
              rows="1"
              @keydown="handleKeyDown"
              ref="textareaRef"
            ></textarea>
            <button 
              class="send-btn" 
              :disabled="!inputText.trim() || store.isAiLoading"
              @click="handleSend"
              title="發送訊息"
            >
              ➔
            </button>
          </div>
          <div class="input-tip">AI 可能會出錯，請考慮核對重要資訊。</div>
        </div>
      </div>
    </div>
    
    <MemberList v-if="store.showMemberList && !activeQuiz" />
  </div>
</div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, computed, onUnmounted } from 'vue'
import { useAppStore } from '../store/useAppStore'
import MemberList from './MemberList.vue'
import { marked } from 'marked'

const store = useAppStore()
const inputText = ref('')
const msgListRef = ref<HTMLDivElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

// ================= 測驗進行狀態 =================
const currentQuestionIndex = ref(0)
const quizAnswers = ref<Record<string, string[]>>({})
const isSubmittingQuiz = ref(false)

const activeQuiz = computed({
  get: () => store.activeQuiz,
  set: (val) => { store.activeQuiz = val }
})

const quizReport = computed({
  get: () => store.quizReport,
  set: (val) => { store.quizReport = val }
})

const currentQuestion = computed(() => {
  if (!activeQuiz.value || !activeQuiz.value.questions) return null
  return activeQuiz.value.questions[currentQuestionIndex.value]
})

const hasAnsweredCurrent = computed(() => {
  const q = currentQuestion.value
  if (!q) return false
  const ans = quizAnswers.value[q.id]
  return ans && ans.length > 0 && ans[0].trim() !== ''
})

// 選擇單選題/是非題選項 (依據選項 index 對應大寫字母 A, B, C, D)
const isOptionSelected = (opt: string) => {
  const q = currentQuestion.value
  if (!q || !q.options) return false
  const idx = q.options.indexOf(opt)
  if (idx === -1) return false
  const letter = String.fromCharCode(65 + idx)
  const ans = quizAnswers.value[q.id]
  return ans && ans.includes(letter)
}

const selectOption = (opt: string) => {
  const q = currentQuestion.value
  if (!q || !q.options) return
  const idx = q.options.indexOf(opt)
  if (idx === -1) return
  const letter = String.fromCharCode(65 + idx)
  quizAnswers.value[q.id] = [letter]
}

// 題目切換
const nextQuestion = () => {
  if (currentQuestionIndex.value < (activeQuiz.value.questions?.length || 0) - 1) {
    currentQuestionIndex.value++
  }
}

const prevQuestion = () => {
  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--
  }
}

// 開始測驗
const startQuiz = async () => {
  if (!store.aiMaterial) return
  try {
    const quiz = await store.createMaterialQuiz(store.aiMaterial.id)
    activeQuiz.value = quiz
    currentQuestionIndex.value = 0
    quizAnswers.value = {}
    quizReport.value = null
    store.isQuizMode = true
  } catch (err: any) {
    console.error(err)
    alert(err.response?.data?.message || '發起測驗失敗！教材題庫可能不足 10 題，請聯絡老師或助教產生題庫。')
  }
}

// 提交測驗
const submitQuiz = async () => {
  if (!activeQuiz.value) return
  isSubmittingQuiz.value = true
  try {
    const report = await store.submitQuizAnswers(activeQuiz.value.id, quizAnswers.value)
    quizReport.value = report
    activeQuiz.value = null
    store.isQuizMode = true
  } catch (err: any) {
    console.error(err)
    alert('提交作答失敗，請稍後再試。')
  } finally {
    isSubmittingQuiz.value = false
  }
}

// 退出測驗 (清除測驗狀態並恢復)
const exitQuiz = () => {
  if (confirm('確定要退出測驗嗎？您目前的作答進度將不會被儲存。')) {
    activeQuiz.value = null
    currentQuestionIndex.value = 0
    quizAnswers.value = {}
  }
}


// 報告解析判定 (依據選項 index 對應大寫字母 A, B, C, D 進行比對)
const isCorrectAnswer = (opt: string, rev: any) => {
  if (!rev.options) return false
  const idx = rev.options.indexOf(opt)
  if (idx === -1) return false
  const letter = String.fromCharCode(65 + idx)
  return rev.correctAnswer && rev.correctAnswer.includes(letter)
}

const isUserAnswer = (opt: string, rev: any) => {
  if (!rev.options) return false
  const idx = rev.options.indexOf(opt)
  if (idx === -1) return false
  const letter = String.fromCharCode(65 + idx)
  return rev.userAnswer && rev.userAnswer.includes(letter)
}

const formatOptionText = (opt: string, idx: number) => {
  const letter = String.fromCharCode(65 + idx)
  const hasPrefix = /^[A-D][\.\:]/i.test(opt)
  return hasPrefix ? opt : `${letter}. ${opt}`
}

const isQuestionCorrect = (rev: any) => {
  return rev.isCorrect === true || rev.correct === true
}

const getReviewOptClass = (opt: string, rev: any) => {
  const correct = isCorrectAnswer(opt, rev)
  const user = isUserAnswer(opt, rev)

  if (correct) return 'opt-correct'
  if (user && !correct) return 'opt-wrong'
  return ''
}

// ================= 老師/助教：題庫管理 狀態 =================
const isManagingPool = computed({
  get: () => store.isManagingPool,
  set: (val) => { store.isManagingPool = val }
})
const genCount = ref(10)
const genDifficulty = ref('MEDIUM')
const isGeneratingQuestions = ref(false)
const progressStatus = ref('PENDING')
const progressPercent = ref(0)
const progressText = ref('')
const progressError = ref('')
const questionPool = ref<any[]>([])
const isLoadingQuestionPool = ref(false)
let progressEs: EventSource | null = null

const openQuizManager = async () => {
  isManagingPool.value = true
  store.isQuizMode = false
  store.activeQuiz = null
  store.quizReport = null
  await refreshQuestionPool()
}

const refreshQuestionPool = async () => {
  if (!store.aiMaterial) return
  isLoadingQuestionPool.value = true
  try {
    const pool = await store.fetchQuestionPool(store.aiMaterial.id)
    questionPool.value = pool
  } catch (err) {
    console.error(err)
  } finally {
    isLoadingQuestionPool.value = false
  }
}

const deleteQuestion = async (qId: string) => {
  if (!confirm('您確定要刪除這道考題嗎？此操作無法復原。')) return
  try {
    await store.removeQuestion(qId)
    await refreshQuestionPool()
  } catch (err) {
    alert('刪除題目失敗，請稍後再試。')
  }
}

// AI 開始出題 (SSE Progress)
const startGeneratingQuestions = async () => {
  if (!store.aiMaterial) return
  isGeneratingQuestions.value = true
  progressStatus.value = 'PENDING'
  progressPercent.value = 5
  progressText.value = '排隊等候出題...'
  progressError.value = ''

  try {
    const res = await store.triggerQuizGeneration(store.aiMaterial.id, genCount.value, genDifficulty.value)
    if (res && res.jobId) {
      subscribeProgress(res.jobId)
    }
  } catch (err: any) {
    isGeneratingQuestions.value = false
    alert(err.response?.data?.message || '發起 AI 出題任務失敗！')
  }
}

const subscribeProgress = (jobId: string) => {
  closeProgressEs()
  
  progressStatus.value = 'RUNNING'
  progressPercent.value = 25
  progressText.value = 'AI 開始解析教材...'

  progressEs = new EventSource(`http://localhost:8080/v1/materials/questions/tasks/${jobId}/stream`)

  progressEs.addEventListener('STATUS_UPDATE', (event) => {
    try {
      const data = JSON.parse(event.data)
      console.log('出題任務進度更新:', data)
      
      progressStatus.value = data.status || 'RUNNING'
      if (data.status === 'RUNNING') {
        progressPercent.value = 50
        progressText.value = 'AI 正分段出題中...'
      } else if (data.status === 'COMPLETED') {
        progressPercent.value = 100
        progressText.value = '出題成功！共新增 ' + genCount.value + ' 道考題！'
        closeProgressEs()
        setTimeout(() => {
          isGeneratingQuestions.value = false
          refreshQuestionPool()
        }, 1500)
      } else if (data.status === 'FAILED') {
        progressPercent.value = 100
        progressText.value = '出題任務失敗'
        progressError.value = data.errorMessage || '未知錯誤'
        closeProgressEs()
      }
    } catch (e) {
      console.error('解析進度資料出錯:', e)
    }
  })

  progressEs.onerror = () => {
    if (progressStatus.value !== 'COMPLETED' && progressStatus.value !== 'FAILED') {
      progressStatus.value = 'FAILED'
      progressError.value = '連線意外中斷'
    }
    closeProgressEs()
  }
}

const closeProgressEs = () => {
  if (progressEs) {
    progressEs.close()
    progressEs = null
  }
}

onUnmounted(() => {
  closeProgressEs()
})


// ================= AI 對話流程邏輯 =================
const isLastMessageUser = computed(() => {
  if (store.aiMessages.length === 0) return false
  return store.aiMessages[store.aiMessages.length - 1].role === 'user'
})

// 設定 marked 選項以支援安全與排版
marked.setOptions({
  gfm: true,
  breaks: true
})

const renderMarkdown = (text?: string) => {
  if (!text) return ''
  try {
    return marked.parse(text)
  } catch (e) {
    console.error('Markdown 解析失敗:', e)
    return text
  }
}

const prefillMessage = (text: string) => {
  inputText.value = text
  if (textareaRef.value) {
    textareaRef.value.focus()
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (msgListRef.value) {
      msgListRef.value.scrollTop = msgListRef.value.scrollHeight
    }
  })
}

// 監聽訊息變化，自動捲動
watch(
  () => store.aiMessages.length,
  () => {
    scrollToBottom()
  }
)

// 監聽正在生成的訊息內容變化
watch(
  () => {
    if (store.aiMessages.length === 0) return ''
    return store.aiMessages[store.aiMessages.length - 1].content
  },
  () => {
    scrollToBottom()
  }
)

watch(
  () => store.isAiLoading,
  () => {
    scrollToBottom()
  }
)

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    if (e.isComposing) return
    if (!e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }
}

const handleSend = async () => {
  if (!inputText.value.trim() || store.isAiLoading) return
  const text = inputText.value.trim()
  inputText.value = ''
  
  await store.sendAiMessage(text)
}

onMounted(() => {
  scrollToBottom()
})
</script>

<style scoped>
.ai-chat-area {
  flex: 1;
  background: var(--bg-dark);
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.ai-chat-body-wrapper {
  display: flex;
  flex: 1;
  min-height: 0;
  width: 100%;
}

.chat-header {
  height: 48px;
  box-sizing: border-box;
  padding: 0 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: var(--bg-dark);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.bot-badge {
  background: var(--brand-alpha-15);
  color: var(--brand-color);
  font-size: 13px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  border: none;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 16px;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}

.action-btn:active {
  transform: scale(0.97);
}

.config-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #dbdee1;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.config-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.quiz-btn {
  background: var(--brand-color);
  color: white;
}

.quiz-btn:hover {
  background: var(--brand-hover);
}

.exit-quiz-btn {
  background: #da373c;
  color: white;
}

.exit-quiz-btn:hover {
  background: #a92b2f;
}

.header-divider {
  color: #4e5058;
}

.file-name {
  color: #dbdee1;
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.main-content-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.chat-main-flow {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ================= 測驗進行中 UI 樣式 ================= */
.quiz-container {
  flex: 1;
  padding: 32px 24px;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: var(--bg-darker);
}

.quiz-card {
  width: 100%;
  max-width: 680px;
  background: var(--bg-dark);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.quiz-card-header {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quiz-badge {
  font-weight: 600;
  font-size: 14px;
  color: var(--brand-color);
}

.quiz-progress {
  font-size: 13px;
  color: #949ba4;
}

.question-body {
  padding: 24px 20px;
  flex: 1;
}

.question-type-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  background: var(--brand-alpha-15);
  color: var(--brand-color);
  padding: 2px 6px;
  border-radius: 4px;
  margin-bottom: 12px;
}

.question-text {
  color: #f2f3f5;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.5;
  margin-bottom: 24px;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-darker);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.option-card:hover {
  background: #35373c;
  border-color: rgba(255, 255, 255, 0.1);
}

.option-card.selected {
  background: rgba(66, 148, 255, 0.08);
  border-color: var(--brand-color);
}

.radio-indicator {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #80848e;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s;
}

.radio-indicator.checked {
  border-color: var(--brand-color);
}

.radio-indicator.checked::after {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--brand-color);
}

.option-text {
  color: #dbdee1;
  font-size: 14px;
}

.quiz-card-footer {
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
}

/* ================= 測驗報告 UI 樣式 ================= */
.report-container {
  flex: 1;
  padding: 32px 24px;
  overflow-y: auto;
  background: var(--bg-darker);
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.report-card {
  width: 100%;
  max-width: 720px;
  min-height: calc(100% - 40px);
  background: var(--bg-dark);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  padding: 24px;
  box-sizing: border-box;
}

/* ================= 預設測驗頁面 (Status D) ================= */
.quiz-default-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-darker);
  padding: 32px;
}

.quiz-default-card {
  text-align: center;
  max-width: 400px;
  background: var(--bg-dark);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 40px 30px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.quiz-default-card .default-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.quiz-default-card h3 {
  font-size: 20px;
  color: #f2f3f5;
  margin-bottom: 12px;
}

.quiz-default-card p {
  font-size: 14px;
  color: #949ba4;
  line-height: 1.6;
}

.report-header {
  display: flex;
  align-items: center;
  gap: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 20px;
  margin-bottom: 24px;
}

.score-circle {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(35, 165, 90, 0.15);
  border: 2px solid #23a55a;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #23a55a;
}

.score-num {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}

.score-label {
  font-size: 10px;
  font-weight: 500;
  margin-top: 2px;
}

.report-meta h3 {
  color: #f2f3f5;
  font-size: 18px;
  font-weight: 600;
}

.report-meta p {
  color: #949ba4;
  font-size: 12px;
  margin-top: 4px;
}

.close-report-btn {
  margin-left: auto;
}

.report-body {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.review-item {
  padding: 20px;
  background: var(--bg-darker);
  border-radius: 8px;
  border-left: 4px solid #80848e;
}

.review-item.correct {
  border-left-color: #23a55a;
}

.review-item.incorrect {
  border-left-color: #f23f43;
}

.review-title {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 16px;
}

.q-num {
  font-weight: 700;
  color: #f2f3f5;
  font-size: 14px;
}

.status-icon {
  font-weight: bold;
  font-size: 16px;
}

.review-item.correct .status-icon {
  color: #23a55a;
}

.review-item.incorrect .status-icon {
  color: #f23f43;
}

.review-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.review-opt {
  padding: 10px 12px;
  background: var(--bg-dark);
  border-radius: 6px;
  font-size: 13px;
  color: #dbdee1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.review-opt.opt-correct {
  background: rgba(35, 165, 90, 0.1);
  border: 1px dashed #23a55a;
}

.review-opt.opt-wrong {
  background: rgba(242, 63, 67, 0.1);
  border: 1px dashed #f23f43;
}

.opt-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}

.opt-badge.correct {
  background: #23a55a;
  color: white;
}

.opt-badge.user {
  background: var(--brand-color);
  color: white;
}

.review-explanation {
  background: var(--bg-darkest);
  padding: 12px 16px;
  border-radius: 6px;
}

.exp-title {
  font-size: 12px;
  font-weight: 600;
  color: #f59e0b;
  margin-bottom: 6px;
}

.exp-content {
  font-size: 13px;
  color: #949ba4;
  line-height: 1.5;
}

/* ================= 歡迎畫面 ================= */
.welcome-guide {
  margin: auto;
  max-width: 500px;
  text-align: center;
  padding: 20px;
}

.guide-logo {
  font-size: 48px;
  margin-bottom: 12px;
}

.welcome-guide h3 {
  color: #f2f3f5;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.welcome-guide p {
  color: #949ba4;
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 24px;
}

.guide-tips {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tip-card {
  background: rgba(43, 45, 49, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: #dbdee1;
  font-size: 13px;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, border-color 0.15s;
}

.tip-card:hover {
  background: rgba(43, 45, 49, 0.9);
  border-color: var(--brand-color);
}

/* 對話氣泡 */
.msg-row {
  display: flex;
  gap: 16px;
  max-width: 85%;
}

.msg-row.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.msg-row.model,
.msg-row.assistant {
  align-self: flex-start;
}

.msg-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
}

.msg-avatar.user {
  background: #248046;
  color: white;
}

.msg-avatar.model,
.msg-avatar.assistant {
  background: var(--brand-alpha-15);
  color: var(--brand-color);
  border: 1px solid var(--brand-alpha-30);
}

.msg-bubble {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.msg-meta {
  font-size: 11px;
  color: #949ba4;
}

.msg-row.user .msg-meta {
  text-align: right;
}

.msg-text {
  color: #dbdee1;
  font-size: 14px;
  line-height: 1.6;
  background: var(--bg-darker);
  padding: 12px 16px;
  border-radius: 8px;
  word-break: break-word;
}

.msg-row.user .msg-text.user-text {
  background: #35393e;
  border-bottom-right-radius: 0px;
  white-space: pre-wrap;
}

.msg-row.model .msg-text,
.msg-row.assistant .msg-text {
  border-bottom-left-radius: 0px;
}

/* Markdown 排版樣式微調 */
:deep(.markdown-body) {
  color: #dbdee1;
  font-size: 14px;
  line-height: 1.6;
}

:deep(.markdown-body p) {
  margin: 0 0 12px 0;
}

:deep(.markdown-body p:last-child) {
  margin-bottom: 0;
}

:deep(.markdown-body strong) {
  color: #ffffff;
  font-weight: 600;
}

:deep(.markdown-body h1),
:deep(.markdown-body h2),
:deep(.markdown-body h3) {
  color: #f2f3f5;
  font-weight: 600;
  margin-top: 16px;
  margin-bottom: 8px;
  line-height: 1.3;
}

:deep(.markdown-body h1) { font-size: 1.3em; }
:deep(.markdown-body h2) { font-size: 1.2em; }
:deep(.markdown-body h3) { font-size: 1.1em; }

:deep(.markdown-body ul) {
  padding-left: 24px;
  margin: 0 0 12px 0;
  list-style-type: disc !important;
}

:deep(.markdown-body ol) {
  padding-left: 24px;
  margin: 0 0 12px 0;
  list-style-type: decimal !important;
}

:deep(.markdown-body li) {
  margin-bottom: 6px;
  line-height: 1.5;
}

:deep(.markdown-body code) {
  background: rgba(0, 0, 0, 0.4);
  padding: 3px 6px;
  border-radius: 4px;
  font-family: Consolas, Monaco, monospace;
  font-size: 12.5px;
  color: #e06c75;
}

:deep(.markdown-body pre) {
  background: var(--bg-darkest);
  padding: 14px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 12px 0;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

:deep(.markdown-body pre code) {
  background: transparent;
  padding: 0;
  color: #dbdee1;
  font-size: 12px;
}

/* 思考中動畫 */
.loading-animation {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  background: var(--bg-darker);
  border-radius: 8px;
  width: fit-content;
}

.bounce-dot {
  width: 8px;
  height: 8px;
  background: #949ba4;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.bounce-dot:nth-child(1) {
  animation-delay: -0.32s;
}

.bounce-dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1.0);
  }
}

/* 底部輸入框 */
.chat-input-area {
  padding: 16px 24px 24px;
  background: var(--bg-dark);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.pill-input-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 760px;
  background: #383a40;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 24px;
  padding: 8px 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.pill-input-wrapper:focus-within {
  border-color: var(--brand-color);
}

.pill-input-wrapper textarea {
  flex: 1;
  background: transparent;
  border: none;
  color: #dbdee1;
  font-size: 14px;
  line-height: 1.5;
  outline: none;
  resize: none;
  padding: 4px 0;
  max-height: 120px;
  font-family: inherit;
}

.pill-input-wrapper textarea::placeholder {
  color: #6b6f78;
}

.send-btn {
  background: none;
  border: none;
  color: var(--brand-color);
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  transition: transform 0.15s, opacity 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-btn:hover:not(:disabled) {
  transform: translateX(2px);
}

.send-btn:disabled {
  color: #4e5058;
  cursor: not-allowed;
}

.input-tip {
  font-size: 11px;
  color: #6b6f78;
}

/* ================= Modal Overlay 全域樣式 ================= */
.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
}

.modal-card {
  width: 100%;
  max-width: 640px;
  height: 90%;
  background: var(--bg-dark);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.4);
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  color: #f2f3f5;
  font-size: 16px;
  font-weight: 600;
}

.close-modal-btn {
  background: none;
  border: none;
  color: #949ba4;
  font-size: 20px;
  cursor: pointer;
}

.close-modal-btn:hover {
  color: #dbdee1;
}

.modal-body {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.panel-box {
  background: var(--bg-darker);
  padding: 16px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.panel-box h4 {
  color: #f2f3f5;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.form-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-size: 11px;
  color: #949ba4;
  font-weight: 600;
}

.select-control {
  background: var(--bg-darkest);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #dbdee1;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
}

.gen-action-btn {
  height: 36px;
  padding: 0 16px;
  font-weight: 600;
}

/* SSE 進度條 */
.progress-box {
  margin-top: 16px;
  background: var(--bg-darkest);
  padding: 12px;
  border-radius: 6px;
}

.progress-text {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #949ba4;
  margin-bottom: 8px;
}

.progress-bar-bg {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  width: 0%;
  background: var(--brand-color);
  transition: width 0.3s ease;
}

.progress-bar-fill.completed {
  background: #23a55a;
}

.progress-bar-fill.failed {
  background: #f23f43;
}

/* 題庫管理列表 */
.questions-pool {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 250px;
}

.loading-pool,
.empty-pool {
  text-align: center;
  color: #949ba4;
  font-size: 13px;
  padding: 40px 0;
  margin: auto;
}

.pool-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  max-height: 320px;
  padding-right: 4px;
}

.pool-item {
  background: var(--bg-dark);
  padding: 12px 14px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.pool-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.pool-q-idx {
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-color);
  background: var(--brand-alpha-10);
  padding: 1px 6px;
  border-radius: 4px;
}

.pool-q-type {
  font-size: 10px;
  color: #949ba4;
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1px 4px;
  border-radius: 4px;
}

.delete-q-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: #f23f43;
  font-size: 12px;
  cursor: pointer;
}

.delete-q-btn:hover {
  text-decoration: underline;
}

.pool-q-text {
  color: #dbdee1;
  font-size: 13px;
  line-height: 1.4;
  margin-bottom: 8px;
}

.pool-q-options {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 12px;
}

.pool-opt {
  font-size: 12px;
  color: #949ba4;
}

/* 公用按鈕 */
.btn {
  border: none;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--brand-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--brand-hover);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #dbdee1;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
}

.btn-success {
  background: #23a55a;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #1a7f44;
}

/* ================= 題庫管理專屬面板 UI 樣式 ================= */
.pool-dashboard-container {
  flex: 1;
  background: var(--bg-darker);
  padding: 24px;
  overflow-y: auto;
}

.pool-dashboard-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
  align-items: flex-start;
}

.pool-left-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: sticky;
  top: 0;
}

.panel-card {
  background: var(--bg-dark);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.panel-card h3 {
  color: #f2f3f5;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.panel-card .form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.panel-card .form-group label {
  color: #b5bac1;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.select-control {
  background: var(--bg-darkest);
  border: 1px solid rgba(0, 0, 0, 0.3);
  color: #dbdee1;
  padding: 10px;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  cursor: pointer;
}

.start-gen-btn {
  width: 100%;
  padding: 12px;
  font-weight: 600;
  border-radius: 6px;
}

/* 進度條樣式 */
.progress-card .progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-text-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
  font-size: 13px;
  color: #949ba4;
}

.pool-right-panel {
  background: var(--bg-dark);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-height: 500px;
}

.pool-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 16px;
  margin-bottom: 20px;
}

.pool-list-header h3 {
  color: #f2f3f5;
  font-size: 16px;
  font-weight: 600;
}

.refresh-btn {
  padding: 8px 16px;
  font-size: 13px;
}

.loading-questions-tip,
.empty-pool-tip {
  color: #949ba4;
  font-size: 14px;
  text-align: center;
  padding: 60px 0;
}

.pool-questions-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.pool-q-card {
  background: var(--bg-darker);
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 18px;
}

.pool-q-card .q-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.q-number {
  color: var(--brand-color);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.delete-q-btn {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 4px;
}

.q-question-text {
  color: #f2f3f5;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.5;
  margin-bottom: 16px;
}

.q-options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.q-option-item {
  padding: 10px 14px;
  background: var(--bg-dark);
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  color: #dbdee1;
  font-size: 13px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.q-option-item.correct {
  border-color: #23a55a;
  background: rgba(35, 165, 90, 0.08);
}

.correct-tag {
  color: #23a55a;
  font-size: 11px;
  font-weight: 700;
}

.q-explanation-box {
  background: rgba(255, 255, 255, 0.02);
  border-left: 3px solid var(--brand-color);
  padding: 12px;
  border-radius: 0 6px 6px 0;
  font-size: 13px;
  color: #949ba4;
  line-height: 1.6;
}

.q-explanation-box strong {
  color: #dbdee1;
  display: block;
  margin-bottom: 4px;
}

.btn-danger {
  background: #da373c;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #a92b2f;
}

.member-toggle-btn {
  background: rgba(255, 255, 255, 0.08);
  font-size: 14px;
}

/* Markdown parsing styling inside quiz blocks */
.markdown-body :deep(p) {
  margin-top: 0;
  margin-bottom: 8px;
}
.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

/* Specific inline layout overrides for short option lists */
.option-text :deep(p),
.review-opt :deep(p),
.q-option-item :deep(p) {
  margin: 0;
  display: inline;
}

.markdown-body :deep(ul), .markdown-body :deep(ol) {
  margin: 4px 0;
  padding-left: 20px;
  display: block;
}

.markdown-body :deep(li) {
  margin: 2px 0;
  display: list-item;
}

.markdown-body :deep(pre) {
  background: var(--bg-darkest);
  padding: 8px 12px;
  border-radius: 6px;
  margin: 8px 0;
  overflow-x: auto;
  display: block;
}

.markdown-body :deep(code) {
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.markdown-body :deep(pre code) {
  background: transparent;
  padding: 0;
  border-radius: 0;
  font-family: inherit;
}
</style>

