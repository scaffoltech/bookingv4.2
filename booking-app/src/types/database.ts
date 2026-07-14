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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_audit_logs: {
        Row: {
          confidence: string | null
          contact_id: string | null
          context_id: string | null
          cost_estimate_usd: number | null
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          latency_ms: number | null
          metadata: Json
          model: string | null
          provider: string
          quote_id: string | null
          request_payload: Json | null
          response_payload: Json | null
          status: string
          tokens_input: number | null
          tokens_output: number | null
          tokens_total: number | null
          user_id: string
        }
        Insert: {
          confidence?: string | null
          contact_id?: string | null
          context_id?: string | null
          cost_estimate_usd?: number | null
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          provider?: string
          quote_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          tokens_input?: number | null
          tokens_output?: number | null
          tokens_total?: number | null
          user_id: string
        }
        Update: {
          confidence?: string | null
          contact_id?: string | null
          context_id?: string | null
          cost_estimate_usd?: number | null
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          provider?: string
          quote_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          tokens_input?: number | null
          tokens_output?: number | null
          tokens_total?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_audit_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_audit_logs_context_id_fkey"
            columns: ["context_id"]
            isOneToOne: false
            referencedRelation: "ai_query_contexts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_audit_logs_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_query_contexts: {
        Row: {
          consumed_at: string | null
          contact_id: string | null
          context_hash: string | null
          context_json: Json
          created_at: string
          expires_at: string
          id: string
          query_type: string
          quote_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          contact_id?: string | null
          context_hash?: string | null
          context_json: Json
          created_at?: string
          expires_at?: string
          id?: string
          query_type?: string
          quote_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          contact_id?: string | null
          context_hash?: string | null
          context_json?: Json
          created_at?: string
          expires_at?: string
          id?: string
          query_type?: string
          quote_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_query_contexts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_query_contexts_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_query_contexts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_items: {
        Row: {
          agent_markup: number | null
          booking_id: string
          booking_status: string | null
          cancellation_policy: Json | null
          client_price: number | null
          confirmation_number: string | null
          confirmed_at: string | null
          created_at: string | null
          details: Json
          end_date: string | null
          id: string
          last_checked_price: number | null
          name: string
          orchestration_error: string | null
          platform_fee: number | null
          price: number
          price_check_rate_key: string | null
          quantity: number
          quote_item_id: string | null
          retry_count: number | null
          start_date: string
          supplier: string | null
          supplier_cost: number | null
          supplier_source: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          agent_markup?: number | null
          booking_id: string
          booking_status?: string | null
          cancellation_policy?: Json | null
          client_price?: number | null
          confirmation_number?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          details?: Json
          end_date?: string | null
          id?: string
          last_checked_price?: number | null
          name: string
          orchestration_error?: string | null
          platform_fee?: number | null
          price: number
          price_check_rate_key?: string | null
          quantity?: number
          quote_item_id?: string | null
          retry_count?: number | null
          start_date: string
          supplier?: string | null
          supplier_cost?: number | null
          supplier_source?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          agent_markup?: number | null
          booking_id?: string
          booking_status?: string | null
          cancellation_policy?: Json | null
          client_price?: number | null
          confirmation_number?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          details?: Json
          end_date?: string | null
          id?: string
          last_checked_price?: number | null
          name?: string
          orchestration_error?: string | null
          platform_fee?: number | null
          price?: number
          price_check_rate_key?: string | null
          quantity?: number
          quote_item_id?: string | null
          retry_count?: number | null
          start_date?: string
          supplier?: string | null
          supplier_cost?: number | null
          supplier_source?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_reference: string
          contact_id: string | null
          created_at: string | null
          currency: string | null
          id: string
          notes: string | null
          orchestration_status: string | null
          org_id: string
          payment_status: string | null
          quote_id: string | null
          status: string | null
          total_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          booking_reference: string
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          orchestration_status?: string | null
          org_id: string
          payment_status?: string | null
          quote_id?: string | null
          status?: string | null
          total_amount: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          booking_reference?: string
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          orchestration_status?: string | null
          org_id?: string
          payment_status?: string | null
          quote_id?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          agent_id: string | null
          agent_name: string | null
          booking_amount: number | null
          booking_id: string | null
          booking_type: string | null
          commission_amount: number
          commission_rate: number
          created_at: string | null
          currency: string | null
          customer_id: string | null
          customer_name: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          org_id: string
          paid_at: string | null
          payment_method: string | null
          quote_id: string | null
          status: string | null
          transaction_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          agent_name?: string | null
          booking_amount?: number | null
          booking_id?: string | null
          booking_type?: string | null
          commission_amount: number
          commission_rate: number
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          org_id: string
          paid_at?: string | null
          payment_method?: string | null
          quote_id?: string | null
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string | null
          agent_name?: string | null
          booking_amount?: number | null
          booking_id?: string | null
          booking_type?: string | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          org_id?: string
          paid_at?: string | null
          payment_method?: string | null
          quote_id?: string | null
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: Json | null
          company: string | null
          created_at: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          notes: string | null
          org_id: string
          phone: string | null
          preferences: Json | null
          tags: string[] | null
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: Json | null
          company?: string | null
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          org_id: string
          phone?: string | null
          preferences?: Json | null
          tags?: string[] | null
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: Json | null
          company?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          org_id?: string
          phone?: string | null
          preferences?: Json | null
          tags?: string[] | null
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          agent_id: string | null
          amount: number
          approved_by: string | null
          approved_date: string | null
          booking_id: string | null
          category: string
          created_at: string | null
          currency: string
          date: string
          description: string | null
          id: string
          is_recurring: boolean | null
          notes: string | null
          org_id: string
          payment_method: string | null
          quote_id: string | null
          receipt_url: string | null
          recurring_frequency: string | null
          status: string | null
          subcategory: string | null
          supplier_id: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
          vendor: string | null
        }
        Insert: {
          agent_id?: string | null
          amount: number
          approved_by?: string | null
          approved_date?: string | null
          booking_id?: string | null
          category: string
          created_at?: string | null
          currency?: string
          date: string
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          org_id: string
          payment_method?: string | null
          quote_id?: string | null
          receipt_url?: string | null
          recurring_frequency?: string | null
          status?: string | null
          subcategory?: string | null
          supplier_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
          vendor?: string | null
        }
        Update: {
          agent_id?: string | null
          amount?: number
          approved_by?: string | null
          approved_date?: string | null
          booking_id?: string | null
          category?: string
          created_at?: string | null
          currency?: string
          date?: string
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          org_id?: string
          payment_method?: string | null
          quote_id?: string | null
          receipt_url?: string | null
          recurring_frequency?: string | null
          status?: string | null
          subcategory?: string | null
          supplier_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      flights: {
        Row: {
          airline: string
          arrival_airport: string
          arrival_time: string
          cached_availability: Json | null
          created_at: string | null
          departure_airport: string
          departure_time: string
          flight_number: string
          id: string
          last_fetched: string | null
          price_data: Json | null
          updated_at: string | null
        }
        Insert: {
          airline: string
          arrival_airport: string
          arrival_time: string
          cached_availability?: Json | null
          created_at?: string | null
          departure_airport: string
          departure_time: string
          flight_number: string
          id?: string
          last_fetched?: string | null
          price_data?: Json | null
          updated_at?: string | null
        }
        Update: {
          airline?: string
          arrival_airport?: string
          arrival_time?: string
          cached_availability?: Json | null
          created_at?: string | null
          departure_airport?: string
          departure_time?: string
          flight_number?: string
          id?: string
          last_fetched?: string | null
          price_data?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fund_allocations: {
        Row: {
          agent_commission: number
          client_paid: number
          created_at: string | null
          escrow_status: string
          id: string
          item_type: string
          needs_review: boolean | null
          payment_id: string | null
          platform_fee: number
          quote_id: string | null
          quote_item_id: string
          source: string
          supplier_cost: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_commission?: number
          client_paid: number
          created_at?: string | null
          escrow_status?: string
          id?: string
          item_type: string
          needs_review?: boolean | null
          payment_id?: string | null
          platform_fee?: number
          quote_id?: string | null
          quote_item_id: string
          source: string
          supplier_cost: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_commission?: number
          client_paid?: number
          created_at?: string | null
          escrow_status?: string
          id?: string
          item_type?: string
          needs_review?: boolean | null
          payment_id?: string | null
          platform_fee?: number
          quote_id?: string | null
          quote_item_id?: string
          source?: string
          supplier_cost?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fund_allocations_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          amenities: Json | null
          cached_rates: Json | null
          created_at: string | null
          description: string | null
          hotel_code: string
          id: string
          images: Json | null
          last_fetched: string | null
          location: Json
          name: string
          rating: number | null
          updated_at: string | null
        }
        Insert: {
          amenities?: Json | null
          cached_rates?: Json | null
          created_at?: string | null
          description?: string | null
          hotel_code: string
          id?: string
          images?: Json | null
          last_fetched?: string | null
          location: Json
          name: string
          rating?: number | null
          updated_at?: string | null
        }
        Update: {
          amenities?: Json | null
          cached_rates?: Json | null
          created_at?: string | null
          description?: string | null
          hotel_code?: string
          id?: string
          images?: Json | null
          last_fetched?: string | null
          location?: Json
          name?: string
          rating?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number | null
          contact_id: string | null
          created_at: string | null
          currency: string | null
          customer_address: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          discount_amount: number | null
          due_date: string
          id: string
          invoice_number: string
          issue_date: string
          items: Json | null
          line_items: Json
          notes: string | null
          org_id: string
          overdue_at: string | null
          paid_amount: number | null
          paid_at: string | null
          paid_date: string | null
          payments: Json | null
          quote_id: string | null
          remaining_amount: number
          sent_at: string | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          tax_rate: number | null
          terms: string | null
          total: number
          updated_at: string | null
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          amount?: number | null
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount_amount?: number | null
          due_date: string
          id?: string
          invoice_number: string
          issue_date?: string
          items?: Json | null
          line_items?: Json
          notes?: string | null
          org_id: string
          overdue_at?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          paid_date?: string | null
          payments?: Json | null
          quote_id?: string | null
          remaining_amount: number
          sent_at?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          terms?: string | null
          total: number
          updated_at?: string | null
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          amount?: number | null
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount_amount?: number | null
          due_date?: string
          id?: string
          invoice_number?: string
          issue_date?: string
          items?: Json | null
          line_items?: Json
          notes?: string | null
          org_id?: string
          overdue_at?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          paid_date?: string | null
          payments?: Json | null
          quote_id?: string | null
          remaining_amount?: number
          sent_at?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          terms?: string | null
          total?: number
          updated_at?: string | null
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      org_memberships: {
        Row: {
          created_at: string | null
          id: string
          invite_expires_at: string | null
          invite_token: string | null
          invited_email: string | null
          org_id: string
          role: string
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_email?: string | null
          org_id: string
          role?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_email?: string | null
          org_id?: string
          role?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_id: string
          slug: string
          stripe_customer_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_id: string
          slug: string
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string
          slug?: string
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_id: string | null
          contact_id: string | null
          created_at: string | null
          currency: string | null
          id: string
          invoice_id: string | null
          metadata: Json | null
          org_id: string
          paid_at: string | null
          payment_date: string | null
          payment_method: string
          quote_id: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          org_id: string
          paid_at?: string | null
          payment_date?: string | null
          payment_method: string
          quote_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          org_id?: string
          paid_at?: string | null
          payment_date?: string | null
          payment_method?: string
          quote_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          commission_rate: number | null
          contact_id: string | null
          created_at: string | null
          currency: string | null
          id: string
          items: Json
          notes: string | null
          org_id: string
          payment_status: string | null
          quote_number: string
          remaining_balance: number | null
          status: string | null
          title: string
          total_amount: number
          total_paid: number | null
          travel_end_date: string | null
          travel_start_date: string | null
          updated_at: string | null
          user_id: string
          valid_until: string | null
          version: number
        }
        Insert: {
          commission_rate?: number | null
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          items: Json
          notes?: string | null
          org_id: string
          payment_status?: string | null
          quote_number: string
          remaining_balance?: number | null
          status?: string | null
          title: string
          total_amount: number
          total_paid?: number | null
          travel_end_date?: string | null
          travel_start_date?: string | null
          updated_at?: string | null
          user_id: string
          valid_until?: string | null
          version?: number
        }
        Update: {
          commission_rate?: number | null
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          items?: Json
          notes?: string | null
          org_id?: string
          payment_status?: string | null
          quote_number?: string
          remaining_balance?: number | null
          status?: string | null
          title?: string
          total_amount?: number
          total_paid?: number | null
          travel_end_date?: string | null
          travel_start_date?: string | null
          updated_at?: string | null
          user_id?: string
          valid_until?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rates: {
        Row: {
          base_price: number
          created_at: string | null
          currency: string
          description: string | null
          id: string
          is_active: boolean
          markup_type: string | null
          markup_value: number
          metadata: Json | null
          name: string
          provider: string | null
          type: string
          updated_at: string | null
          user_id: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          base_price: number
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          markup_type?: string | null
          markup_value?: number
          metadata?: Json | null
          name: string
          provider?: string | null
          type: string
          updated_at?: string | null
          user_id?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          base_price?: number
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          markup_type?: string | null
          markup_value?: number
          metadata?: Json | null
          name?: string
          provider?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          booking_notifications: boolean | null
          business_address: Json | null
          business_email: string | null
          business_logo_url: string | null
          business_name: string | null
          business_phone: string | null
          created_at: string | null
          currency: string
          date_format: string | null
          default_markup_percentage: number | null
          email_notifications: boolean | null
          id: string
          payment_reminders: boolean | null
          stripe_connect_account_id: string | null
          timezone: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          booking_notifications?: boolean | null
          business_address?: Json | null
          business_email?: string | null
          business_logo_url?: string | null
          business_name?: string | null
          business_phone?: string | null
          created_at?: string | null
          currency?: string
          date_format?: string | null
          default_markup_percentage?: number | null
          email_notifications?: boolean | null
          id?: string
          payment_reminders?: boolean | null
          stripe_connect_account_id?: string | null
          timezone?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          booking_notifications?: boolean | null
          business_address?: Json | null
          business_email?: string | null
          business_logo_url?: string | null
          business_name?: string | null
          business_phone?: string | null
          created_at?: string | null
          currency?: string
          date_format?: string | null
          default_markup_percentage?: number | null
          email_notifications?: boolean | null
          id?: string
          payment_reminders?: boolean | null
          stripe_connect_account_id?: string | null
          timezone?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at: string | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          org_id: string | null
          plan: string
          seat_count: number
          status: string
          stripe_customer_id: string
          stripe_price_id: string
          stripe_subscription_id: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cancel_at?: string | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          org_id?: string | null
          plan: string
          seat_count?: number
          status?: string
          stripe_customer_id: string
          stripe_price_id: string
          stripe_subscription_id: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cancel_at?: string | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          org_id?: string | null
          plan?: string
          seat_count?: number
          status?: string
          stripe_customer_id?: string
          stripe_price_id?: string
          stripe_subscription_id?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          assigned_to_name: string | null
          attachments: Json | null
          blocked_reason: string | null
          booking_id: string | null
          booking_item_id: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string | null
          customer_name: string | null
          description: string | null
          due_date: string | null
          id: string
          item_details: Json | null
          item_name: string | null
          item_type: string | null
          notes: string | null
          org_id: string
          priority: string | null
          quote_id: string | null
          quote_item_id: string | null
          status: string | null
          title: string
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          attachments?: Json | null
          blocked_reason?: string | null
          booking_id?: string | null
          booking_item_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          customer_name?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          item_details?: Json | null
          item_name?: string | null
          item_type?: string | null
          notes?: string | null
          org_id: string
          priority?: string | null
          quote_id?: string | null
          quote_item_id?: string | null
          status?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          attachments?: Json | null
          blocked_reason?: string | null
          booking_id?: string | null
          booking_item_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          customer_name?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          item_details?: Json | null
          item_name?: string | null
          item_type?: string | null
          notes?: string | null
          org_id?: string
          priority?: string | null
          quote_id?: string | null
          quote_item_id?: string | null
          status?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_booking_item_id_fkey"
            columns: ["booking_item_id"]
            isOneToOne: false
            referencedRelation: "booking_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          agent_id: string | null
          amount: number
          category: string | null
          commission_id: string | null
          created_at: string | null
          currency: string
          customer_id: string | null
          date: string | null
          description: string | null
          expense_id: string | null
          id: string
          invoice_id: string | null
          metadata: Json | null
          new_state: Json | null
          notes: string | null
          org_id: string | null
          payment_id: string | null
          performed_by: string | null
          previous_state: Json | null
          quote_id: string | null
          related_transactions: string[] | null
          status: string
          timestamp: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          amount: number
          category?: string | null
          commission_id?: string | null
          created_at?: string | null
          currency?: string
          customer_id?: string | null
          date?: string | null
          description?: string | null
          expense_id?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          new_state?: Json | null
          notes?: string | null
          org_id?: string | null
          payment_id?: string | null
          performed_by?: string | null
          previous_state?: Json | null
          quote_id?: string | null
          related_transactions?: string[] | null
          status?: string
          timestamp?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string | null
          amount?: number
          category?: string | null
          commission_id?: string | null
          created_at?: string | null
          currency?: string
          customer_id?: string | null
          date?: string | null
          description?: string | null
          expense_id?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          new_state?: Json | null
          notes?: string | null
          org_id?: string | null
          payment_id?: string | null
          performed_by?: string | null
          previous_state?: Json | null
          quote_id?: string | null
          related_transactions?: string[] | null
          status?: string
          timestamp?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          role: string | null
          stripe_customer_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          role?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          role?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_ai_query_contexts: { Args: never; Returns: number }
      get_user_org_id: { Args: { uid: string }; Returns: string }
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
