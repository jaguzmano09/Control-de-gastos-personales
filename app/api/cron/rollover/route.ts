import { NextRequest, NextResponse } from "next/server";
export async function POST(request: NextRequest) { if (process.env.CRON_SECRET && request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "No autorizado" }, { status: 401 }); return NextResponse.json({ error: "Rollover aún no está conectado a Supabase" }, { status: 501 }); }
