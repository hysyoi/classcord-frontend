<template>
  <div class="join-page">
    <div class="join-card">
      <div v-if="state === 'loading'" class="loading-state">
        <div class="spinner"></div>
        <h2>正在加入班級...</h2>
        <p>請稍候，我們正在為您辦理入學手續 🎓</p>
      </div>

      <div v-else-if="state === 'success'" class="success-state">
        <div class="icon-success">✓</div>
        <h2>加入成功！</h2>
        <p>即將為您導向至班級討論區...</p>
      </div>

      <div v-else class="error-state">
        <div class="icon-error">&times;</div>
        <h2>加入班級失敗</h2>
        <p class="error-msg">{{ errorMessage }}</p>
        <button class="btn-home" @click="router.push('/channels/@me')">
          返回 ClassCord 首頁
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAppStore } from "@/store/useAppStore";
import { joinServer } from "@/api/generated";

const route = useRoute();
const router = useRouter();
const store = useAppStore();

const state = ref<"loading" | "success" | "error">("loading");
const errorMessage = ref("");

onMounted(async () => {
  const serverId = route.params.serverId as string;
  if (!serverId) {
    state.value = "error";
    errorMessage.value = "無效的班級邀請連結。";
    return;
  }

  try {
    // 呼叫 API 加入班級
    await joinServer({
      path: { serverId },
      throwOnError: true,
    });

    state.value = "success";

    // 重新載入列表
    await store.fetchServers();
    await store.selectServer(serverId);

    // 延遲一下跳轉以顯示成功特效
    setTimeout(() => {
      if (store.activeChannelId) {
        router.push(`/channels/${serverId}/${store.activeChannelId}`);
      } else {
        router.push("/channels/@me");
      }
    }, 1200);
  } catch (err: any) {
    console.error("加入班級失敗:", err);
    // 即使後端回傳 409 (已經是成員)，我們也可以視為成功並導向
    if (
      err?.status === 409 ||
      err?.body?.message?.includes("already a member") ||
      err?.body?.message?.includes("已加入")
    ) {
      state.value = "success";
      await store.fetchServers();
      await store.selectServer(serverId);
      if (store.activeChannelId) {
        router.push(`/channels/${serverId}/${store.activeChannelId}`);
      } else {
        router.push("/channels/@me");
      }
    } else {
      state.value = "error";
      errorMessage.value =
        err?.body?.message ||
        "您所使用的班級連結已失效，或您沒有加入此班級的權限。";
    }
  }
});
</script>

<style scoped>
.join-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(
    circle at center,
    var(--bg-darker) 0%,
    var(--bg-black) 100%
  );
  color: #dbdee1;
}

.join-card {
  width: 100%;
  max-width: 420px;
  background: rgba(43, 45, 49, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 40px 32px;
  text-align: center;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
}

h2 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #f2f3f5;
}

p {
  font-size: 14px;
  color: #949ba4;
  line-height: 1.5;
}

.loading-state,
.success-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-left-color: var(--brand-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 8px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.icon-success {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(35, 165, 90, 0.15);
  color: #23a55a;
  font-size: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-bottom: 8px;
}

.icon-error {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(242, 63, 66, 0.15);
  color: #f23f42;
  font-size: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.error-msg {
  color: #f23f42;
  font-size: 13px;
}

.btn-home {
  margin-top: 12px;
  background: var(--brand-color);
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-home:hover {
  background: var(--brand-hover);
}
</style>
