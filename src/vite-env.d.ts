/// <reference types="vite/client" />
/// <reference types="unplugin-icons/types/vue" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface Window {
  turnstile?: {
    render: (container: string | HTMLElement, options: any) => string;
    reset: (widgetId: string) => void;
    remove: (widgetId: string) => void;
  };
}
