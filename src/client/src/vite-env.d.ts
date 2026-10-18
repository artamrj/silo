/* eslint-disable */
/// <reference types="vite/client" />

// Injected by Vite `define` at build time (see src/client/vite.config.ts).
declare const FRONTEND_VERSION : string;

declare module "*.vue" {
    import type { DefineComponent } from "vue";
    const component: DefineComponent<{}, {}, any>;
    export default component;
}
