export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          has_wallets: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          has_wallets?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          has_wallets?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      wallets: {
        Row: {
          id: string
          user_id: string
          account_id: string
          name: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          name: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          name?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      wallet_budgets: {
        Row: {
          id: string
          user_id: string
          wallet_id: string
          period_month: string
          assigned_amount: number
          rollover_amount: number
          total_budget: number
          alert_threshold_percent: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          wallet_id: string
          period_month: string
          assigned_amount?: number
          rollover_amount?: number
          total_budget?: number
          alert_threshold_percent?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          wallet_id?: string
          period_month?: string
          assigned_amount?: number
          rollover_amount?: number
          total_budget?: number
          alert_threshold_percent?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      category_budgets: {
        Row: {
          id: string
          user_id: string
          category_id: string
          period_month: string
          amount: number
          alert_threshold_percent: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id: string
          period_month: string
          amount: number
          alert_threshold_percent?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string
          period_month?: string
          amount?: number
          alert_threshold_percent?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          is_active?: boolean
          created_at?: boolean
          updated_at?: string
        }
        Relationships: []
      }

      transactions: {
        Row: {
          id: string
          user_id: string
          occurred_at: string
          month: string
          type: Database['public']['Enums']['transaction_type']
          category_id: string | null
          account_id: string
          wallet_id: string | null
          description: string | null
          amount: number
          is_necessary: boolean | null
          source: Database['public']['Enums']['transaction_source']
          status: Database['public']['Enums']['transaction_status']
          external_reference: string | null
          ai_confidence: number | null
          raw_data: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          occurred_at: string
          month?: string
          type: Database['public']['Enums']['transaction_type']
          category_id?: string | null
          account_id: string
          wallet_id?: string | null
          description?: string | null
          amount: number
          is_necessary?: boolean | null
          source?: Database['public']['Enums']['transaction_source']
          status?: Database['public']['Enums']['transaction_status']
          external_reference?: string | null
          ai_confidence?: number | null
          raw_data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          occurred_at?: string
          month?: string
          type?: Database['public']['Enums']['transaction_type']
          category_id?: string | null
          account_id?: string
          wallet_id?: string | null
          description?: string | null
          amount?: number
          is_necessary?: boolean | null
          source?: Database['public']['Enums']['transaction_source']
          status?: Database['public']['Enums']['transaction_status']
          external_reference?: string | null
          ai_confidence?: number | null
          raw_data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      email_sources: {
        Row: {
          id: string
          user_id: string
          account_id: string
          email_address: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          email_address: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          email_address?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      gmail_connections: {
        Row: {
          id: string
          user_id: string
          refresh_token: string
          access_token: string | null
          token_expires_at: string | null
          gmail_history_id: string | null
          watch_expiration: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          refresh_token: string
          access_token?: string | null
          token_expires_at?: string | null
          gmail_history_id?: string | null
          watch_expiration?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          refresh_token?: string
          access_token?: string | null
          token_expires_at?: string | null
          gmail_history_id?: string | null
          watch_expiration?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      categorization_rules: {
        Row: {
          id: string
          user_id: string
          pattern: string
          match_type: Database['public']['Enums']['rule_match_type']
          category_id: string
          account_id: string | null
          wallet_id: string | null
          priority: number
          times_used: number
          last_used_at: string | null
          source: 'manual' | 'auto_learned'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          pattern: string
          match_type?: Database['public']['Enums']['rule_match_type']
          category_id: string
          account_id?: string | null
          wallet_id?: string | null
          priority?: number
          times_used?: number
          last_used_at?: string | null
          source?: 'manual' | 'auto_learned'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          pattern?: string
          match_type?: Database['public']['Enums']['rule_match_type']
          category_id?: string
          account_id?: string | null
          wallet_id?: string | null
          priority?: number
          times_used?: number
          last_used_at?: string | null
          source?: 'manual' | 'auto_learned'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      duplicate_review_log: {
        Row: {
          id: string
          user_id: string
          transaction_id: string
          matched_transaction_id: string | null
          was_duplicate: boolean
          reviewed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          transaction_id: string
          matched_transaction_id?: string | null
          was_duplicate: boolean
          reviewed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          transaction_id?: string
          matched_transaction_id?: string | null
          was_duplicate?: boolean
          reviewed_at?: string
        }
        Relationships: []
      }
    }

    Views: Record<string, never>

    Functions: Record<string, never>

    Enums: {
      transaction_type:
        | 'Ingreso'
        | 'Gasto'
        | 'Transferencia'
        | 'Ahorro'
        | 'Inversion'

      transaction_source:
        | 'manual'
        | 'ocr'
        | 'email_webhook'
        | 'migration'

      transaction_status:
        | 'pendiente_revision'
        | 'confirmada'
        | 'duplicado'
        | 'descartada'

      rule_match_type:
        | 'contains'
        | 'exact'
        | 'regex'
    }

    CompositeTypes: Record<string, never>
  }
}