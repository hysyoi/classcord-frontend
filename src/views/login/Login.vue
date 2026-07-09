<template>
  <div class="login-page">
    <Card class="login-card border-none">
      <CardHeader class="text-center pb-6 pt-8">
        <CardTitle
          @click="router.push('/')"
          class="text-3xl font-extrabold tracking-wider bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent cursor-pointer hover:opacity-90 transition"
        >
          ClassCord
        </CardTitle>
        <CardDescription class="text-xs text-slate-400 mt-1.5">
          請在下方輸入您的電子信箱以登入帳號
        </CardDescription>
      </CardHeader>

      <CardContent class="px-8 pb-4">
        <div
          v-if="errorMessage"
          class="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded p-2.5 mb-6 text-center"
        >
          {{ errorMessage }}
        </div>

        <form @submit.prevent="handleLogin" id="login-form" novalidate>
          <FieldSet>
            <FieldGroup>
              <Field>
                <FieldLabel for="email" class="text-slate-300"
                  >電子信箱</FieldLabel
                >
                <Input
                  id="email"
                  type="email"
                  v-model="email"
                  placeholder="m@example.com"
                  required
                  class="bg-[var(--bg-darkest)] text-[#dbdee1] border-slate-700 focus-visible:ring-indigo-500"
                />
                <span
                  v-if="errors.email"
                  class="text-red-400 text-[10px] mt-1 block"
                  >{{ errors.email }}</span
                >
              </Field>

              <Field>
                <div class="flex items-center justify-between">
                  <FieldLabel for="password" class="text-slate-300"
                    >密碼</FieldLabel
                  >
                  <router-link
                    to="/forgot-password"
                    class="text-xs text-slate-400 hover:text-indigo-400 underline-offset-4 hover:underline transition"
                  >
                    忘記密碼？
                  </router-link>
                </div>
                <Input
                  id="password"
                  type="password"
                  v-model="password"
                  required
                  class="bg-[var(--bg-darkest)] text-[#dbdee1] border-slate-700 focus-visible:ring-indigo-500"
                />
                <span
                  v-if="errors.password"
                  class="text-red-400 text-[10px] mt-1 block"
                  >{{ errors.password }}</span
                >
              </Field>
            </FieldGroup>
          </FieldSet>

          <div class="twidget">
            <TurnstileWidget
              ref="turnstileRef"
              @verify="onTurnstileVerify"
              @expire="onTurnstileExpire"
            />
          </div>

          <Button
            :disabled="!turnstileToken"
            type="submit"
            class="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ turnstileToken ? "登入" : "Cloudflare Turnstile 驗證中..." }}
          </Button>
        </form>
      </CardContent>

      <CardFooter class="px-8 pb-8 flex flex-col gap-4 items-center">
        <!-- 分割線 -->
        <div class="relative flex py-1 items-center w-full max-w-[336px]">
          <div class="flex-grow border-t border-slate-700/50"></div>
          <span
            class="flex-shrink mx-4 text-[10px] text-slate-500 uppercase tracking-wider font-semibold"
            >或者使用以下方式登入</span
          >
          <div class="flex-grow border-t border-slate-700/50"></div>
        </div>

        <!-- 第三方登入按鈕群組 -->
        <div class="flex flex-col gap-2.5 w-full max-w-[336px]">
          <!-- Google 官方品牌按鈕 -->
          <Button
            @click="loginWithGoogle"
            type="button"
            class="relative w-full h-10 bg-[var(--bg-darkest)] hover:bg-[var(--bg-darker)] text-white font-medium transition cursor-pointer flex items-center justify-center rounded border border-slate-700/80 shadow-md"
          >
            <svg
              class="absolute left-4 h-4 w-4"
              aria-hidden="true"
              focusable="false"
              role="img"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1c-1.9 0-3.66.54-5.14 1.48l3.66 2.84c.87-.52 1.88-.94 3.47-.94c2.86 0 5.3 1.92 6.16 4.52z"
                fill="#EA4335"
              />
            </svg>
            使用 Google 帳號登入
          </Button>

          <!-- GitHub 官方品牌按鈕 -->
          <Button
            @click="loginWithGithub"
            type="button"
            class="relative w-full h-10 bg-[#24292F] hover:bg-[#24292F]/90 text-white font-medium transition cursor-pointer flex items-center justify-center rounded border-none shadow-md"
          >
            <svg
              class="absolute left-4 h-4 w-4"
              aria-hidden="true"
              focusable="false"
              role="img"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            使用 GitHub 帳號登入
          </Button>

          <!-- Discord 官方品牌按鈕 -->
          <Button
            @click="loginWithDiscord"
            type="button"
            class="relative w-full h-10 bg-[#5865F2] hover:bg-[#5865F2]/90 text-white font-medium transition cursor-pointer flex items-center justify-center rounded border-none shadow-md"
          >
            <svg
              class="absolute left-4 h-4.5 w-4.5"
              aria-hidden="true"
              focusable="false"
              role="img"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 127.14 96.36"
              fill="currentColor"
            >
              <path
                d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.87-.64,1.71-1.32,2.51-2a75.46,75.46,0,0,0,76.08,0c.8,0.71,1.64,1.39,2.51,2a68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,32.58-18.83C129.87,48.24,124,25.43,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.88,46,53.88,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.12,46,96.12,53,91,65.69,84.69,65.69Z"
              />
            </svg>
            使用 Discord 帳號登入
          </Button>
        </div>

        <div class="text-xs text-slate-400 mt-1">
          需要一個帳號？
          <router-link
            to="/register"
            class="text-indigo-400 hover:underline transition ml-1"
          >
            註冊
          </router-link>
        </div>
      </CardFooter>
    </Card>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/store/useAuthStore";
