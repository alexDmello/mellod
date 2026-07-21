// ============================================================
// MELLOD — TypeScript Types
// These mirror the Supabase database schema.
// ============================================================

export type Role = "admin" | "picker" | "fbo";
export type PickupStatus = "pending" | "completed" | "disputed";
export type PaymentMethodType = "bank" | "upi" | "cash";

// ---------------------------------------------------------------
// Database schema types (for Supabase generic client typing)
// ---------------------------------------------------------------
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      fbos: {
        Row: FBO;
        Insert: Omit<FBO, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<FBO, "id" | "created_at">>;
      };
      pickers: {
        Row: Picker;
        Insert: Omit<Picker, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Picker, "id" | "created_at">>;
      };
      daily_prices: {
        Row: DailyPrice;
        Insert: Omit<DailyPrice, "id" | "created_at">;
        Update: Partial<Omit<DailyPrice, "id" | "created_at">>;
      };
      routes: {
        Row: Route;
        Insert: Omit<Route, "id" | "created_at">;
        Update: Partial<Omit<Route, "id" | "created_at">>;
      };
      pickups: {
        Row: Pickup;
        Insert: Omit<Pickup, "id" | "total_amount" | "created_at">;
        Update: Partial<Omit<Pickup, "id" | "total_amount" | "created_at">>;
      };
      payment_methods: {
        Row: PaymentMethod;
        Insert: Omit<PaymentMethod, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<PaymentMethod, "id" | "created_at">>;
      };
    };
    Views: {
      fbo_stats: {
        Row: FBOStats;
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

// ---------------------------------------------------------------
// Row types
// ---------------------------------------------------------------
export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  username: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface FBO {
  id: string;
  profile_id: string | null;
  business_name: string;
  address: string | null;
  contact_person: string | null;
  phone: string | null;
  is_active: boolean;
  latitude: number | null;
  longitude: number | null;
  fssai_license?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Picker {
  id: string;
  profile_id: string | null;
  vehicle_info: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyPrice {
  id: string;
  price_per_liter: number;
  currency: string;
  set_by: string | null;
  effective_from: string;
  created_at: string;
}

export interface Route {
  id: string;
  picker_id: string;
  fbo_id: string;
  route_date: string;
  sort_order: number;
  created_at: string;
}

export interface Pickup {
  id: string;
  picker_id: string;
  fbo_id: string;
  route_id: string | null;
  liters: number;
  price_per_liter: number;
  total_amount: number;
  photo_url: string | null;
  notes: string | null;
  status: PickupStatus;
  picked_up_at: string;
  created_at: string;
}

export interface PaymentMethod {
  id: string;
  fbo_id: string;
  method_type: PaymentMethodType;
  account_holder: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  upi_id: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface FBOStats {
  fbo_id: string;
  business_name: string;
  profile_id: string;
  total_liters: number;
  total_earnings: number;
  total_pickups: number;
  last_pickup_at: string | null;
}

// ---------------------------------------------------------------
// Extended / joined types used in the UI
// ---------------------------------------------------------------
export interface RouteWithFBO extends Route {
  fbo: FBO;
  pickup?: Pickup;
}

export interface PickupWithDetails extends Pickup {
  fbo: FBO;
  picker: Picker & { profile: Profile };
}

export interface GeneratedCredentials {
  username: string;
  password: string;
  email: string;
}
