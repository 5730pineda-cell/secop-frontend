export interface Proceso {
  id: string
  cliente_id: string
  referencia: string
  entidad: string | null
  departamento: string | null
  ciudad: string | null
  modalidad: string | null
  codigo_unspc: string | null
  objeto: string | null
  presupuesto: number
  fecha_publicacion: string | null
  fecha_oferta: string | null
  url: string | null
  resultado_ia: boolean | null
  razon_ia: string | null
  // Nuevos campos cliente portal
  estado: string
  nota_cliente: string | null
  etapa_seguimiento: number
  drive_proceso_url: string | null
  es_manual: boolean
  // NUEVOS CAMPOS para fechas de etapas y resultado final
  fecha_etapa_0?: string | null
  fecha_etapa_1?: string | null
  fecha_etapa_2?: string | null
  fecha_etapa_3?: string | null
  fecha_etapa_4?: string | null
  fecha_informe_evaluacion?: string | null
  resultado_final?: 'ganado' | 'perdido' | 'desierto' | null
  nota_resultado?: string | null

  // ========== NUEVAS PROPIEDADES PARA ACOMPAÑAMIENTO UNIFICADO ==========
  en_acompanamiento?: boolean
  estado_acompanamiento?: 'pendiente' | 'en_proceso' | 'atendida' | null
  acompanamiento_creado_en?: string | null

  created_at: string
  updated_at: string
}
