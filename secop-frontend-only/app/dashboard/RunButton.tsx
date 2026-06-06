"use client"
import { useState } from "react"
import { Play, Loader2 } from "lucide-react"
import { api } from "@/lib/api"

export default function RunButton() {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function handleRun() {
    setLoading(true)
    setMsg(null)
    try {
      const res = await api.run()
      setMsg(res.message)
    } catch (e: unknown) {
      const err = e as Error
      setMsg(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ textAlign: "right" }}>
      <button
        onClick={handleRun}
        disabled={loading}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 18px",
          background: loading ? "var(--border-bright)" : "var(--accent)",
          color: "white",
          border: "none",
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
          transition: "background 0.15s",
        }}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
        {loading ? "Ejecutando..." : "Ejecutar ahora"}
      </button>
      {msg && (
        <p style={{ fontSize: 11, marginTop: 6, color: "var(--text-muted)" }}>{msg}</p>
      )}
    </div>
  )
}
