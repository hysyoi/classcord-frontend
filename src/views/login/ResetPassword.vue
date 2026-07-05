<template>
  <div class="reset-password-page">
    <Card class="reset-password-card border-none">
      <CardHeader class="text-center pb-6 pt-8">
        <CardTitle @click="router.push('/')" class="text-3xl font-extrabold tracking-wider bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent cursor-pointer hover:opacity-90 transition">
          ClassCord
        </CardTitle>
        <CardDescription class="text-xs text-slate-400 mt-1.5">
          重新設定您的新密碼
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
          <div class="text-slate-200 text-sm font-semibold">密碼重設成功！</div>
          <div class="text-xs text-slate-400 leading-relaxed">
            您的帳戶密碼已成功更新。<br>
            系統將在 3 秒後自動導向登入頁面...
          </div>
          <Button @click="router.push('/login')" class="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition">
            立即前往登入
          </Button>
        </div>

        <!-- 重設密碼表單 -->
        <form v-else @submit.prevent="handleResetPassword" id="reset-password-form" novalidate>
          <FieldSet>
            <FieldGroup>
              <Field>
                <FieldLabel for="new-password" class="text-slate-300">輸入新密碼</FieldLabel>
                <Input
                  id="new-password"
                  type="password"
                  v-model="newPassword"
                  placeholder="新密碼需為 8~100 位字元"
                  required
                  class="bg-[var(--bg-darkest)] text-[#dbdee1] border-slate-700 focus-visible:ring-indigo-500"
                />
                <span v-if="errors.newPassword" class="text-red-400 text-[10px] mt-1 block">{{ errors.newPassword }}</span>
              </Field>

              <Field>
                <FieldLabel for="confirm-password" class="text-slate-300">確認新密碼</FieldLabel>
                <Input
                  id="confirm-password"
                  type="password"
                  v-model="confirmPassword"
                  placeholder="請再次輸入新密碼"
                  required
                  class="bg-[var(--bg-darkest)] text-[#dbdee1] border-slate-700 focus-visible:ring-indigo-500"
                />
                <span v-if="errors.confirmPassword" class="text-red-400 text-[10px] mt-1 block">{{ errors.confirmPassword }}</span>
              </Field>
            </FieldGroup>
          </FieldSet>
        </form>
      </CardContent>

      <CardFooter v-if="!isSuccess" class="px-8 pb-8 flex flex-col gap-4 items-center">
        <Button type="submit" form="reset-password-form" :disabled="isLoading" class="w-full max-w-[336px] bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition">
          {{ isLoading ? '儲存中...' : '儲存新密碼' }}
        </Button>
      </CardFooter>
    </Card>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { resetPassword } from '@/api/generated'
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

const newPassword = ref('')
const confirmPassword = ref('')
const token = ref('')
const errorMessage = ref('')
const isSuccess = ref(false)
const isLoading = ref(false)
const errors = ref({
  newPassword: '',
  confirmPassword: ''
})

const router = useRouter()
const route = useRoute()

watch(newPassword, () => {
  errors.value.newPassword = ''
})
watch(confirmPassword, () => {
  errors.value.confirmPassword = ''
})

onMounted(() => {
  const tokenQuery = route.query.token as string
  if (!tokenQuery) {
    alert('密碼重設連結不完整或無效，將引導您重新申請。')
    router.replace('/forgot-password')
    return
  }
  token.value = tokenQuery
})

const validate = () => {
  let isValid = true
  errors.value.newPassword = ''
  errors.value.confirmPassword = ''

  if (!newPassword.value) {
    errors.value.newPassword = '新密碼不能為空'
    isValid = false
  } else if (newPassword.value.length < 8 || newPassword.value.length > 100) {
    errors.value.newPassword = '新密碼長度需介於 8~100 字元'
    isValid = false
  }

  if (!confirmPassword.value) {
    errors.value.confirmPassword = '請再次輸入密碼以進行確認'
    isValid = false
  } else if (confirmPassword.value !== newPassword.value) {
    errors.value.confirmPassword = '兩次輸入的密碼不一致'
    isValid = false
  }

  return isValid
}

const handleResetPassword = async () => {
  errorMessage.value = ''
  if (!validate()) return

  isLoading.value = true
  try {
    await resetPassword({
      body: {
        token: token.value,
        newPassword: newPassword.value
      },
      throwOnError: true
    })
    isSuccess.value = true
    setTimeout(() => {
      router.push('/login')
    }, 3000)
  } catch (err: any) {
    console.error('密碼重設執行失敗:', err)
    if (err?.body?.errors?.newPassword) {
      errors.value.newPassword = err.body.errors.newPassword
    } else {
      errorMessage.value = err?.body?.message || '密碼重設失敗，連結可能已過期或已被使用。'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.reset-password-page {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at center, var(--bg-darker) 0%, var(--bg-black) 100%);
}

.reset-password-card {
  width: 100%;
  max-width: 400px;
  background: rgba(43, 45, 49, 0.7) !important;
  border-radius: 12px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(12px);
  transform: translateY(-20px);
}
</style>
