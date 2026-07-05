import { client } from './generated/client.gen'

// 1. 請求攔截器：在發送請求前，自動在 Headers 注入 Bearer Token
client.interceptors.request.use((request: Request) => {
  const token = localStorage.getItem('token')
  if (token) {
    request.headers.set('Authorization', `Bearer ${token}`)
  }
  return request
})

// 2. 回應攔截器：如果後端回傳 401 錯誤 (JWT 過期或無效)，自動清空 Token 並重導向至登入頁面
client.interceptors.response.use((response: Response) => {
  if (response.status === 401) {
    localStorage.removeItem('token')
    // 只有在當前不在登入頁面時才跳轉，避免登入失敗 (401) 導致頁面被重新整理
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }
  return response
})
