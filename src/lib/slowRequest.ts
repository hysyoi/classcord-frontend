import { computed, ref } from "vue";

/**
 * 慢請求偵測：任何 API 請求超過 SLOW_MS 還沒回應，就讓 SlowRequestNotice 顯示提示。
 * 示範主機記憶體較小，閒置一段時間後服務可能被換到 swap，第一個操作會突然變慢；
 * 這裡只負責「計數」，畫面由 SlowRequestNotice.vue 決定怎麼呈現。
 */
const SLOW_MS = 3000;
// 安全上限：若某個請求因為例外沒有呼叫結束函式，最多 60 秒後也會自動收掉提示
const MAX_TRACK_MS = 60_000;

const slowCount = ref(0);

export const isSlowRequestActive = computed(() => slowCount.value > 0);

/** 開始追蹤一個請求，回傳「結束追蹤」的函式（重複呼叫是安全的） */
export function trackRequest(): () => void {
  let isSlow = false;
  let ended = false;

  const slowTimer = window.setTimeout(() => {
    isSlow = true;
    slowCount.value++;
  }, SLOW_MS);

  const end = () => {
    if (ended) return;
    ended = true;
    window.clearTimeout(slowTimer);
    window.clearTimeout(safetyTimer);
    if (isSlow) slowCount.value = Math.max(0, slowCount.value - 1);
  };

  const safetyTimer = window.setTimeout(end, MAX_TRACK_MS);

  return end;
}
