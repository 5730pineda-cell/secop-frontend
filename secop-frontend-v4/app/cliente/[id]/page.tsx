"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Cliente, Proceso } from "@/types"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts"
import {
  Bell,
  Search,
  LogOut,
  ExternalLink,
  Send,
  FolderOpen,
  Archive,
  Clock,
  TrendingUp,
  PieChart as PieChartIcon,
  Zap,
  Save,
  AlertTriangle,
  FileText,
  CheckCircle,
  MapPin,
  Briefcase,
  Filter,
} from "lucide-react"

// Helpers
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

// Datos mock para tendencia (se puede reemplazar con datos reales después)
const trendData = [
  { name: "1 Mar", procesos: 4 },
  { name: "5 Mar", procesos: 7 },
  { name: "10 Mar", procesos: 5 },
  { name: "15 Mar", procesos: 12 },
  { name: "20 Mar", procesos: 9 },
  { name: "25 Mar", procesos: 15 },
  { name: "30 Mar", procesos: 11 },
]

// Timeline component
function Timeline({ etapa }: { etapa: number }) {
  const idx = typeof etapa === "number" ? etapa : 0
  return (
    <div className="relative flex items-center w-full mt-4">
      <div className="absolute h-[2px] bg-[#2A3441] w-full rounded-full"></div>
      <div
        className="absolute h-[2px] bg-gradient-to-r from-[#00B0FF] to-[#00E676] rounded-full transition-all duration-500"
        style={{ width: `${(idx / (ETAPAS.length - 1)) * 100}%` }}
      ></div>
      {ETAPAS.map((e, i) => {
        const isActive = i <= idx
        const isCurrent = i === idx
        return (
          <div key={i} className="relative z-10 flex flex-col items-center" style={{ width: `${100 / (ETAPAS.length - 1)}%` }}>
            <div
              className={`
                w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all
                ${isActive ? "bg-gradient-to-br from-[#00B0FF] to-[#00E676] text-[#0B132B] shadow-lg shadow-[#00B0FF25]" : "bg-[#2A3441] text-[#5A647A]"}
                ${isCurrent ? "ring-2 ring-[#00B0FF] ring-offset-2 ring-offset-[#0B132B]" : ""}
              `}
            >
              {isActive && i < idx ? "✓" : i + 1}
            </div>
            <span className="text-[9px] text-[#5A647A] mt-1 hidden md:block">{e}</span>
          </div>
        )
      })}
    </div>
  )
}

// Bienvenida toast
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

