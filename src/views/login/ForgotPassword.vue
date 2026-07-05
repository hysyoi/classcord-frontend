<template>
  <div class="forgot-password-page">
    <Card class="forgot-password-card border-none">
      <CardHeader class="text-center pb-6 pt-8">
        <CardTitle @click="router.push('/')" class="text-3xl font-extrabold tracking-wider bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent cursor-pointer hover:opacity-90 transition">
          ClassCord
        </CardTitle>
        <CardDescription class="text-xs text-slate-400 mt-1.5">
          重設您的帳戶密碼
        </CardDescription>
      </CardHeader>

      <CardContent class="px-8 pb-6">
        <!-- 錯誤提示 -->
        <div v-if="errorMessage" class="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded p-2.5 mb-6 text-center">
          {{ errorMessage }}
        </div>

        <!-- 成功提示畫面 -->
        <div v-if="isSuccess" class="flex flex-col items-center gap-4 text-center py-4">
          <div class="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-2xl">
            ✓
          </div>
          <div class="text-slate-200 text-sm font-semibold">重設信件已寄出！</div>
          <div class="text-xs text-slate-400 leading-relaxed">
            我們已向您的電子信箱 <span class="text-slate-300 font-medium">{{ email }}</span> 寄送了密碼重設連結。<br>
            請前往您的收件匣點擊連結以重新設定密碼（連結有效期限為 15 分鐘）。
          </div>
          <Button @click="router.push('/login')" class="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition">
            返回登入
          </Button>
        </div>

        <!-- 忘記密碼表單 -->
        <form v-else @submit.prevent="handleForgotPassword" id="forgot-password-form" novalidate>
          <FieldSet>
            <FieldGroup>
              <Field>
                <FieldLabel for="email" class="text-slate-300">請輸入您的註冊電子信箱</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  v-model="email"
                  placeholder="m@example.com"
                  required
                  class="bg-[var(--bg-darkest)] text-[#dbdee1] border-slate-700 focus-visible:ring-indigo-500"
                />
                <span v-if="emailError" class="text-red-400 text-[10px] mt-1 block">{{ emailError }}</span>
              </Field>
            </FieldGroup>
          </FieldSet>
        </form>
      </CardContent>

      <CardFooter v-if="!isSuccess" class="px-8 pb-8 flex flex-col gap-4 items-center">
        <Button type="submit" form="forgot-password-form" :disabled="isLoading" class="w-full max-w-[336px] bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition">
          {{ isLoading ? '發送中...' : '發送重設郵件' }}
        </Button>
        
        <div class="text-xs text-slate-400 mt-1">
          記起密碼了？
          <router-link to="/login" class="text-indigo-400 hover:underline transition ml-1">
            返回登入
          </router-link>
        </div>
      </CardFooter>
    </Card>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { forgotPassword } from '@/api/generated'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from '@/components/ui/field'

const email = ref('')
const emailError = ref('')
const errorMessage = ref('')
const isSuccess = ref(false)
const isLoading = ref(false)
const router = useRouter()

watch(email, () => {
  emailError.value = ''
})

const validate = () => {
  emailError.value = ''
  if (!email.value.trim()) {
    emailError.value = '電子郵件不能為空'
    return false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    emailError.value = '電子郵件格式不正確'
    return false
  } else if (email.value.length > 255) {
    emailError.value = 'Email長度不可超過255字元'
    return false
  }
  return true
}

const handleForgotPassword = async () => {
  errorMessage.value = ''
  if (!validate()) return

  isLoading.value = true
  try {
    await forgotPassword({
      body: { email: email.value },
      throwOnError: true
    })
    isSuccess.value = true
  } catch (err: any) {
    console.error('忘記密碼請求失敗:', err)
    if (err?.status === 429) {
      errorMessage.value = '發送過於頻繁，請在 60 秒後再試。'
    } else if (err?.body?.errors?.email) {
      emailError.value = err.body.errors.email
    } else {
      errorMessage.value = err?.body?.message || '發送失敗，請確認該 Email 是否已註冊。'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.forgot-password-page {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at center, var(--bg-darker) 0%, var(--bg-black) 100%);
}

.forgot-password-card {
  width: 100%;
  max-width: 400px;
  background: rgba(43, 45, 49, 0.7) !important;
  border-radius: 12px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(12px);
  transform: translateY(-20px);
}
</style>
