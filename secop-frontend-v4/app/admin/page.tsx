"use client"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Cliente, Proceso, Feedback, SolicitudAcompanamiento, Comentario } from "@/types"
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area
} from "recharts"
import {
  Bell, Search, LogOut, ExternalLink, Send, FolderOpen, Archive,
  Clock, TrendingUp, PieChart as PieChartIcon, Zap, Save, AlertTriangle,
  FileText, CheckCircle, MapPin, Briefcase, Filter, DollarSign, Users,
  Activity, UserCheck, Eye, Trash2, Edit3, ChevronRight, RefreshCw,
  PlusCircle, BarChart as BarChartIcon, MessageSquare, Calendar, HelpCircle
} from "lucide-react"

// ---------- CONSTANTES ----------
const ADMIN_PASS = "admin2024oc"
const ETAPAS = ["Análisis", "Tu aprobación", "Organización", "Presentación", "Resultado"]
const DEPARTAMENTOS_CO = [ /* ... lista completa ... */ ]  // asegúrate de copiar la lista

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
function diasRestantes(f: string | null) {
  if (!f) return null
  const hoy = new Date(); hoy.setHours(0,0,0,0)
  const fe = new Date(f); fe.setHours(0,0,0,0)
  return Math.ceil((fe.getTime() - hoy.getTime()) / 86400000)
}
function initials(nombre: string) {
  return nombre.split(" ").map(w => w[0]).join("").substring(0,2).toUpperCase()
}

// ---------- COMPONENTES UI (Overlay, CloseBtn, TimelineAdmin) ----------
// (copiar los mismos componentes que ya tenías, no los repito para no alargar)
// Asegúrate de tener el componente TimelineAdmin exactamente igual al original.

// ... (inserta aquí los componentes Overlay, CloseBtn, TimelineAdmin, ModalNuevoCliente, ModalEditarCliente, ModalProcesoManual, ModalEliminar)
// Para evitar duplicar, puedes copiarlos del archivo anterior que funcionaba.

