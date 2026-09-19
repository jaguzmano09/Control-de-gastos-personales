export function EmptyState({ title, description }: { title: string; description: string }) {
  return <section className="panel p-8"><h2 className="text-2xl">{title}</h2><p className="mt-2 text-stone-500">{description}</p></section>;
}
