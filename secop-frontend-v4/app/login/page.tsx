"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Eye, EyeOff, LogIn, ArrowRight, TrendingUp, Bot, Clock } from "lucide-react"

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

    // ── Acceso admin (no requiere usuario) ───────────────────
    if (password.trim() === "admin2024oc") {
      document.cookie = `secop_rol=admin; path=/; max-age=86400`
      router.push("/dashboard")
      return
    }
    // ─────────────────────────────────────────────────────────

    // Para clientes sí se requieren ambos campos
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
      <div className="w-full max-w-5xl bg-[#111318] rounded-2xl shadow-2xl overflow-hidden border border-[#252932] transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]">
        <div className="grid md:grid-cols-2">
          {/* COLUMNA IZQUIERDA */}
          <div className="relative bg-gradient-to-br from-[#0F1622] via-[#0B1120] to-[#0a0c10] p-8 md:p-10 flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#3b82f6]/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-[#22c55e]/5 rounded-full blur-2xl animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#3b82f6]/[0.02] rounded-full blur-3xl" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-[#3b82f6] to-[#22c55e] rounded-xl flex items-center justify-center shadow-lg shadow-[#3b82f6]/20">
                  <span className="text-[#0B132B] font-black text-xl">OC</span>
                </div>
                <div>
                  <h2 className="text-white font-bold text-xl tracking-tight">OC CONSULTORES</h2>
                  <p className="text-[10px] text-[#525a68] font-mono tracking-wider">TAX & LEGAL · COLOMBIA</p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 bg-[#1c2028]/80 rounded-full px-3 py-1 border border-[#252932] mb-8 backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse shadow-lg shadow-[#22c55e]/50" />
                <span className="text-[10px] text-[#8b919e] font-mono uppercase tracking-wider">Portal Clientes · Activo</span>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight leading-tight">
                <span className="bg-gradient-to-r from-white via-[#e2e8f0] to-[#94a3b8] bg-clip-text text-transparent">
                  Accede a
                </span>
                <br />
                <span className="bg-gradient-to-r from-[#3b82f6] via-[#22c55e] to-[#00E676] bg-clip-text text-transparent">
                  SOFIA
                </span>
              </h1>
              <p className="text-[#8b919e] text-sm leading-relaxed max-w-sm mb-8">
                El portal inteligente de licitaciones que filtra, analiza y te alerta sobre las mejores oportunidades en SECOP II. Desarrollado por OC Consultores.
              </p>

              <div className="grid grid-cols-3 gap-3 mb-8">
                <div className="group flex flex-col items-center p-3 rounded-xl bg-[#1c2028] border border-[#252932] hover:border-[#3b82f6]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#3b82f6]/10">
                  <TrendingUp className="w-5 h-5 text-[#3b82f6] mb-1 group-hover:scale-110 transition-transform" />
                  <div className="text-xl font-bold text-white">+500</div>
                  <div className="text-[9px] text-[#525a68] uppercase tracking-wider">Procesos/día</div>
                </div>
                <div className="group flex flex-col items-center p-3 rounded-xl bg-[#1c2028] border border-[#252932] hover:border-[#22c55e]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#22c55e]/10">
                  <Bot className="w-5 h-5 text-[#22c55e] mb-1 group-hover:scale-110 transition-transform" />
                  <div className="text-xl font-bold text-white">IA</div>
                  <div className="text-[9px] text-[#525a68] uppercase tracking-wider">Análisis</div>
                </div>
                <div className="group flex flex-col items-center p-3 rounded-xl bg-[#1c2028] border border-[#252932] hover:border-[#f59e0b]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#f59e0b]/10">
                  <Clock className="w-5 h-5 text-[#f59e0b] mb-1 group-hover:scale-110 transition-transform" />
                  <div className="text-xl font-bold text-white">24/7</div>
                  <div className="text-[9px] text-[#525a68] uppercase tracking-wider">Monitoreo</div>
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-4 border-t border-[#252932] mt-4">
              <p className="text-[10px] text-[#525a68] font-mono">OC Consultores Tax & Legal S.A.S</p>
              <div className="flex gap-4 mt-2 text-[10px]">
                <a href="mailto:info@tusconsultoresoc.com" className="text-[#3b82f6] hover:text-[#60a5fa] transition flex items-center gap-1">
                  <span>✉️</span> info@tusconsultoresoc.com
                </a>
                <span className="text-[#252932]">|</span>
                <a href="https://wa.me/573134419872" className="text-[#22c55e] hover:text-[#4ade80] transition flex items-center gap-1">
                  <span>📱</span> WhatsApp
                </a>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA */}
          <div className="bg-[#0F1622] p-8 md:p-10 flex flex-col justify-center backdrop-blur-sm">
            <div className="max-w-sm mx-auto w-full">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#22c55e] shadow-lg shadow-[#3b82f6]/20 mb-4 group">
                  <LogIn className="w-6 h-6 text-[#0B132B] group-hover:scale-110 transition-transform" />
                </div>
                <h2 className="text-2xl font-bold text-white">Bienvenido de vuelta</h2>
                <p className="text-[#8b919e] text-sm mt-1">Ingresa tus credenciales para continuar</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#525a68] uppercase tracking-wider mb-1.5 flex items-center gap-2">
                    <span>📇</span> Usuario
                  </label>
                  <input
                    type="text"
                    placeholder="Tu usuario asignado"
                    value={usuario}
                    onChange={(e) => { setUsuario(e.target.value); setError("") }}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#1c2028] border border-[#252932] text-white placeholder:text-[#525a68] focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#525a68] uppercase tracking-wider mb-1.5 flex items-center gap-2">
                    <span>🔒</span> Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError("") }}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#1c2028] border border-[#252932] text-white placeholder:text-[#525a68] focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition pr-10 shadow-sm"
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
                    <span className="text-xs text-[#8b919e] hover:text-white transition">Recordarme por 30 días</span>
                  </label>
                  <a
                    href="https://wa.me/573134419872?text=Olvidé%20mi%20contraseña%20del%20portal%20SOFIA"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#3b82f6] hover:text-[#60a5fa] transition flex items-center gap-1"
                  >
                    <span>❓</span> ¿Olvidó su contraseña?
                  </a>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400 flex items-center gap-2 animate-shake">
                    <span>⚠️</span> {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:from-[#2563eb] hover:to-[#1d4ed8] text-white font-semibold shadow-lg shadow-[#3b82f6]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 group"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Verificando...
                    </span>
                  ) : (
                    <>
                      Iniciar sesión
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-[11px] text-[#525a68]">
                  ¿Sin acceso o problemas para ingresar?
                  <br />
                  <a href="mailto:info@tusconsultoresoc.com" className="text-[#3b82f6] hover:text-[#60a5fa] font-medium inline-flex items-center gap-1">
                    <span>✉️</span> info@tusconsultoresoc.com
                  </a>
                  {" · "}
                  <a href="https://wa.me/573134419872" className="text-[#22c55e] hover:text-[#4ade80] font-medium inline-flex items-center gap-1">
                    <span>📱</span> WhatsApp
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  )
}
