<template>
  <div class="channel-view-container">
    <template v-if="store.isAiMode">
      <AiChatArea />
    </template>
    <template v-else-if="isHome">
      <div class="welcome-area">
        <div class="welcome-card">
          <h2 class="text-2xl font-bold mb-2">歡迎來到 ClassCord! 👋</h2>
          <p class="text-slate-400 text-sm">請選擇左側的伺服器與頻道開始上課或討論吧！</p>
        </div>
      </div>
    </template>
    <template v-else>
      <MessageArea />
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import MessageArea from '@/components/MessageArea.vue'
import AiChatArea from '@/components/AiChatArea.vue'
import { useAppStore } from '@/store/useAppStore'

const route = useRoute()
const store = useAppStore()

const isHome = computed(() => route.name === 'Home')

const syncRouteWithStore = async () => {
  if (route.name === 'AiChat') {
    const serverIdStr = route.params.serverId as string | undefined
    const materialIdStr = route.params.materialId as string | undefined
    const sessionIdStr = route.params.sessionId as string | undefined

    if (serverIdStr && materialIdStr && sessionIdStr) {
      // 若當前不在 AI 模式，或者會話/教材不同，觸發 enterAiModeFromUrl 載入狀態
      if (!store.isAiMode || store.activeAiSessionId !== sessionIdStr || store.aiMaterial?.id !== materialIdStr) {
        await store.enterAiModeFromUrl(serverIdStr, materialIdStr, sessionIdStr)
      }
    }
    return
  }

  const serverIdStr = route.params.serverId as string | undefined
  const channelIdStr = route.params.channelId as string | undefined
  
  if (serverIdStr) {
    if (store.activeServerId !== serverIdStr) {
      await store.selectServer(serverIdStr)
    }
    
    if (channelIdStr && channelIdStr !== 'none' && store.activeChannelId !== channelIdStr) {
      await store.selectChannel(channelIdStr)
    }
  }
}

watch(
  () => [route.name, route.params.serverId, route.params.channelId, route.params.materialId, route.params.sessionId],
  async () => {
    // 當從 AI 路由切換到普通頻道路由時，自動關閉 AI 模式
    if (route.name !== 'AiChat' && store.isAiMode) {
      store.exitAiMode()
    }
    await syncRouteWithStore()
  }
)

onMounted(async () => {
  await syncRouteWithStore()
})
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
  background: var(--bg-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #dbdee1;
}

.welcome-card {
  text-align: center;
  background: rgba(30, 31, 34, 0.4);
  padding: 32px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(8px);
}
</style>