// ---------- COMPONENTE PRINCIPAL ADMIN ----------
export default function AdminPage() {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [pass, setPass] = useState("")
  const [loginErr, setLoginErr] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [procesos, setProcesos] = useState<Proceso[]>([])
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [solicitudes, setSolicitudes] = useState<SolicitudAcompanamiento[]>([])
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

  // Estados para solicitudes
  const [comentariosSolicitud, setComentariosSolicitud] = useState<Record<string, Comentario[]>>({})
  const [nuevoComentarioSolicitud, setNuevoComentarioSolicitud] = useState<Record<string, string>>({})
  const [enviandoComentarioSolicitud, setEnviandoComentarioSolicitud] = useState<Record<string, boolean>>({})
  const [editarFechasEtapa, setEditarFechasEtapa] = useState<{ solicitudId: string; etapa: number } | null>(null)
  const [fechaTemp, setFechaTemp] = useState("")
  const [prefillCliente, setPrefillCliente] = useState<Partial<Cliente> | undefined>(undefined)
  // Para resultado final en procesos normales
  const [mostrarModalResultado, setMostrarModalResultado] = useState<string | null>(null)
  const [fechaInformeTemp, setFechaInformeTemp] = useState("")
  const [resultadoTemp, setResultadoTemp] = useState<"ganado" | "perdido" | "desierto" | "">("")
  const [notaResultadoTemp, setNotaResultadoTemp] = useState("")

  useEffect(() => {
    if (sessionStorage.getItem("secop_admin") === btoa(ADMIN_PASS)) { setAuthed(true); cargar() }
    else setLoading(false)
  }, [])

  async function cargar() {
    setLoading(true)
    // Obtener IDs de procesos con solicitud activa (pendiente o en_proceso)
    const { data: solicitudesActivas } = await supabase
      .from("solicitudes_acompanamiento")
      .select("proceso_id")
      .in("estado", ["pendiente", "en_proceso"])
      .not("proceso_id", "is", null)
    const idsExcluir = solicitudesActivas?.map(s => s.proceso_id) || []

    let procesosQuery = supabase.from("procesos").select("*").order("updated_at", { ascending: false })
    if (idsExcluir.length > 0) {
      procesosQuery = procesosQuery.not("id", "in", `(${idsExcluir.join(",")})`)
    }
    const [{ data: c }, { data: p }, { data: f }, { data: s }] = await Promise.all([
      supabase.from("clientes").select("*").order("nombre"),
      procesosQuery,
      supabase.from("feedback").select("*").order("created_at", { ascending: false }),
      supabase.from("solicitudes_acompanamiento").select("*").order("created_at", { ascending: false }),
    ])
    setClientes(c || [])
    setProcesos(p || [])
    setFeedback(f || [])
    setSolicitudes(s || [])
    const hoy = new Date()
    const ayer = new Date(hoy.getTime() - 24*60*60*1000)
    const nuevosFeed = (f || []).filter(fb => new Date(fb.created_at) > ayer && (fb.accion === "interesado" || fb.accion === "enviado_sofia"))
    setNotificaciones(nuevosFeed)
    setLoading(false)
  }

  function mostrarToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3500) }

  // Funciones para solicitudes
  async function actualizarEstadoSolicitud(id: string, nuevoEstado: string) {
    await supabase.from("solicitudes_acompanamiento").update({ estado: nuevoEstado }).eq("id", id)
    setSolicitudes(prev => prev.map(s => s.id === id ? { ...s, estado: nuevoEstado as any } : s))
    mostrarToast("Estado actualizado")
  }

  async function actualizarNombreEtapaSolicitud(solicitudId: string, nombre: string) {
    await supabase.from("solicitudes_acompanamiento").update({ etapa_nombre: nombre || null }).eq("id", solicitudId)
    setSolicitudes(prev => prev.map(s => s.id === solicitudId ? { ...s, etapa_nombre: nombre || null } : s))
    mostrarToast("Nombre de etapa actualizado")
  }

  async function cargarComentariosSolicitud(solicitudId: string) {
    const { data } = await supabase.from("comentarios").select("*").eq("solicitud_id", solicitudId).order("created_at", { ascending: true })
    if (data) setComentariosSolicitud(prev => ({ ...prev, [solicitudId]: data }))
  }

  async function enviarComentarioSolicitud(solicitudId: string, clienteId: string) {
    const texto = nuevoComentarioSolicitud[solicitudId]?.trim()
    if (!texto) return
    setEnviandoComentarioSolicitud(prev => ({ ...prev, [solicitudId]: true }))
    await supabase.from("comentarios").insert({
      solicitud_id: solicitudId,
      cliente_id: clienteId,
      autor: "admin",
      texto
    })
    await cargarComentariosSolicitud(solicitudId)
    setNuevoComentarioSolicitud(prev => ({ ...prev, [solicitudId]: "" }))
    setEnviandoComentarioSolicitud(prev => ({ ...prev, [solicitudId]: false }))
    mostrarToast("Comentario enviado al cliente")
  }

  async function guardarFechaEtapaSolicitud(solicitudId: string, etapa: number, fecha: string) {
    const campo = `fecha_etapa_${etapa}`
    await supabase.from("solicitudes_acompanamiento").update({ [campo]: fecha || null }).eq("id", solicitudId)
    setSolicitudes(prev => prev.map(s => s.id === solicitudId ? { ...s, [campo]: fecha || null } : s))
    setEditarFechasEtapa(null)
    setFechaTemp("")
    mostrarToast(`Fecha de etapa ${etapa+1} guardada`)
  }

  async function guardarResultadoFinal(procesoId: string) {
    await supabase.from("procesos").update({
      resultado_final: resultadoTemp || null,
      nota_resultado: notaResultadoTemp || null,
      fecha_informe_evaluacion: fechaInformeTemp || null
    }).eq("id", procesoId)
    setProcesos(prev => prev.map(p => p.id === procesoId ? { ...p, resultado_final: resultadoTemp || null, nota_resultado: notaResultadoTemp || null, fecha_informe_evaluacion: fechaInformeTemp || null } : p))
    setMostrarModalResultado(null)
    setResultadoTemp("")
    setNotaResultadoTemp("")
    setFechaInformeTemp("")
    mostrarToast("Resultado final actualizado")
  }

  // Resto de funciones existentes (toggleActivo, confirmarEliminar, guardarDrive, etc.)
  // ... (copia las que ya tenías funcionando)

  const clientesFilt = clientes.filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || c.id.toLowerCase().includes(busqueda.toLowerCase()))
  const procesosFilt = procesos.filter(p => {
    if (clienteSel && p.cliente_id !== clienteSel) return false
    if (estadoSel !== "todos" && p.estado !== estadoSel) return false
    if (busqueda && !p.entidad?.toLowerCase().includes(busqueda.toLowerCase()) && !p.referencia.toLowerCase().includes(busqueda.toLowerCase()) && !p.objeto?.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })
  // ... métricas y demás

  // Renderizado (similar al original pero con la pestaña solicitudes completamente funcional)
  // Te doy el JSX solo de la pestaña solicitudes, ya que el resto lo puedes mantener igual.
  // Asegúrate de que en el return, dentro del div de tabs, incluyas "solicitudes" y el contenido correspondiente.

  if (!authed) return ( /* login */ )
  if (loading) return ( /* loading */ )

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white font-sans">
      {/* Navbar igual */}
      <nav>...</nav>
      <div className="max-w-[1400px] mx-auto p-6">
        {/* Stats row */}
        {/* Gráficos */}
        {/* Filtros */}
        {/* Tabs */}
        <div className="flex gap-2 border-b border-[#252932] mb-4">
          {["procesos","clientes","feedback","solicitudes"].map(t=> <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 text-sm font-medium ${tab===t ? "text-[#3b82f6] border-b-2 border-[#3b82f6]" : "text-[#8b919e]"}`}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}
        </div>

        {/* TAB PROCESOS (similar al original, con resultado final) */}
        {tab === "procesos" && ( /* tu código de procesos con los botones de resultado final */ )}

        {/* TAB CLIENTES (sin cambios) */}
        {tab === "clientes" && ( /* tu código */ )}

        {/* TAB FEEDBACK (sin cambios) */}
        {tab === "feedback" && ( /* tu código */ )}

        {/* TAB SOLICITUDES (completo) */}
        {tab === "solicitudes" && (
          <div className="space-y-4">
            {solicitudes.length === 0 ? (
              <div className="text-center py-12 text-[#525a68]">No hay solicitudes de acompañamiento.</div>
            ) : (
              solicitudes.map(sol => {
                const proceso = procesos.find(p => p.id === sol.proceso_id)
                const clienteSol = clientes.find(c => c.id === sol.cliente_id)
                if (!comentariosSolicitud[sol.id]) cargarComentariosSolicitud(sol.id)
                const etapaActual = sol.etapa_actual ?? 0
                const nombreEtapa = sol.etapa_nombre || ETAPAS[etapaActual]
                return (
                  <div key={sol.id} className="bg-[#15181f] border border-[#252932] rounded-xl p-5">
                    {/* Cabecera */}
                    <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
                      <div>
                        <div className="font-bold text-white text-lg">{proceso?.entidad || "Proceso"}</div>
                        <div className="text-xs text-[#3b82f6] font-mono">{proceso?.referencia || sol.numero_proceso}</div>
                        <div className="text-xs text-[#525a68] mt-1">Cliente: {clienteSol?.nombre || sol.empresa}</div>
                      </div>
                      <div className="flex gap-2">
                        <select value={sol.estado} onChange={e => actualizarEstadoSolicitud(sol.id, e.target.value)} className="text-xs bg-[#1c2028] rounded px-2 py-1">
                          <option value="pendiente">Pendiente</option><option value="en_proceso">En proceso</option><option value="atendida">Atendida</option>
                        </select>
                        <button onClick={() => { setPrefillCliente({ nombre: sol.empresa, descripcion_negocio: `Solicitud: ${sol.numero_proceso}`, email_destinatario: sol.empresa.includes('@') ? sol.empresa : undefined }); setShowNuevoCliente(true); }} className="text-xs bg-[#3b82f6] px-2 py-1 rounded">Crear cliente</button>
                      </div>
                    </div>

                    {/* Detalles */}
                    <div className="bg-[#1c2028] rounded-lg p-3 mb-4">
                      <p className="text-sm text-[#8b919e]">{proceso?.objeto || sol.observaciones}</p>
                      <div className="flex gap-3 mt-2 text-xs">
                        {proceso?.departamento && <span><MapPin size={12} className="inline mr-1" />{proceso.departamento}</span>}
                        {proceso?.modalidad && <span><Briefcase size={12} className="inline mr-1" />{proceso.modalidad}</span>}
                        <span className="text-[#22c55e]">{fmt(proceso?.presupuesto)}</span>
                      </div>
                      {sol.enlace && <a href={sol.enlace} target="_blank" rel="noreferrer" className="text-xs text-[#60a5fa] block mt-2">Ver SECOP ↗</a>}
                    </div>

                    {/* Etapas */}
                    <div className="border-t border-[#252932] pt-3 mb-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-[#3b82f6] uppercase">Seguimiento de gestión</span>
                        <div className="flex items-center gap-2">
                          <input type="text" value={nombreEtapa} onChange={(e) => actualizarNombreEtapaSolicitud(sol.id, e.target.value)} className="text-[10px] bg-[#1c2028] rounded px-2 py-1 text-[#f59e0b] w-36 text-center" placeholder="Nombre personalizado" />
                          <span className="text-[9px] text-[#525a68]">(estándar: {ETAPAS[etapaActual]})</span>
                        </div>
                      </div>
                      <TimelineAdmin procesoId={sol.id} etapa={etapaActual} onUpdate={async (id, etapaNueva) => {
                        await supabase.from("solicitudes_acompanamiento").update({ etapa_actual: etapaNueva }).eq("id", id)
                        setSolicitudes(prev => prev.map(s => s.id === id ? { ...s, etapa_actual: etapaNueva } : s))
                        mostrarToast(`Etapa actualizada a ${ETAPAS[etapaNueva]}`)
                      }} />
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => setEditarFechasEtapa({ solicitudId: sol.id, etapa: etapaActual })} className="text-xs bg-[#1c2028] px-2 py-1 rounded"><Calendar size={10} className="inline mr-1" /> Fecha etapa</button>
                      </div>
                      {editarFechasEtapa?.solicitudId === sol.id && (
                        <div className="mt-2 p-2 bg-[#1c2028] rounded flex gap-2">
                          <input type="datetime-local" value={fechaTemp} onChange={e => setFechaTemp(e.target.value)} className="text-xs bg-[#0a0c10] p-1 rounded" />
                          <button onClick={() => guardarFechaEtapaSolicitud(sol.id, editarFechasEtapa.etapa, fechaTemp)} className="text-xs bg-[#22c55e] px-2 py-1 rounded">Guardar</button>
                          <button onClick={() => setEditarFechasEtapa(null)} className="text-xs bg-[#252932] px-2 py-1 rounded">Cancelar</button>
                        </div>
                      )}
                    </div>

                    {/* Comentarios */}
                    <div className="border-t border-[#252932] pt-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-[#60a5fa] flex items-center gap-1"><MessageSquare size={12}/> Comentarios ({comentariosSolicitud[sol.id]?.length || 0})</span>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto mb-2">
                        {(comentariosSolicitud[sol.id] || []).map(c => (
                          <div key={c.id} className={`text-xs p-2 rounded ${c.autor === 'admin' ? 'bg-[#3b82f6]/10 border-l-2 border-[#3b82f6]' : 'bg-[#1c2028]'}`}>
                            <div className="flex justify-between text-[10px] text-[#525a68]">
                              <span className="font-bold">{c.autor === 'admin' ? 'Admin' : clienteSol?.nombre || 'Cliente'}</span>
                              <span>{new Date(c.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-white/80">{c.texto}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-1">
                        <input type="text" placeholder="Escribe una respuesta..." className="flex-1 text-xs bg-[#1c2028] p-2 rounded" value={nuevoComentarioSolicitud[sol.id] || ""} onChange={e => setNuevoComentarioSolicitud({...nuevoComentarioSolicitud, [sol.id]: e.target.value})} onKeyDown={e => { if (e.key === 'Enter') enviarComentarioSolicitud(sol.id, sol.cliente_id) }} />
                        <button onClick={() => enviarComentarioSolicitud(sol.id, sol.cliente_id)} className="bg-[#3b82f6] text-xs px-3 py-1 rounded">Enviar</button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
      {toast && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#1c2028] border border-[#252932] text-white px-4 py-2 rounded-lg text-sm z-[100]">{toast}</div>}
      {/* Modales */}
    </div>
  )
}
