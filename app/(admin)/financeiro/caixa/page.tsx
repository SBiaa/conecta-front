'use client'

import { useEffect, useState } from 'react'
import { apiGet } from '../../../lib/api'
import { formatarMoeda, dataHojeISO } from '../../../lib/formato'
import styles from '../financeiro.module.css'

type FormaPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO'

type Entrada = {
  id: string
  origem: string
  descricao: string
  detalhe: string | null
  valor: number
  formaPagamento: FormaPagamento | null
}

type Saida = {
  id: number
  descricao: string
  categoria: string
  valor: number
}

type CaixaDoDia = {
  data: string
  entradas: {
    total: number
    porForma: Record<FormaPagamento, number>
    itens: Entrada[]
  }
  saidas: {
    total: number
    porCategoria: { categoriaId: number; nome: string; total: number }[]
    itens: Saida[]
  }
  saldo: number
}

const LABELS_FORMA: Record<FormaPagamento, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  CARTAO: 'Cartão',
}

const FORMAS: FormaPagamento[] = ['DINHEIRO', 'PIX', 'CARTAO']

export default function CaixaDoDiaPage() {
  const [data, setData] = useState(dataHojeISO())
  const [caixa, setCaixa] = useState<CaixaDoDia | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    setCarregando(true)
    setErro('')
    apiGet<CaixaDoDia>(`/financeiro/caixa-dia?data=${data}`)
      .then(setCaixa)
      .catch(() => setErro('Não foi possível carregar o caixa do dia'))
      .finally(() => setCarregando(false))
  }, [data])

  const semMovimento =
    caixa && caixa.entradas.itens.length === 0 && caixa.saidas.itens.length === 0

  return (
    <div className={styles.pagina}>
      <div className={styles.cabecalho}>
        <h1 className={styles.titulo}>Caixa do dia</h1>
      </div>

      <div className={`${styles.card} ${styles.cardDestaque}`}>
        <div className={styles.filtros}>
          <div className={styles.campo}>
            <label htmlFor="dataCaixa">Dia</label>
            <input
              type="date"
              id="dataCaixa"
              value={data}
              onChange={(evento) => setData(evento.target.value)}
            />
          </div>
        </div>

        {carregando && <p className={styles.mensagem}>Carregando...</p>}
        {erro && <p className={styles.mensagemErro}>{erro}</p>}

        {!carregando && caixa && (
          <>
            <div className={styles.resumo}>
              <div className={styles.cardResumo}>
                <span className={styles.cardLabel}>Entrou</span>
                <span className={styles.cardValor}>{formatarMoeda(caixa.entradas.total)}</span>
              </div>
              <div className={styles.cardResumo}>
                <span className={styles.cardLabel}>Saiu</span>
                <span className={styles.cardValor}>{formatarMoeda(caixa.saidas.total)}</span>
              </div>
              <div className={styles.cardResumo}>
                <span className={styles.cardLabel}>Sobrou no caixa</span>
                <span
                  className={`${styles.cardValor} ${
                    caixa.saldo < 0 ? styles.valorNegativo : ''
                  }`}
                >
                  {formatarMoeda(caixa.saldo)}
                </span>
              </div>
            </div>

            <div className={styles.resumoFormas}>
              <span className={styles.cardLabel}>Entradas por forma de pagamento</span>
              <ul className={styles.listaFormas}>
                {FORMAS.map((forma) => (
                  <li key={forma} className={styles.linhaForma}>
                    <span>{LABELS_FORMA[forma]}</span>
                    <span>{formatarMoeda(caixa.entradas.porForma[forma] ?? 0)}</span>
                  </li>
                ))}
                <li className={`${styles.linhaForma} ${styles.linhaSaldo}`}>
                  <span>Total recebido</span>
                  <span>{formatarMoeda(caixa.entradas.total)}</span>
                </li>
              </ul>
            </div>

            {semMovimento && (
              <p className={styles.mensagem}>Nenhum movimento registrado neste dia</p>
            )}

            {caixa.entradas.itens.length > 0 && (
              <>
                <h2 className={styles.subtituloSecundario}>Recebimentos</h2>
                <ul className={styles.lista}>
                  {caixa.entradas.itens.map((item) => (
                    <li key={item.id} className={styles.item}>
                      <div className={styles.infoPagamento}>
                        <span className={styles.nomeUsuario}>
                          {item.descricao}
                          <span className={styles.badgeTipo}>{item.origem}</span>
                        </span>
                        {item.detalhe && <span className={styles.detalhe}>{item.detalhe}</span>}
                        {item.formaPagamento && (
                          <span className={styles.detalhe}>
                            {LABELS_FORMA[item.formaPagamento]}
                          </span>
                        )}
                      </div>
                      <span className={styles.valorPagamento}>{formatarMoeda(item.valor)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {caixa.saidas.itens.length > 0 && (
              <>
                <h2 className={styles.subtituloSecundario}>Gastos do dia</h2>
                <ul className={styles.lista}>
                  {caixa.saidas.itens.map((item) => (
                    <li key={item.id} className={styles.item}>
                      <div className={styles.infoPagamento}>
                        <span className={styles.nomeUsuario}>{item.descricao}</span>
                        <span className={styles.detalhe}>{item.categoria}</span>
                      </div>
                      <span className={`${styles.valorPagamento} ${styles.valorNegativo}`}>
                        − {formatarMoeda(item.valor)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
