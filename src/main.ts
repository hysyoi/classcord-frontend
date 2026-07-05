import { createApp } from "vue";
import { createPinia } from "pinia";
import { router } from "./router";
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

app.mount("#app");
