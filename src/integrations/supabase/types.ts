export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      batches: {
        Row: {
          arrival_date: string
          created_at: string | null
          farm_id: string
          id: string
          name: string
          pl_cost: number
          pl_size: number
          status: string | null
          survival_rate: number | null
          total_pl_quantity: number
          updated_at: string | null
        }
        Insert: {
          arrival_date: string
          created_at?: string | null
          farm_id: string
          id?: string
          name: string
          pl_cost: number
          pl_size: number
          status?: string | null
          survival_rate?: number | null
          total_pl_quantity: number
          updated_at?: string | null
        }
        Update: {
          arrival_date?: string
          created_at?: string | null
          farm_id?: string
          id?: string
          name?: string
          pl_cost?: number
          pl_size?: number
          status?: string | null
          survival_rate?: number | null
          total_pl_quantity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batches_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      biometrics: {
        Row: {
          average_weight: number
          created_at: string | null
          id: string
          measurement_date: string
          pond_batch_id: string
          sample_size: number | null
          uniformity: number | null
        }
        Insert: {
          average_weight: number
          created_at?: string | null
          id?: string
          measurement_date: string
          pond_batch_id: string
          sample_size?: number | null
          uniformity?: number | null
        }
        Update: {
          average_weight?: number
          created_at?: string | null
          id?: string
          measurement_date?: string
          pond_batch_id?: string
          sample_size?: number | null
          uniformity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "biometrics_pond_batch_id_fkey"
            columns: ["pond_batch_id"]
            isOneToOne: false
            referencedRelation: "pond_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      farms: {
        Row: {
          created_at: string | null
          id: string
          location: string | null
          name: string
          total_area: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          location?: string | null
          name: string
          total_area?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          location?: string | null
          name?: string
          total_area?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      feeding_rates: {
        Row: {
          created_at: string
          created_by: string
          feeding_percentage: number
          id: string
          meals_per_day: number
          pond_batch_id: string
          updated_at: string
          weight_range_max: number
          weight_range_min: number
        }
        Insert: {
          created_at?: string
          created_by: string
          feeding_percentage: number
          id?: string
          meals_per_day: number
          pond_batch_id: string
          updated_at?: string
          weight_range_max: number
          weight_range_min: number
        }
        Update: {
          created_at?: string
          created_by?: string
          feeding_percentage?: number
          id?: string
          meals_per_day?: number
          pond_batch_id?: string
          updated_at?: string
          weight_range_max?: number
          weight_range_min?: number
        }
        Relationships: []
      }
      feeding_records: {
        Row: {
          actual_amount: number
          created_at: string
          feeding_date: string
          feeding_rate_percentage: number
          feeding_time: string
          id: string
          notes: string | null
          planned_amount: number
          pond_batch_id: string
          updated_at: string
        }
        Insert: {
          actual_amount?: number
          created_at?: string
          feeding_date: string
          feeding_rate_percentage?: number
          feeding_time: string
          id?: string
          notes?: string | null
          planned_amount?: number
          pond_batch_id: string
          updated_at?: string
        }
        Update: {
          actual_amount?: number
          created_at?: string
          feeding_date?: string
          feeding_rate_percentage?: number
          feeding_time?: string
          id?: string
          notes?: string | null
          planned_amount?: number
          pond_batch_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          brand: string | null
          category: string
          created_at: string
          entry_date: string
          farm_id: string
          id: string
          name: string
          quantity: number
          supplier: string | null
          total_value: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category: string
          created_at?: string
          entry_date: string
          farm_id: string
          id?: string
          name: string
          quantity?: number
          supplier?: string | null
          total_value?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category?: string
          created_at?: string
          entry_date?: string
          farm_id?: string
          id?: string
          name?: string
          quantity?: number
          supplier?: string | null
          total_value?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      mortality_records: {
        Row: {
          created_at: string | null
          dead_count: number
          id: string
          notes: string | null
          pond_batch_id: string
          record_date: string
        }
        Insert: {
          created_at?: string | null
          dead_count: number
          id?: string
          notes?: string | null
          pond_batch_id: string
          record_date: string
        }
        Update: {
          created_at?: string | null
          dead_count?: number
          id?: string
          notes?: string | null
          pond_batch_id?: string
          record_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "mortality_records_pond_batch_id_fkey"
            columns: ["pond_batch_id"]
            isOneToOne: false
            referencedRelation: "pond_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      pond_batches: {
        Row: {
          batch_id: string
          created_at: string | null
          current_population: number
          id: string
          pl_quantity: number
          pond_id: string
          preparation_cost: number | null
          stocking_date: string
          updated_at: string | null
        }
        Insert: {
          batch_id: string
          created_at?: string | null
          current_population: number
          id?: string
          pl_quantity: number
          pond_id: string
          preparation_cost?: number | null
          stocking_date: string
          updated_at?: string | null
        }
        Update: {
          batch_id?: string
          created_at?: string | null
          current_population?: number
          id?: string
          pl_quantity?: number
          pond_id?: string
          preparation_cost?: number | null
          stocking_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pond_batches_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pond_batches_pond_id_fkey"
            columns: ["pond_id"]
            isOneToOne: false
            referencedRelation: "ponds"
            referencedColumns: ["id"]
          },
        ]
      }
      ponds: {
        Row: {
          area: number
          created_at: string | null
          depth: number
          farm_id: string
          id: string
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          area: number
          created_at?: string | null
          depth: number
          farm_id: string
          id?: string
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          area?: number
          created_at?: string | null
          depth?: number
          farm_id?: string
          id?: string
          name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ponds_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      water_quality: {
        Row: {
          alkalinity: number | null
          ammonia: number | null
          created_at: string
          hardness: number | null
          id: string
          measurement_date: string
          notes: string | null
          oxygen_level: number | null
          ph_level: number | null
          pond_id: string
          temperature: number | null
          turbidity: number | null
          updated_at: string
        }
        Insert: {
          alkalinity?: number | null
          ammonia?: number | null
          created_at?: string
          hardness?: number | null
          id?: string
          measurement_date: string
          notes?: string | null
          oxygen_level?: number | null
          ph_level?: number | null
          pond_id: string
          temperature?: number | null
          turbidity?: number | null
          updated_at?: string
        }
        Update: {
          alkalinity?: number | null
          ammonia?: number | null
          created_at?: string
          hardness?: number | null
          id?: string
          measurement_date?: string
          notes?: string | null
          oxygen_level?: number | null
          ph_level?: number | null
          pond_id?: string
          temperature?: number | null
          turbidity?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
