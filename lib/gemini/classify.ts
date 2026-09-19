export type Classification = { description?: string; amount?: number; category?: string; confidence?: number };
export async function classifyReceipt(_input: string | Uint8Array): Promise<Classification> { if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY no está configurada"); throw new Error("Clasificación Gemini pendiente de implementación"); }
