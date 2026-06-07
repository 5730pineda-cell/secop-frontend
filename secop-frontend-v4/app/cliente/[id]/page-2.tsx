"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Cliente, Proceso } from "@/types"

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

function Timeline({ etapa }: { etapa: number }) {
  const idx = typeof etapa === "number" ? etapa : 0
  return (
    <div style={{ display:"flex", alignItems:"flex-start", width:"100%", marginTop:16, position:"relative" }}>
      <div style={{ position:"absolute", top:14, left:"5%", right:"5%", height:2, background:"#e2e8f0", zIndex:0, borderRadius:2 }} />
      <div style={{ position:"absolute", top:14, left:"5%", width:idx === 0 ? "0%" : `${Math.min((idx / (ETAPAS.length - 1)) * 90, 90)}%`, height:2, background:"linear-gradient(90deg,#1e3a8a,#3b82f6)", zIndex:1, transition:"width 0.6s ease", borderRadius:2 }} />
      {ETAPAS.map((e, i) => {
        const done = i < idx; const active = i === idx
        return (
          <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", position:"relative", zIndex:2 }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:done ? "#1e3a8a" : active ? "#fff" : "#f1f5f9", border:`2px solid ${done || active ? "#1e3a8a" : "#e2e8f0"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:done ? "#fff" : active ? "#1e3a8a" : "#cbd5e1", transition:"all 0.3s", boxShadow:active ? "0 0 0 4px rgba(30,58,138,0.12)" : "none" }}>
              {done ? "✓" : i + 1}
            </div>
            <div style={{ fontSize:9, marginTop:6, textAlign:"center" as const, color:active ? "#1e3a8a" : done ? "#3b82f6" : "#94a3b8", fontWeight:active ? 700 : 400, maxWidth:60, lineHeight:1.3 }}>{e}</div>
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
  const [timelineOculto, setTimelineOculto] = useState<Record<string, boolean>>({})
  const [showBienvenida, setShowBienvenida] = useState(false)
  const [procesoADescartar, setProcesoADescartar] = useState<Proceso | null>(null)
  const [filtroPanel, setFiltroPanel] = useState(false)
  const [fDepto, setFDepto] = useState("")
  const [fEntidad, setFEntidad] = useState("")
  const [fModalidad, setFModalidad] = useState("")
  const [fPresMin, setFPresMin] = useState("")
  const [fPresMax, setFPresMax] = useState("")
  const [fTexto, setFTexto] = useState("")

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
  function limpiarFiltros() { setFDepto(""); setFEntidad(""); setFModalidad(""); setFPresMin(""); setFPresMax(""); setFTexto("") }

  const nuevos = procesos.filter(p => p.estado === "nuevo")
  const interesados = procesos.filter(p => p.estado === "interesado")
  const presTodos = nuevos.reduce((s, p) => s + Number(p.presupuesto || 0), 0)
  const presInteresados = interesados.reduce((s, p) => s + Number(p.presupuesto || 0), 0)
  const deptos = [...new Set(procesos.map(p => p.departamento).filter(Boolean))].sort() as string[]
  const entidades = [...new Set(procesos.map(p => p.entidad).filter(Boolean))].sort() as string[]
  const modalidades = [...new Set(procesos.map(p => p.modalidad).filter(Boolean))].sort() as string[]
  const filtrosActivos = [fDepto, fEntidad, fModalidad, fPresMin, fPresMax, fTexto].filter(Boolean).length
  const listaBase = tab === "nuevos" ? nuevos : tab === "interesado" ? interesados : []
  const listaActual = listaBase.filter(p => {
    if (fDepto && p.departamento !== fDepto) return false
    if (fEntidad && p.entidad !== fEntidad) return false
    if (fModalidad && p.modalidad !== fModalidad) return false
    if (fPresMin && Number(p.presupuesto) < Number(fPresMin) * 1e6) return false
    if (fPresMax && Number(p.presupuesto) > Number(fPresMax) * 1e6) return false
    if (fTexto && !p.objeto?.toLowerCase().includes(fTexto.toLowerCase()) && !p.referencia?.toLowerCase().includes(fTexto.toLowerCase()) && !p.entidad?.toLowerCase().includes(fTexto.toLowerCase())) return false
    return true
  })

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#f0f4ff", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16, fontFamily:"DM Sans,sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:40, height:40, border:"3px solid #e2e8f0", borderTop:"3px solid #1e3a8a", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <p style={{ fontSize:13, color:"#94a3b8" }}>Cargando tu portal...</p>
    </div>
  )

  if (error) return (
    <div style={{ minHeight:"100vh", background:"#f0f4ff", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <p style={{ fontSize:14, color:"#dc2626", fontFamily:"DM Sans,sans-serif" }}>{error}</p>
    </div>
  )

  return (
    <div style={{ minHeight:"100vh", background:"#f0f4ff", fontFamily:"'DM Sans',sans-serif" }}>
      <style>{`
        *, *::before, *::after { box-sizing:border-box; }
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideOut{from{opacity:1;transform:translateY(0) scale(1)}to{opacity:0;transform:translateY(-6px) scale(0.98)}}
        @keyframes toastIn{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
        @keyframes progress{from{width:0%}to{width:100%}}
        .fadeUp{animation:fadeUp 0.3s ease both;}
        .saliendo{animation:slideOut 0.32s ease forwards!important;}
        .proc-card{transition:box-shadow 0.2s,border-color 0.2s,transform 0.15s;}
        .proc-card:hover{box-shadow:0 8px 28px rgba(30,58,138,0.1)!important;transform:translateY(-1px);}
        input::placeholder{color:#cbd5e1;}
        input:focus,select:focus{outline:none;border-color:#1e3a8a!important;box-shadow:0 0 0 3px rgba(30,58,138,0.08);}
        button{font-family:inherit;}
        a{text-decoration:none;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:2px;}
        .pulse{animation:pulse 1.8s ease infinite;}
        .btn{transition:all 0.15s;}
        .btn:hover{opacity:0.85!important;}
      `}</style>

      {/* NAV */}
      <nav style={{ background:"#fff", borderBottom:"1px solid #e8edf5", position:"sticky", top:0, zIndex:50, height:62 }}>
        <div style={{ maxWidth:980, margin:"0 auto", height:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px" }}>
          <span style={{ fontFamily:"Syne,sans-serif", fontSize:24, fontWeight:800, letterSpacing:-1.5 }}>
            <span style={{ color:"#0f172a" }}>sof</span><span style={{ color:"#2563eb" }}>ia</span>
            <span style={{ fontSize:9, color:"#94a3b8", letterSpacing:2, textTransform:"uppercase" as const, fontFamily:"DM Mono,monospace", marginLeft:10, fontWeight:400 }}>by OC Consultores</span>
          </span>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            {cliente && (
              <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,#1e3a8a,#3b82f6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff" }}>
                  {(cliente.nombre || "").split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()}
                </div>
                <span style={{ fontSize:13, color:"#334155", fontWeight:500 }}>{cliente.nombre.split(" ").slice(0, 2).join(" ")}</span>
              </div>
            )}
            <button className="btn" onClick={() => { document.cookie = "secop_token=;max-age=0;path=/"; localStorage.clear(); router.push("/login") }}
              style={{ padding:"7px 16px", borderRadius:8, fontSize:12, color:"#64748b", border:"1px solid #e2e8f0", background:"#f8fafc", fontWeight:500 }}>
              Salir
            </button>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth:980, margin:"0 auto", padding:"28px 24px 120px" }}>
        {/* HEADER */}
        <div className="fadeUp" style={{ marginBottom:24, display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap" as const, gap:16 }}>
          <div>
            <p style={{ fontSize:11, fontFamily:"DM Mono,monospace", color:"#3b82f6", letterSpacing:2.5, textTransform:"uppercase" as const, marginBottom:6 }}>Portal de licitaciones</p>
            <h1 style={{ fontFamily:"Syne,sans-serif", fontSize:28, fontWeight:800, letterSpacing:-0.8, color:"#0f172a", lineHeight:1.1, marginBottom:4 }}>
              {cliente?.nombre ? `Hola, ${cliente.nombre.split(" ")[0]}` : "Bienvenido"}
            </h1>
            <p style={{ fontSize:13, color:"#94a3b8", fontWeight:300 }}>
              {new Date().toLocaleDateString("es-CO", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
            </p>
          </div>
          {cliente?.drive_url && (
            <a href={cliente.drive_url} target="_blank" rel="noreferrer"
              style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 18px", borderRadius:12, background:"#fff", border:"1px solid #e2e8f0", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
              <svg width="20" height="20" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
              </svg>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:"#0f172a" }}>Mis documentos</div>
                <div style={{ fontSize:10, color:"#94a3b8" }}>Google Drive</div>
              </div>
            </a>
          )}
        </div>

        {/* STATS */}
        <div className="fadeUp" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:24 }}>
          {[
            { label:"Procesos nuevos", val:nuevos.length, color:"#1e3a8a", bg:"#eff6ff", border:"#bfdbfe" },
            { label:"Me interesa", val:interesados.length, color:"#16a34a", bg:"#f0fdf4", border:"#bbf7d0" },
            { label:tab === "interesado" ? "Presupuesto seleccionado" : "Presupuesto total", val:fmt(tab === "interesado" ? presInteresados : presTodos), color:"#0f172a", bg:"#fff", border:"#e2e8f0" },
          ].map((s, i) => (
            <div key={i} style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:14, padding:"18px 22px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize:10, color:"#94a3b8", textTransform:"uppercase" as const, letterSpacing:1.4, fontFamily:"DM Mono,monospace", marginBottom:8 }}>{s.label}</div>
              <div style={{ fontSize:26, fontWeight:700, color:s.color, fontFamily:"Syne,sans-serif", letterSpacing:-0.5 }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div className="fadeUp" style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, flexWrap:"wrap" as const }}>
          <div style={{ display:"flex", background:"#fff", border:"1px solid #e2e8f0", borderRadius:11, padding:4, gap:2, boxShadow:"0 1px 3px rgba(0,0,0,0.05)" }}>
            {[
              { key:"nuevos", label:"Nuevos", cnt:nuevos.length },
              { key:"interesado", label:"Me interesa", cnt:interesados.length },
              { key:"descartados", label:"Descartados", cnt:descartados.length },
            ].map(t => (
              <button key={t.key} className="btn" onClick={() => { setTab(t.key); limpiarFiltros(); setFiltroPanel(false) }} style={{
                padding:"7px 16px", borderRadius:8, fontSize:13, fontWeight:500, border:"none", cursor:"pointer",
                background:tab === t.key ? (t.key === "descartados" ? "#475569" : "#1e3a8a") : "transparent",
                color:tab === t.key ? "#fff" : (t.key === "descartados" ? "#94a3b8" : "#64748b"),
                display:"flex", alignItems:"center", gap:6,
              }}>
                {t.label}
                {t.cnt > 0 && <span style={{ background:tab === t.key ? "rgba(255,255,255,0.22)" : "#f1f5f9", color:tab === t.key ? "#fff" : "#64748b", fontSize:10, padding:"1px 7px", borderRadius:20, fontFamily:"DM Mono,monospace", fontWeight:600 }}>{t.cnt}</span>}
              </button>
            ))}
          </div>
          {tab !== "descartados" && (
            <button className="btn" onClick={() => setFiltroPanel(!filtroPanel)}
              style={{ padding:"8px 14px", borderRadius:9, fontSize:12, fontWeight:500, background:filtrosActivos > 0 ? "#eff6ff" : "#fff", color:filtrosActivos > 0 ? "#1e3a8a" : "#64748b", border:`1px solid ${filtrosActivos > 0 ? "#bfdbfe" : "#e2e8f0"}`, display:"flex", alignItems:"center", gap:6, cursor:"pointer" }}>
              ⚙ Filtrar {filtrosActivos > 0 && `(${filtrosActivos})`}
            </button>
          )}
          {filtrosActivos > 0 && tab !== "descartados" && (
            <button className="btn" onClick={limpiarFiltros} style={{ padding:"8px 12px", borderRadius:9, fontSize:12, color:"#94a3b8", border:"1px solid #e2e8f0", background:"#fff", cursor:"pointer" }}>× Limpiar</button>
          )}
        </div>

        {/* FILTROS */}
        {filtroPanel && tab !== "descartados" && (
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:20, marginBottom:16, boxShadow:"0 4px 20px rgba(0,0,0,0.06)" }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12, marginBottom:14 }}>
              <select value={fDepto} onChange={e => setFDepto(e.target.value)} style={{ padding:"9px 12px", border:"1px solid #e2e8f0", borderRadius:8, fontSize:13, color:"#0f172a", background:"#f8fafc" }}>
                <option value="">Todos los departamentos</option>
                {deptos.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={fEntidad} onChange={e => setFEntidad(e.target.value)} style={{ padding:"9px 12px", border:"1px solid #e2e8f0", borderRadius:8, fontSize:13, color:"#0f172a", background:"#f8fafc" }}>
                <option value="">Todas las entidades</option>
                {entidades.map(e => <option key={e} value={e}>{e.substring(0, 45)}</option>)}
              </select>
              <select value={fModalidad} onChange={e => setFModalidad(e.target.value)} style={{ padding:"9px 12px", border:"1px solid #e2e8f0", borderRadius:8, fontSize:13, color:"#0f172a", background:"#f8fafc" }}>
                <option value="">Todas las modalidades</option>
                {modalidades.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input type="text" placeholder="Buscar por texto..." value={fTexto} onChange={e => setFTexto(e.target.value)} style={{ padding:"9px 12px", border:"1px solid #e2e8f0", borderRadius:8, fontSize:13, color:"#0f172a", background:"#f8fafc" }} />
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <input type="number" placeholder="Pres. mín. (M)" value={fPresMin} onChange={e => setFPresMin(e.target.value)} style={{ flex:1, padding:"9px 10px", border:"1px solid #e2e8f0", borderRadius:8, fontSize:13, color:"#0f172a", background:"#f8fafc" }} />
                <span style={{ fontSize:12, color:"#94a3b8" }}>–</span>
                <input type="number" placeholder="Pres. máx. (M)" value={fPresMax} onChange={e => setFPresMax(e.target.value)} style={{ flex:1, padding:"9px 10px", border:"1px solid #e2e8f0", borderRadius:8, fontSize:13, color:"#0f172a", background:"#f8fafc" }} />
              </div>
            </div>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
              <button className="btn" onClick={limpiarFiltros} style={{ padding:"8px 16px", borderRadius:8, fontSize:13, background:"none", color:"#64748b", border:"1px solid #e2e8f0", cursor:"pointer" }}>Limpiar</button>
              <button className="btn" onClick={() => setFiltroPanel(false)} style={{ padding:"8px 20px", borderRadius:8, fontSize:13, fontWeight:600, background:"#1e3a8a", color:"#fff", border:"none", cursor:"pointer" }}>
                Aplicar · {listaActual.length} resultado{listaActual.length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        )}

        {tab !== "descartados" && (
          <div style={{ fontSize:10, color:"#94a3b8", fontFamily:"DM Mono,monospace", letterSpacing:1.5, textTransform:"uppercase" as const, marginBottom:14 }}>
            {listaActual.length} proceso{listaActual.length !== 1 ? "s" : ""} · {fmt(listaActual.reduce((s, p) => s + Number(p.presupuesto || 0), 0))}
          </div>
        )}

        {tab !== "descartados" && listaActual.length === 0 && (
          <div style={{ textAlign:"center" as const, padding:"72px 24px", background:"#fff", border:"1px solid #e2e8f0", borderRadius:16 }}>
            <div style={{ fontSize:40, marginBottom:12 }}>{tab === "interesado" ? "⭐" : "📋"}</div>
            <div style={{ fontSize:15, fontWeight:600, color:"#0f172a", marginBottom:6 }}>
              {filtrosActivos > 0 ? "Sin resultados" : tab === "interesado" ? "Sin procesos de interés aún" : "No hay procesos nuevos"}
            </div>
            <div style={{ fontSize:13, color:"#94a3b8", marginBottom:20 }}>
              {filtrosActivos > 0 ? "Intenta ajustar o limpiar los filtros." : tab === "interesado" ? "Marca los procesos que te interesan desde la pestaña Nuevos." : "SOFIA monitorea los procesos diariamente."}
            </div>
          </div>
        )}

        {/* CARDS */}
        {tab !== "descartados" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {listaActual.map((p, idx) => {
              const dias = diasRestantes(p.fecha_oferta)
              const urgente = dias !== null && dias <= 3 && dias >= 0
              const isInt = p.estado === "interesado"
              const isSaving = saving[p.id]
              const isSaliendo = saliendo[p.id]
              const etapa = p.etapa_seguimiento ?? 0
              const tlOculto = !!timelineOculto[p.id]

              return (
                <div key={p.id} className={`proc-card fadeUp${isSaliendo ? " saliendo" : ""}`}
                  style={{ background:"#fff", border:`1px solid ${isInt ? "#bfdbfe" : urgente ? "#fecaca" : "#e8edf5"}`, borderLeft:`4px solid ${isInt ? "#1e3a8a" : urgente ? "#ef4444" : "transparent"}`, borderRadius:16, overflow:"hidden", animationDelay:`${idx * 0.04}s`, boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
                  <div style={{ padding:"20px 22px 18px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16, marginBottom:10 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:"#0f172a", lineHeight:1.4, marginBottom:4 }}>{p.entidad || "—"}</div>
                        <div style={{ fontSize:10, color:"#94a3b8", fontFamily:"DM Mono,monospace" }}>{p.referencia}</div>
                      </div>
                      <div style={{ textAlign:"right" as const, flexShrink:0 }}>
                        <div style={{ fontSize:20, fontWeight:700, color:"#16a34a", fontFamily:"Syne,sans-serif", letterSpacing:-0.5 }}>{fmt(p.presupuesto)}</div>
                        <div style={{ fontSize:10, color:urgente ? "#ef4444" : "#94a3b8", fontFamily:"DM Mono,monospace", marginTop:3 }} className={urgente ? "pulse" : ""}>
                          {urgente ? `⚠ Cierre en ${dias}d` : `Cierre ${fmtFecha(p.fecha_oferta)}${dias !== null ? ` · ${dias}d` : ""}`}
                        </div>
                      </div>
                    </div>

                    <p style={{ fontSize:13, color:"#475569", lineHeight:1.7, marginBottom:14, fontWeight:300 }}>{p.objeto || "Sin descripción"}</p>

                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" as const, marginBottom:16 }}>
                      {p.departamento && <span style={{ fontSize:10, padding:"4px 11px", borderRadius:20, background:"#eff6ff", color:"#1d4ed8", fontWeight:600 }}>{p.departamento}</span>}
                      {p.modalidad && <span style={{ fontSize:10, padding:"4px 11px", borderRadius:20, background:"#f8fafc", color:"#64748b", border:"1px solid #e2e8f0" }}>{p.modalidad.split(" ").slice(0, 4).join(" ")}</span>}
                      {p.resultado_ia && <span style={{ fontSize:10, padding:"4px 11px", borderRadius:20, background:"#f5f3ff", color:"#6d28d9", fontWeight:600 }}>✓ IA</span>}
                      {isInt && <span style={{ fontSize:10, padding:"4px 11px", borderRadius:20, background:"#eff6ff", color:"#1e3a8a", fontWeight:700, border:"1px solid #bfdbfe" }}>✓ Me interesa</span>}
                    </div>

                    {isInt && (
                      <div style={{ background:"#f8fafc", border:"1px solid #e8edf5", borderRadius:12, marginBottom:16, overflow:"hidden" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:6, height:6, borderRadius:"50%", background:"#3b82f6", boxShadow:"0 0 6px #3b82f6" }} />
                            <span style={{ fontSize:12, fontWeight:600, color:"#1e3a8a" }}>Seguimiento de gestión</span>
                            <span style={{ fontSize:10, color:"#3b82f6", background:"#eff6ff", padding:"2px 9px", borderRadius:20, fontFamily:"DM Mono,monospace", fontWeight:600 }}>{ETAPAS[etapa]}</span>
                          </div>
                          <button onClick={() => setTimelineOculto(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                            style={{ fontSize:11, color:"#64748b", background:"#fff", border:"1px solid #e2e8f0", borderRadius:7, padding:"5px 11px", cursor:"pointer", fontFamily:"inherit" }}>
                            {tlOculto ? "Ver" : "Ocultar"}
                          </button>
                        </div>
                        {!tlOculto && (
                          <div style={{ padding:"4px 16px 16px", borderTop:"1px solid #e8edf5" }}>
                            <Timeline etapa={etapa} />
                            <div style={{ marginTop:14, padding:"11px 14px", background:etapa > 0 ? "#f0fdf4" : "#eff6ff", border:`1px solid ${etapa > 0 ? "#bbf7d0" : "#bfdbfe"}`, borderRadius:9, fontSize:12, color:etapa > 0 ? "#166534" : "#1e40af", lineHeight:1.6 }}>
                              {etapa === 0 ? <>Usa <strong>&quot;Enviar a SOFIA&quot;</strong> para que el equipo inicie el análisis formal.</> : <>Estamos en la etapa <strong>{ETAPAS[etapa]}</strong>. OC Consultores te mantendrá informado.</>}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ display:"flex", gap:8, flexWrap:"wrap" as const, alignItems:"center" }}>
                      {!isInt && (
                        <button className="btn" onClick={() => marcarInteres(p.id)} disabled={!!isSaving}
                          style={{ padding:"9px 18px", borderRadius:9, fontSize:12, fontWeight:600, background:"#f0fdf4", color:"#16a34a", border:"1px solid #bbf7d0", opacity:isSaving ? 0.6 : 1, cursor:"pointer" }}>
                          {isSaving && isSaving !== "sofia" ? "…" : "✓ Me interesa"}
                        </button>
                      )}
                      <button className="btn" onClick={() => enviarSOFIA(p.id)} disabled={isSaving === "sofia"}
                        style={{ padding:"9px 20px", borderRadius:9, fontSize:12, fontWeight:700, background:"#1e3a8a", color:"#fff", border:"none", opacity:isSaving === "sofia" ? 0.6 : 1, boxShadow:"0 2px 8px rgba(30,58,138,0.2)", cursor:"pointer" }}>
                        {isSaving === "sofia" ? "Enviando…" : "→ Enviar a SOFIA"}
                      </button>
                      {isInt && (
                        p.drive_proceso_url
                          ? <a href={p.drive_proceso_url} target="_blank" rel="noreferrer" style={{ padding:"9px 16px", borderRadius:9, fontSize:12, fontWeight:600, background:"#f0fdf4", color:"#16a34a", border:"1px solid #bbf7d0", display:"flex", alignItems:"center", gap:6 }}>📁 Drive</a>
                          : <button disabled style={{ padding:"9px 16px", borderRadius:9, fontSize:12, fontWeight:500, background:"#f8fafc", color:"#cbd5e1", border:"1px solid #e2e8f0", cursor:"default" }}>📁 Drive</button>
                      )}
                      <button className="btn" onClick={() => setProcesoADescartar(p)} disabled={!!isSaving}
                        style={{ padding:"9px 16px", borderRadius:9, fontSize:12, background:"#fff", color:"#94a3b8", border:"1px solid #e2e8f0", opacity:isSaving ? 0.5 : 1, cursor:"pointer" }}>
                        Descartar
                      </button>
                      <a href={p.url || "#"} target="_blank" rel="noreferrer"
                        style={{ marginLeft:"auto", padding:"9px 16px", borderRadius:9, fontSize:12, color:"#3b82f6", border:"1px solid #bfdbfe", background:"#eff6ff", fontWeight:500, display:"flex", alignItems:"center", gap:5 }}>
                        Ver en SECOP ↗
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* DESCARTADOS */}
        {tab === "descartados" && (
          <div>
            {descartados.length === 0 ? (
              <div style={{ textAlign:"center" as const, padding:"72px 24px", background:"#fff", border:"1px solid #e2e8f0", borderRadius:16 }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🗑</div>
                <div style={{ fontSize:15, fontWeight:600, color:"#0f172a", marginBottom:6 }}>Sin procesos descartados</div>
                <div style={{ fontSize:13, color:"#94a3b8" }}>Se eliminan automáticamente después de 30 días.</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize:10, color:"#94a3b8", fontFamily:"DM Mono,monospace", letterSpacing:1.5, textTransform:"uppercase" as const, marginBottom:14 }}>
                  {descartados.length} proceso{descartados.length !== 1 ? "s" : ""} · se eliminan a los 30 días
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {descartados.map(p => (
                    <div key={p.id} style={{ background:"#fff", border:"1px solid #e8edf5", borderLeft:"4px solid #e2e8f0", borderRadius:16, padding:"20px 22px", boxShadow:"0 2px 8px rgba(0,0,0,0.04)", opacity:0.85 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16, marginBottom:10 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:14, fontWeight:600, color:"#64748b", marginBottom:4 }}>{p.entidad || "—"}</div>
                          <div style={{ fontSize:10, color:"#94a3b8", fontFamily:"DM Mono,monospace" }}>{p.referencia}{p.departamento ? ` · ${p.departamento}` : ""}</div>
                        </div>
                        <div style={{ fontSize:18, fontWeight:600, color:"#94a3b8", fontFamily:"Syne,sans-serif" }}>{fmt(p.presupuesto)}</div>
                      </div>
                      <p style={{ fontSize:13, color:"#94a3b8", lineHeight:1.6, marginBottom:16 }}>{(p.objeto || "").substring(0, 120)}{(p.objeto || "").length > 120 ? "…" : ""}</p>
                      <div style={{ display:"flex", gap:8 }}>
                        <button className="btn" onClick={() => restaurar(p.id)}
                          style={{ padding:"8px 18px", borderRadius:9, fontSize:12, fontWeight:600, background:"#eff6ff", color:"#1e3a8a", border:"1px solid #bfdbfe", cursor:"pointer" }}>
                          ↩ Restaurar proceso
                        </button>
                        {p.url && <a href={p.url} target="_blank" rel="noreferrer" style={{ marginLeft:"auto", padding:"8px 14px", borderRadius:9, fontSize:12, color:"#94a3b8", border:"1px solid #e2e8f0", background:"#f8fafc" }}>Ver en SECOP ↗</a>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"rgba(255,255,255,0.96)", backdropFilter:"blur(20px)", borderTop:"1px solid #e8edf5", padding:"12px 24px", display:"flex", justifyContent:"space-between", alignItems:"center", zIndex:40 }}>
        <span style={{ fontFamily:"Syne,sans-serif", fontSize:16, fontWeight:800, letterSpacing:-0.5 }}>
          <span style={{ color:"#0f172a" }}>sof</span><span style={{ color:"#2563eb" }}>ia</span>
          <span style={{ fontSize:10, color:"#cbd5e1", fontFamily:"DM Mono,monospace", fontWeight:400, marginLeft:10 }}>OC Consultores Tax &amp; Legal S.A.S</span>
        </span>
        <div style={{ display:"flex", gap:18, fontSize:11 }}>
          <a href="mailto:info@tusconsultoresoc.com" style={{ color:"#3b82f6", fontWeight:500, textDecoration:"none" }}>info@tusconsultoresoc.com</a>
          <a href="https://wa.me/573134419872" style={{ color:"#16a34a", fontWeight:500, textDecoration:"none" }}>WhatsApp</a>
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div style={{ position:"fixed", bottom:72, left:"50%", transform:"translateX(-50%)", background:toast.tipo === "sofia" ? "#1e3a8a" : toast.tipo === "ok" ? "#166534" : "#475569", color:"#fff", padding:"13px 24px", borderRadius:14, fontSize:13, fontWeight:500, whiteSpace:"nowrap", zIndex:999, animation:"toastIn 0.25s ease", boxShadow:"0 8px 32px rgba(0,0,0,0.18)", display:"flex", alignItems:"center", gap:8 }}>
          <span>{toast.tipo === "sofia" ? "→" : toast.tipo === "info" ? "↩" : "✓"}</span> {toast.msg}
        </div>
      )}

      {/* MODAL DESCARTAR */}
      {procesoADescartar && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20, backdropFilter:"blur(6px)" }} onClick={() => setProcesoADescartar(null)}>
          <div style={{ background:"#fff", borderRadius:20, padding:"32px 28px 26px", maxWidth:400, width:"100%", boxShadow:"0 24px 64px rgba(0,0,0,0.22)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:22 }}>
              <div style={{ width:64, height:64, borderRadius:18, background:"linear-gradient(135deg,#1e3a8a,#2563eb)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}>
                <span style={{ fontFamily:"Syne,sans-serif", fontSize:20, fontWeight:800, color:"#fff" }}>sof<span style={{ color:"#93c5fd" }}>ia</span></span>
              </div>
              <h3 style={{ fontSize:18, fontWeight:800, color:"#0f172a", marginBottom:8, fontFamily:"Syne,sans-serif" }}>¿Descartar proceso?</h3>
              <p style={{ fontSize:13, color:"#64748b", lineHeight:1.7, textAlign:"center" as const, maxWidth:300 }}>Pasará a tu carpeta de <strong>Descartados</strong> y podrás recuperarlo cuando quieras.</p>
              <div style={{ marginTop:14, padding:"10px 16px", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, width:"100%", textAlign:"center" as const }}>
                <div style={{ fontSize:12, fontWeight:600, color:"#475569" }}>{(procesoADescartar.entidad || "").substring(0, 55)}</div>
                <div style={{ fontSize:11, color:"#94a3b8", fontFamily:"DM Mono,monospace" }}>{procesoADescartar.referencia}</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setProcesoADescartar(null)} style={{ flex:1, padding:"12px", borderRadius:11, fontSize:13, fontWeight:600, background:"#f8fafc", color:"#64748b", border:"1px solid #e2e8f0", cursor:"pointer", fontFamily:"inherit" }}>Cancelar</button>
              <button onClick={() => descartar(procesoADescartar.id)} style={{ flex:1, padding:"12px", borderRadius:11, fontSize:13, fontWeight:700, background:"linear-gradient(135deg,#dc2626,#ef4444)", color:"#fff", border:"none", cursor:"pointer", fontFamily:"inherit" }}>Sí, descartar</button>
            </div>
          </div>
        </div>
      )}

      {showBienvenida && <BienvenidaToast nombre={cliente?.nombre || ""} onClose={() => setShowBienvenida(false)} />}
    </div>
  )
}
