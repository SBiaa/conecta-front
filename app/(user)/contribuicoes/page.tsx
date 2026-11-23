'use client'

import { useEffect, useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { apiGet } from '../../lib/api'
import { estaAtrasado, resumirPendencias } from '../../lib/pagamentos'
import styles from './contribuicoes.module.css'

const CHAVE_PIX = '06.659.481/0001-28'

type Pagamento = {
  id: number
  valor: string
  status: 'PAGA' | 'PENDENTE' | 'CANCELADA'
  mesReferencia: string
  vencimento: string
  formaPagamento: string | null
  dataPagamento: string | null
  matricula: {
    turmas: {
      nome: string
      projeto: { nome: string }
    }[]
  }
}

type Situacao = 'PAGA' | 'PENDENTE' | 'ATRASADA' | 'CANCELADA'

const FORMA_LABELS: Record<string, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  CARTAO: 'Cartão',
  ABONADO: 'Abonado',
}

function formatarMes(mesRef: string): string {
  const [ano, mes] = mesRef.split('-').map(Number)
  const nome = new Date(ano, mes - 1).toLocaleString('pt-BR', { month: 'long' })
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} ${ano}`
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(data: string): string {
  const d = new Date(data)
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${d.getUTCFullYear()}`
}

function formatarDDMM(data: string): string {
  const d = new Date(data)
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}`
}

function getSituacao(pagamento: Pagamento): Situacao {
  if (pagamento.status === 'PAGA') return 'PAGA'
  if (pagamento.status === 'CANCELADA') return 'CANCELADA'
  return estaAtrasado(pagamento) ? 'ATRASADA' : 'PENDENTE'
}

export default function ContribuicoesPage() {
  const [pagamentos, setPagamentos] = useState<Pagamento[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [chaveCopiada, setChaveCopiada] = useState(false)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    setErro(null)
    apiGet<Pagamento[]>('/me/pagamentos')
      .then(setPagamentos)
      .catch(() => setErro('Não foi possível carregar as contribuições.'))
  }, [tentativa])

  function copiarChavePix() {
    navigator.clipboard.writeText(CHAVE_PIX).then(() => {
      setChaveCopiada(true)
      setTimeout(() => setChaveCopiada(false), 2000)
    }).catch(() => {})
  }

  const cartaoPix = (
    <div className={styles.pix}>
      <div className={styles.pixInfo}>
        <span className={styles.pixLabel}>Pagar via Pix · Chave CNPJ</span>
        <span className={styles.pixChave}>{CHAVE_PIX}</span>
      </div>
      <button type="button" className={styles.pixBotao} onClick={copiarChavePix}>
        {chaveCopiada ? <Check size={16} /> : <Copy size={16} />}
        {chaveCopiada ? 'Copiada!' : 'Copiar chave'}
      </button>
      <p className={styles.pixPasso}>
        Depois de pagar, avise a coordenação e envie o comprovante.
      </p>
    </div>
  )

  if (erro) {
    return (
      <div className={styles.pagina}>
        <h1 className={styles.titulo}>Minhas Contribuições</h1>
        {cartaoPix}
        <p className={styles.mensagemErro}>{erro}</p>
        <button type="button" className={styles.botaoTentar} onClick={() => setTentativa((n) => n + 1)}>
          Tentar de novo
        </button>
      </div>
    )
  }

  if (pagamentos === null) {
    return (
      <div className={styles.pagina}>
        <h1 className={styles.titulo}>Minhas Contribuições</h1>
        {cartaoPix}
        <p className={styles.mensagem}>Carregando...</p>
      </div>
    )
  }

  if (pagamentos.length === 0) {
    return (
      <div className={styles.pagina}>
        <h1 className={styles.titulo}>Minhas Contribuições</h1>
        {cartaoPix}
        <p className={styles.mensagem}>Nenhuma contribuição encontrada.</p>
      </div>
    )
  }

  // Mesma regra do Início: só PENDENTE conta; CANCELADA fica fora do total.
  const { pendentes: naoPagas, atrasados, total: totalPendente, proxima } = resumirPendencias(pagamentos)
  const emDia = naoPagas.length === 0
  const totalAtrasado = atrasados.reduce((acc, p) => acc + Number(p.valor), 0)

  return (
    <div className={styles.pagina}>
      <h1 className={styles.titulo}>Minhas Contribuições</h1>

      {cartaoPix}

      <div className={`${styles.resumo} ${emDia ? styles.resumoEmDia : styles.resumoPendente}`}>
        {emDia ? (
          <span>Você está em dia ✓</span>
        ) : (
          <span>
            Para pagar: {formatarMoeda(totalPendente)}
            <span className={styles.resumoDetalhe}>
              {atrasados.length > 0
                ? `${formatarMoeda(totalAtrasado)} já ${atrasados.length === 1 ? 'venceu' : `venceram (${atrasados.length} meses)`}`
                : proxima && !estaAtrasado(proxima)
                ? `Próximo vencimento: ${formatarDDMM(proxima.vencimento)}`
                : `${naoPagas.length} ${naoPagas.length === 1 ? 'cobrança pendente' : 'cobranças pendentes'}`}
            </span>
          </span>
        )}
      </div>

      <ul className={styles.lista}>
        {pagamentos.map((p) => {
          const situacao = getSituacao(p)
          return (
            <li key={p.id} className={styles.card}>
              <p className={styles.atividade}>
                <span className={styles.projeto}>{p.matricula.turmas[0]?.projeto.nome ?? '—'}</span>
                <span className={styles.turma}>{p.matricula.turmas.map((turma) => turma.nome).join(', ')}</span>
              </p>

              <p className={styles.mes}>{formatarMes(p.mesReferencia)}</p>

              <div className={styles.rodape}>
                <span className={styles.valor}>{formatarMoeda(Number(p.valor))}</span>
                <span
                  className={`${styles.situacao} ${
                    situacao === 'PAGA'
                      ? styles.situacaoPaga
                      : situacao === 'ATRASADA'
                      ? styles.situacaoAtrasada
                      : situacao === 'CANCELADA'
                      ? styles.situacaoCancelada
                      : styles.situacaoPendente
                  }`}
                >
                  {situacao === 'PAGA'
                    ? 'Paga'
                    : situacao === 'ATRASADA'
                    ? 'Atrasada'
                    : situacao === 'CANCELADA'
                    ? 'Cancelada'
                    : 'Pendente'}
                </span>
              </div>

              {(situacao === 'PENDENTE' || situacao === 'ATRASADA') && (
                <p className={situacao === 'ATRASADA' ? styles.vencimentoAtrasado : styles.vencimento}>
                  {situacao === 'ATRASADA' ? 'Venceu em' : 'Vence em'} {formatarDDMM(p.vencimento)}
                </p>
              )}

              {situacao === 'PAGA' && (
                <p className={styles.formaPagamento}>
                  {p.dataPagamento && `Pago em ${formatarData(p.dataPagamento)}`}
                  {p.dataPagamento && p.formaPagamento && ' · '}
                  {p.formaPagamento && `via ${FORMA_LABELS[p.formaPagamento] ?? p.formaPagamento}`}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
