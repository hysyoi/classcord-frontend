<template>
  <div class="forgot-password-page">
    <Card class="forgot-password-card">
      <CardHeader class="card-header">
        <CardTitle @click="router.push('/')" class="card-title">
          ClassCord
        </CardTitle>
        <CardDescription class="card-description">
          重設您的帳戶密碼
        </CardDescription>
      </CardHeader>

      <CardContent class="card-content">
        <!-- 錯誤提示 -->
        <div v-if="errorMessage" class="error-alert">
          {{ errorMessage }}
        </div>

        <!-- 成功提示畫面 -->
        <div v-if="isSuccess" class="success-container">
          <div class="success-icon">✓</div>
          <div class="success-title">重設信件已寄出！</div>
          <div class="success-description">
            我們已向您的電子信箱
            <span class="success-email">{{ email }}</span>
            寄送了密碼重設連結。<br />
            請前往您的收件匣點擊連結以重新設定密碼（連結有效期限為 15 分鐘）。
          </div>
          <Button @click="router.push('/login')" class="submit-btn">
            返回登入
          </Button>
          <div class="pb-1"></div>
        </div>

        <!-- 忘記密碼表單 -->
        <form
          v-else
          @submit.prevent="handleForgotPassword"
          id="forgot-password-form"
          novalidate
        >
          <FieldSet>
            <FieldGroup>
              <Field>
                <FieldLabel for="email" class="field-label"
                  >請輸入您的註冊電子信箱</FieldLabel
                >
                <Input
                  id="email"
                  type="email"
                  v-model="email"
                  placeholder="m@example.com"
                  required
                  class="field-input"
                />
                <span v-if="emailError" class="field-error-text"
                  ><WarningFillIcon />{{ emailError }}</span
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
        </form>
      </CardContent>

      <CardFooter v-if="!isSuccess" class="card-footer">
        <Button
          type="submit"
          form="forgot-password-form"
          :disabled="isLoading || !turnstileToken"
          class="submit-btn"
        >
          {{
            isLoading
              ? "發送中..."
              : turnstileToken
                ? "發送重設郵件"
                : "Cloudflare Turnstile 驗證中..."
          }}
        </Button>

        <div class="footer-redirect-text">
          記起密碼了？
          <router-link to="/login" class="footer-link"> 返回登入 </router-link>
        </div>
      </CardFooter>
    </Card>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import { forgotPassword } from "@/api/generated";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TurnstileWidget from "@/components/TurnstileWidget.vue";
import WarningFillIcon from "~icons/mingcute/warning-fill";
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
const emailError = ref("");
const errorMessage = ref("");
const isSuccess = ref(false);
const isLoading = ref(false);
const router = useRouter();

const turnstileRef = ref<any>(null);
const turnstileToken = ref("");

const onTurnstileVerify = (token: string) => {
  turnstileToken.value = token;
};

const onTurnstileExpire = () => {
  turnstileToken.value = "";
};

watch(email, () => {
  emailError.value = "";
});

const validate = () => {
  emailError.value = "";
  if (!email.value.trim()) {
    emailError.value = "電子郵件不能為空";
    return false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    emailError.value = "電子郵件格式不正確";
    return false;
  } else if (email.value.length > 255) {
    emailError.value = "Email長度不可超過255字元";
    return false;
  }
  return true;
};

const handleForgotPassword = async () => {
  errorMessage.value = "";
  if (!validate()) return;

  isLoading.value = true;
  try {
    await forgotPassword({
      body: {
        email: email.value,
        turnstileToken: turnstileToken.value,
      },
      throwOnError: true,
    });
    isSuccess.value = true;
  } catch (err: any) {
    console.error("忘記密碼請求失敗:", err);

    // 💡 請求失敗時，需重設人機驗證
    turnstileRef.value?.reset();
    turnstileToken.value = "";

    if (err?.status === 429) {
      errorMessage.value = "發送過於頻繁，請在 60 秒後再試。";
    } else if (err?.body?.errors?.email) {
      emailError.value = err.body.errors.email;
    } else {
      errorMessage.value =
        err?.body?.message || "發送失敗，請確認該 Email 是否已註冊。";
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.forgot-password-page {
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
    var(--bg-surface) 0%,
    var(--bg-surface) 100%
  );
}

.forgot-password-card {
  width: 100%;
  max-width: 400px;
  background: var(--bg-surface-light) !important;
  border-radius: 22px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(12px);
  border: 1px solid var(--bg-surface-light-border) !important;
}

.card-header {
  text-align: center;
  padding-top: 32px;
  padding-bottom: 24px;
}

.card-title {
  font-size: 30px;
  font-weight: 800;
  letter-spacing: 0.05em;
  background: #ffffff;
  -webkit-background-clip: text;
  background-clip: text;
  color: #ffffff;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.card-title:hover {
  opacity: 0.9;
}

.card-description {
  font-size: 12px;
  color: var(--bg-surface-light-text-muted);
  margin-top: 6px;
}

.card-content {
  padding-left: 32px;
  padding-right: 32px;
  padding-bottom: 0;
}

.error-alert {
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  font-size: 12px;
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 24px;
  text-align: center;
}

.success-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  padding-top: 16px;
  padding-bottom: 16px;
}

.success-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #34d399;
  font-size: 24px;
}

.success-title {
  color: #e2e8f0;
  font-size: 14px;
  font-weight: 600;
}

.success-description {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.625;
}

.success-email {
  color: #cbd5e1;
  font-weight: 500;
}

.field-label {
  color: #ffffff;
  font-size: 15px;
}

.field-input {
  background-color: var(--bg-surface) !important;
  color: var(--bg-surface-text-muted) !important;
  border-color: var(--bg-surface-light-border) !important;
  border-radius: 8px;
  font-size: 14px;
  padding: 2px 16px;
}

.field-input:focus-visible {
  outline: none !important;
  box-shadow: 0 0 0 2px #ffffff !important;
}

.field-error-text {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--error);
  font-size: 13px;
  margin-top: -4px;
}

.twidget {
  margin-top: 16px;
  margin-bottom: 16px;
}

.submit-btn {
  width: 100%;
  margin-top: 0px;
  background-color: var(--primary) !important;
  color: #ffffff !important;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    opacity 0.2s ease;
  border: none !important;
  font-size: 16px;
  border-radius: 8px;
  max-width: 336px;
}

.submit-btn:hover:not(:disabled) {
  background-color: var(--primary-muted) !important;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.card-footer {
  padding-left: 32px;
  padding-right: 32px;
  padding-bottom: 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

.footer-redirect-text {
  font-size: 14px;
  color: #ffffff;
  margin-top: 4px;
}

.footer-link {
  color: var(--primary-light);
  text-decoration: none;
  transition: text-decoration 0.2s ease;
  margin-left: 4px;
}

.footer-link:hover {
  text-decoration: underline;
}
</style>
