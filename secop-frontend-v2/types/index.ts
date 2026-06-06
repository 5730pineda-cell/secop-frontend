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
