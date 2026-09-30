export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      audio_variants: {
        Row: {
          active: boolean;
          audio_metadata: NonNullable<Json>;
          format: string;
          id: string;
          model_id: string;
          model_metadata: NonNullable<Json>;
          phrase_id: string;
          provenance: NonNullable<Json>;
          sha256: string;
          slug: string;
          storage_path: string;
          voice_id: string;
          voice_label: string;
          word_timings: NonNullable<Json>;
        };
        Insert: {
          active?: boolean;
          audio_metadata: NonNullable<Json>;
          format: string;
          id: string;
          model_id: string;
          model_metadata: NonNullable<Json>;
          phrase_id: string;
          provenance: NonNullable<Json>;
          sha256: string;
          slug: string;
          storage_path: string;
          voice_id: string;
          voice_label: string;
          word_timings?: NonNullable<Json>;
        };
        Update: {
          active?: boolean;
          audio_metadata?: NonNullable<Json>;
          format?: string;
          id?: string;
          model_id?: string;
          model_metadata?: NonNullable<Json>;
          phrase_id?: string;
          provenance?: NonNullable<Json>;
          sha256?: string;
          slug?: string;
          storage_path?: string;
          voice_id?: string;
          voice_label?: string;
          word_timings?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "audio_variants_phrase_id_fkey";
            columns: ["phrase_id"];
            isOneToOne: false;
            referencedRelation: "phrases";
            referencedColumns: ["id"];
          },
        ];
      };
      phrases: {
        Row: {
          category: string;
          id: string;
          playlist_id: string;
          published: boolean;
          slug: string;
          sort_order: number;
          text: string;
        };
        Insert: {
          category: string;
          id: string;
          playlist_id: string;
          published?: boolean;
          slug: string;
          sort_order: number;
          text: string;
        };
        Update: {
          category?: string;
          id?: string;
          playlist_id?: string;
          published?: boolean;
          slug?: string;
          sort_order?: number;
          text?: string;
        };
        Relationships: [
          {
            foreignKeyName: "phrases_playlist_id_fkey";
            columns: ["playlist_id"];
            isOneToOne: false;
            referencedRelation: "playlists";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_metrics: {
        Row: {
          count: number;
          day: string;
          metric: string;
        };
        Insert: {
          count?: number;
          day: string;
          metric: string;
        };
        Update: {
          count?: number;
          day?: string;
          metric?: string;
        };
        Relationships: [];
      };
      playlist_completions: {
        Row: {
          completed_at: string;
          playlist_id: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string;
          playlist_id: string;
          user_id: string;
        };
        Update: {
          completed_at?: string;
          playlist_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "playlist_completions_playlist_id_fkey";
            columns: ["playlist_id"];
            isOneToOne: false;
            referencedRelation: "playlists";
            referencedColumns: ["id"];
          },
        ];
      };
      playlists: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          published: boolean;
          slug: string;
          sort_order: number;
          title: string;
        };
        Insert: {
          created_at?: string;
          description?: string;
          id: string;
          published?: boolean;
          slug: string;
          sort_order: number;
          title: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          published?: boolean;
          slug?: string;
          sort_order?: number;
          title?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      increment_platform_metric: { Args: { metric_name: string }; Returns: undefined };
      record_practice_access: { Args: Record<PropertyKey, never>; Returns: undefined };
      valid_word_timings: { Args: { timings: Json }; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
