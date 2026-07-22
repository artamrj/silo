import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "../../src/server/trpc";

const server = {
    packageJSON: { version: "test" },
} as never;

describe("tRPC authentication", () => {
    it("allows public status queries", async () => {
        const caller = appRouter.createCaller({ server,
            user: null });
        await expect(caller.system.status()).resolves.toMatchObject({ ok: true,
            version: "test" });
    });

    it("rejects protected mutations without a user", async () => {
        const caller = appRouter.createCaller({ server,
            user: null });
        await expect(caller.compose.fromDockerRun({ command: "docker run nginx" }))
            .rejects.toMatchObject<Partial<TRPCError>>({ code: "UNAUTHORIZED" });
    });

    it("validates and converts authenticated requests", async () => {
        const caller = appRouter.createCaller({ server,
            user: { id: 1 } as never });
        const result = await caller.compose.fromDockerRun({ command: "docker run --name web nginx" });
        expect(result.composeTemplate).toContain("image: nginx");
    });
});
