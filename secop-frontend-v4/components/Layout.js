import Link from 'next/link'
export default function Layout({ children, isAdmin }) {
  return (
    <div style={{ minHeight:'100vh', background:'var(--fondo)' }}>
      <nav style={{ background:'var(--azul)', height:58, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 28px', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff' }}>OC</div>
          <div>
            <div style={{ color:'#fff', fontSize:14, fontWeight:500, lineHeight:1 }}>OC Consultores · SOFIA</div>
            <div style={{ color:'#93c5fd', fontSize:11, marginTop:2 }}>Sistema de monitoreo automático</div>
          </div>
        </div>
        {isAdmin && (
          <div style={{ display:'flex', gap:6 }}>
            <Link href="/admin" style={{ padding:'6px 14px', borderRadius:7, fontSize:13, color:'#bfdbfe', border:'0.5px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.08)' }}>Panel</Link>
            <Link href="/admin/clientes" style={{ padding:'6px 14px', borderRadius:7, fontSize:13, color:'#bfdbfe', border:'0.5px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.08)' }}>Clientes</Link>
          </div>
        )}
      </nav>
      <main style={{ maxWidth:1100, margin:'0 auto', padding:'28px 24px 80px' }}>{children}</main>
      <footer style={{ borderTop:'1px solid var(--borde)', padding:'14px 28px', background:'var(--blanco)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--claro)', fontFamily:'DM Mono,monospace' }}>
          <span>OC Consultores · info@tusconsultoresoc.com</span>
          <span>SOFIA · v3.0</span>
        </div>
      </footer>
    </div>
  )
}
