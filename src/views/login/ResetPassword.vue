<template>
  <div class="reset-password-page">
    <Card class="reset-password-card">
      <CardHeader class="card-header">
        <CardTitle @click="router.push('/')" class="card-title">
          ClassCord
        </CardTitle>
        <CardDescription class="card-description">
          重新設定您的新密碼
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
          <div class="success-title">密碼重設成功！</div>
          <div class="success-description">
            您的帳戶密碼已成功更新。<br />
            系統將在 3 秒後自動導向登入頁面...
          </div>
          <Button @click="router.push('/login')" class="submit-btn">
            立即前往登入
          </Button>
        </div>

        <!-- 重設密碼表單 -->
        <form
          v-else
          @submit.prevent="handleResetPassword"
          id="reset-password-form"
          novalidate
        >
          <FieldSet>
            <FieldGroup>
              <Field>
                <FieldLabel for="new-password" class="field-label"
                  >輸入新密碼</FieldLabel
                >
                <div class="password-input-wrapper">
                  <Input
                    id="new-password"
                    :type="showNewPassword ? 'text' : 'password'"
                    v-model="newPassword"
                    placeholder="新密碼需為 8~100 位字元"
                    required
                    class="field-input password-input"
                  />
                  <button
                    type="button"
                    class="password-toggle-btn"
                    @click="showNewPassword = !showNewPassword"
                  >
                    <EyeOff v-if="showNewPassword" class="eye-icon" />
                    <Eye v-else class="eye-icon" />
                  </button>
                </div>
                <span v-if="errors.newPassword" class="field-error-text"
                  ><WarningFillIcon />{{ errors.newPassword }}</span
                >
              </Field>

              <Field>
                <FieldLabel for="confirm-password" class="field-label"
                  >確認新密碼</FieldLabel
                >
                <div class="password-input-wrapper">
                  <Input
                    id="confirm-password"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    v-model="confirmPassword"
                    placeholder="請再次輸入新密碼"
                    required
                    class="field-input password-input"
                  />
                  <button
                    type="button"
                    class="password-toggle-btn"
                    @click="showConfirmPassword = !showConfirmPassword"
                  >
                    <EyeOff v-if="showConfirmPassword" class="eye-icon" />
                    <Eye v-else class="eye-icon" />
                  </button>
                </div>
                <span v-if="errors.confirmPassword" class="field-error-text"
                  ><WarningFillIcon />{{ errors.confirmPassword }}</span
                >
              </Field>
            </FieldGroup>
          </FieldSet>
        </form>
      </CardContent>

      <CardFooter v-if="!isSuccess" class="card-footer">
        <Button
          type="submit"
          form="reset-password-form"
          :disabled="isLoading"
          class="submit-btn"
        >
          {{ isLoading ? "儲存中..." : "儲存新密碼" }}
        </Button>
      </CardFooter>
    </Card>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { resetPassword } from "@/api/generated";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import WarningFillIcon from "~icons/mingcute/warning-fill";
import { Eye, EyeOff } from "lucide-vue-next";

const newPassword = ref("");
const confirmPassword = ref("");
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);
const token = ref("");
const errorMessage = ref("");
const isSuccess = ref(false);
const isLoading = ref(false);
const errors = ref({
  newPassword: "",
  confirmPassword: "",
});

const router = useRouter();
const route = useRoute();

watch(newPassword, () => {
  errors.value.newPassword = "";
});
watch(confirmPassword, () => {
  errors.value.confirmPassword = "";
});

onMounted(() => {
  const tokenQuery = route.query.token as string;
  if (!tokenQuery) {
    alert("密碼重設連結不完整或無效，將引導您重新申請。");
    router.replace("/forgot-password");
    return;
  }
  token.value = tokenQuery;
});

const validate = () => {
  let isValid = true;
  errors.value.newPassword = "";
  errors.value.confirmPassword = "";

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;
  if (!newPassword.value) {
    errors.value.newPassword = "新密碼不能為空";
    isValid = false;
  } else if (newPassword.value.length < 8 || newPassword.value.length > 100) {
    errors.value.newPassword = "新密碼長度需介於 8~100 字元";
    isValid = false;
  } else if (!passwordRegex.test(newPassword.value)) {
    errors.value.newPassword =
      "密碼必須包含至少一個大寫字母、一個小寫字母、一個數字和一個特殊符號";
    isValid = false;
  }

  if (!confirmPassword.value) {
    errors.value.confirmPassword = "請再次輸入密碼以進行確認";
    isValid = false;
  } else if (confirmPassword.value !== newPassword.value) {
    errors.value.confirmPassword = "兩次輸入的密碼不一致";
    isValid = false;
  }

  return isValid;
};

const handleResetPassword = async () => {
  errorMessage.value = "";
  if (!validate()) return;

  isLoading.value = true;
  try {
    await resetPassword({
      body: {
        token: token.value,
        newPassword: newPassword.value,
      },
      throwOnError: true,
    });
    isSuccess.value = true;
    setTimeout(() => {
      router.push("/login");
    }, 3000);
  } catch (err: any) {
    console.error("密碼重設執行失敗:", err);
    if (err?.body?.errors?.newPassword) {
      errors.value.newPassword = err.body.errors.newPassword;
    } else {
      errorMessage.value =
        err?.body?.message || "密碼重設失敗，連結可能已過期或已被使用。";
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.reset-password-page {
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

.reset-password-card {
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
  padding-bottom: 16px;
}

.error-alert {
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  font-size: 12px;
  border-radius: 8px;
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

.password-input-wrapper {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
}

.password-toggle-btn {
  position: absolute;
  right: 12px;
  background: transparent;
  border: none;
  color: var(--bg-surface-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: color 0.2s ease;
}

.password-toggle-btn:hover {
  color: #ffffff;
}

.eye-icon {
  width: 18px;
  height: 18px;
}

.password-input {
  padding-right: 40px !important;
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

.submit-btn {
  width: 100%;
  margin-top: 12px;
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
</style>
