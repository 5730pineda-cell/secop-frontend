"use client"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Cliente, Proceso, Feedback } from "@/types"
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area
} from "recharts"
import {
  Bell, Search, LogOut, ExternalLink, Send, FolderOpen, Archive,
  Clock, TrendingUp, PieChart as PieChartIcon, Zap, Save, AlertTriangle,
  FileText, CheckCircle, MapPin, Briefcase, Filter, DollarSign, Users,
  Activity, UserCheck, Eye, Trash2, Edit3, ChevronRight, RefreshCw,
  PlusCircle, BarChart as BarChartIcon
} from "lucide-react"

// ---------- CONSTANTES ----------
const ADMIN_PASS = "admin2024oc"
const ETAPAS = ["Análisis", "Tu aprobación", "Organización", "Presentación", "Resultado"]
const DEPARTAMENTOS_CO = [
  "Amazonas","Antioquia","Arauca","Atlántico","Bolívar","Boyacá","Caldas","Caquetá",
  "Casanare","Cauca","Cesar","Chocó","Córdoba","Cundinamarca","Guainía","Guaviare",
  "Huila","La Guajira","Magdalena","Meta","Nariño","Norte de Santander","Putumayo",
  "Quindío","Risaralda","San Andrés y Providencia","Santander","Sucre","Tolima",
  "Valle del Cauca","Vaupés","Vichada","Bogotá D.C."
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

// ---------- TIMELINE ADMIN ----------
function TimelineAdmin({ procesoId, etapa, onUpdate }: { procesoId: string; etapa: number; onUpdate: (id: string, i: number) => void }) {
  const [updating, setUpdating] = useState(false)
  const idx = typeof etapa === "number" ? etapa : 0
  async function irEtapa(i: number) {
    if (updating || i === idx) return
    setUpdating(true)
    await supabase.from("procesos").update({ etapa_seguimiento: i }).eq("id", procesoId)
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
          </div>
        )
      })}
    </div>
  )
}

