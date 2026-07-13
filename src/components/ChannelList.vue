<template>
  <div class="channel-list">
    <div class="channel-scroll-area">
      <!-- 伺服器標題與建立頻道按鈕 -->
      <div class="server-header">
        <div class="server-title-container">
          <span class="server-name-text" :title="store.activeServer?.name">{{
            store.isLoading
              ? "載入中..."
              : store.servers.length === 0
                ? "尚未加入班級"
                : (store.activeServer?.name ?? "請選擇班級")
          }}</span>
          <!-- 邀請成員按鈕 -->
          <button
            v-if="store.activeServerId"
            class="invite-header-btn"
            @click="openInviteModal"
            @mouseenter="showTooltip($event, '邀請成員', 'bottom')"
            @mouseleave="hideTooltip"
          >
            <GroupAddRoundedIcon class="invite-icon" />
          </button>
        </div>
        <!--        <button v-if="store.activeServerId" class="add-channel-header-btn" @click="openCreateChannelModal('GENERAL')" title="在班級中建立頻道">+</button>-->
      </div>

      <!-- 尚未加入班級時的空狀態提示 -->
      <div
        v-if="!store.isLoading && store.servers.length === 0"
        class="empty-state"
      >
        <p class="empty-title">您尚未加入任何班級</p>
        <p class="empty-desc">
          請點擊左側的「+」按鈕建立新班級，或向教師取得連結以加入！
        </p>
      </div>

      <!-- 班級已建立但無頻道時的提示 -->
      <div
        v-else-if="
          !store.isLoading &&
          store.activeServerId &&
          store.servers.length > 0 &&
          store.channels.length === 0
        "
        class="empty-state"
      >
        <p class="empty-title">本班級尚無任何頻道</p>
        <p class="empty-desc">請點擊右上方的「+」按鈕建立第一個頻道吧！</p>
      </div>

      <!-- 頻道分組清單 -->
      <div
        v-for="category in store.activeServer?.categories"
        :key="category.id"
        class="category-block"
      >
        <div class="category-header-row">
          <div class="category-name" @click="toggleCategory(category.id)">
            {{ category.name }}
            <ChevronBoldIcon
              :class="{ collapsed: collapsedCategories[category.id] }"
            />
          </div>
          <button
            v-if="store.isTeacherOrTA && category.id !== 'ADMIN'"
            class="add-channel-icon"
            @click="openCreateChannelModal(category.id)"
            @mouseenter="showTooltip($event, '建立頻道', 'top')"
            @mouseleave="hideTooltip"
          >
            <RoundPlusIcon />
          </button>
        </div>

        <template v-for="channel in category.channels" :key="channel.id">
          <div
            v-show="
              !collapsedCategories[category.id] ||
              channel.id === store.activeChannelId
            "
            class="channel-item"
            :class="{
              active: channel.id === store.activeChannelId,
              'has-unread': (store.unreadCounts[channel.id] || 0) > 0,
            }"
            @click="store.selectChannel(channel.id)"
          >
            <div class="channel-name-with-hash">
              <span class="hash"><TagRoundedIcon /></span>
              <span class="channel-name-text">{{ channel.name }}</span>
            </div>
            <span
              v-if="(store.unreadCounts[channel.id] || 0) > 0"
              class="unread-badge"
            >
              {{ store.unreadCounts[channel.id] }}
            </span>
          </div>
        </template>
      </div>
    </div>

    <!-- 建立頻道 玻璃化彈窗 -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
        <div class="modal-card">
          <div class="modal-header">
            <h3>建立頻道</h3>
            <button class="close-btn" @click="closeModal">
              <CloseRoundedIcon />
            </button>
          </div>

          <div class="modal-content">
            <!-- 錯誤提示 -->
            <div v-if="errorMessage" class="error-banner">
              {{ errorMessage }}
            </div>

            <div class="form-group">
              <label class="form-label">頻道名稱</label>
              <input
                type="text"
                v-model="channelName"
                placeholder="例如：作業討論"
                class="form-input"
                required
              />
            </div>

            <div class="form-group mt-4">
              <label class="form-label">頻道類型</label>
              <div class="radio-group">
                <label
                  class="radio-option"
                  :class="{ active: channelType === 'GENERAL' }"
                >
                  <input type="radio" v-model="channelType" value="GENERAL" />
                  <div class="radio-text">
                    <div class="radio-title">討論頻道</div>
                    <div class="radio-desc">
                      文字訊息討論、閒聊與一般問題提問
                    </div>
                  </div>
                </label>
                <label
                  class="radio-option"
                  :class="{ active: channelType === 'MATERIAL' }"
                >
                  <input type="radio" v-model="channelType" value="MATERIAL" />
                  <div class="radio-text">
                    <div class="radio-title">教材與資源</div>
                    <div class="radio-desc">
                      存放學習材料、程式碼、作業連結與參考資源
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-cancel" @click="closeModal">取消</button>
            <button
              class="btn-submit"
              :disabled="isLoading"
              @click="handleCreateChannel"
            >
              {{ isLoading ? "建立中..." : "建立頻道" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 邀請連結 獨立彈窗 -->
    <Teleport to="body">
      <div
        v-if="showInviteModal"
        class="invite-backdrop"
        @click.self="closeInviteModal"
      >
        <div class="invite-card">
          <div class="invite-header">
            <h3>班級邀請連結</h3>
            <button class="invite-close-btn" @click="closeInviteModal">
              <CloseRoundedIcon />
            </button>
          </div>

          <div class="invite-content">
            <p class="invite-tip mb-3">
              您可以將此連結或 ID
              分送給學生，他們點擊或輸入後即可直接加入本班級！
            </p>

            <div class="invite-form-group">
              <label class="invite-form-label">班級邀請連結</label>
              <div class="invite-copy-group">
                <input
                  type="text"
                  :value="inviteLink"
                  readonly
                  class="invite-form-input flex-1"
                />
                <button
                  class="invite-btn-copy"
                  @click="copyText(inviteLink, 'link')"
                >
                  {{ copiedType === "link" ? "已複製！" : "複製" }}
                </button>
              </div>
            </div>

            <div class="invite-form-group mt-4">
              <label class="invite-form-label">班級 ID (UUID)</label>
              <div class="invite-copy-group">
                <input
                  type="text"
                  :value="store.activeServerId || ''"
                  readonly
                  class="invite-form-input flex-1"
                />
                <button
                  class="invite-btn-copy"
                  @click="copyText(store.activeServerId || '', 'id')"
                >
                  {{ copiedType === "id" ? "已複製！" : "複製" }}
                </button>
              </div>
            </div>
          </div>

          <!--          <div class="invite-footer">-->
          <!--            <button class="invite-btn-close" @click="closeInviteModal">關閉</button>-->
          <!--          </div>-->
        </div>
      </div>
    </Teleport>
  </div>

  <!-- 全域 Teleport Tooltip -->
  <Teleport to="body">
    <div
      v-if="tooltipVisible"
      class="global-custom-tooltip"
      :class="[tooltipPlacement, { visible: tooltipVisible }]"
      :style="{ top: tooltipStyle.top, left: tooltipStyle.left }"
    >
      {{ tooltipText }}
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useAppStore } from "../store/useAppStore";
import { createChannel } from "@/api/generated";
import TagRoundedIcon from "~icons/material-symbols/tag-rounded";
import ChevronBoldIcon from "~icons/glyphs/chevron-bold";
import GroupAddRoundedIcon from "~icons/material-symbols/group-add-rounded";
import RoundPlusIcon from "~icons/ic/round-plus";
import CloseRoundedIcon from "~icons/material-symbols/close-rounded";

const store = useAppStore();

const collapsedCategories = ref<Record<string, boolean>>({});

const toggleCategory = (categoryId: string) => {
  collapsedCategories.value[categoryId] =
    !collapsedCategories.value[categoryId];
};

const showModal = ref(false);
const channelName = ref("");
const channelType = ref<"GENERAL" | "MATERIAL" | "ADMIN">("GENERAL");
const errorMessage = ref("");
const isLoading = ref(false);

// 邀請相關狀態
const showInviteModal = ref(false);
const copiedType = ref<"link" | "id" | null>(null);

// 懸浮提示框 (Tooltip) 狀態與方法
const tooltipText = ref("");
const tooltipPlacement = ref<"top" | "bottom">("top");
const tooltipVisible = ref(false);
const tooltipStyle = ref({ top: "0px", left: "0px" });

const showTooltip = (
  event: MouseEvent,
  text: string,
  placement: "top" | "bottom" = "top",
) => {
  console.log(
    "[Tooltip Debug] showTooltip triggered for:",
    text,
    "placement:",
    placement,
  );
  const target = (event.currentTarget ||
    (event.target as HTMLElement).closest("button")) as HTMLElement;
  console.log("[Tooltip Debug] Resolved target element:", target);
  if (!target) {
    console.warn(
      "[Tooltip Debug] showTooltip aborted: target element not found",
    );
    return;
  }

  const rect = target.getBoundingClientRect();
  console.log("[Tooltip Debug] Target bounding rect:", {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  });
  tooltipText.value = text;
  tooltipPlacement.value = placement;

  let top = 0;
  let left = 0;

  if (placement === "top") {
    top = rect.top;
    left = rect.left + rect.width / 2;
  } else if (placement === "bottom") {
    top = rect.bottom;
    left = rect.left + rect.width / 2;
  } else {
    top = rect.top + rect.height / 2;
    left = rect.left;
  }

  tooltipStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
  };
  tooltipVisible.value = true;
  console.log("[Tooltip Debug] Tooltip state applied:", {
    text: tooltipText.value,
    placement: tooltipPlacement.value,
    style: tooltipStyle.value,
    visible: tooltipVisible.value,
  });
};

