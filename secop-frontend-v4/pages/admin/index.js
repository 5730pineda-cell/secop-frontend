import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabase'

function fmt(n) {
  if (!n) return '—'
  const v = Number(n)
  if (v >= 1e9) return '$' + (v/1e9).toFixed(1).replace('.',',') + ' mil M'
  if (v >= 1e6) return '$' + Math.round(v/1e6).toLocaleString('es-CO') + 'M'
  if (v >= 1e3) return '$' + Math.round(v/1e3).toLocaleString('es-CO') + 'K'
  return '$' + v.toLocaleString('es-CO')
}
function fmtFecha(f) {
  if (!f) return '—'
  return new Date(f).toLocaleDateString('es-CO', { day:'2-digit', month:'short' })
}
function diasRestantes(f) {
  if (!f) return null
  const hoy = new Date(); hoy.setHours(0,0,0,0)
  const fe = new Date(f); fe.setHours(0,0,0,0)
  return Math.ceil((fe - hoy) / 86400000)
}
function iniciales(n) { return (n||'').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase() }

function StatCard({ label, value, color }) {
  return (
    <div style={{ background:'var(--blanco)', border:'1px solid var(--borde)', borderRadius:'var(--radio)', padding:'16px 20px' }}>
      <div style={{ fontSize:11, color:'var(--suave)', textTransform:'uppercase', letterSpacing:0.6, marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:600, color:color||'var(--texto)', fontFamily:'DM Mono,monospace' }}>{value}</div>
    </div>
  )
}

function EstadoBadge({ estado }) {
  const map = {
    nuevo:      { bg:'var(--azul-bg)',  color:'#1e40af', label:'Nuevo' },
    interesado: { bg:'var(--verde-bg)', color:'var(--verde)', label:'Interesado' },
    descartado: { bg:'var(--rojo-bg)',  color:'var(--rojo)', label:'Descartado' },
    vencido:    { bg:'#f1f5f9',         color:'var(--claro)', label:'Vencido' },
  }
  const s = map[estado] || map.nuevo
  return <span style={{ background:s.bg, color:s.color, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:500, whiteSpace:'nowrap' }}>{s.label}</span>
}

const ETAPAS = ['Análisis', 'Tu aprobación', 'Organización', 'Presentación', 'Resultado']

