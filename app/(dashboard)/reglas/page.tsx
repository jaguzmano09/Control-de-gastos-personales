import { createClient } from '@/lib/supabase/server'
import { createRule, toggleRuleActive, deleteRule } from '@/lib/actions/rules'

const inputClass =
  'mt-1 w-full rounded-sm border border-black/10 bg-white px-2 py-1.5 text-sm text-ledger-text outline-none focus:border-ledger-green focus:ring-1 focus:ring-ledger-green'

export default async function ReglasPage() {
  const supabase = await createClient()

  const [{ data: rules }, { data: categories }] = await Promise.all([
    supabase
      .from('categorization_rules')
      .select('id, pattern, match_type, category_id, source, times_used, last_used_at, is_active, categories(name)')
      .order('times_used', { ascending: false }),
    supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
  ])

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-2xl text-ledger-text">Reglas de categorización</h1>
      <p className="mt-1 text-sm text-ledger-muted">Lo que definiste a mano y lo que el sistema ha aprendido de tus correcciones.</p>
      <div className="mt-2 h-px w-10 bg-ledger-green" />

      <div className="mt-8 space-y-3">
        {(rules ?? []).map((rule) => (
          <div key={rule.id} className={`rounded-sm border border-black/10 bg-white p-4 ${!rule.is_active ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-ledger-text">
                  "{rule.pattern}" ({rule.match_type}) → <span className="text-ledger-green">{rule.categories?.name}</span>
                </p>
                <p className="mt-1 text-xs text-ledger-muted">
                  {rule.source === 'auto_learned' ? 'Aprendida automáticamente' : 'Manual'} · usada {rule.times_used} {rule.times_used === 1 ? 'vez' : 'veces'}
                  {rule.last_used_at && ` · última vez ${new Date(rule.last_used_at).toLocaleDateString('es-CO')}`}
                </p>
              </div>
              <div className="flex shrink-0 gap-3">
                <form action={toggleRuleActive}>
                  <input type="hidden" name="id" value={rule.id} />
                  <input type="hidden" name="is_active" value={(!rule.is_active).toString()} />
                  <button type="submit" className="text-xs text-ledger-muted hover:text-ledger-text hover:underline">
                    {rule.is_active ? 'Desactivar' : 'Reactivar'}
                  </button>
                </form>
                <form action={deleteRule}>
                  <input type="hidden" name="id" value={rule.id} />
                  <button type="submit" className="text-xs text-red-700 hover:underline">
                    Borrar
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
        {(rules ?? []).length === 0 && <p className="text-sm text-ledger-muted">Aún no hay reglas — se crean solas cuando corriges una categoría en la bandeja de revisión.</p>}
      </div>

      <div className="mt-8 rounded-sm border border-dashed border-black/20 p-4">
        <p className="text-sm text-ledger-text">Nueva regla manual</p>
        <form action={createRule} className="mt-3 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-ledger-muted">Patrón (texto a buscar en la descripción)</label>
            <input name="pattern" required className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-ledger-muted">Tipo de coincidencia</label>
            <select name="match_type" defaultValue="contains" className={inputClass}>
              <option value="contains">Contiene</option>
              <option value="exact">Exacto</option>
              <option value="regex">Expresión regular</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-ledger-muted">Categoría</label>
            <select name="category_id" required className={inputClass}>
              {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <button type="submit" className="rounded-sm bg-ledger-green px-4 py-2 text-sm font-medium text-white hover:bg-ledger-green/90">
              Crear regla
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}