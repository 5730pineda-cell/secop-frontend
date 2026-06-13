"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Cliente, Proceso, Comentario, SolicitudAcompanamiento } from "@/types"
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, Area
} from "recharts"
import {
  Bell, Search, LogOut, ExternalLink, Send, FolderOpen, Archive,
  Clock, PieChart as PieChartIcon, Zap, CheckCircle, MapPin, Briefcase,
  Filter, DollarSign, MessageSquare, HelpCircle,
  Calendar, ChevronDown, ChevronUp, Sun, Moon, TrendingUp, Eye, EyeOff
} from "lucide-react"

// ---------- HELPERS ----------
function fmt(n: number | null | undefined): string {
  if (!n) return "$0"
  const v = Number(n)
  if (v >= 1e9) return "$" + (v / 1e9).toFixed(1).replace(".", ",") + " mil M"
  if (v >= 1e6) return "$" + Math.round(v / 1e6).toLocaleString("es-CO") + "M"
  if (v >= 1e3) return "$" + Math.round(v / 1e3).toLocaleString("es-CO") + "K"
  return "$" + v.toLocaleString("es-CO")
}
function formatFechaCorta(f: string | null): string {
  if (!f) return "—"
  return new Date(f).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })
}
function diasRestantes(f: string | null): number | null {
  if (!f) return null
  const hoy = new Date(); hoy.setHours(0,0,0,0)
  const fe = new Date(f); fe.setHours(0,0,0,0)
  return Math.ceil((fe.getTime() - hoy.getTime()) / 86400000)
}

const ETAPAS = ["Análisis", "Aprobación", "Organización", "Presentación", "Resultado"]

function Timeline({ etapa }: { etapa: number }) {
  const idx = Math.min(Math.max(0, etapa), 4)
  return (
    <div className="relative flex items-center w-full mt-4">
      <div className="absolute h-[2px] bg-gray-200 dark:bg-gray-800 w-full rounded-full"></div>
      <div className="absolute h-[2px] bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${(idx / 4) * 100}%` }}></div>
      {ETAPAS.map((e, i) => {
        const isActive = i < idx
        const isCurrent = i === idx
        const isLast = i === 4
        let displayText = ""
        if (isLast && idx === 4) displayText = "✓"
        else if (isActive) displayText = "✓"
        else displayText = (i + 1).toString()
        return (
          <div key={i} className="relative z-10 flex flex-col items-center" style={{ width: `${100 / 4}%` }}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${(isActive || (isCurrent && idx === 4)) ? "bg-gradient-to-br from-blue-500 to-emerald-500 text-white shadow-md" : "bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-500"} ${isCurrent ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-900" : ""}`}>
              {displayText}
            </div>
            <span className="text-[9px] text-gray-500 dark:text-gray-500 mt-1 hidden md:block">{e}</span>
          </div>
        )
      })}
    </div>
  )
}

function BienvenidaToast({ nombre, onClose }: { nombre: string; onClose: () => void }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 300)
    const t2 = setTimeout(() => { setVisible(false); setTimeout(onClose, 400) }, 8000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onClose])
  return (
    <div className="fixed bottom-6 right-6 z-50 transition-all duration-500" style={{ transform: visible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.9)", opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none" }}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 p-4 max-w-sm flex gap-3 items-start">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-emerald-600 flex items-center justify-center shrink-0 shadow-md"><span className="font-black text-white text-sm">OC</span></div>
        <div className="flex-1"><div className="font-bold text-gray-900 dark:text-white text-sm">¡Bienvenido{nombre ? `, ${nombre.split(" ")[0]}` : ""}! 👋</div><div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">SOFIA encontró nuevas oportunidades para tu empresa.</div></div>
        <button onClick={() => { setVisible(false); setTimeout(onClose, 400) }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none">×</button>
      </div>
    </div>
  )
}

