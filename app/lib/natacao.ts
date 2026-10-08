export type NivelNatacao = 'ADAPTACAO' | 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO'

export const NIVEIS_NATACAO: { valor: NivelNatacao; label: string; descricao: string }[] = [
  { valor: 'ADAPTACAO', label: 'Adaptação', descricao: 'Se acostumando com a água' },
  { valor: 'INICIANTE', label: 'Iniciante', descricao: 'Flutua e começa a se deslocar' },
  { valor: 'INTERMEDIARIO', label: 'Intermediário', descricao: 'Nada com autonomia' },
  { valor: 'AVANCADO', label: 'Avançado', descricao: 'Domina os estilos' },
]

export function labelNivel(nivel: NivelNatacao | null | undefined): string {
  return NIVEIS_NATACAO.find((n) => n.valor === nivel)?.label ?? 'Sem nível'
}

export type RegistroNivel = {
  id: number
  data: string
  nivel: NivelNatacao
  observacao: string | null
  registradoPor: { id: string; nome: string } | null
}

export type HistoricoNivel = {
  nivelAtual: RegistroNivel | null
  historico: RegistroNivel[]
}
