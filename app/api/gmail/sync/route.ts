import { NextResponse } from "next/server";
export async function POST() { return NextResponse.json({ error: "Sincronización de Gmail aún no está configurada" }, { status: 501 }); }
