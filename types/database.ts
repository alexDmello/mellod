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
      profiles: {
        Row: {
          id: string
          full_name: string
          role: 'admin' | 'fbo' | 'picker' | 'super_admin' | 'fbo_owner' | 'counter_staff'
          username: string
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      fbos: {
        Row: {
          id: string
          profile_id: string | null
          business_name: string
          address: string | null
          contact_person: string | null
          phone: string | null
          is_active: boolean
          latitude: number | null
          longitude: number | null
          fssai_license: string | null
          qr_enabled_by_admin: boolean
          qr_opted_in_by_fbo: boolean
          slug: string | null
          brand_color: string | null
          logo_url: string | null
          operational_mode: 'dine_in' | 'counter_qsr' | 'hybrid' | null
          allow_pay_later: boolean | null
          merchant_upi_id: string | null
          bank_account_encrypted: string | null
          gstin: string | null
          max_order_amount_alert: number | null
          token_signing_salt: string | null
          store_hours: Json | null
          table_count: number | null
          payout_mode: 'direct_upi' | 'platform_gateway' | null
          dpdp_consent: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['fbos']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['fbos']['Insert']>
      }
      fbo_tables: {
        Row: {
          id: string
          fbo_id: string
          tenant_id?: string
          table_number: string
          signed_token: string
          token_issued_at: string
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['fbo_tables']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['fbo_tables']['Insert']>
      }
      table_sessions: {
        Row: {
          id: string
          fbo_id: string
          tenant_id?: string
          table_id: string | null
          status: 'open' | 'flagged' | 'settled'
          opened_at: string
          closed_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['table_sessions']['Row'], 'id' | 'opened_at'>
        Update: Partial<Database['public']['Tables']['table_sessions']['Insert']>
      }
      categories: {
        Row: {
          id: string
          fbo_id: string
          tenant_id?: string
          name: string
          sort_order: number
          is_active: boolean
        }
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['categories']['Insert']>
      }
      menu_items: {
        Row: {
          id: string
          fbo_id: string
          tenant_id?: string
          category_id: string | null
          name: string
          description: string | null
          price: number
          image_url: string | null
          is_veg: boolean
          is_available: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['menu_items']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['menu_items']['Insert']>
      }
      orders: {
        Row: {
          id: string
          fbo_id: string
          tenant_id?: string
          table_session_id: string | null
          order_type: 'table' | 'counter'
          token_number: string | null
          client_reference_id: string
          status: 'pending_payment' | 'received' | 'preparing' | 'ready' | 'completed' | 'cancelled'
          payment_status: 'unpaid' | 'paid' | 'failed' | 'refunded'
          payment_method: 'online_pg' | 'direct_upi_manual' | 'cash' | null
          gateway_transaction_id: string | null
          total_amount: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          menu_item_id: string | null
          item_name: string
          quantity: number
          unit_price: number
          customization_details: Json | null
        }
        Insert: Omit<Database['public']['Tables']['order_items']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>
      }
      daily_counters: {
        Row: {
          fbo_id: string
          tenant_id?: string
          order_date: string
          count: number
        }
        Insert: Database['public']['Tables']['daily_counters']['Row']
        Update: Partial<Database['public']['Tables']['daily_counters']['Row']>
      }
      audit_log: {
        Row: {
          id: string
          fbo_id: string | null
          tenant_id?: string | null
          actor_user_id: string | null
          action: string
          target_table: string | null
          target_id: string | null
          details: Json | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['audit_log']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['audit_log']['Insert']>
      }
    }
    Functions: {
      generate_daily_token: {
        Args: { p_fbo_id: string }
        Returns: string
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Fbo = Database['public']['Tables']['fbos']['Row']
export type FboTable = Database['public']['Tables']['fbo_tables']['Row']
export type TableSession = Database['public']['Tables']['table_sessions']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type MenuItem = Database['public']['Tables']['menu_items']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type AuditLog = Database['public']['Tables']['audit_log']['Row']
