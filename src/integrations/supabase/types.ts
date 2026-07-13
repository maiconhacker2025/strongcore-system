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
      beneficiarios: {
        Row: {
          agua: string | null
          alergia: boolean | null
          ano_anterior: string | null
          ar_condicionado: string | null
          armario_cozinha: string | null
          assistente_social: string | null
          ativo: boolean
          bairro: string | null
          cama_casal: string | null
          cama_filhos: string | null
          celular: string | null
          cep: string | null
          circunscricao: string | null
          classe_risco: string | null
          codigo: number | null
          computador: string | null
          cpf: string | null
          created_at: string
          data_desligamento_01: string | null
          data_desligamento_02: string | null
          data_desligamento_03: string | null
          data_ingresso_01: string | null
          data_ingresso_02: string | null
          data_ingresso_03: string | null
          data_nasc_mae_2: string | null
          data_nascimento: string | null
          distrito: string | null
          email: string | null
          energia_eletrica: string | null
          escola: string | null
          escolaridade: string | null
          escolaridade_mae_2: string | null
          escolaridade_pai: string | null
          esgoto: string | null
          estado: string | null
          filtro: string | null
          fogao: string | null
          freezer: string | null
          genero: string | null
          guarda_roupas: string | null
          id: string
          internet: string | null
          lixo: string | null
          louca_geral: string | null
          maq_lavar: string | null
          medicacao: boolean | null
          micro_ondas: string | null
          mora_com: string | null
          moveis_estofados: string | null
          nasc_mae: string | null
          nasc_pai: string | null
          nome: string
          nome_mae: string | null
          nome_mae_2: string | null
          nome_medico: string | null
          nome_pai: string | null
          nome_responsavel: string | null
          num_folha: string | null
          num_livro: string | null
          num_termo: string | null
          numero_comodos: string | null
          numero_irmaos: number | null
          observacoes: string | null
          pais: string | null
          possui_banheiro: string | null
          possui_beneficios: string | null
          possui_dificuldades: string | null
          possui_geladeira: string | null
          profissao_mae: string | null
          profissao_pai: string | null
          psicologa: string | null
          renda: string | null
          reside_em: string | null
          residencia: string | null
          residencial: string | null
          responsavel: string | null
          rg: string | null
          roupa_cama: string | null
          rua: string | null
          som: string | null
          tel_emergencia_01: string | null
          tel_emergencia_02: string | null
          tel_medico: string | null
          tel_responsavel: string | null
          tenis_atividades: string | null
          trabalha_mae: string | null
          trabalha_mae_2: string | null
          trabalha_pai: string | null
          transporte_coletivo: string | null
          turno: string | null
          tv: string | null
          updated_at: string
          ventilador: string | null
          whatsapp: string | null
        }
        Insert: {
          agua?: string | null
          alergia?: boolean | null
          ano_anterior?: string | null
          ar_condicionado?: string | null
          armario_cozinha?: string | null
          assistente_social?: string | null
          ativo?: boolean
          bairro?: string | null
          cama_casal?: string | null
          cama_filhos?: string | null
          celular?: string | null
          cep?: string | null
          circunscricao?: string | null
          classe_risco?: string | null
          codigo?: number | null
          computador?: string | null
          cpf?: string | null
          created_at?: string
          data_desligamento_01?: string | null
          data_desligamento_02?: string | null
          data_desligamento_03?: string | null
          data_ingresso_01?: string | null
          data_ingresso_02?: string | null
          data_ingresso_03?: string | null
          data_nasc_mae_2?: string | null
          data_nascimento?: string | null
          distrito?: string | null
          email?: string | null
          energia_eletrica?: string | null
          escola?: string | null
          escolaridade?: string | null
          escolaridade_mae_2?: string | null
          escolaridade_pai?: string | null
          esgoto?: string | null
          estado?: string | null
          filtro?: string | null
          fogao?: string | null
          freezer?: string | null
          genero?: string | null
          guarda_roupas?: string | null
          id?: string
          internet?: string | null
          lixo?: string | null
          louca_geral?: string | null
          maq_lavar?: string | null
          medicacao?: boolean | null
          micro_ondas?: string | null
          mora_com?: string | null
          moveis_estofados?: string | null
          nasc_mae?: string | null
          nasc_pai?: string | null
          nome: string
          nome_mae?: string | null
          nome_mae_2?: string | null
          nome_medico?: string | null
          nome_pai?: string | null
          nome_responsavel?: string | null
          num_folha?: string | null
          num_livro?: string | null
          num_termo?: string | null
          numero_comodos?: string | null
          numero_irmaos?: number | null
          observacoes?: string | null
          pais?: string | null
          possui_banheiro?: string | null
          possui_beneficios?: string | null
          possui_dificuldades?: string | null
          possui_geladeira?: string | null
          profissao_mae?: string | null
          profissao_pai?: string | null
          psicologa?: string | null
          renda?: string | null
          reside_em?: string | null
          residencia?: string | null
          residencial?: string | null
          responsavel?: string | null
          rg?: string | null
          roupa_cama?: string | null
          rua?: string | null
          som?: string | null
          tel_emergencia_01?: string | null
          tel_emergencia_02?: string | null
          tel_medico?: string | null
          tel_responsavel?: string | null
          tenis_atividades?: string | null
          trabalha_mae?: string | null
          trabalha_mae_2?: string | null
          trabalha_pai?: string | null
          transporte_coletivo?: string | null
          turno?: string | null
          tv?: string | null
          updated_at?: string
          ventilador?: string | null
          whatsapp?: string | null
        }
        Update: {
          agua?: string | null
          alergia?: boolean | null
          ano_anterior?: string | null
          ar_condicionado?: string | null
          armario_cozinha?: string | null
          assistente_social?: string | null
          ativo?: boolean
          bairro?: string | null
          cama_casal?: string | null
          cama_filhos?: string | null
          celular?: string | null
          cep?: string | null
          circunscricao?: string | null
          classe_risco?: string | null
          codigo?: number | null
          computador?: string | null
          cpf?: string | null
          created_at?: string
          data_desligamento_01?: string | null
          data_desligamento_02?: string | null
          data_desligamento_03?: string | null
          data_ingresso_01?: string | null
          data_ingresso_02?: string | null
          data_ingresso_03?: string | null
          data_nasc_mae_2?: string | null
          data_nascimento?: string | null
          distrito?: string | null
          email?: string | null
          energia_eletrica?: string | null
          escola?: string | null
          escolaridade?: string | null
          escolaridade_mae_2?: string | null
          escolaridade_pai?: string | null
          esgoto?: string | null
          estado?: string | null
          filtro?: string | null
          fogao?: string | null
          freezer?: string | null
          genero?: string | null
          guarda_roupas?: string | null
          id?: string
          internet?: string | null
          lixo?: string | null
          louca_geral?: string | null
          maq_lavar?: string | null
          medicacao?: boolean | null
          micro_ondas?: string | null
          mora_com?: string | null
          moveis_estofados?: string | null
          nasc_mae?: string | null
          nasc_pai?: string | null
          nome?: string
          nome_mae?: string | null
          nome_mae_2?: string | null
          nome_medico?: string | null
          nome_pai?: string | null
          nome_responsavel?: string | null
          num_folha?: string | null
          num_livro?: string | null
          num_termo?: string | null
          numero_comodos?: string | null
          numero_irmaos?: number | null
          observacoes?: string | null
          pais?: string | null
          possui_banheiro?: string | null
          possui_beneficios?: string | null
          possui_dificuldades?: string | null
          possui_geladeira?: string | null
          profissao_mae?: string | null
          profissao_pai?: string | null
          psicologa?: string | null
          renda?: string | null
          reside_em?: string | null
          residencia?: string | null
          residencial?: string | null
          responsavel?: string | null
          rg?: string | null
          roupa_cama?: string | null
          rua?: string | null
          som?: string | null
          tel_emergencia_01?: string | null
          tel_emergencia_02?: string | null
          tel_medico?: string | null
          tel_responsavel?: string | null
          tenis_atividades?: string | null
          trabalha_mae?: string | null
          trabalha_mae_2?: string | null
          trabalha_pai?: string | null
          transporte_coletivo?: string | null
          turno?: string | null
          tv?: string | null
          updated_at?: string
          ventilador?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      report_logs: {
        Row: {
          created_at: string
          export_format: string | null
          filters: Json | null
          id: string
          kind: string
          question: string | null
          row_count: number | null
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          export_format?: string | null
          filters?: Json | null
          id?: string
          kind: string
          question?: string | null
          row_count?: number | null
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          export_format?: string | null
          filters?: Json | null
          id?: string
          kind?: string
          question?: string | null
          row_count?: number | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      report_settings: {
        Row: {
          ai_daily_limit: number
          ai_enabled: boolean
          id: number
          updated_at: string
        }
        Insert: {
          ai_daily_limit?: number
          ai_enabled?: boolean
          id?: number
          updated_at?: string
        }
        Update: {
          ai_daily_limit?: number
          ai_enabled?: boolean
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      report_views: {
        Row: {
          created_at: string
          filters: Json
          id: string
          name: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          name: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          template_id?: string | null
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
