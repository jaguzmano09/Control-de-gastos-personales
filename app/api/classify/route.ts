import { NextResponse } from "next/server";
import { classifyExpenseWithGemini } from "@/lib/classification";
import { createSupabaseAdmin } from "@/lib/supabase";

type ClassifyRequest = {
  description?: string;
  amount?: number;
  saveInSupabase?: boolean;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ClassifyRequest;
  const description = body.description?.trim();
  const amount = Number(body.amount);

  if (!description || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "description y amount son obligatorios y válidos." },
      { status: 400 },
    );
  }

  const classification = await classifyExpenseWithGemini(description, amount);
  const shouldSave = body.saveInSupabase ?? true;

  if (!shouldSave) {
    return NextResponse.json({
      ...classification,
      savedInSupabase: false,
    });
  }

  try {
    const supabase = createSupabaseAdmin();
    const { error } = await supabase.from("expenses").insert({
      description,
      amount,
      category: classification.category,
      source: "manual",
    });

    return NextResponse.json({
      ...classification,
      savedInSupabase: !error,
      persistenceWarning: error?.message,
    });
  } catch (error) {
    return NextResponse.json({
      ...classification,
      savedInSupabase: false,
      persistenceWarning:
        error instanceof Error ? error.message : "No fue posible guardar en Supabase.",
    });
  }
}
