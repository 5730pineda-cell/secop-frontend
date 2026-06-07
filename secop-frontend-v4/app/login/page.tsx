"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Eye, EyeOff, LogIn, ArrowRight, TrendingUp, Bot, Clock, Building2 } from "lucide-react"

export default function Login() {
  const router = useRouter()
  const [usuario, setUsuario] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [recordar, setRecordar] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!usuario || !password) {
      setError("Ingresa tu usuario y contraseña.")
      return
    }
    setLoading(true)
    setError("")
    const { data, error: err } = await supabase
      .from("clientes")
      .select("id, nombre, activo")
      .eq("usuario", usuario.trim().toLowerCase())
      .eq("password_hash", password.trim())
      .single()
    setLoading(false)
    if (err || !data) {
      setError("Usuario o contraseña incorrectos.")
      return
    }
    if (!data.activo) {
      setError("Tu cuenta está inactiva. Contacta a OC Consultores.")
      return
    }
    document.cookie = `secop_token=${data.id}; path=/; max-age=${recordar ? 2592000 : 86400}`
    localStorage.setItem("secop_cliente_id", data.id)
    localStorage.setItem("secop_cliente_nombre", data.nombre)
    router.push(`/cliente/${data.id}`)
  }

  return (
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-5xl bg-[#111318] rounded-2xl shadow-2xl overflow-hidden border border-[#252932]">
        <div className="grid md:grid-cols-2">
          {/* COLUMNA IZQUIERDA - BRANDING */}
          <div className="relative bg-gradient-to-br from-[#0F1622] to-[#0B1120] p-8 md:p-10 flex flex-col justify-between">
            {/* Efectos decorativos */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#3b82f6]/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#22c55e]/5 rounded-full blur-2xl" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-[#3b82f6] to-[#22c55e] rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-[#0B132B] font-black text-xl">OC</span>
                </div>
                <div>
                  <h2 className="text-white font-bold text-xl tracking-tight">OC CONSULTORES</h2>
                  <p className="text-[10px] text-[#525a68] font-mono tracking-wider">TAX & LEGAL · COLOMBIA</p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 bg-[#1c2028] rounded-full px-3 py-1 border border-[#252932] mb-6">
                <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                <span className="text-[10px] text-[#8b919e] font-mono uppercase tracking-wider">Portal Clientes</span>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                <span className="bg-gradient-to-r from-white to-[#8b919e] bg-clip-text text-transparent">Bienvenido a</span><br />
                <span className="bg-gradient-to-r from-[#3b82f6] to-[#22c55e] bg-clip-text text-transparent">SOFIA Intelligence</span>
              </h1>
              <p className="text-[#8b919e] text-sm leading-relaxed max-w-sm mb-8">
                Accede a tu dashboard personalizado de licitaciones. SOFIA analiza cientos de procesos SECOP II y te entrega solo las oportunidades que realmente encajan contigo.
              </p>

              <div className="grid grid-cols-3 gap-3 mb-8">
                <div className="flex flex-col items-center p-3 rounded-xl bg-[#1c2028] border border-[#252932]">
                  <TrendingUp className="w-5 h-5 text-[#3b82f6] mb-1" />
                  <div className="text-xl font-bold text-white">+500</div>
                  <div className="text-[9px] text-[#525a68] uppercase tracking-wider">Procesos/día</div>
                </div>
                <div className="flex flex-col items-center p-3 rounded-xl bg-[#1c2028] border border-[#252932]">
                  <Bot className="w-5 h-5 text-[#22c55e] mb-1" />
                  <div className="text-xl font-bold text-white">IA</div>
                  <div className="text-[9px] text-[#525a68] uppercase tracking-wider">Análisis</div>
                </div>
                <div className="flex flex-col items-center p-3 rounded-xl bg-[#1c2028] border border-[#252932]">
                  <Clock className="w-5 h-5 text-[#f59e0b] mb-1" />
                  <div className="text-xl font-bold text-white">24/7</div>
                  <div className="text-[9px] text-[#525a68] uppercase tracking-wider">Monitoreo</div>
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-4 border-t border-[#252932]">
              <p className="text-[10px] text-[#525a68] font-mono">OC Consultores Tax & Legal S.A.S</p>
              <div className="flex gap-4 mt-2 text-[10px]">
                <a href="mailto:info@tusconsultoresoc.com" className="text-[#3b82f6] hover:text-[#60a5fa] transition">info@tusconsultoresoc.com</a>
                <span className="text-[#252932]">·</span>
                <a href="https://wa.me/573134419872" className="text-[#22c55e] hover:text-[#4ade80] transition">WhatsApp</a>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA - FORMULARIO DARK */}
          <div className="bg-[#0F1622] p-8 md:p-10 flex flex-col justify-center">
            <div className="max-w-sm mx-auto w-full">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#22c55e] shadow-lg mb-4">
                  <LogIn className="w-6 h-6 text-[#0B132B]" />
                </div>
                <h2 className="text-2xl font-bold text-white">Iniciar sesión</h2>
                <p className="text-[#8b919e] text-sm mt-1">Accede a tu portal de licitaciones</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#525a68] uppercase tracking-wider mb-1.5">Usuario</label>
                  <input
                    type="text"
                    placeholder="Tu usuario asignado"
                    value={usuario}
                    onChange={(e) => { setUsuario(e.target.value); setError("") }}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#1c2028] border border-[#252932] text-white placeholder:text-[#525a68] focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#525a68] uppercase tracking-wider mb-1.5">Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError("") }}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#1c2028] border border-[#252932] text-white placeholder:text-[#525a68] focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#525a68] hover:text-[#8b919e] transition"
                    >
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recordar}
                      onChange={(e) => setRecordar(e.target.checked)}
                      className="w-4 h-4 rounded border-[#252932] bg-[#1c2028] text-[#3b82f6] focus:ring-[#3b82f6] focus:ring-offset-0"
                    />
                    <span className="text-xs text-[#8b919e]">Recordarme por 30 días</span>
                  </label>
                  <a
                    href="https://wa.me/573134419872?text=Olvidé%20mi%20contraseña%20del%20portal%20SOFIA"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#3b82f6] hover:text-[#60a5fa] transition"
                  >
                    ¿Olvidó su contraseña?
                  </a>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400 flex items-center gap-2">
                    <span>⚠️</span> {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:from-[#2563eb] hover:to-[#1d4ed8] text-white font-semibold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? (
                    <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Verificando...</span>
                  ) : (
                    <>Iniciar sesión <ArrowRight size={16} /></>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-[11px] text-[#525a68]">
                  ¿Sin acceso o problemas para ingresar?<br />
                  <a href="mailto:info@tusconsultoresoc.com" className="text-[#3b82f6] hover:text-[#60a5fa] font-medium">info@tusconsultoresoc.com</a>
                  {" · "}
                  <a href="https://wa.me/573134419872" className="text-[#22c55e] hover:text-[#4ade80] font-medium">WhatsApp</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
