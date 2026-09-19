import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ error: "Callback de Gmail aún no está configurado" }, { status: 501 }); }
