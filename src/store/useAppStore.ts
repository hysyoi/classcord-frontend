import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getJoinedServers, getChannels, getMessages, getMaterial, getServerMembers, enableAiAssistant, listSessions, createSession, getSessionMessages, generateQuestions, getQuestionPool, deleteQuestion, createQuiz, submitQuiz, getQuizReport, getUserQuizzes, getUploadUrl, postMaterial, getUserProfile } from '@/api/generated'
import type { ServerMemberResponse } from '@/api/generated'
import { Client } from '@stomp/stompjs'
import { router } from '@/router'

interface Material {
  id: string
  originalName: string
  fileType: string
  fileUrl?: string
  status?: 'DISABLED' | 'PROCESSING' | 'ENABLED' | 'FAILED'
}

interface Channel {
  id: string
  name: string
  type: 'GENERAL' | 'MATERIAL' | 'ADMIN'
  position: number
}

interface Server {
  id: string
  name: string
  initial: string
}

interface Message {
  id: string
  username: string
  initial: string
  color: string
  timestamp: string
  createdAt: string
  text: string
  materials?: Material[]
}

export const useAppStore = defineStore('app', () => {
  const servers = ref<Server[]>([])
  const channels = ref<Channel[]>([])
  const messages = ref<Record<string, Message[]>>({})
  const unreadCounts = ref<Record<string, number>>({})

  // 當前用戶在此班級（伺服器）的角色，由 getServerMembers 取得
  const currentRole = ref<'TEACHER' | 'STUDENT' | 'TA' | null>(null)

  // 當前班級成員列表
  const serverMembers = ref<ServerMemberResponse[]>([])

  // 教材臨時下載 URL 的前端快取，避免重複點擊浪費頻寬/DB資源
  const materialUrlCache = ref<Record<string, { url: string; expiresAt: number }>>({})

  // ================= AI 模式狀態 =================
  const isAiMode = ref(false)
  const isQuizMode = ref(false)
  const activeQuiz = ref<any>(null)
  const quizReport = ref<any>(null)
  const aiMaterial = ref<Material | null>(null)
  const aiSessions = ref<any[]>([])
  const activeAiSessionId = ref<string | null>(null)
  const aiMessages = ref<any[]>([])
  const isAiLoading = ref(false)
  const showMemberList = ref(true)
  const isManagingPool = ref(false)

  const activeServerId = ref<string | null>(null)
  const activeChannelId = ref<string | null>(null)
  const isLoading = ref(false)

  // WebSocket Client (使用普通變數以避免 Vue Proxy 包裝開銷)
  let stompClient: Client | null = null
  let currentSubscription: any = null

  const isTeacherOrTA = computed(() => currentRole.value === 'TEACHER' || currentRole.value === 'TA')

  const activeServer = computed(() => {
    const s = servers.value.find(srv => srv.id === activeServerId.value)
    if (!s) return undefined

    // 動態將扁平的頻道列表分組，對齊前端現有的 Category/Channel 渲染版面
    const generalChannels = channels.value.filter(c => c.type === 'GENERAL' || !c.type)
    const materialChannels = channels.value.filter(c => c.type === 'MATERIAL')
    const adminChannels = channels.value.filter(c => c.type === 'ADMIN')

    const cats = []
    if (generalChannels.length > 0) {
      cats.push({ id: 'GENERAL', name: '討論頻道', channels: generalChannels })
    }
    if (materialChannels.length > 0) {
      cats.push({ id: 'MATERIAL', name: '教材與資源', channels: materialChannels })
    }
    if (adminChannels.length > 0) {
      cats.push({ id: 'ADMIN', name: '管理專區', channels: adminChannels })
    }

    return {
      ...s,
      categories: cats
    }
  })

  const activeMessages = computed<Message[]>(() => {
    if (!activeChannelId.value) return []
    return messages.value[activeChannelId.value] ?? []
  })

  const activeChannel = computed<Channel | undefined>(() =>
    channels.value.find(ch => ch.id === activeChannelId.value)
  )

  // 初始化與連接 WebSocket
  function connectWebSocket() {
    const token = localStorage.getItem('token')
    if (!token) return

    // 如果已經有連線，先中斷
    if (stompClient) {
      stompClient.deactivate()
    }

    stompClient = new Client({
      brokerURL: 'ws://localhost:8080/ws',
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log('WebSocket STOMP 連線成功！')
        subscribeToActiveServer()
      },
      onStompError: (frame) => {
        console.error('STOMP 協議錯誤:', frame.headers['message'])
      },
      onWebSocketClose: () => {
        console.warn('WebSocket 連線關閉')
      }
    })

    stompClient.activate()
  }

  function disconnectWebSocket() {
    if (currentSubscription) {
      currentSubscription.unsubscribe()
      currentSubscription = null
    }
    if (stompClient) {
      stompClient.deactivate()
      stompClient = null
    }
  }

  // 訂閱當前選取的班級（伺服器）廣播頻道
  function subscribeToActiveServer() {
    if (currentSubscription) {
      currentSubscription.unsubscribe()
      currentSubscription = null
    }

    if (!stompClient || !stompClient.connected || !activeServerId.value) {
      return
    }

    const serverId = activeServerId.value
    console.log(`訂閱伺服器級廣播：/topic/servers/${serverId}/messages`)
    
    currentSubscription = stompClient.subscribe(`/topic/servers/${serverId}/messages`, (frame) => {
      try {
        const payload = JSON.parse(frame.body)
        const channelId = payload.channelId
        if (!channelId) return

        // 格式化新訊息 (包含教材附件列表與狀態)
        const newMsg: Message = {
          id: payload.id,
          username: payload.user?.username || '未知用戶',
          initial: payload.user?.username ? payload.user.username.charAt(0).toUpperCase() : '?',
          color: getRandomColor(payload.user?.id || 'default'),
          timestamp: formatTimestamp(payload.createdAt),
          createdAt: payload.createdAt || new Date().toISOString(),
          text: payload.content,
          materials: (payload.materials || []).map((m: any) => ({
            id: m.id,
            originalName: m.originalName || '未知檔案',
            fileType: m.fileType || '',
            fileUrl: m.fileUrl || '',
            status: m.status || 'DISABLED'
          }))
        }

        // 初始化該頻道的快取陣列
        if (!messages.value[channelId]) {
          messages.value[channelId] = []
        }

        // 檢查訊息是否已經存在 (若已存在，則更新其屬性以支援即時狀態更新，否則新增)
        const existingIdx = messages.value[channelId].findIndex(m => m.id === newMsg.id)
        if (existingIdx !== -1) {
          messages.value[channelId][existingIdx] = newMsg
        } else {
          messages.value[channelId].push(newMsg)
        }

        // 處理未讀計數：如果訊息不是當前正在看的頻道，則增加未讀數
        if (channelId !== activeChannelId.value) {
          unreadCounts.value[channelId] = (unreadCounts.value[channelId] || 0) + 1
        }
      } catch (err) {
        console.error('解析廣播訊息失敗:', err)
      }
    })
  }

  async function fetchServers() {
    isLoading.value = true
    try {
      const res = await getJoinedServers({ throwOnError: true })
      servers.value = (res.data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        initial: s.name ? s.name.charAt(0).toUpperCase() : '?'
      }))
      
      // 連接 WebSocket
      connectWebSocket()

      // 若當前未選定伺服器且有可用伺服器，且 URL 沒有指定 serverId，預設選取第一個
      const urlServerId = router.currentRoute.value.params.serverId
      if (!urlServerId && !activeServerId.value && servers.value.length > 0) {
        await selectServer(servers.value[0].id)
      }
    } catch (err) {
      console.error('取得伺服器列表失敗:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function selectServer(id: string) {
    if (isAiMode.value) {
      isAiMode.value = false
      isQuizMode.value = false
      activeQuiz.value = null
      quizReport.value = null
      isManagingPool.value = false
      aiMaterial.value = null
      aiSessions.value = []
      activeAiSessionId.value = null
      aiMessages.value = []
      isAiLoading.value = false
    }

    activeServerId.value = id
    channels.value = []
    activeChannelId.value = null
    currentRole.value = null

    // 重新訂閱當前班級的訊息廣播
    subscribeToActiveServer()

    try {
      const res = await getChannels({
        path: { serverId: id },
        throwOnError: true
      })
      channels.value = (res.data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type || 'GENERAL',
        position: c.position || 0
      }))

      // 取得成員列表以確認當前登入者身分角色 (用於 UI 按鈕判定)
      const membersRes = await getServerMembers({
        path: { serverId: id },
        throwOnError: true
      })
      serverMembers.value = membersRes.data || []
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          const currentUserId = payload.sub
          const me = (membersRes.data || []).find((m: any) => m.userId === currentUserId)
          if (me) {
            currentRole.value = me.role || 'STUDENT'
            console.log('當前用戶在該班級的角色為:', currentRole.value)
          }
        } catch (e) {
          console.error('解析 token payload 失敗:', e)
        }
      }

      if (channels.value.length > 0) {
        await selectChannel(channels.value[0].id)
      } else {
        router.push(`/channels/${id}/none`)
      }
    } catch (err) {
      console.error(`取得伺服器 ${id} 的頻道與角色列表失敗:`, err)
    }
  }

  async function selectChannel(id: string) {
    if (id === 'none') {
      activeChannelId.value = null
      return
    }
    
    activeChannelId.value = id
    // 切換時清除未讀指示器
    unreadCounts.value[id] = 0

    // 導向路由 (避免重複導向)
    if (activeServerId.value) {
      const targetPath = `/channels/${activeServerId.value}/${id}`
      if (router.currentRoute.value.path !== targetPath) {
        router.push(targetPath)
      }
    }

    // 使用 REST API 拉取該頻道的歷史訊息
    try {
      const res = await getMessages({
        path: { channelId: id },
        query: { page: 0, size: 50 },
        throwOnError: true
      })

      // 將歷史訊息（後端回傳為倒序）反轉為時間正序載入
      const history = (res.data?.content || []).map((m: any) => ({
        id: m.id,
        username: m.user?.username || '未知用戶',
        initial: m.user?.username ? m.user.username.charAt(0).toUpperCase() : '?',
        color: getRandomColor(m.user?.id || 'default'),
        timestamp: formatTimestamp(m.createdAt),
        createdAt: m.createdAt || '',
        text: m.content,
        materials: (m.materials || []).map((mat: any) => ({
          id: mat.id,
          originalName: mat.originalName || '未知檔案',
          fileType: mat.fileType || '',
          fileUrl: mat.fileUrl || '',
          status: mat.status || 'DISABLED'
        }))
      })).reverse()

      messages.value[id] = history
    } catch (err) {
      console.error(`取得頻道 ${id} 的歷史訊息失敗:`, err)
      messages.value[id] = []
    }
  }

  // 取得教材下載 URL，附帶 50 分鐘的前端快取
  async function downloadMaterial(materialId: string) {
    const cached = materialUrlCache.value[materialId]
    const now = Date.now()

    if (cached && cached.expiresAt > now) {
      console.log('💡 使用前端快取的教材下載連結:', materialId)
      window.open(cached.url, '_blank')
      return
    }

    try {
      console.log('🔄 向後端取得新教材臨時下載連結:', materialId)
      const res = await getMaterial({
        path: { materialId },
        throwOnError: true
      })

      const fileUrl = res.data?.fileUrl
      if (fileUrl) {
        materialUrlCache.value[materialId] = {
          url: fileUrl,
          expiresAt: now + 50 * 60 * 1000
        }
        window.open(fileUrl, '_blank')
      } else {
        console.error('取得的教材連結為空')
      }
    } catch (err) {
      console.error(`獲取教材 ${materialId} 的下載連結失敗:`, err)
    }
  }

  // 啟用 AI 助教向量化任務 (限教師 / 助教)
  async function toggleAiAssistant(materialId: string) {
    try {
      await enableAiAssistant({
        path: { materialId },
        throwOnError: true
      })

      // 即時將本地快取中對應教材的狀態變更為 PROCESSING (處理中) 以改變 UI 按鈕狀態
      for (const channelId in messages.value) {
        messages.value[channelId].forEach(msg => {
          if (msg.materials) {
            const mat = msg.materials.find(m => m.id === materialId)
            if (mat) {
              mat.status = 'PROCESSING'
              console.log('已更新本地教材狀態為 PROCESSING:', materialId)
            }
          }
        })
      }
    } catch (err) {
      console.error(`開啟 AI 助教失敗，教材 ID: ${materialId}`, err)
      alert('啟用 AI 助教失敗，您可能權限不足。')
    }
  }

  // ================= AI 模式專屬 Actions =================

  async function enterAiMode(material: Material) {
    isAiMode.value = true
    aiMaterial.value = material
    aiSessions.value = []
    activeAiSessionId.value = null
    aiMessages.value = []
    isAiLoading.value = false

    // 載入對話清單
    try {
      const res = await listSessions({
        query: { materialId: material.id },
        throwOnError: true
      })
      aiSessions.value = res.data || []

      let targetSessionId = ''
      if (aiSessions.value.length > 0 && aiSessions.value[0].id) {
        targetSessionId = aiSessions.value[0].id
      } else {
        // 自動建立第一個新會話
        if (aiMaterial.value) {
          const createRes = await createSession({
            body: { materialId: aiMaterial.value.id },
            throwOnError: true
          })
          if (createRes.data && createRes.data.id) {
            aiSessions.value.unshift(createRes.data)
            targetSessionId = createRes.data.id
          }
        }
      }

      if (targetSessionId && activeServerId.value) {
        router.push(`/channels/${activeServerId.value}/ai/${material.id}/${targetSessionId}`)
      }
    } catch (err) {
      console.error('進入 AI 模式失敗:', err)
    }
  }

  async function enterAiModeFromUrl(serverId: string, materialId: string, sessionId: string) {
    isAiMode.value = true
    activeServerId.value = serverId
    isAiLoading.value = false

    // 載入伺服器頻道與角色 (若未載入)
    if (channels.value.length === 0) {
      await selectServer(serverId)
    }

    // 取得教材詳細資料
    try {
      const matRes = await getMaterial({ path: { materialId }, throwOnError: true })
      if (matRes.data) {
        aiMaterial.value = {
          id: matRes.data.id || '',
          originalName: matRes.data.originalName || '未知檔案',
          fileType: matRes.data.fileType || '',
          fileUrl: matRes.data.fileUrl || '',
          status: matRes.data.status || 'DISABLED'
        }
      }
    } catch (e) {
      console.error('從 URL 載入教材詳情失敗:', e)
    }

    // 載入會話列表
    try {
      const res = await listSessions({
        query: { materialId },
        throwOnError: true
      })
      aiSessions.value = res.data || []
    } catch (err) {
      console.error('從 URL 載入會話列表失敗:', err)
    }

    // 選定該會話並讀取訊息
    activeAiSessionId.value = sessionId
    try {
      const res = await getSessionMessages({
        path: { sessionId },
        throwOnError: true
      })
      aiMessages.value = res.data || []
    } catch (err) {
      console.error('取得會話歷史訊息失敗:', err)
    }
  }

  function exitAiMode() {
    isAiMode.value = false
    isQuizMode.value = false
    activeQuiz.value = null
    quizReport.value = null
    isManagingPool.value = false
    aiMaterial.value = null
    aiSessions.value = []
    activeAiSessionId.value = null
    aiMessages.value = []
    isAiLoading.value = false

    if (activeServerId.value && activeChannelId.value) {
      router.push(`/channels/${activeServerId.value}/${activeChannelId.value}`)
    } else {
      router.push('/channels/@me')
    }
  }

  async function selectAiSession(sessionId: string) {
    activeAiSessionId.value = sessionId
    aiMessages.value = []
    isAiLoading.value = false
    isQuizMode.value = false
    activeQuiz.value = null
    quizReport.value = null
    isManagingPool.value = false

    // 導向路由 (避免重複導向)
    if (activeServerId.value && aiMaterial.value) {
      const targetPath = `/channels/${activeServerId.value}/ai/${aiMaterial.value.id}/${sessionId}`
      if (router.currentRoute.value.path !== targetPath) {
        router.push(targetPath)
      }
    }

    try {
      const res = await getSessionMessages({
        path: { sessionId },
        throwOnError: true
      })
      aiMessages.value = res.data || []
    } catch (err) {
      console.error('取得會話歷史訊息失敗:', err)
    }
  }

  async function createNewAiSession() {
    if (!aiMaterial.value) return

    try {
      const res = await createSession({
        body: { materialId: aiMaterial.value.id },
        throwOnError: true
      })
      const newSession = res.data
      if (newSession && newSession.id) {
        aiSessions.value.unshift(newSession)
        await selectAiSession(newSession.id)
      }
    } catch (err) {
      console.error('建立 AI 會話失敗:', err)
    }
  }

  async function sendAiMessage(content: string) {
    if (!activeAiSessionId.value) return

    const userMsg = {
      id: Math.random().toString(),
      role: 'user',
      content,
      createdAt: new Date().toISOString()
    }
    aiMessages.value.push(userMsg)

    isAiLoading.value = true

    const token = localStorage.getItem('token')
    let botMsg: any = null

    try {
      const response = await fetch(`http://localhost:8080/v1/materials/chat-sessions/${activeAiSessionId.value}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: content })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('ReadableStream not supported')
      }

      const decoder = new TextDecoder()
      let accumulatedText = ''
      let currentEventData = ''
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith('data:')) {
            let val = trimmed.substring(5)
            if (val.startsWith(' ')) {
              val = val.substring(1)
            }
            if (currentEventData !== '') {
              currentEventData += '\n'
            }
            currentEventData += val
          } else if (trimmed === '') {
            // 遇到空行，代表一個 Event 結束，將其寫入累積內容並渲染
            if (currentEventData !== '') {
              accumulatedText += currentEventData
              currentEventData = ''

              if (!botMsg) {
                isAiLoading.value = false // 一收到回應立即關閉 Loading 轉為顯示打字
                botMsg = {
                  id: Math.random().toString(),
                  role: 'assistant',
                  content: '',
                  createdAt: new Date().toISOString()
                }
                aiMessages.value.push(botMsg)
              }
              botMsg.content = accumulatedText
              // 🌟 強制觸發 Vue 3 的響應式陣列渲染更新！
              aiMessages.value = [...aiMessages.value]
            }
          }
        }
      }

      // 處理最後的殘餘 buffer 與 event
      if (buffer) {
        const trimmed = buffer.trim()
        if (trimmed.startsWith('data:')) {
          let val = trimmed.substring(5)
          if (val.startsWith(' ')) {
            val = val.substring(1)
          }
          if (currentEventData !== '') {
            currentEventData += '\n'
          }
          currentEventData += val
        }
      }
      if (currentEventData !== '') {
        accumulatedText += currentEventData
      }
      if (accumulatedText) {
        if (!botMsg) {
          isAiLoading.value = false
          botMsg = {
            id: Math.random().toString(),
            role: 'assistant',
            content: '',
            createdAt: new Date().toISOString()
          }
          aiMessages.value.push(botMsg)
        }
        botMsg.content = accumulatedText
        // 🌟 強制觸發 Vue 3 的響應式陣列渲染更新！
        aiMessages.value = [...aiMessages.value]
      }

    } catch (err) {
      console.error('AI 流式對話失敗:', err)
      // 若建立失敗或網路中斷，補回錯誤說明
      aiMessages.value.push({
        id: Math.random().toString(),
        role: 'assistant',
        content: '⚠️ 發送失敗，請確認網路連線或稍後再試。',
        createdAt: new Date().toISOString()
      })
    } finally {
      isAiLoading.value = false
    }
  }

  function sendMessage(text: string) {
    if (!activeServerId.value || !activeChannelId.value) return

    if (stompClient && stompClient.connected) {
      // 透過 WebSocket STOMP 發送實時訊息到後端
      stompClient.publish({
        destination: `/app/servers/${activeServerId.value}/chat`,
        body: JSON.stringify({
          channelId: activeChannelId.value,
          content: text
        })
      })
    } else {
      console.error('WebSocket 未連線，無法發送訊息')
    }
  }

  async function uploadAndPublishMaterial(file: File, content: string) {
    if (!activeServerId.value || !activeChannelId.value) return
    isLoading.value = true
    try {
      // 1. 取得預簽名上傳網址與 fileKey
      const uploadUrlRes = await getUploadUrl({
        path: { channelId: activeChannelId.value },
        query: {
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          fileSize: file.size
        },
        throwOnError: true
      })

      if (!uploadUrlRes.data || !uploadUrlRes.data.uploadUrl || !uploadUrlRes.data.fileKey) {
        throw new Error('無法取得預簽名上傳網址')
      }

      const { uploadUrl, fileKey } = uploadUrlRes.data

      // 2. 直傳檔案至儲存桶 (PUT 請求)
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
      })

      // 3. 確認發布教材貼文到後端
      const lastDot = file.name.lastIndexOf('.')
      const fileType = lastDot !== -1 ? file.name.substring(lastDot) : ''

      await postMaterial({
        path: { channelId: activeChannelId.value },
        body: {
          content: content,
          fileKey: fileKey,
          fileType: fileType,
          originalName: file.name,
          fileSize: file.size
        },
        throwOnError: true
      })
    } catch (err: any) {
      console.error('教材上傳與發布失敗:', err);
      const errorMsg = err.error?.message || err.message || '上傳失敗，請檢查空間配額與權限。'
      alert('上傳教材失敗: ' + errorMsg)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // 根據使用者 ID 生成固定色相，保持頭像顏色一致
  function getRandomColor(id: string): string {
    let hash = 0
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash)
    }
    const h = Math.abs(hash % 360)
    return `hsl(${h}, 55%, 50%)`
  }

  // 格式化時間戳記
  function formatTimestamp(isoString: string): string {
    if (!isoString) return '剛剛'
    try {
      const date = new Date(isoString)
      const now = new Date()
      
      const isToday = date.toDateString() === now.toDateString()
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      
      if (isToday) {
        return `今天 ${timeStr}`
      }
      return `${date.getMonth() + 1}/${date.getDate()} ${timeStr}`
    } catch {
      return '剛剛'
    }
  }

  // ================= AI 測驗模組 Actions =================

  async function triggerQuizGeneration(materialId: string, count: number, difficulty: string) {
    try {
      const res = await generateQuestions({
        path: { materialId },
        query: { count, difficulty },
        throwOnError: true
      })
      return res.data
    } catch (err) {
      console.error('發起 AI 出題失敗:', err)
      throw err
    }
  }

  async function fetchQuestionPool(materialId: string) {
    try {
      const res = await getQuestionPool({
        path: { materialId },
        throwOnError: true
      })
      return res.data || []
    } catch (err) {
      console.error('取得教材題庫失敗:', err)
      throw err
    }
  }

  async function removeQuestion(questionId: string) {
    try {
      await deleteQuestion({
        path: { questionId },
        throwOnError: true
      })
    } catch (err) {
      console.error('刪除考題失敗:', err)
      throw err
    }
  }

  async function createMaterialQuiz(materialId: string) {
    try {
      const res = await createQuiz({
        path: { materialId },
        throwOnError: true
      })
      return res.data
    } catch (err) {
      console.error('發起測驗失敗:', err)
      throw err
    }
  }

  async function submitQuizAnswers(quizId: string, answers: Record<string, string[]>) {
    try {
      const res = await submitQuiz({
        path: { quizId },
        body: { answers },
        throwOnError: true
      })
      return res.data
    } catch (err) {
      console.error('提交作答失敗:', err)
      throw err
    }
  }

  async function fetchQuizReportData(quizId: string) {
    try {
      const res = await getQuizReport({
        path: { quizId },
        throwOnError: true
      })
      return res.data
    } catch (err) {
      console.error('取得測驗報告失敗:', err)
      throw err
    }
  }

  async function fetchUserQuizzes(materialId: string) {
    try {
      const res = await getUserQuizzes({
        path: { materialId },
        throwOnError: true
      })
      return res.data || []
    } catch (err) {
      console.error('取得歷史測驗紀錄失敗:', err)
      throw err
    }
  }

  const currentUser = ref<{ id: string; username: string; email: string; avatarUrl: string | null } | null>(null)

  async function fetchCurrentUserProfile() {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const res = await getUserProfile({ throwOnError: true })
      if (res.data) {
        currentUser.value = {
          id: res.data.id ?? '',
          username: res.data.username ?? '',
          email: res.data.email ?? '',
          avatarUrl: res.data.avatarUrl ?? null
        }
      }
    } catch (err) {
      console.error('取得使用者資料失敗:', err)
    }
  }

  return {
    servers,
    channels,
    messages,
    unreadCounts,
    materialUrlCache,
    currentRole,
    serverMembers,
    showMemberList,
    getRandomColor,
    formatTimestamp,
    isTeacherOrTA,
    isAiMode,
    isQuizMode,
    isManagingPool,
    activeQuiz,
    quizReport,
    aiMaterial,
    aiSessions,
    activeAiSessionId,
    aiMessages,
    isAiLoading,
    activeServerId,
    activeChannelId,
    activeServer,
    activeMessages,
    activeChannel,
    isLoading,
    currentUser,
    fetchServers,
    selectServer,
    selectChannel,
    sendMessage,
    uploadAndPublishMaterial,
    downloadMaterial,
    toggleAiAssistant,
    enterAiMode,
    enterAiModeFromUrl,
    exitAiMode,
    selectAiSession,
    createNewAiSession,
    sendAiMessage,
    triggerQuizGeneration,
    fetchQuestionPool,
    removeQuestion,
    createMaterialQuiz,
    submitQuizAnswers,
    fetchQuizReportData,
    fetchUserQuizzes,
    disconnectWebSocket,
    fetchCurrentUserProfile
  }
})