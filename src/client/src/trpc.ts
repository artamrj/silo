import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../server/trpc";

function authToken() {
    return localStorage.getItem("token") ?? sessionStorage.getItem("token");
}

export const trpc = createTRPCClient<AppRouter>({
    links: [
        httpBatchLink({
            url: "/trpc",
            headers() {
                const token = authToken();
                return token && token !== "autoLogin" ? { authorization: `Bearer ${token}` } : {};
            },
        }),
    ],
});
