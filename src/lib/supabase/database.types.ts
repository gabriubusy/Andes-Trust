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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          animal_id: string | null
          created_at: string
          due_at: string
          farm_id: string
          id: string
          notified_at: string | null
          payload: Json
          source_id: string | null
          source_table: string | null
          status: Database["public"]["Enums"]["alert_status"]
          type: Database["public"]["Enums"]["alert_type"]
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          animal_id?: string | null
          created_at?: string
          due_at: string
          farm_id: string
          id?: string
          notified_at?: string | null
          payload?: Json
          source_id?: string | null
          source_table?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          type: Database["public"]["Enums"]["alert_type"]
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          animal_id?: string | null
          created_at?: string
          due_at?: string
          farm_id?: string
          id?: string
          notified_at?: string | null
          payload?: Json
          source_id?: string | null
          source_table?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          type?: Database["public"]["Enums"]["alert_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      animal_events: {
        Row: {
          animal_id: string
          created_at: string
          farm_id: string
          id: string
          notes: string | null
          occurred_at: string
          payload: Json
          performed_by: string | null
          type: Database["public"]["Enums"]["event_type"]
        }
        Insert: {
          animal_id: string
          created_at?: string
          farm_id: string
          id?: string
          notes?: string | null
          occurred_at?: string
          payload?: Json
          performed_by?: string | null
          type: Database["public"]["Enums"]["event_type"]
        }
        Update: {
          animal_id?: string
          created_at?: string
          farm_id?: string
          id?: string
          notes?: string | null
          occurred_at?: string
          payload?: Json
          performed_by?: string | null
          type?: Database["public"]["Enums"]["event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "animal_events_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_events_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_events_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      animal_group_members: {
        Row: {
          animal_id: string
          group_id: string
          joined_at: string
          left_at: string | null
        }
        Insert: {
          animal_id: string
          group_id: string
          joined_at?: string
          left_at?: string | null
        }
        Update: {
          animal_id?: string
          group_id?: string
          joined_at?: string
          left_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "animal_group_members_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "animal_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      animal_groups: {
        Row: {
          created_at: string
          farm_id: string
          id: string
          kind: string | null
          name: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          farm_id: string
          id?: string
          kind?: string | null
          name: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          farm_id?: string
          id?: string
          kind?: string | null
          name?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "animal_groups_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      animals: {
        Row: {
          acquired_at: string | null
          birth_date: string | null
          birth_weight_kg: number | null
          breed_id: string | null
          color: string | null
          created_at: string
          current_weight_kg: number | null
          farm_id: string
          father_id: string | null
          id: string
          metadata: Json
          mother_id: string | null
          name: string | null
          origin: string | null
          photo_url: string | null
          purpose: Database["public"]["Enums"]["animal_purpose"] | null
          removed_at: string | null
          sex: Database["public"]["Enums"]["animal_sex"]
          status: Database["public"]["Enums"]["animal_status"]
          tag: string
          updated_at: string
        }
        Insert: {
          acquired_at?: string | null
          birth_date?: string | null
          birth_weight_kg?: number | null
          breed_id?: string | null
          color?: string | null
          created_at?: string
          current_weight_kg?: number | null
          farm_id: string
          father_id?: string | null
          id?: string
          metadata?: Json
          mother_id?: string | null
          name?: string | null
          origin?: string | null
          photo_url?: string | null
          purpose?: Database["public"]["Enums"]["animal_purpose"] | null
          removed_at?: string | null
          sex: Database["public"]["Enums"]["animal_sex"]
          status?: Database["public"]["Enums"]["animal_status"]
          tag: string
          updated_at?: string
        }
        Update: {
          acquired_at?: string | null
          birth_date?: string | null
          birth_weight_kg?: number | null
          breed_id?: string | null
          color?: string | null
          created_at?: string
          current_weight_kg?: number | null
          farm_id?: string
          father_id?: string | null
          id?: string
          metadata?: Json
          mother_id?: string | null
          name?: string | null
          origin?: string | null
          photo_url?: string | null
          purpose?: Database["public"]["Enums"]["animal_purpose"] | null
          removed_at?: string | null
          sex?: Database["public"]["Enums"]["animal_sex"]
          status?: Database["public"]["Enums"]["animal_status"]
          tag?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "animals_breed_id_fkey"
            columns: ["breed_id"]
            isOneToOne: false
            referencedRelation: "breeds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_father_id_fkey"
            columns: ["father_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_mother_id_fkey"
            columns: ["mother_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          at: string
          diff: Json | null
          entity: string | null
          entity_id: string | null
          farm_id: string | null
          id: number
          profile_id: string | null
        }
        Insert: {
          action: string
          at?: string
          diff?: Json | null
          entity?: string | null
          entity_id?: string | null
          farm_id?: string | null
          id?: number
          profile_id?: string | null
        }
        Update: {
          action?: string
          at?: string
          diff?: Json | null
          entity?: string | null
          entity_id?: string | null
          farm_id?: string | null
          id?: number
          profile_id?: string | null
        }
        Relationships: []
      }
      blockchain_records: {
        Row: {
          anchored_at: string
          block_number: number | null
          contract_address: string | null
          created_by: string | null
          entity_id: string
          entity_type: string
          farm_id: string
          id: string
          network: Database["public"]["Enums"]["chain_network"]
          payload_hash: string
          tx_hash: string
        }
        Insert: {
          anchored_at?: string
          block_number?: number | null
          contract_address?: string | null
          created_by?: string | null
          entity_id: string
          entity_type: string
          farm_id: string
          id?: string
          network: Database["public"]["Enums"]["chain_network"]
          payload_hash: string
          tx_hash: string
        }
        Update: {
          anchored_at?: string
          block_number?: number | null
          contract_address?: string | null
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          farm_id?: string
          id?: string
          network?: Database["public"]["Enums"]["chain_network"]
          payload_hash?: string
          tx_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "blockchain_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blockchain_records_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      breeds: {
        Row: {
          id: string
          name: string
          purpose: Database["public"]["Enums"]["animal_purpose"] | null
          species: string
        }
        Insert: {
          id?: string
          name: string
          purpose?: Database["public"]["Enums"]["animal_purpose"] | null
          species?: string
        }
        Update: {
          id?: string
          name?: string
          purpose?: Database["public"]["Enums"]["animal_purpose"] | null
          species?: string
        }
        Relationships: []
      }
      buyers: {
        Row: {
          address: string | null
          contact: string | null
          created_at: string
          email: string | null
          farm_id: string
          id: string
          legal_id: string | null
          name: string
          notes: string | null
          phone: string | null
        }
        Insert: {
          address?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          farm_id: string
          id?: string
          legal_id?: string | null
          name: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          address?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          farm_id?: string
          id?: string
          legal_id?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyers_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      certifications: {
        Row: {
          animal_id: string | null
          created_at: string
          document_url: string | null
          farm_id: string
          id: string
          issued_at: string | null
          issuer: string | null
          metadata: Json
          type: Database["public"]["Enums"]["cert_type"]
          valid_until: string | null
        }
        Insert: {
          animal_id?: string | null
          created_at?: string
          document_url?: string | null
          farm_id: string
          id?: string
          issued_at?: string | null
          issuer?: string | null
          metadata?: Json
          type: Database["public"]["Enums"]["cert_type"]
          valid_until?: string | null
        }
        Update: {
          animal_id?: string | null
          created_at?: string
          document_url?: string | null
          farm_id?: string
          id?: string
          issued_at?: string | null
          issuer?: string | null
          metadata?: Json
          type?: Database["public"]["Enums"]["cert_type"]
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certifications_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certifications_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      diseases_catalog: {
        Row: {
          icd: string | null
          id: string
          name: string
        }
        Insert: {
          icd?: string | null
          id?: string
          name: string
        }
        Update: {
          icd?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string
          farm_id: string
          filename: string | null
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type: string
          farm_id: string
          filename?: string | null
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          farm_id?: string
          filename?: string | null
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_members: {
        Row: {
          created_at: string
          farm_id: string
          profile_id: string
          role: Database["public"]["Enums"]["farm_role"]
        }
        Insert: {
          created_at?: string
          farm_id: string
          profile_id: string
          role?: Database["public"]["Enums"]["farm_role"]
        }
        Update: {
          created_at?: string
          farm_id?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["farm_role"]
        }
        Relationships: [
          {
            foreignKeyName: "farm_members_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farm_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      farms: {
        Row: {
          address: string | null
          country: string | null
          created_at: string
          id: string
          legal_id: string | null
          location: Json | null
          logo_url: string | null
          name: string
          owner_profile_id: string
          region: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          country?: string | null
          created_at?: string
          id?: string
          legal_id?: string | null
          location?: Json | null
          logo_url?: string | null
          name: string
          owner_profile_id: string
          region?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          country?: string | null
          created_at?: string
          id?: string
          legal_id?: string | null
          location?: Json | null
          logo_url?: string | null
          name?: string
          owner_profile_id?: string
          region?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "farms_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_items: {
        Row: {
          farm_id: string
          id: string
          kind: string | null
          name: string
          unit: string | null
        }
        Insert: {
          farm_id: string
          id?: string
          kind?: string | null
          name: string
          unit?: string | null
        }
        Update: {
          farm_id?: string
          id?: string
          kind?: string | null
          name?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_items_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_logs: {
        Row: {
          animal_id: string | null
          farm_id: string
          fed_at: string
          feed_id: string | null
          group_id: string | null
          id: string
          quantity: number
          recorded_by: string | null
        }
        Insert: {
          animal_id?: string | null
          farm_id: string
          fed_at?: string
          feed_id?: string | null
          group_id?: string | null
          id?: string
          quantity: number
          recorded_by?: string | null
        }
        Update: {
          animal_id?: string | null
          farm_id?: string
          fed_at?: string
          feed_id?: string | null
          group_id?: string | null
          id?: string
          quantity?: number
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_logs_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_logs_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_logs_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "feed_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_logs_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "animal_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_logs_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inseminations: {
        Row: {
          animal_id: string
          farm_id: string
          id: string
          method: string | null
          notes: string | null
          performed_at: string
          performed_by: string | null
          sire_external: string | null
          sire_id: string | null
        }
        Insert: {
          animal_id: string
          farm_id: string
          id?: string
          method?: string | null
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
          sire_external?: string | null
          sire_id?: string | null
        }
        Update: {
          animal_id?: string
          farm_id?: string
          id?: string
          method?: string | null
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
          sire_external?: string | null
          sire_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inseminations_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inseminations_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inseminations_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inseminations_sire_id_fkey"
            columns: ["sire_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      milk_deliveries: {
        Row: {
          buyer_id: string | null
          currency: string | null
          delivered_at: string
          farm_id: string
          id: string
          invoice_number: string | null
          liters: number
          notes: string | null
          price_per_liter: number | null
        }
        Insert: {
          buyer_id?: string | null
          currency?: string | null
          delivered_at?: string
          farm_id: string
          id?: string
          invoice_number?: string | null
          liters: number
          notes?: string | null
          price_per_liter?: number | null
        }
        Update: {
          buyer_id?: string | null
          currency?: string | null
          delivered_at?: string
          farm_id?: string
          id?: string
          invoice_number?: string | null
          liters?: number
          notes?: string | null
          price_per_liter?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "milk_deliveries_buyer_fk"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milk_deliveries_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      milk_records: {
        Row: {
          animal_id: string | null
          created_at: string
          farm_id: string
          fat_pct: number | null
          id: string
          liters: number
          notes: string | null
          protein_pct: number | null
          recorded_by: string | null
          recorded_on: string
          scc: number | null
          shift: Database["public"]["Enums"]["milk_shift"]
          temperature_c: number | null
        }
        Insert: {
          animal_id?: string | null
          created_at?: string
          farm_id: string
          fat_pct?: number | null
          id?: string
          liters: number
          notes?: string | null
          protein_pct?: number | null
          recorded_by?: string | null
          recorded_on: string
          scc?: number | null
          shift: Database["public"]["Enums"]["milk_shift"]
          temperature_c?: number | null
        }
        Update: {
          animal_id?: string | null
          created_at?: string
          farm_id?: string
          fat_pct?: number | null
          id?: string
          liters?: number
          notes?: string | null
          protein_pct?: number | null
          recorded_by?: string | null
          recorded_on?: string
          scc?: number | null
          shift?: Database["public"]["Enums"]["milk_shift"]
          temperature_c?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "milk_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milk_records_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milk_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pregnancies: {
        Row: {
          animal_id: string
          calving_event_id: string | null
          confirmed_at: string | null
          expected_due_at: string | null
          farm_id: string
          id: string
          insemination_id: string | null
          notes: string | null
          result: string | null
        }
        Insert: {
          animal_id: string
          calving_event_id?: string | null
          confirmed_at?: string | null
          expected_due_at?: string | null
          farm_id: string
          id?: string
          insemination_id?: string | null
          notes?: string | null
          result?: string | null
        }
        Update: {
          animal_id?: string
          calving_event_id?: string | null
          confirmed_at?: string | null
          expected_due_at?: string | null
          farm_id?: string
          id?: string
          insemination_id?: string | null
          notes?: string | null
          result?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pregnancies_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancies_calving_event_id_fkey"
            columns: ["calving_event_id"]
            isOneToOne: false
            referencedRelation: "animal_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancies_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancies_insemination_id_fkey"
            columns: ["insemination_id"]
            isOneToOne: false
            referencedRelation: "inseminations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_platform_admin: boolean
          phone: string | null
          privy_did: string
          updated_at: string
          wallet_address: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_platform_admin?: boolean
          phone?: string | null
          privy_did: string
          updated_at?: string
          wallet_address?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_platform_admin?: boolean
          phone?: string | null
          privy_did?: string
          updated_at?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          profile_id: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          profile_id: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          profile_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_reports: {
        Row: {
          animal_ids: string[]
          created_at: string
          date_from: string | null
          date_to: string | null
          farm_id: string
          generated_by: string | null
          id: string
          kind: string
          payload_hash: string | null
          storage_path: string | null
        }
        Insert: {
          animal_ids?: string[]
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          farm_id: string
          generated_by?: string | null
          id?: string
          kind?: string
          payload_hash?: string | null
          storage_path?: string | null
        }
        Update: {
          animal_ids?: string[]
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          farm_id?: string
          generated_by?: string | null
          id?: string
          kind?: string
          payload_hash?: string | null
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_reports_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulatory_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          animal_id: string | null
          description: string | null
          id: string
          quantity: number
          sale_id: string
          subtotal: number | null
          unit_price: number
          weight_kg: number | null
        }
        Insert: {
          animal_id?: string | null
          description?: string | null
          id?: string
          quantity?: number
          sale_id: string
          subtotal?: number | null
          unit_price?: number
          weight_kg?: number | null
        }
        Update: {
          animal_id?: string | null
          description?: string | null
          id?: string
          quantity?: number
          sale_id?: string
          subtotal?: number | null
          unit_price?: number
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          buyer_id: string | null
          conditions_hash: string | null
          created_at: string
          created_by: string | null
          currency: string
          escrow_amount: number | null
          escrow_buyer: string | null
          escrow_create_tx: string | null
          escrow_deadline: string | null
          escrow_fund_tx: string | null
          escrow_refund_tx: string | null
          escrow_release_tx: string | null
          escrow_seller: string | null
          escrow_status: Database["public"]["Enums"]["escrow_status"]
          escrow_token: string | null
          farm_id: string
          id: string
          invoice_number: string | null
          notes: string | null
          payload_hash: string | null
          payment_method: string | null
          sold_at: string
          status: Database["public"]["Enums"]["sale_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          buyer_id?: string | null
          conditions_hash?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          escrow_amount?: number | null
          escrow_buyer?: string | null
          escrow_create_tx?: string | null
          escrow_deadline?: string | null
          escrow_fund_tx?: string | null
          escrow_refund_tx?: string | null
          escrow_release_tx?: string | null
          escrow_seller?: string | null
          escrow_status?: Database["public"]["Enums"]["escrow_status"]
          escrow_token?: string | null
          farm_id: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payload_hash?: string | null
          payment_method?: string | null
          sold_at?: string
          status?: Database["public"]["Enums"]["sale_status"]
          total_amount?: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string | null
          conditions_hash?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          escrow_amount?: number | null
          escrow_buyer?: string | null
          escrow_create_tx?: string | null
          escrow_deadline?: string | null
          escrow_fund_tx?: string | null
          escrow_refund_tx?: string | null
          escrow_release_tx?: string | null
          escrow_seller?: string | null
          escrow_status?: Database["public"]["Enums"]["escrow_status"]
          escrow_token?: string | null
          farm_id?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payload_hash?: string | null
          payment_method?: string | null
          sold_at?: string
          status?: Database["public"]["Enums"]["sale_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      signatures: {
        Row: {
          entity_id: string
          entity_type: string
          farm_id: string
          id: string
          payload_hash: string
          signature: string
          signed_at: string
          signer_address: string
          signer_profile: string | null
        }
        Insert: {
          entity_id: string
          entity_type: string
          farm_id: string
          id?: string
          payload_hash: string
          signature: string
          signed_at?: string
          signer_address: string
          signer_profile?: string | null
        }
        Update: {
          entity_id?: string
          entity_type?: string
          farm_id?: string
          id?: string
          payload_hash?: string
          signature?: string
          signed_at?: string
          signer_address?: string
          signer_profile?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signatures_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signatures_signer_profile_fkey"
            columns: ["signer_profile"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact: string | null
          email: string | null
          farm_id: string
          id: string
          kind: string | null
          name: string
          notes: string | null
          phone: string | null
        }
        Insert: {
          contact?: string | null
          email?: string | null
          farm_id: string
          id?: string
          kind?: string | null
          name: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          contact?: string | null
          email?: string | null
          farm_id?: string
          id?: string
          kind?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      traceability_tokens: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          farm_id: string
          id: string
          is_active: boolean
          slug: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          farm_id: string
          id?: string
          is_active?: boolean
          slug?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          farm_id?: string
          id?: string
          is_active?: boolean
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "traceability_tokens_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      treatments: {
        Row: {
          animal_id: string
          disease_id: string | null
          dose: string | null
          ended_at: string | null
          farm_id: string
          id: string
          notes: string | null
          prescribed_by: string | null
          started_at: string
          treatment_id: string | null
          withdrawal_until_meat: string | null
          withdrawal_until_milk: string | null
        }
        Insert: {
          animal_id: string
          disease_id?: string | null
          dose?: string | null
          ended_at?: string | null
          farm_id: string
          id?: string
          notes?: string | null
          prescribed_by?: string | null
          started_at?: string
          treatment_id?: string | null
          withdrawal_until_meat?: string | null
          withdrawal_until_milk?: string | null
        }
        Update: {
          animal_id?: string
          disease_id?: string | null
          dose?: string | null
          ended_at?: string | null
          farm_id?: string
          id?: string
          notes?: string | null
          prescribed_by?: string | null
          started_at?: string
          treatment_id?: string | null
          withdrawal_until_meat?: string | null
          withdrawal_until_milk?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_disease_id_fkey"
            columns: ["disease_id"]
            isOneToOne: false
            referencedRelation: "diseases_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_prescribed_by_fkey"
            columns: ["prescribed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      treatments_catalog: {
        Row: {
          active_ingredient: string | null
          dose: string | null
          id: string
          kind: string | null
          name: string
          notes: string | null
          route: string | null
          withdrawal_meat_days: number | null
          withdrawal_milk_days: number | null
        }
        Insert: {
          active_ingredient?: string | null
          dose?: string | null
          id?: string
          kind?: string | null
          name: string
          notes?: string | null
          route?: string | null
          withdrawal_meat_days?: number | null
          withdrawal_milk_days?: number | null
        }
        Update: {
          active_ingredient?: string | null
          dose?: string | null
          id?: string
          kind?: string | null
          name?: string
          notes?: string | null
          route?: string | null
          withdrawal_meat_days?: number | null
          withdrawal_milk_days?: number | null
        }
        Relationships: []
      }
      vaccinations: {
        Row: {
          animal_id: string
          applied_at: string
          applied_by: string | null
          batch_number: string | null
          dose_ml: number | null
          farm_id: string
          id: string
          next_due_at: string | null
          notes: string | null
          vaccine_id: string | null
        }
        Insert: {
          animal_id: string
          applied_at?: string
          applied_by?: string | null
          batch_number?: string | null
          dose_ml?: number | null
          farm_id: string
          id?: string
          next_due_at?: string | null
          notes?: string | null
          vaccine_id?: string | null
        }
        Update: {
          animal_id?: string
          applied_at?: string
          applied_by?: string | null
          batch_number?: string | null
          dose_ml?: number | null
          farm_id?: string
          id?: string
          next_due_at?: string | null
          notes?: string | null
          vaccine_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vaccinations_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccinations_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccinations_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccinations_vaccine_id_fkey"
            columns: ["vaccine_id"]
            isOneToOne: false
            referencedRelation: "vaccines_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccines_catalog: {
        Row: {
          booster_days: number | null
          disease: string | null
          dose_ml: number | null
          id: string
          manufacturer: string | null
          name: string
          notes: string | null
          route: string | null
          withdrawal_days: number | null
        }
        Insert: {
          booster_days?: number | null
          disease?: string | null
          dose_ml?: number | null
          id?: string
          manufacturer?: string | null
          name: string
          notes?: string | null
          route?: string | null
          withdrawal_days?: number | null
        }
        Update: {
          booster_days?: number | null
          disease?: string | null
          dose_ml?: number | null
          id?: string
          manufacturer?: string | null
          name?: string
          notes?: string | null
          route?: string | null
          withdrawal_days?: number | null
        }
        Relationships: []
      }
      weighings: {
        Row: {
          animal_id: string
          farm_id: string
          id: string
          measured_at: string
          measured_by: string | null
          notes: string | null
          weight_kg: number
        }
        Insert: {
          animal_id: string
          farm_id: string
          id?: string
          measured_at?: string
          measured_by?: string | null
          notes?: string | null
          weight_kg: number
        }
        Update: {
          animal_id?: string
          farm_id?: string
          id?: string
          measured_at?: string
          measured_by?: string | null
          notes?: string | null
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "weighings_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weighings_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weighings_measured_by_fkey"
            columns: ["measured_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_animal_full_history: {
        Row: {
          animal_id: string | null
          detail: Json | null
          farm_id: string | null
          kind: string | null
          name: string | null
          occurred_at: string | null
          tag: string | null
        }
        Relationships: []
      }
      v_pending_alerts: {
        Row: {
          animal_id: string | null
          due_at: string | null
          farm_id: string | null
          payload: Json | null
          source_id: string | null
          source_table: string | null
          type: Database["public"]["Enums"]["alert_type"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      close_stale_alerts: { Args: never; Returns: number }
      current_privy_did: { Args: never; Returns: string }
      current_profile_id: { Args: never; Returns: string }
      generate_alerts: { Args: never; Returns: number }
      is_any_farm_member: { Args: never; Returns: boolean }
      is_farm_member: {
        Args: { _farm: string; _roles?: string[] }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      alert_channel: "email" | "push" | "in_app"
      alert_status: "open" | "acknowledged" | "dismissed" | "resolved"
      alert_type:
        | "vaccination_due"
        | "treatment_withdrawal"
        | "weighing_due"
        | "custom"
      animal_purpose: "dairy" | "beef" | "dual" | "breeding"
      animal_sex: "male" | "female"
      animal_status: "active" | "sold" | "dead" | "lost" | "slaughtered"
      cert_type:
        | "origin"
        | "health"
        | "organic"
        | "welfare"
        | "export"
        | "other"
      chain_network: "polygon" | "ethereum" | "base" | "arbitrum" | "other"
      escrow_status:
        | "none"
        | "created"
        | "funded"
        | "released"
        | "refunded"
        | "failed"
      event_type:
        | "birth"
        | "weighing"
        | "vaccination"
        | "treatment"
        | "deworming"
        | "insemination"
        | "pregnancy_check"
        | "calving"
        | "transfer"
        | "sale"
        | "death"
        | "slaughter"
        | "note"
      farm_role: "owner" | "admin" | "operator" | "vet" | "viewer"
      milk_shift: "am" | "pm" | "midday"
      sale_status: "draft" | "confirmed" | "paid" | "cancelled"
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
    Enums: {
      alert_channel: ["email", "push", "in_app"],
      alert_status: ["open", "acknowledged", "dismissed", "resolved"],
      alert_type: [
        "vaccination_due",
        "treatment_withdrawal",
        "weighing_due",
        "custom",
      ],
      animal_purpose: ["dairy", "beef", "dual", "breeding"],
      animal_sex: ["male", "female"],
      animal_status: ["active", "sold", "dead", "lost", "slaughtered"],
      cert_type: ["origin", "health", "organic", "welfare", "export", "other"],
      chain_network: ["polygon", "ethereum", "base", "arbitrum", "other"],
      escrow_status: [
        "none",
        "created",
        "funded",
        "released",
        "refunded",
        "failed",
      ],
      event_type: [
        "birth",
        "weighing",
        "vaccination",
        "treatment",
        "deworming",
        "insemination",
        "pregnancy_check",
        "calving",
        "transfer",
        "sale",
        "death",
        "slaughter",
        "note",
      ],
      farm_role: ["owner", "admin", "operator", "vet", "viewer"],
      milk_shift: ["am", "pm", "midday"],
      sale_status: ["draft", "confirmed", "paid", "cancelled"],
    },
  },
} as const
