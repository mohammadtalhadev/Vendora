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
          actor_role: string
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          bank_name: string
          created_at: string
          holder_name: string
          id: string
          is_default: boolean
          masked_account: string
          vendor_id: string
        }
        Insert: {
          bank_name: string
          created_at?: string
          holder_name: string
          id?: string
          is_default?: boolean
          masked_account: string
          vendor_id: string
        }
        Update: {
          bank_name?: string
          created_at?: string
          holder_name?: string
          id?: string
          is_default?: boolean
          masked_account?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          user_id: string
          variant_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          commission_rate_override: number | null
          created_at: string
          icon: string | null
          id: string
          image: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          commission_rate_override?: number | null
          created_at?: string
          icon?: string | null
          id?: string
          image?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          commission_rate_override?: number | null
          created_at?: string
          icon?: string | null
          id?: string
          image?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      commission_config: {
        Row: {
          category_overrides: Json
          global_default_rate: number
          id: boolean
          updated_at: string
          vendor_overrides: Json
        }
        Insert: {
          category_overrides?: Json
          global_default_rate?: number
          id?: boolean
          updated_at?: string
          vendor_overrides?: Json
        }
        Update: {
          category_overrides?: Json
          global_default_rate?: number
          id?: boolean
          updated_at?: string
          vendor_overrides?: Json
        }
        Relationships: []
      }
      content_blocks: {
        Row: {
          body: Json
          created_at: string
          id: string
          placement: string
          published: boolean
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          body?: Json
          created_at?: string
          id?: string
          placement?: string
          published?: boolean
          slug: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Update: {
          body?: Json
          created_at?: string
          id?: string
          placement?: string
          published?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
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
          proof_of_delivery: Json | null
          rider_id: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          sub_order_id: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          created_at?: string
          delivered_at?: string | null
          dropoff_details?: Json
          handover_code_hash?: string | null
          id?: string
          picked_up_at?: string | null
          pickup_details?: Json
          proof_of_delivery?: Json | null
          rider_id?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
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
          proof_of_delivery?: Json | null
          rider_id?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
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
            isOneToOne: true
            referencedRelation: "sub_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_messages: {
        Row: {
          attachments: string[]
          content: string
          created_at: string
          dispute_id: string
          id: string
          is_internal_note: boolean
          sender_avatar: string | null
          sender_id: string | null
          sender_name: string
          sender_role: Database["public"]["Enums"]["message_sender_role"]
        }
        Insert: {
          attachments?: string[]
          content?: string
          created_at?: string
          dispute_id: string
          id?: string
          is_internal_note?: boolean
          sender_avatar?: string | null
          sender_id?: string | null
          sender_name?: string
          sender_role: Database["public"]["Enums"]["message_sender_role"]
        }
        Update: {
          attachments?: string[]
          content?: string
          created_at?: string
          dispute_id?: string
          id?: string
          is_internal_note?: boolean
          sender_avatar?: string | null
          sender_id?: string | null
          sender_name?: string
          sender_role?: Database["public"]["Enums"]["message_sender_role"]
        }
        Relationships: [
          {
            foreignKeyName: "dispute_messages_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          assigned_agent_id: string | null
          created_at: string
          customer_avatar: string | null
          customer_id: string | null
          customer_name: string
          evidence_photos: string[]
          id: string
          order_group_id: string | null
          reason: string
          resolution_amount: number | null
          resolution_note: string | null
          status: Database["public"]["Enums"]["dispute_status"]
          sub_order_id: string | null
          updated_at: string
          urgency: Database["public"]["Enums"]["dispute_urgency"]
          vendor_id: string | null
          vendor_name: string
        }
        Insert: {
          assigned_agent_id?: string | null
          created_at?: string
          customer_avatar?: string | null
          customer_id?: string | null
          customer_name?: string
          evidence_photos?: string[]
          id?: string
          order_group_id?: string | null
          reason?: string
          resolution_amount?: number | null
          resolution_note?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          sub_order_id?: string | null
          updated_at?: string
          urgency?: Database["public"]["Enums"]["dispute_urgency"]
          vendor_id?: string | null
          vendor_name?: string
        }
        Update: {
          assigned_agent_id?: string | null
          created_at?: string
          customer_avatar?: string | null
          customer_id?: string | null
          customer_name?: string
          evidence_photos?: string[]
          id?: string
          order_group_id?: string | null
          reason?: string
          resolution_amount?: number | null
          resolution_note?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          sub_order_id?: string | null
          updated_at?: string
          urgency?: Database["public"]["Enums"]["dispute_urgency"]
          vendor_id?: string | null
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_order_group_id_fkey"
            columns: ["order_group_id"]
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
          {
            foreignKeyName: "disputes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          channel: Database["public"]["Enums"]["thread_channel"]
          created_at: string
          customer_id: string | null
          customer_name: string
          id: string
          order_ref: string | null
          product_ref: string | null
          status: Database["public"]["Enums"]["thread_status"]
          updated_at: string
          vendor_id: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["thread_channel"]
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          id?: string
          order_ref?: string | null
          product_ref?: string | null
          status?: Database["public"]["Enums"]["thread_status"]
          updated_at?: string
          vendor_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["thread_channel"]
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          id?: string
          order_ref?: string | null
          product_ref?: string | null
          status?: Database["public"]["Enums"]["thread_status"]
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json
          body: string
          created_at: string
          id: string
          read: boolean
          sender_id: string | null
          sender_name: string
          sender_role: Database["public"]["Enums"]["message_sender_role"]
          thread_id: string
        }
        Insert: {
          attachments?: Json
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id?: string | null
          sender_name?: string
          sender_role: Database["public"]["Enums"]["message_sender_role"]
          thread_id: string
        }
        Update: {
          attachments?: Json
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id?: string | null
          sender_name?: string
          sender_role?: Database["public"]["Enums"]["message_sender_role"]
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          href: string | null
          id: string
          message: string
          read_at: string | null
          role_target: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          href?: string | null
          id?: string
          message?: string
          read_at?: string | null
          role_target?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          href?: string | null
          id?: string
          message?: string
          read_at?: string | null
          role_target?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          customer_email: string
          customer_id: string | null
          id: string
          payment_details: Json
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          shipping_address: Json
        }
        Insert: {
          created_at?: string
          customer_email?: string
          customer_id?: string | null
          id?: string
          payment_details?: Json
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping_address?: Json
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_id?: string | null
          id?: string
          payment_details?: Json
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping_address?: Json
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
          payment_method: string
          payment_reference: string | null
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
          vendor_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          payment_method?: string
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          payment_method?: string
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string
          category_id: string | null
          compare_at_price: number | null
          created_at: string
          description: string
          digital_asset_info: Json
          id: string
          images: string[]
          price: number
          rating: number
          rejection_reason: string | null
          review_count: number
          search_vector: unknown
          seller_id: string
          shipping_settings: Json
          slug: string
          status: Database["public"]["Enums"]["moderation_status"]
          stock: number
          title: string
          type: Database["public"]["Enums"]["product_type"]
          updated_at: string
          variants: Json
        }
        Insert: {
          brand?: string
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string
          digital_asset_info?: Json
          id?: string
          images?: string[]
          price: number
          rating?: number
          rejection_reason?: string | null
          review_count?: number
          search_vector?: unknown
          seller_id: string
          shipping_settings?: Json
          slug: string
          status?: Database["public"]["Enums"]["moderation_status"]
          stock?: number
          title: string
          type?: Database["public"]["Enums"]["product_type"]
          updated_at?: string
          variants?: Json
        }
        Update: {
          brand?: string
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string
          digital_asset_info?: Json
          id?: string
          images?: string[]
          price?: number
          rating?: number
          rejection_reason?: string | null
          review_count?: number
          search_vector?: unknown
          seller_id?: string
          shipping_settings?: Json
          slug?: string
          status?: Database["public"]["Enums"]["moderation_status"]
          stock?: number
          title?: string
          type?: Database["public"]["Enums"]["product_type"]
          updated_at?: string
          variants?: Json
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          metadata: Json
          name: string
          rejection_reason: string | null
          roles: Database["public"]["Enums"]["user_role"][]
          updated_at: string
          vendor_status: Database["public"]["Enums"]["vendor_status"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id: string
          metadata?: Json
          name?: string
          rejection_reason?: string | null
          roles?: Database["public"]["Enums"]["user_role"][]
          updated_at?: string
          vendor_status?: Database["public"]["Enums"]["vendor_status"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          metadata?: Json
          name?: string
          rejection_reason?: string | null
          roles?: Database["public"]["Enums"]["user_role"][]
          updated_at?: string
          vendor_status?: Database["public"]["Enums"]["vendor_status"]
        }
        Relationships: []
      }
      promotions: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          max_discount: number | null
          minimum_order: number
          starts_at: string | null
          title: string
          updated_at: string
          usage_count: number
          usage_limit: number
          vendor_id: string | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string
          discount_type?: string
          discount_value: number
          ends_at?: string | null
          id?: string
          max_discount?: number | null
          minimum_order?: number
          starts_at?: string | null
          title?: string
          updated_at?: string
          usage_count?: number
          usage_limit?: number
          vendor_id?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          max_discount?: number | null
          minimum_order?: number
          starts_at?: string | null
          title?: string
          updated_at?: string
          usage_count?: number
          usage_limit?: number
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_avatar: string | null
          author_country: string | null
          author_id: string | null
          author_name: string
          body: string
          created_at: string
          headline: string
          helpful_count: number
          id: string
          order_number: string | null
          photos: string[]
          product_id: string
          rating: number
          seller_reply: Json | null
          verified_purchase: boolean
        }
        Insert: {
          author_avatar?: string | null
          author_country?: string | null
          author_id?: string | null
          author_name?: string
          body?: string
          created_at?: string
          headline?: string
          helpful_count?: number
          id?: string
          order_number?: string | null
          photos?: string[]
          product_id: string
          rating: number
          seller_reply?: Json | null
          verified_purchase?: boolean
        }
        Update: {
          author_avatar?: string | null
          author_country?: string | null
          author_id?: string | null
          author_name?: string
          body?: string
          created_at?: string
          headline?: string
          helpful_count?: number
          id?: string
          order_number?: string | null
          photos?: string[]
          product_id?: string
          rating?: number
          seller_reply?: Json | null
          verified_purchase?: boolean
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
          status: Database["public"]["Enums"]["rider_availability"]
          updated_at: string
          user_id: string | null
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["rider_availability"]
          updated_at?: string
          user_id?: string | null
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["rider_availability"]
          updated_at?: string
          user_id?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      sub_orders: {
        Row: {
          carrier_name: string | null
          commission_amount: number
          commission_rate: number
          created_at: string
          customer_notes: string | null
          delivery_code_hash: string | null
          delivery_option: string
          history: Json
          id: string
          items: Json
          license_key: string | null
          net_payout: number
          order_group_id: string
          return_reason: string | null
          rider_id: string | null
          seller_id: string
          shipping_fee: number
          status: Database["public"]["Enums"]["sub_order_status"]
          subtotal: number
          tracking_number: string | null
          type: Database["public"]["Enums"]["product_type"]
          updated_at: string
        }
        Insert: {
          carrier_name?: string | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          customer_notes?: string | null
          delivery_code_hash?: string | null
          delivery_option?: string
          history?: Json
          id?: string
          items?: Json
          license_key?: string | null
          net_payout?: number
          order_group_id: string
          return_reason?: string | null
          rider_id?: string | null
          seller_id: string
          shipping_fee?: number
          status?: Database["public"]["Enums"]["sub_order_status"]
          subtotal?: number
          tracking_number?: string | null
          type?: Database["public"]["Enums"]["product_type"]
          updated_at?: string
        }
        Update: {
          carrier_name?: string | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          customer_notes?: string | null
          delivery_code_hash?: string | null
          delivery_option?: string
          history?: Json
          id?: string
          items?: Json
          license_key?: string | null
          net_payout?: number
          order_group_id?: string
          return_reason?: string | null
          rider_id?: string | null
          seller_id?: string
          shipping_fee?: number
          status?: Database["public"]["Enums"]["sub_order_status"]
          subtotal?: number
          tracking_number?: string | null
          type?: Database["public"]["Enums"]["product_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_orders_order_group_id_fkey"
            columns: ["order_group_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_orders_rider_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "rider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_applications: {
        Row: {
          business_address: Json | null
          business_type: string
          contact_email: string
          contact_phone: string | null
          created_at: string
          description: string
          id: string
          kyc_documents: Json | null
          policy_accepted: boolean
          proposed_slug: string
          proposed_store_name: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          business_address?: Json | null
          business_type?: string
          contact_email?: string
          contact_phone?: string | null
          created_at?: string
          description?: string
          id?: string
          kyc_documents?: Json | null
          policy_accepted?: boolean
          proposed_slug: string
          proposed_store_name: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          business_address?: Json | null
          business_type?: string
          contact_email?: string
          contact_phone?: string | null
          created_at?: string
          description?: string
          id?: string
          kyc_documents?: Json | null
          policy_accepted?: boolean
          proposed_slug?: string
          proposed_store_name?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      vendor_profiles: {
        Row: {
          banner: string | null
          commission_rate_override: number | null
          created_at: string
          description: string | null
          id: string
          logo: string | null
          rating: number
          review_count: number
          seller_type: Database["public"]["Enums"]["seller_type"]
          slug: string
          status: Database["public"]["Enums"]["vendor_state"]
          store_name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          banner?: string | null
          commission_rate_override?: number | null
          created_at?: string
          description?: string | null
          id?: string
          logo?: string | null
          rating?: number
          review_count?: number
          seller_type?: Database["public"]["Enums"]["seller_type"]
          slug: string
          status?: Database["public"]["Enums"]["vendor_state"]
          store_name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          banner?: string | null
          commission_rate_override?: number | null
          created_at?: string
          description?: string | null
          id?: string
          logo?: string | null
          rating?: number
          review_count?: number
          seller_type?: Database["public"]["Enums"]["seller_type"]
          slug?: string
          status?: Database["public"]["Enums"]["vendor_state"]
          store_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      advance_sub_order_status: {
        Args: { p_next: string; p_note?: string; p_sub_order_id: string }
        Returns: Json
      }
      assign_rider: {
        Args: { p_rider_id: string; p_sub_order_id: string }
        Returns: Json
      }
      cart_lines_for: { Args: { p_uid: string }; Returns: Json }
      checkout_pricing: {
        Args: {
          p_coupon_code?: string
          p_delivery_options?: Json
          p_uid: string
        }
        Returns: Json
      }
      checkout_quote: {
        Args: { p_coupon_code?: string; p_delivery_options?: Json }
        Returns: Json
      }
      commission_rate_for: {
        Args: { category: string; seller: string }
        Returns: number
      }
      current_vendor_id: { Args: never; Returns: string }
      express_shipping_fee: { Args: never; Returns: number }
      has_role: {
        Args: { check_role: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
      hash_delivery_code: { Args: { raw: string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_dispute_party: { Args: { d: string }; Returns: boolean }
      is_thread_participant: { Args: { t: string }; Returns: boolean }
      issue_delivery_code: { Args: { p_sub_order_id: string }; Returns: Json }
      moderate_product: {
        Args: { p_product_id: string; p_reason?: string; p_status: string }
        Returns: boolean
      }
      owns_review: { Args: { r: string }; Returns: boolean }
      place_order: {
        Args: {
          p_address: Json
          p_card_brand?: string
          p_card_last4?: string
          p_coupon_code?: string
          p_customer_notes?: string
          p_delivery_option?: string
          p_delivery_options?: Json
          p_payment_method: string
        }
        Returns: Json
      }
      reply_to_review: {
        Args: { p_reply: string; p_review_id: string }
        Returns: boolean
      }
      request_payout: { Args: { p_amount: number }; Returns: Json }
      resolve_dispute: {
        Args: {
          p_amount?: number
          p_dispute_id: string
          p_note?: string
          p_outcome: string
        }
        Returns: boolean
      }
      review_vendor_application: {
        Args: { p_application_id: string; p_decision: string; p_note?: string }
        Returns: boolean
      }
      verify_delivery: {
        Args: { p_code: string; p_delivery_id: string }
        Returns: Json
      }
    }
    Enums: {
      application_status: "pending" | "under_review" | "approved" | "rejected"
      delivery_status:
        | "pending"
        | "assigned"
        | "picked_up"
        | "in_transit"
        | "out_for_delivery"
        | "delivered"
        | "failed"
      dispute_status:
        | "open"
        | "under_review"
        | "escalated"
        | "resolved_refund"
        | "resolved_denied"
      dispute_urgency: "standard" | "urgent"
      message_sender_role: "customer" | "vendor" | "support"
      moderation_status:
        | "draft"
        | "pending_review"
        | "approved"
        | "rejected"
        | "archived"
      notification_type:
        | "order_status"
        | "system"
        | "promotion"
        | "payout"
        | "dispute"
        | "review"
        | "security"
      payment_method: "card" | "cod"
      payment_status: "pending" | "succeeded" | "failed" | "refunded"
      payout_status: "processing" | "completed" | "failed"
      product_type: "physical" | "digital"
      rider_availability: "available" | "busy" | "offline"
      seller_type: "platform" | "vendor"
      sub_order_status:
        | "placed"
        | "confirmed"
        | "packed"
        | "ready_for_pickup"
        | "shipped"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
        | "delivery_failed"
        | "return_requested"
        | "return_approved"
        | "refunded"
        | "paid"
        | "available"
      thread_channel:
        | "order_inquiry"
        | "return_rma"
        | "product_question"
        | "dispute"
      thread_status: "open" | "pending" | "urgent" | "resolved" | "escalated"
      user_role: "customer" | "vendor" | "admin" | "support" | "rider"
      vendor_state: "active" | "suspended"
      vendor_status: "none" | "pending" | "approved" | "rejected" | "suspended"
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
      application_status: ["pending", "under_review", "approved", "rejected"],
      delivery_status: [
        "pending",
        "assigned",
        "picked_up",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "failed",
      ],
      dispute_status: [
        "open",
        "under_review",
        "escalated",
        "resolved_refund",
        "resolved_denied",
      ],
      dispute_urgency: ["standard", "urgent"],
      message_sender_role: ["customer", "vendor", "support"],
      moderation_status: [
        "draft",
        "pending_review",
        "approved",
        "rejected",
        "archived",
      ],
      notification_type: [
        "order_status",
        "system",
        "promotion",
        "payout",
        "dispute",
        "review",
        "security",
      ],
      payment_method: ["card", "cod"],
      payment_status: ["pending", "succeeded", "failed", "refunded"],
      payout_status: ["processing", "completed", "failed"],
      product_type: ["physical", "digital"],
      rider_availability: ["available", "busy", "offline"],
      seller_type: ["platform", "vendor"],
      sub_order_status: [
        "placed",
        "confirmed",
        "packed",
        "ready_for_pickup",
        "shipped",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "delivery_failed",
        "return_requested",
        "return_approved",
        "refunded",
        "paid",
        "available",
      ],
      thread_channel: [
        "order_inquiry",
        "return_rma",
        "product_question",
        "dispute",
      ],
      thread_status: ["open", "pending", "urgent", "resolved", "escalated"],
      user_role: ["customer", "vendor", "admin", "support", "rider"],
      vendor_state: ["active", "suspended"],
      vendor_status: ["none", "pending", "approved", "rejected", "suspended"],
    },
  },
} as const
