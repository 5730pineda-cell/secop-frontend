"use client"
// SOFIA Admin v2 — Página completa mejorada para Next.js
// Reemplaza: app/admin/page.tsx
// Cambios vs v1:
//   + Crear nuevo usuario/cliente (modal con todos los campos)
//   + Activar/Desactivar clientes (toggle rápido)
//   + Eliminar clientes (con confirmación)
//   + Ingresar proceso manual (modal completo)
//   + Editar datos básicos de clientes
//   + Vista de detalle de cliente con sus procesos
//   + Estadísticas mejoradas en tiempo real

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Cliente, Proceso, Feedback } from "@/types"

/* ─── helpers ─── */
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
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const fe = new Date(f); fe.setHours(0, 0, 0, 0)
  return Math.ceil((fe.getTime() - hoy.getTime()) / 86400000)
}
function initials(nombre: string) {
  return nombre.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()
}

const ETAPAS = ["Análisis", "Tu aprobación", "Organización", "Presentación", "Resultado"]
const ADMIN_PASS = "admin2024oc"
const DEPARTAMENTOS_CO = [
  "Amazonas","Antioquia","Arauca","Atlántico","Bolívar","Boyacá","Caldas","Caquetá",
  "Casanare","Cauca","Cesar","Chocó","Córdoba","Cundinamarca","Guainía","Guaviare",
  "Huila","La Guajira","Magdalena","Meta","Nariño","Norte de Santander","Putumayo",
  "Quindío","Risaralda","San Andrés y Providencia","Santander","Sucre","Tolima",
  "Valle del Cauca","Vaupés","Vichada","Bogotá D.C."
]

