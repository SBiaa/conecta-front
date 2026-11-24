// Resumo de frequência que a coordenação vê na tela do projeto e na
// visão geral de Frequência (GET /turmas/frequencia-resumo).

export type FrequenciaTurmaResumo = {
  turmaId: number
  percentualPresenca: number
  chamadaHoje: boolean
  presentesHoje: number
  registradasHoje: number
}

export type AlunaAtencao = {
  usuarioId: string
  nome: string
  turmaId: number
  turmaNome: string
  total: number
  faltas: number
  percentualPresenca: number
}

export type ResumoFrequencia = {
  turmas: FrequenciaTurmaResumo[]
  atencao: AlunaAtencao[]
}

const DIA_POR_INDICE = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO']

export function hojeISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function diaSemanaHoje(): string {
  return DIA_POR_INDICE[new Date().getDay()]
}

// Mesmas faixas usadas no resumo da chamada da turma.
export function faixaPresenca(percentual: number | null | undefined): 'ok' | 'atencao' | 'critico' | 'semDados' {
  if (percentual === null || percentual === undefined) return 'semDados'
  if (percentual >= 90) return 'ok'
  if (percentual >= 75) return 'atencao'
  return 'critico'
}

export const DIAS_ORDEM = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO', 'DOMINGO']

export const DIAS_CURTOS: Record<string, string> = {
  SEGUNDA: 'Seg',
  TERCA: 'Ter',
  QUARTA: 'Qua',
  QUINTA: 'Qui',
  SEXTA: 'Sex',
  SABADO: 'Sáb',
  DOMINGO: 'Dom',
}

export const DIAS_LONGOS: Record<string, string> = {
  SEGUNDA: 'Segunda',
  TERCA: 'Terça',
  QUARTA: 'Quarta',
  QUINTA: 'Quinta',
  SEXTA: 'Sexta',
  SABADO: 'Sábado',
  DOMINGO: 'Domingo',
}

export function extrairHora(horario: string | null): number | null {
  if (!horario) return null
  const match = horario.match(/\d{1,2}/)
  if (!match) return null
  const hora = Number(match[0])
  return hora >= 0 && hora <= 23 ? hora : null
}

export function descreverQuando(dias: string[] | undefined, horario: string | null): string {
  if (!dias?.length && !horario) return 'Sem dias e horário definidos'
  const nomes = DIAS_ORDEM.filter((d) => dias?.includes(d)).map((d) => DIAS_LONGOS[d])
  const textoDias = nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}` : nomes[0] ?? ''
  return [textoDias, horario].filter(Boolean).join(' · ')
}
