import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import viteCompression from "vite-plugin-compression";
import "vue";

const viteCompressionFilter = /\.(js|mjs|json|css|html|svg)$/i;

// https://vitejs.dev/config/
export default defineConfig({
    server: {
        port: 5173,
        strictPort: true,
        proxy: {
            "/socket.io": {
                target: "http://127.0.0.1:5001",
                ws: true,
            },
            "/trpc": {
                target: "http://127.0.0.1:5001",
            },
            "/metrics": {
                target: "http://127.0.0.1:5001",
            },
        },
    },
    define: {
        "FRONTEND_VERSION": JSON.stringify(process.env.npm_package_version),
    },
    root: "./src/client",
    build: {
        outDir: "../../dist/client",
        emptyOutDir: true,
    },
    plugins: [
        vue(),
        tailwindcss(),
        viteCompression({
            algorithm: "gzip",
            filter: viteCompressionFilter,
        }),
    ],
});
