export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export interface Database { public: { Tables: Record<string, { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }>; Views: Record<string, never>; Functions: Record<string, never>; Enums: Record<string, string>; CompositeTypes: Record<string, never> } }
