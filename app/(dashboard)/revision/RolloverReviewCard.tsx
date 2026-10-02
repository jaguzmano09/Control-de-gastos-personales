import { assignRolloverCategory } from '@/lib/actions/rollover'

type Category = { id: string; name: string }
type RolloverReview = {
  id: string
  amount: number
  target_period_month: string
  category_id: string | null
  status: string
  account_name: string
  wallet_name: string | null
}

export function RolloverReviewCard({ review, categories }: { review: RolloverReview; categories: Category[] }) {
  const assignedCategory = categories.find((category) => category.id === review.category_id)
  return (
    <div className="rounded-sm border border-black/10 bg-white p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-sm text-ledger-text">
            {review.wallet_name ? `Bolsillo: ${review.wallet_name} · ${review.account_name}` : `Cuenta: ${review.account_name}`}
          </p>
          <p className="mt-1 text-xs text-ledger-muted">
            Sobrante para {new Date(`${review.target_period_month}T00:00:00`).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
          </p>
          <p className={`mt-1 text-xs ${review.status === 'assigned' ? 'text-ledger-green' : 'text-amber-700'}`}>
            {review.status === 'assigned' ? 'Categoría asignada' : 'Pendiente de asignación'}
          </p>
        </div>
        <p className="text-sm font-medium text-ledger-green">
          {Number(review.amount).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
        </p>
      </div>

      <form action={assignRolloverCategory} className="mt-3 flex items-end gap-3">
        <input type="hidden" name="review_id" value={review.id} />
        <div className="flex-1">
          <label className="text-xs text-ledger-muted">
            {assignedCategory ? 'Categoría asignada' : 'Asignar a categoría'}
          </label>
          <select name="category_id" defaultValue={review.category_id ?? ''} required className="mt-1 w-full rounded-sm border border-black/10 bg-white px-2 py-1.5 text-sm text-ledger-text">
            <option value="" disabled>Selecciona una categoría</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </div>
        <button type="submit" className="btn btn-primary btn-sm">
          {assignedCategory ? 'Actualizar' : 'Asignar'}
        </button>
      </form>
    </div>
  )
}
