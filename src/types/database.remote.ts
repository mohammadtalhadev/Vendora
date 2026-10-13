// Authoritative types introspected directly from live remote Supabase project: bbwcvrviisqmynsllroi
// Generated during safe database audit

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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          ip_address: unknown
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: number
          ip_address?: unknown
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: number
          ip_address?: unknown
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string | null
          id: string
          image: string | null
          max_stock: number | null
          price: number
          product_id: string
          quantity: number
          seller_id: string
          seller_name: string
          seller_type: string | null
          title: string
          type: string | null
          updated_at: string | null
          user_id: string | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          image?: string | null
          max_stock?: number | null
          price: number
          product_id: string
          quantity?: number
          seller_id: string
          seller_name: string
          seller_type?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image?: string | null
          max_stock?: number | null
          price?: number
          product_id?: string
          quantity?: number
          seller_id?: string
          seller_name?: string
          seller_type?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
          variant_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          commission_rate_override: number | null
          created_at: string | null
          icon: string | null
          id: string
          image: string | null
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          commission_rate_override?: number | null
          created_at?: string | null
          icon?: string | null
          id: string
          image?: string | null
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          commission_rate_override?: number | null
          created_at?: string | null
          icon?: string | null
          id?: string
          image?: string | null
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      commission_config: {
        Row: {
          active: boolean
          created_at: string
          effective_from: string
          id: string
          name: string
          rate: number
          scope: string
          scope_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          effective_from?: string
          id: string
          name: string
          rate: number
          scope: string
          scope_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          effective_from?: string
          id?: string
          name?: string
          rate?: number
          scope?: string
          scope_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      content_blocks: {
        Row: {
          body: Json
          created_at: string
          ends_at: string | null
          id: string
          placement: string
          published: boolean
          slug: string
          starts_at: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body?: Json
          created_at?: string
          ends_at?: string | null
          id: string
          placement?: string
          published?: boolean
          slug: string
          starts_at?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: Json
          created_at?: string
          ends_at?: string | null
          id?: string
          placement?: string
          published?: boolean
          slug?: string
          starts_at?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          assigned_at: string | null
          created_at: string
          delivered_at: string | null
          dropoff_details: Json
          handover_code_hash: string | null
          id: string
          picked_up_at: string | null
          pickup_details: Json
          proof_of_delivery: Json
          rider_id: string | null
          status: string
          sub_order_id: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          created_at?: string
          delivered_at?: string | null
          dropoff_details?: Json
          handover_code_hash?: string | null
          id: string
          picked_up_at?: string | null
          pickup_details?: Json
          proof_of_delivery?: Json
          rider_id?: string | null
          status?: string
          sub_order_id: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          created_at?: string
          delivered_at?: string | null
          dropoff_details?: Json
          handover_code_hash?: string | null
          id?: string
          picked_up_at?: string | null
          pickup_details?: Json
          proof_of_delivery?: Json
          rider_id?: string | null
          status?: string
          sub_order_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "rider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_sub_order_id_fkey"
            columns: ["sub_order_id"]
            isOneToOne: false
            referencedRelation: "sub_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          assigned_support_id: string | null
          category: string
          created_at: string
          customer_id: string | null
          description: string
          evidence: Json
          id: string
          order_id: string | null
          priority: string
          resolution: string | null
          seller_id: string | null
          status: string
          sub_order_id: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_support_id?: string | null
          category?: string
          created_at?: string
          customer_id?: string | null
          description?: string
          evidence?: Json
          id: string
          order_id?: string | null
          priority?: string
          resolution?: string | null
          seller_id?: string | null
          status?: string
          sub_order_id?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_support_id?: string | null
          category?: string
          created_at?: string
          customer_id?: string | null
          description?: string
          evidence?: Json
          id?: string
          order_id?: string | null
          priority?: string
          resolution?: string | null
          seller_id?: string | null
          status?: string
          sub_order_id?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_sub_order_id_fkey"
            columns: ["sub_order_id"]
            isOneToOne: false
            referencedRelation: "sub_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json | null
          conversation_id: string
          created_at: string | null
          id: string
          read: boolean | null
          recipient_id: string | null
          sender_id: string
          sender_name: string
          sender_role: string | null
          text: string
        }
        Insert: {
          attachments?: Json | null
          conversation_id: string
          created_at?: string | null
          id: string
          read?: boolean | null
          recipient_id?: string | null
          sender_id: string
          sender_name: string
          sender_role?: string | null
          text: string
        }
        Update: {
          attachments?: Json | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          recipient_id?: string | null
          sender_id?: string
          sender_name?: string
          sender_role?: string | null
          text?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          href: string | null
          id: string
          message: string
          metadata: Json
          read_at: string | null
          role_target: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          href?: string | null
          id: string
          message?: string
          metadata?: Json
          read_at?: string | null
          role_target?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          href?: string | null
          id?: string
          message?: string
          metadata?: Json
          read_at?: string | null
          role_target?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string | null
          customer_email: string
          customer_id: string | null
          id: string
          payment_method: string
          shipping_address: Json | null
          status: string
        }
        Insert: {
          created_at?: string | null
          customer_email: string
          customer_id?: string | null
          id: string
          payment_method?: string
          shipping_address?: Json | null
          status?: string
        }
        Update: {
          created_at?: string | null
          customer_email?: string
          customer_id?: string | null
          id?: string
          payment_method?: string
          shipping_address?: Json | null
          status?: string
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          metadata: Json
          payment_method: string | null
          payment_reference: string | null
          period_end: string | null
          period_start: string | null
          processed_at: string | null
          processed_by: string | null
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id: string
          metadata?: Json
          payment_method?: string | null
          payment_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          processed_at?: string | null
          processed_by?: string | null
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          payment_method?: string | null
          payment_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          processed_at?: string | null
          processed_by?: string | null
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          brand: string | null
          category_id: string | null
          compare_at_price: number | null
          created_at: string | null
          description: string | null
          digital_asset_info: Json | null
          id: string
          images: string[] | null
          price: number
          rating: number | null
          rejection_reason: string | null
          review_count: number | null
          seller_id: string
          seller_name: string | null
          seller_type: string
          shipping_settings: Json | null
          slug: string
          status: string
          stock: number
          title: string
          type: string
          variants: Json | null
        }
        Insert: {
          brand?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          description?: string | null
          digital_asset_info?: Json | null
          id: string
          images?: string[] | null
          price: number
          rating?: number | null
          rejection_reason?: string | null
          review_count?: number | null
          seller_id: string
          seller_name?: string | null
          seller_type?: string
          shipping_settings?: Json | null
          slug: string
          status?: string
          stock?: number
          title: string
          type?: string
          variants?: Json | null
        }
        Update: {
          brand?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          description?: string | null
          digital_asset_info?: Json | null
          id?: string
          images?: string[] | null
          price?: number
          rating?: number | null
          rejection_reason?: string | null
          review_count?: number | null
          seller_id?: string
          seller_name?: string | null
          seller_type?: string
          shipping_settings?: Json | null
          slug?: string
          status?: string
          stock?: number
          title?: string
          type?: string
          variants?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          metadata: Json | null
          name: string
          rejection_reason: string | null
          roles: string[] | null
          updated_at: string | null
          vendor_id: string | null
          vendor_status: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          metadata?: Json | null
          name: string
          rejection_reason?: string | null
          roles?: string[] | null
          updated_at?: string | null
          vendor_id?: string | null
          vendor_status?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          metadata?: Json | null
          name?: string
          rejection_reason?: string | null
          roles?: string[] | null
          updated_at?: string | null
          vendor_id?: string | null
          vendor_status?: string | null
        }
        Relationships: []
      }
      promotions: {
        Row: {
          active: boolean
          applicable_categories: string[]
          applicable_vendors: string[]
          code: string | null
          created_at: string
          created_by: string | null
          description: string
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          max_discount: number | null
          minimum_order: number
          starts_at: string
          title: string
          updated_at: string
          usage_count: number
          usage_limit: number | null
        }
        Insert: {
          active?: boolean
          applicable_categories?: string[]
          applicable_vendors?: string[]
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          discount_type: string
          discount_value?: number
          ends_at?: string | null
          id: string
          max_discount?: number | null
          minimum_order?: number
          starts_at?: string
          title: string
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Update: {
          active?: boolean
          applicable_categories?: string[]
          applicable_vendors?: string[]
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          max_discount?: number | null
          minimum_order?: number
          starts_at?: string
          title?: string
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_avatar: string | null
          author_country: string | null
          author_id: string | null
          author_name: string
          body: string
          created_at: string | null
          headline: string
          helpful_count: number | null
          id: string
          order_number: string | null
          photos: string[] | null
          product_id: string | null
          rating: number
          seller_reply: Json | null
          verified_purchase: boolean | null
        }
        Insert: {
          author_avatar?: string | null
          author_country?: string | null
          author_id?: string | null
          author_name: string
          body: string
          created_at?: string | null
          headline: string
          helpful_count?: number | null
          id: string
          order_number?: string | null
          photos?: string[] | null
          product_id?: string | null
          rating: number
          seller_reply?: Json | null
          verified_purchase?: boolean | null
        }
        Update: {
          author_avatar?: string | null
          author_country?: string | null
          author_id?: string | null
          author_name?: string
          body?: string
          created_at?: string | null
          headline?: string
          helpful_count?: number | null
          id?: string
          order_number?: string | null
          photos?: string[] | null
          product_id?: string | null
          rating?: number
          seller_reply?: Json | null
          verified_purchase?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string | null
          service_regions: string[]
          status: string
          updated_at: string
          user_id: string | null
          vehicle_registration: string | null
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
          service_regions?: string[]
          status?: string
          updated_at?: string
          user_id?: string | null
          vehicle_registration?: string | null
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          service_regions?: string[]
          status?: string
          updated_at?: string
          user_id?: string | null
          vehicle_registration?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      sub_orders: {
        Row: {
          commission_amount: number
          commission_rate: number
          created_at: string | null
          delivery_code: string | null
          history: Json | null
          id: string
          items: Json
          license_key: string | null
          net_payout: number
          order_group_id: string | null
          return_reason: string | null
          rider_id: string | null
          seller_id: string
          seller_name: string
          seller_type: string
          shipping_fee: number
          status: string
          subtotal: number
          type: string
        }
        Insert: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          delivery_code?: string | null
          history?: Json | null
          id: string
          items?: Json
          license_key?: string | null
          net_payout?: number
          order_group_id?: string | null
          return_reason?: string | null
          rider_id?: string | null
          seller_id: string
          seller_name: string
          seller_type?: string
          shipping_fee?: number
          status?: string
          subtotal?: number
          type?: string
        }
        Update: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          delivery_code?: string | null
          history?: Json | null
          id?: string
          items?: Json
          license_key?: string | null
          net_payout?: number
          order_group_id?: string | null
          return_reason?: string | null
          rider_id?: string | null
          seller_id?: string
          seller_name?: string
          seller_type?: string
          shipping_fee?: number
          status?: string
          subtotal?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_orders_order_group_id_fkey"
            columns: ["order_group_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      test_non_destructive: {
        Row: {
          id: string
        }
        Insert: {
          id: string
        }
        Update: {
          id?: string
        }
        Relationships: []
      }
      vendor_applications: {
        Row: {
          business_address: Json
          business_type: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          kyc_documents: Json
          proposed_store_name: string
          review_note: string | null
          reviewer_id: string | null
          slug: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_address?: Json
          business_type?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id: string
          kyc_documents?: Json
          proposed_store_name: string
          review_note?: string | null
          reviewer_id?: string | null
          slug: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_address?: Json
          business_type?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          kyc_documents?: Json
          proposed_store_name?: string
          review_note?: string | null
          reviewer_id?: string | null
          slug?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vendor_profiles: {
        Row: {
          banner: string | null
          commission_rate_override: number | null
          created_at: string | null
          description: string | null
          id: string
          logo: string | null
          rating: number | null
          review_count: number | null
          slug: string
          status: string | null
          store_name: string
          user_id: string | null
        }
        Insert: {
          banner?: string | null
          commission_rate_override?: number | null
          created_at?: string | null
          description?: string | null
          id: string
          logo?: string | null
          rating?: number | null
          review_count?: number | null
          slug: string
          status?: string | null
          store_name: string
          user_id?: string | null
        }
        Update: {
          banner?: string | null
          commission_rate_override?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo?: string | null
          rating?: number | null
          review_count?: number | null
          slug?: string
          status?: string | null
          store_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          brand: string | null
          category: string | null
          compare_at_price: number | null
          created_at: string | null
          id: string
          image: string | null
          price: number
          product_id: string
          seller_id: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          id: string
          image?: string | null
          price: number
          product_id: string
          seller_id?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          id?: string
          image?: string | null
          price?: number
          product_id?: string
          seller_id?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_commission: {
        Args: { p_category_id: string; p_subtotal: number; p_vendor_id: string }
        Returns: {
          amount: number
          net: number
          rate: number
        }[]
      }
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
    Enums: {},
  },
} as const
