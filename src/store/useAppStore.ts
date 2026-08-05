import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import {
  getJoinedServers,
  getChannels,
  getMessages,
  getMaterial,
  getServerMembers,
  enableAiAssistant,
  listSessions,
  createSession,
  getSessionMessages,
  generateQuestions,
  getQuestionPool,
  deleteQuestion,
  createQuiz,
  submitQuiz,
  getQuizReport,
  getUserQuizzes,
  getUploadUrl,
  postMaterial,
  getUserProfile,
} from "@/api/generated";
import type { ServerMemberResponse } from "@/api/generated";
import { Client } from "@stomp/stompjs";
import { router } from "@/router";
import { client } from "@/api/generated/client.gen";
import { afterSkeletonDelay } from "@/lib/debug";
import { queryClient } from "@/lib/queryClient";

interface Material {
  id: string;
  originalName: string;
  fileType: string;
  fileUrl?: string;
  status?: "DISABLED" | "PROCESSING" | "ENABLED" | "FAILED";
}

interface Channel {
  id: string;
  name: string;
  type: "GENERAL" | "MATERIAL" | "ADMIN";
  position: number;
}

interface Server {
  id: string;
  name: string;
  initial: string;
}

interface Message {
  id: string;
  username: string;
  initial: string;
  color: string;
  timestamp: string;
  createdAt: string;
  text: string;
  materials?: Material[];
  avatarUrl?: string | null;
}

