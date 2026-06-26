import { getToken } from './auth'

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL!;

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiGet<T>(path: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { ...authHeaders() },
    })
  } catch {
    throw new Error(`Falha ao conectar com a API em ${path}`)
  }

  if (!response.ok) {
    throw new Error(`Erro na requisição GET ${path}: ${response.status}`)
  }

  return response.json()
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error(`Falha ao conectar com a API em ${path}`)
  }

  if (!response.ok) {
    throw new Error(`Erro na requisição POST ${path}: ${response.status}`)
  }

  return response.json()
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error(`Falha ao conectar com a API em ${path}`)
  }

  if (!response.ok) {
    throw new Error(`Erro na requisição PATCH ${path}: ${response.status}`)
  }

  return response.json()
}
