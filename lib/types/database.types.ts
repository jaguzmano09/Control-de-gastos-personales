export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
type Timestamps = { created_at: string; updated_at: string }

export type Database = {
	public: {
		Tables: {
			categories: { Row: { id: string; user_id: string; name: string; is_active: boolean } & Timestamps; Insert: { id?: string; user_id: string; name: string; is_active?: boolean } & Partial<Timestamps>; Update: { id?: string; user_id?: string; name?: string; is_active?: boolean } & Partial<Timestamps>; Relationships: [] }
			accounts: { Row: { id: string; user_id: string; name: string; has_wallets: boolean; is_active: boolean } & Timestamps; Insert: { id?: string; user_id: string; name: string; has_wallets?: boolean; is_active?: boolean } & Partial<Timestamps>; Update: { id?: string; user_id?: string; name?: string; has_wallets?: boolean; is_active?: boolean } & Partial<Timestamps>; Relationships: [] }
			wallets: { Row: { id: string; user_id: string; account_id: string; name: string; is_active: boolean } & Timestamps; Insert: { id?: string; user_id: string; account_id: string; name: string; is_active?: boolean } & Partial<Timestamps>; Update: { id?: string; user_id?: string; account_id?: string; name?: string; is_active?: boolean } & Partial<Timestamps>; Relationships: [] }
			transactions: { Row: { id: string; user_id: string; occurred_at: string; type: Database['public']['Enums']['transaction_type']; source: Database['public']['Enums']['transaction_source']; status: Database['public']['Enums']['transaction_status']; amount: number; description: string | null; category_id: string | null; account_id: string; wallet_id: string | null; is_necessary: boolean | null; external_reference: string | null; raw_data: Json | null; ai_confidence: number | null } & Timestamps; Insert: { id?: string; user_id: string; occurred_at: string; type: Database['public']['Enums']['transaction_type']; source: Database['public']['Enums']['transaction_source']; status?: Database['public']['Enums']['transaction_status']; amount: number; description?: string | null; category_id?: string | null; account_id: string; wallet_id?: string | null; is_necessary?: boolean | null; external_reference?: string | null; raw_data?: Json | null; ai_confidence?: number | null } & Partial<Timestamps>; Update: Partial<Database['public']['Tables']['transactions']['Insert']>; Relationships: [] }
			category_budgets: { Row: { id: string; user_id: string; category_id: string; period_month: string; amount: number; alert_threshold_percent: number | null } & Timestamps; Insert: { id?: string; user_id: string; category_id: string; period_month: string; amount: number; alert_threshold_percent?: number | null } & Partial<Timestamps>; Update: Partial<Database['public']['Tables']['category_budgets']['Insert']>; Relationships: [] }
			wallet_budgets: { Row: { id: string; user_id: string; wallet_id: string; period_month: string; assigned_amount: number; rollover_amount: number; total_budget: number; alert_threshold_percent: number | null } & Timestamps; Insert: { id?: string; user_id: string; wallet_id: string; period_month: string; assigned_amount: number; rollover_amount?: number; total_budget?: number; alert_threshold_percent?: number | null } & Partial<Timestamps>; Update: Partial<Database['public']['Tables']['wallet_budgets']['Insert']>; Relationships: [] }
		}
		Views: Record<string, never>
		Functions: Record<string, never>
		Enums: { transaction_type: 'Ingreso' | 'Gasto' | 'Transferencia' | 'Ahorro' | 'Inversion'; transaction_source: 'manual' | 'ocr' | 'email_webhook' | 'migration'; transaction_status: 'pendiente_revision' | 'confirmada' | 'duplicado' | 'descartada' }
		CompositeTypes: Record<string, never>
	}
}
