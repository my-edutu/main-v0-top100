import { NextResponse } from "next/server";
import { betterAuthServer, isBetterAuthEnabled } from "@/lib/better-auth/server";
import { toNextJsHandler } from "better-auth/next-js";

const disabled = () => NextResponse.json({ error: "Authentication disabled" }, { status: 503 });

const handler = betterAuthServer && isBetterAuthEnabled ? toNextJsHandler(betterAuthServer) : null;

export const GET = handler?.GET ?? disabled;
export const POST = handler?.POST ?? disabled;
