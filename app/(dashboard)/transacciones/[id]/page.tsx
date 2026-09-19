import { EmptyState } from "@/components/ui";
export default function TransactionDetailPage({ params }: { params: { id: string } }) { return <><h1 className="mb-8 text-4xl">Detalle de transacción</h1><EmptyState title={`Transacción ${params.id}`} description="El detalle y la edición se habilitarán al conectar el schema de Supabase." /></>; }