function TimelineAdmin({ procesoId, etapa, onUpdate }) {
  const [updating, setUpdating] = useState(false)
  const idx = typeof etapa === 'number' ? etapa : 0

  async function irEtapa(i) {
    if (updating || i === idx) return
    setUpdating(true)
    await supabase.from('procesos').update({ etapa_seguimiento: i }).eq('id', procesoId)
    onUpdate(procesoId, i)
    setUpdating(false)
  }

  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:0, width:'100%', marginTop:8 }}>
      {ETAPAS.map((e, i) => {
        const done = i < idx
        const active = i === idx
        return (
          <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1, position:'relative', cursor: updating?'wait':'pointer' }} onClick={() => irEtapa(i)}>
            {i > 0 && <div style={{ position:'absolute', left:'-50%', right:'50%', top:13, height:2, background: done||active?'#2563eb':'#e2e8f0', zIndex:0, transition:'background 0.3s' }} />}
            <div title={`Ir a: ${e}`} style={{ width:26, height:26, borderRadius:'50%', zIndex:1, background: done?'#2563eb':active?'#1e3a8a':'#f1f5f9', border:`2px solid ${done||active?'#2563eb':'#cbd5e1'}`, display:'flex', alignItems:'center', justifyContent:'center', color: done||active?'#fff':'#94a3b8', fontSize:10, fontWeight:600, transition:'all 0.2s', flexShrink:0, boxShadow: active?'0 0 0 3px rgba(37,99,235,0.2)':'none' }}>
              {done ? '✓' : i+1}
            </div>
            <div style={{ fontSize:9, color: active?'#1e3a8a':done?'#2563eb':'#94a3b8', marginTop:4, textAlign:'center', fontWeight: active||done?500:400, whiteSpace:'nowrap', maxWidth:60, overflow:'hidden', textOverflow:'ellipsis' }}>{e}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function Admin() {
  const router = useRouter()
  const [authed, setAuthed]         = useState(false)
  const [pass, setPass]             = useState('')
  const [loginErr, setLoginErr]     = useState(false)
  const [clientes, setClientes]     = useState([])
  const [procesos, setProcesos]     = useState([])
  const [feedback, setFeedback]     = useState([])
  const [clienteSel, setClienteSel] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [busqueda, setBusqueda]     = useState('')
  const [tab, setTab]               = useState('procesos')
  const [toast, setToast]           = useState('')
  const [editDrive, setEditDrive]   = useState(null)
  const [savingDrive, setSavingDrive] = useState(false)
  const [editDriveProceso, setEditDriveProceso] = useState(null)  // procesoId
  const [driveProcUrl, setDriveProcUrl] = useState('')
  const [savingDriveProc, setSavingDriveProc] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('secop_admin') === 'true') { setAuthed(true); cargar() }
    else setLoading(false)
  }, [])

  useEffect(() => {
    if (!authed) return
    const canal = supabase.channel('admin-realtime')
      .on('postgres_changes', { event:'*', schema:'public', table:'feedback' }, () => cargarFeedback())
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'procesos' }, () => cargarProcesos())
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [authed])

  async function cargar() {
    setLoading(true)
    const [{ data:c }, { data:p }, { data:f }] = await Promise.all([
      supabase.from('clientes').select('*').eq('activo', true).order('nombre'),
      supabase.from('procesos').select('*').order('created_at', { ascending:false }),
      supabase.from('feedback').select('*, procesos!inner(entidad,objeto,presupuesto,fecha_oferta,url,referencia,departamento,modalidad,estado,etapa_seguimiento,drive_proceso_url)').eq('accion','interesado').eq('procesos.estado','interesado').order('created_at', { ascending:false }),
    ])
    setClientes(c||[]); setProcesos(p||[]); setFeedback(f||[]); setLoading(false)
  }

  async function cargarFeedback() {
    const { data:f } = await supabase
      .from('feedback')
      .select('*, procesos!inner(entidad,objeto,presupuesto,fecha_oferta,url,referencia,departamento,modalidad,estado,etapa_seguimiento,drive_proceso_url)')
      .eq('accion','interesado')
      .eq('procesos.estado','interesado')
      .order('created_at', { ascending:false })
    setFeedback(f||[])
  }

  async function cargarProcesos() {
    const { data:p } = await supabase.from('procesos').select('*').order('created_at', { ascending:false })
    setProcesos(p||[])
  }

  function handleEtapaUpdate(procesoId, nuevaEtapa) {
    // Actualiza el estado local en feedback
    setFeedback(prev => prev.map(f => {
      if (f.proceso_id === procesoId) {
        return { ...f, procesos: { ...f.procesos, etapa_seguimiento: nuevaEtapa } }
      }
      return f
    }))
    setProcesos(prev => prev.map(p => p.id===procesoId ? { ...p, etapa_seguimiento: nuevaEtapa } : p))
    mostrarToast(`Etapa actualizada: ${ETAPAS[nuevaEtapa]}`)
  }

  function mostrarToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  function login() {
    const adminPass = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'OC_Admin_2026!'
    if (pass === adminPass) { sessionStorage.setItem('secop_admin','true'); setAuthed(true); cargar() }
    else setLoginErr(true)
  }

  function copiarEnlace(id) {
    const url = `${window.location.origin}/cliente/${id}`
    navigator.clipboard.writeText(url).then(() => mostrarToast(`Enlace copiado`))
  }

  async function guardarDrive() {
    if (!editDrive) return
    setSavingDrive(true)
    await supabase.from('clientes').update({ drive_url: editDrive.url||null }).eq('id', editDrive.clienteId)
    setClientes(prev => prev.map(c => c.id===editDrive.clienteId ? { ...c, drive_url: editDrive.url } : c))
    setEditDrive(null)
    setSavingDrive(false)
    mostrarToast('Enlace de Drive guardado correctamente')
  }

  async function guardarDriveProceso(procesoId) {
    setSavingDriveProc(true)
    await supabase.from('procesos').update({ drive_proceso_url: driveProcUrl||null }).eq('id', procesoId)
    setFeedback(prev => prev.map(f =>
      f.proceso_id === procesoId
        ? { ...f, procesos: { ...f.procesos, drive_proceso_url: driveProcUrl } }
        : f
    ))
    setEditDriveProceso(null)
    setDriveProcUrl('')
    setSavingDriveProc(false)
    mostrarToast('Carpeta Drive del proceso guardada')
  }

  if (!authed) return (
    <div style={{ minHeight:'100vh', background:'var(--fondo)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'var(--blanco)', border:'1px solid var(--borde)', borderRadius:'var(--radio-lg)', padding:40, width:360 }}>
        <div style={{ marginBottom:28 }}>
          <div style={{ width:44, height:44, borderRadius:10, background:'var(--azul)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, marginBottom:14 }}>OC</div>
          <div style={{ fontSize:18, fontWeight:600, marginBottom:4 }}>Panel de administración</div>
          <div style={{ fontSize:13, color:'var(--suave)' }}>OC Consultores · Sistema SECOP II</div>
        </div>
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:500, color:'var(--suave)', marginBottom:6 }}>Contraseña</div>
          <input type="password" placeholder="••••••••" value={pass}
            onChange={e => { setPass(e.target.value); setLoginErr(false) }}
            onKeyDown={e => e.key==='Enter' && login()}
            style={{ width:'100%', padding:'10px 14px', border:`1px solid ${loginErr?'var(--rojo)':'var(--borde)'}`, borderRadius:'var(--radio-sm)', fontSize:14, color:'var(--texto)', outline:'none', background:'var(--blanco)' }} />
          {loginErr && <div style={{ fontSize:12, color:'var(--rojo)', marginTop:6 }}>Contraseña incorrecta</div>}
        </div>
        <button onClick={login} style={{ width:'100%', padding:11, borderRadius:'var(--radio-sm)', background:'var(--azul)', color:'#fff', border:'none', fontSize:14, fontWeight:500, cursor:'pointer' }}>Ingresar</button>
      </div>
    </div>
  )

  const listaFiltrada = (clienteSel ? procesos.filter(p => p.cliente_id===clienteSel) : procesos)
    .filter(p => !busqueda || p.objeto?.toLowerCase().includes(busqueda.toLowerCase()) || p.referencia?.toLowerCase().includes(busqueda.toLowerCase()) || p.entidad?.toLowerCase().includes(busqueda.toLowerCase()))

  const stats = {
    clientes:    clientes.length,
    total:       procesos.length,
    interesados: feedback.length,
    hoy:         procesos.filter(p => { const d=new Date(p.enviado_at||p.created_at); const h=new Date(); h.setHours(0,0,0,0); return d>=h }).length,
  }

  return (
    <Layout isAdmin>
      <div className="fadeIn">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:12, marginBottom:24 }}>
          <StatCard label="Clientes activos" value={loading?'…':stats.clientes} />
          <StatCard label="Procesos totales" value={loading?'…':stats.total} color="var(--azul-claro)" />
          <StatCard label="Marcaron interés" value={loading?'…':stats.interesados} color="var(--verde)" />
          <StatCard label="Enviados hoy" value={loading?'…':stats.hoy} color="var(--ambar)" />
        </div>

        <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1px solid var(--borde)' }}>
          {[['procesos','Todos los procesos'],['intereses','Me interesa']].map(([key,label]) => (
            <button key={key} onClick={() => setTab(key)} style={{ padding:'8px 18px', fontSize:13, fontWeight:500, background:'none', border:'none', color:tab===key?'var(--azul-mid)':'var(--suave)', borderBottom:`2px solid ${tab===key?'var(--azul-mid)':'transparent'}`, marginBottom:-1, cursor:'pointer', transition:'all 0.15s' }}>
              {label}
              {key==='intereses' && feedback.length>0 && <span style={{ marginLeft:8, background:'var(--verde-bg)', color:'var(--verde)', fontSize:11, padding:'1px 7px', borderRadius:20 }}>{feedback.length}</span>}
            </button>
          ))}
        </div>

        {tab==='procesos' && (
          <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:16, alignItems:'start' }}>
            <div style={{ background:'var(--blanco)', border:'1px solid var(--borde)', borderRadius:'var(--radio)', overflow:'hidden', position:'sticky', top:76 }}>
              <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--borde)', fontSize:11, fontWeight:500, color:'var(--suave)', textTransform:'uppercase', letterSpacing:0.5 }}>Clientes</div>
              {[{ id:null, nombre:'Todos', count:procesos.length }, ...clientes.map(c=>({ ...c, count:procesos.filter(p=>p.cliente_id===c.id).length }))].map(c => (
                <button key={c.id||'todos'} onClick={() => setClienteSel(c.id)} style={{ width:'100%', textAlign:'left', padding:'10px 14px', background:clienteSel===c.id?'var(--azul-bg)':'none', color:clienteSel===c.id?'var(--azul-mid)':'var(--texto)', borderBottom:'1px solid var(--borde)', border:'none', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13, cursor:'pointer' }}>
                  <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                    {c.id && <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--verde)', display:'inline-block' }} />}
                    {c.id ? c.nombre.split(' ').slice(0,2).join(' ') : 'Todos'}
                  </span>
                  <span style={{ fontSize:11, fontFamily:'DM Mono,monospace', color:'var(--suave)' }}>{c.count}</span>
                </button>
              ))}
              <div style={{ padding:10 }}>
                <button onClick={() => router.push('/admin/clientes')} style={{ width:'100%', padding:8, borderRadius:'var(--radio-sm)', background:'var(--azul-bg)', color:'var(--azul-mid)', border:'1px solid #bfdbfe', fontSize:12, fontWeight:500, cursor:'pointer' }}>Gestionar clientes</button>
              </div>
            </div>

            <div style={{ background:'var(--blanco)', border:'1px solid var(--borde)', borderRadius:'var(--radio)', overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--borde)', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:14, fontWeight:500 }}>{clienteSel ? clientes.find(c=>c.id===clienteSel)?.nombre : 'Todos los procesos'}</span>
                <input placeholder="Buscar objeto, referencia, entidad…" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                  style={{ padding:'7px 12px', border:'1px solid var(--borde)', borderRadius:'var(--radio-sm)', fontSize:13, width:260, color:'var(--texto)', outline:'none', background:'var(--superficie)' }} />
                <span style={{ fontSize:12, color:'var(--suave)', whiteSpace:'nowrap', fontFamily:'DM Mono,monospace' }}>{listaFiltrada.length} registros</span>
              </div>
              {loading ? (
                <div style={{ textAlign:'center', padding:48, color:'var(--suave)' }}><span className="spin">↻</span> Cargando...</div>
              ) : listaFiltrada.length===0 ? (
                <div style={{ textAlign:'center', padding:48, color:'var(--suave)', fontSize:14 }}>{procesos.length===0 ? 'Sin procesos aún.' : 'Sin resultados.'}</div>
              ) : (
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                    <thead>
                      <tr style={{ background:'var(--superficie)', borderBottom:'1px solid var(--borde)' }}>
                        {['Referencia','Entidad','Objeto','Presupuesto','Depto','Estado','Cierre','Enlace'].map(h => (
                          <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:11, fontWeight:500, color:'var(--suave)', textTransform:'uppercase', letterSpacing:0.5, whiteSpace:'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {listaFiltrada.map(p => {
                        const dias = diasRestantes(p.fecha_oferta)
                        return (
                          <tr key={p.id} style={{ borderBottom:'1px solid var(--borde)' }}>
                            <td style={{ padding:'10px 12px', fontFamily:'DM Mono,monospace', fontSize:11, color:'var(--suave)', whiteSpace:'nowrap' }}>{p.referencia?.substring(0,20)}</td>
                            <td style={{ padding:'10px 12px', fontSize:12, color:'var(--suave)', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.entidad?.substring(0,22)}</td>
                            <td style={{ padding:'10px 12px', maxWidth:220 }}><span title={p.objeto} style={{ fontSize:12 }}>{p.objeto?.substring(0,50)}{(p.objeto||'').length>50?'…':''}</span></td>
                            <td style={{ padding:'10px 12px', fontFamily:'DM Mono,monospace', fontSize:12, color:'var(--verde)', whiteSpace:'nowrap', fontWeight:500 }}>{fmt(p.presupuesto)}</td>
                            <td style={{ padding:'10px 12px', fontSize:12, whiteSpace:'nowrap' }}>{p.departamento||'—'}</td>
                            <td style={{ padding:'10px 12px' }}><EstadoBadge estado={p.estado} /></td>
                            <td style={{ padding:'10px 12px', fontSize:12, whiteSpace:'nowrap', color:dias!==null&&dias<=3?'var(--rojo)':'var(--suave)', fontWeight:dias!==null&&dias<=3?600:400 }}>{fmtFecha(p.fecha_oferta)}{dias!==null&&dias>=0?` · ${dias}d`:''}</td>
                            <td style={{ padding:'10px 12px' }}>{p.url && <a href={p.url} target="_blank" rel="noreferrer" style={{ color:'var(--azul-claro)', fontSize:12 }}>Ver ↗</a>}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {tab==='intereses' && (
          <div style={{ display:'grid', gap:12 }}>
            {feedback.length===0 ? (
              <div style={{ textAlign:'center', padding:48, color:'var(--suave)', fontSize:14, background:'var(--blanco)', border:'1px solid var(--borde)', borderRadius:'var(--radio)' }}>Ningún cliente ha marcado procesos aún.</div>
            ) : feedback.map((f, i) => {
              const p = f.procesos || {}
              const cliente = clientes.find(c => c.id===f.cliente_id)
              const etapa = typeof p.etapa_seguimiento === 'number' ? p.etapa_seguimiento : 0
              const dias = diasRestantes(p.fecha_oferta)

              return (
                <div key={i} style={{ background:'var(--blanco)', border:'1px solid var(--verde-borde)', borderLeft:'3px solid var(--verde)', borderRadius:'var(--radio)', padding:'18px 20px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16, flexWrap:'wrap', marginBottom:14 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                        <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--azul-bg)', color:'#1e40af', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, flexShrink:0 }}>{iniciales(cliente?.nombre||f.cliente_id)}</div>
                        <div>
                          <div style={{ fontSize:14, fontWeight:600 }}>{cliente?.nombre||f.cliente_id}</div>
                          <div style={{ fontSize:11, color:'var(--suave)' }}>Marcó interés · {f.created_at ? new Date(f.created_at).toLocaleDateString('es-CO',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '—'}</div>
                        </div>
                      </div>
                      <div style={{ fontSize:13, fontWeight:500, marginBottom:3 }}>{p.entidad?.substring(0,60)}</div>
                      <div style={{ fontSize:12, color:'var(--suave)', lineHeight:1.5 }}>{(p.objeto||'—').substring(0,100)}{(p.objeto||'').length>100?'…':''}</div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                      <div style={{ fontSize:18, fontWeight:600, color:'var(--verde)', fontFamily:'DM Mono,monospace' }}>{fmt(p.presupuesto)}</div>
                      <div style={{ fontSize:12, color: dias!==null&&dias<=3?'var(--rojo)':'var(--suave)' }}>Cierre: {fmtFecha(p.fecha_oferta)}{dias!==null?` · ${dias}d`:''}</div>
                      {p.url && <a href={p.url} target="_blank" rel="noreferrer" style={{ fontSize:12, color:'var(--azul-claro)' }}>Ver en SECOP ↗</a>}
                    </div>
                  </div>

                  {/* Timeline clickeable por el admin */}
                  <div style={{ background:'var(--superficie)', border:'1px solid var(--borde)', borderRadius:10, padding:'14px 16px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                      <div style={{ fontSize:12, fontWeight:500, color:'var(--texto)' }}>Seguimiento de gestión</div>
                      <div style={{ fontSize:11, color:'var(--suave)', fontFamily:'DM Mono,monospace' }}>
                        Etapa {etapa+1}/5 · {ETAPAS[etapa]}
                      </div>
                    </div>
                    <div style={{ fontSize:11, color:'#6b7280', marginBottom:8 }}>Haz clic en una etapa para actualizarla — el cliente verá el cambio de inmediato</div>
                    <TimelineAdmin
                      procesoId={f.proceso_id}
                      etapa={etapa}
                      onUpdate={handleEtapaUpdate}
                    />
                  </div>

                  {/* Drive por proceso */}
                  <div style={{ marginTop:10 }}>
                    {editDriveProceso === f.proceso_id ? (
                      <div style={{ display:'flex', gap:8, alignItems:'center', background:'#f0fdf4', border:'1px solid var(--verde-borde)', borderRadius:10, padding:'10px 14px' }}>
                        <svg width="14" height="14" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink:0 }}>
                          <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                          <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                          <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                          <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                          <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                          <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                        </svg>
                        <input
                          value={driveProcUrl}
                          onChange={e => setDriveProcUrl(e.target.value)}
                          placeholder="https://drive.google.com/drive/folders/..."
                          style={{ flex:1, padding:'7px 11px', border:'1px solid var(--verde-borde)', borderRadius:7, fontSize:13, color:'var(--texto)', outline:'none', background:'#fff' }}
                          onKeyDown={e => e.key==='Enter' && guardarDriveProceso(f.proceso_id)}
                          autoFocus
                        />
                        <button onClick={() => guardarDriveProceso(f.proceso_id)} disabled={savingDriveProc}
                          style={{ padding:'7px 16px', borderRadius:7, fontSize:12, fontWeight:600, background:'var(--verde)', color:'#fff', border:'none', cursor:'pointer', opacity:savingDriveProc?0.7:1, fontFamily:'inherit' }}>
                          {savingDriveProc ? '…' : 'Guardar'}
                        </button>
                        <button onClick={() => { setEditDriveProceso(null); setDriveProcUrl('') }}
                          style={{ padding:'7px 11px', borderRadius:7, fontSize:13, background:'none', color:'var(--suave)', border:'1px solid var(--borde)', cursor:'pointer', fontFamily:'inherit' }}>×</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditDriveProceso(f.proceso_id); setDriveProcUrl(p.drive_proceso_url||'') }}
                        style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, padding:'7px 14px', borderRadius:8, background:p.drive_proceso_url?'#f0fdf4':'var(--superficie)', color:p.drive_proceso_url?'var(--verde)':'var(--suave)', border:`1px solid ${p.drive_proceso_url?'var(--verde-borde)':'var(--borde)'}`, cursor:'pointer', fontFamily:'inherit', fontWeight:500 }}>
                        <svg width="13" height="13" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                          <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                          <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                          <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                          <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                          <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                          <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                        </svg>
                        {p.drive_proceso_url ? 'Carpeta Drive ✓' : 'Agregar carpeta Drive'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ marginTop:24, background:'var(--blanco)', border:'1px solid var(--borde)', borderRadius:'var(--radio)', overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--borde)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:14, fontWeight:500 }}>Clientes · Acceso y Drive</span>
            <span style={{ fontSize:11, color:'var(--suave)' }}>Haz clic en 📁 para editar el enlace de Drive de cada cliente</span>
          </div>
          <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:8 }}>
            {clientes.map(c => (
              <div key={c.id}>
                <div style={{ display:'flex', alignItems:'center', gap:10, background:'var(--superficie)', border:'1px solid var(--borde)', borderRadius:'var(--radio-sm)', padding:'10px 14px', flexWrap:'wrap' }}>
                  <span style={{ width:7, height:7, borderRadius:'50%', background:c.activo?'var(--verde)':'var(--claro)', display:'inline-block', flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:160 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--texto)' }}>{c.nombre.split(' ').slice(0,2).join(' ')}</div>
                    {c.ultima_visita && (
                      <div style={{ fontSize:10, color:'var(--suave)', fontFamily:'DM Mono,monospace', marginTop:2 }}>
                        Última visita: {new Date(c.ultima_visita).toLocaleDateString('es-CO',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                      </div>
                    )}
                  </div>
                  <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                    {/* Drive badge */}
                    <button onClick={() => setEditDrive({ clienteId:c.id, url:c.drive_url||'' })}
                      style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, padding:'4px 10px', borderRadius:5, background: c.drive_url?'#f0fdf4':'var(--superficie)', color:c.drive_url?'var(--verde)':'var(--suave)', border:`1px solid ${c.drive_url?'var(--verde-borde)':'var(--borde)'}`, cursor:'pointer', fontFamily:'inherit' }}>
                      📁 {c.drive_url ? 'Drive ✓' : 'Agregar Drive'}
                    </button>
                    <button onClick={() => copiarEnlace(c.id)} style={{ fontSize:11, padding:'4px 10px', borderRadius:5, background:'var(--azul-bg)', color:'var(--azul-mid)', border:'1px solid #bfdbfe', cursor:'pointer' }}>Copiar enlace</button>
                    <a href={`/cliente/${c.id}`} target="_blank" rel="noreferrer" style={{ fontSize:11, padding:'4px 10px', borderRadius:5, background:'var(--verde-bg)', color:'var(--verde)', border:'1px solid var(--verde-borde)' }}>Ver portal ↗</a>
                  </div>
                </div>
                {/* Editor Drive inline */}
                {editDrive?.clienteId === c.id && (
                  <div style={{ background:'#f0fdf4', border:'1px solid var(--verde-borde)', borderRadius:'0 0 var(--radio-sm) var(--radio-sm)', padding:'12px 14px', display:'flex', gap:8, alignItems:'center' }}>
                    <span style={{ fontSize:13 }}>📁</span>
                    <input
                      value={editDrive.url}
                      onChange={e => setEditDrive({ ...editDrive, url:e.target.value })}
                      placeholder="https://drive.google.com/drive/folders/..."
                      style={{ flex:1, padding:'8px 12px', border:'1px solid var(--verde-borde)', borderRadius:7, fontSize:13, color:'var(--texto)', outline:'none', background:'#fff' }}
                      onKeyDown={e => e.key==='Enter' && guardarDrive()}
                      autoFocus
                    />
                    <button onClick={guardarDrive} disabled={savingDrive}
                      style={{ padding:'8px 16px', borderRadius:7, fontSize:13, fontWeight:600, background:'var(--verde)', color:'#fff', border:'none', cursor:'pointer', opacity:savingDrive?0.7:1 }}>
                      {savingDrive?'…':'Guardar'}
                    </button>
                    <button onClick={() => setEditDrive(null)}
                      style={{ padding:'8px 12px', borderRadius:7, fontSize:13, background:'none', color:'var(--suave)', border:'1px solid var(--borde)', cursor:'pointer' }}>
                      ×
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, background:'#1e3a8a', color:'#fff', padding:'12px 20px', borderRadius:10, fontSize:13, fontWeight:500, zIndex:999, animation:'fadeIn 0.2s ease' }}>{toast}</div>
      )}
    </Layout>
  )
}
