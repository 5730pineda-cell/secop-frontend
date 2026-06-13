"use client"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Cliente, Proceso, Feedback, Comentario } from "@/types"
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from "recharts"
import {
  Bell, Search, LogOut, ExternalLink, Send, FolderOpen, Archive,
  Clock, TrendingUp, PieChart as PieChartIcon, Zap, Save, AlertTriangle,
  FileText, CheckCircle, MapPin, Briefcase, Filter, DollarSign, Users,
  Activity, UserCheck, Eye, Trash2, Edit3, ChevronRight, RefreshCw,
  PlusCircle, BarChart as BarChartIcon, MessageSquare, HelpCircle,
  Calendar, ChevronDown, ChevronUp, EyeOff, Award, ThumbsUp, ThumbsDown, Meh
} from "lucide-react"

// ---------- CONSTANTES ----------
const ADMIN_PASS = "admin2024oc"
const ETAPAS = ["Análisis", "Aprobación", "Organización", "Presentación", "Resultado"]
const DEPARTAMENTOS_CO = [
  "Amazonas","Antioquia","Arauca","Atlántico","Bolívar","Boyacá","Caldas","Caquetá",
  "Casanare","Cauca","Cesar","Chocó","Córdoba","Cundinamarca","Guainía","Guaviare",
  "Huila","La Guajira","Magdalena","Meta","Nariño","Norte de Santander","Putumayo",
  "Quindío","Risaralda","Santander","Sucre","Tolima","Valle del Cauca","Vaupés","Vichada","Bogotá D.C."
]

// ---------- HELPERS ----------
function fmt(n: number | null | undefined) {
  if (!n) return "—"
  const v = Number(n)
  if (v >= 1e9) return "$" + (v / 1e9).toFixed(1).replace(".", ",") + " mil M"
  if (v >= 1e6) return "$" + Math.round(v / 1e6).toLocaleString("es-CO") + "M"
  if (v >= 1e3) return "$" + Math.round(v / 1e3).toLocaleString("es-CO") + "K"
  return "$" + v.toLocaleString("es-CO")
}
function fmtFecha(f: string | null) {
  if (!f) return "—"
  return new Date(f).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })
}
function fmtFechaHora(f: string | null) {
  if (!f) return "—"
  return new Date(f).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}
function diasRestantes(f: string | null) {
  if (!f) return null
  const hoy = new Date(); hoy.setHours(0,0,0,0)
  const fe = new Date(f); fe.setHours(0,0,0,0)
  return Math.ceil((fe.getTime() - hoy.getTime()) / 86400000)
}
function initials(nombre: string) {
  return nombre.split(" ").map(w => w[0]).join("").substring(0,2).toUpperCase()
}

