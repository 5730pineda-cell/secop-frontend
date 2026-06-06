"use client"
import { useRouter, useSearchParams } from "next/navigation"
import type { Cliente } from "@/types"

export default function ProcessesFilters({ clients }: { clients: Cliente[] }) {
  const router = useRouter()
  const sp = useSearchParams()

  function update(key: string, val: string) {
    const params = new URLSearchParams(sp.toString())
    if (val) params.set(key, val)
    else params.delete(key)
    router.push(`/dashboard/processes?${params.toString()}`)
  }

  const selectStyle = {
    padding: "7px 12px",
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 5,
    color: "var(--text-primary)",
    fontSize: 12,
    cursor: "pointer",
  }

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <select
        value={sp.get("cliente_id") ?? ""}
        onChange={(e) => update("cliente_id", e.target.value)}
        style={selectStyle}
      >
        <option value="">Todos los clientes</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </select>

      <input
        placeholder="Filtrar por departamento..."
        value={sp.get("departamento") ?? ""}
        onChange={(e) => update("departamento", e.target.value)}
        style={{
          ...selectStyle,
          minWidth: 200,
        }}
      />

      {(sp.get("cliente_id") || sp.get("departamento")) && (
        <button
          onClick={() => router.push("/dashboard/processes")}
          style={{
            ...selectStyle,
            color: "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
