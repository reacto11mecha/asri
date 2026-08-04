import { pesertaRouter } from "~/server/api/routers/peserta";
import { pengaturanRouter } from "~/server/api/routers/pengaturan";
import { aktivitasRouter } from "~/server/api/routers/aktivitas";
import { insightRouter } from "~/server/api/routers/insight";
import { bimbinganRouter } from "~/server/api/routers/bimbingan";
import { rekapRouter } from "~/server/api/routers/rekap";
import { pantauanRouter } from "~/server/api/routers/pantauan";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  peserta: pesertaRouter,
  pengaturan: pengaturanRouter,
  aktivitas: aktivitasRouter,
  insight: insightRouter,
  rekap: rekapRouter,
  pantauan: pantauanRouter,
  bimbingan: bimbinganRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
