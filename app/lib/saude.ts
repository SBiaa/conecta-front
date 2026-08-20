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
  percentualGordura: number | null
  percentualAgua: number | null
  massaMuscular: number | null
  massaOssea: number | null
  gorduraVisceral: number | null
  taxaMetabolica: number | null
}

// Os campos que a balança entrega junto com o peso. A ordem aqui é a ordem em
// que aparecem no formulário e nos cartões.
export const CAMPOS_BALANCA = [
  { campo: 'percentualGordura', label: 'Gordura', unidade: '%' },
  { campo: 'percentualAgua', label: 'Água', unidade: '%' },
  { campo: 'massaMuscular', label: 'Massa muscular', unidade: 'kg' },
  { campo: 'massaOssea', label: 'Massa óssea', unidade: 'kg' },
  { campo: 'gorduraVisceral', label: 'Gordura visceral', unidade: '' },
  { campo: 'taxaMetabolica', label: 'Taxa metabólica', unidade: 'kcal' },
] as const

export type CampoBalanca = (typeof CAMPOS_BALANCA)[number]['campo']

// Circunferências de fita métrica, tiradas na avaliação física.
export const CAMPOS_MEDIDA = [
  { campo: 'cintura', label: 'Cintura' },
  { campo: 'quadril', label: 'Quadril' },
  { campo: 'braco', label: 'Braço' },
  { campo: 'coxa', label: 'Coxa' },
  { campo: 'panturrilha', label: 'Panturrilha' },
  { campo: 'torax', label: 'Tórax' },
] as const

export type CampoMedida = (typeof CAMPOS_MEDIDA)[number]['campo']

export type Avaliacao = {
  id: number
  data: string
  cintura: number | null
  quadril: number | null
  braco: number | null
  coxa: number | null
  panturrilha: number | null
  torax: number | null
  observacao: string | null
  registradoPor: string | null
}

// Primeiro/último/variação de um número ao longo do mês.
export type Evolucao = {
  primeiro: number | null
  ultimo: number | null
  variacao: number | null
  serie: { data: string; valor: number }[]
}

// Faixas de referência da OMS. Só rotulam o número — a tela decide se mostra.
export function faixaImc(imc: number | null): string | null {
  if (imc === null) return null
  if (imc < 18.5) return 'Abaixo do peso'
  if (imc < 25) return 'Peso adequado'
  if (imc < 30) return 'Sobrepeso'
  return 'Obesidade'
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
  alturaCm: number | null
  imc: number | null
  totalRegistros: number
  peso: Evolucao
  composicao: Record<CampoBalanca, Evolucao>
  avaliacoes: Avaliacao[]
  ultimaAvaliacao: Avaliacao | null
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
    imc: number | null
    gorduraUltima: number | null
    dorMedia: number | null
    disposicaoMedia: number | null
  }
}

// O relatório que professora e coordenação leem vem com a identificação da aluna.
export type RelatorioDaAluna = Relatorio & {
  aluna: { id: string; nome: string }
}
