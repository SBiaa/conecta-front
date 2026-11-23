// Tipos e regras de pagamento usados pelas telas da coordenação
// (Financeiro, Atrasados e perfil da associada).

export type FormaPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO' | 'ABONADO'

export type StatusPagamento = 'PAGA' | 'PENDENTE' | 'CANCELADA'

export const LABELS_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  CARTAO: 'Cartão',
  ABONADO: 'Abonado',
}

export function descricaoTurmas(turmas: { nome: string; projeto: { nome: string } }[]) {
  const projeto = turmas[0]?.projeto.nome ?? ''
  const nomesTurmas = turmas.map((turma) => turma.nome).join(', ')
  return projeto ? `${projeto} — ${nomesTurmas}` : nomesTurmas
}

/** Valida o valor de um pagamento. "Abonado" é isenção: o valor é sempre R$ 0
 *  (e só existe em mensalidade/inscrição). Qualquer outra forma precisa de
 *  valor maior que zero — vazio, zero ou negativo é bloqueado. */
export function validarValorPagamento(
  valor: string,
  forma: FormaPagamento | ''
): string | null {
  if (forma === 'ABONADO') return null
  if (valor.trim() === '') return 'Informe o valor. Para isenção, escolha a forma Abonado.'
  const numero = Number(valor)
  if (Number.isNaN(numero)) return 'Informe um valor válido.'
  if (numero <= 0) return 'O valor precisa ser maior que zero. Para isenção, escolha a forma Abonado.'
  return null
}

export function mensagemDeErro(erro: unknown, padrao: string) {
  return erro instanceof Error && erro.message ? erro.message : padrao
}