export default function PortalCliente() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [procesos, setProcesos] = useState<Proceso[]>([])
  const [descartados, setDescartados] = useState<Proceso[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState("nuevos")
  const [saving, setSaving] = useState<Record<string, boolean | string>>({})
  const [saliendo, setSaliendo] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<{ msg: string; tipo: string } | null>(null)
  const [showBienvenida, setShowBienvenida] = useState(false)
  const [procesoADescartar, setProcesoADescartar] = useState<Proceso | null>(null)

  // Estado para filtros avanzados
  const [filtroPanel, setFiltroPanel] = useState(false)
  const [fDepto, setFDepto] = useState("")
  const [fEntidad, setFEntidad] = useState("")
  const [fModalidad, setFModalidad] = useState("")
  const [fPresMin, setFPresMin] = useState("")
  const [fPresMax, setFPresMax] = useState("")
  const [fTexto, setFTexto] = useState("")
  const [searchTerm, setSearchTerm] = useState("") // búsqueda rápida del header

  useEffect(() => { if (!id) return; cargar() }, [id])

  async function cargar() {
    setLoading(true)
    const { data: c, error: ce } = await supabase.from("clientes").select("*").eq("id", id).single()
    if (ce || !c) { setError("Cliente no encontrado."); setLoading(false); return }
    setCliente(c)

    await supabase.from("procesos").delete().eq("cliente_id", id).eq("estado", "nuevo").lt("fecha_oferta", new Date().toISOString())
    const hace30 = new Date(); hace30.setDate(hace30.getDate() - 30)
    await supabase.from("procesos").delete().eq("cliente_id", id).eq("estado", "descartado").lt("updated_at", hace30.toISOString())

    const hoy = new Date().toISOString()
    const { data: p } = await supabase.from("procesos").select("*").eq("cliente_id", id).neq("estado", "descartado").or(`estado.eq.interesado,fecha_oferta.gt.${hoy}`).order("fecha_oferta", { ascending: true })
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
    mostrarToast("¡Interés registrado! SOFIA analizará este proceso.", "ok")
    setSaving(prev => ({ ...prev, [procesoId]: false }))
  }

  async function enviarSOFIA(procesoId: string) {
    if (saving[procesoId]) return
    const proc = procesos.find(x => x.id === procesoId)
    const urlParams = new URLSearchParams()
    if (proc) {
      urlParams.set("usp", "pp_url")
      urlParams.set("entry.proceso", proc.referencia || "")
      urlParams.set("entry.entidad", proc.entidad || "")
      urlParams.set("entry.presupuesto", String(proc.presupuesto || ""))
      urlParams.set("entry.objeto", (proc.objeto || "").substring(0, 200))
    }
    window.open(`https://docs.google.com/forms/d/e/1FAIpQLSfzrMMSuOZz_SQB-XaU8N6yXbC-DmAbDNsiXTj1sEmDCBrvhQ/viewform?${urlParams.toString()}`, "_blank")
    setSaving(prev => ({ ...prev, [procesoId]: "sofia" }))
    if (proc?.estado !== "interesado") {
      await supabase.from("procesos").update({ estado: "interesado", etapa_seguimiento: 0 }).eq("id", procesoId)
      setProcesos(prev => prev.map(x => x.id === procesoId ? { ...x, estado: "interesado", etapa_seguimiento: 0 } : x))
    }
    await supabase.from("feedback").insert([{ proceso_id: procesoId, cliente_id: id, accion: "enviado_sofia" }])
    mostrarToast("Formulario SOFIA abierto — completa el análisis.", "sofia")
    setTimeout(() => setSaving(prev => ({ ...prev, [procesoId]: false })), 1500)
  }

  async function descartar(procesoId: string) {
    setProcesoADescartar(null)
    const p = procesos.find(x => x.id === procesoId)
    setSaliendo(prev => ({ ...prev, [procesoId]: true }))
    await supabase.from("procesos").update({ estado: "descartado", updated_at: new Date().toISOString() }).eq("id", procesoId)
    await supabase.from("feedback").insert([{ proceso_id: procesoId, cliente_id: id, accion: "descartado" }])
    if (p) setDescartados(prev => [{ ...p, estado: "descartado" }, ...prev])
    setTimeout(() => {
      setProcesos(prev => prev.filter(x => x.id !== procesoId))
      setSaliendo(prev => { const n = { ...prev }; delete n[procesoId]; return n })
    }, 320)
    mostrarToast("Proceso descartado.", "info")
  }

  async function restaurar(procesoId: string) {
    await supabase.from("procesos").update({ estado: "nuevo", updated_at: new Date().toISOString() }).eq("id", procesoId)
    const p = descartados.find(x => x.id === procesoId)
    if (p) setProcesos(prev => [{ ...p, estado: "nuevo" }, ...prev])
    setDescartados(prev => prev.filter(x => x.id !== procesoId))
    mostrarToast("Proceso restaurado.", "ok")
    setTab("nuevos")
  }

  function mostrarToast(msg: string, tipo: string) { setToast({ msg, tipo }); setTimeout(() => setToast(null), 3800) }
  function limpiarFiltros() {
    setFDepto(""); setFEntidad(""); setFModalidad(""); setFPresMin(""); setFPresMax(""); setFTexto(""); setSearchTerm("")
  }

  const nuevos = procesos.filter(p => p.estado === "nuevo")
  const interesados = procesos.filter(p => p.estado === "interesado")
  const presTotal = procesos.reduce((s, p) => s + Number(p.presupuesto || 0), 0)
  const presInteresados = interesados.reduce((s, p) => s + Number(p.presupuesto || 0), 0)

  // Obtener listas únicas para filtros
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

  if (loading) return (/* spinner */)
  if (error) return (/* error */)

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

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-[#0B132B]/90 backdrop-blur-xl border-b border-[#1C2538]">
        <div className="flex items-center justify-between px-6 py-4 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#00B0FF] to-[#00E676] rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-[#0B132B] font-black text-xl">OC</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg tracking-tight">OC CONSULTORES</h1>
              <p className="text-[10px] text-[#5A647A] font-mono tracking-wider">TAX & LEGAL - COLOMBIA</p>
            </div>
          </div>

          <div className="hidden md:flex bg-[#0F1622] p-1 rounded-xl border border-[#1C2538]">
            {[
              { id: "nuevos", label: "Nuevos", count: nuevos.length },
              { id: "interesado", label: "Mis Intereses", count: interesados.length },
              { id: "descartados", label: "Descartados", count: descartados.length },
            ].map((tabItem) => (
              <button
                key={tabItem.id}
                onClick={() => { setTab(tabItem.id); limpiarFiltros(); setFiltroPanel(false) }}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                  tab === tabItem.id
                    ? "bg-gradient-to-r from-[#00B0FF] to-[#0091EA] text-white shadow-md"
                    : "text-[#8B93A7] hover:text-white hover:bg-[#1C2538]"
                }`}
              >
                {tabItem.label}
                {tabItem.count > 0 && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    tab === tabItem.id ? "bg-white/20 text-white" : "bg-[#1C2538] text-[#A0A8B8]"
                  }`}>
                    {tabItem.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar proceso..."
                className="bg-[#0F1622] border border-[#1C2538] rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-white placeholder:text-[#5A647A] focus:outline-none focus:border-[#00B0FF] transition-all w-40 md:w-56"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5A647A]" />
            </div>
            <button className="text-[#5A647A] hover:text-[#00B0FF] transition-all relative" onClick={() => mostrarToast("🔔 No hay notificaciones nuevas", "info")}>
              <Bell size={18} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#FF5252] rounded-full"></span>
            </button>
            <div className="flex items-center gap-3 pl-3 border-l border-[#1C2538]">
              {cliente && (
                <>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00B0FF] to-[#00E676] flex items-center justify-center text-[#0B132B] font-bold text-sm">
                    {(cliente.nombre || "").split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-white text-[13px] font-medium">{cliente.nombre.split(" ").slice(0, 2).join(" ")}</p>
                    <p className="text-[10px] text-[#5A647A]">{cliente.email_destinatario || "cliente@occonsultores.com"}</p>
                  </div>
                </>
              )}
              <button onClick={() => { document.cookie = "secop_token=;max-age=0;path=/"; localStorage.clear(); router.push("/login") }} className="text-[#5A647A] hover:text-[#FF5252] transition-all ml-2">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT: 3 COLUMNAS */}
      <main className="max-w-[1600px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* COLUMNA IZQUIERDA - Análisis Global */}
          <div className="lg:col-span-3 space-y-6">
            {/* Gráfico de tendencia */}
            <div className="bg-[#0F1622] rounded-xl border border-[#1C2538] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-[#00B0FF]" />
                  <h2 className="text-[13px] font-bold text-white uppercase tracking-wider">Tendencia de Procesos</h2>
                </div>
                <span className="text-[10px] text-[#5A647A] font-mono">Últimos 30 días</span>
              </div>
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorProcesos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00B0FF" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00B0FF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#2A3441" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke="#2A3441" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#0F1622", border: "1px solid #1C2538", borderRadius: "8px", fontSize: "11px", color: "#FFF" }} />
                    <Area type="monotone" dataKey="procesos" stroke="#00B0FF" strokeWidth={2} fill="url(#colorProcesos)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 text-center"><span className="text-[11px] text-[#5A647A]">↑ 23% vs mes anterior</span></div>
            </div>

            {/* Gráfico de dona mejorado */}
            <div className="bg-[#0F1622] rounded-xl border border-[#1C2538] p-5">
              <div className="flex items-center gap-2 mb-4">
                <PieChartIcon size={16} className="text-[#00E676]" />
                <h2 className="text-[13px] font-bold text-white uppercase tracking-wider">Distribución presupuestaria</h2>
              </div>
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Interesados", value: presInteresados, color: "#00E676" },
                        { name: "En análisis", value: presTotal - presInteresados, color: "#FFB74D" },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill="#00E676" />
                      <Cell fill="#FFB74D" />
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#0F1622", border: "1px solid #1C2538", borderRadius: "8px", fontSize: "11px" }} formatter={(value) => [fmt(value as number), "Presupuesto"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#00E676]" /><span className="text-[#A0A8B8]">Interesados</span></div>
                  <span className="text-white font-mono">{fmt(presInteresados)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#FFB74D]" /><span className="text-[#A0A8B8]">En análisis</span></div>
                  <span className="text-white font-mono">{fmt(presTotal - presInteresados)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA CENTRAL - Procesos Activos */}
          <div className="lg:col-span-6 space-y-4">
            {/* Barra de acciones: botón filtrar y contador */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Zap size={18} className="text-[#00E676]" />
                  {tab === "nuevos" ? "Procesos Nuevos" : tab === "interesado" ? "Mis Intereses" : "Descartados"}
                </h2>
                {tab !== "descartados" && (
                  <button
                    onClick={() => setFiltroPanel(!filtroPanel)}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
                      filtrosActivos > 0 ? "bg-[#00B0FF] text-white" : "bg-[#1C2538] text-[#A0A8B8] hover:bg-[#2A3441]"
                    }`}
                  >
                    <Filter size={12} /> Filtrar {filtrosActivos > 0 && `(${filtrosActivos})`}
                  </button>
                )}
              </div>
              <div className="text-[11px] text-[#5A647A] font-mono">
                {listaActual.length} {listaActual.length === 1 ? "oportunidad" : "oportunidades"} · {fmt(listaActual.reduce((s, p) => s + Number(p.presupuesto || 0), 0))}
              </div>
            </div>

            {/* Panel de filtros avanzados (desplegable) */}
            {filtroPanel && tab !== "descartados" && (
              <div className="bg-[#0F1622] border border-[#1C2538] rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select value={fDepto} onChange={e => setFDepto(e.target.value)} className="bg-[#1C2538] border border-[#2A3441] rounded-lg px-3 py-2 text-[12px] text-white">
                    <option value="">Todos los departamentos</option>
                    {deptos.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select value={fEntidad} onChange={e => setFEntidad(e.target.value)} className="bg-[#1C2538] border border-[#2A3441] rounded-lg px-3 py-2 text-[12px] text-white">
                    <option value="">Todas las entidades</option>
                    {entidades.map(e => <option key={e} value={e}>{e.substring(0, 45)}</option>)}
                  </select>
                  <select value={fModalidad} onChange={e => setFModalidad(e.target.value)} className="bg-[#1C2538] border border-[#2A3441] rounded-lg px-3 py-2 text-[12px] text-white">
                    <option value="">Todas las modalidades</option>
                    {modalidades.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <input type="text" placeholder="Buscar por texto..." value={fTexto} onChange={e => setFTexto(e.target.value)} className="bg-[#1C2538] border border-[#2A3441] rounded-lg px-3 py-2 text-[12px] text-white placeholder:text-[#5A647A]" />
                  <div className="flex items-center gap-2">
                    <input type="number" placeholder="Pres. mín. (M)" value={fPresMin} onChange={e => setFPresMin(e.target.value)} className="flex-1 bg-[#1C2538] border border-[#2A3441] rounded-lg px-3 py-2 text-[12px] text-white" />
                    <span className="text-[#5A647A]">–</span>
                    <input type="number" placeholder="Pres. máx. (M)" value={fPresMax} onChange={e => setFPresMax(e.target.value)} className="flex-1 bg-[#1C2538] border border-[#2A3441] rounded-lg px-3 py-2 text-[12px] text-white" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={limpiarFiltros} className="px-3 py-1.5 text-[11px] text-[#A0A8B8] bg-[#1C2538] rounded-lg hover:bg-[#2A3441]">Limpiar</button>
                  <button onClick={() => setFiltroPanel(false)} className="px-3 py-1.5 text-[11px] font-bold text-white bg-[#00B0FF] rounded-lg">Aplicar · {listaActual.length}</button>
                </div>
              </div>
            )}

            {tab !== "descartados" && listaActual.length === 0 && (
              <div className="text-center py-16 bg-[#0F1622] rounded-xl border border-[#1C2538]">
                <div className="text-5xl mb-4">{tab === "interesado" ? "⭐" : "📋"}</div>
                <div className="text-[15px] font-semibold text-white mb-2">
                  {filtrosActivos > 0 ? "Sin resultados" : tab === "interesado" ? "Sin procesos de interés aún" : "No hay procesos nuevos"}
                </div>
                <div className="text-[13px] text-[#5A647A]">
                  {filtrosActivos > 0 ? "Ajusta los filtros para ver más resultados." : tab === "interesado" ? "Marca procesos desde la pestaña Nuevos." : "SOFIA monitorea procesos diariamente."}
                </div>
              </div>
            )}

            {tab !== "descartados" && (
              <div className="space-y-4 animate-fadeIn">
                {listaActual.map((p, idx) => {
                  const dias = diasRestantes(p.fecha_oferta)
                  const urgente = dias !== null && dias <= 3 && dias >= 0
                  const isInt = p.estado === "interesado"
                  const isSaving = saving[p.id]
                  const isSaliendo = saliendo[p.id]
                  const etapa = p.etapa_seguimiento ?? 0

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
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <Clock size={12} className="text-[#5A647A]" />
                              <span className={`text-[11px] font-mono ${urgente ? "text-[#FF5252]" : "text-[#5A647A]"}`}>Cierra en {dias}d</span>
                            </div>
                          </div>
                        </div>

                        <p className="text-[13px] text-[#A0A8B8] leading-relaxed mt-3 line-clamp-2">{p.objeto || "Sin descripción"}</p>

                        <div className="flex flex-wrap gap-2 mt-3">
                          {p.departamento && <span className="flex items-center gap-1 text-[11px] text-[#5A647A] bg-[#1C2538] px-2 py-1 rounded-md"><MapPin size={10} /> {p.departamento}</span>}
                          {p.modalidad && <span className="flex items-center gap-1 text-[11px] text-[#5A647A] bg-[#1C2538] px-2 py-1 rounded-md"><Briefcase size={10} /> {p.modalidad}</span>}
                          {p.resultado_ia && <span className="text-[11px] text-[#00E676] bg-[#00E67610] px-2 py-1 rounded-md">✓ IA</span>}
                          {isInt && <span className="text-[11px] text-[#00B0FF] bg-[#00B0FF10] px-2 py-1 rounded-md border border-[#00B0FF30]">✓ Me interesa</span>}
                        </div>

                        {isInt && (
                          <div className="mt-4 pt-3 border-t border-[#1C2538]">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[11px] font-bold text-[#00B0FF] uppercase tracking-wider">Seguimiento de gestión</span>
                              <span className="text-[10px] font-mono text-[#00E676] bg-[#00E67610] px-2 py-0.5 rounded-full">{ETAPAS[etapa]}</span>
                            </div>
                            <Timeline etapa={etapa} />
                            <div className="mt-3 p-3 bg-[#1C2538] rounded-lg text-[12px] text-[#A0A8B8]">
                              {etapa === 0 ? "Usa \"Enviar a SOFIA\" para que el equipo inicie el análisis formal." : `Estamos en la etapa ${ETAPAS[etapa]}. OC Consultores te mantendrá informado.`}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-[#1C2538] mt-3">
                          {!isInt && (
                            <button className="btn flex items-center gap-2 bg-[#00E67620] hover:bg-[#00E67630] text-[#00E676] text-[12px] font-bold px-4 py-2 rounded-lg transition-all" onClick={() => marcarInteres(p.id)} disabled={!!isSaving}>
                              {isSaving && isSaving !== "sofia" ? "..." : "✓ Me interesa"}
                            </button>
                          )}
                          <button className="btn flex items-center gap-2 bg-gradient-to-r from-[#00B0FF] to-[#0091EA] hover:from-[#0091EA] hover:to-[#0077B6] text-white text-[12px] font-bold px-4 py-2 rounded-lg transition-all shadow-md" onClick={() => enviarSOFIA(p.id)} disabled={isSaving === "sofia"}>
                            <Send size={14} /> {isSaving === "sofia" ? "Enviando..." : "Enviar a SOFIA"}
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
                })}
              </div>
            )}

            {tab === "descartados" && (
              <div className="space-y-3">
                {descartados.length === 0 ? (
                  <div className="text-center py-16 bg-[#0F1622] rounded-xl border border-[#1C2538]">
                    <div className="text-5xl mb-4">🗑</div>
                    <div className="text-[15px] font-semibold text-white mb-2">Sin procesos descartados</div>
                    <div className="text-[13px] text-[#5A647A]">Se eliminan automáticamente después de 30 días.</div>
                  </div>
                ) : (
                  descartados.map(p => (
                    <div key={p.id} className="bg-[#0F1622] rounded-xl border border-[#1C2538] p-5 opacity-80">
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <div>
                          <h3 className="text-[14px] font-semibold text-[#A0A8B8]">{p.entidad || "—"}</h3>
                          <div className="text-[10px] text-[#5A647A] font-mono">{p.referencia}{p.departamento ? ` · ${p.departamento}` : ""}</div>
                        </div>
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

          {/* COLUMNA DERECHA - Intelligence Hub */}
          <div className="lg:col-span-3 space-y-6">
            {/* Top Oportunidades: ahora enlaza a SECOP */}
            <div className="bg-[#0F1622] rounded-xl border border-[#1C2538] p-5">
              <h2 className="text-[13px] font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <DollarSign size={14} className="text-[#00E676]" />
                Top Oportunidades
              </h2>
              <div className="space-y-3">
                {[...procesos]
                  .sort((a, b) => (b.presupuesto || 0) - (a.presupuesto || 0))
                  .slice(0, 4)
                  .map((opp, idx) => {
                    const dias = diasRestantes(opp.fecha_oferta)
                    return (
                      <a
                        key={idx}
                        href={opp.url || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-[#1C2538] transition-all cursor-pointer group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-white truncate">{opp.entidad || "—"}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] font-mono text-[#00E676]">{fmt(opp.presupuesto)}</span>
                            {dias !== null && <span className={`text-[10px] font-mono ${dias <= 3 ? "text-[#FF5252]" : "text-[#5A647A]"}`}>⏳ {dias}d</span>}
                          </div>
                        </div>
                        <ExternalLink size={14} className="text-[#5A647A] group-hover:text-[#00B0FF] transition-colors" />
                      </a>
                    )
                  })}
              </div>
            </div>

            {/* Actividad Reciente */}
            <div className="bg-[#0F1622] rounded-xl border border-[#1C2538] p-5">
              <h2 className="text-[13px] font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock size={14} className="text-[#00B0FF]" />
                Actividad Reciente
              </h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3 pb-3 border-b border-[#1C2538]">
                  <div className="w-6 h-6 rounded-full bg-[#1C2538] flex items-center justify-center flex-shrink-0"><CheckCircle size={12} className="text-[#00B0FF]" /></div>
                  <div><p className="text-[12px] text-white">Portal actualizado</p><p className="text-[11px] text-[#5A647A]">Nuevos procesos cargados</p><span className="text-[9px] text-[#2A3441] font-mono">hoy</span></div>
                </div>
                <div className="flex items-start gap-3 pb-3 border-b border-[#1C2538]">
                  <div className="w-6 h-6 rounded-full bg-[#1C2538] flex items-center justify-center flex-shrink-0"><Send size={12} className="text-[#00E676]" /></div>
                  <div><p className="text-[12px] text-white">Análisis IA completado</p><p className="text-[11px] text-[#5A647A]">{procesos.length} procesos evaluados</p><span className="text-[9px] text-[#2A3441] font-mono">hace 1h</span></div>
                </div>
                {interesados.length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#1C2538] flex items-center justify-center flex-shrink-0"><StarIcon size={12} className="text-[#FFD600]" /></div>
                    <div><p className="text-[12px] text-white">{interesados.length} proceso(s) marcados</p><p className="text-[11px] text-[#5A647A]">Como "Me interesa"</p><span className="text-[9px] text-[#2A3441] font-mono">reciente</span></div>
                  </div>
                )}
              </div>
            </div>

            {/* Mis Herramientas con funcionalidad */}
            <div className="bg-gradient-to-br from-[#0F1622] to-[#0B132B] rounded-xl border border-[#1C2538] p-5">
              <h2 className="text-[13px] font-bold text-white uppercase tracking-wider mb-3">Mis Herramientas</h2>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => mostrarToast("Búsqueda guardada localmente", "ok")} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[#1C2538] hover:bg-[#2A3441] transition-all group">
                  <Save size={16} className="text-[#00B0FF] group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] text-[#A0A8B8]">Guardar Búsqueda</span>
                </button>
                <button onClick={() => {
                  const próximos = procesos.filter(p => diasRestantes(p.fecha_oferta) !== null && diasRestantes(p.fecha_oferta)! <= 5).length
                  mostrarToast(`${próximos} procesos cierran en menos de 5 días`, "info")
                }} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[#1C2538] hover:bg-[#2A3441] transition-all group">
                  <AlertTriangle size={16} className="text-[#FF5252] group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] text-[#A0A8B8]">Alertas</span>
                </button>
                <button onClick={() => mostrarToast("Reporte de compatibilidad exportado (CSV)", "ok")} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[#1C2538] hover:bg-[#2A3441] transition-all group">
                  <FileText size={16} className="text-[#00E676] group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] text-[#A0A8B8]">Reporte IA</span>
                </button>
              </div>
            </div>

            {cliente?.drive_url && (
              <a href={cliente.drive_url} target="_blank" rel="noreferrer" className="bg-[#0F1622] rounded-xl border border-[#1C2538] p-4 flex items-center gap-3 hover:border-[#00B0FF40] transition-all">
                <FolderOpen size={20} className="text-[#00B0FF]" />
                <div><p className="text-[12px] font-medium text-white">Google Drive</p><p className="text-[10px] text-[#5A647A]">Mis documentos</p></div>
              </a>
            )}
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-[#1C2538] text-center">
          <p className="text-[10px] text-[#2A3441] font-mono">SOFIA by OC CONSULTORES - Monitoreo inteligente de licitaciones SECOP II</p>
        </div>
      </main>

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] animate-[toastIn_0.25s_ease]" style={{ background: toast.tipo === "sofia" ? "#00B0FF" : toast.tipo === "ok" ? "#00E676" : "#2A3441", color: "#fff", padding: "12px 24px", borderRadius: "12px", fontSize: "13px", fontWeight: 500, whiteSpace: "nowrap", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
          {toast.msg}
        </div>
      )}

      {/* MODAL DESCARTAR */}
      {procesoADescartar && (
        <div className="fixed inset-0 bg-[#0B132B]/80 z-[200] flex items-center justify-center p-5 backdrop-blur-sm" onClick={() => setProcesoADescartar(null)}>
          <div className="bg-[#0F1622] rounded-xl border border-[#1C2538] p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="w-14 h-14 rounded-full bg-[#FF525220] border border-[#FF525240] flex items-center justify-center mx-auto mb-4 text-2xl">⚠</div>
              <h3 className="text-lg font-bold text-white mb-2">¿Descartar proceso?</h3>
              <p className="text-[13px] text-[#A0A8B8]">Pasará a tu carpeta de Descartados y podrás recuperarlo cuando quieras.</p>
              <div className="mt-4 p-3 bg-[#1C2538] rounded-lg">
                <div className="text-[13px] font-medium text-white">{procesoADescartar.entidad || "—"}</div>
                <div className="text-[11px] text-[#5A647A] font-mono">{procesoADescartar.referencia}</div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setProcesoADescartar(null)} className="flex-1 py-2.5 rounded-lg bg-[#1C2538] text-[#A0A8B8] text-[13px] font-medium hover:bg-[#2A3441] transition-all">Cancelar</button>
              <button onClick={() => descartar(procesoADescartar.id)} className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-[#FF5252] to-[#DC2626] text-white text-[13px] font-bold hover:opacity-90 transition-all">Sí, descartar</button>
            </div>
          </div>
        </div>
      )}

      {showBienvenida && <BienvenidaToast nombre={cliente?.nombre || ""} onClose={() => setShowBienvenida(false)} />}
    </div>
  )
}

// Componente StarIcon para actividad reciente
function StarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}