export default function PortalCliente() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [procesos, setProcesos] = useState<Proceso[]>([])
  const [todosProcesos, setTodosProcesos] = useState<Proceso[]>([])
  const [descartados, setDescartados] = useState<Proceso[]>([])
  const [solicitudes, setSolicitudes] = useState<SolicitudAcompanamiento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState("nuevos")
  const [saving, setSaving] = useState<Record<string, boolean | string>>({})
  const [saliendo, setSaliendo] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<{ msg: string; tipo: string } | null>(null)
  const [showBienvenida, setShowBienvenida] = useState(false)
  const [procesoADescartar, setProcesoADescartar] = useState<Proceso | null>(null)
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({})
  const [hideDetails, setHideDetails] = useState<Record<string, boolean>>({})
  const [filtroPanel, setFiltroPanel] = useState(false)
  const [fDepto, setFDepto] = useState("")
  const [fEntidad, setFEntidad] = useState("")
  const [fModalidad, setFModalidad] = useState("")
  const [fPresMin, setFPresMin] = useState("")
  const [fPresMax, setFPresMax] = useState("")
  const [fTexto, setFTexto] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [comentariosSolicitud, setComentariosSolicitud] = useState<Record<string, Comentario[]>>({})
  const [nuevoComentarioSolicitud, setNuevoComentarioSolicitud] = useState<Record<string, string>>({})
  const [enviandoComentarioSolicitud, setEnviandoComentarioSolicitud] = useState<Record<string, boolean>>({})
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const isDark = stored === "dark" || (stored === null && prefersDark)
    setDarkMode(isDark)
    if (isDark) document.documentElement.classList.add("dark")
    else document.documentElement.classList.remove("dark")
  }, [])
  const toggleTheme = () => {
    const newDark = !darkMode
    setDarkMode(newDark)
    if (newDark) document.documentElement.classList.add("dark")
    else document.documentElement.classList.remove("dark")
    localStorage.setItem("theme", newDark ? "dark" : "light")
  }

  useEffect(() => { if (!id) return; cargar() }, [id])

  async function cargar() {
    setLoading(true)
    const { data: c, error: ce } = await supabase.from("clientes").select("*").eq("id", id).single()
    if (ce || !c) { setError("Cliente no encontrado."); setLoading(false); return }
    setCliente(c)

    // Limpiar vencidos
    await supabase.from("procesos").delete().eq("cliente_id", id).eq("estado", "nuevo").lt("fecha_oferta", new Date().toISOString())
    const hace30 = new Date(); hace30.setDate(hace30.getDate() - 30)
    await supabase.from("procesos").delete().eq("cliente_id", id).eq("estado", "descartado").lt("updated_at", hace30.toISOString())

    // Obtener todas las solicitudes
    const { data: sol } = await supabase.from("solicitudes_acompanamiento").select("*").eq("cliente_id", id)
    setSolicitudes(sol || [])

    // IDs de procesos con solicitud activa (pendiente o en_proceso) para excluir
    const idsExcluir = (sol || [])
      .filter(s => s.estado === 'pendiente' || s.estado === 'en_proceso')
      .map(s => s.proceso_id)
      .filter(Boolean) as string[]

    const hoy = new Date().toISOString()
    // Todos los procesos (para gráficos y acompañamiento)
    const { data: allProcesos } = await supabase
      .from("procesos")
      .select("*")
      .eq("cliente_id", id)
      .neq("estado", "descartado")
      .or(`estado.eq.interesado,fecha_oferta.gt.${hoy}`)
      .order("fecha_oferta", { ascending: true })
    setTodosProcesos(allProcesos || [])

    // Procesos excluyendo los que tienen solicitud activa (para Nuevos/Intereses)
    let query = supabase
      .from("procesos")
      .select("*")
      .eq("cliente_id", id)
      .neq("estado", "descartado")
      .or(`estado.eq.interesado,fecha_oferta.gt.${hoy}`)
      .order("fecha_oferta", { ascending: true })
    if (idsExcluir.length > 0) {
      query = query.not("id", "in", `(${idsExcluir.join(",")})`)
    }
    const { data: p } = await query
    setProcesos(p || [])

    const { data: desc } = await supabase.from("procesos").select("*").eq("cliente_id", id).eq("estado", "descartado").order("updated_at", { ascending: false })
    setDescartados(desc || [])

    setLoading(false)
    const key = `bienvenida_${id}`
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1")
      setShowBienvenida(true)
      await supabase.from("clientes").update({ ultima_visita: new Date().toISOString() }).eq("id", id)
    }
  }

  async function marcarInteres(procesoId: string) {
    if (saving[procesoId]) return
    setSaving(prev => ({ ...prev, [procesoId]: true }))
    await supabase.from("procesos").update({ estado: "interesado", etapa_seguimiento: 0 }).eq("id", procesoId)
    await supabase.from("feedback").insert([{ proceso_id: procesoId, cliente_id: id, accion: "interesado" }])
    setProcesos(prev => prev.map(x => x.id === procesoId ? { ...x, estado: "interesado", etapa_seguimiento: 0 } : x))
    setTodosProcesos(prev => prev.map(x => x.id === procesoId ? { ...x, estado: "interesado", etapa_seguimiento: 0 } : x))
    mostrarToast("✓ Interés registrado", "ok")
    setSaving(prev => ({ ...prev, [procesoId]: false }))
  }

  // ======================= ENVIAR A ACOMPAÑAMIENTO (CORREGIDO) =======================
  async function enviarAcompanamiento(procesoId: string) {
    if (saving[procesoId]) return
    const proc = todosProcesos.find(x => x.id === procesoId)
    if (!proc) {
      console.error("❌ No se encontró el proceso en todosProcesos", procesoId)
      mostrarToast("Error: proceso no encontrado", "error")
      return
    }
    setSaving(prev => ({ ...prev, [procesoId]: "acompanamiento" }))

    // Insertar en BD
    const { data: newSolicitud, error } = await supabase
      .from("solicitudes_acompanamiento")
      .insert({
        cliente_id: id,
        proceso_id: procesoId,
        empresa: cliente?.nombre || "Cliente",
        numero_proceso: proc.referencia,
        enlace: proc.url || "",
        observaciones: `Solicitud de acompañamiento.\nEntidad: ${proc.entidad}\nPresupuesto: ${fmt(proc.presupuesto)}`,
        estado: "pendiente",
        etapa_actual: 0
      })
      .select()
      .single()

    if (error) {
      console.error("❌ Error insertando solicitud:", error)
      mostrarToast("Error: " + error.message, "error")
      setSaving(prev => ({ ...prev, [procesoId]: false }))
      return
    }

    console.log("✅ Solicitud creada:", newSolicitud)

    // ACTUALIZACIÓN LOCAL OPTIMISTA (eliminar proceso de todas las listas activas)
    setProcesos(prev => {
      const filtered = prev.filter(p => p.id !== procesoId)
      console.log("📦 procesos después de eliminar:", filtered.length)
      return filtered
    })
    setTodosProcesos(prev => {
      const filtered = prev.filter(p => p.id !== procesoId)
      console.log("📦 todosProcesos después de eliminar:", filtered.length)
      return filtered
    })
    setSolicitudes(prev => [newSolicitud, ...prev])
    setTab("acompanamiento")
    mostrarToast("Solicitud enviada. El proceso ahora está en Acompañamiento.", "ok")
    setSaving(prev => ({ ...prev, [procesoId]: false }))

    // NO llamar a cargar() para no sobrescribir
  }

  // ======================= DESCARTAR (CORREGIDO) =======================
  async function descartar(procesoId: string) {
    setProcesoADescartar(null)
    // Buscar el proceso tanto en procesos como en todosProcesos (por si ya no está en procesos)
    let p = procesos.find(x => x.id === procesoId)
    if (!p) p = todosProcesos.find(x => x.id === procesoId)
    if (!p) {
      console.warn("⚠️ No se encontró el proceso para descartar", procesoId)
      mostrarToast("El proceso ya no está disponible", "error")
      return
    }
    setSaliendo(prev => ({ ...prev, [procesoId]: true }))

    await supabase.from("procesos").update({ estado: "descartado", updated_at: new Date().toISOString() }).eq("id", procesoId)
    await supabase.from("feedback").insert([{ proceso_id: procesoId, cliente_id: id, accion: "descartado" }])

    const procesoDescartado = { ...p, estado: "descartado" }
    setDescartados(prev => [procesoDescartado, ...prev])
    setProcesos(prev => prev.filter(x => x.id !== procesoId))
    setTodosProcesos(prev => prev.filter(x => x.id !== procesoId))

    setTimeout(() => setSaliendo(prev => { const n = { ...prev }; delete n[procesoId]; return n }), 320)
    mostrarToast("Proceso descartado", "info")
  }

  async function restaurar(procesoId: string) {
    await supabase.from("procesos").update({ estado: "nuevo", updated_at: new Date().toISOString() }).eq("id", procesoId)
    const p = descartados.find(x => x.id === procesoId)
    if (p) {
      const restaurado = { ...p, estado: "nuevo" }
      setProcesos(prev => [restaurado, ...prev])
      setTodosProcesos(prev => [restaurado, ...prev])
    }
    setDescartados(prev => prev.filter(x => x.id !== procesoId))
    mostrarToast("Proceso restaurado", "ok")
    setTab("nuevos")
  }

  async function cargarComentariosSolicitud(solicitudId: string) {
    const { data } = await supabase.from("comentarios").select("*").eq("solicitud_id", solicitudId).order("created_at", { ascending: true })
    if (data) setComentariosSolicitud(prev => ({ ...prev, [solicitudId]: data }))
  }

  async function enviarComentarioSolicitud(solicitudId: string) {
    const texto = nuevoComentarioSolicitud[solicitudId]?.trim()
    if (!texto) { mostrarToast("Escribe un comentario", "error"); return }
    setEnviandoComentarioSolicitud(prev => ({ ...prev, [solicitudId]: true }))
    try {
      const { error } = await supabase.from("comentarios").insert({ solicitud_id: solicitudId, cliente_id: id, autor: "cliente", texto })
      if (error) throw error
      await cargarComentariosSolicitud(solicitudId)
      setNuevoComentarioSolicitud(prev => ({ ...prev, [solicitudId]: "" }))
      mostrarToast("Comentario enviado", "ok")
    } catch (err: any) {
      mostrarToast("Error: " + (err.message || "No se pudo enviar"), "error")
    } finally { setEnviandoComentarioSolicitud(prev => ({ ...prev, [solicitudId]: false })) }
  }

  function mostrarToast(msg: string, tipo: string) { setToast({ msg, tipo }); setTimeout(() => setToast(null), 3800) }
  function limpiarFiltros() { setFDepto(""); setFEntidad(""); setFModalidad(""); setFPresMin(""); setFPresMax(""); setFTexto(""); setSearchTerm("") }

  // Datos para gráficos
  const nuevos = todosProcesos.filter(p => p.estado === "nuevo")
  const interesados = todosProcesos.filter(p => p.estado === "interesado")
  const solicitudesActivas = solicitudes.filter(s => s.estado === "pendiente" || s.estado === "en_proceso")
  const idsEnAcompanamiento = solicitudesActivas.map(s => s.proceso_id).filter(Boolean)
  const presAcompanamiento = todosProcesos.filter(p => idsEnAcompanamiento.includes(p.id)).reduce((sum, p) => sum + Number(p.presupuesto || 0), 0)
  const presInteresados = interesados.reduce((sum, p) => sum + Number(p.presupuesto || 0), 0)
  const presAnalisis = nuevos.reduce((sum, p) => sum + Number(p.presupuesto || 0), 0)
  const presTotal = presAnalisis + presInteresados + presAcompanamiento

  // Tendencia (últimos 30 días)
  const fechaLimite = new Date(); fechaLimite.setDate(fechaLimite.getDate() - 30)
  const procesosTendencia = todosProcesos.filter(p => p.fecha_oferta && new Date(p.fecha_oferta) >= fechaLimite)
  const tendenciaMap = new Map<string, number>()
  procesosTendencia.forEach(p => {
    const fechaKey = new Date(p.fecha_oferta!).toISOString().split('T')[0]
    tendenciaMap.set(fechaKey, (tendenciaMap.get(fechaKey) || 0) + 1)
  })
  let tendenciaData = Array.from(tendenciaMap.entries()).map(([fecha, count]) => ({ fecha, count })).sort((a,b) => a.fecha.localeCompare(b.fecha))
  let trendData: { fecha: string; trend: number | null }[] = []
  if (tendenciaData.length >= 2) {
    const n = tendenciaData.length, indices = Array.from({ length: n }, (_, i) => i)
    const sumX = indices.reduce((a,b) => a + b, 0), sumY = tendenciaData.reduce((a,b) => a + b.count, 0)
    const sumXY = indices.reduce((a, i) => a + i * tendenciaData[i].count, 0), sumX2 = indices.reduce((a, i) => a + i * i, 0)
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX), intercept = (sumY - slope * sumX) / n
    trendData = tendenciaData.map((point, i) => ({ fecha: point.fecha, trend: Math.max(0, slope * i + intercept) }))
  }

  const deptoMap = new Map<string, number>()
  todosProcesos.forEach(p => { if (p.departamento) deptoMap.set(p.departamento, (deptoMap.get(p.departamento) || 0) + 1) })
  const deptoData = Array.from(deptoMap.entries()).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0,5)

  const entidadMap = new Map<string, number>()
  todosProcesos.forEach(p => { if (p.entidad) entidadMap.set(p.entidad, (entidadMap.get(p.entidad) || 0) + Number(p.presupuesto || 0)) })
  const topEntidades = Array.from(entidadMap.entries()).map(([name, total]) => ({ name, total })).sort((a,b) => b.total - a.total).slice(0,5)

  const deptos = [...new Set(todosProcesos.map(p => p.departamento).filter(Boolean))].sort()
  const entidades = [...new Set(todosProcesos.map(p => p.entidad).filter(Boolean))].sort()
  const modalidades = [...new Set(todosProcesos.map(p => p.modalidad).filter(Boolean))].sort()
  const listaBase = tab === "nuevos" ? nuevos : tab === "interesado" ? interesados : []
  const listaActual = listaBase.filter(p => {
    if (fDepto && p.departamento !== fDepto) return false
    if (fEntidad && p.entidad !== fEntidad) return false
    if (fModalidad && p.modalidad !== fModalidad) return false
    if (fPresMin && Number(p.presupuesto) < Number(fPresMin) * 1e6) return false
    if (fPresMax && Number(p.presupuesto) > Number(fPresMax) * 1e6) return false
    if (fTexto && !p.objeto?.toLowerCase().includes(fTexto.toLowerCase()) && !p.referencia?.toLowerCase().includes(fTexto.toLowerCase()) && !p.entidad?.toLowerCase().includes(fTexto.toLowerCase())) return false
    if (searchTerm && !p.entidad?.toLowerCase().includes(searchTerm.toLowerCase()) && !p.referencia?.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })
  const filtrosActivos = [fDepto, fEntidad, fModalidad, fPresMin, fPresMax, fTexto, searchTerm].filter(Boolean).length

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
  if (error) return <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center text-red-500">{error}</div>

  const tooltipStyle = {
    backgroundColor: darkMode ? '#1f2937' : '#ffffff',
    border: darkMode ? 'none' : '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '11px',
    color: darkMode ? '#fff' : '#1f2937',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans antialiased transition-colors duration-300">
      {/* HEADER (sin cambios, igual que antes) */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-6 py-3 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-lg flex items-center justify-center shadow-md"><span className="text-white font-black text-lg">OC</span></div>
            <div><h1 className="text-gray-900 dark:text-white font-bold text-base tracking-tight">OC CONSULTORES</h1><p className="text-[9px] text-gray-500 dark:text-gray-500 font-mono tracking-wider">TAX & LEGAL - COLOMBIA</p></div>
          </div>
          <div className="hidden md:flex bg-gray-100 dark:bg-gray-800/50 p-1 rounded-xl">
            {[
              { id: "nuevos", label: "Nuevos", count: nuevos.length },
              { id: "interesado", label: "Mis Intereses", count: interesados.length },
              { id: "descartados", label: "Descartados", count: descartados.length },
              { id: "acompanamiento", label: "Acompañamiento", count: solicitudes.length }
            ].map(tabItem => (
              <button key={tabItem.id} onClick={() => { setTab(tabItem.id); limpiarFiltros(); setFiltroPanel(false) }} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all ${tab === tabItem.id ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}`}>
                {tabItem.label}{tabItem.count > 0 && <span className="text-[10px] font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">{tabItem.count}</span>}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition p-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="relative"><input type="text" placeholder="Buscar proceso..." className="bg-gray-100 dark:bg-gray-800/50 border-0 rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-gray-900 dark:text-white placeholder:text-gray-500 focus:ring-1 focus:ring-blue-500 transition w-40 md:w-56" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /><Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" /></div>
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-800">
              {cliente && (<><div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-emerald-600 flex items-center justify-center text-white font-bold text-xs">{cliente.nombre?.charAt(0)}</div><div className="hidden sm:block"><p className="text-gray-900 dark:text-white text-[12px] font-medium">{cliente.nombre.split(" ").slice(0,2).join(" ")}</p><p className="text-[9px] text-gray-500">{cliente.email_destinatario || "cliente@occonsultores.com"}</p></div></>)}
              <button onClick={() => { document.cookie = "secop_token=;max-age=0;path=/"; localStorage.clear(); router.push("/login") }} className="text-gray-500 hover:text-red-500 transition"><LogOut size={14} /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* COLUMNA IZQUIERDA - GRÁFICOS (sin cambios, igual que antes) */}
          <div className="lg:col-span-3 space-y-5">
            {tendenciaData.length > 0 && (
              <div className="bg-white dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4"><TrendingUp size={14} className="text-blue-600"/><h2 className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Tendencia de procesos</h2></div>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={tendenciaData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <defs><linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                      <XAxis dataKey="fecha" tick={{ fontSize: 9, fill: '#6b7280' }} interval="preserveStartEnd" tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} allowDecimals={false} domain={[0, 'dataMax + 1']} />
                      <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => `Fecha: ${l}`} />
                      <Area type="monotone" dataKey="count" stroke="none" fill="url(#colorCount)" />
                      <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 5 }} />
                      {trendData.length > 0 && <Line type="linear" dataKey="trend" data={trendData} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center text-[9px] text-gray-500 mt-2">Últimos 30 días (línea punteada: tendencia)</div>
              </div>
            )}
            {deptoData.length > 0 && (
              <div className="bg-white dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4"><MapPin size={14} className="text-emerald-600"/><h2 className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Procesos por departamento</h2></div>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptoData} layout="vertical" margin={{ left: 30 }}>
                      <XAxis type="number" tick={{ fontSize: 9, fill: '#6b7280' }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#6b7280' }} width={80} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="value" fill="#10b981" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            <div className="bg-white dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4"><PieChartIcon size={14} className="text-emerald-600"/><h2 className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Distribución presupuestaria</h2></div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[
                      { name: "Interesados", value: presInteresados, color: "#10b981" },
                      { name: "En análisis", value: presAnalisis, color: "#f59e0b" },
                      { name: "Acompañamiento", value: presAcompanamiento, color: "#3b82f6" }
                    ]} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                      <Cell fill="#10b981" /><Cell fill="#f59e0b" /><Cell fill="#3b82f6" />
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [fmt(value), 'Presupuesto']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-1.5 text-[11px]">
                <div className="flex justify-between"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"/><span className="text-gray-600 dark:text-gray-400">Interesados</span></div><span className="text-gray-900 dark:text-white font-mono">{fmt(presInteresados)}</span></div>
                <div className="flex justify-between"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500"/><span className="text-gray-600 dark:text-gray-400">En análisis</span></div><span className="text-gray-900 dark:text-white font-mono">{fmt(presAnalisis)}</span></div>
                <div className="flex justify-between"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"/><span className="text-gray-600 dark:text-gray-400">Acompañamiento</span></div><span className="text-gray-900 dark:text-white font-mono">{fmt(presAcompanamiento)}</span></div>
                <div className="border-t border-gray-200 dark:border-gray-800 pt-2 mt-1"><div className="flex justify-between font-semibold"><span>Total potencial</span><span className="text-emerald-600 dark:text-emerald-400">{fmt(presTotal)}</span></div></div>
              </div>
            </div>
          </div>

          {/* COLUMNA CENTRAL - PROCESOS (solo la parte de ACOMPAÑAMIENTO, el resto es igual) */}
          <div className="lg:col-span-6 space-y-4">
            {/* Cabecera y filtros (igual que antes) */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2"><h2 className="text-gray-900 dark:text-white font-bold text-lg flex items-center gap-2"><Zap size={16} className="text-emerald-600"/>{tab === "nuevos" ? "Procesos Nuevos" : tab === "interesado" ? "Mis Intereses" : tab === "acompanamiento" ? "Mis Solicitudes de Acompañamiento" : "Descartados"}</h2>{(tab === "nuevos" || tab === "interesado") && (<button onClick={() => setFiltroPanel(!filtroPanel)} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${filtrosActivos > 0 ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}><Filter size={10}/> Filtrar {filtrosActivos > 0 && `(${filtrosActivos})`}</button>)}</div>
              <div className="text-[10px] text-gray-500 font-mono">{tab === "acompanamiento" ? `${solicitudes.length} solicitud(es)` : `${listaActual.length} oportunidad(es) · ${fmt(listaActual.reduce((s,p)=>s+Number(p.presupuesto||0),0))}`}</div>
            </div>

            {filtroPanel && (tab === "nuevos" || tab === "interesado") && (
              <div className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <select value={fDepto} onChange={e=>setFDepto(e.target.value)} className="bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white"><option value="">Todos los departamentos</option>{deptos.map(d=><option key={d}>{d}</option>)}</select>
                  <select value={fEntidad} onChange={e=>setFEntidad(e.target.value)} className="bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-3 py-1.5 text-xs"><option value="">Todas las entidades</option>{entidades.map(e=><option key={e}>{e.substring(0,40)}</option>)}</select>
                  <select value={fModalidad} onChange={e=>setFModalidad(e.target.value)} className="bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-3 py-1.5 text-xs"><option value="">Todas las modalidades</option>{modalidades.map(m=><option key={m}>{m}</option>)}</select>
                  <input type="text" placeholder="Buscar por texto..." value={fTexto} onChange={e=>setFTexto(e.target.value)} className="bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-3 py-1.5 text-xs" />
                  <div className="flex gap-2"><input type="number" placeholder="Pres. mín. (M)" value={fPresMin} onChange={e=>setFPresMin(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-3 py-1.5 text-xs"/><span className="text-gray-500">–</span><input type="number" placeholder="Pres. máx. (M)" value={fPresMax} onChange={e=>setFPresMax(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-3 py-1.5 text-xs"/></div>
                </div>
                <div className="flex justify-end gap-2"><button onClick={limpiarFiltros} className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-800 px-3 py-1 rounded-lg">Limpiar</button><button onClick={()=>setFiltroPanel(false)} className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg">Aplicar · {listaActual.length}</button></div>
              </div>
            )}

            {/* ACOMPAÑAMIENTO (mismo código que antes, pero los datos ahora vendrán con proceso_id correcto) */}
            {tab === "acompanamiento" && (
              <div className="space-y-4">
                {solicitudes.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-800"><div className="text-4xl mb-2">📋</div><div className="text-gray-900 dark:text-white font-medium">No tienes solicitudes de acompañamiento</div><div className="text-xs text-gray-500">Usa el botón "Enviar a SOFIA" en cualquier proceso.</div></div>
                ) : (
                  solicitudes.map(sol => {
                    const proceso = todosProcesos.find(p => p.id === sol.proceso_id) || descartados.find(p => p.id === sol.proceso_id)
                    if (!comentariosSolicitud[sol.id]) cargarComentariosSolicitud(sol.id)
                    const etapaActual = sol.etapa_actual ?? 0
                    const nombreEtapa = sol.etapa_nombre || ETAPAS[etapaActual]
                    const isCollapsed = collapsedCards[sol.id] || false
                    const isDetailsHidden = hideDetails[sol.id] || false
                    return (
                      <div key={sol.id} className="bg-white dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className="text-[10px] font-mono text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">{proceso?.referencia || sol.numero_proceso}</span></div><h3 className="text-[15px] font-bold text-gray-900 dark:text-white mt-1 tracking-tight">{proceso?.entidad || "Proceso"}</h3></div>
                          <div className="text-right flex-shrink-0"><div className="text-[22px] font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">{fmt(proceso?.presupuesto)}</div><div className="flex items-center justify-end gap-2 mt-1"><div className={`text-[10px] px-2 py-1 rounded-full ${sol.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : sol.estado === 'en_proceso' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'}`}>{sol.estado === 'pendiente' ? 'Pendiente' : sol.estado === 'en_proceso' ? 'En proceso' : 'Atendida'}</div><button onClick={() => setCollapsedCards(prev => ({ ...prev, [sol.id]: !prev[sol.id] }))} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition">{isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}</button></div></div>
                        </div>
                        {!isCollapsed && (
                          <>
                            <div className="mt-3"><p className="text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">{proceso?.objeto || sol.observaciones}</p><div className="flex flex-wrap gap-2 mt-2">{proceso?.departamento && <span className="flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md"><MapPin size={10} /> {proceso.departamento}</span>}{proceso?.modalidad && <span className="flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md"><Briefcase size={10} /> {proceso.modalidad}</span>}{sol.enlace && <a href={sol.enlace} target="_blank" rel="noreferrer" className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1"><ExternalLink size={10}/> Ver SECOP</a>}</div></div>
                            <div className="border-t border-gray-200 dark:border-gray-800 mt-4 pt-3">
                              <div className="flex justify-between items-center mb-2"><span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Gestión y comentarios</span><button onClick={() => setHideDetails(prev => ({ ...prev, [sol.id]: !prev[sol.id] }))} className="text-gray-500 hover:text-gray-700 text-xs flex items-center gap-1">{isDetailsHidden ? <Eye size={12} /> : <EyeOff size={12} />}{isDetailsHidden ? "Mostrar" : "Ocultar"}</button></div>
                              {!isDetailsHidden && (
                                <>
                                  <Timeline etapa={etapaActual} />
                                  {sol[`fecha_etapa_${etapaActual}`] && (<div className="mt-2 text-[11px] text-gray-500 dark:text-gray-500 flex items-center gap-2"><Calendar size={12} /> Fecha registrada: {new Date(sol[`fecha_etapa_${etapaActual}`]).toLocaleString()}</div>)}
                                  <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-500">{etapaActual === 0 ? "El equipo OC iniciará el análisis pronto." : `Estamos en la etapa ${nombreEtapa}.`}</div>
                                  <div className="mt-4"><span className="text-[11px] font-bold text-blue-600 flex items-center gap-1 mb-2"><MessageSquare size={12}/> Comentarios</span>
                                    <div className="space-y-2 max-h-32 overflow-y-auto mb-2">{(comentariosSolicitud[sol.id] || []).map(c => (<div key={c.id} className={`text-xs p-2 rounded ${c.autor === 'admin' ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500' : 'bg-gray-100 dark:bg-gray-800'}`}><div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-500 mb-1"><span className="font-bold">{c.autor === 'admin' ? 'OC Consultores' : 'Tú'}</span><span>{new Date(c.created_at).toLocaleString()}</span></div><p className="text-gray-800 dark:text-gray-200">{c.texto}</p></div>))}</div>
                                    <div className="flex gap-2"><textarea rows={1} placeholder="Escribe un comentario o consulta..." className="flex-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-gray-900 dark:text-white text-xs resize-none" value={nuevoComentarioSolicitud[sol.id] || ""} onChange={e => setNuevoComentarioSolicitud(prev => ({ ...prev, [sol.id]: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarComentarioSolicitud(sol.id) } }} /><button onClick={() => enviarComentarioSolicitud(sol.id)} disabled={enviandoComentarioSolicitud[sol.id]} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs font-bold transition"><Send size={12}/></button></div>
                                  </div>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* NUEVOS / INTERESES (igual que antes) */}
            {(tab === "nuevos" || tab === "interesado") && (
              <div className="space-y-4">
                {listaActual.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-800"><div className="text-4xl mb-2">{tab === "interesado" ? "⭐" : "📋"}</div><div className="text-gray-900 dark:text-white font-medium">No hay procesos para mostrar</div><div className="text-xs text-gray-500">Los procesos enviados a acompañamiento están en su propia pestaña.</div></div>
                ) : (
                  listaActual.map(p => {
                    const dias = diasRestantes(p.fecha_oferta), urgente = dias !== null && dias <= 3 && dias >= 0, isInt = p.estado === "interesado", isSaving = saving[p.id], isSaliendo = saliendo[p.id]
                    return (
                      <div key={p.id} className={`bg-white dark:bg-gray-900/60 rounded-xl border transition-all duration-300 ${isSaliendo ? "opacity-0 scale-95 transition-all" : ""} ${isInt ? "border-blue-300 dark:border-blue-800" : urgente ? "border-amber-300 dark:border-amber-800" : "border-gray-200 dark:border-gray-800"} p-5 shadow-sm hover:shadow-md`}>
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className="text-[10px] font-mono text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">{p.referencia}</span>{urgente && <span className="text-[10px] font-mono text-amber-800 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full animate-pulse">⚡ Cierre urgente</span>}</div><h3 className="text-[15px] font-bold text-gray-900 dark:text-white mt-2 tracking-tight">{p.entidad || "—"}</h3></div>
                          <div className="text-right flex-shrink-0"><div className="text-[22px] font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">{fmt(p.presupuesto)}</div><div className="flex flex-col items-end"><div className="flex items-center justify-end gap-1 mt-1"><Clock size={12} className="text-gray-500" /><span className={`text-[11px] font-mono ${urgente ? "text-amber-600 dark:text-amber-400" : "text-gray-500"}`}>Cierra en {dias}d</span></div><div className="text-[9px] text-gray-400 font-mono">{formatFechaCorta(p.fecha_oferta)}</div></div></div>
                        </div>
                        <p className="text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed mt-3 line-clamp-2">{p.objeto || "Sin descripción"}</p>
                        <div className="flex flex-wrap gap-2 mt-3">{p.departamento && <span className="flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md"><MapPin size={10} /> {p.departamento}</span>}{p.modalidad && <span className="flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md"><Briefcase size={10} /> {p.modalidad}</span>}{p.resultado_ia && <span className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-md">✓ IA</span>}{isInt && <span className="text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md border border-blue-200 dark:border-blue-800">✓ Me interesa</span>}</div>
                        <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-800 mt-3">
                          {!isInt && (<button className="btn flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-[12px] font-bold px-4 py-2 rounded-lg transition-all" onClick={() => marcarInteres(p.id)} disabled={!!isSaving}>{isSaving && isSaving !== "acompanamiento" ? "..." : "✓ Me interesa"}</button>)}
                          <button className="btn flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-[12px] font-bold px-4 py-2 rounded-lg transition-all shadow-sm" onClick={() => enviarAcompanamiento(p.id)} disabled={isSaving === "acompanamiento"}><HelpCircle size={14} /> {isSaving === "acompanamiento" ? "Enviando..." : "Enviar a SOFIA"}</button>
                          <button className="btn flex items-center gap-1 text-[12px] text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-2 rounded-lg transition-all" onClick={() => setProcesoADescartar(p)} disabled={!!isSaving}><Archive size={12} /> Descartar</button>
                          <a href={p.url || "#"} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[12px] text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-2 rounded-lg transition-all ml-auto"><ExternalLink size={12} /> Ver SECOP</a>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* DESCARTADOS (igual que antes) */}
            {tab === "descartados" && (
              <div className="space-y-3">
                {descartados.length === 0 ? (<div className="text-center py-16 bg-white dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-800"><div className="text-5xl mb-4">🗑</div><div className="text-[15px] font-semibold text-gray-900 dark:text-white mb-2">Sin procesos descartados</div><div className="text-[13px] text-gray-500">Se eliminan automáticamente después de 30 días.</div></div>) : (
                  descartados.map(p => (<div key={p.id} className="bg-white dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-800 p-5 opacity-80"><div className="flex justify-between items-start gap-4 mb-3"><div><h3 className="text-[14px] font-semibold text-gray-700 dark:text-gray-300">{p.entidad || "—"}</h3><div className="text-[10px] text-gray-500 font-mono">{p.referencia}{p.departamento ? ` · ${p.departamento}` : ""}</div></div><div className="text-[18px] font-bold text-gray-500 font-mono">{fmt(p.presupuesto)}</div></div><p className="text-[12px] text-gray-500 mb-4 line-clamp-2">{p.objeto || ""}</p><div className="flex gap-2"><button className="btn flex items-center gap-1 text-[12px] text-blue-600 dark:text-blue-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-2 rounded-lg transition-all" onClick={() => restaurar(p.id)}>↩ Restaurar</button>{p.url && <a href={p.url} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1 text-[12px] text-gray-500 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-2 rounded-lg transition-all"><ExternalLink size={12} /> Ver SECOP</a>}</div></div>))
                )}
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA (igual que antes) */}
          <div className="lg:col-span-3 space-y-5">
            <div className="bg-white dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
              <h2 className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2"><DollarSign size={12} className="text-emerald-600"/>Top Oportunidades</h2>
              <div className="space-y-2">
                {[...todosProcesos].sort((a,b)=>(b.presupuesto||0)-(a.presupuesto||0)).slice(0,4).map((opp,idx)=>{const dias=diasRestantes(opp.fecha_oferta);return (<a key={idx} href={opp.url||"#"} target="_blank" rel="noreferrer" className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer group"><div className="flex-1 min-w-0"><p className="text-[12px] font-medium text-gray-900 dark:text-white truncate">{opp.entidad||"—"}</p><div className="flex items-center gap-2 mt-0.5"><span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">{fmt(opp.presupuesto)}</span>{dias!==null && <span className={`text-[10px] font-mono ${dias<=3?"text-amber-600 dark:text-amber-400":"text-gray-500"}`}>⏳ {dias}d</span>}</div><div className="text-[9px] text-gray-400">{formatFechaCorta(opp.fecha_oferta)}</div></div><ExternalLink size={14} className="text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" /></a>)})}
              </div>
            </div>
            {topEntidades.length > 0 && (<div className="bg-white dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm"><h2 className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2"><DollarSign size={12} className="text-amber-500"/>Top entidades por presupuesto</h2><div className="space-y-2">{topEntidades.map((e, i) => (<div key={i} className="flex justify-between items-center text-xs"><span className="truncate w-32 text-gray-700 dark:text-gray-300">{e.name}</span><span className="font-mono text-emerald-600 dark:text-emerald-400">{fmt(e.total)}</span></div>))}</div></div>)}
            <div className="bg-white dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm"><h2 className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2"><Clock size={12} className="text-blue-600"/>Actividad Reciente</h2><div className="space-y-3"><div className="flex items-start gap-3 pb-3 border-b border-gray-200 dark:border-gray-800"><div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0"><CheckCircle size={12} className="text-blue-600" /></div><div><p className="text-[12px] text-gray-900 dark:text-white">Portal actualizado</p><p className="text-[11px] text-gray-500">Nuevos procesos cargados</p><span className="text-[9px] text-gray-400 font-mono">hoy</span></div></div><div className="flex items-start gap-3"><div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0"><Send size={12} className="text-emerald-600" /></div><div><p className="text-[12px] text-gray-900 dark:text-white">Análisis IA completado</p><p className="text-[11px] text-gray-500">{todosProcesos.length} procesos evaluados</p><span className="text-[9px] text-gray-400 font-mono">hace 1h</span></div></div></div></div>
            {cliente?.drive_url && (<a href={cliente.drive_url} target="_blank" rel="noreferrer" className="bg-white dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex items-center gap-3 hover:shadow-sm transition-all"><FolderOpen size={18} className="text-blue-600" /><div><p className="text-[12px] font-medium text-gray-900 dark:text-white">Google Drive</p><p className="text-[10px] text-gray-500">Mis documentos</p></div></a>)}
          </div>
        </div>
        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-800 text-center"><p className="text-[9px] text-gray-400 font-mono">SOFIA by OC CONSULTORES - Monitoreo inteligente de licitaciones SECOP II</p></div>
      </main>

      {toast && (<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 dark:bg-gray-800 text-white text-xs px-4 py-2 rounded-full shadow-lg transition-all">{toast.msg}</div>)}
      {procesoADescartar && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-6 shadow-xl"><div className="text-center"><div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-3 text-2xl">⚠️</div><h3 className="text-lg font-bold text-gray-900 dark:text-white">¿Descartar proceso?</h3><p className="text-xs text-gray-500 mt-1">Pasará a tu carpeta de Descartados y podrás recuperarlo cuando quieras.</p><div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg"><div className="text-[13px] font-medium text-gray-900 dark:text-white">{procesoADescartar.entidad || "—"}</div><div className="text-[11px] text-gray-500 font-mono">{procesoADescartar.referencia}</div></div><div className="flex gap-3 mt-5"><button onClick={() => setProcesoADescartar(null)} className="flex-1 py-2 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-700 transition">Cancelar</button><button onClick={() => descartar(procesoADescartar.id)} className="flex-1 py-2 rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white text-sm font-bold hover:opacity-90 transition">Sí, descartar</button></div></div></div></div>)}
      {showBienvenida && <BienvenidaToast nombre={cliente?.nombre || ""} onClose={() => setShowBienvenida(false)} />}
    </div>
  )
}
