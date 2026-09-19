import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const navigation = [["Resumen", "/"], ["Transacciones", "/transacciones"], ["Revisión", "/revision"], ["Presupuestos", "/presupuestos/categorias"], ["Cuentas", "/cuentas"], ["Reglas", "/reglas"], ["Correo", "/correo"], ["Configuración", "/configuracion"]];
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect("/login");
  return <div className="shell md:flex"><aside className="w-full border-b border-stone-300 p-6 md:min-h-screen md:w-64 md:border-b-0 md:border-r"><Link href="/" className="text-2xl">Mis gastos</Link><p className="mb-8 mt-1 text-sm text-stone-500">{user.email}</p><nav className="grid gap-2 text-sm">{navigation.map(([label, href]) => <Link className="p-2 hover:bg-white" href={href} key={href}>{label}</Link>)}</nav></aside><main className="max-w-6xl flex-1 p-6 md:p-10">{children}</main></div>;
}
