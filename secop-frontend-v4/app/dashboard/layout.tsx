"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar"

const ADMIN_PASS = "admin2024oc"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [pass, setPass] = useState("")
  const [loginErr, setLoginErr] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const stored = sessionStorage.getItem("secop_admin")
    if (stored === btoa(ADMIN_PASS)) {
      setAuthed(true)
    }
    setChecking(false)
  }, [])

  function login() {
    if (pass === ADMIN_PASS) {
      sessionStorage.setItem("secop_admin", btoa(ADMIN_PASS))
      setAuthed(true)
      setLoginErr(false)
    } else {
      setLoginErr(true)
    }
  }

  if (checking) return null

  if (!authed) return (
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
      <div className="bg-[#111318] border border-[#252932] rounded-2xl p-8 w-96 text-center">
        <span className="font-display text-3xl font-black">
          <span className="text-white">sof</span>
          <span className="text-[#3b82f6]">ia</span>
        </span>
        <p className="text-[10px] text-[#525a68] mt-1">DASHBOARD · OC CONSULTORES</p>
        <input
          type="password"
          placeholder="Contraseña admin"
          value={pass}
          onChange={e => { setPass(e.target.value); setLoginErr(false) }}
          onKeyDown={e => e.key === "Enter" && login()}
          className="w-full p-3 mt-6 bg-[#1c2028] border border-[#252932] rounded text-white"
        />
        {loginErr && <p className="text-red-500 text-xs mt-2">Contraseña incorrecta</p>}
        <button
          onClick={login}
          className="w-full mt-4 p-2 bg-[#3b82f6] rounded text-white font-bold hover:bg-[#2563eb] transition"
        >
          Entrar
        </button>
        <button
          onClick={() => router.push("/login")}
          className="w-full mt-2 p-2 border border-[#252932] rounded text-[#525a68] text-sm hover:text-white transition"
        >
          ← Portal clientes
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <main
        style={{
          marginLeft: 220,
          flex: 1,
          minHeight: "100vh",
          padding: "32px 36px",
          maxWidth: "calc(100vw - 220px)",
        }}
      >
        {children}
      </main>
    </div>
  )
}
