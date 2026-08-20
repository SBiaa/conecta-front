const NOMES_MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export function formatarMoeda(valor: number | string) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Lê em UTC de propósito: datas salvas como meia-noite UTC apareceriam um dia
// antes se fossem convertidas pro fuso local (Brasil é UTC-3).
export function formatarData(data: string) {
  const d = new Date(data)
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${d.getUTCFullYear()}`
}

export function formatarMes(mes: string) {
  const [ano, mesNumero] = mes.split('-')
  return `${NOMES_MESES[Number(mesNumero) - 1]} ${ano}`
}

export function mesAtualISO() {
  const agora = new Date()
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
}

// Último dia do mês "AAAA-MM", no formato "AAAA-MM-DD".
// O dia 0 do mês seguinte é o último dia do mês pedido.
export function ultimoDiaDoMesISO(mes: string) {
  const [ano, mesNumero] = mes.split('-').map(Number)
  const ultimoDia = new Date(ano, mesNumero, 0).getDate()
  return `${mes}-${String(ultimoDia).padStart(2, '0')}`
}

export function dataHojeISO() {
  const agora = new Date()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${agora.getFullYear()}-${mes}-${dia}`
}
