"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Cliente, Proceso, Comentario, SolicitudAcompanamiento } from "@/types"
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from "recharts"
import {
  Bell, Search, LogOut, ExternalLink, Send, FolderOpen, Archive,
  Clock, TrendingUp, PieChart as PieChartIcon, Zap, Save, AlertTriangle,
  FileText, CheckCircle, MapPin, Briefcase, Filter, DollarSign,
  BarChart as BarChartIcon, MessageSquare, HelpCircle, Calendar
} from "lucide-react"

// ---------- HELPERS ----------
function fmt(n: number | null | undefined): string {
  if (!n) return "—"
  const v = Number(n)
  if (v >= 1e9) return "$" + (v / 1e9).toFixed(1).replace(".", ",") + " mil M"
  if (v >= 1e6) return "$" + Math.round(v / 1e6).toLocaleString("es-CO") + "M"
  if (v >= 1e3) return "$" + Math.round(v / 1e3).toLocaleString("es-CO") + "K"
  return "$" + v.toLocaleString("es-CO")
}
function fmtFecha(f: string | null): string {
  if (!f) return "—"
  return new Date(f).toLocaleDateString("es-CO", { day: "numeric", month: "short" })
}
function diasRestantes(f: string | null): number | null {
  if (!f) return null
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const fe = new Date(f); fe.setHours(0, 0, 0, 0)
  return Math.ceil((fe.getTime() - hoy.getTime()) / 86400000)
}

const ETAPAS = ["Análisis", "Aprobación", "Organización", "Presentación", "Resultado"]

