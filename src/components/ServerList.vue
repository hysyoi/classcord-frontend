<template>
  <div class="server-list">
    <!-- 班級列表 -->
    <div
      v-for="server in store.servers"
      :key="server.id"
      class="server-item-wrapper"
      @click="store.selectServer(server.id)"
    >
      <div
        class="server-pill"
        :class="{ active: server.id === store.activeServerId }"
      ></div>
      <div
        class="server-icon"
        :class="{ active: server.id === store.activeServerId }"
      >
        {{ server.initial }}
      </div>
      <!-- 自訂 Tooltip 指示卡 -->
      <div class="server-tooltip">
        {{ server.name }}
      </div>
    </div>

    <div class="server-divider"></div>

    <!-- 新增 / 加入按鈕 -->
    <div class="server-item-wrapper">
      <div class="server-icon add-btn" @click="openModal">+</div>
      <!-- 自訂 Tooltip 指示卡 -->
      <div class="server-tooltip">建立或加入班級</div>
    </div>

    <!-- 建立/加入班級 玻璃化彈窗 -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
        <div class="modal-card">
          <div class="modal-header">
            <h3>新增班級</h3>
            <button class="close-btn" @click="closeModal">
              <CloseRoundedIcon />
            </button>
          </div>

          <div class="modal-tabs">
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'create' }"
              @click="activeTab = 'create'"
            >
              建立新班級
            </button>
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'join' }"
              @click="activeTab = 'join'"
            >
              加入現有班級
            </button>
          </div>

          <div class="modal-content">
            <!-- 錯誤提示 -->
            <div v-if="errorMessage" class="error-banner">
              {{ errorMessage }}
            </div>

            <!-- 建立表單 -->
            <div v-if="activeTab === 'create'" class="form-group">
              <label class="form-label">班級名稱</label>
              <input
                type="text"
                v-model="serverName"
                placeholder="例如：114學年度 軟體工程"
                class="form-input"
                required
              />

              <p class="form-tip">建立班級後，您將自動成為該班級的教師。</p>
            </div>

            <!-- 加入表單 -->
            <div v-else class="form-group">
              <label class="form-label">班級 ID (UUID)</label>
              <input
                type="text"
                v-model="serverIdToJoin"
                placeholder="請貼上教師提供的班級 ID"
                class="form-input"
                required
              />
              <p class="form-tip">
                請向您的教師索取 36 位字元的班級 UUID 識別碼。
              </p>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-cancel" @click="closeModal">取消</button>
            <button
              class="btn-submit"
              :disabled="isLoading"
              @click="handleSubmit"
            >
              {{
                isLoading
                  ? "處理中..."
                  : activeTab === "create"
                    ? "建立"
                    : "加入"
              }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useAppStore } from "../store/useAppStore";
import { createServer, joinServer } from "@/api/generated";
import CloseRoundedIcon from "~icons/material-symbols/close-rounded";
const store = useAppStore();

const showModal = ref(false);
const activeTab = ref<"create" | "join">("create");
const serverName = ref("");
const serverIdToJoin = ref("");
const errorMessage = ref("");
const isLoading = ref(false);

const openModal = () => {
  showModal.value = true;
  activeTab.value = "create";
  serverName.value = "";
  serverIdToJoin.value = "";
  errorMessage.value = "";
};

const closeModal = () => {
  showModal.value = false;
};

const handleSubmit = async () => {
  errorMessage.value = "";
  isLoading.value = true;

  try {
    if (activeTab.value === "create") {
      if (!serverName.value.trim()) {
        errorMessage.value = "班級名稱不可為空";
        isLoading.value = false;
        return;
      }
      const res = await createServer({
        body: { name: serverName.value.trim() },
        throwOnError: true,
      });

      // 重新載入列表並選取新建立的伺服器
      await store.fetchServers();
      if (res.data?.id) {
        await store.selectServer(res.data.id);
      }
    } else {
      if (!serverIdToJoin.value.trim()) {
        errorMessage.value = "班級 ID 不可為空";
        isLoading.value = false;
        return;
      }
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const cleanId = serverIdToJoin.value.trim();
      if (!uuidRegex.test(cleanId)) {
        errorMessage.value = "班級 ID 格式錯誤，需為標準 UUID 格式";
        isLoading.value = false;
        return;
      }

      await joinServer({
        path: { serverId: cleanId },
        throwOnError: true,
      });

      // 重新載入列表並選取加入的伺服器
      await store.fetchServers();
      await store.selectServer(cleanId);
    }

    closeModal();
  } catch (err: any) {
    console.error("操作失敗:", err);
    errorMessage.value =
      err?.body?.message || "操作失敗，請確認輸入資訊是否正確。";
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.server-list {
  background: var(--bg-surface);
  display: flex;
  flex-direction: column;
  align-items: center;
  /*padding: 0px 0;*/
  margin-top: -4px;
  gap: 1px;
  overflow: visible;
}

.server-item-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  cursor: pointer;
}

/* 左側指示膠囊 */
.server-pill {
  position: absolute;
  left: -12px;
  width: 4px;
  height: 0;
  background: var(--primary-light);
  border-radius: 0 4px 4px 0;
  transition:
    height 0.2s ease,
    opacity 0.2s ease;
  opacity: 0;
}

/* 懸停時拉長為 20px */
.server-item-wrapper:hover .server-pill {
  height: 20px;
  opacity: 1;
}

/* 選中狀態下維持 40px */
.server-pill.active {
  height: 40px !important;
  opacity: 1 !important;
}

/* 右側懸停指示卡 (Tooltip) */
.server-tooltip {
  position: absolute;
  left: 55px; /* 一律對齊在 icon 的右側外框旁 */
  background: var(--bg-main);
  color: #ffffff;
  padding: 5px 9px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  opacity: 0;
  transform: scale(0.9) translateX(-10px);
  transform-origin: left center;
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
  z-index: 10000;
  border: 1px solid var(--bg-main-border);
}

/* Tooltip 三角箭頭 (旋轉正方形法，支援完美動態邊框) */
.server-tooltip::before {
  content: "";
  position: absolute;
  left: -5px; /* 使一半的正方形露出成為三角形 */
  top: 50%;
  margin-top: -4px; /* 垂直居中對齊 (高度的一半) */
  width: 8px;
  height: 8px;
  background: inherit; /* 動態繼承卡片背景色 */
  border: inherit; /* 動態繼承卡片邊框樣式 (包含粗細、顏色) */
  border-top: none; /* 隱藏不需要的兩側，保留左、下邊框形成箭頭 */
  border-right: none;
  transform: rotate(45deg);
}

/* 懸停時顯示 Tooltip */
.server-item-wrapper:hover .server-tooltip {
  opacity: 1;
  transform: scale(1) translateX(0);
}

/* 班級圖示樣式 */
.server-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-main);
  color: #ffffff;
  font-size: 16px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    border-radius 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;
  user-select: none;
}

