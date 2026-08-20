'use client'

import { useEffect, useState } from 'react'
import { apiGet } from '../../../lib/api'
import { formatarMoeda, formatarMes, mesAtualISO } from '../../../lib/formato'
import styles from '../financeiro.module.css'

type FormaPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO'

type Fechamento = {
  mes: string
  caixa: {
    entradas: {
      mensalidades: number
      inscricoes: number
      vendas: number
      total: number
      porForma: Record<FormaPagamento, number>
    }
    saidas: {
      total: number
      porCategoria: { categoriaId: number; nome: string; total: number }[]
    }
    saldo: number
  }
  cobrancas: {
    cobrado: number
    recebido: number
    emAberto: number
    quantidadeTotal: number
    quantidadePagas: number
    quantidadeEmAberto: number
  }
}

const LABELS_FORMA: Record<FormaPagamento, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  CARTAO: 'Cartão',
}

const FORMAS: FormaPagamento[] = ['DINHEIRO', 'PIX', 'CARTAO']

export default function FechamentoDoMesPage() {
  const [mes, setMes] = useState(mesAtualISO())
  const [fechamento, setFechamento] = useState<Fechamento | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    setCarregando(true)
    setErro('')
    apiGet<Fechamento>(`/financeiro/fechamento?mes=${mes}`)
      .then(setFechamento)
      .catch(() => setErro('Não foi possível carregar o fechamento'))
      .finally(() => setCarregando(false))
  }, [mes])

  return (
    <div className={styles.pagina}>
      <div className={styles.cabecalho}>
        <h1 className={styles.titulo}>Fechamento do mês</h1>
      </div>

      <div className={`${styles.card} ${styles.cardDestaque}`}>
        <div className={styles.filtros}>
          <div className={styles.campo}>
            <label htmlFor="mesFechamento">Mês</label>
            <input
              type="month"
              id="mesFechamento"
              value={mes}
              onChange={(evento) => setMes(evento.target.value)}
            />
          </div>
        </div>

        {carregando && <p className={styles.mensagem}>Carregando...</p>}
        {erro && <p className={styles.mensagemErro}>{erro}</p>}

        {!carregando && fechamento && (
          <>
            <h2 className={styles.subtituloSecundario}>
              Caixa de {formatarMes(fechamento.mes)}
            </h2>

            <div className={styles.resumo}>
              <div className={styles.cardResumo}>
                <span className={styles.cardLabel}>Entrou</span>
                <span className={styles.cardValor}>
                  {formatarMoeda(fechamento.caixa.entradas.total)}
                </span>
              </div>
              <div className={styles.cardResumo}>
                <span className={styles.cardLabel}>Saiu</span>
                <span className={styles.cardValor}>
                  {formatarMoeda(fechamento.caixa.saidas.total)}
                </span>
              </div>
              <div className={styles.cardResumo}>
                <span className={styles.cardLabel}>Saldo do mês</span>
                <span
                  className={`${styles.cardValor} ${
                    fechamento.caixa.saldo < 0 ? styles.valorNegativo : ''
                  }`}
                >
                  {formatarMoeda(fechamento.caixa.saldo)}
                </span>
              </div>
            </div>

            <div className={styles.resumoFormas}>
              <span className={styles.cardLabel}>De onde veio</span>
              <ul className={styles.listaFormas}>
                <li className={styles.linhaForma}>
                  <span>Mensalidades</span>
                  <span>{formatarMoeda(fechamento.caixa.entradas.mensalidades)}</span>
                </li>
                <li className={styles.linhaForma}>
                  <span>Inscrições</span>
                  <span>{formatarMoeda(fechamento.caixa.entradas.inscricoes)}</span>
                </li>
                <li className={styles.linhaForma}>
                  <span>Vendas</span>
                  <span>{formatarMoeda(fechamento.caixa.entradas.vendas)}</span>
                </li>
                <li className={`${styles.linhaForma} ${styles.linhaSaldo}`}>
                  <span>Total</span>
                  <span>{formatarMoeda(fechamento.caixa.entradas.total)}</span>
                </li>
              </ul>
            </div>

            <div className={styles.resumoFormas}>
              <span className={styles.cardLabel}>Por forma de pagamento</span>
              <ul className={styles.listaFormas}>
                {FORMAS.map((forma) => (
                  <li key={forma} className={styles.linhaForma}>
                    <span>{LABELS_FORMA[forma]}</span>
                    <span>{formatarMoeda(fechamento.caixa.entradas.porForma[forma] ?? 0)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.resumoFormas}>
              <span className={styles.cardLabel}>Gastos por categoria</span>
              {fechamento.caixa.saidas.porCategoria.length === 0 && (
                <p className={styles.mensagem}>Nenhum gasto lançado neste mês</p>
              )}
              {fechamento.caixa.saidas.porCategoria.length > 0 && (
                <ul className={styles.listaFormas}>
                  {fechamento.caixa.saidas.porCategoria.map((categoria) => (
                    <li key={categoria.categoriaId} className={styles.linhaForma}>
                      <span>{categoria.nome}</span>
                      <span>{formatarMoeda(categoria.total)}</span>
                    </li>
                  ))}
                  <li className={`${styles.linhaForma} ${styles.linhaSaldo}`}>
                    <span>Total</span>
                    <span>{formatarMoeda(fechamento.caixa.saidas.total)}</span>
                  </li>
                </ul>
              )}
            </div>

            <h2 className={styles.subtituloSecundario}>
              Cobranças de {formatarMes(fechamento.mes)}
            </h2>
            <p className={styles.mensagem}>
              Mensalidades e inscrições referentes a este mês, independente de quando foram pagas.
            </p>

            <div className={styles.resumo}>
              <div className={styles.cardResumo}>
                <span className={styles.cardLabel}>Cobrado</span>
                <span className={styles.cardValor}>
                  {formatarMoeda(fechamento.cobrancas.cobrado)}
                </span>
                <span className={styles.cardLabel}>
                  {fechamento.cobrancas.quantidadeTotal} cobranças
                </span>
              </div>
              <div className={styles.cardResumo}>
                <span className={styles.cardLabel}>Recebido</span>
                <span className={styles.cardValor}>
                  {formatarMoeda(fechamento.cobrancas.recebido)}
                </span>
                <span className={styles.cardLabel}>
                  {fechamento.cobrancas.quantidadePagas} pagas
                </span>
              </div>
              <div className={styles.cardResumo}>
                <span className={styles.cardLabel}>Em aberto</span>
                <span
                  className={`${styles.cardValor} ${
                    fechamento.cobrancas.emAberto > 0 ? styles.valorNegativo : ''
                  }`}
                >
                  {formatarMoeda(fechamento.cobrancas.emAberto)}
                </span>
                <span className={styles.cardLabel}>
                  {fechamento.cobrancas.quantidadeEmAberto} pendentes
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
