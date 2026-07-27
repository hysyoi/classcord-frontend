<template>
  <div class="fullscreen-loader">
    <img src="/favicon-cord-type1.svg" alt="Classcord" class="loader-logo" />
    <div class="loader-text">載入中...</div>
  </div>
</template>

<script lang="ts" setup></script>

<style scoped>
.fullscreen-loader {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  background: var(--bg-darkest);
}

.loader-logo {
  width: 56px;
  height: 56px;
  animation: loader-bounce 1.1s ease-in-out infinite;
}

.loader-text {
  color: var(--bg-surface-text-muted);
  font-size: 14px;
  letter-spacing: 0.02em;
}

@keyframes loader-bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-16px);
  }
}
</style>