/* ─── Timeline clickeable ─── */
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
    <div style={{ display:"flex", alignItems:"flex-start", gap:0, width:"100%", marginTop:8 }}>
      {ETAPAS.map((e, i) => {
        const done = i < idx; const active = i === idx
        return (
          <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", flex:1, position:"relative", cursor:updating ? "wait" : "pointer" }} onClick={() => irEtapa(i)}>
            {i > 0 && <div style={{ position:"absolute", left:"-50%", right:"50%", top:13, height:2, background:done || active ? "#3b82f6" : "#252932", zIndex:0 }} />}
            <div title={`Ir a: ${e}`} style={{ width:26, height:26, borderRadius:"50%", zIndex:1, background:done ? "#3b82f6" : active ? "#1d4ed8" : "#1c2028", border:`2px solid ${done || active ? "#3b82f6" : "#252932"}`, display:"flex", alignItems:"center", justifyContent:"center", color:done || active ? "#fff" : "#525a68", fontSize:10, fontWeight:600, flexShrink:0, boxShadow:active ? "0 0 0 3px rgba(59,130,246,0.25)" : "none" }}>
              {done ? "✓" : i + 1}
            </div>
            <div style={{ fontSize:9, color:active ? "#60a5fa" : done ? "#3b82f6" : "#525a68", marginTop:4, textAlign:"center" as const, fontWeight:active || done ? 500 : 400, maxWidth:60, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e}</div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Modal: Nuevo Cliente ─── */
function ModalNuevoCliente({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Cliente) => void }) {
  const [form, setForm] = useState({
    id: "", nombre: "", usuario: "", password_hash: "",
    descripcion_negocio: "", palabras_clave: "", palabras_excluidas: "",
    departamentos: [] as string[], presupuesto_minimo: "0",
    usar_ia: true, activo: true, email_destinatario: "", drive_url: ""
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  function toggle(d: string) {
    setForm(f => ({ ...f, departamentos: f.departamentos.includes(d) ? f.departamentos.filter(x => x !== d) : [...f.departamentos, d] }))
  }

  async function guardar() {
    if (!form.id.trim() || !form.nombre.trim()) { setErr("ID y Nombre son obligatorios."); return }
    setSaving(true); setErr("")
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
      codigos_unspc: [], modalidades_permitidas: null,
    }]).select().single()
    setSaving(false)
    if (error) { setErr(error.message); return }
    onCreated(data as Cliente)
    onClose()
  }

  const inp = { padding:"9px 12px", background:"#1c2028", border:"1px solid #252932", borderRadius:8, color:"#eef0f4", fontSize:13, width:"100%", fontFamily:"DM Sans,sans-serif", outline:"none" }
  const lbl = { fontSize:11, color:"#525a68", marginBottom:4, display:"block" as const, fontFamily:"DM Mono,monospace", letterSpacing:0.5 }

  return (
    <Overlay onClose={onClose}>
      <div style={{ width:"min(680px,95vw)", maxHeight:"90vh", overflowY:"auto" as const, background:"#111318", border:"1px solid #252932", borderRadius:16, padding:"28px 28px 24px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <div>
            <h2 style={{ fontSize:18, fontWeight:700, color:"#eef0f4", fontFamily:"Syne,sans-serif" }}>Nuevo cliente</h2>
            <p style={{ fontSize:12, color:"#525a68", marginTop:2 }}>Crear acceso y configuración de monitoreo</p>
          </div>
          <CloseBtn onClose={onClose} />
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div>
            <label style={lbl}>ID ÚNICO *</label>
            <input style={inp} placeholder="ej: empresa_abc" value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} />
          </div>
          <div>
            <label style={lbl}>NOMBRE EMPRESA *</label>
            <input style={inp} placeholder="Nombre completo" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
          </div>
          <div>
            <label style={lbl}>USUARIO (login)</label>
            <input style={inp} placeholder="usuario_cliente" value={form.usuario} onChange={e => setForm(f => ({ ...f, usuario: e.target.value }))} />
          </div>
          <div>
            <label style={lbl}>CONTRASEÑA (texto plano o hash)</label>
            <input style={inp} type="password" placeholder="••••••••" value={form.password_hash} onChange={e => setForm(f => ({ ...f, password_hash: e.target.value }))} />
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>DESCRIPCIÓN DEL NEGOCIO</label>
            <textarea style={{ ...inp, height:72, resize:"vertical" as const }} placeholder="Qué hace la empresa, sector, especialidad..." value={form.descripcion_negocio} onChange={e => setForm(f => ({ ...f, descripcion_negocio: e.target.value }))} />
          </div>
          <div>
            <label style={lbl}>PALABRAS CLAVE (separadas por coma)</label>
            <input style={inp} placeholder="infraestructura, obra civil, ..." value={form.palabras_clave} onChange={e => setForm(f => ({ ...f, palabras_clave: e.target.value }))} />
          </div>
          <div>
            <label style={lbl}>PALABRAS EXCLUIDAS</label>
            <input style={inp} placeholder="seguridad, limpieza, ..." value={form.palabras_excluidas} onChange={e => setForm(f => ({ ...f, palabras_excluidas: e.target.value }))} />
          </div>
          <div>
            <label style={lbl}>PRESUPUESTO MÍNIMO (COP)</label>
            <input style={inp} type="number" placeholder="0" value={form.presupuesto_minimo} onChange={e => setForm(f => ({ ...f, presupuesto_minimo: e.target.value }))} />
          </div>
          <div>
            <label style={lbl}>EMAIL NOTIFICACIONES</label>
            <input style={inp} type="email" placeholder="contacto@empresa.com" value={form.email_destinatario} onChange={e => setForm(f => ({ ...f, email_destinatario: e.target.value }))} />
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>GOOGLE DRIVE URL</label>
            <input style={inp} placeholder="https://drive.google.com/..." value={form.drive_url} onChange={e => setForm(f => ({ ...f, drive_url: e.target.value }))} />
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>DEPARTAMENTOS A MONITOREAR</label>
            <div style={{ display:"flex", flexWrap:"wrap" as const, gap:6, marginTop:4 }}>
              {DEPARTAMENTOS_CO.map(d => (
                <button key={d} onClick={() => toggle(d)} style={{ padding:"4px 10px", borderRadius:20, fontSize:11, border:`1px solid ${form.departamentos.includes(d) ? "#3b82f6" : "#252932"}`, background:form.departamentos.includes(d) ? "#1e3a8a22" : "transparent", color:form.departamentos.includes(d) ? "#60a5fa" : "#525a68", cursor:"pointer", fontFamily:"DM Sans,sans-serif" }}>{d}</button>
              ))}
            </div>
          </div>
          <div style={{ display:"flex", gap:20 }}>
            <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
              <input type="checkbox" checked={form.usar_ia} onChange={e => setForm(f => ({ ...f, usar_ia: e.target.checked }))} />
              <span style={{ fontSize:12, color:"#8b919e" }}>Usar IA</span>
            </label>
            <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
              <input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} />
              <span style={{ fontSize:12, color:"#8b919e" }}>Activo al crear</span>
            </label>
          </div>
        </div>

        {err && <p style={{ fontSize:12, color:"#ef4444", marginTop:12 }}>{err}</p>}
        <div style={{ display:"flex", gap:10, marginTop:20 }}>
          <button onClick={onClose} style={{ flex:1, padding:"11px", background:"transparent", border:"1px solid #252932", color:"#525a68", borderRadius:8, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>Cancelar</button>
          <button onClick={guardar} disabled={saving} style={{ flex:2, padding:"11px", background:"#3b82f6", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", opacity:saving ? 0.7 : 1 }}>
            {saving ? "Creando..." : "Crear cliente"}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

/* ─── Modal: Editar Cliente ─── */
function ModalEditarCliente({ cliente, onClose, onUpdated }: { cliente: Cliente; onClose: () => void; onUpdated: (c: Cliente) => void }) {
  const [form, setForm] = useState({
    nombre: cliente.nombre,
    usuario: cliente.usuario || "",
    password_hash: "",
    descripcion_negocio: cliente.descripcion_negocio || "",
    palabras_clave: (cliente.palabras_clave || []).join(", "),
    palabras_excluidas: (cliente.palabras_excluidas || []).join(", "),
    departamentos: cliente.departamentos || [],
    presupuesto_minimo: String(cliente.presupuesto_minimo || 0),
    usar_ia: cliente.usar_ia,
    email_destinatario: cliente.email_destinatario || "",
    drive_url: cliente.drive_url || "",
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  function toggle(d: string) {
    setForm(f => ({ ...f, departamentos: f.departamentos.includes(d) ? f.departamentos.filter(x => x !== d) : [...f.departamentos, d] }))
  }

  async function guardar() {
    setSaving(true); setErr("")
    const update: Partial<Cliente> = {
      nombre: form.nombre.trim(),
      usuario: form.usuario.trim() || null,
      descripcion_negocio: form.descripcion_negocio.trim(),
      palabras_clave: form.palabras_clave.split(",").map(x => x.trim()).filter(Boolean),
      palabras_excluidas: form.palabras_excluidas.split(",").map(x => x.trim()).filter(Boolean),
      departamentos: form.departamentos,
      presupuesto_minimo: Number(form.presupuesto_minimo) || 0,
      usar_ia: form.usar_ia,
      email_destinatario: form.email_destinatario.trim() || null,
      drive_url: form.drive_url.trim() || null,
    }
    if (form.password_hash.trim()) update.password_hash = form.password_hash.trim()
    const { error } = await supabase.from("clientes").update(update).eq("id", cliente.id)
    setSaving(false)
    if (error) { setErr(error.message); return }
    onUpdated({ ...cliente, ...update })
    onClose()
  }

  const inp = { padding:"9px 12px", background:"#1c2028", border:"1px solid #252932", borderRadius:8, color:"#eef0f4", fontSize:13, width:"100%", fontFamily:"DM Sans,sans-serif", outline:"none" }
  const lbl = { fontSize:11, color:"#525a68", marginBottom:4, display:"block" as const, fontFamily:"DM Mono,monospace", letterSpacing:0.5 }

  return (
    <Overlay onClose={onClose}>
      <div style={{ width:"min(680px,95vw)", maxHeight:"90vh", overflowY:"auto" as const, background:"#111318", border:"1px solid #252932", borderRadius:16, padding:"28px 28px 24px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <div>
            <h2 style={{ fontSize:18, fontWeight:700, color:"#eef0f4", fontFamily:"Syne,sans-serif" }}>Editar cliente</h2>
            <p style={{ fontSize:12, color:"#3b82f6", fontFamily:"DM Mono,monospace" }}>{cliente.id}</p>
          </div>
          <CloseBtn onClose={onClose} />
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div>
            <label style={lbl}>NOMBRE EMPRESA</label>
            <input style={inp} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
          </div>
          <div>
            <label style={lbl}>USUARIO</label>
            <input style={inp} value={form.usuario} onChange={e => setForm(f => ({ ...f, usuario: e.target.value }))} />
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>NUEVA CONTRASEÑA (dejar vacío para no cambiar)</label>
            <input style={inp} type="password" placeholder="••••••••" value={form.password_hash} onChange={e => setForm(f => ({ ...f, password_hash: e.target.value }))} />
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>DESCRIPCIÓN DEL NEGOCIO</label>
            <textarea style={{ ...inp, height:72, resize:"vertical" as const }} value={form.descripcion_negocio} onChange={e => setForm(f => ({ ...f, descripcion_negocio: e.target.value }))} />
          </div>
          <div>
            <label style={lbl}>PALABRAS CLAVE</label>
            <input style={inp} value={form.palabras_clave} onChange={e => setForm(f => ({ ...f, palabras_clave: e.target.value }))} />
          </div>
          <div>
            <label style={lbl}>PALABRAS EXCLUIDAS</label>
            <input style={inp} value={form.palabras_excluidas} onChange={e => setForm(f => ({ ...f, palabras_excluidas: e.target.value }))} />
          </div>
          <div>
            <label style={lbl}>PRESUPUESTO MÍNIMO (COP)</label>
            <input style={inp} type="number" value={form.presupuesto_minimo} onChange={e => setForm(f => ({ ...f, presupuesto_minimo: e.target.value }))} />
          </div>
          <div>
            <label style={lbl}>EMAIL NOTIFICACIONES</label>
            <input style={inp} type="email" value={form.email_destinatario} onChange={e => setForm(f => ({ ...f, email_destinatario: e.target.value }))} />
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>GOOGLE DRIVE URL</label>
            <input style={inp} value={form.drive_url} onChange={e => setForm(f => ({ ...f, drive_url: e.target.value }))} />
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>DEPARTAMENTOS</label>
            <div style={{ display:"flex", flexWrap:"wrap" as const, gap:6, marginTop:4 }}>
              {DEPARTAMENTOS_CO.map(d => (
                <button key={d} onClick={() => toggle(d)} style={{ padding:"4px 10px", borderRadius:20, fontSize:11, border:`1px solid ${form.departamentos.includes(d) ? "#3b82f6" : "#252932"}`, background:form.departamentos.includes(d) ? "#1e3a8a22" : "transparent", color:form.departamentos.includes(d) ? "#60a5fa" : "#525a68", cursor:"pointer", fontFamily:"DM Sans,sans-serif" }}>{d}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
              <input type="checkbox" checked={form.usar_ia} onChange={e => setForm(f => ({ ...f, usar_ia: e.target.checked }))} />
              <span style={{ fontSize:12, color:"#8b919e" }}>Usar IA</span>
            </label>
          </div>
        </div>

        {err && <p style={{ fontSize:12, color:"#ef4444", marginTop:12 }}>{err}</p>}
        <div style={{ display:"flex", gap:10, marginTop:20 }}>
          <button onClick={onClose} style={{ flex:1, padding:"11px", background:"transparent", border:"1px solid #252932", color:"#525a68", borderRadius:8, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>Cancelar</button>
          <button onClick={guardar} disabled={saving} style={{ flex:2, padding:"11px", background:"#3b82f6", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", opacity:saving ? 0.7 : 1 }}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

/* ─── Modal: Proceso Manual ─── */
function ModalProcesoManual({ clientes, onClose, onCreated }: { clientes: Cliente[]; onClose: () => void; onCreated: (p: Proceso) => void }) {
  const [form, setForm] = useState({
    cliente_id: clientes[0]?.id || "",
    referencia: "", entidad: "", departamento: "", ciudad: "",
    modalidad: "Contratación Directa", objeto: "",
    presupuesto: "", fecha_publicacion: "", fecha_oferta: "",
    url: "", resultado_ia: false, razon_ia: ""
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  async function guardar() {
    if (!form.cliente_id || !form.referencia.trim() || !form.entidad.trim()) {
      setErr("Cliente, Referencia y Entidad son obligatorios."); return
    }
    setSaving(true); setErr("")
    const { data, error } = await supabase.from("procesos").insert([{
      cliente_id: form.cliente_id,
      referencia: form.referencia.trim(),
      entidad: form.entidad.trim(),
      departamento: form.departamento.trim() || null,
      ciudad: form.ciudad.trim() || null,
      modalidad: form.modalidad || null,
      objeto: form.objeto.trim() || null,
      presupuesto: Number(form.presupuesto) || 0,
      fecha_publicacion: form.fecha_publicacion || null,
      fecha_oferta: form.fecha_oferta || null,
      url: form.url.trim() || null,
      resultado_ia: form.resultado_ia,
      razon_ia: form.razon_ia.trim() || null,
      estado: "nuevo",
      etapa_seguimiento: 0,
      es_manual: true,
    }]).select().single()
    setSaving(false)
    if (error) { setErr(error.message); return }
    onCreated(data as Proceso)
    onClose()
  }

  const inp = { padding:"9px 12px", background:"#1c2028", border:"1px solid #252932", borderRadius:8, color:"#eef0f4", fontSize:13, width:"100%", fontFamily:"DM Sans,sans-serif", outline:"none" }
  const lbl = { fontSize:11, color:"#525a68", marginBottom:4, display:"block" as const, fontFamily:"DM Mono,monospace", letterSpacing:0.5 }
  const MODALIDADES = ["Licitación Pública","Selección Abreviada","Concurso de Méritos","Contratación Directa","Mínima Cuantía","Régimen Especial"]

  return (
    <Overlay onClose={onClose}>
      <div style={{ width:"min(680px,95vw)", maxHeight:"90vh", overflowY:"auto" as const, background:"#111318", border:"1px solid #252932", borderRadius:16, padding:"28px 28px 24px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <div>
            <h2 style={{ fontSize:18, fontWeight:700, color:"#eef0f4", fontFamily:"Syne,sans-serif" }}>Agregar proceso manual</h2>
            <p style={{ fontSize:12, color:"#525a68", marginTop:2 }}>Ingresar un proceso que no fue capturado automáticamente</p>
          </div>
          <CloseBtn onClose={onClose} />
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>CLIENTE *</label>
            <select style={{ ...inp }} value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>REFERENCIA SECOP *</label>
            <input style={inp} placeholder="ES-LA-001-2024" value={form.referencia} onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))} />
          </div>
          <div>
            <label style={lbl}>ENTIDAD *</label>
            <input style={inp} placeholder="Nombre de la entidad" value={form.entidad} onChange={e => setForm(f => ({ ...f, entidad: e.target.value }))} />
          </div>
          <div>
            <label style={lbl}>DEPARTAMENTO</label>
            <select style={inp} value={form.departamento} onChange={e => setForm(f => ({ ...f, departamento: e.target.value }))}>
              <option value="">— Sin departamento —</option>
              {DEPARTAMENTOS_CO.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>CIUDAD</label>
            <input style={inp} placeholder="Ciudad" value={form.ciudad} onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))} />
          </div>
          <div>
            <label style={lbl}>MODALIDAD</label>
            <select style={inp} value={form.modalidad} onChange={e => setForm(f => ({ ...f, modalidad: e.target.value }))}>
              {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>PRESUPUESTO (COP)</label>
            <input style={inp} type="number" placeholder="500000000" value={form.presupuesto} onChange={e => setForm(f => ({ ...f, presupuesto: e.target.value }))} />
          </div>
          <div>
            <label style={lbl}>FECHA PUBLICACIÓN</label>
            <input style={inp} type="date" value={form.fecha_publicacion} onChange={e => setForm(f => ({ ...f, fecha_publicacion: e.target.value }))} />
          </div>
          <div>
            <label style={lbl}>FECHA CIERRE OFERTA</label>
            <input style={inp} type="date" value={form.fecha_oferta} onChange={e => setForm(f => ({ ...f, fecha_oferta: e.target.value }))} />
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>OBJETO DEL CONTRATO</label>
            <textarea style={{ ...inp, height:90, resize:"vertical" as const }} placeholder="Descripción del proceso..." value={form.objeto} onChange={e => setForm(f => ({ ...f, objeto: e.target.value }))} />
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>URL SECOP (opcional)</label>
            <input style={inp} placeholder="https://www.secop.gov.co/..." value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>RAZÓN / NOTAS IA (opcional)</label>
            <input style={inp} placeholder="Por qué este proceso es relevante..." value={form.razon_ia} onChange={e => setForm(f => ({ ...f, razon_ia: e.target.value }))} />
          </div>
          <div>
            <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
              <input type="checkbox" checked={form.resultado_ia} onChange={e => setForm(f => ({ ...f, resultado_ia: e.target.checked }))} />
              <span style={{ fontSize:12, color:"#8b919e" }}>Marcado como aprobado por IA</span>
            </label>
          </div>
        </div>

        {err && <p style={{ fontSize:12, color:"#ef4444", marginTop:12 }}>{err}</p>}
        <div style={{ display:"flex", gap:10, marginTop:20 }}>
          <button onClick={onClose} style={{ flex:1, padding:"11px", background:"transparent", border:"1px solid #252932", color:"#525a68", borderRadius:8, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>Cancelar</button>
          <button onClick={guardar} disabled={saving} style={{ flex:2, padding:"11px", background:"#22c55e", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", opacity:saving ? 0.7 : 1 }}>
            {saving ? "Guardando..." : "Agregar proceso"}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

/* ─── Modal: Confirmar Eliminar ─── */
function ModalEliminar({ nombre, onClose, onConfirm, loading }: { nombre: string; onClose: () => void; onConfirm: () => void; loading: boolean }) {
  return (
    <Overlay onClose={onClose}>
      <div style={{ width:"min(400px,95vw)", background:"#111318", border:"1px solid #252932", borderRadius:16, padding:"28px 24px" }}>
        <div style={{ textAlign:"center" as const, marginBottom:20 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:"#ef444422", border:"1px solid #ef444444", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:22 }}>⚠</div>
          <h3 style={{ fontSize:17, fontWeight:700, color:"#eef0f4", fontFamily:"Syne,sans-serif", marginBottom:8 }}>Eliminar cliente</h3>
          <p style={{ fontSize:13, color:"#8b919e", lineHeight:1.6 }}>
            ¿Confirmas que deseas eliminar <strong style={{ color:"#eef0f4" }}>{nombre}</strong>? Esta acción eliminará también todos sus procesos y feedback. <span style={{ color:"#ef4444" }}>No se puede deshacer.</span>
          </p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:"11px", background:"transparent", border:"1px solid #252932", color:"#525a68", borderRadius:8, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>Cancelar</button>
          <button onClick={onConfirm} disabled={loading} style={{ flex:1, padding:"11px", background:"#ef4444", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", opacity:loading ? 0.7 : 1 }}>
            {loading ? "Eliminando..." : "Sí, eliminar"}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

/* ─── shared UI ─── */
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20, backdropFilter:"blur(4px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  )
}
function CloseBtn({ onClose }: { onClose: () => void }) {
  return (
    <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, background:"#1c2028", border:"1px solid #252932", color:"#525a68", fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"inherit", flexShrink:0 }}>✕</button>
  )
}

/* ═══════════════════════════════════════════ MAIN ═══════════════════════════════════════════ */
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
  const [tab, setTab] = useState("procesos")
  const [toast, setToast] = useState("")
  const [editDrive, setEditDrive] = useState<{ id: string; url: string } | null>(null)
  const [savingDrive, setSavingDrive] = useState(false)
  const [editDriveProceso, setEditDriveProceso] = useState<string | null>(null)
  const [driveProcUrl, setDriveProcUrl] = useState("")
  const [savingDriveProc, setSavingDriveProc] = useState(false)

  // Modales
  const [showNuevoCliente, setShowNuevoCliente] = useState(false)
  const [editarCliente, setEditarCliente] = useState<Cliente | null>(null)
  const [eliminarCliente, setEliminarCliente] = useState<Cliente | null>(null)
  const [elimLoading, setElimLoading] = useState(false)
  const [showNuevoProceso, setShowNuevoProceso] = useState(false)

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
    setLoading(false)
  }

  function mostrarToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3500) }

  /* ─── Toggle activo ─── */
  async function toggleActivo(c: Cliente) {
    const nuevo = !c.activo
    await supabase.from("clientes").update({ activo: nuevo }).eq("id", c.id)
    setClientes(prev => prev.map(x => x.id === c.id ? { ...x, activo: nuevo } : x))
    mostrarToast(`${c.nombre} ${nuevo ? "activado" : "desactivado"}.`)
  }

  /* ─── Eliminar cliente ─── */
  async function confirmarEliminar() {
    if (!eliminarCliente) return
    setElimLoading(true)
    // Eliminar procesos y feedback del cliente primero
    await supabase.from("feedback").delete().eq("cliente_id", eliminarCliente.id)
    await supabase.from("procesos").delete().eq("cliente_id", eliminarCliente.id)
    await supabase.from("clientes").delete().eq("id", eliminarCliente.id)
    setClientes(prev => prev.filter(x => x.id !== eliminarCliente.id))
    setProcesos(prev => prev.filter(x => x.cliente_id !== eliminarCliente.id))
    setFeedback(prev => prev.filter(x => x.cliente_id !== eliminarCliente.id))
    setElimLoading(false)
    setEliminarCliente(null)
    mostrarToast(`Cliente ${eliminarCliente.nombre} eliminado.`)
  }

  /* ─── Drive cliente/proceso ─── */
  async function guardarDriveCliente() {
    if (!editDrive) return
    setSavingDrive(true)
    await supabase.from("clientes").update({ drive_url: editDrive.url || null }).eq("id", editDrive.id)
    setClientes(prev => prev.map(c => c.id === editDrive.id ? { ...c, drive_url: editDrive.url || null } : c))
    setSavingDrive(false); setEditDrive(null); mostrarToast("Drive del cliente guardado.")
  }
  async function guardarDriveProceso() {
    if (!editDriveProceso) return
    setSavingDriveProc(true)
    await supabase.from("procesos").update({ drive_proceso_url: driveProcUrl || null }).eq("id", editDriveProceso)
    setProcesos(prev => prev.map(p => p.id === editDriveProceso ? { ...p, drive_proceso_url: driveProcUrl || null } : p))
    setSavingDriveProc(false); setEditDriveProceso(null); setDriveProcUrl(""); mostrarToast("Drive del proceso guardado.")
  }

  function actualizarEtapa(procesoId: string, etapa: number) {
    setProcesos(prev => prev.map(p => p.id === procesoId ? { ...p, etapa_seguimiento: etapa } : p))
    mostrarToast(`Etapa actualizada: ${ETAPAS[etapa]}`)
  }

  const clientesFilt = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || c.id.toLowerCase().includes(busqueda.toLowerCase())
  )
  const procesosFilt = procesos.filter(p => {
    const matchCliente = clienteSel ? p.cliente_id === clienteSel : true
    const matchBusq = busqueda ? p.entidad?.toLowerCase().includes(busqueda.toLowerCase()) || p.referencia.toLowerCase().includes(busqueda.toLowerCase()) || p.objeto?.toLowerCase().includes(busqueda.toLowerCase()) : true
    return matchCliente && matchBusq
  })
  const interesados = procesosFilt.filter(p => p.estado === "interesado")
  const nuevos = procesosFilt.filter(p => p.estado === "nuevo")
  const manuales = procesosFilt.filter(p => p.es_manual)

  // Stats
  const activos = clientes.filter(c => c.activo).length
  const inactivos = clientes.filter(c => !c.activo).length
  const presTotal = procesos.filter(p => p.estado === "interesado").reduce((s, p) => s + Number(p.presupuesto || 0), 0)

  /* ─── LOGIN ─── */
  if (!authed) return (
    <div style={{ minHeight:"100vh", background:"#0a0c10", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"DM Sans,sans-serif" }}>
      <div style={{ background:"#111318", border:"1px solid #252932", borderRadius:16, padding:"36px 32px", width:360 }}>
        <div style={{ marginBottom:24, textAlign:"center" as const }}>
          <span style={{ fontFamily:"Syne,sans-serif", fontSize:28, fontWeight:800, letterSpacing:-1 }}><span style={{ color:"#eef0f4" }}>sof</span><span style={{ color:"#3b82f6" }}>ia</span></span>
          <p style={{ fontSize:11, color:"#525a68", marginTop:4, fontFamily:"DM Mono,monospace", letterSpacing:1.5 }}>ADMIN · OC CONSULTORES</p>
        </div>
        <input type="password" placeholder="Contraseña admin" value={pass} onChange={e => { setPass(e.target.value); setLoginErr(false) }} onKeyDown={e => e.key === "Enter" && login()}
          style={{ width:"100%", padding:"12px 14px", background:"#1c2028", border:`1px solid ${loginErr ? "#ef4444" : "#252932"}`, borderRadius:8, color:"#eef0f4", fontSize:14, marginBottom:12, outline:"none", fontFamily:"inherit" }} />
        {loginErr && <p style={{ fontSize:12, color:"#ef4444", marginBottom:12 }}>Contraseña incorrecta</p>}
        <button onClick={login} style={{ width:"100%", padding:"12px", background:"#3b82f6", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Entrar</button>
        <button onClick={() => router.push("/login")} style={{ width:"100%", padding:"10px", marginTop:8, background:"transparent", color:"#525a68", border:"1px solid #252932", borderRadius:8, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>← Portal clientes</button>
      </div>
    </div>
  )

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#0a0c10", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:36, height:36, border:"3px solid #252932", borderTop:"3px solid #3b82f6", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
    </div>
  )

  /* ─── MAIN UI ─── */
  return (
    <div style={{ minHeight:"100vh", background:"#0a0c10", fontFamily:"'DM Sans',sans-serif" }}>
      <style>{`
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        input::placeholder{color:#525a68;}
        input:focus,select:focus,textarea:focus{outline:none;border-color:#3b82f6!important;}
        button{font-family:inherit;cursor:pointer;}
        a{text-decoration:none;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-thumb{background:#252932;border-radius:2px;}
        .btn{transition:all 0.15s;}
        .btn:hover{opacity:0.82!important;}
        .row:hover{background:#1c202820!important;}
        .card-hover{transition:border-color 0.15s;}
        .card-hover:hover{border-color:#3b82f644!important;}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* NAV */}
      <nav style={{ background:"#111318", borderBottom:"1px solid #252932", position:"sticky", top:0, zIndex:50, height:58 }}>
        <div style={{ maxWidth:1280, margin:"0 auto", height:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <span style={{ fontFamily:"Syne,sans-serif", fontSize:20, fontWeight:800, letterSpacing:-1 }}><span style={{ color:"#eef0f4" }}>sof</span><span style={{ color:"#3b82f6" }}>ia</span></span>
            <span style={{ fontSize:10, color:"#525a68", fontFamily:"DM Mono,monospace", letterSpacing:2, textTransform:"uppercase" as const }}>Admin · OC Consultores</span>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {/* Acciones globales */}
            <button className="btn" onClick={() => setShowNuevoProceso(true)}
              style={{ padding:"6px 14px", fontSize:12, color:"#22c55e", border:"1px solid #22c55e44", background:"#22c55e11", borderRadius:6 }}>
              + Proceso manual
            </button>
            <button className="btn" onClick={() => setShowNuevoCliente(true)}
              style={{ padding:"6px 14px", fontSize:12, color:"#3b82f6", border:"1px solid #3b82f644", background:"#3b82f611", borderRadius:6 }}>
              + Nuevo cliente
            </button>
            <button className="btn" onClick={() => router.push("/dashboard")} style={{ padding:"6px 14px", fontSize:12, color:"#8b919e", border:"1px solid #252932", background:"transparent", borderRadius:6 }}>Dashboard</button>
            <button className="btn" onClick={() => { sessionStorage.removeItem("secop_admin"); router.push("/login") }} style={{ padding:"6px 14px", fontSize:12, color:"#8b919e", border:"1px solid #252932", background:"transparent", borderRadius:6 }}>Salir</button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth:1280, margin:"0 auto", padding:"24px" }}>
        {/* STATS */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12, marginBottom:24 }}>
          {[
            { label:"Clientes activos", val:activos, color:"#60a5fa" },
            { label:"Clientes inactivos", val:inactivos, color:"#525a68" },
            { label:"Total procesos", val:procesos.length, color:"#22c55e" },
            { label:"Interesados", val:procesos.filter(p => p.estado === "interesado").length, color:"#f59e0b" },
            { label:"Manuales", val:procesos.filter(p => p.es_manual).length, color:"#a78bfa" },
            { label:"Presup. interesado", val:fmt(presTotal), color:"#34d399" },
            { label:"Feedback total", val:feedback.length, color:"#f472b6" },
          ].map((s, i) => (
            <div key={i} style={{ background:"#15181f", border:"1px solid #252932", borderRadius:8, padding:"14px 16px" }}>
              <div style={{ fontSize:9, color:"#525a68", textTransform:"uppercase" as const, letterSpacing:1, fontFamily:"DM Mono,monospace", marginBottom:5 }}>{s.label}</div>
              <div style={{ fontSize:typeof s.val === "string" ? 16 : 22, fontWeight:700, color:s.color, fontFamily:"Syne,sans-serif" }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* CONTROLES */}
        <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" as const }}>
          <select value={clienteSel || ""} onChange={e => setClienteSel(e.target.value || null)}
            style={{ padding:"9px 12px", background:"#15181f", border:"1px solid #252932", borderRadius:8, fontSize:13, color:"#eef0f4", minWidth:200 }}>
            <option value="">— Todos los clientes —</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}{!c.activo ? " (inactivo)" : ""}</option>)}
          </select>
          <input type="text" placeholder="Buscar cliente, entidad, referencia..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ flex:1, padding:"9px 14px", background:"#15181f", border:"1px solid #252932", borderRadius:8, fontSize:13, color:"#eef0f4", minWidth:200 }} />
          <div style={{ display:"flex", background:"#15181f", border:"1px solid #252932", borderRadius:8, overflow:"hidden" }}>
            {["procesos", "clientes", "feedback"].map(t => (
              <button key={t} className="btn" onClick={() => setTab(t)} style={{ padding:"9px 16px", fontSize:12, fontWeight:tab === t ? 600 : 400, background:tab === t ? "#3b82f6" : "transparent", color:tab === t ? "#fff" : "#8b919e", border:"none", textTransform:"capitalize" as const }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* ══ TAB PROCESOS ══ */}
        {tab === "procesos" && (
          <div>
            <div style={{ display:"flex", gap:16, marginBottom:16, alignItems:"center" }}>
              <span style={{ fontSize:11, color:"#f59e0b", fontFamily:"DM Mono,monospace" }}>Interesados: {interesados.length}</span>
              <span style={{ fontSize:11, color:"#8b919e", fontFamily:"DM Mono,monospace" }}>Nuevos: {nuevos.length}</span>
              <span style={{ fontSize:11, color:"#a78bfa", fontFamily:"DM Mono,monospace" }}>Manuales: {manuales.length}</span>
              <button className="btn" onClick={() => setShowNuevoProceso(true)}
                style={{ marginLeft:"auto", padding:"7px 14px", fontSize:12, color:"#22c55e", border:"1px solid #22c55e44", background:"#22c55e11", borderRadius:6 }}>
                + Agregar proceso manual
              </button>
            </div>

            {/* INTERESADOS */}
            {interesados.length > 0 && (
              <div style={{ marginBottom:24 }}>
                <h3 style={{ fontSize:11, color:"#f59e0b", fontFamily:"DM Mono,monospace", letterSpacing:1.5, textTransform:"uppercase" as const, marginBottom:12 }}>Interesados — {interesados.length}</h3>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {interesados.map(p => {
                    const cliente = clientes.find(c => c.id === p.cliente_id)
                    const dias = diasRestantes(p.fecha_oferta)
                    const urgente = dias !== null && dias <= 3 && dias >= 0
                    return (
                      <div key={p.id} className="card-hover" style={{ background:"#15181f", border:"1px solid #252932", borderRadius:10, padding:"16px 18px" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:10 }}>
                          <div style={{ flex:1 }}>
                            <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                              <span style={{ fontSize:10, background:"#1e3a8a22", color:"#60a5fa", padding:"2px 8px", borderRadius:4, fontFamily:"DM Mono,monospace" }}>{cliente?.nombre || p.cliente_id}</span>
                              {p.es_manual && <span style={{ fontSize:9, color:"#a78bfa", background:"#a78bfa22", padding:"2px 7px", borderRadius:4, fontFamily:"DM Mono,monospace" }}>MANUAL</span>}
                              {urgente && <span style={{ fontSize:10, color:"#ef4444", fontFamily:"DM Mono,monospace" }}>⚠ {dias}d</span>}
                            </div>
                            <div style={{ fontSize:13, fontWeight:600, color:"#eef0f4", marginBottom:2 }}>{p.entidad || "—"}</div>
                            <div style={{ fontSize:10, color:"#525a68", fontFamily:"DM Mono,monospace" }}>{p.referencia}</div>
                          </div>
                          <div style={{ textAlign:"right" as const, flexShrink:0 }}>
                            <div style={{ fontSize:16, fontWeight:700, color:"#22c55e", fontFamily:"Syne,sans-serif" }}>{fmt(p.presupuesto)}</div>
                            <div style={{ fontSize:10, color:"#525a68", marginTop:2 }}>Cierre {fmtFecha(p.fecha_oferta)}</div>
                          </div>
                        </div>
                        <p style={{ fontSize:12, color:"#8b919e", lineHeight:1.6, marginBottom:12 }}>{(p.objeto || "").substring(0, 140)}{(p.objeto || "").length > 140 ? "…" : ""}</p>
                        <div style={{ background:"#1c2028", border:"1px solid #252932", borderRadius:8, padding:"12px 14px", marginBottom:12 }}>
                          <div style={{ fontSize:10, color:"#525a68", fontFamily:"DM Mono,monospace", marginBottom:4 }}>ETAPA: <span style={{ color:"#60a5fa" }}>{ETAPAS[p.etapa_seguimiento ?? 0]}</span></div>
                          <TimelineAdmin procesoId={p.id} etapa={p.etapa_seguimiento ?? 0} onUpdate={actualizarEtapa} />
                        </div>
                        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" as const }}>
                          {editDriveProceso === p.id ? (
                            <>
                              <input type="text" placeholder="URL Google Drive..." value={driveProcUrl} onChange={e => setDriveProcUrl(e.target.value)}
                                style={{ flex:1, padding:"8px 10px", background:"#0a0c10", border:"1px solid #252932", borderRadius:6, color:"#eef0f4", fontSize:12, minWidth:200 }} />
                              <button className="btn" onClick={guardarDriveProceso} disabled={savingDriveProc} style={{ padding:"8px 14px", background:"#22c55e", color:"#fff", border:"none", borderRadius:6, fontSize:12, fontWeight:600 }}>{savingDriveProc ? "…" : "Guardar"}</button>
                              <button className="btn" onClick={() => { setEditDriveProceso(null); setDriveProcUrl("") }} style={{ padding:"8px 12px", background:"transparent", color:"#525a68", border:"1px solid #252932", borderRadius:6, fontSize:12 }}>✕</button>
                            </>
                          ) : (
                            <>
                              {p.drive_proceso_url
                                ? <a href={p.drive_proceso_url} target="_blank" rel="noreferrer" style={{ padding:"7px 14px", background:"#15803d22", color:"#22c55e", border:"1px solid #22c55e44", borderRadius:6, fontSize:12 }}>📁 Drive proceso ↗</a>
                                : <span style={{ fontSize:11, color:"#525a68" }}>Sin Drive</span>
                              }
                              <button className="btn" onClick={() => { setEditDriveProceso(p.id); setDriveProcUrl(p.drive_proceso_url || "") }} style={{ padding:"7px 12px", background:"transparent", color:"#8b919e", border:"1px solid #252932", borderRadius:6, fontSize:11 }}>
                                {p.drive_proceso_url ? "Editar Drive" : "Asignar Drive"}
                              </button>
                            </>
                          )}
                          {p.url && <a href={p.url} target="_blank" rel="noreferrer" style={{ marginLeft:"auto", padding:"7px 12px", background:"transparent", color:"#3b82f6", border:"1px solid #3b82f644", borderRadius:6, fontSize:11 }}>SECOP ↗</a>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* NUEVOS */}
            {nuevos.length > 0 && (
              <div>
                <h3 style={{ fontSize:11, color:"#8b919e", fontFamily:"DM Mono,monospace", letterSpacing:1.5, textTransform:"uppercase" as const, marginBottom:12 }}>Nuevos — {nuevos.length}</h3>
                <div style={{ background:"#15181f", border:"1px solid #252932", borderRadius:10, overflow:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ borderBottom:"1px solid #252932" }}>
                        {["Cliente", "Entidad", "Referencia", "Depto.", "Presupuesto", "IA", "Manual", "Oferta", ""].map(h => (
                          <th key={h} style={{ padding:"9px 12px", textAlign:"left" as const, fontSize:9, color:"#525a68", textTransform:"uppercase" as const, letterSpacing:1, fontWeight:600, whiteSpace:"nowrap" as const }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {nuevos.map(p => {
                        const c = clientes.find(cl => cl.id === p.cliente_id)
                        const dias = diasRestantes(p.fecha_oferta)
                        return (
                          <tr key={p.id} className="row" style={{ borderBottom:"1px solid #1c2028" }}>
                            <td style={{ padding:"9px 12px", fontSize:11, color:"#60a5fa", fontFamily:"DM Mono,monospace", whiteSpace:"nowrap" as const }}>{c?.nombre || p.cliente_id}</td>
                            <td style={{ padding:"9px 12px", fontSize:11, color:"#eef0f4", maxWidth:160 }}><div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>{p.entidad || "—"}</div></td>
                            <td style={{ padding:"9px 12px", fontSize:10, color:"#525a68", fontFamily:"DM Mono,monospace", whiteSpace:"nowrap" as const }}>{p.referencia}</td>
                            <td style={{ padding:"9px 12px", fontSize:11, color:"#8b919e", whiteSpace:"nowrap" as const }}>{p.departamento || "—"}</td>
                            <td style={{ padding:"9px 12px", fontSize:11, color:"#22c55e", fontFamily:"DM Mono,monospace", whiteSpace:"nowrap" as const, textAlign:"right" as const }}>{fmt(p.presupuesto)}</td>
                            <td style={{ padding:"9px 12px", textAlign:"center" as const }}>{p.resultado_ia ? <span style={{ color:"#22c55e", fontSize:11 }}>✓</span> : <span style={{ color:"#525a68", fontSize:11 }}>—</span>}</td>
                            <td style={{ padding:"9px 12px", textAlign:"center" as const }}>{p.es_manual ? <span style={{ color:"#a78bfa", fontSize:10, fontFamily:"DM Mono,monospace" }}>M</span> : <span style={{ color:"#525a68", fontSize:11 }}>—</span>}</td>
                            <td style={{ padding:"9px 12px", fontSize:10, color:dias !== null && dias <= 3 ? "#ef4444" : "#f59e0b", fontFamily:"DM Mono,monospace", whiteSpace:"nowrap" as const }}>{fmtFecha(p.fecha_oferta)}{dias !== null ? ` (${dias}d)` : ""}</td>
                            <td style={{ padding:"9px 12px" }}>{p.url && <a href={p.url} target="_blank" rel="noreferrer" style={{ color:"#3b82f6", fontSize:11 }}>↗</a>}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {procesosFilt.length === 0 && (
              <div style={{ padding:"48px", textAlign:"center" as const, color:"#525a68", fontSize:13 }}>Sin procesos con estos filtros</div>
            )}
          </div>
        )}

        {/* ══ TAB CLIENTES ══ */}
        {tab === "clientes" && (
          <div>
            <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
              <button className="btn" onClick={() => setShowNuevoCliente(true)}
                style={{ padding:"8px 16px", fontSize:12, color:"#3b82f6", border:"1px solid #3b82f644", background:"#3b82f611", borderRadius:7 }}>
                + Nuevo cliente
              </button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))", gap:14 }}>
              {clientesFilt.map(c => (
                <div key={c.id} className="card-hover" style={{ background:"#15181f", border:`1px solid ${c.activo ? "#252932" : "#ef444433"}`, borderRadius:10, padding:"18px 20px", opacity:c.activo ? 1 : 0.75 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                    <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                      <div style={{ width:40, height:40, borderRadius:10, background:`linear-gradient(135deg,${c.activo ? "#1e3a8a,#3b82f6" : "#2c2c2c,#444"})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#fff", flexShrink:0 }}>
                        {initials(c.nombre)}
                      </div>
                      <div>
                        <div style={{ fontSize:14, fontWeight:700, color:"#eef0f4", fontFamily:"Syne,sans-serif" }}>{c.nombre}</div>
                        <div style={{ fontSize:10, color:"#3b82f6", fontFamily:"DM Mono,monospace", marginTop:1 }}>{c.id}</div>
                        {c.usuario && <div style={{ fontSize:10, color:"#525a68", fontFamily:"DM Mono,monospace" }}>@{c.usuario}</div>}
                      </div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
                      {/* Toggle activo */}
                      <button className="btn" onClick={() => toggleActivo(c)}
                        style={{ fontSize:10, padding:"3px 10px", borderRadius:20, border:"none", cursor:"pointer", fontFamily:"DM Sans,sans-serif", fontWeight:600,
                          background:c.activo ? "#22c55e22" : "#ef444422",
                          color:c.activo ? "#22c55e" : "#ef4444"
                        }}>
                        {c.activo ? "Activo" : "Inactivo"}
                      </button>
                      {c.usar_ia && <span style={{ fontSize:9, color:"#f59e0b", background:"#f59e0b22", padding:"2px 7px", borderRadius:20, fontFamily:"DM Mono,monospace" }}>IA</span>}
                    </div>
                  </div>

                  <div style={{ fontSize:11, color:"#525a68", marginBottom:10, display:"flex", gap:12 }}>
                    <span>{c.departamentos?.length || 0} deptos</span>
                    <span>{procesos.filter(p => p.cliente_id === c.id).length} procesos</span>
                    <span style={{ color:"#f59e0b" }}>{procesos.filter(p => p.cliente_id === c.id && p.estado === "interesado").length} interesados</span>
                  </div>

                  {c.ultima_visita && <div style={{ fontSize:10, color:"#525a68", fontFamily:"DM Mono,monospace", marginBottom:12 }}>Última visita: {new Date(c.ultima_visita).toLocaleDateString("es-CO")}</div>}

                  {/* Drive cliente */}
                  <div style={{ borderTop:"1px solid #252932", paddingTop:12, marginBottom:12 }}>
                    {editDrive?.id === c.id ? (
                      <div style={{ display:"flex", gap:6 }}>
                        <input type="text" placeholder="URL Google Drive..." value={editDrive.url} onChange={e => setEditDrive({ ...editDrive, url: e.target.value })}
                          style={{ flex:1, padding:"7px 10px", background:"#0a0c10", border:"1px solid #252932", borderRadius:6, color:"#eef0f4", fontSize:11 }} />
                        <button className="btn" onClick={guardarDriveCliente} disabled={savingDrive} style={{ padding:"7px 12px", background:"#22c55e", color:"#fff", border:"none", borderRadius:6, fontSize:11, fontWeight:600 }}>{savingDrive ? "…" : "✓"}</button>
                        <button className="btn" onClick={() => setEditDrive(null)} style={{ padding:"7px 10px", background:"transparent", color:"#525a68", border:"1px solid #252932", borderRadius:6, fontSize:11 }}>✕</button>
                      </div>
                    ) : (
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        {c.drive_url
                          ? <a href={c.drive_url} target="_blank" rel="noreferrer" style={{ fontSize:11, color:"#22c55e" }}>📁 Drive ↗</a>
                          : <span style={{ fontSize:11, color:"#525a68" }}>Sin Drive</span>
                        }
                        <button className="btn" onClick={() => setEditDrive({ id: c.id, url: c.drive_url || "" })} style={{ fontSize:10, color:"#8b919e", background:"transparent", border:"1px solid #252932", borderRadius:5, padding:"4px 9px" }}>
                          {c.drive_url ? "Editar" : "Asignar Drive"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div style={{ display:"flex", gap:6 }}>
                    <button className="btn" onClick={() => router.push(`/cliente/${c.id}`)}
                      style={{ flex:1, padding:"7px", fontSize:11, background:"transparent", border:"1px solid #252932", color:"#8b919e", borderRadius:6 }}>
                      Ver portal
                    </button>
                    <button className="btn" onClick={() => setEditarCliente(c)}
                      style={{ flex:1, padding:"7px", fontSize:11, background:"#3b82f611", border:"1px solid #3b82f644", color:"#60a5fa", borderRadius:6 }}>
                      Editar
                    </button>
                    <button className="btn" onClick={() => setEliminarCliente(c)}
                      style={{ padding:"7px 10px", fontSize:11, background:"transparent", border:"1px solid #ef444433", color:"#ef4444", borderRadius:6 }}>
                      🗑
                    </button>
                  </div>
                </div>
              ))}

              {clientesFilt.length === 0 && (
                <div style={{ gridColumn:"1/-1", padding:"48px", textAlign:"center" as const, color:"#525a68", fontSize:13 }}>
                  No hay clientes con ese filtro.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ TAB FEEDBACK ══ */}
        {tab === "feedback" && (
          <div style={{ background:"#15181f", border:"1px solid #252932", borderRadius:10, overflow:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ borderBottom:"1px solid #252932" }}>
                  {["Cliente", "Proceso", "Acción", "Nota", "Fecha"].map(h => (
                    <th key={h} style={{ padding:"9px 14px", textAlign:"left" as const, fontSize:9, color:"#525a68", textTransform:"uppercase" as const, letterSpacing:1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {feedback.slice(0, 100).map(f => {
                  const proc = procesos.find(p => p.id === f.proceso_id)
                  return (
                    <tr key={f.id} className="row" style={{ borderBottom:"1px solid #1c2028" }}>
                      <td style={{ padding:"8px 14px", fontSize:11, color:"#60a5fa", fontFamily:"DM Mono,monospace" }}>{f.cliente_id || "—"}</td>
                      <td style={{ padding:"8px 14px", fontSize:10, color:"#525a68", maxWidth:160 }}><div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>{proc?.entidad || f.proceso_id?.substring(0, 12) || "—"}</div></td>
                      <td style={{ padding:"8px 14px" }}>
                        <span style={{ fontSize:10, padding:"3px 8px", borderRadius:4, background:f.accion === "interesado" ? "#22c55e22" : f.accion === "descartado" ? "#ef444422" : "#3b82f622", color:f.accion === "interesado" ? "#22c55e" : f.accion === "descartado" ? "#ef4444" : "#60a5fa", fontFamily:"DM Mono,monospace" }}>{f.accion}</span>
                      </td>
                      <td style={{ padding:"8px 14px", fontSize:11, color:"#8b919e" }}>{f.nota || "—"}</td>
                      <td style={{ padding:"8px 14px", fontSize:10, color:"#525a68", fontFamily:"DM Mono,monospace", whiteSpace:"nowrap" as const }}>{new Date(f.created_at).toLocaleDateString("es-CO")}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:"#1c2028", border:"1px solid #252932", color:"#eef0f4", padding:"12px 22px", borderRadius:10, fontSize:13, zIndex:999, boxShadow:"0 8px 32px rgba(0,0,0,0.4)", whiteSpace:"nowrap" as const }}>
          ✓ {toast}
        </div>
      )}

      {/* MODALES */}
      {showNuevoCliente && (
        <ModalNuevoCliente
          onClose={() => setShowNuevoCliente(false)}
          onCreated={c => { setClientes(prev => [...prev, c].sort((a, b) => a.nombre.localeCompare(b.nombre))); mostrarToast(`Cliente ${c.nombre} creado.`) }}
        />
      )}
      {editarCliente && (
        <ModalEditarCliente
          cliente={editarCliente}
          onClose={() => setEditarCliente(null)}
          onUpdated={c => { setClientes(prev => prev.map(x => x.id === c.id ? c : x)); mostrarToast("Cliente actualizado.") }}
        />
      )}
      {eliminarCliente && (
        <ModalEliminar
          nombre={eliminarCliente.nombre}
          loading={elimLoading}
          onClose={() => setEliminarCliente(null)}
          onConfirm={confirmarEliminar}
        />
      )}
      {showNuevoProceso && (
        <ModalProcesoManual
          clientes={clientes.filter(c => c.activo)}
          onClose={() => setShowNuevoProceso(false)}
          onCreated={p => { setProcesos(prev => [p, ...prev]); mostrarToast("Proceso manual agregado.") }}
        />
      )}
    </div>
  )
}
