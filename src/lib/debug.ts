// 全域測試用開關：暫時模擬慢速網路，方便肉眼確認各處 Skeleton loading 效果。
// 測試完畢後記得改回 0，避免不小心把延遲帶進正式環境。
export const DEBUG_SKELETON_DELAY_MS = 0;

// 注意：這個延遲只能用來延後「把 loading 旗標關掉」這個動作本身，
// 絕對不能 await 它之後再接著執行其他業務邏輯（例如接著選頻道、選伺服器），
// 否則設定較大的延遲值時會直接卡住後續流程，而不只是 Skeleton 多顯示一下。
export function afterSkeletonDelay(fn: () => void): void {
  if (DEBUG_SKELETON_DELAY_MS <= 0) {
    fn();
    return;
  }
  setTimeout(fn, DEBUG_SKELETON_DELAY_MS);
}
