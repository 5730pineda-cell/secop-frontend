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
  DollarSign,
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

// --- Función para generar datos reales de tendencia ---
function getTrendData(procesos: Proceso[]) {
  const hoy = new Date()
  const ultimos30Dias: { [key: string]: number } = {}
  
  for (let i = 29; i >= 0; i--) {
    const fecha = new Date()
    fecha.setDate(hoy.getDate() - i)
    const label = fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
    ultimos30Dias[label] = 0
  }
  
  procesos.forEach(p => {
    if (!p.created_at) return
    const fechaCreacion = new Date(p.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
    if (ultimos30Dias[fechaCreacion] !== undefined) {
      ultimos30Dias[fechaCreacion]++
    }
  })
  
  return Object.entries(ultimos30Dias).map(([name, procesos]) => ({ name, procesos }))
}

// Timeline component (sin cambios)
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

// Bienvenida toast (sin cambios)
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
  const [searchTerm, setSearchTerm] = useState("")

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

  // ... todas las funciones marcarInteres, enviarSOFIA, descartar, restaurar, mostrarToast, limpiarFiltros permanecen igual ...
  // (por brevedad no las repito, pero debes mantenerlas)

  const nuevos = procesos.filter(p => p.estado === "nuevo")
  const interesados = procesos.filter(p => p.estado === "interesado")
  const presTotal = procesos.reduce((s, p) => s + Number(p.presupuesto || 0), 0)
  const presInteresados = interesados.reduce((s, p) => s + Number(p.presupuesto || 0), 0)

  // Datos reales de tendencia
  const trendData = getTrendData(procesos)

  // ... el resto del componente (filtros, listas, render) es igual que antes, pero con los tooltips mejorados ...

  // En el JSX, dentro del gráfico AreaChart, cambia el Tooltip como se indicó
  // Y en el PieChart también

  // Para no alargar, asumiré que mantienes el resto del código idéntico,
  // solo actualiza las dos secciones de gráficos con los nuevos Tooltips y usa trendData en lugar del mock.
}
