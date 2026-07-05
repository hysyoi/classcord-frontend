<template>
  <div v-if="isDev" class="dev-tools-container">
    <!-- 懸浮切換按鈕 -->
    <button @click="isOpen = !isOpen" class="dev-toggle-btn shadow-lg">
      🛠️ {{ isOpen ? "關閉" : "除錯工具" }}
    </button>

    <!-- 除錯面板本體 -->
    <div v-if="isOpen" class="dev-panel shadow-2xl border border-slate-700/50">
      <div class="panel-header border-b border-slate-700">
        <span class="font-bold text-indigo-400">ClassCord 開發調試工具</span>
      </div>

      <div class="panel-body space-y-4 text-xs">
        <!-- 狀態資訊 -->
        <div
          class="info-group bg-[var(--bg-darkest)] p-2.5 rounded border border-slate-800 space-y-1.5"
        >
          <div class="flex justify-between">
            <span class="text-slate-400">登入狀態:</span>
            <span
              :class="
                authStore.isAuthenticated
                  ? 'text-green-400 font-semibold'
                  : 'text-red-400 font-semibold'
              "
            >
              {{ authStore.isAuthenticated ? "已登入" : "訪客 (未登入)" }}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">目前路由:</span>
            <span class="text-blue-400 font-mono">{{ route.path }}</span>
          </div>
          <div class="flex flex-col gap-0.5">
            <span class="text-slate-400">Token 預覽:</span>
            <span
              class="text-slate-300 font-mono break-all bg-slate-950 p-1 rounded mt-1 select-all overflow-y-auto max-h-12"
            >
              {{ authStore.token || "Null" }}
            </span>
          </div>
        </div>

        <!-- 快速功能按鈕 -->
        <div class="flex flex-col gap-2">
          <button
            @click="autofill"
            class="action-btn bg-indigo-600 hover:bg-indigo-500"
          >
            📝 填寫測試帳密 (Dev Email)
          </button>

          <button
            @click="handleLogout"
            :disabled="!authStore.isAuthenticated"
            class="action-btn bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🚪 安全登出 (清除 Token)
          </button>

          <button
            @click="simulate401"
            :disabled="!authStore.isAuthenticated"
            class="action-btn bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ⚠️ 模擬 401 Token 失效
          </button>

          <button
            @click="toggleOutlines"
            class="action-btn transition"
            :class="
              showOutlines
                ? 'bg-pink-600 hover:bg-pink-500 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
            "
          >
            {{ showOutlines ? "🟢 隱藏排版輔助線" : "🔴 顯示排版輔助線" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/store/useAuthStore";
import { getJoinedServers } from "@/api/generated";

const isDev = import.meta.env.DEV;
const isOpen = ref(false);
const showOutlines = ref(false);

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

// 0. 一鍵切換全網頁元素排版輔助線 (outline)
const toggleOutlines = () => {
  showOutlines.value = !showOutlines.value;
  document.body.classList.toggle("dev-show-outlines", showOutlines.value);
};

// 1. 一鍵填寫測試信箱與密碼
const autofill = () => {
  const emailInput = document.querySelector(
    'input[type="email"]',
  ) as HTMLInputElement;
  const passwordInput = document.querySelector(
    'input[type="password"]',
  ) as HTMLInputElement;

  if (emailInput && passwordInput) {
    emailInput.value = "test@email.com";
    emailInput.dispatchEvent(new Event("input"));

    passwordInput.value = "password";
    passwordInput.dispatchEvent(new Event("input"));
  } else {
    alert("未在畫面上偵測到登入輸入框！請先切換至登入頁。");
  }
};

// 2. 調用 Store 安全登出
const handleLogout = async () => {
  await authStore.logout();
  router.push("/login");
};

// 3. 模擬 401 錯誤：寫入無效 token 並向後端發送請求
const simulate401 = async () => {
  const badToken = "invalid-expired-jwt-token-xyz";
  localStorage.setItem("token", badToken);
  authStore.token = badToken;

  try {
    // 呼叫伺服器列表 API (該端點受 Spring Security 保護)
    await getJoinedServers({ throwOnError: true });
  } catch (error) {
    console.log("模擬 401 錯誤成功觸發:", error);
  }
};
</script>

<style scoped>
.dev-tools-container {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 9999;
  font-family: sans-serif;
}

.dev-toggle-btn {
  background: var(--bg-dark);
  color: #dbdee1;
  border: 1px solid var(--bg-darkest);
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s;
}

.dev-toggle-btn:hover {
  background: var(--brand-color);
  color: white;
}

.dev-panel {
  position: absolute;
  bottom: 45px;
  right: 0;
  width: 280px;
  background: var(--bg-darker);
  border-radius: 8px;
  overflow: hidden;
  color: #dbdee1;
}

.panel-header {
  padding: 10px 14px;
  background: var(--bg-darkest);
  font-size: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-body {
  padding: 14px;
}

.action-btn {
  width: 100%;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: opacity 0.2s;
}

.action-btn:hover {
  opacity: 0.9;
}
</style>
