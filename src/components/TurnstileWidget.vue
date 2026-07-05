<template>
  <div ref="widgetContainer" class="turnstile-wrapper"></div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from "vue";

const props = defineProps({
  sitekey: {
    type: String,
    default:
      import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA",
  },
});

const emit = defineEmits(["verify", "expire", "error"]);
const widgetContainer = ref<HTMLElement | null>(null);
let widgetId = ref<string | null>(null);

// 渲染 Turnstile 函數
const renderWidget = () => {
  if (window.turnstile && widgetContainer.value) {
    try {
      widgetId.value = window.turnstile.render(widgetContainer.value, {
        sitekey: props.sitekey,
        theme: "dark", // 配合 ClassCord 的暗黑/紫色主題風格
        appearance: "interaction-only", // 靜默驗證，僅在被懷疑為機器人時才顯示驗證挑戰
        callback: (token: string) => {
          emit("verify", token); // 驗證成功，傳遞 Token 給父元件
        },
        "expired-callback": () => {
          emit("expire"); // Token 過期時清除
        },
        "error-callback": (err: any) => {
          emit("error", err);
        },
      });
    } catch (e) {
      console.error("Turnstile render 發生錯誤:", e);
    }
  }
};

// 當元件掛載時
onMounted(() => {
  if (window.turnstile) {
    renderWidget();
  } else {
    // 輪詢等待 Turnstile 腳本載入完成
    const timer = setInterval(() => {
      if (window.turnstile) {
        renderWidget();
        clearInterval(timer);
      }
    }, 100);
  }
});

// 元件卸載時銷毀小工具釋放資源
onUnmounted(() => {
  if (widgetId.value && window.turnstile) {
    window.turnstile.remove(widgetId.value);
  }
});

// 定義一個 reset 供父元件調用
const reset = () => {
  if (widgetId.value && window.turnstile) {
    window.turnstile.reset(widgetId.value);
  }
};

defineExpose({
  reset,
});
</script>

<style scoped>
.turnstile-wrapper {
  margin: 0; /* 隱藏模式下不佔用外距高度，保持表單緊湊 */
  display: flex;
  justify-content: center;
}
</style>
