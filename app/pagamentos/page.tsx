'use client'

import { useEffect, useState } from 'react'
import { apiGet } from '../lib/api'
import styles from './pagamentos.module.css'

type FormaPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO'

type Pagamento = {
  id: string
  valor: string
  status: 'PAGA' | 'PENDENTE'
  vencimento: string
  formaPagamento: FormaPagamento | null
  aluna: {
    nome: string
    turma: {
      nome: string
    }
  }
}

const LABELS_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  CARTAO: 'Cartão',
}

function mesAtualISO() {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  return `${ano}-${mes}`
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function PagamentosPage() {
  const [mes, setMes] = useState(mesAtualISO())
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    setCarregando(true)
    apiGet<Pagamento[]>(`/pagamentos?mes=${mes}`)
      .then(setPagamentos)
      .finally(() => setCarregando(false))
  }, [mes])

  const pagas = pagamentos.filter((pagamento) => pagamento.status === 'PAGA')
  const pendentes = pagamentos.filter((pagamento) => pagamento.status === 'PENDENTE')

  const totalRecebido = pagas.reduce((soma, pagamento) => soma + Number(pagamento.valor), 0)
  const totalPendente = pendentes.reduce((soma, pagamento) => soma + Number(pagamento.valor), 0)
  const totalGeral = totalRecebido + totalPendente

  const porFormaPagamento = new Map<string, number>()
  pagas.forEach((pagamento) => {
    const chave = pagamento.formaPagamento ?? 'Não informado'
    porFormaPagamento.set(chave, (porFormaPagamento.get(chave) ?? 0) + Number(pagamento.valor))
  })

  return (
    <div className={styles.pagina}>
      <h1 className={styles.titulo}>Pagamentos</h1>

      <div className={styles.seletorMes}>
        <label htmlFor="mes">Mês</label>
        <input
          type="month"
          id="mes"
          value={mes}
          onChange={(evento) => setMes(evento.target.value)}
        />
      </div>

      {carregando && <p className={styles.mensagem}>Carregando...</p>}

      {!carregando && pagamentos.length === 0 && (
        <p className={styles.mensagem}>Nenhum pagamento neste mês</p>
      )}

      {!carregando && pagamentos.length > 0 && (
        <>
          <div className={styles.resumo}>
            <div className={styles.cardResumo}>
              <span className={styles.cardLabel}>Total recebido</span>
              <span className={styles.cardValor}>{formatarMoeda(totalRecebido)}</span>
            </div>
            <div className={styles.cardResumo}>
              <span className={styles.cardLabel}>Total pendente</span>
              <span className={styles.cardValor}>{formatarMoeda(totalPendente)}</span>
            </div>
            <div className={styles.cardResumo}>
              <span className={styles.cardLabel}>Total geral</span>
              <span className={styles.cardValor}>{formatarMoeda(totalGeral)}</span>
            </div>
          </div>

          <p className={styles.contagem}>
            {pagas.length} pagas, {pendentes.length} pendentes
          </p>

          <div className={styles.card}>
            <h2 className={styles.subtitulo}>Recebido por forma de pagamento</h2>
            {porFormaPagamento.size === 0 && (
              <p className={styles.mensagem}>Nenhum pagamento pago neste mês</p>
            )}
            {porFormaPagamento.size > 0 && (
              <ul className={styles.listaFormas}>
                {Array.from(porFormaPagamento.entries()).map(([forma, total]) => (
                  <li key={forma} className={styles.linhaForma}>
                    <span>{LABELS_FORMA_PAGAMENTO[forma as FormaPagamento] ?? forma}</span>
                    <span>{formatarMoeda(total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <h2 className={styles.subtitulo}>Pagamentos do mês</h2>
          <ul className={styles.lista}>
            {pagamentos.map((pagamento) => (
              <li key={pagamento.id} className={styles.item}>
                <div className={styles.infoPagamento}>
                  <span className={styles.nomeAluna}>{pagamento.aluna.nome}</span>
                  <span className={styles.detalhe}>{pagamento.aluna.turma.nome}</span>
                </div>
                <div className={styles.acoesItem}>
                  <span className={styles.detalhe}>{formatarMoeda(Number(pagamento.valor))}</span>
                  <span
                    className={`${styles.status} ${
                      pagamento.status === 'PAGA' ? styles.statusPaga : styles.statusPendente
                    }`}
                  >
                    {pagamento.status === 'PAGA' ? 'Paga' : 'Pendente'}
                  </span>
                  <span className={styles.detalhe}>
                    {pagamento.formaPagamento
                      ? LABELS_FORMA_PAGAMENTO[pagamento.formaPagamento]
                      : '—'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
