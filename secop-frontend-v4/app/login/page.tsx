"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Eye, EyeOff, LogIn, ArrowRight, CheckCircle, Building2, TrendingUp, Bot, Clock } from "lucide-react"

export default function Login() {
  const router = useRouter()
  const [usuario, setUsuario] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [recordar, setRecordar] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-5xl bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/10">
        <div className="grid md:grid-cols-2">
          {/* LADO IZQUIERDO - BRANDING Y VALORES */}
          <div className="relative bg-gradient-to-br from-indigo-900/40 via-slate-900/60 to-slate-900 p-8 md:p-10 flex flex-col justify-between">
            {/* Elementos decorativos */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-black text-xl">OC</span>
                </div>
                <div>
                  <h2 className="text-white font-bold text-xl tracking-tight">OC CONSULTORES</h2>
                  <p className="text-[10px] text-slate-400 font-mono tracking-wider">TAX & LEGAL · COLOMBIA</p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 bg-white/5 rounded-full px-3 py-1 border border-white/10 mb-6">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-slate-300 font-mono uppercase tracking-wider">Portal Clientes</span>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Bienvenido a</span><br />
                <span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">SOFIA Intelligence</span>
              </h1>
              <p className="text-slate-300 text-sm leading-relaxed max-w-sm mb-8">
                Accede a tu dashboard personalizado de licitaciones. SOFIA analiza cientos de procesos SECOP II y te entrega solo las oportunidades que realmente encajan contigo.
              </p>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="flex flex-col items-center p-3 rounded-xl bg-white/5 border border-white/5">
                  <TrendingUp className="w-5 h-5 text-indigo-400 mb-1" />
                  <div className="text-xl font-bold text-white">+500</div>
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider">Procesos/día</div>
                </div>
                <div className="flex flex-col items-center p-3 rounded-xl bg-white/5 border border-white/5">
                  <Bot className="w-5 h-5 text-emerald-400 mb-1" />
                  <div className="text-xl font-bold text-white">IA</div>
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider">Análisis</div>
                </div>
                <div className="flex flex-col items-center p-3 rounded-xl bg-white/5 border border-white/5">
                  <Clock className="w-5 h-5 text-amber-400 mb-1" />
                  <div className="text-xl font-bold text-white">24/7</div>
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider">Monitoreo</div>
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-4 border-t border-white/10">
              <p className="text-[10px] text-slate-500 font-mono">OC Consultores Tax & Legal S.A.S</p>
              <div className="flex gap-4 mt-2 text-[10px]">
                <a href="mailto:info@tusconsultoresoc.com" className="text-indigo-300 hover:text-indigo-200 transition">info@tusconsultoresoc.com</a>
                <span className="text-slate-600">·</span>
                <a href="https://wa.me/573134419872" className="text-emerald-300 hover:text-emerald-200 transition">WhatsApp</a>
              </div>
            </div>
          </div>

          {/* LADO DERECHO - FORMULARIO DE LOGIN */}
          <div className="bg-white dark:bg-slate-900 p-8 md:p-10 flex flex-col justify-center">
            <div className="max-w-sm mx-auto w-full">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 shadow-lg mb-4">
                  <LogIn className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Iniciar sesión</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Accede a tu portal de licitaciones</p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Usuario</label>
                  <input
                    type="text"
                    placeholder="Tu usuario asignado"
                    value={usuario}
                    onChange={(e) => { setUsuario(e.target.value); setError("") }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError("") }}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
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
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-400">Recordarme por 30 días</span>
                  </label>
                  <a
                    href="https://wa.me/573134419872?text=Olvidé%20mi%20contraseña%20del%20portal%20SOFIA"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 transition"
                  >
                    ¿Olvidó su contraseña?
                  </a>
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                    <span>⚠️</span> {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? (
                    "Verificando..."
                  ) : (
                    <>
                      Iniciar sesión <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ¿Sin acceso o problemas para ingresar?<br />
                  <a href="mailto:info@tusconsultoresoc.com" className="text-indigo-600 dark:text-indigo-400 font-medium">info@tusconsultoresoc.com</a>
                  {" · "}
                  <a href="https://wa.me/573134419872" className="text-emerald-600 dark:text-emerald-400 font-medium">WhatsApp</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
