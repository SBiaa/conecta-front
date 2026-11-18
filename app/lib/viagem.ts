export type Pessoa = { id: string; nome: string; fotoUrl: string | null }

export type ViagemResumo = {
  id: number
  nome: string
  destino: string | null
  dataSaida: string | null
  dataRetorno: string | null
  localSaida: string | null
  descricao: string | null
  premio: string | null
  ativa: boolean
  _count?: { participantes: number; midias: number }
}

export type EventoViagem = {
  id: number
  inicio: string
  titulo: string
  local: string | null
  observacao: string | null
}

export type AvisoViagem = {
  id: number
  titulo: string
  texto: string
  importante: boolean
  criadoEm: string
  autor: { id: string; nome: string }
}

export type ItemChecklist = { id: number; texto: string; ordem: number; marcado: boolean }

export type ViagemDetalhe = ViagemResumo & {
  eventos: EventoViagem[]
  avisos: AvisoViagem[]
  checklist: ItemChecklist[]
  participantes: (Pessoa & { papel: string })[]
}

export type MidiaViagem = {
  id: number
  tipo: 'FOTO' | 'VIDEO'
  url: string
  legenda: string | null
  criadoEm: string
  autor: Pessoa
  nota?: number | null
  podeApagar: boolean
}

export type LinhaRanking = {
  usuario: Pessoa
  pontos: number
  envios: number
  avaliados: number
  tresEstrelas: number
  posicao: number
}

// Datas e horários da viagem são momentos reais (com hora), então aqui a
// leitura é no fuso do navegador — diferente de formatarData, que trata datas
// "sem hora" salvas como meia-noite UTC.
export function formatarDiaSemana(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })
}

export function formatarHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function formatarDiaCurto(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

// "2026-12-05T06:00" pro <input type="datetime-local">, no fuso do navegador.
export function paraInputDataHora(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const doisDigitos = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}T${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`
}

// O valor do datetime-local vem sem fuso; new Date() lê como hora local e o
// toISOString manda pra API já em UTC.
export function deInputDataHora(valor: string) {
  return valor ? new Date(valor).toISOString() : null
}
