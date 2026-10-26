export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string
          has_wallets: boolean
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          has_wallets?: boolean
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          has_wallets?: boolean
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      budget_rollover_reviews: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          id: string
          source_budget_id: string
          source_period_month: string
          status: string
          target_period_month: string
          updated_at: string
          user_id: string
          wallet_id: string | null
        }
        Insert: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          id?: string
          source_budget_id: string
          source_period_month: string
          status?: string
          target_period_month: string
          updated_at?: string
          user_id: string
          wallet_id?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          id?: string
          source_budget_id?: string
          source_period_month?: string
          status?: string
          target_period_month?: string
          updated_at?: string
          user_id?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_rollover_reviews_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_rollover_reviews_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_rollover_reviews_source_budget_id_fkey"
            columns: ["source_budget_id"]
            isOneToOne: false
            referencedRelation: "wallet_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_rollover_reviews_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categorization_rules: {
        Row: {
          account_id: string | null
          category_id: string
          created_at: string
          id: string
          is_active: boolean
          last_used_at: string | null
          match_type: Database["public"]["Enums"]["rule_match_type"]
          pattern: string
          priority: number
          source: string
          times_used: number
          updated_at: string
          user_id: string
          wallet_id: string | null
        }
        Insert: {
          account_id?: string | null
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          match_type?: Database["public"]["Enums"]["rule_match_type"]
          pattern: string
          priority?: number
          source?: string
          times_used?: number
          updated_at?: string
          user_id: string
          wallet_id?: string | null
        }
        Update: {
          account_id?: string | null
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          match_type?: Database["public"]["Enums"]["rule_match_type"]
          pattern?: string
          priority?: number
          source?: string
          times_used?: number
          updated_at?: string
          user_id?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categorization_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorization_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorization_rules_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      category_budgets: {
        Row: {
          alert_threshold_percent: number | null
          amount: number
          category_id: string
          created_at: string
          id: string
          period_month: string
          rollover_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_threshold_percent?: number | null
          amount: number
          category_id: string
          created_at?: string
          id?: string
          period_month: string
          rollover_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_threshold_percent?: number | null
          amount?: number
          category_id?: string
          created_at?: string
          id?: string
          period_month?: string
          rollover_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      duplicate_review_log: {
        Row: {
          id: string
          matched_transaction_id: string | null
          reviewed_at: string
          transaction_id: string
          user_id: string
          was_duplicate: boolean
        }
        Insert: {
          id?: string
          matched_transaction_id?: string | null
          reviewed_at?: string
          transaction_id: string
          user_id: string
          was_duplicate: boolean
        }
        Update: {
          id?: string
          matched_transaction_id?: string | null
          reviewed_at?: string
          transaction_id?: string
          user_id?: string
          was_duplicate?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "duplicate_review_log_matched_transaction_id_fkey"
            columns: ["matched_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicate_review_log_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sources: {
        Row: {
          account_id: string
          created_at: string
          email_address: string
          id: string
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          email_address: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          email_address?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sources_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_connections: {
        Row: {
          access_token: string | null
          created_at: string
          gmail_history_id: string | null
          id: string
          is_active: boolean
          refresh_token: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
          watch_expiration: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          gmail_history_id?: string | null
          id?: string
          is_active?: boolean
          refresh_token: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          watch_expiration?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string
          gmail_history_id?: string | null
          id?: string
          is_active?: boolean
          refresh_token?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          watch_expiration?: string | null
        }
        Relationships: []
      }
      price_history: {
        Row: {
          created_at: string
          id: string
          list_id: string | null
          list_item_id: string | null
          name: string
          name_key: string
          observed_on: string
          source: string
          store_id: string | null
          unit: string
          unit_price: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          list_id?: string | null
          list_item_id?: string | null
          name: string
          name_key: string
          observed_on: string
          source?: string
          store_id?: string | null
          unit: string
          unit_price: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          list_id?: string | null
          list_item_id?: string | null
          name?: string
          name_key?: string
          observed_on?: string
          source?: string
          store_id?: string | null
          unit?: string
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "shopping_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_list_item_id_fkey"
            columns: ["list_item_id"]
            isOneToOne: false
            referencedRelation: "shopping_list_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_list_items: {
        Row: {
          actual_unit_price: number | null
          created_at: string
          estimated_unit_price: number | null
          id: string
          is_checked: boolean
          list_id: string
          name: string
          name_key: string
          notes: string | null
          position: number
          quantity: number
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_unit_price?: number | null
          created_at?: string
          estimated_unit_price?: number | null
          id?: string
          is_checked?: boolean
          list_id: string
          name: string
          name_key: string
          notes?: string | null
          position?: number
          quantity?: number
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_unit_price?: number | null
          created_at?: string
          estimated_unit_price?: number | null
          id?: string
          is_checked?: boolean
          list_id?: string
          name?: string
          name_key?: string
          notes?: string | null
          position?: number
          quantity?: number
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "shopping_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_lists: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          name: string
          status: string
          store_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          name: string
          status?: string
          store_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          name?: string
          status?: string
          store_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_lists_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string
          ai_confidence: number | null
          amount: number
          category_id: string | null
          created_at: string
          description: string | null
          external_reference: string | null
          id: string
          is_necessary: boolean | null
          month: string | null
          occurred_at: string
          raw_data: Json | null
          savings_operation: string | null
          source: Database["public"]["Enums"]["transaction_source"]
          status: Database["public"]["Enums"]["transaction_status"]
          submission_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
          wallet_id: string | null
        }
        Insert: {
          account_id: string
          ai_confidence?: number | null
          amount: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          external_reference?: string | null
          id?: string
          is_necessary?: boolean | null
          month?: string | null
          occurred_at: string
          raw_data?: Json | null
          savings_operation?: string | null
          source?: Database["public"]["Enums"]["transaction_source"]
          status: Database["public"]["Enums"]["transaction_status"]
          submission_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
          wallet_id?: string | null
        }
        Update: {
          account_id?: string
          ai_confidence?: number | null
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          external_reference?: string | null
          id?: string
          is_necessary?: boolean | null
          month?: string | null
          occurred_at?: string
          raw_data?: Json | null
          savings_operation?: string | null
          source?: Database["public"]["Enums"]["transaction_source"]
          status?: Database["public"]["Enums"]["transaction_status"]
          submission_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_budgets: {
        Row: {
          account_id: string | null
          alert_threshold_percent: number | null
          assigned_amount: number
          created_at: string
          id: string
          period_month: string
          rollover_amount: number
          total_budget: number | null
          updated_at: string
          user_id: string
          wallet_id: string | null
        }
        Insert: {
          account_id?: string | null
          alert_threshold_percent?: number | null
          assigned_amount?: number
          created_at?: string
          id?: string
          period_month: string
          rollover_amount?: number
          total_budget?: number | null
          updated_at?: string
          user_id: string
          wallet_id?: string | null
        }
        Update: {
          account_id?: string | null
          alert_threshold_percent?: number | null
          assigned_amount?: number
          created_at?: string
          id?: string
          period_month?: string
          rollover_amount?: number
          total_budget?: number | null
          updated_at?: string
          user_id?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_budgets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_budgets_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          account_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      yield_configs: {
        Row: {
          account_id: string | null
          created_at: string
          id: string
          is_active: boolean
          start_date: string
          updated_at: string
          user_id: string
          wallet_id: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          start_date: string
          updated_at?: string
          user_id: string
          wallet_id?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          start_date?: string
          updated_at?: string
          user_id?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "yield_configs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yield_configs_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      yield_rates: {
        Row: {
          config_id: string
          created_at: string
          ea_percent: number
          id: string
          user_id: string
          valid_from: string
        }
        Insert: {
          config_id: string
          created_at?: string
          ea_percent: number
          id?: string
          user_id: string
          valid_from: string
        }
        Update: {
          config_id?: string
          created_at?: string
          ea_percent?: number
          id?: string
          user_id?: string
          valid_from?: string
        }
        Relationships: [
          {
            foreignKeyName: "yield_rates_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "yield_configs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_shopping_list: {
        Args: { p_list_id: string; p_observed_on?: string }
        Returns: undefined
      }
      reopen_shopping_list: { Args: { p_list_id: string }; Returns: undefined }
    }
    Enums: {
      rule_match_type: "contains" | "exact" | "regex"
      transaction_source: "manual" | "ocr" | "email_webhook" | "migration"
      transaction_status: "pendiente_revision" | "confirmada" | "duplicado" | "descartada"
      transaction_type:
        | "Ingreso"
        | "Gasto"
        | "Transferencia"
        | "Ahorro"
        | "Inversion"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      rule_match_type: ["contains", "exact", "regex"],
      transaction_source: ["manual", "ocr", "email_webhook", "migration"],
      transaction_status: ["pendiente_revision", "confirmada", "duplicado", "descartada"],
      transaction_type: [
        "Ingreso",
        "Gasto",
        "Transferencia",
        "Ahorro",
        "Inversion",
      ],
    },
  },
} as const
