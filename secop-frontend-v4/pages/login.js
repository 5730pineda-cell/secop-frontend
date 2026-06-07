import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function Login() {
  const router = useRouter()
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [recordar, setRecordar] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!usuario || !password) { setError('Ingresa tu usuario y contraseña.'); return }
    setLoading(true); setError('')
    const { data, error: err } = await supabase
      .from('clientes').select('id, nombre, activo')
      .eq('usuario', usuario.trim().toLowerCase())
      .eq('password_hash', password.trim())
      .single()
    setLoading(false)
    if (err || !data) { setError('Usuario o contraseña incorrectos.'); return }
    if (!data.activo) { setError('Tu cuenta está inactiva. Contacta a OC Consultores.'); return }
    document.cookie = `secop_token=${data.id}; path=/; max-age=${recordar?2592000:86400}`
    localStorage.setItem('secop_cliente_id', data.id)
    localStorage.setItem('secop_cliente_nombre', data.nombre)
    router.push(`/cliente/${data.id}`)
  }

  return (
    <div style={{ minHeight:'100vh', display:'grid', gridTemplateColumns:'1fr 1fr', fontFamily:"'DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes floatOrb{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-16px) scale(1.04)}}
        .form-anim{animation:fadeUp 0.45s ease both;}
        input::placeholder{color:#cbd5e1;}
        input:focus{outline:none;border-color:#1e3a8a!important;box-shadow:0 0 0 3px rgba(30,58,138,0.08);}
        a{text-decoration:none;}
        button{font-family:inherit;cursor:pointer;}
        .btn:hover{opacity:0.88!important;}
        @media(max-width:768px){body .grid-wrap{grid-template-columns:1fr!important;}.left-panel{display:none!important;}}
      `}</style>

      {/* ── IZQUIERDA ── */}
      <div className="left-panel" style={{
        background:'linear-gradient(150deg, #08122a 0%, #0d1c3a 50%, #091528 100%)',
        display:'flex', flexDirection:'column', justifyContent:'space-between',
        padding:'52px 56px', position:'relative', overflow:'hidden',
      }}>
        {/* Grid sutil */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(59,130,246,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.035) 1px,transparent 1px)', backgroundSize:'44px 44px', pointerEvents:'none' }} />
        {/* Orbes */}
        <div style={{ position:'absolute', top:'15%', right:'-8%', width:340, height:340, borderRadius:'50%', background:'radial-gradient(circle,rgba(37,99,235,0.13) 0%,transparent 68%)', animation:'floatOrb 10s ease-in-out infinite', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'-8%', left:'-4%', width:260, height:260, borderRadius:'50%', background:'radial-gradient(circle,rgba(99,102,241,0.07) 0%,transparent 68%)', animation:'floatOrb 13s ease-in-out infinite reverse', pointerEvents:'none' }} />

        {/* Logo OC Consultores — integrado con el entorno */}
        <div style={{ position:'relative', display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:46, height:46, borderRadius:12, background:'linear-gradient(135deg,#1a3460 0%,#1e4d8c 100%)', border:'1px solid rgba(59,130,246,0.25)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(0,0,0,0.3)', flexShrink:0 }}>
            <span style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:800, color:'#fff', letterSpacing:-0.5 }}>OC</span>
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:'rgba(255,255,255,0.88)', fontFamily:'Syne,sans-serif', letterSpacing:-0.3, lineHeight:1 }}>OC Consultores</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', letterSpacing:1.8, textTransform:'uppercase', fontFamily:'DM Mono,monospace', marginTop:3 }}>Tax &amp; Legal · Colombia</div>
          </div>
        </div>

        {/* Chip top */}
        <div style={{ position:'relative', display:'inline-flex', alignItems:'center', gap:7, background:'rgba(37,99,235,0.1)', border:'1px solid rgba(37,99,235,0.18)', borderRadius:20, padding:'5px 14px', width:'fit-content' }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#3b82f6', boxShadow:'0 0 6px #3b82f6' }} />
          <span style={{ fontSize:10, color:'#60a5fa', fontFamily:'DM Mono,monospace', letterSpacing:1.5, textTransform:'uppercase' }}>Portal Clientes</span>
        </div>

        {/* SOFIA central */}
        <div style={{ position:'relative' }}>
          {/* Sombra tipográfica de fondo */}
          <div style={{ position:'absolute', top:-20, left:-6, fontFamily:'Syne,sans-serif', fontSize:110, fontWeight:800, color:'rgba(255,255,255,0.025)', letterSpacing:-6, lineHeight:1, pointerEvents:'none', userSelect:'none' }}>sofia</div>

          <div style={{ marginBottom:20 }}>
            <span style={{ fontFamily:'Syne,sans-serif', fontSize:100, fontWeight:800, letterSpacing:-5, lineHeight:0.88, display:'block' }}>
              <span style={{ color:'rgba(255,255,255,0.82)' }}>sof</span><span style={{ color:'#3b82f6' }}>ia</span>
            </span>
            <div style={{ width:52, height:3, borderRadius:2, background:'linear-gradient(90deg,#1d4ed8,#60a5fa)', marginTop:14 }} />
          </div>

          <p style={{ fontSize:15, color:'rgba(255,255,255,0.38)', lineHeight:1.8, maxWidth:340, fontWeight:300, marginBottom:32 }}>
            <span style={{ color:'rgba(255,255,255,0.65)', fontWeight:500 }}>Optimiza, encuentra y gestiona</span>{' '}
            la oportunidad perfecta para tu empresa;{' '}
            <span style={{ color:'rgba(255,255,255,0.45)' }}>nuestro equipo te respaldará en el proceso para asegurar una participación exitosa.</span>
          </p>

          {/* Stats */}
          <div style={{ display:'flex', gap:0 }}>
            {[
              { val:'+500', lbl:'Procesos/día' },
              { val:'IA', lbl:'Análisis' },
              { val:'24/7', lbl:'Monitoreo' },
            ].map((s,i) => (
              <div key={i} style={{ flex:1, paddingRight:24, borderRight: i<2?'1px solid rgba(255,255,255,0.06)':undefined, paddingLeft: i>0?24:0 }}>
                <div style={{ fontSize:24, fontWeight:800, color:'#fff', fontFamily:'Syne,sans-serif', letterSpacing:-0.5 }}>{s.val}</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.22)', letterSpacing:1.2, textTransform:'uppercase', fontFamily:'DM Mono,monospace', marginTop:3 }}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer izquierdo — solo contacto, sin "OC" logo redundante */}
        <div style={{ position:'relative' }}>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.2)', marginBottom:5, fontFamily:'DM Mono,monospace', letterSpacing:0.5 }}>OC Consultores Tax &amp; Legal S.A.S</div>
          <div style={{ display:'flex', gap:14, fontSize:11 }}>
            <a href="mailto:info@tusconsultoresoc.com" style={{ color:'rgba(59,130,246,0.6)' }}>info@tusconsultoresoc.com</a>
            <span style={{ color:'rgba(255,255,255,0.08)' }}>·</span>
            <a href="https://wa.me/573134419872" style={{ color:'rgba(22,163,74,0.6)' }}>WhatsApp</a>
          </div>
        </div>
      </div>

      {/* ── DERECHA ── */}
      <div style={{ background:'#f8faff', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', padding:'52px 56px', position:'relative' }}>
        <div style={{ position:'absolute', top:0, right:0, width:220, height:220, background:'radial-gradient(circle at top right,rgba(59,130,246,0.05),transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:0, left:0, width:180, height:180, background:'radial-gradient(circle at bottom left,rgba(99,102,241,0.04),transparent 70%)', pointerEvents:'none' }} />

        <div className="form-anim" style={{ width:'100%', maxWidth:420, position:'relative' }}>

          <div style={{ marginBottom:36 }}>
            <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:28, fontWeight:800, letterSpacing:-0.8, color:'#0f172a', marginBottom:6 }}>Iniciar sesión</h1>
            <p style={{ fontSize:14, color:'#94a3b8', fontWeight:300 }}>Accede a tu portal de licitaciones</p>
          </div>

          <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, padding:'28px 26px', boxShadow:'0 4px 24px rgba(0,0,0,0.05)' }}>

            {/* Usuario */}
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#475569', letterSpacing:0.8, textTransform:'uppercase', marginBottom:7 }}>Usuario</label>
              <div style={{ position:'relative' }}>
                <svg style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'#cbd5e1' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <input type="text" placeholder="Tu usuario asignado" value={usuario}
                  onChange={e=>{setUsuario(e.target.value);setError('')}}
                  onKeyDown={e=>e.key==='Enter'&&handleLogin()}
                  style={{ width:'100%', padding:'12px 14px 12px 38px', border:`1.5px solid ${error?'#fca5a5':'#e2e8f0'}`, borderRadius:10, fontSize:14, color:'#0f172a', background:'#fafbff', transition:'all 0.15s' }} />
              </div>
            </div>

            {/* Contraseña */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#475569', letterSpacing:0.8, textTransform:'uppercase', marginBottom:7 }}>Contraseña</label>
              <div style={{ position:'relative' }}>
                <svg style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'#cbd5e1' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                <input type={showPass?'text':'password'} placeholder="••••••••" value={password}
                  onChange={e=>{setPassword(e.target.value);setError('')}}
                  onKeyDown={e=>e.key==='Enter'&&handleLogin()}
                  style={{ width:'100%', padding:'12px 38px 12px 38px', border:`1.5px solid ${error?'#fca5a5':'#e2e8f0'}`, borderRadius:10, fontSize:14, color:'#0f172a', background:'#fafbff', transition:'all 0.15s' }} />
                <button onClick={()=>setShowPass(!showPass)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', padding:0, color:'#cbd5e1' }}>
                  {showPass
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {/* Recordarme */}
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
              <input type="checkbox" id="rec" checked={recordar} onChange={e=>setRecordar(e.target.checked)} style={{ accentColor:'#1e3a8a', width:14, height:14, cursor:'pointer' }} />
              <label htmlFor="rec" style={{ fontSize:13, color:'#94a3b8', cursor:'pointer' }}>Recordarme por 30 días</label>
            </div>

            {error && (
              <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:9, padding:'10px 14px', fontSize:13, color:'#dc2626', marginBottom:18, display:'flex', alignItems:'center', gap:8 }}>
                ⚠ {error}
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:10 }}>
              <a href="https://wa.me/573134419872?text=Olvidé%20mi%20contraseña%20del%20portal%20SOFIA"
                style={{ padding:'13px 8px', borderRadius:10, background:'#f8fafc', color:'#64748b', border:'1.5px solid #e2e8f0', fontSize:12, fontWeight:500, textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1.3 }}>
                ¿Olvidó su<br/>contraseña?
              </a>
              <button className="btn" onClick={handleLogin} disabled={loading}
                style={{ padding:'13px', borderRadius:10, background:loading?'#3b82f6':'#1e3a8a', color:'#fff', border:'none', fontSize:14, fontWeight:700, transition:'all 0.15s', boxShadow:'0 4px 14px rgba(30,58,138,0.22)' }}>
                {loading?'Verificando...':'Iniciar sesión →'}
              </button>
            </div>
          </div>

          {/* Ayuda */}
          <div style={{ marginTop:16, padding:'14px 16px', background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, textAlign:'center' }}>
            <p style={{ fontSize:12, color:'#94a3b8', lineHeight:1.7 }}>
              ¿Sin acceso o problemas para ingresar?<br/>
              <a href="mailto:info@tusconsultoresoc.com" style={{ color:'#2563eb', fontWeight:600 }}>info@tusconsultoresoc.com</a>
              {' · '}
              <a href="https://wa.me/573134419872" style={{ color:'#16a34a', fontWeight:600 }}>WhatsApp</a>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
