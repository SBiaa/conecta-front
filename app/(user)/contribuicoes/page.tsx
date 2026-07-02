'use client'

import { useEffect, useState } from 'react'
import { apiGet } from '../../lib/api'
import styles from './contribuicoes.module.css'

type Pagamento = {
  id: number
  valor: string
  status: 'PAGA' | 'PENDENTE'
  mesReferencia: string
  vencimento: string
  formaPagamento: string | null
  dataPagamento: string | null
  matricula: {
    turma: {
      nome: string
      projeto: { nome: string }
    }
  }
}

type Situacao = 'PAGA' | 'PENDENTE' | 'ATRASADA'

const FORMA_LABELS: Record<string, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  CARTAO: 'Cartão',
}

function formatarMes(mesRef: string): string {
  const [ano, mes] = mesRef.split('-').map(Number)
  const nome = new Date(ano, mes - 1).toLocaleString('pt-BR', { month: 'long' })
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} ${ano}`
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function getSituacao(pagamento: Pagamento): Situacao {
  if (pagamento.status === 'PAGA') return 'PAGA'
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const venc = new Date(pagamento.vencimento)
  venc.setHours(0, 0, 0, 0)
  return venc < hoje ? 'ATRASADA' : 'PENDENTE'
}

export default function ContribuicoesPage() {
  const [pagamentos, setPagamentos] = useState<Pagamento[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    apiGet<Pagamento[]>('/me/pagamentos')
      .then(setPagamentos)
      .catch(() => setErro('Não foi possível carregar as contribuições.'))
  }, [])

  if (erro) {
    return (
      <div className={styles.pagina}>
        <h1 className={styles.titulo}>Minhas Contribuições</h1>
        <p className={styles.mensagemErro}>{erro}</p>
      </div>
    )
  }

  if (pagamentos === null) {
    return (
      <div className={styles.pagina}>
        <h1 className={styles.titulo}>Minhas Contribuições</h1>
        <p className={styles.mensagem}>Carregando...</p>
      </div>
    )
  }

  if (pagamentos.length === 0) {
    return (
      <div className={styles.pagina}>
        <h1 className={styles.titulo}>Minhas Contribuições</h1>
        <p className={styles.mensagem}>Nenhuma contribuição encontrada.</p>
      </div>
    )
  }

  const naoPagas = pagamentos.filter((p) => p.status !== 'PAGA')
  const totalPendente = naoPagas.reduce((acc, p) => acc + Number(p.valor), 0)
  const emDia = naoPagas.length === 0

  return (
    <div className={styles.pagina}>
      <h1 className={styles.titulo}>Minhas Contribuições</h1>

      <div className={`${styles.resumo} ${emDia ? styles.resumoEmDia : styles.resumoPendente}`}>
        {emDia ? (
          <span>Você está em dia ✓</span>
        ) : (
          <span>
            {naoPagas.length} {naoPagas.length === 1 ? 'pendente' : 'pendentes'}{' '}
            · {formatarMoeda(totalPendente)}
          </span>
        )}
      </div>

      <ul className={styles.lista}>
        {pagamentos.map((p) => {
          const situacao = getSituacao(p)
          return (
            <li key={p.id} className={styles.card}>
              <p className={styles.atividade}>
                <span className={styles.projeto}>{p.matricula.turma.projeto.nome}</span>
                <span className={styles.turma}>{p.matricula.turma.nome}</span>
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
                      : styles.situacaoPendente
                  }`}
                >
                  {situacao === 'PAGA' ? 'Paga' : situacao === 'ATRASADA' ? 'Atrasada' : 'Pendente'}
                </span>
              </div>

              {situacao === 'PAGA' && p.formaPagamento && (
                <p className={styles.formaPagamento}>
                  via {FORMA_LABELS[p.formaPagamento] ?? p.formaPagamento}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
