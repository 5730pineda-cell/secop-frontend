import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabase'

function iniciales(n) { return (n||'').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase() }
const inputStyle = { flex:1, padding:'9px 12px', borderRadius:8, border:'1px solid var(--borde)', fontSize:13, color:'var(--texto)', outline:'none', background:'var(--superficie)', width:'100%' }

export default function Clientes() {
  const router = useRouter()
  const [clientes, setClientes]   = useState([])
  const [procesos, setProcesos]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [editando, setEditando]   = useState(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('secop_admin') !== 'true') { router.replace('/admin'); return }
    cargar()
  }, [])

  async function cargar() {
    setLoading(true)
    const [{ data:c }, { data:p }] = await Promise.all([
      supabase.from('clientes').select('*').order('nombre'),
      supabase.from('procesos').select('cliente_id,estado'),
    ])
    setClientes(c||[]); setProcesos(p||[]); setLoading(false)
  }

  async function toggleActivo(c) {
    await supabase.from('clientes').update({ activo:!c.activo }).eq('id',c.id)
    setClientes(prev => prev.map(x => x.id===c.id ? { ...x, activo:!x.activo } : x))
  }

  async function guardar() {
    if (!editando) return
    setGuardando(true)
    await supabase.from('clientes').update({ nombre:editando.nombre, email:editando.email, descripcion:editando.descripcion, drive_url:editando.drive_url||null }).eq('id',editando.id)
    setClientes(prev => prev.map(x => x.id===editando.id ? { ...x, ...editando } : x))
    setEditando(null); setGuardando(false)
  }

  function stats(id) {
    const ps = procesos.filter(p => p.cliente_id===id)
    return { total:ps.length, interesados:ps.filter(p=>p.estado==='interesado').length, nuevos:ps.filter(p=>p.estado==='nuevo').length }
  }

  function copiarEnlace(id) {
    const url = `${window.location.origin}/cliente/${id}`
    navigator.clipboard.writeText(url).then(() => alert(`Copiado:\n${url}`))
  }

  return (
    <Layout isAdmin>
      <div className="fadeIn">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:12 }}>
          <div>
            <h2 style={{ fontSize:20, fontWeight:600, marginBottom:4 }}>Gestión de clientes</h2>
            <p style={{ fontSize:13, color:'var(--suave)' }}>{clientes.length} clientes configurados</p>
          </div>
          <button onClick={() => router.push('/admin')} style={{ padding:'8px 18px', borderRadius:'var(--radio-sm)', fontSize:13, fontWeight:500, background:'var(--azul-bg)', color:'var(--azul-mid)', border:'1px solid #bfdbfe' }}>← Volver al panel</button>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:60, color:'var(--suave)' }}><span className="spin">↻</span> Cargando...</div>
        ) : (
          <div style={{ display:'grid', gap:12 }}>
            {clientes.map(c => {
              const st = stats(c.id)
              const isEdit = editando?.id===c.id
              return (
                <div key={c.id} style={{ background:'var(--blanco)', border:`1px solid ${c.activo?'var(--verde-borde)':'var(--borde)'}`, borderRadius:'var(--radio)', padding:20, transition:'border-color 0.2s' }}>
                  {isEdit ? (
                    <div style={{ display:'grid', gap:12 }}>
                      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                        <input value={editando.nombre} onChange={e=>setEditando({...editando,nombre:e.target.value})} placeholder="Nombre" style={inputStyle} />
                        <input value={editando.email} onChange={e=>setEditando({...editando,email:e.target.value})} placeholder="Email" style={inputStyle} />
                      </div>
                      <textarea value={editando.descripcion} onChange={e=>setEditando({...editando,descripcion:e.target.value})} placeholder="Descripción" rows={2} style={{ ...inputStyle, resize:'vertical' }} />
                      <div style={{ display:'flex', alignItems:'center', gap:8, background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'8px 12px', marginBottom:4 }}>
                        <span style={{ fontSize:12, fontWeight:600, color:'#16a34a', whiteSpace:'nowrap', flexShrink:0 }}>📁 Google Drive</span>
                        <input value={editando.drive_url||''} onChange={e=>setEditando({...editando,drive_url:e.target.value})} placeholder="https://drive.google.com/drive/folders/... (opcional)" style={{ flex:1, padding:'6px 10px', borderRadius:6, border:'1px solid #bbf7d0', fontSize:13, color:'var(--texto)', outline:'none', background:'transparent', width:'100%' }} />
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={guardar} disabled={guardando} style={{ padding:'9px 20px', borderRadius:'var(--radio-sm)', fontSize:13, fontWeight:500, background:'var(--azul)', color:'#fff', border:'none', opacity:guardando?0.7:1 }}>{guardando?'Guardando…':'Guardar cambios'}</button>
                        <button onClick={() => setEditando(null)} style={{ padding:'9px 20px', borderRadius:'var(--radio-sm)', fontSize:13, background:'none', color:'var(--suave)', border:'1px solid var(--borde)' }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16, flexWrap:'wrap' }}>
                      <div style={{ display:'flex', gap:14, alignItems:'flex-start', flex:1 }}>
                        <div style={{ width:44, height:44, borderRadius:'50%', flexShrink:0, background:'var(--azul-bg)', color:'#1e40af', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:600 }}>{iniciales(c.nombre)}</div>
                        <div>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                            <span style={{ fontSize:15, fontWeight:600 }}>{c.nombre}</span>
                            <span style={{ fontSize:10, fontFamily:'DM Mono,monospace', background:'var(--superficie)', color:'var(--suave)', padding:'2px 8px', borderRadius:4, border:'1px solid var(--borde)' }}>{c.id}</span>
                            <span style={{ width:7, height:7, borderRadius:'50%', background:c.activo?'var(--verde)':'var(--claro)', display:'inline-block' }} />
                          </div>
                          <div style={{ fontSize:12, color:'var(--suave)', marginBottom:4 }}>{c.email}</div>
                          <div style={{ fontSize:13, color:'var(--texto)', opacity:0.75 }}>{c.descripcion}</div>
                        </div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:12 }}>
                        <div style={{ display:'flex', gap:20 }}>
                          {[{label:'Total',val:st.total,color:'var(--texto)'},{label:'Interesados',val:st.interesados,color:'var(--verde)'},{label:'Nuevos',val:st.nuevos,color:'var(--azul-claro)'}].map(s => (
                            <div key={s.label} style={{ textAlign:'center' }}>
                              <div style={{ fontSize:20, fontWeight:600, color:s.color, fontFamily:'DM Mono,monospace' }}>{s.val}</div>
                              <div style={{ fontSize:10, color:'var(--suave)', textTransform:'uppercase', letterSpacing:0.5 }}>{s.label}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'flex-end' }}>
                          <button onClick={() => copiarEnlace(c.id)} style={{ padding:'7px 14px', borderRadius:'var(--radio-sm)', fontSize:12, background:'var(--azul-bg)', color:'var(--azul-mid)', border:'1px solid #bfdbfe' }}>Copiar enlace</button>
                          <a href={`/cliente/${c.id}`} target="_blank" rel="noreferrer" style={{ padding:'7px 14px', borderRadius:'var(--radio-sm)', fontSize:12, background:'var(--verde-bg)', color:'var(--verde)', border:'1px solid var(--verde-borde)' }}>Ver portal ↗</a>
                          <button onClick={() => setEditando(c)} style={{ padding:'7px 14px', borderRadius:'var(--radio-sm)', fontSize:12, background:'var(--superficie)', color:'var(--suave)', border:'1px solid var(--borde)' }}>Editar</button>
                          <button onClick={() => toggleActivo(c)} style={{ padding:'7px 14px', borderRadius:'var(--radio-sm)', fontSize:12, background:c.activo?'var(--rojo-bg)':'var(--verde-bg)', color:c.activo?'var(--rojo)':'var(--verde)', border:`1px solid ${c.activo?'var(--rojo-borde)':'var(--verde-borde)'}` }}>{c.activo?'Desactivar':'Activar'}</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
