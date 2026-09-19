import { NextResponse } from "next/server";
export async function POST() { return NextResponse.json({ error: "OCR aún no está configurado" }, { status: 501 }); }
