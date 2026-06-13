export interface Cliente {
  id: string
  nombre: string
  descripcion_negocio: string
  palabras_clave: string[]
  palabras_excluidas: string[]
  departamentos: string[]
  codigos_unspc: string[]
  presupuesto_minimo: number
  modalidades_permitidas: string[] | null
  usar_ia: boolean
  activo: boolean
  email_destinatario: string | null
  // Nuevos campos OC Consultores
  usuario: string | null
  password_hash: string | null
  drive_url: string | null
  ultima_visita: string | null
  created_at: string
  updated_at: string
}

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
  created_at: string
  updated_at: string
  // NUEVOS CAMPOS para fechas de etapas y resultado final
  fecha_etapa_0?: string | null
  fecha_etapa_1?: string | null
  fecha_etapa_2?: string | null
  fecha_etapa_3?: string | null
  fecha_etapa_4?: string | null
  fecha_informe_evaluacion?: string | null
  resultado_final?: 'ganado' | 'perdido' | 'desierto' | null
  nota_resultado?: string | null
}

export interface Feedback {
  id: string
  proceso_id: string
  cliente_id: string | null
  accion: string
  nota: string | null
  created_at: string
}

export interface Ejecucion {
  id: string
  fecha: string
  procesos_descargados: number
  procesos_filtrados: number
  procesos_aprobados_ia: number
  procesos_guardados: number
  errores: string[]
  duracion_segundos: number
  created_at: string
}

export interface Metrics {
  total_clientes_activos: number
  total_procesos: number
  procesos_hoy: number
  procesos_aprobados_ia: number
  ultima_ejecucion: string | null
  duracion_ultima_ejecucion: number | null
}

// ========== NUEVAS INTERFACES PARA SOLICITUDES Y COMENTARIOS ==========

export interface SolicitudAcompanamiento {
  id: string
  cliente_id: string
  empresa: string
  numero_proceso: string
  enlace: string
  observaciones: string | null
  estado: 'pendiente' | 'en_proceso' | 'atendida'
  created_at: string
  updated_at: string
}

export interface Comentario {
  id: string
  proceso_id: string
  cliente_id: string
  autor: 'cliente' | 'admin'
  texto: string
  created_at: string
}
