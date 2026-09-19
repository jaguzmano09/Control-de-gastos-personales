import { NextResponse } from "next/server";
import { classifyExpenseWithGemini } from "@/lib/classification";
import { createSupabaseAdmin } from "@/lib/supabase";

type BankNotification = {
  description?: string;
  amount?: number;
  reference?: string;
};

function isAuthorized(request: Request) {
  const configuredSecret = process.env.BANK_WEBHOOK_SECRET;
  if (!configuredSecret) {
    return true;
  }

  const providedSecret = request.headers.get("x-bank-signature");
  return providedSecret === configuredSecret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = (await request.json()) as BankNotification;
  const description = body.description?.trim();
  const amount = Number(body.amount);

  if (!description || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "description y amount son obligatorios y válidos." },
      { status: 400 },
    );
  }

  const classification = await classifyExpenseWithGemini(description, amount);

  try {
    const supabase = createSupabaseAdmin();
    const { error } = await supabase.from("expenses").insert({
      description,
      amount,
      category: classification.category,
      external_reference: body.reference ?? null,
      source: "bank_webhook",
    });

    if (error) {
      return NextResponse.json(
        {
          error: "No se pudo guardar la notificación bancaria en Supabase.",
          details: error.message,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: "Configuración de Supabase incompleta.",
        details: error instanceof Error ? error.message : "Error desconocido.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    category: classification.category,
    confidence: classification.confidence,
    reason: classification.reason,
  });
}