// ---------- COMPONENTES UI ----------
function Timeline({ etapa }: { etapa: number }) {
  const idx = Math.min(Math.max(0, etapa), 4)
  return (
    <div className="relative flex items-center w-full mt-4">
      <div className="absolute h-[2px] bg-[#2A3441] w-full rounded-full"></div>
      <div className="absolute h-[2px] bg-gradient-to-r from-[#00B0FF] to-[#00E676] rounded-full transition-all duration-500" style={{ width: `${(idx / 4) * 100}%` }}></div>
      {ETAPAS.map((e, i) => {
        const isActive = i <= idx
        const isCurrent = i === idx
        return (
          <div key={i} className="relative z-10 flex flex-col items-center" style={{ width: `${100 / 4}%` }}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${isActive ? "bg-gradient-to-br from-[#00B0FF] to-[#00E676] text-[#0B132B] shadow-lg" : "bg-[#2A3441] text-[#5A647A]"} ${isCurrent ? "ring-2 ring-[#00B0FF] ring-offset-2 ring-offset-[#0B132B]" : ""}`}>
              {isActive && i < idx ? "✓" : i + 1}
            </div>
            <span className="text-[9px] text-[#5A647A] mt-1 hidden md:block">{e}</span>
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
    <div style={{ position:"fixed", bottom:28, right:28, zIndex:1000, transition:"all 0.4s cubic-bezier(0.34,1.56,0.64,1)", transform:visible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.9)", opacity:visible ? 1 : 0, pointerEvents:visible ? "auto" : "none" }}>
      <div style={{ background:"#0f172a", borderRadius:18, padding:"18px 22px", boxShadow:"0 20px 60px rgba(0,0,0,0.3)", maxWidth:320, display:"flex", gap:14, alignItems:"flex-start", border:"1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ width:42, height:42, borderRadius:12, background:"linear-gradient(135deg,#1e3a8a,#2563eb)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <span style={{ fontFamily:"Syne,sans-serif", fontSize:13, fontWeight:800, color:"#fff" }}>sof<span style={{ color:"#60a5fa" }}>ia</span></span>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#f1f5f9", marginBottom:5 }}>¡Bienvenido{nombre ? `, ${nombre.split(" ")[0]}` : ""}! 👋</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.45)", lineHeight:1.6 }}>SOFIA encontró nuevas oportunidades para tu empresa.</div>
        </div>
        <button onClick={() => { setVisible(false); setTimeout(onClose, 400) }} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.25)", fontSize:18, cursor:"pointer", padding:0 }}>×</button>
      </div>
    </div>
  )
}

// ---------- COMPONENTE PRINCIPAL ----------
export default function PortalCliente() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [procesos, setProcesos] = useState<Proceso[]>([])
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

  // Filtros
  const [filtroPanel, setFiltroPanel] = useState(false)
  const [fDepto, setFDepto] = useState("")
  const [fEntidad, setFEntidad] = useState("")
  const [fModalidad, setFModalidad] = useState("")
  const [fPresMin, setFPresMin] = useState("")
  const [fPresMax, setFPresMax] = useState("")
  const [fTexto, setFTexto] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  // Estados para comentarios en solicitudes
  const [comentariosSolicitud, setComentariosSolicitud] = useState<Record<string, Comentario[]>>({})
  const [nuevoComentarioSolicitud, setNuevoComentarioSolicitud] = useState<Record<string, string>>({})
  const [enviandoComentarioSolicitud, setEnviandoComentarioSolicitud] = useState<Record<string, boolean>>({})

  useEffect(() => { if (!id) return; cargar() }, [id])

  async function cargar() {
    setLoading(true)
    const { data: c, error: ce } = await supabase.from("clientes").select("*").eq("id", id).single()
    if (ce || !c) { setError("Cliente no encontrado."); setLoading(false); return }
    setCliente(c)

    // Limpieza de procesos vencidos
    await supabase.from("procesos").delete().eq("cliente_id", id).eq("estado", "nuevo").lt("fecha_oferta", new Date().toISOString())
    const hace30 = new Date(); hace30.setDate(hace30.getDate() - 30)
    await supabase.from("procesos").delete().eq("cliente_id", id).eq("estado", "descartado").lt("updated_at", hace30.toISOString())

    // 1. Cargar todas las solicitudes completas (para mostrar en pestaña Acompañamiento)
    const { data: todasSolicitudes } = await supabase
      .from("solicitudes_acompanamiento")
      .select("*")
      .eq("cliente_id", id)
      .order("created_at", { ascending: false })
    setSolicitudes(todasSolicitudes || [])

    // 2. Obtener IDs de procesos con solicitud activa (pendiente o en_proceso) para excluirlos
    const { data: solicitudesActivas } = await supabase
      .from("solicitudes_acompanamiento")
      .select("proceso_id")
      .eq("cliente_id", id)
      .in("estado", ["pendiente", "en_proceso"])
      .not("proceso_id", "is", null)
    const idsExcluir = (solicitudesActivas || []).map(s => s.proceso_id).filter(Boolean) as string[]

    const hoy = new Date().toISOString()
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
    mostrarToast("¡Interés registrado! El proceso aparecerá en 'Mis Intereses'.", "ok")
    setSaving(prev => ({ ...prev, [procesoId]: false }))
  }

  async function enviarAcompanamiento(procesoId: string) {
    if (saving[procesoId]) return
    const proc = procesos.find(x => x.id === procesoId)
    if (!proc) return
    setSaving(prev => ({ ...prev, [procesoId]: "acompanamiento" }))

    const { error } = await supabase.from("solicitudes_acompanamiento").insert({
      cliente_id: id,
      proceso_id: procesoId,
      empresa: cliente?.nombre || "Cliente",
      numero_proceso: proc.referencia,
      enlace: proc.url || "",
      observaciones: `Solicitud de acompañamiento enviada desde el proceso.\nEntidad: ${proc.entidad}\nPresupuesto: ${fmt(proc.presupuesto)}\nObjeto: ${(proc.objeto || "").substring(0, 200)}`,
      estado: "pendiente",
      etapa_actual: 0
    })

    if (error) {
      mostrarToast("Error al enviar: " + error.message, "error")
    } else {
      mostrarToast("Solicitud enviada. Ahora está en la pestaña 'Acompañamiento'.", "ok")
      await cargar() // Recargar todo
      setTab("acompanamiento")
    }
    setSaving(prev => ({ ...prev, [procesoId]: false }))
  }

  async function descartar(procesoId: string) {
    setProcesoADescartar(null)
    const p = procesos.find(x => x.id === procesoId)
    if (p) {
      setSaliendo(prev => ({ ...prev, [procesoId]: true }))
      await supabase.from("procesos").update({ estado: "descartado", updated_at: new Date().toISOString() }).eq("id", procesoId)
      await supabase.from("feedback").insert([{ proceso_id: procesoId, cliente_id: id, accion: "descartado" }])
      setDescartados(prev => [{ ...p, estado: "descartado" }, ...prev])
      setTimeout(() => {
        setProcesos(prev => prev.filter(x => x.id !== procesoId))
        setSaliendo(prev => { const n = { ...prev }; delete n[procesoId]; return n })
      }, 320)
      mostrarToast("Proceso descartado.", "info")
    }
  }

  async function restaurar(procesoId: string) {
    await supabase.from("procesos").update({ estado: "nuevo", updated_at: new Date().toISOString() }).eq("id", procesoId)
    const p = descartados.find(x => x.id === procesoId)
    if (p) setProcesos(prev => [{ ...p, estado: "nuevo" }, ...prev])
    setDescartados(prev => prev.filter(x => x.id !== procesoId))
    mostrarToast("Proceso restaurado.", "ok")
    setTab("nuevos")
  }

  // Comentarios en solicitudes
  async function cargarComentariosSolicitud(solicitudId: string) {
    const { data } = await supabase.from("comentarios").select("*").eq("solicitud_id", solicitudId).order("created_at", { ascending: true })
    if (data) setComentariosSolicitud(prev => ({ ...prev, [solicitudId]: data }))
  }

  async function enviarComentarioSolicitud(solicitudId: string) {
    const texto = nuevoComentarioSolicitud[solicitudId]?.trim()
    if (!texto) return
    setEnviandoComentarioSolicitud(prev => ({ ...prev, [solicitudId]: true }))
    const { error } = await supabase.from("comentarios").insert({
      solicitud_id: solicitudId,
      cliente_id: id,
      autor: "cliente",
      texto
    })
    if (!error) {
      await cargarComentariosSolicitud(solicitudId)
      setNuevoComentarioSolicitud(prev => ({ ...prev, [solicitudId]: "" }))
      mostrarToast("Comentario enviado.", "ok")
    } else {
      mostrarToast("Error al enviar comentario.", "error")
    }
    setEnviandoComentarioSolicitud(prev => ({ ...prev, [solicitudId]: false }))
  }

  function mostrarToast(msg: string, tipo: string) { setToast({ msg, tipo }); setTimeout(() => setToast(null), 3800) }
  function limpiarFiltros() {
    setFDepto(""); setFEntidad(""); setFModalidad(""); setFPresMin(""); setFPresMax(""); setFTexto(""); setSearchTerm("")
  }

  const nuevos = procesos.filter(p => p.estado === "nuevo")
  const interesados = procesos.filter(p => p.estado === "interesado")
  const presTotal = procesos.reduce((s, p) => s + Number(p.presupuesto || 0), 0)
  const presInteresados = interesados.reduce((s, p) => s + Number(p.presupuesto || 0), 0)

  const deptos = [...new Set(procesos.map(p => p.departamento).filter(Boolean))].sort() as string[]
  const entidades = [...new Set(procesos.map(p => p.entidad).filter(Boolean))].sort() as string[]
  const modalidades = [...new Set(procesos.map(p => p.modalidad).filter(Boolean))].sort() as string[]

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

  if (loading) return <div className="min-h-screen bg-[#0B132B] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00B0FF]"></div></div>
  if (error) return <div className="min-h-screen bg-[#0B132B] flex items-center justify-center text-red-500">{error}</div>

  const tooltipStyle = {
    backgroundColor: '#1C2538',
    border: '1px solid #2A3441',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '11px',
    color: '#FFFFFF',
  }

  return (
    <div className="min-h-screen bg-[#0B132B] font-sans antialiased">
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0B132B; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #0B132B; }
        ::-webkit-scrollbar-thumb { background: #2A3441; border-radius: 10px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes slideOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(-6px) scale(0.98); } }
        @keyframes toastIn { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .saliendo { animation: slideOut 0.32s ease forwards !important; }
        .proc-card { transition: box-shadow 0.2s, border-color 0.2s, transform 0.15s; }
        .proc-card:hover { box-shadow: 0 8px 28px rgba(0, 176, 255, 0.1) !important; transform: translateY(-1px); }
        .btn { transition: all 0.15s; }
        .btn:hover { opacity: 0.85 !important; }
      `}</style>

      <header className="sticky top-0 z-40 bg-[#0B132B]/90 backdrop-blur-xl border-b border-[#1C2538]">
        <div className="flex items-center justify-between px-6 py-4 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#00B0FF] to-[#00E676] rounded-lg flex items-center justify-center shadow-lg"><span className="text-[#0B132B] font-black text-xl">OC</span></div>
            <div><h1 className="text-white font-bold text-lg tracking-tight">OC CONSULTORES</h1><p className="text-[10px] text-[#5A647A] font-mono tracking-wider">TAX & LEGAL - COLOMBIA</p></div>
          </div>
          <div className="hidden md:flex bg-[#0F1622] p-1 rounded-xl border border-[#1C2538]">
            {[
              { id: "nuevos", label: "Nuevos", count: nuevos.length },
              { id: "interesado", label: "Mis Intereses", count: interesados.length },
              { id: "descartados", label: "Descartados", count: descartados.length },
              { id: "acompanamiento", label: "Acompañamiento", count: solicitudes.length }
            ].map((tabItem) => (
              <button key={tabItem.id} onClick={() => { setTab(tabItem.id); limpiarFiltros(); setFiltroPanel(false) }} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all ${tab === tabItem.id ? "bg-gradient-to-r from-[#00B0FF] to-[#0091EA] text-white shadow-md" : "text-[#8B93A7] hover:text-white hover:bg-[#1C2538]"}`}>
                {tabItem.label}{tabItem.count > 0 && <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${tab === tabItem.id ? "bg-white/20 text-white" : "bg-[#1C2538] text-[#A0A8B8]"}`}>{tabItem.count}</span>}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <div className="relative"><input type="text" placeholder="Buscar proceso..." className="bg-[#0F1622] border border-[#1C2538] rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-white placeholder:text-[#5A647A] focus:outline-none focus:border-[#00B0FF] transition-all w-40 md:w-56" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /><Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5A647A]" /></div>
            <button className="text-[#5A647A] hover:text-[#00B0FF] transition-all relative" onClick={() => mostrarToast("🔔 No hay notificaciones nuevas", "info")}><Bell size={18} /><span className="absolute -top-1 -right-1 w-2 h-2 bg-[#FF5252] rounded-full"></span></button>
            <div className="flex items-center gap-3 pl-3 border-l border-[#1C2538]">
              {cliente && (<><div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00B0FF] to-[#00E676] flex items-center justify-center text-[#0B132B] font-bold text-sm">{(cliente.nombre || "").split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()}</div><div className="hidden sm:block"><p className="text-white text-[13px] font-medium">{cliente.nombre.split(" ").slice(0, 2).join(" ")}</p><p className="text-[10px] text-[#5A647A]">{cliente.email_destinatario || "cliente@occonsultores.com"}</p></div></>)}
              <button onClick={() => { document.cookie = "secop_token=;max-age=0;path=/"; localStorage.clear(); router.push("/login") }} className="text-[#5A647A] hover:text-[#FF5252] transition-all ml-2"><LogOut size={16} /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* COLUMNA IZQUIERDA - GRÁFICOS (simplificada) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-[#0F1622] rounded-xl border border-[#1C2538] p-5">
              <div className="flex items-center gap-2 mb-4"><PieChartIcon size={16} className="text-[#00E676]" /><h2 className="text-[13px] font-bold text-white uppercase tracking-wider">Distribución presupuestaria</h2></div>
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[{ name: "Interesados", value: presInteresados, color: "#00E676" }, { name: "En análisis", value: presTotal - presInteresados, color: "#FFB74D" }]} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none"><Cell fill="#00E676" /><Cell fill="#FFB74D" /></Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [fmt(value), 'Presupuesto']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#00E676]"/><span className="text-[#A0A8B8]">Interesados</span></div><span className="text-white font-mono">{fmt(presInteresados)}</span></div>
                <div className="flex items-center justify-between text-[11px]"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#FFB74D]"/><span className="text-[#A0A8B8]">En análisis</span></div><span className="text-white font-mono">{fmt(presTotal - presInteresados)}</span></div>
              </div>
            </div>
          </div>

          {/* COLUMNA CENTRAL */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white flex items-center gap-2"><Zap size={18} className="text-[#00E676]" />{tab === "nuevos" ? "Procesos Nuevos" : tab === "interesado" ? "Mis Intereses" : tab === "acompanamiento" ? "Mis Solicitudes de Acompañamiento" : "Descartados"}</h2>
                {(tab === "nuevos" || tab === "interesado") && (
                  <button onClick={() => setFiltroPanel(!filtroPanel)} className={`flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${filtrosActivos > 0 ? "bg-[#00B0FF] text-white" : "bg-[#1C2538] text-[#A0A8B8] hover:bg-[#2A3441]"}`}>
                    <Filter size={12} /> Filtrar {filtrosActivos > 0 && `(${filtrosActivos})`}
                  </button>
                )}
              </div>
              <div className="text-[11px] text-[#5A647A] font-mono">
                {tab === "acompanamiento" ? `${solicitudes.length} solicitud(es)` : `${listaActual.length} oportunidad(es) · ${fmt(listaActual.reduce((s, p) => s + Number(p.presupuesto || 0), 0))}`}
              </div>
            </div>

            {filtroPanel && (tab === "nuevos" || tab === "interesado") && (
              <div className="bg-[#0F1622] border border-[#1C2538] rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select value={fDepto} onChange={e => setFDepto(e.target.value)} className="bg-[#1C2538] border border-[#2A3441] rounded-lg px-3 py-2 text-[12px] text-white"><option value="">Todos los departamentos</option>{deptos.map(d => <option key={d} value={d}>{d}</option>)}</select>
                  <select value={fEntidad} onChange={e => setFEntidad(e.target.value)} className="bg-[#1C2538] border border-[#2A3441] rounded-lg px-3 py-2 text-[12px] text-white"><option value="">Todas las entidades</option>{entidades.map(e => <option key={e} value={e}>{e.substring(0, 45)}</option>)}</select>
                  <select value={fModalidad} onChange={e => setFModalidad(e.target.value)} className="bg-[#1C2538] border border-[#2A3441] rounded-lg px-3 py-2 text-[12px] text-white"><option value="">Todas las modalidades</option>{modalidades.map(m => <option key={m} value={m}>{m}</option>)}</select>
                  <input type="text" placeholder="Buscar por texto..." value={fTexto} onChange={e => setFTexto(e.target.value)} className="bg-[#1C2538] border border-[#2A3441] rounded-lg px-3 py-2 text-[12px] text-white placeholder:text-[#5A647A]" />
                  <div className="flex items-center gap-2"><input type="number" placeholder="Pres. mín. (M)" value={fPresMin} onChange={e => setFPresMin(e.target.value)} className="flex-1 bg-[#1C2538] border border-[#2A3441] rounded-lg px-3 py-2 text-[12px] text-white" /><span className="text-[#5A647A]">–</span><input type="number" placeholder="Pres. máx. (M)" value={fPresMax} onChange={e => setFPresMax(e.target.value)} className="flex-1 bg-[#1C2538] border border-[#2A3441] rounded-lg px-3 py-2 text-[12px] text-white" /></div>
                </div>
                <div className="flex justify-end gap-2"><button onClick={limpiarFiltros} className="px-3 py-1.5 text-[11px] text-[#A0A8B8] bg-[#1C2538] rounded-lg hover:bg-[#2A3441]">Limpiar</button><button onClick={() => setFiltroPanel(false)} className="px-3 py-1.5 text-[11px] font-bold text-white bg-[#00B0FF] rounded-lg">Aplicar · {listaActual.length}</button></div>
              </div>
            )}

            {/* PESTAÑA ACOMPAÑAMIENTO */}
            {tab === "acompanamiento" && (
              <div className="space-y-4">
                {solicitudes.length === 0 ? (
                  <div className="text-center py-16 bg-[#0F1622] rounded-xl border border-[#1C2538]">
                    <div className="text-5xl mb-4">📋</div>
                    <div className="text-[15px] font-semibold text-white mb-2">No tienes solicitudes de acompañamiento</div>
                    <div className="text-[13px] text-[#5A647A]">Usa el botón "Enviar a SOFIA (Acompañamiento)" en cualquier proceso.</div>
                  </div>
                ) : (
                  solicitudes.map(sol => {
                    const proceso = procesos.find(p => p.id === sol.proceso_id) || descartados.find(p => p.id === sol.proceso_id)
                    if (!comentariosSolicitud[sol.id]) cargarComentariosSolicitud(sol.id)
                    const etapaActual = sol.etapa_actual ?? 0
                    const nombreEtapa = sol.etapa_nombre || ETAPAS[etapaActual]
                    return (
                      <div key={sol.id} className="bg-[#0F1622] rounded-xl border border-[#1C2538] p-5">
                        <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
                          <div>
                            <div className="font-bold text-white text-lg">{proceso?.entidad || "Proceso"}</div>
                            <div className="text-xs text-[#00B0FF] font-mono">{proceso?.referencia || sol.numero_proceso}</div>
                          </div>
                          <div className={`text-xs px-2 py-1 rounded-full ${sol.estado === 'pendiente' ? 'bg-yellow-500/20 text-yellow-400' : sol.estado === 'en_proceso' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                            {sol.estado === 'pendiente' ? 'Pendiente' : sol.estado === 'en_proceso' ? 'En proceso' : 'Atendida'}
                          </div>
                        </div>
                        <div className="bg-[#1C2538] rounded-lg p-3 mb-4">
                          <p className="text-sm text-[#A0A8B8]">{proceso?.objeto || sol.observaciones}</p>
                          <div className="flex gap-3 mt-2 text-xs">
                            {proceso?.departamento && <span><MapPin size={12} className="inline mr-1" />{proceso.departamento}</span>}
                            {proceso?.modalidad && <span><Briefcase size={12} className="inline mr-1" />{proceso.modalidad}</span>}
                            <span className="text-[#00E676]">{fmt(proceso?.presupuesto)}</span>
                          </div>
                          {sol.enlace && <a href={sol.enlace} target="_blank" rel="noreferrer" className="text-xs text-[#60a5fa] block mt-2">Ver SECOP ↗</a>}
                        </div>
                        <div className="border-t border-[#1C2538] pt-3 mb-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[11px] font-bold text-[#00B0FF] uppercase tracking-wider">Seguimiento de gestión</span>
                            <span className="text-[10px] text-[#00E676]">{nombreEtapa}</span>
                          </div>
                          <Timeline etapa={etapaActual} />
                          {sol[`fecha_etapa_${etapaActual}`] && (
                            <div className="mt-2 text-[11px] text-[#5A647A] flex items-center gap-2">
                              <Calendar size={12} /> Fecha registrada: {new Date(sol[`fecha_etapa_${etapaActual}`]).toLocaleString()}
                            </div>
                          )}
                          <div className="mt-2 text-[11px] text-[#5A647A]">
                            {etapaActual === 0 ? "El equipo OC iniciará el análisis pronto." : `Estamos en la etapa ${nombreEtapa}.`}
                          </div>
                        </div>
                        <div className="border-t border-[#1C2538] pt-3">
                          <span className="text-[11px] font-bold text-[#00B0FF] flex items-center gap-1 mb-2"><MessageSquare size={12}/> Comentarios</span>
                          <div className="space-y-2 max-h-40 overflow-y-auto mb-2">
                            {(comentariosSolicitud[sol.id] || []).map(c => (
                              <div key={c.id} className={`text-xs p-2 rounded ${c.autor === 'admin' ? 'bg-[#00B0FF10] border-l-2 border-[#00B0FF]' : 'bg-[#1C2538]'}`}>
                                <div className="flex justify-between text-[10px] text-[#5A647A] mb-1">
                                  <span className="font-bold">{c.autor === 'admin' ? 'OC Consultores' : 'Tú'}</span>
                                  <span>{new Date(c.created_at).toLocaleString()}</span>
                                </div>
                                <p className="text-white/80">{c.texto}</p>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <textarea rows={1} placeholder="Escribe un comentario o consulta..." className="flex-1 p-2 bg-[#1C2538] rounded text-white text-xs resize-none" value={nuevoComentarioSolicitud[sol.id] || ""} onChange={e => setNuevoComentarioSolicitud(prev => ({ ...prev, [sol.id]: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarComentarioSolicitud(sol.id) } }} />
                            <button onClick={() => enviarComentarioSolicitud(sol.id)} disabled={enviandoComentarioSolicitud[sol.id]} className="px-3 py-1.5 bg-[#00B0FF] rounded text-white text-xs font-bold"><Send size={12}/></button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* PROCESOS NUEVOS O INTERESADOS */}
            {(tab === "nuevos" || tab === "interesado") && (
              <div className="space-y-4 animate-fadeIn">
                {listaActual.length === 0 ? (
                  <div className="text-center py-16 bg-[#0F1622] rounded-xl border border-[#1C2538]">
                    <div className="text-5xl mb-4">{tab === "interesado" ? "⭐" : "📋"}</div>
                    <div className="text-[15px] font-semibold text-white mb-2">No hay procesos para mostrar</div>
                    <div className="text-[13px] text-[#5A647A]">Los procesos enviados a acompañamiento están en su propia pestaña.</div>
                  </div>
                ) : (
                  listaActual.map(p => {
                    const dias = diasRestantes(p.fecha_oferta)
                    const urgente = dias !== null && dias <= 3 && dias >= 0
                    const isInt = p.estado === "interesado"
                    const isSaving = saving[p.id]
                    const isSaliendo = saliendo[p.id]
                    return (
                      <div key={p.id} className={`proc-card bg-[#0F1622] rounded-xl border transition-all duration-300 ${isSaliendo ? "saliendo" : ""} ${isInt ? "border-[#00B0FF40]" : urgente ? "border-[#FF525240]" : "border-[#1C2538]"}`}>
                        <div className="p-5">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-mono text-[#00B0FF] bg-[#00B0FF10] px-2 py-0.5 rounded-full">{p.referencia}</span>
                                {urgente && <span className="text-[10px] font-mono text-[#FF5252] bg-[#FF525210] px-2 py-0.5 rounded-full animate-pulse">⚡ Cierre urgente</span>}
                              </div>
                              <h3 className="text-[15px] font-bold text-white mt-2 tracking-tight">{p.entidad || "—"}</h3>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-[22px] font-black text-[#00E676] font-mono tracking-tight">{fmt(p.presupuesto)}</div>
                              <div className="flex items-center justify-end gap-1 mt-1"><Clock size={12} className="text-[#5A647A]" /><span className={`text-[11px] font-mono ${urgente ? "text-[#FF5252]" : "text-[#5A647A]"}`}>Cierra en {dias}d</span></div>
                            </div>
                          </div>
                          <p className="text-[13px] text-[#A0A8B8] leading-relaxed mt-3 line-clamp-2">{p.objeto || "Sin descripción"}</p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {p.departamento && <span className="flex items-center gap-1 text-[11px] text-[#5A647A] bg-[#1C2538] px-2 py-1 rounded-md"><MapPin size={10} /> {p.departamento}</span>}
                            {p.modalidad && <span className="flex items-center gap-1 text-[11px] text-[#5A647A] bg-[#1C2538] px-2 py-1 rounded-md"><Briefcase size={10} /> {p.modalidad}</span>}
                            {p.resultado_ia && <span className="text-[11px] text-[#00E676] bg-[#00E67610] px-2 py-1 rounded-md">✓ IA</span>}
                            {isInt && <span className="text-[11px] text-[#00B0FF] bg-[#00B0FF10] px-2 py-1 rounded-md border border-[#00B0FF30]">✓ Me interesa</span>}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-[#1C2538] mt-3">
                            {!isInt && (
                              <button className="btn flex items-center gap-2 bg-[#00E67620] hover:bg-[#00E67630] text-[#00E676] text-[12px] font-bold px-4 py-2 rounded-lg transition-all" onClick={() => marcarInteres(p.id)} disabled={!!isSaving}>
                                {isSaving && isSaving !== "acompanamiento" ? "..." : "✓ Me interesa"}
                              </button>
                            )}
                            <button className="btn flex items-center gap-2 bg-gradient-to-r from-[#00B0FF] to-[#0091EA] hover:from-[#0091EA] hover:to-[#0077B6] text-white text-[12px] font-bold px-4 py-2 rounded-lg transition-all shadow-md" onClick={() => enviarAcompanamiento(p.id)} disabled={isSaving === "acompanamiento"}>
                              <HelpCircle size={14} /> {isSaving === "acompanamiento" ? "Enviando..." : "Enviar a SOFIA (Acompañamiento)"}
                            </button>
                            <button className="btn flex items-center gap-1 text-[12px] text-[#A0A8B8] hover:text-white bg-[#1C2538] hover:bg-[#2A3441] px-3 py-2 rounded-lg transition-all" onClick={() => setProcesoADescartar(p)} disabled={!!isSaving}>
                              <Archive size={12} /> Descartar
                            </button>
                            <a href={p.url || "#"} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[12px] text-[#A0A8B8] hover:text-white bg-[#1C2538] hover:bg-[#2A3441] px-3 py-2 rounded-lg transition-all ml-auto">
                              <ExternalLink size={12} /> Ver SECOP
                            </a>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* DESCARTADOS */}
            {tab === "descartados" && (
              <div className="space-y-3">
                {descartados.length === 0 ? (
                  <div className="text-center py-16 bg-[#0F1622] rounded-xl border border-[#1C2538]"><div className="text-5xl mb-4">🗑</div><div className="text-[15px] font-semibold text-white mb-2">Sin procesos descartados</div><div className="text-[13px] text-[#5A647A]">Se eliminan automáticamente después de 30 días.</div></div>
                ) : (
                  descartados.map(p => (
                    <div key={p.id} className="bg-[#0F1622] rounded-xl border border-[#1C2538] p-5 opacity-80">
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <div><h3 className="text-[14px] font-semibold text-[#A0A8B8]">{p.entidad || "—"}</h3><div className="text-[10px] text-[#5A647A] font-mono">{p.referencia}{p.departamento ? ` · ${p.departamento}` : ""}</div></div>
                        <div className="text-[18px] font-bold text-[#5A647A] font-mono">{fmt(p.presupuesto)}</div>
                      </div>
                      <p className="text-[12px] text-[#5A647A] mb-4 line-clamp-2">{p.objeto || ""}</p>
                      <div className="flex gap-2">
                        <button className="btn flex items-center gap-1 text-[12px] text-[#00B0FF] bg-[#1C2538] hover:bg-[#2A3441] px-3 py-2 rounded-lg transition-all" onClick={() => restaurar(p.id)}>↩ Restaurar</button>
                        {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1 text-[12px] text-[#5A647A] bg-[#1C2538] hover:bg-[#2A3441] px-3 py-2 rounded-lg transition-all"><ExternalLink size={12} /> Ver SECOP</a>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA - MÉTRICAS */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-[#0F1622] rounded-xl border border-[#1C2538] p-5">
              <h2 className="text-[13px] font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2"><DollarSign size={14} className="text-[#00E676]" />Top Oportunidades</h2>
              <div className="space-y-3">
                {[...procesos].sort((a,b)=>(b.presupuesto||0)-(a.presupuesto||0)).slice(0,4).map((opp,idx)=>{
                  const dias=diasRestantes(opp.fecha_oferta);
                  return (
                    <a key={idx} href={opp.url||"#"} target="_blank" rel="noreferrer" className="flex items-center justify-between p-2 rounded-lg hover:bg-[#1C2538] transition-all cursor-pointer group">
                      <div className="flex-1 min-w-0"><p className="text-[12px] font-medium text-white truncate">{opp.entidad||"—"}</p><div className="flex items-center gap-2 mt-0.5"><span className="text-[11px] font-mono text-[#00E676]">{fmt(opp.presupuesto)}</span>{dias!==null && <span className={`text-[10px] font-mono ${dias<=3?"text-[#FF5252]":"text-[#5A647A]"}`}>⏳ {dias}d</span>}</div></div>
                      <ExternalLink size={14} className="text-[#5A647A] group-hover:text-[#00B0FF] transition-colors" />
                    </a>
                  )
                })}
              </div>
            </div>
            <div className="bg-[#0F1622] rounded-xl border border-[#1C2538] p-5">
              <h2 className="text-[13px] font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2"><Clock size={14} className="text-[#00B0FF]" />Actividad Reciente</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3 pb-3 border-b border-[#1C2538]"><div className="w-6 h-6 rounded-full bg-[#1C2538] flex items-center justify-center flex-shrink-0"><CheckCircle size={12} className="text-[#00B0FF]" /></div><div><p className="text-[12px] text-white">Portal actualizado</p><p className="text-[11px] text-[#5A647A]">Nuevos procesos cargados</p><span className="text-[9px] text-[#2A3441] font-mono">hoy</span></div></div>
                <div className="flex items-start gap-3"><div className="w-6 h-6 rounded-full bg-[#1C2538] flex items-center justify-center flex-shrink-0"><Send size={12} className="text-[#00E676]" /></div><div><p className="text-[12px] text-white">Análisis IA completado</p><p className="text-[11px] text-[#5A647A]">{procesos.length} procesos evaluados</p><span className="text-[9px] text-[#2A3441] font-mono">hace 1h</span></div></div>
              </div>
            </div>
            {cliente?.drive_url && (
              <a href={cliente.drive_url} target="_blank" rel="noreferrer" className="bg-[#0F1622] rounded-xl border border-[#1C2538] p-4 flex items-center gap-3 hover:border-[#00B0FF40] transition-all">
                <FolderOpen size={20} className="text-[#00B0FF]" /><div><p className="text-[12px] font-medium text-white">Google Drive</p><p className="text-[10px] text-[#5A647A]">Mis documentos</p></div>
              </a>
            )}
          </div>
        </div>
        <div className="mt-8 pt-4 border-t border-[#1C2538] text-center"><p className="text-[10px] text-[#2A3441] font-mono">SOFIA by OC CONSULTORES - Monitoreo inteligente de licitaciones SECOP II</p></div>
      </main>

      {toast && (<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] animate-[toastIn_0.25s_ease]" style={{ background: toast.tipo === "ok" ? "#00E676" : "#2A3441", color: "#fff", padding: "12px 24px", borderRadius: "12px", fontSize: "13px", fontWeight: 500, whiteSpace: "nowrap", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>{toast.msg}</div>)}
      {procesoADescartar && (<div className="fixed inset-0 bg-[#0B132B]/80 z-[200] flex items-center justify-center p-5 backdrop-blur-sm" onClick={() => setProcesoADescartar(null)}><div className="bg-[#0F1622] rounded-xl border border-[#1C2538] p-6 max-w-md w-full" onClick={e => e.stopPropagation()}><div className="text-center mb-4"><div className="w-14 h-14 rounded-full bg-[#FF525220] border border-[#FF525240] flex items-center justify-center mx-auto mb-4 text-2xl">⚠</div><h3 className="text-lg font-bold text-white mb-2">¿Descartar proceso?</h3><p className="text-[13px] text-[#A0A8B8]">Pasará a tu carpeta de Descartados y podrás recuperarlo cuando quieras.</p><div className="mt-4 p-3 bg-[#1C2538] rounded-lg"><div className="text-[13px] font-medium text-white">{procesoADescartar.entidad || "—"}</div><div className="text-[11px] text-[#5A647A] font-mono">{procesoADescartar.referencia}</div></div></div><div className="flex gap-3"><button onClick={() => setProcesoADescartar(null)} className="flex-1 py-2.5 rounded-lg bg-[#1C2538] text-[#A0A8B8] text-[13px] font-medium hover:bg-[#2A3441] transition-all">Cancelar</button><button onClick={() => descartar(procesoADescartar.id)} className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-[#FF5252] to-[#DC2626] text-white text-[13px] font-bold hover:opacity-90 transition-all">Sí, descartar</button></div></div></div>)}

      {showBienvenida && <BienvenidaToast nombre={cliente?.nombre || ""} onClose={() => setShowBienvenida(false)} />}
    </div>
  )
}