export const useAppStore = defineStore("app", () => {
  const servers = ref<Server[]>([]);
  const channels = ref<Channel[]>([]);
  const messages = ref<Record<string, Message[]>>({});
  const unreadCounts = ref<Record<string, number>>({});

  // 當前用戶在此班級（伺服器）的角色，由 getServerMembers 取得
  const currentRole = ref<"TEACHER" | "STUDENT" | "TA" | null>(null);

  // 當前班級成員列表
  const serverMembers = ref<ServerMemberResponse[]>([]);

  // 全域在線使用者 ID 集合（跨伺服器共用，由 /topic/presence 即時更新）
  const onlineUserIds = ref<Set<string>>(new Set());

  // 教材臨時下載 URL 的前端快取，避免重複點擊浪費頻寬/DB資源
  const materialUrlCache = ref<
    Record<string, { url: string; expiresAt: number }>
  >({});

  // ================= AI 模式狀態 =================
  const isAiMode = ref(false);
  const isQuizMode = ref(false);
  const activeQuiz = ref<any>(null);
  const quizReport = ref<any>(null);
  const aiMaterial = ref<Material | null>(null);
  const aiSessions = ref<any[]>([]);
  const activeAiSessionId = ref<string | null>(null);
  const aiMessages = ref<any[]>([]);
  const isAiLoading = ref(false);
  // 進入 AI 模式、抓取對話會話清單期間的載入狀態，供會話列表顯示 Skeleton 佔位用
  const isLoadingAiSessions = ref(false);
  // 直接用網址 / 重新整理進入 AI 模式時，抓取教材詳情期間的載入狀態，供標頭檔名顯示「載入中...」用
  const isLoadingAiMaterial = ref(false);
  // 切換 AI 會話、抓取歷史訊息期間的載入狀態，供 AI 對話區顯示 Skeleton 佔位用
  const isLoadingAiMessages = ref(false);
  // 點擊歷史測驗紀錄、抓取測驗報告期間的載入狀態，供主內容區顯示置中「載入中...」用
  const isLoadingQuizReport = ref(false);
  const showMemberList = ref(true);
  const isManagingPool = ref(false);
  const isAiLimitDialogOpen = ref(false);

  const globalNotice = ref({
    isOpen: false,
    title: "系統流量管制提示",
    message: "",
    code: "",
  });

  function showGlobalNotice(
    message: string,
    code: string = "",
    title: string = "系統流量管制提示",
  ) {
    globalNotice.value = {
      isOpen: true,
      title,
      message,
      code,
    };
  }

  function closeGlobalNotice() {
    globalNotice.value.isOpen = false;
  }

  const avatarColors = ref<string[]>([
    "#588b8b",
    "#f5e4d7",
    "#ffffff",
    "#087e8b",
    "#037171",
    "#7796cb",
    "#d6f8d6",
    "#4d7ea8",
    "#202330",
  ]);

  const activeServerId = ref<string | null>(null);
  const activeChannelId = ref<string | null>(null);
  const isLoading = ref(false);

  const channelPages = ref<Record<string, number>>({});
  const channelHasMore = ref<Record<string, boolean>>({});
  const isFetchingMore = ref(false);
  // 切換頻道、抓取歷史訊息期間的載入狀態，供訊息區顯示 Skeleton 佔位用
  const isLoadingMessages = ref(false);
  // 切換班級、抓取成員列表期間的載入狀態，供成員列表顯示 Skeleton 佔位用
  const isLoadingMembers = ref(false);

  const lastActiveChannelPerServer = ref<Record<string, string>>({});
  const channelScrollPositions = ref<Record<string, number>>({});

  const aiSessionScrollPositions = ref<Record<string, number>>({});
  const quizReportScrollPositions = ref<Record<string, number>>({});
  const quizHistoryScrollPositions = ref<Record<string, number>>({});
  const lastActiveSessionPerMaterial = ref<Record<string, string>>({});
  const materialQuizReports = ref<Record<string, any>>({});
  const materialQuizModes = ref<Record<string, boolean>>({});

  // 嘗試載入 localStorage 中的最後活躍頻道與 AI/Quiz 歷史狀態
  try {
    const saved = localStorage.getItem("lastActiveChannels");
    if (saved) {
      lastActiveChannelPerServer.value = JSON.parse(saved);
    }
  } catch (e) {
    console.error("載入 lastActiveChannels 失敗:", e);
  }

  try {
    lastActiveSessionPerMaterial.value = JSON.parse(
      localStorage.getItem("lastActiveSessions") || "{}",
    );
    materialQuizReports.value = JSON.parse(
      localStorage.getItem("materialQuizReports") || "{}",
    );
    materialQuizModes.value = JSON.parse(
      localStorage.getItem("materialQuizModes") || "{}",
    );
  } catch (e) {
    console.error("載入 AI/Quiz 歷史狀態失敗:", e);
  }

  // 監聽並自動寫入 localStorage
  watch(
    lastActiveChannelPerServer,
    (newMap) => {
      localStorage.setItem("lastActiveChannels", JSON.stringify(newMap));
    },
    { deep: true },
  );

  watch(
    [lastActiveSessionPerMaterial, materialQuizReports, materialQuizModes],
    () => {
      localStorage.setItem(
        "lastActiveSessions",
        JSON.stringify(lastActiveSessionPerMaterial.value),
      );
      localStorage.setItem(
        "materialQuizReports",
        JSON.stringify(materialQuizReports.value),
      );
      localStorage.setItem(
        "materialQuizModes",
        JSON.stringify(materialQuizModes.value),
      );
    },
    { deep: true },
  );

  // 監聽當前活躍狀態，並更新各教材的對照表
  watch(quizReport, (val) => {
    if (aiMaterial.value) {
      materialQuizReports.value[aiMaterial.value.id] = val;
    }
  });
  watch(isQuizMode, (val) => {
    if (aiMaterial.value) {
      materialQuizModes.value[aiMaterial.value.id] = val;
    }
  });
  watch(activeAiSessionId, (val) => {
    if (val && aiMaterial.value) {
      lastActiveSessionPerMaterial.value[aiMaterial.value.id] = val;
    }
  });

  // WebSocket Client (使用普通變數以避免 Vue Proxy 包裝開銷)
  let stompClient: Client | null = null;
  let currentSubscription: any = null;
  let presenceSubscription: any = null;

  const isTeacherOrTA = computed(
    () => currentRole.value === "TEACHER" || currentRole.value === "TA",
  );

  const activeServer = computed(() => {
    const s = servers.value.find((srv) => srv.id === activeServerId.value);
    if (!s) return undefined;

    // 動態將扁平的頻道列表分組，對齊前端現有的 Category/Channel 渲染版面
    const generalChannels = channels.value.filter(
      (c) => c.type === "GENERAL" || !c.type,
    );
    const materialChannels = channels.value.filter(
      (c) => c.type === "MATERIAL",
    );
    const adminChannels = channels.value.filter((c) => c.type === "ADMIN");

    const cats = [];
    if (generalChannels.length > 0) {
      cats.push({ id: "GENERAL", name: "討論頻道", channels: generalChannels });
    }
    if (materialChannels.length > 0) {
      cats.push({
        id: "MATERIAL",
        name: "教材與資源",
        channels: materialChannels,
      });
    }
    if (adminChannels.length > 0) {
      cats.push({ id: "ADMIN", name: "管理專區", channels: adminChannels });
    }

    return {
      ...s,
      categories: cats,
    };
  });

  const activeMessages = computed<Message[]>(() => {
    if (!activeChannelId.value) return [];
    return messages.value[activeChannelId.value] ?? [];
  });

  const activeChannel = computed<Channel | undefined>(() =>
    channels.value.find((ch) => ch.id === activeChannelId.value),
  );

  // 初始化與連接 WebSocket
  function connectWebSocket() {
    const token = localStorage.getItem("token");
    if (!token) return;

    // 如果已經有連線，先中斷
    if (stompClient) {
      stompClient.deactivate();
    }

    stompClient = new Client({
      brokerURL: import.meta.env.VITE_WS_URL || "ws://localhost:8080/ws",
      beforeConnect: () => {
        const freshToken = localStorage.getItem("token");
        if (freshToken && stompClient) {
          stompClient.connectHeaders = {
            Authorization: `Bearer ${freshToken}`,
          };
        }
      },
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log("WebSocket STOMP 連線成功！");
        subscribeToActiveServer();
      },
      onStompError: (frame) => {
        const errorMsg = frame.headers["message"] || "";
        console.error("STOMP 協議錯誤:", errorMsg);
        if (errorMsg.includes("認證") || errorMsg.includes("失效")) {
          console.warn("WebSocket 憑證失效，自動清除憑證並導向登入頁面");
          disconnectWebSocket();
          localStorage.removeItem("token");
          router.push("/login");
        }
      },
      onWebSocketClose: () => {
        console.warn("WebSocket 連線關閉");
      },
    });

    stompClient.activate();
  }

  function disconnectWebSocket() {
    if (currentSubscription) {
      currentSubscription.unsubscribe();
      currentSubscription = null;
    }
    if (presenceSubscription) {
      presenceSubscription.unsubscribe();
      presenceSubscription = null;
    }
    if (stompClient) {
      stompClient.deactivate();
      stompClient = null;
    }
  }

  // 訂閱當前選取的班級（伺服器）廣播頻道：聊天訊息 + 在線狀態，切換伺服器時會重新訂閱
  function subscribeToActiveServer() {
    if (currentSubscription) {
      currentSubscription.unsubscribe();
      currentSubscription = null;
    }
    if (presenceSubscription) {
      presenceSubscription.unsubscribe();
      presenceSubscription = null;
    }

    if (!stompClient || !stompClient.connected || !activeServerId.value) {
      return;
    }

    const serverId = activeServerId.value;
    console.log(`訂閱伺服器級廣播：/topic/servers/${serverId}/messages`);

    presenceSubscription = stompClient.subscribe(
      `/topic/servers/${serverId}/presence`,
      (frame) => {
        try {
          const payload = JSON.parse(frame.body);
          if (!payload.userId) return;
          if (payload.online) {
            onlineUserIds.value.add(payload.userId);
          } else {
            onlineUserIds.value.delete(payload.userId);
          }
        } catch (e) {
          console.error("解析在線狀態廣播失敗:", e);
        }
      },
    );

    currentSubscription = stompClient.subscribe(
      `/topic/servers/${serverId}/messages`,
      (frame) => {
        try {
          const payload = JSON.parse(frame.body);
          const channelId = payload.channelId;
          if (!channelId) return;

          // 格式化新訊息 (包含教材附件列表與狀態)
          const newMsg: Message = {
            id: payload.id,
            username: payload.user?.username || "未知用戶",
            initial: payload.user?.username
              ? payload.user.username.charAt(0).toUpperCase()
              : "?",
            color: getRandomColor(payload.user?.id || "default"),
            avatarUrl: payload.user?.avatarUrl || null,
            timestamp: formatTimestamp(payload.createdAt),
            createdAt: payload.createdAt || new Date().toISOString(),
            text: payload.content,
            materials: (payload.materials || []).map((m: any) => ({
              id: m.id,
              originalName: m.originalName || "未知檔案",
              fileType: m.fileType || "",
              fileUrl: m.fileUrl || "",
              status: m.status || "DISABLED",
            })),
          };

          // 初始化該頻道的快取陣列
          if (!messages.value[channelId]) {
            messages.value[channelId] = [];
          }

          // 檢查訊息是否已經存在 (若已存在，則更新其屬性以支援即時狀態更新，否則新增)
          const existingIdx = messages.value[channelId].findIndex(
            (m) => m.id === newMsg.id,
          );
          if (existingIdx !== -1) {
            messages.value[channelId][existingIdx] = newMsg;
          } else {
            messages.value[channelId].push(newMsg);
          }

          // 同步更新 vue-query 的歷史訊息快取 (page 0)，避免切頻道快取命中時
          // 蓋回「還沒收到這則即時訊息」的舊快照，導致這則訊息憑空消失。
          // 若該頻道尚未被快取過 (old 為 undefined)，代表沒有舊快照可能被蓋掉，略過即可。
          queryClient.setQueryData(["messages", channelId, 0], (old: any) => {
            if (!old) return old;
            const content = old.data?.content || [];
            const idx = content.findIndex((m: any) => m.id === payload.id);
            const newContent =
              idx !== -1
                ? content.map((m: any, i: number) => (i === idx ? payload : m))
                : [payload, ...content];
            return { ...old, data: { ...old.data, content: newContent } };
          });

          // 處理未讀計數：如果訊息不是當前正在看的頻道，則增加未讀數
          if (channelId !== activeChannelId.value) {
            unreadCounts.value[channelId] =
              (unreadCounts.value[channelId] || 0) + 1;
          }
        } catch (err) {
          console.error("解析廣播訊息失敗:", err);
        }
      },
    );
  }

  async function fetchServers() {
    isLoading.value = true;
    try {
      const res = await getJoinedServers({ throwOnError: true });
      servers.value = (res.data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        initial: s.name ? s.name.charAt(0).toUpperCase() : "?",
      }));

      // 連接 WebSocket
      connectWebSocket();

      // 若當前未選定伺服器且有可用伺服器，且 URL 沒有指定 serverId，預設選取第一個
      const urlServerId = router.currentRoute.value.params.serverId;
      if (!urlServerId && !activeServerId.value && servers.value.length > 0) {
        await selectServer(servers.value[0].id);
      }
    } catch (err) {
      console.error("取得伺服器列表失敗:", err);
    } finally {
      afterSkeletonDelay(() => {
        isLoading.value = false;
      });
    }
  }

  async function selectServer(id: string) {
    if (isAiMode.value) {
      isAiMode.value = false;
      isQuizMode.value = false;
      activeQuiz.value = null;
      quizReport.value = null;
      isManagingPool.value = false;
      aiMaterial.value = null;
      aiSessions.value = [];
      activeAiSessionId.value = null;
      aiMessages.value = [];
      isAiLoading.value = false;
    }

    activeServerId.value = id;
    // 記住這次選取的班級 ID：channels/serverMembers/currentRole 都是單一共用變數
    // (不像 messages 是用頻道 ID 分開存)，如果使用者在這次 await 期間又切去別的
    // 班級，這次呼叫理論上已經「過期」了，不能讓它事後才回來的資料蓋掉使用者
    // 目前正在看的新班級畫面，甚至誤觸發下面的自動選頻道跳轉。
    const serverIdAtSelect = id;
    const isStillActiveServer = () => activeServerId.value === serverIdAtSelect;
    channels.value = [];
    activeChannelId.value = null;
    currentRole.value = null;
    serverMembers.value = [];
    isLoadingMembers.value = true;

    // 重新訂閱當前班級的訊息廣播
    subscribeToActiveServer();

    try {
      // 頻道列表跟成員列表彼此沒有依賴關係，改成 Promise.all 同時發出去，
      // 總等待時間變成「取兩者中較慢的那個」而不是兩趟網路來回相加。
      // 用 vue-query 快取：短時間內切回同一個班級直接沿用快取、不必等網路。
      // ensureQueryData 預設「只要有快取就回傳，不管新不新鮮」，所以要另外加
      // revalidateIfStale: true，資料超過 staleTime 之後才會在背景默默重新拉一次
      // 最新結果 (這次仍先回傳舊快取，下次再切回來就會是更新過的)。
      const membersKey = ["serverMembers", id];
      const prevUpdatedAt =
        queryClient.getQueryState(membersKey)?.dataUpdatedAt;

      const [res, membersRes] = await Promise.all([
        queryClient.ensureQueryData({
          queryKey: ["channels", id],
          queryFn: () =>
            getChannels({
              path: { serverId: id },
              throwOnError: true,
            }),
          revalidateIfStale: true,
        }),
        // 取得成員列表以確認當前登入者身分角色 (用於 UI 按鈕判定)
        // 「在線狀態」實際顯示邏輯 (MemberList.vue) 完全依賴 onlineUserIds 這個由
        // /topic/presence 即時廣播維護的獨立集合，不吃 serverMembers 裡的 online 欄位，
        // 所以快取名單本身是安全的。
        queryClient.ensureQueryData({
          queryKey: membersKey,
          queryFn: () =>
            getServerMembers({
              path: { serverId: id },
              throwOnError: true,
            }),
          revalidateIfStale: true,
        }),
      ]);

      if (isStillActiveServer()) {
        channels.value = (res.data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          type: c.type || "GENERAL",
          position: c.position || 0,
        }));
      }

      const wasFreshFetch =
        queryClient.getQueryState(membersKey)?.dataUpdatedAt !== prevUpdatedAt;

      // 在線名單是跨伺服器共用的全域集合，用哪個班級的快照校正都無妨，
      // 不需要跟著上面那個「還在不在同一個班級」的判斷走。
      if (wasFreshFetch) {
        for (const m of membersRes.data || []) {
          if (!m.userId) continue;
          if (m.online) {
            onlineUserIds.value.add(m.userId);
          } else {
            onlineUserIds.value.delete(m.userId);
          }
        }
      }

      // 這次 await 期間如果使用者已經切去別的班級，剩下這些「反映到畫面」跟
      // 「自動導向頻道」的動作全部略過——該抓的資料上面都已經抓了、也快取了，
      // 只是不要讓這次過期的結果去干擾使用者現在正在看的新班級。
      if (!isStillActiveServer()) return;

      serverMembers.value = membersRes.data || [];
      afterSkeletonDelay(() => {
        if (isStillActiveServer()) {
          isLoadingMembers.value = false;
        }
      });
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          const currentUserId = payload.sub;
          const me = (membersRes.data || []).find(
            (m: any) => m.userId === currentUserId,
          );
          if (me) {
            currentRole.value = me.role || "STUDENT";
            console.log("當前用戶在該班級的角色為:", currentRole.value);
          }
        } catch (e) {
          console.error("解析 token payload 失敗:", e);
        }
      }

      const lastChannelId = lastActiveChannelPerServer.value[id];
      const hasLastChannel =
        lastChannelId && channels.value.some((c) => c.id === lastChannelId);

      if (hasLastChannel) {
        await selectChannel(lastChannelId);
      } else if (channels.value.length > 0) {
        await selectChannel(channels.value[0].id);
      } else {
        router.push(`/channels/${id}/none`);
      }
    } catch (err) {
      console.error(`取得伺服器 ${id} 的頻道與角色列表失敗:`, err);
      if (isStillActiveServer()) {
        isLoadingMembers.value = false;
      }
    }
  }

  async function selectChannel(id: string) {
    if (id === "none") {
      activeChannelId.value = null;
      return;
    }

    activeChannelId.value = id;
    // 記住這次選取的頻道 ID：isLoadingMessages 是單一共用旗標 (不像 messages
    // 是用頻道 ID 分開存)，如果使用者在下面這次 await 期間又切去別的頻道，
    // 這次呼叫已經「過期」了，不能讓它事後才回來的結果去關掉使用者現在
    // 正在看的新頻道的載入骨架、或誤把使用者導回 @me。
    const channelIdAtSelect = id;
    const isStillActiveChannel = () =>
      activeChannelId.value === channelIdAtSelect;
    if (activeServerId.value) {
      lastActiveChannelPerServer.value[activeServerId.value] = id;
    }
    // 切換時清除未讀指示器
    unreadCounts.value[id] = 0;

    // 重設分頁狀態
    channelPages.value[id] = 0;
    channelHasMore.value[id] = true;

    // 導向路由 (避免重複導向)
    if (activeServerId.value) {
      const targetPath = `/channels/${activeServerId.value}/${id}`;
      if (router.currentRoute.value.path !== targetPath) {
        router.push(targetPath);
      }
    }

    // 使用 REST API 拉取該頻道的歷史訊息
    // 用 vue-query 快取：短時間內切回同一頻道不必重打 API 也不必等網路，
    // 且上面 WebSocket 收到新訊息時會同步更新這份快取，不會蓋掉即時訊息。
    isLoadingMessages.value = true;
    try {
      const res = await queryClient.ensureQueryData({
        queryKey: ["messages", id, 0],
        queryFn: () =>
          getMessages({
            path: { channelId: id },
            query: { page: 0, size: 50 },
            throwOnError: true,
          }),
      });

      // 將歷史訊息（後端回傳為倒序）反轉為時間正序載入
      const history = (res.data?.content || [])
        .map((m: any) => ({
          id: m.id,
          username: m.user?.username || "未知用戶",
          initial: m.user?.username
            ? m.user.username.charAt(0).toUpperCase()
            : "?",
          color: getRandomColor(m.user?.id || "default"),
          avatarUrl: m.user?.avatarUrl || null,
          timestamp: formatTimestamp(m.createdAt),
          createdAt: m.createdAt || "",
          text: m.content,
          materials: (m.materials || []).map((mat: any) => ({
            id: mat.id,
            originalName: mat.originalName || "未知檔案",
            fileType: mat.fileType || "",
            fileUrl: mat.fileUrl || "",
            status: mat.status || "DISABLED",
          })),
        }))
        .reverse();

      messages.value[id] = history;
    } catch (err: any) {
      console.error(`取得頻道 ${id} 的歷史訊息失敗:`, err);
      messages.value[id] = [];
      // 當權限不足 (403) 或頻道不存在 (404) 時，自動跳回 @me 頁面避免顯示異常空白
      // 但只有使用者還停留在這個 (有問題的) 頻道才導向；如果已經手動切去別的
      // 正常頻道，這次過期的錯誤不該把使用者導離他現在看得好好的畫面。
      if (
        (err?.status === 403 || err?.status === 404) &&
        isStillActiveChannel()
      ) {
        console.warn(`無權存取頻道 ${id}，重新導向至 /channels/@me`);
        router.push("/channels/@me");
      }
    } finally {
      afterSkeletonDelay(() => {
        if (isStillActiveChannel()) {
          isLoadingMessages.value = false;
        }
      });
    }
  }

  async function loadMoreMessages(channelId: string) {
    if (isFetchingMore.value || channelHasMore.value[channelId] === false) {
      return;
    }

    isFetchingMore.value = true;
    const nextPage = (channelPages.value[channelId] || 0) + 1;

    try {
      const res = await getMessages({
        path: { channelId },
        query: { page: nextPage, size: 50 },
        throwOnError: true,
      });

      const content = res.data?.content || [];
      if (content.length < 50) {
        channelHasMore.value[channelId] = false;
      }

      if (content.length > 0) {
        const history = content
          .map((m: any) => ({
            id: m.id,
            username: m.user?.username || "未知用戶",
            initial: m.user?.username
              ? m.user.username.charAt(0).toUpperCase()
              : "?",
            color: getRandomColor(m.user?.id || "default"),
            avatarUrl: m.user?.avatarUrl || null,
            timestamp: formatTimestamp(m.createdAt),
            createdAt: m.createdAt || "",
            text: m.content,
            materials: (m.materials || []).map((mat: any) => ({
              id: mat.id,
              originalName: mat.originalName || "未知檔案",
              fileType: mat.fileType || "",
              fileUrl: mat.fileUrl || "",
              status: mat.status || "DISABLED",
            })),
          }))
          .reverse();

        // 拼接在舊訊息陣列的最前面 (Prepend)
        const currentMessages = messages.value[channelId] || [];
        messages.value[channelId] = [...history, ...currentMessages];
        channelPages.value[channelId] = nextPage;
      }
    } catch (err) {
      console.error(`加載頻道 ${channelId} 更多歷史訊息失敗:`, err);
    } finally {
      isFetchingMore.value = false;
    }
  }

  // 取得教材下載 URL，附帶 50 分鐘的前端快取
  async function downloadMaterial(materialId: string) {
    const cached = materialUrlCache.value[materialId];
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      console.log("💡 使用前端快取的教材下載連結:", materialId);
      window.open(cached.url, "_blank");
      return;
    }

    try {
      console.log("🔄 向後端取得新教材臨時下載連結:", materialId);
      const res = await getMaterial({
        path: { materialId },
        throwOnError: true,
      });

      const fileUrl = res.data?.fileUrl;
      if (fileUrl) {
        materialUrlCache.value[materialId] = {
          url: fileUrl,
          expiresAt: now + 50 * 60 * 1000,
        };
        window.open(fileUrl, "_blank");
      } else {
        console.error("取得的教材連結為空");
      }
    } catch (err) {
      console.error(`獲取教材 ${materialId} 的下載連結失敗:`, err);
    }
  }

  // 啟用 AI 助教向量化任務 (限教師 / 助教)
  async function toggleAiAssistant(materialId: string) {
    const findMaterial = () => {
      for (const channelId in messages.value) {
        for (const msg of messages.value[channelId]) {
          const mat = msg.materials?.find((m) => m.id === materialId);
          if (mat) return mat;
        }
      }
      return undefined;
    };

    // 樂觀更新：點擊當下立即鎖定為處理中，避免等待後端回應期間被重複點擊
    const material = findMaterial();
    const previousStatus = material?.status;
    if (material) material.status = "PROCESSING";

    try {
      await enableAiAssistant({
        path: { materialId },
        signal: AbortSignal.timeout(10000),
        throwOnError: true,
      });
    } catch (err) {
      console.error(`開啟 AI 助教失敗，教材 ID: ${materialId}`, err);
      alert("啟用 AI 助教失敗，您可能權限不足或連線逾時，請再試一次。");

      // 請求失敗或逾時，還原本地狀態讓按鈕恢復可點擊
      const mat = findMaterial();
      if (mat) mat.status = previousStatus;
    }
  }

  // ================= AI 模式專屬 Actions =================

  async function enterAiMode(material: Material) {
    isAiMode.value = true;
    aiMaterial.value = material;
    aiSessions.value = [];
    activeAiSessionId.value = null;
    aiMessages.value = [];
    isAiLoading.value = false;
    isLoadingAiSessions.value = true;

    // 記住這次進入的教材 ID：aiSessions 是單一共用變數 (不像 messages 用頻道 ID
    // 分開存)，如果使用者在下面這次 await 期間又點開別的教材，這次呼叫就過期了，
    // 不能讓它事後才回來的清單蓋掉使用者現在正在看的新教材的對話清單。
    const materialIdAtEnter = material.id;
    const isStillActiveMaterial = () =>
      aiMaterial.value?.id === materialIdAtEnter;

    // 還原此教材的 Quiz 相關狀態
    activeQuiz.value = null; // 測驗進度退出即重來
    quizReport.value = materialQuizReports.value[material.id] || null;
    isQuizMode.value = materialQuizModes.value[material.id] || false;

    // 載入對話清單
    // 用 vue-query 快取：對話清單跟 channels 一樣，短時間內重新打開同一份教材
    // 直接沿用快取；資料變舊之後才在背景重新拉一次最新清單 (revalidateIfStale)。
    try {
      const data = await queryClient.ensureQueryData({
        queryKey: ["aiSessions", material.id],
        queryFn: async () => {
          const res = await listSessions({
            query: { materialId: material.id },
            throwOnError: true,
          });
          return res.data || [];
        },
        revalidateIfStale: true,
      });
      if (!isStillActiveMaterial()) return;
      aiSessions.value = [...data];

      let targetSessionId = "";
      const savedSessionId = lastActiveSessionPerMaterial.value[material.id];
      const hasSavedSession =
        savedSessionId && aiSessions.value.some((s) => s.id === savedSessionId);

      if (hasSavedSession) {
        targetSessionId = savedSessionId;
      } else if (aiSessions.value.length > 0 && aiSessions.value[0].id) {
        targetSessionId = aiSessions.value[0].id;
      } else {
        // 自動建立第一個新會話
        if (aiMaterial.value) {
          const createRes = await createSession({
            body: { materialId: aiMaterial.value.id },
            throwOnError: true,
          });
          if (createRes.data && createRes.data.id) {
            aiSessions.value.unshift(createRes.data);
            // 新建的會話要同步寫回快取，否則之後命中快取的清單會漏掉這一筆。
            queryClient.setQueryData(
              ["aiSessions", material.id],
              [...aiSessions.value],
            );
            targetSessionId = createRes.data.id;
          }
        }
      }

      if (targetSessionId && activeServerId.value) {
        router.push(
          `/channels/${activeServerId.value}/ai/${material.id}/${targetSessionId}`,
        );
      }
    } catch (err) {
      console.error("進入 AI 模式失敗:", err);
    } finally {
      afterSkeletonDelay(() => {
        if (isStillActiveMaterial()) {
          isLoadingAiSessions.value = false;
        }
      });
    }
  }

  async function enterAiModeFromUrl(
    serverId: string,
    materialId: string,
    sessionId: string,
  ) {
    isAiMode.value = true;
    activeServerId.value = serverId;
    isAiLoading.value = false;

    // 還原此教材的 Quiz 相關狀態與最後會話 ID
    activeQuiz.value = null; // 測驗進度退出即重來
    quizReport.value = materialQuizReports.value[materialId] || null;
    isQuizMode.value = materialQuizModes.value[materialId] || false;
    // 這裡要跟下面真正抓訊息前一樣同步標記為載入中，
    // 否則 MessageArea/AiChatArea 監聽 activeAiSessionId 變化的 watcher 會誤判成
    // 「訊息已經就緒」而提早（在 aiMessages 還是空的情況下）嘗試還原捲軸位置，
    // 把「等待還原」的旗標提前消耗掉，導致訊息真正載入完成後反而不會再還原了。
    isLoadingAiMessages.value = true;
    activeAiSessionId.value = sessionId;
    lastActiveSessionPerMaterial.value[materialId] = sessionId;

    // 載入伺服器頻道與角色 (若未載入)
    if (channels.value.length === 0) {
      await selectServer(serverId);
      // selectServer 內部會自動 selectChannel 並把網址導向一般頻道頁面，
      // 這裡要導回正確的 AI 對話網址，避免直接用網址進入時被誤判成離開 AI 模式
      const aiChatPath = `/channels/${serverId}/ai/${materialId}/${sessionId}`;
      if (router.currentRoute.value.path !== aiChatPath) {
        router.push(aiChatPath);
      }
    }

    // 教材詳情、會話列表、該會話的歷史訊息三者互不相依——materialId／sessionId
    // 一開始就都知道了，不必等其他請求的結果才能發，改成 Promise.all 同時發出去，
    // 三趟網路來回變成一趟(取最慢的那個)。
    // 這裡也跟 selectAiSession 一樣記住這次的會話 ID：訊息那段用 vue-query 快取，
    // AI 對話是一對一的，不會有其他使用者同時寫入同一個對話，沒有群組聊天那種
    // 需要跟 WebSocket 同步的併發風險，可以直接套用最單純的快取版本；過程中
    // 使用者完全可能在畫面上點了別的會話，這次呼叫就過期了，所以要另外判斷。
    isLoadingAiMaterial.value = true;
    isLoadingAiSessions.value = true;
    activeAiSessionId.value = sessionId;
    const sessionIdAtSelect = sessionId;
    const isStillActiveSession = () =>
      activeAiSessionId.value === sessionIdAtSelect;
    isLoadingAiMessages.value = true;

    await Promise.all([
      // 取得教材詳細資料
      (async () => {
        try {
          const matRes = await getMaterial({
            path: { materialId },
            throwOnError: true,
          });
          if (matRes.data) {
            aiMaterial.value = {
              id: matRes.data.id || "",
              originalName: matRes.data.originalName || "未知檔案",
              fileType: matRes.data.fileType || "",
              fileUrl: matRes.data.fileUrl || "",
              status: matRes.data.status || "DISABLED",
            };
          }
        } catch (e) {
          console.error("從 URL 載入教材詳情失敗:", e);
        } finally {
          afterSkeletonDelay(() => {
            isLoadingAiMaterial.value = false;
          });
        }
      })(),
      // 載入會話列表
      (async () => {
        try {
          const res = await listSessions({
            query: { materialId },
            throwOnError: true,
          });
          aiSessions.value = res.data || [];
        } catch (err) {
          console.error("從 URL 載入會話列表失敗:", err);
        } finally {
          afterSkeletonDelay(() => {
            isLoadingAiSessions.value = false;
          });
        }
      })(),
      // 選定該會話並讀取訊息
      (async () => {
        try {
          const data = await queryClient.ensureQueryData({
            queryKey: ["aiSessionMessages", sessionId],
            queryFn: async () => {
              const res = await getSessionMessages({
                path: { sessionId },
                throwOnError: true,
              });
              return res.data || [];
            },
          });
          if (isStillActiveSession()) {
            aiMessages.value = [...data];
          }
        } catch (err) {
          console.error("取得會話歷史訊息失敗:", err);
        } finally {
          afterSkeletonDelay(() => {
            if (isStillActiveSession()) {
              isLoadingAiMessages.value = false;
            }
          });
        }
      })(),
    ]);
  }

  function exitAiMode() {
    isAiMode.value = false;
    isQuizMode.value = false;
    activeQuiz.value = null;
    quizReport.value = null;
    isManagingPool.value = false;
    aiMaterial.value = null;
    aiSessions.value = [];
    activeAiSessionId.value = null;
    aiMessages.value = [];
    isAiLoading.value = false;

    if (activeServerId.value && activeChannelId.value) {
      router.push(`/channels/${activeServerId.value}/${activeChannelId.value}`);
    } else {
      router.push("/channels/@me");
    }
  }

  async function selectAiSession(sessionId: string) {
    if (activeAiSessionId.value === sessionId && aiMessages.value.length > 0) {
      isQuizMode.value = false;
      activeQuiz.value = null;
      isManagingPool.value = false;

      // 導向路由 (避免重複導向)
      if (activeServerId.value && aiMaterial.value) {
        const targetPath = `/channels/${activeServerId.value}/ai/${aiMaterial.value.id}/${sessionId}`;
        if (router.currentRoute.value.path !== targetPath) {
          router.push(targetPath);
        }
      }
      return;
    }

    activeAiSessionId.value = sessionId;
    // 記住這次選取的會話 ID：aiMessages 是單一共用變數 (不像群組聊天的
    // messages 是用頻道 ID 分開存)，如果使用者在下面這次 await 期間又切去
    // 別的對話，這次呼叫已經「過期」了，不能讓它事後才回來的結果蓋掉使用者
    // 現在正在看的新對話畫面。
    const sessionIdAtSelect = sessionId;
    const isStillActiveSession = () =>
      activeAiSessionId.value === sessionIdAtSelect;
    aiMessages.value = [];
    isAiLoading.value = false;
    isQuizMode.value = false;
    activeQuiz.value = null;
    isManagingPool.value = false;
    isLoadingAiMessages.value = true;

    // 導向路由 (避免重複導向)
    if (activeServerId.value && aiMaterial.value) {
      const targetPath = `/channels/${activeServerId.value}/ai/${aiMaterial.value.id}/${sessionId}`;
      if (router.currentRoute.value.path !== targetPath) {
        router.push(targetPath);
      }
    }

    try {
      const data = await queryClient.ensureQueryData({
        queryKey: ["aiSessionMessages", sessionId],
        queryFn: async () => {
          const res = await getSessionMessages({
            path: { sessionId },
            throwOnError: true,
          });
          return res.data || [];
        },
      });
      if (isStillActiveSession()) {
        aiMessages.value = [...data];
      }
    } catch (err) {
      console.error("取得會話歷史訊息失敗:", err);
    } finally {
      afterSkeletonDelay(() => {
        if (isStillActiveSession()) {
          isLoadingAiMessages.value = false;
        }
      });
    }
  }

  async function createNewAiSession() {
    if (!aiMaterial.value) return;

    try {
      const res = await createSession({
        body: { materialId: aiMaterial.value.id },
        throwOnError: true,
      });
      const newSession = res.data;
      if (newSession && newSession.id) {
        aiSessions.value.unshift(newSession);
        // 同步寫回對話清單的快取，否則之後命中快取的清單會漏掉這個新會話。
        queryClient.setQueryData(
          ["aiSessions", aiMaterial.value.id],
          [...aiSessions.value],
        );
        await selectAiSession(newSession.id);
      }
    } catch (err) {
      console.error("建立 AI 會話失敗:", err);
    }
  }

  async function sendAiMessage(content: string) {
    if (!activeAiSessionId.value) return;
    // 記住發送當下的會話 ID：串流回覆期間使用者可能已經切去別的對話，
    // 結束時要同步回「當初發送的那個會話」的快取，而不是切走後的新會話。
    const sessionIdAtSend = activeAiSessionId.value;
    const isStillActive = () => activeAiSessionId.value === sessionIdAtSend;

    const userMsg = {
      id: Math.random().toString(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    // 用本地陣列 (localMessages) 累積這次發送的訊息，不要直接寫共用的 aiMessages ref：
    // 使用者送出後若切去別的對話，selectAiSession 會把 aiMessages.value 換成全新陣列，
    // 這裡握著的 localMessages 參考仍是原本這個對話的內容，兩邊自然分開、不會互相污染。
    // 只有「使用者還留在這個對話」才把最新內容同步進畫面；快取則一律同步 (見最下面
    // finally)，確保訊息跟 AI 回覆不會因為中途切走就憑空消失。
    let localMessages = [...aiMessages.value, userMsg];
    if (isStillActive()) {
      aiMessages.value = localMessages;
    }

    isAiLoading.value = true;

    const token = localStorage.getItem("token");
    let botMsg: any = null;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";
      const response = await fetch(
        `${apiUrl}/v1/materials/chat-sessions/${activeAiSessionId.value}/chat/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: content }),
        },
      );

      if (!response.ok) {
        if (response.status === 429) {
          try {
            const errBody = await response.json();
            if (errBody && errBody.code === "AI_001") {
              throw new Error("AI_LIMIT_EXCEEDED");
            }
            if (errBody && errBody.code && errBody.code.startsWith("SYS_")) {
              showGlobalNotice(
                errBody.message || "目前系統繁忙，請稍候再試！",
                errBody.code,
              );
              return;
            }
          } catch (e: any) {
            if (e.message === "AI_LIMIT_EXCEEDED") throw e;
          }
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("ReadableStream not supported");
      }

      const decoder = new TextDecoder();
      let accumulatedText = "";
      let currentEventData = "";
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data:")) {
            let val = trimmed.substring(5);
            if (val.startsWith(" ")) {
              val = val.substring(1);
            }
            if (currentEventData !== "") {
              currentEventData += "\n";
            }
            currentEventData += val;
          } else if (trimmed === "") {
            // 遇到空行，代表一個 Event 結束，將其寫入累積內容並渲染
            if (currentEventData !== "") {
              accumulatedText += currentEventData;
              currentEventData = "";

              if (!botMsg) {
                if (isStillActive()) isAiLoading.value = false; // 一收到回應立即關閉 Loading 轉為顯示打字
                botMsg = {
                  id: Math.random().toString(),
                  role: "assistant",
                  content: "",
                  createdAt: new Date().toISOString(),
                };
                localMessages = [...localMessages, botMsg];
              }
              botMsg.content = accumulatedText;
              // 只有使用者還留在這個對話，才把最新內容同步進畫面
              if (isStillActive()) {
                aiMessages.value = [...localMessages];
              }
            }
          }
        }
      }

      // 處理最後的殘餘 buffer 與 event
      if (buffer) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith("data:")) {
          let val = trimmed.substring(5);
          if (val.startsWith(" ")) {
            val = val.substring(1);
          }
          if (currentEventData !== "") {
            currentEventData += "\n";
          }
          currentEventData += val;
        }
      }
      if (currentEventData !== "") {
        accumulatedText += currentEventData;
      }
      if (accumulatedText) {
        if (!botMsg) {
          if (isStillActive()) isAiLoading.value = false;
          botMsg = {
            id: Math.random().toString(),
            role: "assistant",
            content: "",
            createdAt: new Date().toISOString(),
          };
          localMessages = [...localMessages, botMsg];
        }
        botMsg.content = accumulatedText;
        if (isStillActive()) {
          aiMessages.value = [...localMessages];
        }
      }
    } catch (err: any) {
      console.error("AI 流式對話失敗:", err);
      let displayContent = "⚠️ 發送失敗，請確認網路連線或稍後再試。";
      if (err.message === "AI_LIMIT_EXCEEDED") {
        isAiLimitDialogOpen.value = true;
        displayContent = "⚠️ 本日全站 AI 額度已耗盡，請明天再試。";
      }
      // 若建立失敗或網路中斷，補回錯誤說明
      localMessages = [
        ...localMessages,
        {
          id: Math.random().toString(),
          role: "assistant",
          content: displayContent,
          createdAt: new Date().toISOString(),
        },
      ];
      if (isStillActive()) {
        aiMessages.value = [...localMessages];
      }
    } finally {
      if (isStillActive()) {
        isAiLoading.value = false;
      }
      // 把這次發送/回覆的最終結果同步回快取：不管使用者中途有沒有切去別的對話，
      // 都要把這份完整內容 (localMessages) 寫回「當初發送的那個會話」的快取，
      // 否則下次切回來會命中快取拿到「還沒送出這則訊息」的舊快照，訊息就憑空消失了。
      queryClient.setQueryData(
        ["aiSessionMessages", sessionIdAtSend],
        localMessages,
      );
    }
  }

  function sendMessage(text: string) {
    if (!activeServerId.value || !activeChannelId.value) return;

    if (stompClient && stompClient.connected) {
      // 透過 WebSocket STOMP 發送實時訊息到後端
      stompClient.publish({
        destination: `/app/servers/${activeServerId.value}/chat`,
        body: JSON.stringify({
          channelId: activeChannelId.value,
          content: text,
        }),
      });
    } else {
      console.error("WebSocket 未連線，無法發送訊息");
    }
  }

  async function uploadAndPublishMaterial(file: File, content: string) {
    if (!activeServerId.value || !activeChannelId.value) return;
    try {
      // 1. 取得預簽名上傳網址與 fileKey
      const uploadUrlRes = await getUploadUrl({
        path: { channelId: activeChannelId.value },
        query: {
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          fileSize: file.size,
        },
        throwOnError: true,
      });

      if (
        !uploadUrlRes.data ||
        !uploadUrlRes.data.uploadUrl ||
        !uploadUrlRes.data.fileKey
      ) {
        throw new Error("無法取得預簽名上傳網址");
      }

      const { uploadUrl, fileKey } = uploadUrlRes.data;

      // 2. 直傳檔案至儲存桶 (PUT 請求)
      await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      // 3. 確認發布教材貼文到後端
      const lastDot = file.name.lastIndexOf(".");
      const fileType = lastDot !== -1 ? file.name.substring(lastDot) : "";

      await postMaterial({
        path: { channelId: activeChannelId.value },
        body: {
          content: content,
          fileKey: fileKey,
          fileType: fileType,
          originalName: file.name,
          fileSize: file.size,
        },
        throwOnError: true,
      });
    } catch (err: any) {
      console.error("教材上傳與發布失敗:", err);
      const errorMsg =
        err.error?.message || err.message || "上傳失敗，請檢查空間配額與權限。";
      alert("上傳教材失敗: " + errorMsg);
      throw err;
    }
  }

  // 根據使用者 ID 從指定色盤生成固定顏色，保持頭像顏色一致
  function getRandomColor(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % avatarColors.value.length);
    return avatarColors.value[index];
  }

  // 格式化時間戳記
  function formatTimestamp(isoString: string): string {
    if (!isoString) return "剛剛";
    try {
      const date = new Date(isoString);
      const now = new Date();

      const isToday = date.toDateString() === now.toDateString();
      const timeStr = date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      if (isToday) {
        return `今天 ${timeStr}`;
      }
      return `${date.getMonth() + 1}/${date.getDate()} ${timeStr}`;
    } catch {
      return "剛剛";
    }
  }

  // ================= AI 測驗模組 Actions =================

  async function triggerQuizGeneration(
    materialId: string,
    count: number,
    difficulty: string,
  ) {
    try {
      const res = await generateQuestions({
        path: { materialId },
        query: { count, difficulty },
        throwOnError: true,
      });
      return res.data;
    } catch (err) {
      console.error("發起 AI 出題失敗:", err);
      throw err;
    }
  }

  async function fetchQuestionPool(materialId: string) {
    try {
      const res = await getQuestionPool({
        path: { materialId },
        throwOnError: true,
      });
      return res.data || [];
    } catch (err) {
      console.error("取得教材題庫失敗:", err);
      throw err;
    }
  }

  async function removeQuestion(questionId: string) {
    try {
      await deleteQuestion({
        path: { questionId },
        throwOnError: true,
      });
    } catch (err) {
      console.error("刪除考題失敗:", err);
      throw err;
    }
  }

  async function createMaterialQuiz(materialId: string) {
    try {
      const res = await createQuiz({
        path: { materialId },
        throwOnError: true,
      });
      return res.data;
    } catch (err) {
      console.error("發起測驗失敗:", err);
      throw err;
    }
  }

  async function submitQuizAnswers(
    quizId: string,
    answers: Record<string, string[]>,
  ) {
    try {
      const res = await submitQuiz({
        path: { quizId },
        body: { answers },
        throwOnError: true,
      });
      return res.data;
    } catch (err) {
      console.error("提交作答失敗:", err);
      throw err;
    }
  }

  async function fetchQuizReportData(quizId: string) {
    isLoadingQuizReport.value = true;
    try {
      // 用 vue-query 快取：單一測驗報告是提交後就固定不變的歷史紀錄，
      // 不像題庫/測驗歷史清單那樣會被「刪除題目」「重新出題」「提交新測驗」
      // 之類的操作弄髒，內容不會變，所以 staleTime 設成永不過期，不用等 30 秒
      // 到期就重打。記憶體則交給 gcTime 的預設值 (5 分鐘沒被用到就自動回收)把關，
      // 不會因為設成永不過期就無限累積。
      return await queryClient.ensureQueryData({
        queryKey: ["quizReport", quizId],
        queryFn: async () => {
          const res = await getQuizReport({
            path: { quizId },
            throwOnError: true,
          });
          return res.data;
        },
        staleTime: Infinity,
      });
    } catch (err) {
      console.error("取得測驗報告失敗:", err);
      throw err;
    } finally {
      afterSkeletonDelay(() => {
        isLoadingQuizReport.value = false;
      });
    }
  }

  async function fetchUserQuizzes(materialId: string) {
    try {
      const res = await getUserQuizzes({
        path: { materialId },
        throwOnError: true,
      });
      return res.data || [];
    } catch (err) {
      console.error("取得歷史測驗紀錄失敗:", err);
      throw err;
    }
  }

  const currentUser = ref<{
    id: string;
    username: string;
    email: string;
    avatarUrl: string | null;
  } | null>(null);

  // 懸浮用戶卡片載入中的狀態，取得個人資料前顯示 Skeleton 佔位用
  const isLoadingProfile = ref(false);

  async function fetchCurrentUserProfile() {
    const token = localStorage.getItem("token");
    if (!token) return;
    isLoadingProfile.value = true;
    try {
      const res = await getUserProfile({ throwOnError: true });
      if (res.data) {
        currentUser.value = {
          id: res.data.id ?? "",
          username: res.data.username ?? "",
          email: res.data.email ?? "",
          avatarUrl: res.data.avatarUrl ?? null,
        };
      }
    } catch (err) {
      console.error("取得使用者資料失敗:", err);
    } finally {
      afterSkeletonDelay(() => {
        isLoadingProfile.value = false;
      });
    }
  }

  async function fetchServerMaterials(): Promise<Material[]> {
    const materialChannels = channels.value.filter(
      (c) => c.type === "MATERIAL",
    );
    const materialsMap = new Map<string, Material>();

    for (const c of materialChannels) {
      if (!messages.value[c.id] || messages.value[c.id].length === 0) {
        try {
          const res = await getMessages({
            path: { channelId: c.id },
            query: { page: 0, size: 100 },
            throwOnError: true,
          });
          const history = (res.data?.content || [])
            .map((m: any) => ({
              id: m.id,
              username: m.user?.username || "未知用戶",
              initial: m.user?.username
                ? m.user.username.charAt(0).toUpperCase()
                : "?",
              color: getRandomColor(m.user?.id || "default"),
              avatarUrl: m.user?.avatarUrl || null,
              timestamp: formatTimestamp(m.createdAt),
              createdAt: m.createdAt || "",
              text: m.content,
              materials: (m.materials || []).map((mat: any) => ({
                id: mat.id,
                originalName: mat.originalName || "未知檔案",
                fileType: mat.fileType || "",
                fileUrl: mat.fileUrl || "",
                status: mat.status || "DISABLED",
              })),
            }))
            .reverse();
          messages.value[c.id] = history;
        } catch (err) {
          console.error(`取得頻道 ${c.id} 歷史訊息失敗:`, err);
        }
      }

      const channelMsgs = messages.value[c.id] || [];
      for (const msg of channelMsgs) {
        if (msg.materials) {
          for (const mat of msg.materials) {
            materialsMap.set(mat.id, mat);
          }
        }
      }
    }

    return Array.from(materialsMap.values());
  }

  async function fetchWrongQuestionsAnalysis(materialId: string) {
    try {
      const response = await client.get<any[]>({
        url: `/v1/materials/${materialId}/analysis/wrong-questions`,
      });
      return response.data;
    } catch (err) {
      console.error("取得錯題分析失敗:", err);
      throw err;
    }
  }

  // client.get 預設不會在錯誤時拋例外 (只會回傳 data: undefined)，
  // 但 vue-query 規定 queryFn 不能回傳 undefined，所以這裡要自己檢查並拋出，
  // 同時保留呼叫端 (AdminAnalysisArea.vue) 期待的 err.response.status 格式，
  // 讓「404 = 尚未生成過」的判斷式能真正生效。
  async function requestDoubtAnalysis(materialId: string, regenerate: boolean) {
    const result = await client.get<any>({
      url: `/v1/materials/${materialId}/analysis/doubts`,
      query: { regenerate },
    });
    if (result.error || result.data === undefined) {
      const err: any = new Error("取得疑問分析失敗");
      err.response = { status: result.response?.status, data: result.error };
      throw err;
    }
    return result.data;
  }

  async function fetchDoubtAnalysis(materialId: string, regenerate = false) {
    const queryKey = ["doubtAnalysis", materialId];
    try {
      if (regenerate) {
        // 手動觸發重新生成：一定要真的打 API 讓後端重新跑 AI 分析，不能吃快取。
        // 生成完後把最新結果寫回快取，之後單純查看歷史紀錄才能直接拿到新版本。
        const data = await requestDoubtAnalysis(materialId, true);
        queryClient.setQueryData(queryKey, data);
        return data;
      }

      // 單純查看歷史紀錄：短時間內重複查看同一份教材直接沿用快取；
      // 資料變舊之後才在背景重新拉一次最新分析 (revalidateIfStale)。
      return await queryClient.ensureQueryData({
        queryKey,
        queryFn: () => requestDoubtAnalysis(materialId, false),
        revalidateIfStale: true,
      });
    } catch (err) {
      console.error("取得疑問分析失敗:", err);
      throw err;
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
    onlineUserIds,
    showMemberList,
    getRandomColor,
    avatarColors,
    channelPages,
    channelHasMore,
    isFetchingMore,
    isLoadingMessages,
    isLoadingMembers,
    loadMoreMessages,
    lastActiveChannelPerServer,
    channelScrollPositions,
    aiSessionScrollPositions,
    quizReportScrollPositions,
    quizHistoryScrollPositions,
    lastActiveSessionPerMaterial,
    materialQuizReports,
    materialQuizModes,
    formatTimestamp,
    isTeacherOrTA,
    isAiMode,
    isQuizMode,
    isManagingPool,
    isAiLimitDialogOpen,
    globalNotice,
    showGlobalNotice,
    closeGlobalNotice,
    activeQuiz,
    quizReport,
    aiMaterial,
    aiSessions,
    activeAiSessionId,
    aiMessages,
    isAiLoading,
    isLoadingAiSessions,
    isLoadingAiMaterial,
    isLoadingAiMessages,
    isLoadingQuizReport,
    activeServerId,
    activeChannelId,
    activeServer,
    activeMessages,
    activeChannel,
    isLoading,
    currentUser,
    isLoadingProfile,
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
    fetchCurrentUserProfile,
    fetchServerMaterials,
    fetchWrongQuestionsAnalysis,
    fetchDoubtAnalysis,
  };
});
