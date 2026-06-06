import type { Cliente, Ejecucion, Metrics, Proceso } from "@/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  return res.json() as Promise<T>
}

export const api = {
  metrics: () => apiFetch<Metrics>("/metrics"),
  clients: () => apiFetch<Cliente[]>("/clients/"),
  processes: (params?: {
    cliente_id?: string
    departamento?: string
    limit?: number
    offset?: number
  }) => {
    const qs = new URLSearchParams()
    if (params?.cliente_id) qs.set("cliente_id", params.cliente_id)
    if (params?.departamento) qs.set("departamento", params.departamento)
    if (params?.limit) qs.set("limit", String(params.limit))
    if (params?.offset) qs.set("offset", String(params.offset))
    return apiFetch<Proceso[]>(`/processes?${qs}`)
  },
  logs: (limit = 20) => apiFetch<Ejecucion[]>(`/logs?limit=${limit}`),
  run: () =>
    apiFetch<{ message: string }>("/run", { method: "POST" }),
}
