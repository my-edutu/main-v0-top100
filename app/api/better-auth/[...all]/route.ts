import { betterAuthServer } from "@/lib/better-auth/server";
import { toNextJsHandler } from "better-auth/next-js";

const handler = toNextJsHandler(betterAuthServer);

export const GET = handler.GET;
export const POST = handler.POST;
