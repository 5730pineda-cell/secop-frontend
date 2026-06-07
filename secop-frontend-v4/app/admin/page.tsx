"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Cliente, Proceso, Feedback } from "@/types"

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
  return new Date(f).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })
}
function diasRestantes(f: string | null): number | null {
  if (!f) return null
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const fe = new Date(f); fe.setHours(0, 0, 0, 0)
  return Math.ceil((fe.getTime() - hoy.getTime()) / 86400000)
}

const ETAPAS = ["Análisis", "Tu aprobación", "Organización", "Presentación", "Resultado"]
const ADMIN_PASS = "admin2024oc"

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
            {i > 0 && <div style={{ position:"absolute", left:"-50%", right:"50%", top:13, height:2, background:done || active ? "#2563eb" : "#e2e8f0", zIndex:0 }} />}
            <div title={`Ir a: ${e}`} style={{ width:26, height:26, borderRadius:"50%", zIndex:1, background:done ? "#2563eb" : active ? "#1e3a8a" : "#f1f5f9", border:`2px solid ${done || active ? "#2563eb" : "#cbd5e1"}`, display:"flex", alignItems:"center", justifyContent:"center", color:done || active ? "#fff" : "#94a3b8", fontSize:10, fontWeight:600, flexShrink:0, boxShadow:active ? "0 0 0 3px rgba(37,99,235,0.2)" : "none" }}>
              {done ? "✓" : i + 1}
            </div>
            <div style={{ fontSize:9, color:active ? "#1e3a8a" : done ? "#2563eb" : "#94a3b8", marginTop:4, textAlign:"center" as const, fontWeight:active || done ? 500 : 400, maxWidth:60, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [pass, setPass] = useState("")
  const [loginErr, setLoginErr] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [procesos, setProcesos] = useState<Proceso[]>([])
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [clienteSel, setClienteSel] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [tab, setTab] = useState("procesos")
  const [toast, setToast] = useState("")
  const [editDrive, setEditDrive] = useState<{ id: string; url: string } | null>(null)
  const [savingDrive, setSavingDrive] = useState(false)
  const [editDriveProceso, setEditDriveProceso] = useState<string | null>(null)
  const [driveProcUrl, setDriveProcUrl] = useState("")
  const [savingDriveProc, setSavingDriveProc] = useState(false)

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

  async function guardarDriveCliente() {
    if (!editDrive) return
    setSavingDrive(true)
    await supabase.from("clientes").update({ drive_url: editDrive.url || null }).eq("id", editDrive.id)
    setClientes(prev => prev.map(c => c.id === editDrive.id ? { ...c, drive_url: editDrive.url || null } : c))
    setSavingDrive(false)
    setEditDrive(null)
    mostrarToast("Drive del cliente guardado.")
  }

  async function guardarDriveProceso() {
    if (!editDriveProceso) return
    setSavingDriveProc(true)
    await supabase.from("procesos").update({ drive_proceso_url: driveProcUrl || null }).eq("id", editDriveProceso)
    setProcesos(prev => prev.map(p => p.id === editDriveProceso ? { ...p, drive_proceso_url: driveProcUrl || null } : p))
    setSavingDriveProc(false)
    setEditDriveProceso(null)
    setDriveProcUrl("")
    mostrarToast("Drive del proceso guardado.")
  }

  function actualizarEtapa(procesoId: string, etapa: number) {
    setProcesos(prev => prev.map(p => p.id === procesoId ? { ...p, etapa_seguimiento: etapa } : p))
    mostrarToast(`Etapa actualizada: ${ETAPAS[etapa]}`)
  }

  const clientesFilt = clientes.filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || c.id.toLowerCase().includes(busqueda.toLowerCase()))
  const procesosFilt = procesos.filter(p => {
    const matchCliente = clienteSel ? p.cliente_id === clienteSel : true
    const matchBusq = busqueda ? p.entidad?.toLowerCase().includes(busqueda.toLowerCase()) || p.referencia.toLowerCase().includes(busqueda.toLowerCase()) || p.objeto?.toLowerCase().includes(busqueda.toLowerCase()) : true
    return matchCliente && matchBusq
  })
  const interesados = procesosFilt.filter(p => p.estado === "interesado")
  const nuevos = procesosFilt.filter(p => p.estado === "nuevo")

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

  return (
    <div style={{ minHeight:"100vh", background:"#0a0c10", fontFamily:"'DM Sans',sans-serif" }}>
      <style>{`
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        input::placeholder{color:#525a68;}
        input:focus,select:focus{outline:none;}
        button{font-family:inherit;cursor:pointer;}
        a{text-decoration:none;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-thumb{background:#252932;border-radius:2px;}
        .btn{transition:all 0.15s;}
        .btn:hover{opacity:0.85!important;}
        .row:hover{background:#1c202820!important;}
      `}</style>

      {/* NAV */}
      <nav style={{ background:"#111318", borderBottom:"1px solid #252932", position:"sticky", top:0, zIndex:50, height:58 }}>
        <div style={{ maxWidth:1200, margin:"0 auto", height:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <span style={{ fontFamily:"Syne,sans-serif", fontSize:20, fontWeight:800, letterSpacing:-1 }}><span style={{ color:"#eef0f4" }}>sof</span><span style={{ color:"#3b82f6" }}>ia</span></span>
            <span style={{ fontSize:10, color:"#525a68", fontFamily:"DM Mono,monospace", letterSpacing:2, textTransform:"uppercase" as const }}>Admin · OC Consultores</span>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn" onClick={() => router.push("/dashboard")} style={{ padding:"6px 14px", fontSize:12, color:"#8b919e", border:"1px solid #252932", background:"transparent", borderRadius:6 }}>Dashboard</button>
            <button className="btn" onClick={() => { sessionStorage.removeItem("secop_admin"); router.push("/login") }} style={{ padding:"6px 14px", fontSize:12, color:"#8b919e", border:"1px solid #252932", background:"transparent", borderRadius:6 }}>Salir</button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"24px" }}>
        {/* STATS */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:12, marginBottom:24 }}>
          {[
            { label:"Clientes activos", val:clientes.filter(c => c.activo).length, color:"#60a5fa" },
            { label:"Total procesos", val:procesos.length, color:"#22c55e" },
            { label:"Interesados", val:procesos.filter(p => p.estado === "interesado").length, color:"#f59e0b" },
            { label:"Nuevos", val:procesos.filter(p => p.estado === "nuevo").length, color:"#8b919e" },
            { label:"Feedback total", val:feedback.length, color:"#a78bfa" },
          ].map((s, i) => (
            <div key={i} style={{ background:"#15181f", border:"1px solid #252932", borderRadius:8, padding:"16px 18px" }}>
              <div style={{ fontSize:10, color:"#525a68", textTransform:"uppercase" as const, letterSpacing:1, fontFamily:"DM Mono,monospace", marginBottom:6 }}>{s.label}</div>
              <div style={{ fontSize:24, fontWeight:700, color:s.color, fontFamily:"Syne,sans-serif" }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* SELECTOR CLIENTE + BÚSQUEDA */}
        <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" as const }}>
          <select value={clienteSel || ""} onChange={e => setClienteSel(e.target.value || null)}
            style={{ padding:"9px 12px", background:"#15181f", border:"1px solid #252932", borderRadius:8, fontSize:13, color:"#eef0f4", minWidth:200 }}>
            <option value="">— Todos los clientes —</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <input type="text" placeholder="Buscar por entidad, referencia, objeto..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ flex:1, padding:"9px 14px", background:"#15181f", border:"1px solid #252932", borderRadius:8, fontSize:13, color:"#eef0f4", minWidth:200 }} />
          <div style={{ display:"flex", background:"#15181f", border:"1px solid #252932", borderRadius:8, overflow:"hidden" }}>
            {["procesos", "clientes", "feedback"].map(t => (
              <button key={t} className="btn" onClick={() => setTab(t)} style={{ padding:"9px 16px", fontSize:12, fontWeight:tab === t ? 600 : 400, background:tab === t ? "#3b82f6" : "transparent", color:tab === t ? "#fff" : "#8b919e", border:"none", textTransform:"capitalize" as const }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* TAB PROCESOS */}
        {tab === "procesos" && (
          <div>
            <div style={{ display:"flex", gap:12, marginBottom:16 }}>
              {[
                { label:"Interesados", cnt:interesados.length, color:"#f59e0b" },
                { label:"Nuevos", cnt:nuevos.length, color:"#8b919e" },
              ].map(s => (
                <div key={s.label} style={{ fontSize:11, color:s.color, fontFamily:"DM Mono,monospace" }}>{s.label}: {s.cnt}</div>
              ))}
            </div>

            {/* INTERESADOS */}
            {interesados.length > 0 && (
              <div style={{ marginBottom:24 }}>
                <h3 style={{ fontSize:12, color:"#f59e0b", fontFamily:"DM Mono,monospace", letterSpacing:1.5, textTransform:"uppercase" as const, marginBottom:12 }}>Interesados — {interesados.length}</h3>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {interesados.map(p => {
                    const cliente = clientes.find(c => c.id === p.cliente_id)
                    const dias = diasRestantes(p.fecha_oferta)
                    const urgente = dias !== null && dias <= 3 && dias >= 0
                    return (
                      <div key={p.id} style={{ background:"#15181f", border:"1px solid #252932", borderRadius:10, padding:"16px 18px" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:10 }}>
                          <div style={{ flex:1 }}>
                            <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                              <span style={{ fontSize:10, background:"#1e3a8a22", color:"#60a5fa", padding:"2px 8px", borderRadius:4, fontFamily:"DM Mono,monospace" }}>{cliente?.nombre || p.cliente_id}</span>
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

                        {/* Timeline admin */}
                        <div style={{ background:"#1c2028", border:"1px solid #252932", borderRadius:8, padding:"12px 14px", marginBottom:12 }}>
                          <div style={{ fontSize:10, color:"#525a68", fontFamily:"DM Mono,monospace", marginBottom:4 }}>ETAPA ACTUAL: <span style={{ color:"#60a5fa" }}>{ETAPAS[p.etapa_seguimiento ?? 0]}</span></div>
                          <TimelineAdmin procesoId={p.id} etapa={p.etapa_seguimiento ?? 0} onUpdate={actualizarEtapa} />
                        </div>

                        {/* Drive proceso */}
                        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" as const }}>
                          {editDriveProceso === p.id ? (
                            <>
                              <input type="text" placeholder="URL Google Drive del proceso..." value={driveProcUrl} onChange={e => setDriveProcUrl(e.target.value)}
                                style={{ flex:1, padding:"8px 10px", background:"#0a0c10", border:"1px solid #252932", borderRadius:6, color:"#eef0f4", fontSize:12, minWidth:200 }} />
                              <button className="btn" onClick={guardarDriveProceso} disabled={savingDriveProc} style={{ padding:"8px 14px", background:"#22c55e", color:"#fff", border:"none", borderRadius:6, fontSize:12, fontWeight:600 }}>{savingDriveProc ? "…" : "Guardar"}</button>
                              <button className="btn" onClick={() => { setEditDriveProceso(null); setDriveProcUrl("") }} style={{ padding:"8px 12px", background:"transparent", color:"#525a68", border:"1px solid #252932", borderRadius:6, fontSize:12 }}>✕</button>
                            </>
                          ) : (
                            <>
                              {p.drive_proceso_url
                                ? <a href={p.drive_proceso_url} target="_blank" rel="noreferrer" style={{ padding:"7px 14px", background:"#15803d22", color:"#22c55e", border:"1px solid #22c55e44", borderRadius:6, fontSize:12, display:"flex", alignItems:"center", gap:5 }}>📁 Drive proceso ↗</a>
                                : <span style={{ fontSize:11, color:"#525a68" }}>Sin Drive asignado</span>
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
                <h3 style={{ fontSize:12, color:"#8b919e", fontFamily:"DM Mono,monospace", letterSpacing:1.5, textTransform:"uppercase" as const, marginBottom:12 }}>Nuevos — {nuevos.length}</h3>
                <div style={{ background:"#15181f", border:"1px solid #252932", borderRadius:10, overflow:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ borderBottom:"1px solid #252932" }}>
                        {["Cliente", "Entidad", "Referencia", "Depto.", "Presupuesto", "IA", "Oferta", ""].map(h => (
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

        {/* TAB CLIENTES */}
        {tab === "clientes" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:14 }}>
            {clientesFilt.map(c => (
              <div key={c.id} style={{ background:"#15181f", border:"1px solid #252932", borderRadius:10, padding:"18px 20px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:10, color:"#3b82f6", fontFamily:"DM Mono,monospace", marginBottom:3 }}>{c.id}</div>
                    <div style={{ fontSize:14, fontWeight:700, color:"#eef0f4", fontFamily:"Syne,sans-serif" }}>{c.nombre}</div>
                    {c.usuario && <div style={{ fontSize:10, color:"#525a68", fontFamily:"DM Mono,monospace", marginTop:2 }}>@{c.usuario}</div>}
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    {c.activo ? <span style={{ fontSize:10, color:"#22c55e", background:"#22c55e22", padding:"3px 8px", borderRadius:4 }}>Activo</span> : <span style={{ fontSize:10, color:"#ef4444", background:"#ef444422", padding:"3px 8px", borderRadius:4 }}>Inactivo</span>}
                    {c.usar_ia && <span style={{ fontSize:10, color:"#f59e0b", background:"#f59e0b22", padding:"3px 8px", borderRadius:4 }}>IA</span>}
                  </div>
                </div>

                <div style={{ fontSize:11, color:"#525a68", marginBottom:10, display:"flex", gap:12 }}>
                  <span>{c.departamentos?.length || 0} departamentos</span>
                  <span>{procesos.filter(p => p.cliente_id === c.id).length} procesos</span>
                  <span>{procesos.filter(p => p.cliente_id === c.id && p.estado === "interesado").length} interesados</span>
                </div>

                {c.ultima_visita && <div style={{ fontSize:10, color:"#525a68", fontFamily:"DM Mono,monospace", marginBottom:12 }}>Última visita: {new Date(c.ultima_visita).toLocaleDateString("es-CO")}</div>}

                {/* Drive cliente */}
                <div style={{ borderTop:"1px solid #252932", paddingTop:12 }}>
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
                        ? <a href={c.drive_url} target="_blank" rel="noreferrer" style={{ fontSize:11, color:"#22c55e", display:"flex", gap:5, alignItems:"center" }}>📁 Drive cliente ↗</a>
                        : <span style={{ fontSize:11, color:"#525a68" }}>Sin Drive</span>
                      }
                      <button className="btn" onClick={() => setEditDrive({ id: c.id, url: c.drive_url || "" })} style={{ fontSize:10, color:"#8b919e", background:"transparent", border:"1px solid #252932", borderRadius:5, padding:"5px 10px" }}>
                        {c.drive_url ? "Editar" : "Asignar Drive"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB FEEDBACK */}
        {tab === "feedback" && (
          <div style={{ background:"#15181f", border:"1px solid #252932", borderRadius:10, overflow:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ borderBottom:"1px solid #252932" }}>
                  {["Cliente", "Acción", "Nota", "Fecha"].map(h => (
                    <th key={h} style={{ padding:"9px 14px", textAlign:"left" as const, fontSize:9, color:"#525a68", textTransform:"uppercase" as const, letterSpacing:1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {feedback.slice(0, 100).map(f => (
                  <tr key={f.id} className="row" style={{ borderBottom:"1px solid #1c2028" }}>
                    <td style={{ padding:"8px 14px", fontSize:11, color:"#60a5fa", fontFamily:"DM Mono,monospace" }}>{f.cliente_id || "—"}</td>
                    <td style={{ padding:"8px 14px" }}>
                      <span style={{ fontSize:10, padding:"3px 8px", borderRadius:4, background:f.accion === "interesado" ? "#22c55e22" : f.accion === "descartado" ? "#ef444422" : "#3b82f622", color:f.accion === "interesado" ? "#22c55e" : f.accion === "descartado" ? "#ef4444" : "#60a5fa", fontFamily:"DM Mono,monospace" }}>{f.accion}</span>
                    </td>
                    <td style={{ padding:"8px 14px", fontSize:11, color:"#8b919e" }}>{f.nota || "—"}</td>
                    <td style={{ padding:"8px 14px", fontSize:10, color:"#525a68", fontFamily:"DM Mono,monospace", whiteSpace:"nowrap" as const }}>{new Date(f.created_at).toLocaleDateString("es-CO")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:"#1c2028", border:"1px solid #252932", color:"#eef0f4", padding:"12px 22px", borderRadius:10, fontSize:13, zIndex:999, boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
          ✓ {toast}
        </div>
      )}
    </div>
  )
}
