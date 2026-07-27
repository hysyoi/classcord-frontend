import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../store/useAuthStore";

const routes = [
  {
    path: "/",
    name: "Landing",
    component: () => import("../views/landing/LandingView.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/login",
    name: "Login",
    component: () => import("../views/login/Login.vue"),
    meta: { requiresAuth: false, title: "登入" },
  },
  {
    path: "/register",
    name: "Register",
    component: () => import("../views/login/Register.vue"),
    meta: { requiresAuth: false, title: "註冊" },
  },
  {
    path: "/forgot-password",
    name: "ForgotPassword",
    component: () => import("../views/login/ForgotPassword.vue"),
    meta: { requiresAuth: false, title: "忘記密碼" },
  },
  {
    path: "/reset-password",
    name: "ResetPassword",
    component: () => import("../views/login/ResetPassword.vue"),
    meta: { requiresAuth: false, title: "重設密碼" },
  },
  {
    path: "/join/:serverId",
    name: "JoinServer",
    component: () => import("../views/chat/JoinServerView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/channels",
    component: () => import("../layouts/MainLayout.vue"),
    meta: { requiresAuth: true },
    children: [
      {
        path: "@me",
        name: "Home",
        component: () => import("../views/chat/ChannelView.vue"),
      },
      {
        path: ":serverId/:channelId",
        name: "Channel",
        component: () => import("../views/chat/ChannelView.vue"),
      },
      {
        path: ":serverId/ai/:materialId/:sessionId",
        name: "AiChat",
        component: () => import("../views/chat/ChannelView.vue"),
      },
    ],
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/",
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 分頁標題：依路由 meta.title 設定，/channels 底下的動態標題交由 MainLayout 自行處理
const DEFAULT_TITLE = "Classcord - AI 驅動的社群學習網路";

router.afterEach((to) => {
  if (to.path.startsWith("/channels")) return;
  document.title = to.meta.title
    ? `${to.meta.title} - Classcord`
    : DEFAULT_TITLE;
});

router.beforeEach((to, _, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: "Login", query: { redirect: to.fullPath } });
  } else if (
    (to.name === "Login" ||
      to.name === "Register" ||
      to.name === "ForgotPassword" ||
      to.name === "ResetPassword") &&
    authStore.isAuthenticated
  ) {
    next({ name: "Home" });
  } else {
    next();
  }
});
