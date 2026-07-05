import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi, logout as logoutApi } from '@/api/generated'
import { useAppStore } from './useAppStore'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))

  const isAuthenticated = computed(() => !!token.value)

  async function login(email: string, password: string) {
    try {
      const response = await loginApi({
        body: { email, password },
        throwOnError: true
      })
      
      const tokenValue = response.data?.accessToken
      if (tokenValue) {
        localStorage.setItem('token', tokenValue)
        token.value = tokenValue
        // 登入後拉取個人檔案
        const appStore = useAppStore()
        await appStore.fetchCurrentUserProfile()
      } else {
        throw new Error('伺服器未回傳 Token')
      }
    } catch (error) {
      console.error('登入錯誤:', error)
      throw error
    }
  }

  async function logout() {
    try {
      await logoutApi({ throwOnError: true })
    } catch (error) {
      console.error('後端登出失敗:', error)
    } finally {
      localStorage.removeItem('token')
      token.value = null

      // 中斷 WebSocket 連線並清除訂閱
      const appStore = useAppStore()
      appStore.disconnectWebSocket()
    }
  }

  return {
    token,
    isAuthenticated,
    login,
    logout,
  }
})
