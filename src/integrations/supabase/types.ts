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
      atividade_historico: {
        Row: {
          acao: string
          autor: string | null
          beneficiario_id: string | null
          created_at: string
          descricao: string
          detalhes: Json | null
          entidade: string
          entidade_id: string | null
          id: string
        }
        Insert: {
          acao: string
          autor?: string | null
          beneficiario_id?: string | null
          created_at?: string
          descricao: string
          detalhes?: Json | null
          entidade: string
          entidade_id?: string | null
          id?: string
        }
        Update: {
          acao?: string
          autor?: string | null
          beneficiario_id?: string | null
          created_at?: string
          descricao?: string
          detalhes?: Json | null
          entidade?: string
          entidade_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividade_historico_beneficiario_id_fkey"
            columns: ["beneficiario_id"]
            isOneToOne: false
            referencedRelation: "beneficiarios"
            referencedColumns: ["id"]
          },
        ]
      }
      aulas: {
        Row: {
          assinatura: string | null
          conteudo: string | null
          created_at: string
          data: string
          educador: string | null
          fotos: string[]
          horario_fim: string | null
          horario_inicio: string | null
          id: string
          observacoes: string | null
          turma_id: string
          updated_at: string
        }
        Insert: {
          assinatura?: string | null
          conteudo?: string | null
          created_at?: string
          data?: string
          educador?: string | null
          fotos?: string[]
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          observacoes?: string | null
          turma_id: string
          updated_at?: string
        }
        Update: {
          assinatura?: string | null
          conteudo?: string | null
          created_at?: string
          data?: string
          educador?: string | null
          fotos?: string[]
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          observacoes?: string | null
          turma_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aulas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes: {
        Row: {
          beneficiario_id: string
          comportamento: number | null
          comprometimento: number | null
          comunicacao: number | null
          coordenacao_motora: number | null
          created_at: string
          criatividade: number | null
          data: string
          desenvolvimento: number | null
          disciplina: number | null
          educador: string | null
          id: string
          interacao: number | null
          observacoes: string | null
          participacao: number | null
          plano_evolucao: string | null
          pontualidade: number | null
          proxima_avaliacao: string | null
          socializacao: number | null
          trabalho_equipe: number | null
          turma_id: string | null
          updated_at: string
        }
        Insert: {
          beneficiario_id: string
          comportamento?: number | null
          comprometimento?: number | null
          comunicacao?: number | null
          coordenacao_motora?: number | null
          created_at?: string
          criatividade?: number | null
          data?: string
          desenvolvimento?: number | null
          disciplina?: number | null
          educador?: string | null
          id?: string
          interacao?: number | null
          observacoes?: string | null
          participacao?: number | null
          plano_evolucao?: string | null
          pontualidade?: number | null
          proxima_avaliacao?: string | null
          socializacao?: number | null
          trabalho_equipe?: number | null
          turma_id?: string | null
          updated_at?: string
        }
        Update: {
          beneficiario_id?: string
          comportamento?: number | null
          comprometimento?: number | null
          comunicacao?: number | null
          coordenacao_motora?: number | null
          created_at?: string
          criatividade?: number | null
          data?: string
          desenvolvimento?: number | null
          disciplina?: number | null
          educador?: string | null
          id?: string
          interacao?: number | null
          observacoes?: string | null
          participacao?: number | null
          plano_evolucao?: string | null
          pontualidade?: number | null
          proxima_avaliacao?: string | null
          socializacao?: number | null
          trabalho_equipe?: number | null
          turma_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_beneficiario_id_fkey"
            columns: ["beneficiario_id"]
            isOneToOne: false
            referencedRelation: "beneficiarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiario_arquivos: {
        Row: {
          beneficiario_id: string
          categoria: string
          created_at: string
          id: string
          mime: string | null
          nome: string
          path: string
          tamanho: number | null
        }
        Insert: {
          beneficiario_id: string
          categoria?: string
          created_at?: string
          id?: string
          mime?: string | null
          nome: string
          path: string
          tamanho?: number | null
        }
        Update: {
          beneficiario_id?: string
          categoria?: string
          created_at?: string
          id?: string
          mime?: string | null
          nome?: string
          path?: string
          tamanho?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficiario_arquivos_beneficiario_id_fkey"
            columns: ["beneficiario_id"]
            isOneToOne: false
            referencedRelation: "beneficiarios"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiario_eventos: {
        Row: {
          autor: string | null
          beneficiario_id: string
          created_at: string
          data: string
          descricao: string | null
          id: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          autor?: string | null
          beneficiario_id: string
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          autor?: string | null
          beneficiario_id?: string
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficiario_eventos_beneficiario_id_fkey"
            columns: ["beneficiario_id"]
            isOneToOne: false
            referencedRelation: "beneficiarios"
            referencedColumns: ["id"]
          },
        ]
      }
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
      certificados: {
        Row: {
          assinante: string | null
          beneficiario_id: string
          carga_horaria: number | null
          codigo: string
          created_at: string
          emitido_em: string
          id: string
          oficina_id: string | null
          periodo_fim: string | null
          periodo_inicio: string | null
          titulo: string
          turma_id: string | null
        }
        Insert: {
          assinante?: string | null
          beneficiario_id: string
          carga_horaria?: number | null
          codigo?: string
          created_at?: string
          emitido_em?: string
          id?: string
          oficina_id?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          titulo: string
          turma_id?: string | null
        }
        Update: {
          assinante?: string | null
          beneficiario_id?: string
          carga_horaria?: number | null
          codigo?: string
          created_at?: string
          emitido_em?: string
          id?: string
          oficina_id?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          titulo?: string
          turma_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificados_beneficiario_id_fkey"
            columns: ["beneficiario_id"]
            isOneToOne: false
            referencedRelation: "beneficiarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_oficina_id_fkey"
            columns: ["oficina_id"]
            isOneToOne: false
            referencedRelation: "oficinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_participantes: {
        Row: {
          beneficiario_id: string
          created_at: string
          evento_id: string
          id: string
          observacoes: string | null
          presente: boolean
        }
        Insert: {
          beneficiario_id: string
          created_at?: string
          evento_id: string
          id?: string
          observacoes?: string | null
          presente?: boolean
        }
        Update: {
          beneficiario_id?: string
          created_at?: string
          evento_id?: string
          id?: string
          observacoes?: string | null
          presente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "evento_participantes_beneficiario_id_fkey"
            columns: ["beneficiario_id"]
            isOneToOne: false
            referencedRelation: "beneficiarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_participantes_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          cor: string
          created_at: string
          data: string
          data_fim: string | null
          descricao: string | null
          fotos: string[]
          horario: string | null
          id: string
          local: string | null
          nome: string
          relatorio: string | null
          responsavel: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          cor?: string
          created_at?: string
          data?: string
          data_fim?: string | null
          descricao?: string | null
          fotos?: string[]
          horario?: string | null
          id?: string
          local?: string | null
          nome: string
          relatorio?: string | null
          responsavel?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          cor?: string
          created_at?: string
          data?: string
          data_fim?: string | null
          descricao?: string | null
          fotos?: string[]
          horario?: string | null
          id?: string
          local?: string | null
          nome?: string
          relatorio?: string | null
          responsavel?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      frequencias: {
        Row: {
          aula_id: string
          beneficiario_id: string
          created_at: string
          id: string
          observacoes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          aula_id: string
          beneficiario_id: string
          created_at?: string
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          aula_id?: string
          beneficiario_id?: string
          created_at?: string
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "frequencias_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frequencias_beneficiario_id_fkey"
            columns: ["beneficiario_id"]
            isOneToOne: false
            referencedRelation: "beneficiarios"
            referencedColumns: ["id"]
          },
        ]
      }
      listas_presenca: {
        Row: {
          ano: number
          autor: string | null
          created_at: string
          dispositivo: string | null
          educador: string | null
          filtros: Json
          id: string
          marcacoes: Json
          mes: number
          participantes: Json
          projeto: string | null
          total_alunos: number
          turma: string | null
          turma_id: string | null
          turno: string | null
          unidade: string | null
          updated_at: string
        }
        Insert: {
          ano: number
          autor?: string | null
          created_at?: string
          dispositivo?: string | null
          educador?: string | null
          filtros?: Json
          id?: string
          marcacoes?: Json
          mes: number
          participantes?: Json
          projeto?: string | null
          total_alunos?: number
          turma?: string | null
          turma_id?: string | null
          turno?: string | null
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          ano?: number
          autor?: string | null
          created_at?: string
          dispositivo?: string | null
          educador?: string | null
          filtros?: Json
          id?: string
          marcacoes?: Json
          mes?: number
          participantes?: Json
          projeto?: string | null
          total_alunos?: number
          turma?: string | null
          turma_id?: string | null
          turno?: string | null
          unidade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listas_presenca_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      matriculas: {
        Row: {
          autorizacao_assinada: boolean
          beneficiario_id: string
          created_at: string
          data_matricula: string
          data_saida: string | null
          id: string
          lista_espera: boolean
          observacoes: string | null
          status: string
          turma_id: string
          updated_at: string
        }
        Insert: {
          autorizacao_assinada?: boolean
          beneficiario_id: string
          created_at?: string
          data_matricula?: string
          data_saida?: string | null
          id?: string
          lista_espera?: boolean
          observacoes?: string | null
          status?: string
          turma_id: string
          updated_at?: string
        }
        Update: {
          autorizacao_assinada?: boolean
          beneficiario_id?: string
          created_at?: string
          data_matricula?: string
          data_saida?: string | null
          id?: string
          lista_espera?: boolean
          observacoes?: string | null
          status?: string
          turma_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matriculas_beneficiario_id_fkey"
            columns: ["beneficiario_id"]
            isOneToOne: false
            referencedRelation: "beneficiarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      oficinas: {
        Row: {
          auxiliar: string | null
          capacidade: number | null
          carga_horaria: number | null
          cor: string
          created_at: string
          descricao: string | null
          dias_semana: string[]
          educador: string | null
          grupo: string
          horario_fim: string | null
          horario_inicio: string | null
          icone: string | null
          id: string
          idade_max: number | null
          idade_min: number | null
          imagem_url: string | null
          materiais: string | null
          nome: string
          numero_encontros: number | null
          objetivos: string | null
          observacoes: string | null
          sala: string | null
          status: string
          updated_at: string
        }
        Insert: {
          auxiliar?: string | null
          capacidade?: number | null
          carga_horaria?: number | null
          cor?: string
          created_at?: string
          descricao?: string | null
          dias_semana?: string[]
          educador?: string | null
          grupo?: string
          horario_fim?: string | null
          horario_inicio?: string | null
          icone?: string | null
          id?: string
          idade_max?: number | null
          idade_min?: number | null
          imagem_url?: string | null
          materiais?: string | null
          nome: string
          numero_encontros?: number | null
          objetivos?: string | null
          observacoes?: string | null
          sala?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          auxiliar?: string | null
          capacidade?: number | null
          carga_horaria?: number | null
          cor?: string
          created_at?: string
          descricao?: string | null
          dias_semana?: string[]
          educador?: string | null
          grupo?: string
          horario_fim?: string | null
          horario_inicio?: string | null
          icone?: string | null
          id?: string
          idade_max?: number | null
          idade_min?: number | null
          imagem_url?: string | null
          materiais?: string | null
          nome?: string
          numero_encontros?: number | null
          objetivos?: string | null
          observacoes?: string | null
          sala?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      presenca_logs: {
        Row: {
          acao: string
          autor: string | null
          created_at: string
          descricao: string
          detalhes: Json | null
          dispositivo: string | null
          id: string
          lista_id: string | null
        }
        Insert: {
          acao: string
          autor?: string | null
          created_at?: string
          descricao: string
          detalhes?: Json | null
          dispositivo?: string | null
          id?: string
          lista_id?: string | null
        }
        Update: {
          acao?: string
          autor?: string | null
          created_at?: string
          descricao?: string
          detalhes?: Json | null
          dispositivo?: string | null
          id?: string
          lista_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presenca_logs_lista_id_fkey"
            columns: ["lista_id"]
            isOneToOne: false
            referencedRelation: "listas_presenca"
            referencedColumns: ["id"]
          },
        ]
      }
      projeto_participantes: {
        Row: {
          beneficiario_id: string
          created_at: string
          id: string
          observacoes: string | null
          projeto_id: string
        }
        Insert: {
          beneficiario_id: string
          created_at?: string
          id?: string
          observacoes?: string | null
          projeto_id: string
        }
        Update: {
          beneficiario_id?: string
          created_at?: string
          id?: string
          observacoes?: string | null
          projeto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projeto_participantes_beneficiario_id_fkey"
            columns: ["beneficiario_id"]
            isOneToOne: false
            referencedRelation: "beneficiarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projeto_participantes_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      projetos: {
        Row: {
          coordenador: string | null
          cor: string
          created_at: string
          cronograma: string | null
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          equipe: string | null
          id: string
          indicadores: string | null
          metas: string | null
          nome: string
          objetivos: string | null
          resultados: string | null
          status: string
          updated_at: string
        }
        Insert: {
          coordenador?: string | null
          cor?: string
          created_at?: string
          cronograma?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          equipe?: string | null
          id?: string
          indicadores?: string | null
          metas?: string | null
          nome: string
          objetivos?: string | null
          resultados?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          coordenador?: string | null
          cor?: string
          created_at?: string
          cronograma?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          equipe?: string | null
          id?: string
          indicadores?: string | null
          metas?: string | null
          nome?: string
          objetivos?: string | null
          resultados?: string | null
          status?: string
          updated_at?: string
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
      turmas: {
        Row: {
          auxiliar: string | null
          created_at: string
          dias_semana: string[]
          horario_fim: string | null
          horario_inicio: string | null
          id: string
          limite_alunos: number | null
          nome: string
          observacoes: string | null
          oficina_id: string
          professor: string | null
          sala: string | null
          status: string
          updated_at: string
        }
        Insert: {
          auxiliar?: string | null
          created_at?: string
          dias_semana?: string[]
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          limite_alunos?: number | null
          nome: string
          observacoes?: string | null
          oficina_id: string
          professor?: string | null
          sala?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          auxiliar?: string | null
          created_at?: string
          dias_semana?: string[]
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          limite_alunos?: number | null
          nome?: string
          observacoes?: string | null
          oficina_id?: string
          professor?: string | null
          sala?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "turmas_oficina_id_fkey"
            columns: ["oficina_id"]
            isOneToOne: false
            referencedRelation: "oficinas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      app_role: "admin" | "staff"
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
      app_role: ["admin", "staff"],
    },
  },
} as const