/* 懸停或選中時變為圓角矩形，並且背景高亮 */
.server-item-wrapper:hover .server-icon,
.server-icon.active {
  border-radius: 12px;
  background: var(--primary);
}

/* 新增按鈕專屬懸停樣式 */
.server-item-wrapper:hover .add-btn {
  background: var(--primary) !important;
  color: #ffffff !important;
  border-radius: 16px;
}

.server-divider {
  width: 32px;
  height: 2px;
  background: #3f4147;
  margin: 4px 0;
}

.add-btn {
  font-size: 24px;
  //color: #ffccd4;
  color: var(--primary-light);
  background: var(--bg-main);
}

/* 玻璃化彈窗樣式 */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  //backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-card {
  width: 100%;
  max-width: 440px;
  background: var(--bg-main);
  border: 1px solid var(--bg-main-border);
  border-radius: 12px;
  /*box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.5);*/
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.25s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  padding: 18px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  /*border-bottom: 1px solid var(--bg-main-border);*/
}

.modal-header h3 {
  color: #f2f3f5;
  font-size: 22px;
  font-weight: 600;
}

.close-btn {
  background: none;
  margin: -10px -15px 0 0;
  padding: 5px;
  border-radius: 6px;
  border: none;
  color: var(--bg-main-text-muted);
  font-size: 24px;
  cursor: pointer;
  transition: color 0.15s;
}

.close-btn:hover {
  color: #ffffff;
  background: var(--bg-main-hover-dark);
}

.modal-tabs {
  display: flex;
  background: var(--bg-main-dark);
  padding: 4px;
  margin: 16px 24px 0;
  border-radius: 6px;
  /*border: 1px solid var(--bg-main-dark-border);*/
}

.tab-btn {
  flex: 1;
  background: none;
  border: none;
  color: var(--bg-main-dark-text-muted);
  font-size: 15px;
  font-weight: 500;
  padding: 8px 0;
  cursor: pointer;
  border-radius: 3px;
  transition:
    background 0.15s,
    color 0.15s;
}

.tab-btn.active {
  background: var(--bg-main-dark-hover);
  color: #ffffff;
}

.modal-content {
  padding: 18px 24px;
}

.error-banner {
  background: hsl(var(--error-base) 60% / 0.3);
  border: 1px solid hsl(var(--error-base) 60% / 0.5);
  color: hsl(var(--error-base) 90%);
  font-size: 13px;
  padding: 10px 14px;
  border-radius: 6px;
  margin-bottom: 16px;
  text-align: center;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-input {
  background: var(--bg-surface);
  border: 1px solid var(--bg-surface-border);
  color: #ffffff;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.15s;
}

.form-input:focus {
  border-color: var(--primary-lighter);
}

.form-tip {
  color: var(--bg-main-text-muted);
  font-size: 12px;
  margin-top: 4px;
  display: inline-flex;
  align-items: center;
  line-height: 1;
  gap: 3px;
  //text-align: right;
}

.modal-footer {
  padding: 18px 24px 20px 24px;
  background: var(--bg-main);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  /*border-top: 1px solid rgba(255, 255, 255, 0.05);*/
}

.btn-cancel {
  //width: 100%;
  background: none;
  border: 1px solid var(--bg-main-border);
  color: var(--bg-main-text-muted);
  font-size: 15px;
  font-weight: 500;
  padding: 8px 30px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s;
}

.btn-cancel:hover {
  background: var(--bg-main-hover-dark);
  color: #ffffff;
}

.btn-submit {
  background: var(--primary);
  border: 1px solid var(--primary-border);
  color: #ffffff;
  font-size: 15px;
  font-weight: 500;
  padding: 8px 30px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s;
}

.btn-submit:hover {
  background: var(--primary-muted);
}

.btn-submit:disabled {
  background: var(--primary-disabled);
  border: 1px solid var(--primary-disabled-border);
  cursor: not-allowed;
}
</style>
