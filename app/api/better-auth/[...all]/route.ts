import { NextResponse } from "next/server";

const disabled = () => NextResponse.json({ error: "Authentication disabled" }, { status: 503 });

export const GET = disabled;
export const POST = disabled;