// ---------- MODAL NUEVO CLIENTE ----------
function ModalNuevoCliente({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Cliente) => void }) {
  const [form, setForm] = useState({
    id: "", nombre: "", usuario: "", password_hash: "",
    descripcion_negocio: "", palabras_clave: "", palabras_excluidas: "",
    departamentos: [] as string[], presupuesto_minimo: "0",
    usar_ia: true, activo: true, email_destinatario: "", drive_url: "",
    codigos_unspc_str: "",
    restringir_minima: false   // nuevo flag
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  function toggleDepto(d: string) {
    setForm(f => ({ ...f, departamentos: f.departamentos.includes(d) ? f.departamentos.filter(x => x !== d) : [...f.departamentos, d] }))
  }
  function toggleTodosDeptos() {
    setForm(f => ({ ...f, departamentos: f.departamentos.length === DEPARTAMENTOS_CO.length ? [] : [...DEPARTAMENTOS_CO] }))
  }

  async function guardar() {
    if (!form.id.trim() || !form.nombre.trim()) { setErr("ID y Nombre son obligatorios."); return }
    setSaving(true); setErr("")
    const codigosArray = form.codigos_unspc_str.split(",").map(c => c.trim()).filter(Boolean)
    const modalidadesArray = form.restringir_minima ? ["Mínima Cuantía"] : null
    const { data, error } = await supabase.from("clientes").insert([{
      id: form.id.trim().toLowerCase().replace(/\s+/g, "_"),
      nombre: form.nombre.trim(),
      usuario: form.usuario.trim() || null,
      password_hash: form.password_hash.trim() || null,
      descripcion_negocio: form.descripcion_negocio.trim(),
      palabras_clave: form.palabras_clave.split(",").map(x => x.trim()).filter(Boolean),
      palabras_excluidas: form.palabras_excluidas.split(",").map(x => x.trim()).filter(Boolean),
      departamentos: form.departamentos,
      presupuesto_minimo: Number(form.presupuesto_minimo) || 0,
      usar_ia: form.usar_ia, activo: form.activo,
      email_destinatario: form.email_destinatario.trim() || null,
      drive_url: form.drive_url.trim() || null,
      codigos_unspc: codigosArray,
      modalidades_permitidas: modalidadesArray,
    }]).select().single()
    setSaving(false)
    if (error) { setErr(error.message); return }
    onCreated(data as Cliente)
    onClose()
  }

  return (
    <Overlay onClose={onClose}>
      <div className="w-[min(720px,95vw)] max-h-[90vh] overflow-y-auto bg-[#111318] border border-[#252932] rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6"><div><h2 className="text-lg font-bold text-white">Nuevo cliente</h2><p className="text-xs text-[#525a68]">Datos de acceso y configuración IA</p></div><CloseBtn onClose={onClose} /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="text-[11px] text-[#525a68] block mb-1">ID ÚNICO *</label><input className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white text-sm" value={form.id} onChange={e => setForm(f=>({...f,id:e.target.value}))} /></div>
          <div><label className="text-[11px] text-[#525a68] block mb-1">NOMBRE EMPRESA *</label><input className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white text-sm" value={form.nombre} onChange={e => setForm(f=>({...f,nombre:e.target.value}))} /></div>
          <div><label className="text-[11px] text-[#525a68] block mb-1">USUARIO (login)</label><input className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white text-sm" value={form.usuario} onChange={e => setForm(f=>({...f,usuario:e.target.value}))} /></div>
          <div><label className="text-[11px] text-[#525a68] block mb-1">CONTRASEÑA</label><input type="password" className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white text-sm" value={form.password_hash} onChange={e => setForm(f=>({...f,password_hash:e.target.value}))} /></div>
          <div className="col-span-2"><label className="text-[11px] text-[#525a68] block mb-1">DESCRIPCIÓN DEL NEGOCIO</label><textarea rows={2} className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white text-sm" value={form.descripcion_negocio} onChange={e => setForm(f=>({...f,descripcion_negocio:e.target.value}))} /></div>
          <div><label className="text-[11px] text-[#525a68] block mb-1">PALABRAS CLAVE (coma)</label><input className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white text-sm" placeholder="infraestructura, obra civil" value={form.palabras_clave} onChange={e => setForm(f=>({...f,palabras_clave:e.target.value}))} /></div>
          <div><label className="text-[11px] text-[#525a68] block mb-1">PALABRAS EXCLUIDAS</label><input className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white text-sm" placeholder="seguridad, limpieza" value={form.palabras_excluidas} onChange={e => setForm(f=>({...f,palabras_excluidas:e.target.value}))} /></div>
          <div><label className="text-[11px] text-[#525a68] block mb-1">PRESUPUESTO MÍNIMO (COP)</label><input type="number" className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white text-sm" value={form.presupuesto_minimo} onChange={e => setForm(f=>({...f,presupuesto_minimo:e.target.value}))} /></div>
          <div><label className="text-[11px] text-[#525a68] block mb-1">EMAIL NOTIFICACIONES</label><input type="email" className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white text-sm" value={form.email_destinatario} onChange={e => setForm(f=>({...f,email_destinatario:e.target.value}))} /></div>
          <div className="col-span-2"><label className="text-[11px] text-[#525a68] block mb-1">GOOGLE DRIVE URL</label><input className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white text-sm" value={form.drive_url} onChange={e => setForm(f=>({...f,drive_url:e.target.value}))} /></div>
          <div className="col-span-2">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] text-[#525a68]">DEPARTAMENTOS A MONITOREAR</label>
              <button type="button" onClick={toggleTodosDeptos} className="text-[10px] text-[#3b82f6] hover:underline">
                {form.departamentos.length === DEPARTAMENTOS_CO.length ? "Deseleccionar todos" : "Seleccionar todos"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-[#252932] rounded bg-[#1c2028]">
              {DEPARTAMENTOS_CO.map(d => (
                <button key={d} type="button" onClick={() => toggleDepto(d)} className={`text-xs px-2 py-1 rounded-full border ${form.departamentos.includes(d) ? "border-[#3b82f6] bg-[#1e3a8a22] text-[#60a5fa]" : "border-[#252932] text-[#525a68]"}`}>{d}</button>
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <label className="text-[11px] text-[#525a68] block mb-1">CÓDIGOS UNSPC (separados por coma)</label>
            <input type="text" className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white text-sm" placeholder="Ej: 8016, 8111, 7210" value={form.codigos_unspc_str} onChange={e => setForm(f => ({ ...f, codigos_unspc_str: e.target.value }))} />
            <p className="text-[10px] text-[#525a68] mt-1">Códigos que la IA usará para filtrar procesos relevantes. Separa con comas.</p>
          </div>
          <div className="col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.restringir_minima}
                onChange={e => setForm(f => ({ ...f, restringir_minima: e.target.checked }))}
                className="w-4 h-4 accent-[#3b82f6]"
              />
              <span className="text-[11px] text-[#525a68]">Restringir solo a procesos de Mínima Cuantía (para empresas pequeñas sin RUP)</span>
            </label>
            <p className="text-[10px] text-[#525a68] mt-1">Si activas esta opción, el cliente solo verá procesos con modalidad "Mínima Cuantía".</p>
          </div>
          <div className="flex gap-4"><label className="flex items-center gap-2"><input type="checkbox" checked={form.usar_ia} onChange={e=>setForm(f=>({...f,usar_ia:e.target.checked}))} /><span className="text-xs">Usar IA</span></label><label className="flex items-center gap-2"><input type="checkbox" checked={form.activo} onChange={e=>setForm(f=>({...f,activo:e.target.checked}))} /><span className="text-xs">Activo al crear</span></label></div>
        </div>
        {err && <p className="text-red-500 text-xs mt-2">{err}</p>}
        <div className="flex gap-2 mt-6"><button onClick={onClose} className="flex-1 py-2 bg-transparent border border-[#252932] rounded text-[#525a68]">Cancelar</button><button onClick={guardar} disabled={saving} className="flex-2 py-2 bg-[#3b82f6] rounded text-white font-bold">{saving ? "Creando..." : "Crear cliente"}</button></div>
      </div>
    </Overlay>
  )
}

// ---------- MODAL EDITAR CLIENTE ----------
function ModalEditarCliente({ cliente, onClose, onUpdated }: { cliente: Cliente; onClose: () => void; onUpdated: (c: Cliente) => void }) {
  const [form, setForm] = useState({
    nombre: cliente.nombre, usuario: cliente.usuario || "", password_hash: "",
    descripcion_negocio: cliente.descripcion_negocio || "",
    palabras_clave: (cliente.palabras_clave || []).join(", "),
    palabras_excluidas: (cliente.palabras_excluidas || []).join(", "),
    departamentos: cliente.departamentos || [],
    presupuesto_minimo: String(cliente.presupuesto_minimo || 0),
    usar_ia: cliente.usar_ia, email_destinatario: cliente.email_destinatario || "",
    drive_url: cliente.drive_url || "",
    codigos_unspc_str: (cliente.codigos_unspc || []).join(", "),
    restringir_minima: (cliente.modalidades_permitidas || []).includes("Mínima Cuantía")
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")
  function toggleDepto(d: string) { setForm(f => ({ ...f, departamentos: f.departamentos.includes(d) ? f.departamentos.filter(x=>x!==d) : [...f.departamentos, d] })) }
  function toggleTodosDeptos() {
    setForm(f => ({ ...f, departamentos: f.departamentos.length === DEPARTAMENTOS_CO.length ? [] : [...DEPARTAMENTOS_CO] }))
  }
  async function guardar() {
    setSaving(true); setErr("")
    const codigosArray = form.codigos_unspc_str.split(",").map(c => c.trim()).filter(Boolean)
    const modalidadesArray = form.restringir_minima ? ["Mínima Cuantía"] : null
    const update: Partial<Cliente> = {
      nombre: form.nombre.trim(), usuario: form.usuario.trim() || null,
      descripcion_negocio: form.descripcion_negocio.trim(),
      palabras_clave: form.palabras_clave.split(",").map(x=>x.trim()).filter(Boolean),
      palabras_excluidas: form.palabras_excluidas.split(",").map(x=>x.trim()).filter(Boolean),
      departamentos: form.departamentos, presupuesto_minimo: Number(form.presupuesto_minimo) || 0,
      usar_ia: form.usar_ia, email_destinatario: form.email_destinatario.trim() || null,
      drive_url: form.drive_url.trim() || null, codigos_unspc: codigosArray,
      modalidades_permitidas: modalidadesArray,
    }
    if (form.password_hash.trim()) update.password_hash = form.password_hash.trim()
    const { error } = await supabase.from("clientes").update(update).eq("id", cliente.id)
    setSaving(false)
    if (error) { setErr(error.message); return }
    onUpdated({ ...cliente, ...update })
    onClose()
  }
  return (
    <Overlay onClose={onClose}>
      <div className="w-[min(720px,95vw)] max-h-[90vh] overflow-y-auto bg-[#111318] border border-[#252932] rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6"><div><h2 className="text-lg font-bold text-white">Editar cliente</h2><p className="text-xs text-[#3b82f6]">{cliente.id}</p></div><CloseBtn onClose={onClose} /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="text-[11px] text-[#525a68]">NOMBRE EMPRESA</label><input className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white" value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} /></div>
          <div><label className="text-[11px] text-[#525a68]">USUARIO</label><input className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white" value={form.usuario} onChange={e=>setForm(f=>({...f,usuario:e.target.value}))} /></div>
          <div className="col-span-2"><label className="text-[11px] text-[#525a68]">NUEVA CONTRASEÑA (dejar vacío para no cambiar)</label><input type="password" className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white" value={form.password_hash} onChange={e=>setForm(f=>({...f,password_hash:e.target.value}))} /></div>
          <div className="col-span-2"><label className="text-[11px] text-[#525a68]">DESCRIPCIÓN</label><textarea rows={2} className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white" value={form.descripcion_negocio} onChange={e=>setForm(f=>({...f,descripcion_negocio:e.target.value}))} /></div>
          <div><label className="text-[11px] text-[#525a68]">PALABRAS CLAVE</label><input className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white" value={form.palabras_clave} onChange={e=>setForm(f=>({...f,palabras_clave:e.target.value}))} /></div>
          <div><label className="text-[11px] text-[#525a68]">PALABRAS EXCLUIDAS</label><input className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white" value={form.palabras_excluidas} onChange={e=>setForm(f=>({...f,palabras_excluidas:e.target.value}))} /></div>
          <div><label className="text-[11px] text-[#525a68]">PRESUPUESTO MÍNIMO</label><input type="number" className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white" value={form.presupuesto_minimo} onChange={e=>setForm(f=>({...f,presupuesto_minimo:e.target.value}))} /></div>
          <div><label className="text-[11px] text-[#525a68]">EMAIL NOTIFICACIONES</label><input className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white" value={form.email_destinatario} onChange={e=>setForm(f=>({...f,email_destinatario:e.target.value}))} /></div>
          <div className="col-span-2"><label className="text-[11px] text-[#525a68]">GOOGLE DRIVE URL</label><input className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white" value={form.drive_url} onChange={e=>setForm(f=>({...f,drive_url:e.target.value}))} /></div>
          <div className="col-span-2">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] text-[#525a68]">DEPARTAMENTOS</label>
              <button type="button" onClick={toggleTodosDeptos} className="text-[10px] text-[#3b82f6] hover:underline">
                {form.departamentos.length === DEPARTAMENTOS_CO.length ? "Deseleccionar todos" : "Seleccionar todos"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-[#252932] rounded bg-[#1c2028]">
              {DEPARTAMENTOS_CO.map(d => <button key={d} type="button" onClick={()=>toggleDepto(d)} className={`text-xs px-2 py-1 rounded-full border ${form.departamentos.includes(d) ? "border-[#3b82f6] bg-[#1e3a8a22] text-[#60a5fa]" : "border-[#252932] text-[#525a68]"}`}>{d}</button>)}
            </div>
          </div>
          <div className="col-span-2">
            <label className="text-[11px] text-[#525a68] block mb-1">CÓDIGOS UNSPC (separados por coma)</label>
            <input type="text" className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white" placeholder="Ej: 8016, 8111, 7210" value={form.codigos_unspc_str} onChange={e=>setForm(f=>({...f,codigos_unspc_str:e.target.value}))} />
            <p className="text-[10px] text-[#525a68] mt-1">Códigos relevantes para la actividad de la empresa. Separa con comas.</p>
          </div>
          <div className="col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.restringir_minima}
                onChange={e => setForm(f => ({ ...f, restringir_minima: e.target.checked }))}
                className="w-4 h-4 accent-[#3b82f6]"
              />
              <span className="text-[11px] text-[#525a68]">Restringir solo a procesos de Mínima Cuantía</span>
            </label>
          </div>
          <div><label className="flex items-center gap-2"><input type="checkbox" checked={form.usar_ia} onChange={e=>setForm(f=>({...f,usar_ia:e.target.checked}))} /><span className="text-xs">Usar IA</span></label></div>
        </div>
        {err && <p className="text-red-500 text-xs mt-2">{err}</p>}
        <div className="flex gap-2 mt-6"><button onClick={onClose} className="flex-1 py-2 bg-transparent border border-[#252932] rounded text-[#525a68]">Cancelar</button><button onClick={guardar} disabled={saving} className="flex-2 py-2 bg-[#3b82f6] rounded text-white font-bold">{saving ? "Guardando..." : "Guardar cambios"}</button></div>
      </div>
    </Overlay>
  )
}

// ---------- MODAL PROCESO MANUAL (sin cambios relevantes) ----------
function ModalProcesoManual({ clientes, onClose, onCreated }: { clientes: Cliente[]; onClose: () => void; onCreated: (p: Proceso) => void }) {
  const [form, setForm] = useState({
    cliente_id: clientes[0]?.id || "", referencia: "", entidad: "", departamento: "", ciudad: "",
    modalidad: "Contratación Directa", objeto: "", presupuesto: "", fecha_publicacion: "", fecha_oferta: "",
    url: "", resultado_ia: false, razon_ia: ""
  })
  const [saving, setSaving] = useState(false); const [err, setErr] = useState("")
  async function guardar() {
    if (!form.cliente_id || !form.referencia.trim() || !form.entidad.trim()) { setErr("Cliente, Referencia y Entidad son obligatorios."); return }
    setSaving(true); setErr("")
    const { data, error } = await supabase.from("procesos").insert([{
      cliente_id: form.cliente_id, referencia: form.referencia.trim(), entidad: form.entidad.trim(),
      departamento: form.departamento.trim() || null, ciudad: form.ciudad.trim() || null, modalidad: form.modalidad || null,
      objeto: form.objeto.trim() || null, presupuesto: Number(form.presupuesto) || 0,
      fecha_publicacion: form.fecha_publicacion || null, fecha_oferta: form.fecha_oferta || null,
      url: form.url.trim() || null, resultado_ia: form.resultado_ia, razon_ia: form.razon_ia.trim() || null,
      estado: "nuevo", etapa_seguimiento: 0, es_manual: true,
    }]).select().single()
    setSaving(false)
    if (error) { setErr(error.message); return }
    onCreated(data as Proceso)
    onClose()
  }
  return (
    <Overlay onClose={onClose}>
      <div className="w-[min(680px,95vw)] max-h-[90vh] overflow-y-auto bg-[#111318] border border-[#252932] rounded-2xl p-6">
        <div className="flex justify-between"><h2 className="text-lg font-bold text-white">Agregar proceso manual</h2><CloseBtn onClose={onClose} /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="col-span-2"><label className="text-xs text-[#525a68]">CLIENTE *</label><select className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white" value={form.cliente_id} onChange={e=>setForm(f=>({...f,cliente_id:e.target.value}))}>{clientes.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
          <div><label className="text-xs text-[#525a68]">REFERENCIA *</label><input className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white" value={form.referencia} onChange={e=>setForm(f=>({...f,referencia:e.target.value}))} /></div>
          <div><label className="text-xs text-[#525a68]">ENTIDAD *</label><input className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white" value={form.entidad} onChange={e=>setForm(f=>({...f,entidad:e.target.value}))} /></div>
          <div><label className="text-xs text-[#525a68]">DEPARTAMENTO</label><select className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white" value={form.departamento} onChange={e=>setForm(f=>({...f,departamento:e.target.value}))}><option value="">—</option>{DEPARTAMENTOS_CO.map(d=><option key={d}>{d}</option>)}</select></div>
          <div><label className="text-xs text-[#525a68]">CIUDAD</label><input className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white" value={form.ciudad} onChange={e=>setForm(f=>({...f,ciudad:e.target.value}))} /></div>
          <div><label className="text-xs text-[#525a68]">MODALIDAD</label><select className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white" value={form.modalidad} onChange={e=>setForm(f=>({...f,modalidad:e.target.value}))}><option>Licitación Pública</option><option>Selección Abreviada</option><option>Concurso de Méritos</option><option>Contratación Directa</option><option>Mínima Cuantía</option><option>Régimen Especial</option></select></div>
          <div><label className="text-xs text-[#525a68]">PRESUPUESTO (COP)</label><input type="number" className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white" value={form.presupuesto} onChange={e=>setForm(f=>({...f,presupuesto:e.target.value}))} /></div>
          <div><label className="text-xs text-[#525a68]">FECHA PUBLICACIÓN</label><input type="date" className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white" value={form.fecha_publicacion} onChange={e=>setForm(f=>({...f,fecha_publicacion:e.target.value}))} /></div>
          <div><label className="text-xs text-[#525a68]">FECHA CIERRE</label><input type="date" className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white" value={form.fecha_oferta} onChange={e=>setForm(f=>({...f,fecha_oferta:e.target.value}))} /></div>
          <div className="col-span-2"><label className="text-xs text-[#525a68]">OBJETO</label><textarea rows={2} className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white" value={form.objeto} onChange={e=>setForm(f=>({...f,objeto:e.target.value}))} /></div>
          <div className="col-span-2"><label className="text-xs text-[#525a68]">URL SECOP</label><input className="w-full p-2 bg-[#1c2028] border border-[#252932] rounded text-white" value={form.url} onChange={e=>setForm(f=>({...f,url:e.target.value}))} /></div>
          <div className="col-span-2"><label><input type="checkbox" checked={form.resultado_ia} onChange={e=>setForm(f=>({...f,resultado_ia:e.target.checked}))} /> Marcado como aprobado por IA</label></div>
        </div>
        {err && <p className="text-red-500 text-xs mt-2">{err}</p>}
        <div className="flex gap-2 mt-6"><button onClick={onClose} className="flex-1 py-2 bg-transparent border border-[#252932] rounded text-[#525a68]">Cancelar</button><button onClick={guardar} disabled={saving} className="flex-2 py-2 bg-[#22c55e] rounded text-white font-bold">{saving ? "Guardando..." : "Agregar proceso"}</button></div>
      </div>
    </Overlay>
  )
}

// ---------- MODAL ELIMINAR ----------
function ModalEliminar({ nombre, onClose, onConfirm, loading }: { nombre: string; onClose: () => void; onConfirm: () => void; loading: boolean }) {
  return (
    <Overlay onClose={onClose}>
      <div className="w-[400px] bg-[#111318] border border-[#252932] rounded-2xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto mb-4 text-2xl">⚠️</div>
        <h3 className="text-lg font-bold text-white mb-2">Eliminar cliente</h3>
        <p className="text-sm text-[#8b919e] mb-4">¿Confirmas eliminar <strong>{nombre}</strong>? Se borrarán también sus procesos y feedback. <span className="text-red-500">No reversible.</span></p>
        <div className="flex gap-3"><button onClick={onClose} className="flex-1 py-2 bg-transparent border border-[#252932] rounded text-[#525a68]">Cancelar</button><button onClick={onConfirm} disabled={loading} className="flex-1 py-2 bg-red-600 rounded text-white font-bold">{loading ? "Eliminando..." : "Sí, eliminar"}</button></div>
      </div>
    </Overlay>
  )
}

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

  useEffect(() => {
    if (sessionStorage.getItem("secop_admin") === "true") { setAuthed(true); cargar() }
    else setLoading(false)
  }, [])

  async function login() {
    if (pass === ADMIN_PASS) { sessionStorage.setItem("secop_admin", "true"); setAuthed(true); cargar() }
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

  function actualizarEtapa(procesoId: string, etapa: number) {
    setProcesos(prev => prev.map(p => p.id === procesoId ? { ...p, etapa_seguimiento: etapa } : p))
    mostrarToast(`Etapa actualizada: ${ETAPAS[etapa]}`)
  }

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
          <div className="bg-[#15181f] border border-[#252932] rounded-xl p-3"><div className="text-[10px] text-[#525a68] uppercase">Interesados</div><div className="text-2xl font-bold text-[#f59e0b]">{procesos.filter(p=>p.estado==="interesado").length}</div></div>
          <div className="bg-[#15181f] border border-[#252932] rounded-xl p-3"><div className="text-[10px] text-[#525a68] uppercase">Presupuesto interesado</div><div className="text-sm font-bold text-[#34d399]">{fmt(presTotalInteres)}</div></div>
          <div className="bg-[#15181f] border border-[#252932] rounded-xl p-3"><div className="text-[10px] text-[#525a68] uppercase">Feedback hoy</div><div className="text-2xl font-bold text-[#f472b6]">{feedback.filter(f=>f.created_at?.startsWith(new Date().toISOString().slice(0,10))).length}</div></div>
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

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
          <div className="flex gap-2">
            <select value={clienteSel || ""} onChange={e=>setClienteSel(e.target.value||null)} className="bg-[#15181f] border border-[#252932] rounded-lg p-2 text-sm"><option value="">Todos los clientes</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nombre} {!c.activo?"(inactivo)":""}</option>)}</select>
            <select value={estadoSel} onChange={e=>setEstadoSel(e.target.value)} className="bg-[#15181f] border border-[#252932] rounded-lg p-2 text-sm"><option value="todos">Todos los estados</option><option value="nuevo">Nuevos</option><option value="interesado">Interesados</option><option value="descartado">Descartados</option></select>
            <input type="text" placeholder="Buscar..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} className="bg-[#15181f] border border-[#252932] rounded-lg p-2 text-sm w-48" />
          </div>
          <div className="flex gap-2">
            <button onClick={()=>setShowNuevoProceso(true)} className="text-xs px-3 py-1.5 bg-[#22c55e]/20 border border-[#22c55e]/40 rounded text-[#22c55e]">+ Proceso manual</button>
            <button onClick={()=>setShowNuevoCliente(true)} className="text-xs px-3 py-1.5 bg-[#3b82f6]/20 border border-[#3b82f6]/40 rounded text-[#3b82f6]">+ Nuevo cliente</button>
          </div>
        </div>

        <div className="flex gap-2 border-b border-[#252932] mb-4">
          {["procesos","clientes","feedback"].map(t=> <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 text-sm font-medium ${tab===t ? "text-[#3b82f6] border-b-2 border-[#3b82f6]" : "text-[#8b919e]"}`}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}
        </div>

        {/* TAB PROCESOS */}
        {tab === "procesos" && (
          <div className="space-y-4">
            <div className="text-xs text-[#8b919e] flex gap-4"><span>Interesados: {interesados.length}</span><span>Nuevos: {nuevos.length}</span><span>Descartados: {descartados.length}</span></div>
            {procesosFilt.length === 0 ? <div className="text-center py-12 text-[#525a68]">No hay procesos con esos filtros</div> : procesosFilt.map(p=>{
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
                      <TimelineAdmin procesoId={p.id} etapa={p.etapa_seguimiento ?? 0} onUpdate={actualizarEtapa} />
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
                    </div>
                    <div className="text-[10px] text-[#525a68]">Actualizado: {new Date(p.updated_at).toLocaleDateString()}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* TAB CLIENTES */}
        {tab === "clientes" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientesFilt.map(c=>(
              <div key={c.id} className="bg-[#15181f] border border-[#252932] rounded-xl p-4">
                <div className="flex justify-between"><div className="flex gap-3 items-center"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] flex items-center justify-center font-bold">{initials(c.nombre)}</div><div><div className="font-bold">{c.nombre}</div><div className="text-[10px] text-[#3b82f6]">{c.id}</div>{c.usuario && <div className="text-[9px] text-[#525a68]">@{c.usuario}</div>}</div></div><button onClick={()=>toggleActivo(c)} className={`text-[10px] px-2 py-0.5 rounded-full ${c.activo ? "bg-[#22c55e22] text-[#22c55e]" : "bg-red-500/20 text-red-400"}`}>{c.activo ? "Activo" : "Inactivo"}</button></div>
                <p className="text-xs text-[#8b919e] mt-2 line-clamp-2">{c.descripcion_negocio}</p>
                <div className="flex flex-wrap gap-2 mt-2 text-[10px]"><span>{c.departamentos?.length||0} deptos</span><span>{procesos.filter(p=>p.cliente_id===c.id).length} procesos</span><span className="text-[#f59e0b]">{procesos.filter(p=>p.cliente_id===c.id && p.estado==="interesado").length} interesados</span></div>
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

        {/* TAB FEEDBACK */}
        {tab === "feedback" && (
          <div className="bg-[#15181f] border border-[#252932] rounded-xl overflow-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[#252932]">
                <tr>
                  {["Cliente","Proceso","Acción","Nota","Fecha"].map(h => (
                    <th key={h} className="p-2 text-left text-[10px] text-[#525a68]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {feedback.slice(0,100).map(f => {
                  const proc = procesos.find(p => p.id === f.proceso_id)
                  return (
                    <tr key={f.id} className="border-b border-[#1c2028]">
                      <td className="p-2 text-[11px] text-[#60a5fa]">{f.cliente_id || "—"}</td>
                      <td className="p-2 text-[10px] max-w-40 truncate">{proc?.entidad || f.proceso_id}</td>
                      <td className="p-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${f.accion==="interesado"?"bg-[#22c55e22] text-[#22c55e]":f.accion==="descartado"?"bg-red-500/20 text-red-400":"bg-[#3b82f6]/20 text-[#3b82f6]"}`}>
                          {f.accion}
                        </span>
                      </td>
                      <td className="p-2 text-[11px]">{f.nota || "—"}</td>
                      <td className="p-2 text-[10px] text-[#525a68]">{new Date(f.created_at).toLocaleDateString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#1c2028] border border-[#252932] text-white px-4 py-2 rounded-lg text-sm z-[100]">{toast}</div>}
      {showNuevoCliente && <ModalNuevoCliente onClose={()=>setShowNuevoCliente(false)} onCreated={c=>{setClientes(prev=>[...prev,c].sort((a,b)=>a.nombre.localeCompare(b.nombre)));mostrarToast(`Cliente ${c.nombre} creado.`)}} />}
      {editarCliente && <ModalEditarCliente cliente={editarCliente} onClose={()=>setEditarCliente(null)} onUpdated={c=>{setClientes(prev=>prev.map(x=>x.id===c.id?c:x));mostrarToast("Cliente actualizado.")}} />}
      {eliminarCliente && <ModalEliminar nombre={eliminarCliente.nombre} loading={elimLoading} onClose={()=>setEliminarCliente(null)} onConfirm={confirmarEliminar} />}
      {showNuevoProceso && <ModalProcesoManual clientes={clientes.filter(c=>c.activo)} onClose={()=>setShowNuevoProceso(false)} onCreated={p=>{setProcesos(prev=>[p,...prev]);mostrarToast("Proceso manual agregado.")}} />}
    </div>
  )
}
