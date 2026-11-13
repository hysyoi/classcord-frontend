import { client } from "./generated/client.gen";

// 動態設定 API 基礎路徑
client.setConfig({
  baseUrl: import.meta.env.VITE_API_URL || "http://localhost:8080",
});

// 1. 請求攔截器：在發送請求前，自動在 Headers 注入 Bearer Token
client.interceptors.request.use((request: Request) => {
  const token = localStorage.getItem("token");
  if (token) {
    request.headers.set("Authorization", `Bearer ${token}`);
  }
  return request;
});

// 2. 回應攔截器：如果後端回傳 401 錯誤 (JWT 過期或無效)，自動清空 Token 並重導向至登入頁面
client.interceptors.response.use((response: Response) => {
  if (response.status === 401) {
    localStorage.removeItem("token");
    // 只有在當前不在登入頁面時才跳轉，避免登入失敗 (401) 導致頁面被重新整理
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }
  return response;
});

// 3. 錯誤攔截器：統一錯誤物件格式
// 產生的 client 在後端回錯誤時，會把回應 JSON（{ message, code, status, errors }）直接丟出，
// 但專案內多處以 err.body.message 讀取，導致永遠讀不到後端訊息、只能顯示寫死的預設文字。
// 這裡把錯誤包成 { ...原欄位, body, status }：err.body.message 讀得到，原本的 err.status 寫法也照常可用。
client.interceptors.error.use((error, response) => {
  // 沒有 response 代表請求根本沒送達（網路中斷、逾時取消），維持原樣交給呼叫端判斷
  if (!response) return error;
  // 非 JSON 的錯誤（例如 Nginx 回的 502 HTML 頁）不當成訊息顯示，讓呼叫端使用預設文字
  const body = typeof error === "object" && error !== null ? error : {};
  return { ...body, body, status: response.status };
});
