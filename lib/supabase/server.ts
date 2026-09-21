import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database.types";
type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };
export async function createClient() { const cookieStore = await cookies(); return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => cookieStore.getAll(), setAll: (items: CookieToSet[]) => { try { items.forEach(({ name, value, options }) => cookieStore.set(name, value, options as never)); } catch {} } } }); }

export function createServiceRoleClient() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !serviceRoleKey) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
	return createSupabaseClient<Database>(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
