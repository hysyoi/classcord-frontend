<template>
  <div class="channel-view-container">
    <template v-if="store.isAiMode">
      <AiChatArea />
    </template>
    <template v-else-if="isHome">
      <div class="welcome-area">
        <div class="welcome-card">
          <h2 class="welcome-title">歡迎來到 ClassCord 🎉</h2>
          <p class="welcome-desc">請選擇左側的伺服器與頻道開始上課或討論吧！</p>
        </div>
      </div>
    </template>
    <template v-else-if="store.activeChannel?.type === 'ADMIN'">
      <AdminAnalysisArea />
    </template>
    <template v-else>
      <MessageArea />
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed, watch, onMounted } from "vue";
import { useRoute } from "vue-router";
import MessageArea from "@/components/MessageArea.vue";
import AiChatArea from "@/components/AiChatArea.vue";
import AdminAnalysisArea from "@/components/AdminAnalysisArea.vue";
import { useAppStore } from "@/store/useAppStore";

const route = useRoute();
const store = useAppStore();

const isHome = computed(() => {
  if (import.meta.env.DEV && route.query.mockHome === "true") {
    return true;
  }
  return route.name === "Home";
});

const syncRouteWithStore = async () => {
  if (route.name === "AiChat") {
    const serverIdStr = route.params.serverId as string | undefined;
    const materialIdStr = route.params.materialId as string | undefined;
    const sessionIdStr = route.params.sessionId as string | undefined;

    if (serverIdStr && materialIdStr && sessionIdStr) {
      // 若當前不在 AI 模式，或者會話/教材不同，觸發 enterAiModeFromUrl 載入狀態
      if (
        !store.isAiMode ||
        store.activeAiSessionId !== sessionIdStr ||
        store.aiMaterial?.id !== materialIdStr
      ) {
        await store.enterAiModeFromUrl(
          serverIdStr,
          materialIdStr,
          sessionIdStr,
        );
      }
    }
    return;
  }

  const serverIdStr = route.params.serverId as string | undefined;
  const channelIdStr = route.params.channelId as string | undefined;

  if (serverIdStr) {
    if (store.activeServerId !== serverIdStr) {
      await store.selectServer(serverIdStr);
    }

    if (
      channelIdStr &&
      channelIdStr !== "none" &&
      store.activeChannelId !== channelIdStr
    ) {
      await store.selectChannel(channelIdStr);
    }
  }
};

watch(
  () => [
    route.name,
    route.params.serverId,
    route.params.channelId,
    route.params.materialId,
    route.params.sessionId,
  ],
  async () => {
    // 當從 AI 路由切換到普通頻道路由時，自動關閉 AI 模式
    if (route.name !== "AiChat" && store.isAiMode) {
      store.exitAiMode();
    }
    await syncRouteWithStore();
  },
);

onMounted(async () => {
  await syncRouteWithStore();
});
</script>

<style scoped>
.channel-view-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.welcome-area {
  flex: 1;
  background: var(--bg-main);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bg-main-text-muted);
}

.welcome-card {
  text-align: center;
  padding: 32px;
  backdrop-filter: blur(8px);
}

.welcome-title {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #ffffff;
}

.welcome-desc {
  color: var(--bg-main-text-muted);
  font-size: 14px;
}
</style>
