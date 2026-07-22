import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import composerize from "composerize";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { R } from "redbean-node";
import type { SiloServer } from "./silo-server";
import type { JWTDecoded } from "./utils/socket";
import type { User } from "./models/user";
import { nonEmptyString } from "../shared/schemas";
import { shake256, SHAKE256_LENGTH } from "./password-hash";

export interface TrpcContext {
    server: SiloServer;
    user: User | null;
}

export async function createTrpcContext(server: SiloServer, options: CreateExpressContextOptions): Promise<TrpcContext> {
    const authorization = options.req.headers.authorization;
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
    if (!token) {
        return { server,
            user: null };
    }

    try {
        const decoded = jwt.verify(token, server.jwtSecret) as JWTDecoded;
        const user = await R.findOne("user", " username = ? AND active = 1 ", [ decoded.username ]) as User;
        if (!user || decoded.h !== shake256(user.password, SHAKE256_LENGTH)) {
            return { server,
                user: null };
        }
        return { server,
            user };
    } catch {
        return { server,
            user: null };
    }
}

const t = initTRPC.context<TrpcContext>().create();
const protectedProcedure = t.procedure.use(({ ctx, next }) => {
    if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({ ctx: { ...ctx,
        user: ctx.user } });
});

export const appRouter = t.router({
    system: t.router({
        status: t.procedure.query(({ ctx }) => ({
            ok: true,
            version: ctx.server.packageJSON.version,
            uptimeSeconds: Math.floor(process.uptime()),
        })),
    }),
    compose: t.router({
        fromDockerRun: protectedProcedure
            .input(z.object({ command: nonEmptyString.max(64_000) }).strict())
            .mutation(({ input }) => {
                const output = composerize(input.command, "", "latest");
                return { composeTemplate: output.split("\n").slice(1).join("\n") };
            }),
    }),
});

export type AppRouter = typeof appRouter;
