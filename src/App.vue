<template>
  <router-view />
  <DevTools />
  <GlobalNoticeModal />
</template>

<script lang="ts" setup>
import DevTools from "@/components/DevTools.vue";
import GlobalNoticeModal from "@/components/GlobalNoticeModal.vue";
// 根組件，所有子頁面透過 Vue Router 渲染
</script>

<style>
/* 全域重設，確保滿版 */
html,
body,
#app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--bg-darkest);
}
</style>
