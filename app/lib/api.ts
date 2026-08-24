import { getToken, logout } from './auth'

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL!;

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Sessão expirada/token inválido: sem isso, toda tela mostrava "não foi
// possível carregar" (mensagem de erro de conexão) quando na verdade era
// só precisar entrar de novo — confuso pra quem não é técnico.
function trataSessaoExpirada(response: Response) {
  if (response.status === 401 && typeof window !== 'undefined') {
    logout()
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }
}

// A API responde os erros como { erro: "mensagem" }. Quando existir, usa essa
// mensagem — assim a tela pode mostrar o motivo real em vez de um texto genérico.
async function erroDaResposta(response: Response, padrao: string): Promise<Error> {
  trataSessaoExpirada(response)
  try {
    const corpo = await response.json()
    if (corpo?.erro) return new Error(corpo.erro)
  } catch {
    // resposta sem corpo JSON — cai no texto padrão
  }
  return new Error(padrao)
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
    throw await erroDaResposta(response, `Erro na requisição GET ${path}: ${response.status}`)
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
    throw await erroDaResposta(response, `Erro na requisição POST ${path}: ${response.status}`)
  }

  return response.json()
}

export async function apiDelete<T>(path: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers: { ...authHeaders() },
    })
  } catch {
    throw new Error(`Falha ao conectar com a API em ${path}`)
  }

  if (!response.ok) {
    throw await erroDaResposta(response, `Erro na requisição DELETE ${path}: ${response.status}`)
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
    throw await erroDaResposta(response, `Erro na requisição PATCH ${path}: ${response.status}`)
  }

  return response.json()
}
