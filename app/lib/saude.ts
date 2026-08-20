export const LOCAIS_DOR = [
  'JOELHO',
  'LOMBAR',
  'CERVICAL',
  'OMBRO',
  'QUADRIL',
  'TORNOZELO',
  'PUNHO',
  'OUTRO',
] as const

export type LocalDor = (typeof LOCAIS_DOR)[number]

export const LABELS_LOCAL_DOR: Record<LocalDor, string> = {
  JOELHO: 'Joelho',
  LOMBAR: 'Lombar',
  CERVICAL: 'Pescoço',
  OMBRO: 'Ombro',
  QUADRIL: 'Quadril',
  TORNOZELO: 'Tornozelo',
  PUNHO: 'Punho',
  OUTRO: 'Outro',
}

export const ROTULOS_DISPOSICAO = ['', 'Muito mal', 'Mal', 'Ok', 'Bem', 'Muito bem']
export const ROTULOS_DOR = ['Sem dor', 'Bem leve', 'Leve', 'Moderada', 'Forte', 'Muito forte']

export type SituacaoFrequencia = 'OTIMA' | 'BOA' | 'ATENCAO' | 'BAIXA' | null

export function rotuloSituacao(situacao: SituacaoFrequencia): string {
  if (situacao === 'OTIMA') return 'Ótima'
  if (situacao === 'BOA') return 'Boa'
  if (situacao === 'ATENCAO') return 'Dá pra melhorar'
  if (situacao === 'BAIXA') return 'Baixa'
  return 'Sem dados'
}

export type RegistroSaude = {
  id: number
  data: string
  peso: number | null
  nivelDor: number | null
  locaisDor: LocalDor[]
  disposicao: number | null
  observacao: string | null
}

export type FrequenciaTurma = {
  turmaId: number
  nome: string
  projeto: string
  totalAulas: number
  presencas: number
  faltas: number
  percentual: number | null
  registros: { data: string; presente: boolean }[]
}

export type Relatorio = {
  mes: string
  frequencia: {
    totalAulas: number
    presencas: number
    faltas: number
    percentual: number | null
    situacao: SituacaoFrequencia
    porTurma: FrequenciaTurma[]
  }
  totalRegistros: number
  peso: {
    primeiro: number | null
    ultimo: number | null
    variacao: number | null
    serie: { data: string; peso: number }[]
  }
  dor: {
    media: number | null
    maior: number | null
    locaisMaisFrequentes: { local: LocalDor; vezes: number }[]
    serie: { data: string; nivelDor: number; locaisDor: LocalDor[] }[]
  }
  disposicao: {
    media: number | null
    serie: { data: string; disposicao: number }[]
  }
  registros: RegistroSaude[]
  comparativo: {
    mes: string
    frequenciaPercentual: number | null
    pesoUltimo: number | null
    dorMedia: number | null
    disposicaoMedia: number | null
  }
}

// O relatório que professora e coordenação leem vem com a identificação da aluna.
export type RelatorioDaAluna = Relatorio & {
  aluna: { id: string; nome: string }
}