import { oauthAuthenticate } from "@/api/generated";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TurnstileWidget from "@/components/TurnstileWidget.vue";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";

const email = ref("");
const password = ref("");
const errorMessage = ref("");
const errors = ref({
  email: "",
  password: "",
});

const turnstileRef = ref<any>(null);
const turnstileToken = ref("");

const onTurnstileVerify = (token: string) => {
  turnstileToken.value = token;
};

const onTurnstileExpire = () => {
  turnstileToken.value = "";
};

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

// 監聽欄位異動，清除錯誤訊息
watch(email, () => (errors.value.email = ""));
watch(password, () => (errors.value.password = ""));

onMounted(() => {
  // 處理 Google / GitHub / Discord 認證碼 (code) 回傳邏輯 (回傳在 URL Query 參數中)
  const code = route.query.code as string;
  if (code) {
    const provider = localStorage.getItem("oauth_provider") as
      "GOOGLE" | "GITHUB" | "DISCORD" | null;
    if (
      provider === "GOOGLE" ||
      provider === "GITHUB" ||
      provider === "DISCORD"
    ) {
      handleOAuthCallback(provider, code);
    }
  }
});

const validate = () => {
  let isValid = true;
  errors.value.email = "";
  errors.value.password = "";

  if (!email.value.trim()) {
    errors.value.email = "Email不可為空";
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    errors.value.email = "Email格式錯誤";
    isValid = false;
  } else if (email.value.length > 255) {
    errors.value.email = "Email長度不可超過255字元";
    isValid = false;
  }

  if (!password.value) {
    errors.value.password = "密碼不可為空";
    isValid = false;
  } else if (password.value.length < 8 || password.value.length > 100) {
    errors.value.password = "密碼長度需介於8~100字元";
    isValid = false;
  }

  return isValid;
};

// 處理一般密碼登入
const handleLogin = async () => {
  errorMessage.value = "";
  if (!validate()) return;

  try {
    await authStore.login(email.value, password.value, turnstileToken.value);
    const redirect = (route.query.redirect as string) || "/channels/@me";
    router.push(redirect);
  } catch (err: any) {
    console.error("登入失敗:", err);

    // 💡 登入失敗時，需重設人機驗證
    turnstileRef.value?.reset();
    turnstileToken.value = "";

    if (err?.body?.errors) {
      const fieldErrors = err.body.errors;
      if (fieldErrors.email) errors.value.email = fieldErrors.email;
      if (fieldErrors.password) errors.value.password = fieldErrors.password;
      errorMessage.value = err.body.message || "輸入欄位驗證失敗，請檢查格式";
    } else {
      errorMessage.value =
        err?.body?.message || "登入失敗，請檢查電子信箱與密碼是否正確";
    }
  }
};

// 1. Google 登入 (使用與 GitHub/Discord 統一的 Authorization Code Flow 跳轉，完全去除了 iframe SDK)
const loginWithGoogle = () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId || clientId === "your-google-client-id") {
    alert("請先在前端的 .env 檔案中配置真實的 VITE_GOOGLE_CLIENT_ID！");
    return;
  }

  localStorage.setItem("oauth_provider", "GOOGLE");
  const redirectUri = encodeURIComponent(`${window.location.origin}/login`);

  // 以 code (Authorization Code Flow) 模式跳轉
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20profile%20email`;
};

// 2. GitHub 登入跳轉
const loginWithGithub = () => {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
  if (!clientId || clientId === "your-github-client-id") {
    alert("請先在前端的 .env 檔案中配置真實的 VITE_GITHUB_CLIENT_ID！");
    return;
  }

  localStorage.setItem("oauth_provider", "GITHUB");
  const redirectUri = encodeURIComponent(`${window.location.origin}/login`);
  window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=read:user%20user:email`;
};

// 3. Discord 登入跳轉
const loginWithDiscord = () => {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
  if (!clientId || clientId === "your-discord-client-id") {
    alert("請先在前端的 .env 檔案中配置真實的 VITE_DISCORD_CLIENT_ID！");
    return;
  }

  localStorage.setItem("oauth_provider", "DISCORD");
  const redirectUri = encodeURIComponent(`${window.location.origin}/login`);
  window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20email`;
};

// 統一處理 Google / GitHub / Discord Callback 授權碼交換
const handleOAuthCallback = async (
  provider: "GOOGLE" | "GITHUB" | "DISCORD",
  code: string,
) => {
  errorMessage.value = "";

  // 清除 localStorage 的 provider，並在網址中拿掉 ?code= 參數以保持乾淨
  localStorage.removeItem("oauth_provider");
  const redirect = route.query.redirect as string;
  router.replace({ path: "/login", query: redirect ? { redirect } : {} });

  try {
    const res = await oauthAuthenticate({
      path: { provider },
      body: { credential: code },
      throwOnError: true,
    });

    const tokenValue = res.data?.accessToken;
    if (tokenValue) {
      localStorage.setItem("token", tokenValue);
      authStore.token = tokenValue;
      router.push(redirect || "/channels/@me");
    }
  } catch (err) {
    console.error(`${provider} 登入驗證失敗:`, err);
    errorMessage.value = `${provider} 認證失敗，可能是授權碼已失效或配置錯誤。`;
  }
};
</script>

<style scoped>
.login-page {
  width: 100%;
  height: 100%;
  min-height: 100vh;
  overflow-y: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  box-sizing: border-box;
  background: radial-gradient(
    circle at center,
    var(--bg-darker) 0%,
    var(--bg-black) 100%
  );
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: rgba(43, 45, 49, 0.7) !important;
  border-radius: 12px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(12px);
}
</style>