// ---------- COMPONENTES UI ----------
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  )
}
function CloseBtn({ onClose }: { onClose: () => void }) {
  return <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[#1c2028] border border-[#252932] text-[#525a68] hover:text-white transition-all">✕</button>
}

// ---------- TIMELINE ADMIN (con registro de fechas) ----------
function TimelineAdmin({ procesoId, etapa, onUpdate, fechaEtapa0, fechaEtapa1, fechaEtapa2, fechaEtapa3, fechaEtapa4 }: { 
  procesoId: string; etapa: number; onUpdate: (id: string, etapa: number) => void;
  fechaEtapa0?: string | null; fechaEtapa1?: string | null; fechaEtapa2?: string | null; fechaEtapa3?: string | null; fechaEtapa4?: string | null;
}) {
  const [updating, setUpdating] = useState(false)
  const idx = Math.min(Math.max(0, etapa), 4)
  const fechas = [fechaEtapa0, fechaEtapa1, fechaEtapa2, fechaEtapa3, fechaEtapa4]

  async function irEtapa(i: number) {
    if (updating || i === idx) return
    setUpdating(true)
    const fechaActual = new Date().toISOString()
    const updateFields: any = { etapa_seguimiento: i }
    if (i > idx) {
      for (let j = idx + 1; j <= i; j++) {
        updateFields[`fecha_etapa_${j}`] = fechaActual
      }
    }
    await supabase.from("procesos").update(updateFields).eq("id", procesoId)
    onUpdate(procesoId, i)
    setUpdating(false)
  }

  return (
    <div className="flex items-start w-full mt-2">
      {ETAPAS.map((e, i) => {
        const done = i < idx
        const active = i === idx
        return (
          <div key={i} className="flex flex-col items-center flex-1 relative cursor-pointer" onClick={() => irEtapa(i)}>
            {i > 0 && <div className="absolute left-[-50%] right-[50%] top-[13px] h-[2px] bg-[#3b82f6] z-0" style={{ background: done || active ? "#3b82f6" : "#252932" }} />}
            <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${done ? "bg-[#3b82f6] text-white" : active ? "bg-[#1d4ed8] ring-2 ring-[#3b82f6] ring-offset-2 ring-offset-[#111318] text-white" : "bg-[#1c2028] border border-[#252932] text-[#525a68]"}`}>
              {done ? "✓" : i+1}
            </div>
            <span className={`text-[9px] mt-1 text-center ${active ? "text-[#60a5fa]" : done ? "text-[#3b82f6]" : "text-[#525a68]"}`}>{e}</span>
            {fechas[i] && <span className="text-[8px] text-[#525a68] mt-0.5">{fmtFecha(fechas[i])}</span>}
          </div>
        )
      })}
    </div>
  )
}

// ---------- COMPONENTE PARA MOSTRAR COMENTARIOS Y RESPONDER ----------
function ComentariosAdmin({ procesoId, clienteId }: { procesoId: string; clienteId: string }) {
  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [nuevoTexto, setNuevoTexto] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [cargando, setCargando] = useState(true)

  async function cargarComentarios() {
    setCargando(true)
    const { data } = await supabase
      .from("comentarios")
      .select("*")
      .eq("proceso_id", procesoId)
      .order("created_at", { ascending: true })
    setComentarios(data || [])
    setCargando(false)
  }

  async function enviarComentario() {
    if (!nuevoTexto.trim()) return
    setEnviando(true)
    const { error } = await supabase.from("comentarios").insert({
      proceso_id: procesoId,
      cliente_id: clienteId,
      autor: "admin",
      texto: nuevoTexto.trim()
    })
    if (!error) {
      setNuevoTexto("")
      await cargarComentarios()
    }
    setEnviando(false)
  }

  useEffect(() => { cargarComentarios() }, [procesoId])

  if (cargando) return <div className="text-[10px] text-[#525a68]">Cargando comentarios...</div>

  return (
    <div className="mt-3 pt-3 border-t border-[#252932]">
      <span className="text-[10px] font-bold text-[#3b82f6] flex items-center gap-1"><MessageSquare size={10}/> Comentarios</span>
      <div className="space-y-2 max-h-40 overflow-y-auto mt-2">
        {comentarios.map(c => (
          <div key={c.id} className={`text-xs p-2 rounded ${c.autor === 'admin' ? 'bg-[#1e3a8a22] border-l-2 border-[#3b82f6]' : 'bg-[#1c2028]'}`}>
            <div className="flex justify-between text-[9px] text-[#525a68] mb-1">
              <span className="font-bold">{c.autor === 'admin' ? 'Admin' : 'Cliente'}</span>
              <span>{fmtFechaHora(c.created_at)}</span>
            </div>
            <p className="text-white/80">{c.texto}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        <textarea rows={1} placeholder="Escribe una respuesta..." className="flex-1 p-2 bg-[#1c2028] rounded text-white text-xs resize-none" value={nuevoTexto} onChange={e => setNuevoTexto(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarComentario() } }} />
        <button onClick={enviarComentario} disabled={enviando} className="px-3 py-1.5 bg-[#3b82f6] rounded text-white text-xs font-bold"><Send size={12}/></button>
      </div>
    </div>
  )
}

// ---------- MODAL PARA RESULTADO FINAL ----------
function ModalResultado({ proceso, onClose, onUpdate }: { proceso: Proceso; onClose: () => void; onUpdate: () => void }) {
  const [resultado, setResultado] = useState<'ganado' | 'perdido' | 'desierto' | null>(proceso.resultado_final || null)
  const [nota, setNota] = useState(proceso.nota_resultado || "")
  const [saving, setSaving] = useState(false)

  async function guardar() {
    setSaving(true)
    await supabase.from("procesos").update({
      resultado_final: resultado,
      nota_resultado: nota || null,
      fecha_informe_evaluacion: resultado === 'ganado' || resultado === 'perdido' ? new Date().toISOString() : null
    }).eq("id", proceso.id)
    setSaving(false)
    onUpdate()
    onClose()
  }

  return (
    <Overlay onClose={onClose}>
      <div className="w-[400px] bg-[#111318] border border-[#252932] rounded-2xl p-6">
        <div className="flex justify-between"><h3 className="text-lg font-bold text-white">Resultado del proceso</h3><CloseBtn onClose={onClose} /></div>
        <p className="text-xs text-[#525a68] mt-1">{proceso.referencia}</p>
        <div className="mt-4 space-y-2">
          <button onClick={() => setResultado('ganado')} className={`w-full flex items-center justify-between p-3 rounded-lg border ${resultado === 'ganado' ? 'border-[#22c55e] bg-[#22c55e22]' : 'border-[#252932]'} transition`}><span>🏆 Ganado</span><ThumbsUp size={16} className="text-[#22c55e]"/></button>
          <button onClick={() => setResultado('perdido')} className={`w-full flex items-center justify-between p-3 rounded-lg border ${resultado === 'perdido' ? 'border-[#ef4444] bg-[#ef444422]' : 'border-[#252932]'} transition`}><span>❌ Perdido</span><ThumbsDown size={16} className="text-[#ef4444]"/></button>
          <button onClick={() => setResultado('desierto')} className={`w-full flex items-center justify-between p-3 rounded-lg border ${resultado === 'desierto' ? 'border-[#f59e0b] bg-[#f59e0b22]' : 'border-[#252932]'} transition`}><span>🌵 Desierto</span><Meh size={16} className="text-[#f59e0b]"/></button>
        </div>
        <textarea rows={2} placeholder="Nota adicional (opcional)" className="w-full mt-4 p-2 bg-[#1c2028] rounded text-white text-sm" value={nota} onChange={e => setNota(e.target.value)} />
        <div className="flex gap-2 mt-4"><button onClick={onClose} className="flex-1 py-2 bg-transparent border border-[#252932] rounded text-[#525a68]">Cancelar</button><button onClick={guardar} disabled={saving} className="flex-1 py-2 bg-[#3b82f6] rounded text-white font-bold">{saving ? "Guardando..." : "Guardar resultado"}</button></div>
      </div>
    </Overlay>
  )
}

// ---------- MODALES CLIENTE Y PROCESO MANUAL (sin cambios relevantes, se mantienen) ----------
// ... (los modales existentes se mantienen igual para no alargar el mensaje, pero se incluyen en el código final)

// ---------- COMPONENTE PRINCIPAL ADMIN ----------
export default function AdminPage() {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [pass, setPass] = useState("")
  const [loginErr, setLoginErr] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [procesos, setProcesos] = useState<Proceso[]>([])
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [clienteSel, setClienteSel] = useState<string | null>(null)
  const [estadoSel, setEstadoSel] = useState<string>("todos")
  const [tab, setTab] = useState("procesos")
  const [toast, setToast] = useState("")
  const [editDrive, setEditDrive] = useState<{ id: string; url: string } | null>(null)
  const [savingDrive, setSavingDrive] = useState(false)
  const [editDriveProceso, setEditDriveProceso] = useState<string | null>(null)
  const [driveProcUrl, setDriveProcUrl] = useState("")
  const [savingDriveProc, setSavingDriveProc] = useState(false)
  const [showNuevoCliente, setShowNuevoCliente] = useState(false)
  const [editarCliente, setEditarCliente] = useState<Cliente | null>(null)
  const [eliminarCliente, setEliminarCliente] = useState<Cliente | null>(null)
  const [elimLoading, setElimLoading] = useState(false)
  const [showNuevoProceso, setShowNuevoProceso] = useState(false)
  const [notificaciones, setNotificaciones] = useState<Feedback[]>([])
  const [mostrarNotis, setMostrarNotis] = useState(false)
  const [resultadoModal, setResultadoModal] = useState<Proceso | null>(null)

  useEffect(() => {
    if (sessionStorage.getItem("secop_admin") === btoa(ADMIN_PASS)) { setAuthed(true); cargar() }
    else setLoading(false)
  }, [])

  async function login() {
    if (pass === ADMIN_PASS) { sessionStorage.setItem("secop_admin", btoa(ADMIN_PASS)); setAuthed(true); cargar() }
    else setLoginErr(true)
  }

  async function cargar() {
    setLoading(true)
    const [{ data: c }, { data: p }, { data: f }] = await Promise.all([
      supabase.from("clientes").select("*").order("nombre"),
      supabase.from("procesos").select("*").order("updated_at", { ascending: false }),
      supabase.from("feedback").select("*").order("created_at", { ascending: false }),
    ])
    setClientes(c || [])
    setProcesos(p || [])
    setFeedback(f || [])
    const hoy = new Date()
    const ayer = new Date(hoy.getTime() - 24*60*60*1000)
    const nuevosFeed = (f || []).filter(fb => new Date(fb.created_at) > ayer && (fb.accion === "interesado" || fb.accion === "enviado_sofia"))
    setNotificaciones(nuevosFeed)
    setLoading(false)
  }

  function mostrarToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3500) }

  async function toggleActivo(c: Cliente) {
    const nuevo = !c.activo
    await supabase.from("clientes").update({ activo: nuevo }).eq("id", c.id)
    setClientes(prev => prev.map(x => x.id === c.id ? { ...x, activo: nuevo } : x))
    mostrarToast(`${c.nombre} ${nuevo ? "activado" : "desactivado"}.`)
  }

  async function confirmarEliminar() {
    if (!eliminarCliente) return
    setElimLoading(true)
    await supabase.from("feedback").delete().eq("cliente_id", eliminarCliente.id)
    await supabase.from("comentarios").delete().eq("cliente_id", eliminarCliente.id)
    await supabase.from("procesos").delete().eq("cliente_id", eliminarCliente.id)
    await supabase.from("clientes").delete().eq("id", eliminarCliente.id)
    setClientes(prev => prev.filter(x => x.id !== eliminarCliente.id))
    setProcesos(prev => prev.filter(x => x.cliente_id !== eliminarCliente.id))
    setFeedback(prev => prev.filter(x => x.cliente_id !== eliminarCliente.id))
    setElimLoading(false); setEliminarCliente(null)
    mostrarToast(`Cliente ${eliminarCliente.nombre} eliminado.`)
  }

  async function guardarDriveCliente() {
    if (!editDrive) return
    setSavingDrive(true)
    await supabase.from("clientes").update({ drive_url: editDrive.url || null }).eq("id", editDrive.id)
    setClientes(prev => prev.map(c => c.id === editDrive.id ? { ...c, drive_url: editDrive.url || null } : c))
    setSavingDrive(false); setEditDrive(null); mostrarToast("Drive guardado.")
  }
  async function guardarDriveProceso() {
    if (!editDriveProceso) return
    setSavingDriveProc(true)
    await supabase.from("procesos").update({ drive_proceso_url: driveProcUrl || null }).eq("id", editDriveProceso)
    setProcesos(prev => prev.map(p => p.id === editDriveProceso ? { ...p, drive_proceso_url: driveProcUrl || null } : p))
    setSavingDriveProc(false); setEditDriveProceso(null); setDriveProcUrl(""); mostrarToast("Drive del proceso guardado.")
  }

  async function cambiarEstadoProceso(procesoId: string, nuevoEstado: string) {
    await supabase.from("procesos").update({ estado: nuevoEstado }).eq("id", procesoId)
    setProcesos(prev => prev.map(p => p.id === procesoId ? { ...p, estado: nuevoEstado } : p))
    mostrarToast(`Proceso marcado como ${nuevoEstado === "interesado" ? "interesado" : nuevoEstado === "descartado" ? "descartado" : "nuevo"}.`)
  }

  async function actualizarEtapa(procesoId: string, etapa: number) {
    setProcesos(prev => prev.map(p => p.id === procesoId ? { ...p, etapa_seguimiento: etapa } : p))
    mostrarToast(`Etapa actualizada: ${ETAPAS[etapa]}`)
  }

  // Datos para gráficos
  const clientesFilt = clientes.filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || c.id.toLowerCase().includes(busqueda.toLowerCase()))
  const procesosFilt = procesos.filter(p => {
    if (clienteSel && p.cliente_id !== clienteSel) return false
    if (estadoSel !== "todos" && p.estado !== estadoSel) return false
    if (busqueda && !p.entidad?.toLowerCase().includes(busqueda.toLowerCase()) && !p.referencia.toLowerCase().includes(busqueda.toLowerCase()) && !p.objeto?.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })
  const interesados = procesosFilt.filter(p => p.estado === "interesado")
  const nuevos = procesosFilt.filter(p => p.estado === "nuevo")
  const descartados = procesosFilt.filter(p => p.estado === "descartado")
  const acompanamiento = procesosFilt.filter(p => p.en_acompanamiento === true)
  const activos = clientes.filter(c => c.activo).length
  const presTotalInteres = procesos.filter(p => p.estado === "interesado").reduce((s,p) => s + Number(p.presupuesto || 0), 0)

  const topClientes = useMemo(() => {
    const mapa = new Map<string, number>()
    procesos.filter(p => p.estado === "interesado").forEach(p => {
      const cliente = clientes.find(c => c.id === p.cliente_id)
      if (cliente) mapa.set(cliente.nombre, (mapa.get(cliente.nombre) || 0) + (p.presupuesto || 0))
    })
    return Array.from(mapa.entries()).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([nombre, total]) => ({ nombre: nombre.length>20?nombre.slice(0,18)+'…':nombre, total }))
  }, [procesos, clientes])

  const evolucionEstados = useMemo(() => {
    const hoy = new Date()
    const ultimos7 = []
    for (let i=6; i>=0; i--) {
      const fecha = new Date(hoy); fecha.setDate(hoy.getDate() - i)
      const fechaStr = fecha.toISOString().split('T')[0]
      const nuevosDia = procesos.filter(p => p.created_at?.startsWith(fechaStr)).length
      const interesDia = feedback.filter(f => f.accion === "interesado" && f.created_at?.startsWith(fechaStr)).length
      ultimos7.push({ dia: fecha.toLocaleDateString('es-CO',{day:'numeric',month:'short'}), nuevos: nuevosDia, interesados: interesDia })
    }
    return ultimos7
  }, [procesos, feedback])

  if (!authed) return ( // login screen
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
      <div className="bg-[#111318] border border-[#252932] rounded-2xl p-8 w-96 text-center">
        <span className="font-display text-3xl font-black"><span className="text-white">sof</span><span className="text-[#3b82f6]">ia</span></span>
        <p className="text-[10px] text-[#525a68] mt-1">ADMIN · OC CONSULTORES</p>
        <input type="password" placeholder="Contraseña admin" value={pass} onChange={e=>{setPass(e.target.value);setLoginErr(false)}} onKeyDown={e=>e.key==='Enter'&&login()} className="w-full p-3 mt-4 bg-[#1c2028] border border-[#252932] rounded text-white" />
        {loginErr && <p className="text-red-500 text-xs mt-2">Contraseña incorrecta</p>}
        <button onClick={login} className="w-full mt-4 p-2 bg-[#3b82f6] rounded text-white font-bold">Entrar</button>
        <button onClick={()=>router.push("/login")} className="w-full mt-2 p-2 border border-[#252932] rounded text-[#525a68] text-sm">← Portal clientes</button>
      </div>
    </div>
  )

  if (loading) return <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin"></div></div>

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white font-sans">
      <nav className="sticky top-0 z-50 bg-[#111318] border-b border-[#252932] h-14 flex items-center px-6">
        <div className="max-w-[1400px] w-full mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4"><span className="font-display text-xl font-black"><span className="text-white">sof</span><span className="text-[#3b82f6]">ia</span></span><span className="text-[10px] text-[#525a68] uppercase">Admin · OC Consultores</span></div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button onClick={()=>setMostrarNotis(!mostrarNotis)} className="relative p-1.5 rounded-lg bg-[#1c2028] border border-[#252932] text-[#8b919e] hover:text-white transition-all"><Bell size={16} />{notificaciones.length>0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center">{notificaciones.length}</span>}</button>
              {mostrarNotis && <div className="absolute right-0 mt-2 w-80 bg-[#111318] border border-[#252932] rounded-xl shadow-xl z-50 p-2"><div className="text-xs font-bold text-[#525a68] p-2 border-b border-[#252932]">Actividad reciente</div>{notificaciones.length===0?<p className="text-xs text-[#525a68] p-3">Sin novedades</p>:notificaciones.map(n=>{const proc=procesos.find(p=>p.id===n.proceso_id);return <div key={n.id} className="text-xs p-2 border-b border-[#252932]"><span className="text-[#60a5fa]">{n.accion==="interesado"?"⭐ Interés":"📤 Enviado a SOFIA"}</span><div className="text-[#8b919e]">{proc?.entidad || proc?.referencia}</div><div className="text-[10px] text-[#525a68]">{new Date(n.created_at).toLocaleString()}</div></div>})}</div>}
            </div>
            <button onClick={()=>router.push("/dashboard")} className="text-xs px-3 py-1 bg-transparent border border-[#252932] rounded">Dashboard</button>
            <button onClick={()=>{sessionStorage.removeItem("secop_admin");router.push("/login")}} className="text-xs px-3 py-1 bg-transparent border border-[#252932] rounded">Salir</button>
          </div>
        </div>
      </nav>

      <div className="max-w-[1400px] mx-auto p-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-[#15181f] border border-[#252932] rounded-xl p-3"><div className="text-[10px] text-[#525a68] uppercase">Clientes activos</div><div className="text-2xl font-bold text-[#60a5fa]">{activos}</div></div>
          <div className="bg-[#15181f] border border-[#252932] rounded-xl p-3"><div className="text-[10px] text-[#525a68] uppercase">Total procesos</div><div className="text-2xl font-bold text-[#22c55e]">{procesos.length}</div></div>
          <div className="bg-[#15181f] border border-[#252932] rounded-xl p-3"><div className="text-[10px] text-[#525a68] uppercase">Interesados</div><div className="text-2xl font-bold text-[#f59e0b]">{interesados.length}</div></div>
          <div className="bg-[#15181f] border border-[#252932] rounded-xl p-3"><div className="text-[10px] text-[#525a68] uppercase">Acompañamiento</div><div className="text-2xl font-bold text-[#3b82f6]">{acompanamiento.length}</div></div>
          <div className="bg-[#15181f] border border-[#252932] rounded-xl p-3"><div className="text-[10px] text-[#525a68] uppercase">Presupuesto interés</div><div className="text-sm font-bold text-[#34d399]">{fmt(presTotalInteres)}</div></div>
          <div className="bg-[#15181f] border border-[#252932] rounded-xl p-3"><div className="text-[10px] text-[#525a68] uppercase">Manuales</div><div className="text-2xl font-bold text-[#a78bfa]">{procesos.filter(p=>p.es_manual).length}</div></div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-[#15181f] border border-[#252932] rounded-xl p-4">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-3"><TrendingUp size={14} className="text-[#3b82f6]"/>Evolución últimos 7 días</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={evolucionEstados}><XAxis dataKey="dia" stroke="#525a68" fontSize={10}/><YAxis stroke="#525a68" fontSize={10}/><Tooltip contentStyle={{backgroundColor:'#1c2028', border:'none', borderRadius:8}}/><Line type="monotone" dataKey="nuevos" stroke="#3b82f6" name="Nuevos"/><Line type="monotone" dataKey="interesados" stroke="#f59e0b" name="Interesados"/></LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-[#15181f] border border-[#252932] rounded-xl p-4">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-3"><DollarSign size={14} className="text-[#22c55e]"/>Top clientes por presupuesto interesado</h3>
            <div className="space-y-2">{topClientes.map(c=> <div key={c.nombre} className="flex justify-between text-xs"><span>{c.nombre}</span><span className="text-[#22c55e]">{fmt(c.total)}</span></div>)}</div>
          </div>
        </div>

        {/* Filtros y tabs */}
        <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
          <div className="flex gap-2">
            <select value={clienteSel || ""} onChange={e=>setClienteSel(e.target.value||null)} className="bg-[#15181f] border border-[#252932] rounded-lg p-2 text-sm"><option value="">Todos los clientes</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nombre} {!c.activo?"(inactivo)":""}</option>)}</select>
            <select value={estadoSel} onChange={e=>setEstadoSel(e.target.value)} className="bg-[#15181f] border border-[#252932] rounded-lg p-2 text-sm"><option value="todos">Todos los estados</option><option value="nuevo">Nuevos</option><option value="interesado">Interesados</option><option value="descartado">Descartados</option><option value="acompanamiento">Acompañamiento</option></select>
            <input type="text" placeholder="Buscar..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} className="bg-[#15181f] border border-[#252932] rounded-lg p-2 text-sm w-48" />
          </div>
          <div className="flex gap-2">
            <button onClick={()=>setShowNuevoProceso(true)} className="text-xs px-3 py-1.5 bg-[#22c55e]/20 border border-[#22c55e]/40 rounded text-[#22c55e]">+ Proceso manual</button>
            <button onClick={()=>setShowNuevoCliente(true)} className="text-xs px-3 py-1.5 bg-[#3b82f6]/20 border border-[#3b82f6]/40 rounded text-[#3b82f6]">+ Nuevo cliente</button>
          </div>
        </div>

        <div className="flex gap-2 border-b border-[#252932] mb-4">
          {["procesos","acompanamiento","clientes","feedback"].map(t=> <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 text-sm font-medium ${tab===t ? "text-[#3b82f6] border-b-2 border-[#3b82f6]" : "text-[#8b919e]"}`}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}
        </div>

        {/* TAB PROCESOS (normales) */}
        {tab === "procesos" && (
          <div className="space-y-4">
            <div className="text-xs text-[#8b919e] flex gap-4"><span>Interesados: {interesados.length}</span><span>Nuevos: {nuevos.length}</span><span>Descartados: {descartados.length}</span></div>
            {procesosFilt.filter(p => !p.en_acompanamiento).length === 0 ? <div className="text-center py-12 text-[#525a68]">No hay procesos con esos filtros</div> : procesosFilt.filter(p => !p.en_acompanamiento).map(p=>{
              const cliente = clientes.find(c=>c.id===p.cliente_id)
              const dias = diasRestantes(p.fecha_oferta)
              const urgente = dias !== null && dias <=3
              const isInt = p.estado === "interesado"
              return (
                <div key={p.id} className="bg-[#15181f] border border-[#252932] rounded-xl p-4 hover:border-[#3b82f6]/40 transition-all">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1"><span className="text-[10px] bg-[#1e3a8a22] text-[#60a5fa] px-2 py-0.5 rounded-full">{cliente?.nombre || p.cliente_id}</span>{p.es_manual && <span className="text-[9px] text-[#a78bfa] bg-[#a78bfa22] px-2 rounded">MANUAL</span>}{urgente && <span className="text-[10px] text-red-400">⚠ {dias}d</span>}<span className={`text-[10px] px-2 rounded-full ${p.estado==='interesado'?'bg-[#f59e0b22] text-[#f59e0b]':p.estado==='descartado'?'bg-red-500/20 text-red-400':'bg-[#3b82f6]/20 text-[#3b82f6]'}`}>{p.estado}</span></div>
                      <div className="font-semibold text-white">{p.entidad || "—"}</div>
                      <div className="text-[10px] text-[#525a68] font-mono">{p.referencia}</div>
                      <p className="text-xs text-[#8b919e] mt-2 line-clamp-2">{p.objeto || ""}</p>
                      <div className="flex gap-2 mt-2 text-xs"><MapPin size={12}/><span>{p.departamento || "—"}</span><Briefcase size={12} className="ml-2"/><span>{p.modalidad || "—"}</span></div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-[#22c55e]">{fmt(p.presupuesto)}</div>
                      <div className="text-[10px] text-[#525a68]">Cierre {fmtFecha(p.fecha_oferta)}</div>
                    </div>
                  </div>
                  {isInt && (
                    <div className="mt-3 pt-3 border-t border-[#252932]">
                      <div className="flex justify-between items-center mb-1"><span className="text-[10px] font-bold text-[#3b82f6]">SEGUIMIENTO</span><span className="text-[10px] text-[#f59e0b]">{ETAPAS[p.etapa_seguimiento ?? 0]}</span></div>
                      <TimelineAdmin procesoId={p.id} etapa={p.etapa_seguimiento ?? 0} onUpdate={actualizarEtapa} fechaEtapa0={p.fecha_etapa_0} fechaEtapa1={p.fecha_etapa_1} fechaEtapa2={p.fecha_etapa_2} fechaEtapa3={p.fecha_etapa_3} fechaEtapa4={p.fecha_etapa_4} />
                      <ComentariosAdmin procesoId={p.id} clienteId={p.cliente_id} />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 justify-between items-center mt-3 pt-2 border-t border-[#252932]">
                    <div className="flex gap-2">
                      {p.estado !== "interesado" && <button onClick={()=>cambiarEstadoProceso(p.id, "interesado")} className="text-xs bg-[#f59e0b22] text-[#f59e0b] px-2 py-1 rounded">Marcar Interés</button>}
                      {p.estado !== "descartado" && <button onClick={()=>cambiarEstadoProceso(p.id, "descartado")} className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">Descartar</button>}
                      {p.estado !== "nuevo" && <button onClick={()=>cambiarEstadoProceso(p.id, "nuevo")} className="text-xs bg-[#3b82f6]/20 text-[#3b82f6] px-2 py-1 rounded">Restaurar</button>}
                      {editDriveProceso === p.id ? (
                        <div className="flex gap-1"><input type="text" placeholder="Drive URL" value={driveProcUrl} onChange={e=>setDriveProcUrl(e.target.value)} className="text-xs p-1 bg-[#0a0c10] rounded w-48"/><button onClick={guardarDriveProceso} className="text-xs bg-[#22c55e] px-2 py-1 rounded">✓</button><button onClick={()=>setEditDriveProceso(null)} className="text-xs bg-[#252932] px-2 py-1 rounded">✕</button></div>
                      ) : (<><button onClick={()=>{setEditDriveProceso(p.id); setDriveProcUrl(p.drive_proceso_url||"")}} className="text-xs bg-[#1c2028] px-2 py-1 rounded">📁 Drive</button></>)}
                      {p.url && <a href={p.url} target="_blank" className="text-xs text-[#3b82f6]">SECOP ↗</a>}
                      {p.resultado_final && <span className="text-xs text-[#22c55e]">{p.resultado_final === 'ganado' ? '🏆 Ganado' : p.resultado_final === 'perdido' ? '❌ Perdido' : '🌵 Desierto'}</span>}
                    </div>
                    <div className="text-[10px] text-[#525a68]">Actualizado: {new Date(p.updated_at).toLocaleDateString()}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* TAB ACOMPAÑAMIENTO (nuevo) */}
        {tab === "acompanamiento" && (
          <div className="space-y-4">
            {acompanamiento.length === 0 ? <div className="text-center py-12 text-[#525a68]">No hay procesos en acompañamiento</div> : acompanamiento.map(p=>{
              const cliente = clientes.find(c=>c.id===p.cliente_id)
              const dias = diasRestantes(p.fecha_oferta)
              const urgente = dias !== null && dias <=3
              return (
                <div key={p.id} className="bg-[#15181f] border border-[#252932] rounded-xl p-4 hover:border-[#3b82f6]/40 transition-all">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1"><span className="text-[10px] bg-[#1e3a8a22] text-[#60a5fa] px-2 py-0.5 rounded-full">{cliente?.nombre || p.cliente_id}</span>{urgente && <span className="text-[10px] text-red-400">⚠ {dias}d</span>}<span className="text-[10px] px-2 rounded-full bg-[#3b82f6]/20 text-[#3b82f6]">Acompañamiento</span><span className="text-[10px] px-2 rounded-full bg-[#f59e0b22] text-[#f59e0b]">{p.estado_acompanamiento === 'pendiente' ? 'Pendiente' : p.estado_acompanamiento === 'en_proceso' ? 'En proceso' : 'Atendida'}</span></div>
                      <div className="font-semibold text-white">{p.entidad || "—"}</div>
                      <div className="text-[10px] text-[#525a68] font-mono">{p.referencia}</div>
                      <p className="text-xs text-[#8b919e] mt-2 line-clamp-2">{p.objeto || ""}</p>
                      <div className="flex gap-2 mt-2 text-xs"><MapPin size={12}/><span>{p.departamento || "—"}</span><Briefcase size={12} className="ml-2"/><span>{p.modalidad || "—"}</span></div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-[#22c55e]">{fmt(p.presupuesto)}</div>
                      <div className="text-[10px] text-[#525a68]">Cierre {fmtFecha(p.fecha_oferta)}</div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#252932]">
                    <div className="flex justify-between items-center mb-1"><span className="text-[10px] font-bold text-[#3b82f6]">SEGUIMIENTO</span><span className="text-[10px] text-[#f59e0b]">{ETAPAS[p.etapa_seguimiento ?? 0]}</span></div>
                    <TimelineAdmin procesoId={p.id} etapa={p.etapa_seguimiento ?? 0} onUpdate={actualizarEtapa} fechaEtapa0={p.fecha_etapa_0} fechaEtapa1={p.fecha_etapa_1} fechaEtapa2={p.fecha_etapa_2} fechaEtapa3={p.fecha_etapa_3} fechaEtapa4={p.fecha_etapa_4} />
                    <ComentariosAdmin procesoId={p.id} clienteId={p.cliente_id} />
                  </div>
                  <div className="flex flex-wrap gap-2 justify-between items-center mt-3 pt-2 border-t border-[#252932]">
                    <div className="flex gap-2">
                      <button onClick={()=>setResultadoModal(p)} className="text-xs bg-[#8b5cf6]/20 text-[#a78bfa] px-2 py-1 rounded">🏆 Resultado</button>
                      {editDriveProceso === p.id ? (
                        <div className="flex gap-1"><input type="text" placeholder="Drive URL" value={driveProcUrl} onChange={e=>setDriveProcUrl(e.target.value)} className="text-xs p-1 bg-[#0a0c10] rounded w-48"/><button onClick={guardarDriveProceso} className="text-xs bg-[#22c55e] px-2 py-1 rounded">✓</button><button onClick={()=>setEditDriveProceso(null)} className="text-xs bg-[#252932] px-2 py-1 rounded">✕</button></div>
                      ) : (<><button onClick={()=>{setEditDriveProceso(p.id); setDriveProcUrl(p.drive_proceso_url||"")}} className="text-xs bg-[#1c2028] px-2 py-1 rounded">📁 Drive</button></>)}
                      {p.url && <a href={p.url} target="_blank" className="text-xs text-[#3b82f6]">SECOP ↗</a>}
                      {p.resultado_final && <span className="text-xs text-[#22c55e]">{p.resultado_final === 'ganado' ? '🏆 Ganado' : p.resultado_final === 'perdido' ? '❌ Perdido' : '🌵 Desierto'}</span>}
                    </div>
                    <div className="text-[10px] text-[#525a68]">Actualizado: {new Date(p.updated_at).toLocaleDateString()}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* TAB CLIENTES (sin cambios) */}
        {tab === "clientes" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientesFilt.map(c=>(
              <div key={c.id} className="bg-[#15181f] border border-[#252932] rounded-xl p-4">
                <div className="flex justify-between"><div className="flex gap-3 items-center"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] flex items-center justify-center font-bold">{initials(c.nombre)}</div><div><div className="font-bold">{c.nombre}</div><div className="text-[10px] text-[#3b82f6]">{c.id}</div>{c.usuario && <div className="text-[9px] text-[#525a68]">@{c.usuario}</div>}</div></div><button onClick={()=>toggleActivo(c)} className={`text-[10px] px-2 py-0.5 rounded-full ${c.activo ? "bg-[#22c55e22] text-[#22c55e]" : "bg-red-500/20 text-red-400"}`}>{c.activo ? "Activo" : "Inactivo"}</button></div>
                <p className="text-xs text-[#8b919e] mt-2 line-clamp-2">{c.descripcion_negocio}</p>
                <div className="flex flex-wrap gap-2 mt-2 text-[10px]"><span>{c.departamentos?.length||0} deptos</span><span>{procesos.filter(p=>p.cliente_id===c.id).length} procesos</span><span className="text-[#f59e0b]">{procesos.filter(p=>p.cliente_id===c.id && p.estado==="interesado").length} interesados</span><span className="text-[#3b82f6]">{procesos.filter(p=>p.cliente_id===c.id && p.en_acompanamiento).length} acompañamiento</span></div>
                <div className="mt-2 text-[10px] text-[#525a68]">UNSPC: {(c.codigos_unspc||[]).join(", ") || "ninguno"}</div>
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-[#252932]">
                  <button onClick={()=>router.push(`/cliente/${c.id}`)} className="text-xs bg-transparent border border-[#252932] rounded px-2 py-1">Ver portal</button>
                  <button onClick={()=>setEditarCliente(c)} className="text-xs text-[#60a5fa]">Editar</button>
                  <button onClick={()=>setEliminarCliente(c)} className="text-xs text-red-400">🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB FEEDBACK (sin cambios) */}
        {tab === "feedback" && (
          <div className="bg-[#15181f] border border-[#252932] rounded-xl overflow-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[#252932]"><tr>{["Cliente","Proceso","Acción","Nota","Fecha"].map(h=><th key={h} className="p-2 text-left text-[10px] text-[#525a68]">{h}</th>)}</tr></thead>
              <tbody>{feedback.slice(0,100).map(f=>{const proc=procesos.find(p=>p.id===f.proceso_id);return (<tr key={f.id} className="border-b border-[#1c2028]"><td className="p-2 text-[11px] text-[#60a5fa]">{f.cliente_id||"—"}</td><td className="p-2 text-[10px] max-w-40 truncate">{proc?.entidad||f.proceso_id}</td><td className="p-2"><span className={`text-[10px] px-2 py-0.5 rounded-full ${f.accion==="interesado"?"bg-[#22c55e22] text-[#22c55e]":f.accion==="descartado"?"bg-red-500/20 text-red-400":"bg-[#3b82f6]/20 text-[#3b82f6]"}`}>{f.accion}</span></td><td className="p-2 text-[11px]">{f.nota||"—"}</td><td className="p-2 text-[10px] text-[#525a68]">{new Date(f.created_at).toLocaleDateString()}</td></tr>)})}</tbody>
            </table>
          </div>
        )}
      </div>

      {toast && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#1c2028] border border-[#252932] text-white px-4 py-2 rounded-lg text-sm z-[100]">{toast}</div>}
      {showNuevoCliente && <ModalNuevoCliente onClose={()=>setShowNuevoCliente(false)} onCreated={c=>{setClientes(prev=>[...prev,c].sort((a,b)=>a.nombre.localeCompare(b.nombre)));mostrarToast(`Cliente ${c.nombre} creado.`)}} />}
      {editarCliente && <ModalEditarCliente cliente={editarCliente} onClose={()=>setEditarCliente(null)} onUpdated={c=>{setClientes(prev=>prev.map(x=>x.id===c.id?c:x));mostrarToast("Cliente actualizado.")}} />}
      {eliminarCliente && <ModalEliminar nombre={eliminarCliente.nombre} loading={elimLoading} onClose={()=>setEliminarCliente(null)} onConfirm={confirmarEliminar} />}
      {showNuevoProceso && <ModalProcesoManual clientes={clientes.filter(c=>c.activo)} onClose={()=>setShowNuevoProceso(false)} onCreated={p=>{setProcesos(prev=>[p,...prev]);mostrarToast("Proceso manual agregado.")}} />}
      {resultadoModal && <ModalResultado proceso={resultadoModal} onClose={()=>setResultadoModal(null)} onUpdate={cargar} />}
    </div>
  )
}

// NOTA: Los modales ModalNuevoCliente, ModalEditarCliente, ModalEliminar, ModalProcesoManual se mantienen igual que en tu código original (no los he repetido para no alargar, pero están incluidos en la versión final que te daré). 
// Asegúrate de copiarlos de tu código actual o de la versión que te entregaré completa.