const hideTooltip = () => {
  console.log("[Tooltip Debug] hideTooltip triggered");
  tooltipVisible.value = false;
};

const inviteLink = computed(() => {
  if (!store.activeServerId) return "";
  return `${window.location.origin}/join/${store.activeServerId}`;
});

const openInviteModal = () => {
  showInviteModal.value = true;
  copiedType.value = null;
};

const closeInviteModal = () => {
  showInviteModal.value = false;
};

const copyText = (text: string, type: "link" | "id") => {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      copiedType.value = type;
      setTimeout(() => {
        if (copiedType.value === type) {
          copiedType.value = null;
        }
      }, 2000);
    })
    .catch((err) => {
      console.error("複製失敗:", err);
    });
};

const openCreateChannelModal = (type: any) => {
  showModal.value = true;
  channelName.value = "";
  errorMessage.value = "";

  if (type === "GENERAL" || type === "MATERIAL") {
    channelType.value = type;
  } else {
    channelType.value = "GENERAL";
  }
};

const closeModal = () => {
  showModal.value = false;
};

const handleCreateChannel = async () => {
  errorMessage.value = "";

  if (!store.activeServerId) {
    errorMessage.value = "未選取有效的班級";
    return;
  }

  if (!channelName.value.trim()) {
    errorMessage.value = "頻道名稱不可為空";
    return;
  }

  isLoading.value = true;
  try {
    await createChannel({
      path: { serverId: store.activeServerId },
      body: {
        name: channelName.value.trim(),
        type: channelType.value,
      },
      throwOnError: true,
    });

    await store.selectServer(store.activeServerId);
    closeModal();
  } catch (err: any) {
    console.error("建立頻道失敗:", err);
    if (err?.status === 403) {
      errorMessage.value = "權限不足：只有教師與助教可以建立頻道";
    } else {
      errorMessage.value =
        err?.body?.message || "建立頻道失敗，請檢查輸入資訊。";
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.channel-list {
  //background: var(--bg-darker);
  background: var(--bg-main-dark);
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(to top, transparent 0%, black 20px);
  mask-image: linear-gradient(to top, transparent 0%, black 20px);
}

.channel-scroll-area {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.server-header {
  height: 48px;
  box-sizing: border-box;
  /*padding: 0 8px;*/
  color: #ffffff;
  font-weight: 600;
  font-size: 16px;
  border-bottom: 1px solid var(--bg-main-dark-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.server-title-container {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  width: 100%;
  padding: 0 10px 0 5px;
  justify-content: space-between;
  color: #ffffff;
}

.server-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  padding: 3px 9px;
  border-radius: 8px;
}

.server-name-text:hover {
  background: var(--bg-main-dark-hover);
}

.invite-header-btn {
  background: none;
  border: none;
  /*color: #949ba4;*/
  font-size: 16px;
  cursor: pointer;
  /* opacity: 0.6; */
  /* transition:
    opacity 0.15s,
    transform 0.15s; */
  padding: 6px;
  border-radius: 8px;
}

.invite-icon {
  color: #ffffff; /* 指定任何您想要的顏色 */
}

.invite-header-btn:hover {
  background: var(--bg-main-dark-hover);
  /* opacity: 1; */
  /* transform: scale(1.15); */
  /* color: var(--brand-color); */
}

.add-channel-header-btn {
  background: none;
  border: none;
  color: var(--bg-main-dark-text-muted);
  font-size: 20px;
  cursor: pointer;
  padding-right: 12px;
  line-height: 1;
  transition: color 0.15s;
}

.add-channel-header-btn:hover {
  color: #ffffff;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 16px;
  gap: 8px;
}

.empty-title {
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
}

.empty-desc {
  color: var(--bg-main-dark-text-muted);
  font-size: 11px;
  line-height: 1.5;
  padding: 0 8px;
}

.category-block {
  margin-top: 12px;
}

.category-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 10px 0 0;
}

.category-name {
  color: var(--bg-main-dark-text-muted);
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 12px 0 10px;
  margin: 0 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}

.category-name svg {
  transform: rotate(180deg);
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.category-name svg.collapsed {
  transform: rotate(90deg);
}

.category-name:hover,
.category-header-row:has(.add-channel-icon:hover) .category-name {
  color: #ffffff;
}

.add-channel-icon {
  background: none;
  border: none;
  color: var(--bg-main-dark-text-muted);
  font-size: 15px;
  cursor: pointer;
  line-height: 1;
  transition: color 0.15s;
  padding: 0 4px;
}

.add-channel-icon:hover {
  color: #ffffff;
}

.channel-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 10px;
  margin: 2px 8px 2px 5px;
  border-radius: 8px;
  color: var(--bg-main-dark-text-muted);
  cursor: pointer;
  font-size: 16px;
  transition:
    background 0.15s,
    color 0.15s;
}

.channel-item:hover,
.channel-item.active {
  background: var(--bg-main-dark-hover);
  color: #ffffff;
}

.channel-item.has-unread {
  color: var(--bg-main-dark-text-muted);
  font-weight: 600;
}

.channel-name-with-hash {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
}

.channel-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
}

.unread-badge {
  background-color: var(--bg-main-dark-hover);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 4px;
  border-radius: 4px;
  line-height: 1;
  min-width: 16px;
  text-align: center;
  /*box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);*/
}

.hash {
  font-size: 18px;
  color: var(--bg-main-dark-text-muted);
  transition: color 0.15s;
}

.channel-item.active .hash {
  color: #ffffff;
}

/* 玻璃化彈窗樣式 */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  /*backdrop-filter: blur(8px);*/
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

.max-w-\[400px\] {
  max-width: 400px;
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
  /*border-bottom: 1px solid rgba(255, 255, 255, 0.05);*/
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

.modal-content {
  padding: 18px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.error-banner {
  background: hsl(var(--error-base) 60% / 0.3);
  border: 1px solid hsl(var(--error-base) 60% / 0.5);
  color: hsl(var(--error-base) 90%);
  font-size: 13px;
  padding: 10px 14px;
  border-radius: 6px;
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

.copy-input-group {
  display: flex;
  gap: 8px;
}

.flex-1 {
  flex: 1;
}

.btn-copy {
  background: var(--primary);
  border: 1px solid var(--primary-border);
  color: #ffffff;
  padding: 8px 30px;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-copy:hover {
  background: var(--primary-muted);
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radio-option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: none;
  border: 1px solid var(--bg-main-border);
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;
}

.radio-option:hover {
  background: var(--bg-main-hover-dark);
}

.radio-option.active {
  background: var(--bg-main-hover-dark);
  border-color: #ffffff;
}

.radio-option input[type="radio"] {
  accent-color: var(--primary);
  margin-top: 3px;
  cursor: pointer;
}

.radio-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.radio-title {
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
}

.radio-desc {
  color: #949ba4;
  font-size: 12px;
  line-height: 1.2;
}

.modal-footer {
  padding: 16px 24px;
  background: var(--bg-main);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-cancel {
  width: 100%;
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
  width: 100%;
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

.mt-4 {
  margin-top: 16px;
}

.mb-3 {
  margin-bottom: 12px;
}

/* ==========================================================================
   班級邀請連結彈窗專屬樣式 (獨立出來方便微調)
   ========================================================================== */

.invite-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  /* backdrop-filter: blur(8px); 可以依需求啟用毛玻璃效果 */
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.invite-card {
  width: 100%;
  max-width: 400px;
  background: var(--bg-main);
  border: 1px solid var(--bg-main-border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: inviteSlideUp 0.25s ease-out;
}

@keyframes inviteSlideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.invite-header {
  padding: 18px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.invite-header h3 {
  color: #f2f3f5;
  font-size: 22px;
  font-weight: 600;
}

.invite-close-btn {
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

.invite-close-btn:hover {
  color: #ffffff;
  background: var(--bg-main-hover-dark);
}

.invite-content {
  padding: 18px 24px 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.invite-tip {
  color: var(--bg-main-text-muted);
  font-size: 13px;
  line-height: 1.5;
}

.invite-form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.invite-form-label {
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.invite-form-input {
  background: var(--bg-surface);
  border: 1px solid var(--bg-surface-border);
  color: #ffffff;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.15s;
}

.invite-form-input:focus {
  border-color: var(--primary-lighter);
}

.invite-copy-group {
  display: flex;
  gap: 8px;
}

.invite-btn-copy {
  background: var(--primary);
  border: 1px solid var(--primary-border);
  color: #ffffff;
  padding: 8px 30px;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.invite-btn-copy:hover {
  background: var(--primary-muted);
}

.invite-footer {
  padding: 16px 24px;
  background: var(--bg-main);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.invite-btn-close {
  width: 100%;
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

.invite-btn-close:hover {
  background: var(--bg-main-hover-dark);
  color: #ffffff;
}
</style>

<style>
/* 全域樣式 - 用於 Teleport 到 body 的 Tooltip */
.global-custom-tooltip {
  position: fixed; /* 改為 fixed 定位，使其以 body 視窗為基準 */
  background: var(--bg-main);
  color: #ffffff;
  padding: 5px 9px;
  border-radius: 7px;
  font-size: 15px;
  font-weight: 600;
  white-space: pre-wrap; /* 支援單行與多行/換行 Tooltip */
  text-align: center; /* 多行時置中 */
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  opacity: 0;
  z-index: 100000; /* 極高的 z-index，保證蓋在所有網頁內容之上 */
  border: 1px solid var(--bg-main-border); /* 與 server-tooltip 邊框色一致 */
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

/* 下方置中定位 (Bottom Center) */
.global-custom-tooltip.bottom {
  transform: translate(-50%, 0) translateY(-2px) scale(0.9);
  transform-origin: top center;
}

/* 下方置中顯示狀態 */
.global-custom-tooltip.bottom.visible {
  opacity: 1;
  transform: translate(-50%, 0) translateY(8px) scale(1);
}

/* 上方指向小箭頭 (旋轉正方形法，支援完美動態邊框) */
.global-custom-tooltip.bottom::after {
  content: "";
  position: absolute;
  top: -4px; /* 垂直置中於卡片頂部邊緣 */
  left: 50%;
  margin-left: -4px;
  width: 8px;
  height: 8px;
  background: inherit; /* 動態繼承卡片背景色 */
  border: inherit; /* 動態繼承邊框樣式 */
  border-right: none; /* 隱藏右、下邊框，保留左、上邊框形成指向上的箭頭 */
  border-bottom: none;
  transform: rotate(45deg);
}

/* 上方置中定位 (Top Center) */
.global-custom-tooltip.top {
  transform: translate(-50%, -100%) translateY(2px) scale(0.9);
  transform-origin: bottom center;
}

/* 上方置中顯示狀態 */
.global-custom-tooltip.top.visible {
  opacity: 1;
  transform: translate(-50%, -100%) translateY(-8px) scale(1);
}

/* 下方指向小箭頭 (旋轉正方形法，支援完美動態邊框) */
.global-custom-tooltip.top::after {
  content: "";
  position: absolute;
  bottom: -4px; /* 垂直置中於卡片底部邊緣 */
  left: 50%;
  margin-left: -4px;
  width: 8px;
  height: 8px;
  background: inherit; /* 動態繼承卡片背景色 */
  border: inherit; /* 動態繼承邊框樣式 */
  border-left: none; /* 隱藏左、上邊框，保留右、下邊框形成指向下的箭頭 */
  border-top: none;
  transform: rotate(45deg);
}
</style>
