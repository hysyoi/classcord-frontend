import { createApp } from "vue";
import { createPinia } from "pinia";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { router } from "./router";
import { queryClient } from "./lib/queryClient";
import "./api/setup";
import "./style.css";
import { defineElement } from "@lordicon/element";

// Register lord-icon element
defineElement();

import App from "./App.vue";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(VueQueryPlugin, { queryClient });

app.mount("#app");
