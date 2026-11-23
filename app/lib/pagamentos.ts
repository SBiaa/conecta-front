// Regra única de "o que a associada ainda deve", usada no Início e em
// Contribuições. Antes cada tela calculava de um jeito (uma ignorava
// CANCELADA, outra somava tudo que não era PAGA).
export type PagamentoBasico = {
  valor: string | number
  status: 'PAGA' | 'PENDENTE' | 'CANCELADA'
  vencimento: string
}

function inicioDoDia(data: Date): Date {
  const d = new Date(data)
  d.setHours(0, 0, 0, 0)
  return d
}

// Cobranças canceladas não são dívida: ficam fora de qualquer total.
export function pendentesDe<T extends PagamentoBasico>(pagamentos: T[]): T[] {
  return pagamentos.filter((p) => p.status === 'PENDENTE')
}

export function estaAtrasado(p: PagamentoBasico): boolean {
  return p.status === 'PENDENTE' && inicioDoDia(new Date(p.vencimento)) < inicioDoDia(new Date())
}

export type ResumoPendencias<T extends PagamentoBasico> = {
  pendentes: T[]
  atrasados: T[]
  total: number
  // pendente de vencimento mais próximo (o primeiro a pagar)
  proxima: T | null
}

export function resumirPendencias<T extends PagamentoBasico>(pagamentos: T[]): ResumoPendencias<T> {
  const pendentes = pendentesDe(pagamentos)
  const ordenados = [...pendentes].sort(
    (a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime()
  )
  return {
    pendentes: ordenados,
    atrasados: ordenados.filter(estaAtrasado),
    total: ordenados.reduce((acc, p) => acc + Number(p.valor), 0),
    proxima: ordenados[0] ?? null,
  }
}
