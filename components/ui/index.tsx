export function EmptyState({ title, description }: { title: string; description: string }) {
  return <section className="panel p-8"><h2 className="text-2xl font-semibold text-ledger-text">{title}</h2><p className="mt-2 text-ledger-muted">{description}</p></section>;
}
