'use client'

import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { apiGet, apiPost, apiDelete } from '../../../lib/api'
import { formatarMoeda, formatarData, mesAtualISO, dataHojeISO } from '../../../lib/formato'
import styles from '../financeiro.module.css'

type FormaPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO'

type Produto = {
  id: number
  nome: string
  preco: string
  ativo: boolean
}

type Venda = {
  id: number
  quantidade: number
  valorUnitario: string
  valorTotal: string
  data: string
  formaPagamento: FormaPagamento
  produto: { id: number; nome: string }
  usuario: { id: string; nome: string } | null
}

type AssociadaResumo = {
  id: string
  nome: string
  cpf: string
}

const LABELS_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  CARTAO: 'Cartão',
}

export default function VendasPage() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [mesFiltro, setMesFiltro] = useState(mesAtualISO())
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [modalAberto, setModalAberto] = useState(false)
  const [produtoId, setProdutoId] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [valorUnitario, setValorUnitario] = useState('')
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('DINHEIRO')
  const [data, setData] = useState(dataHojeISO())
  const [enviando, setEnviando] = useState(false)
  const [erroModal, setErroModal] = useState('')

  const [buscaAluna, setBuscaAluna] = useState('')
  const [resultadosBusca, setResultadosBusca] = useState<AssociadaResumo[]>([])
  const [alunaSelecionada, setAlunaSelecionada] = useState<AssociadaResumo | null>(null)

  function buscarVendas() {
    setCarregando(true)
    return apiGet<Venda[]>(`/vendas?mes=${mesFiltro}`)
      .then(setVendas)
      .catch(() => setErro('Não foi possível carregar as vendas'))
      .finally(() => setCarregando(false))
  }

  useEffect(() => {
    buscarVendas()
  }, [mesFiltro])

  useEffect(() => {
    apiGet<Produto[]>('/produtos?ativo=true').then(setProdutos).catch(() => {})
  }, [])

  // Busca de aluna com debounce — vínculo é opcional na venda.
  useEffect(() => {
    if (alunaSelecionada || buscaAluna.trim() === '') {
      setResultadosBusca([])
      return
    }

    const timeout = setTimeout(() => {
      apiGet<AssociadaResumo[]>(
        `/usuarios?papel=ASSOCIADO&busca=${encodeURIComponent(buscaAluna)}`
      )
        .then(setResultadosBusca)
        .catch(() => {})
    }, 400)

    return () => clearTimeout(timeout)
  }, [buscaAluna, alunaSelecionada])

  function abrirModal() {
    setProdutoId('')
    setQuantidade('1')
    setValorUnitario('')
    setFormaPagamento('DINHEIRO')
    setData(dataHojeISO())
    setBuscaAluna('')
    setAlunaSelecionada(null)
    setResultadosBusca([])
    setErroModal('')
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
  }

  function escolherProduto(id: string) {
    setProdutoId(id)
    const produto = produtos.find((item) => String(item.id) === id)
    setValorUnitario(produto ? String(produto.preco) : '')
  }

  const totalPrevisto = Number(valorUnitario || 0) * Number(quantidade || 0)

  async function salvar() {
    if (!produtoId) {
      setErroModal('Escolha o produto')
      return
    }

    if (Number(quantidade) < 1) {
      setErroModal('A quantidade precisa ser pelo menos 1')
      return
    }

    setEnviando(true)
    setErroModal('')
    try {
      await apiPost('/vendas', {
        produtoId: Number(produtoId),
        quantidade: Number(quantidade),
        valorUnitario: Number(valorUnitario),
        usuarioId: alunaSelecionada?.id,
        data,
        formaPagamento,
      })
      await buscarVendas()
      fecharModal()
    } catch {
      setErroModal('Não foi possível registrar a venda')
    } finally {
      setEnviando(false)
    }
  }

  async function apagar(venda: Venda) {
    const confirmado = window.confirm(`Excluir a venda de "${venda.produto.nome}"?`)
    if (!confirmado) return

    try {
      await apiDelete(`/vendas/${venda.id}`)
      await buscarVendas()
    } catch {
      setErro('Não foi possível excluir a venda')
    }
  }

  const totalDoMes = vendas.reduce((soma, venda) => soma + Number(venda.valorTotal), 0)

  return (
    <div className={styles.pagina}>
      <div className={styles.cabecalho}>
        <h1 className={styles.titulo}>Vendas</h1>
        <button type="button" className={styles.botaoGerar} onClick={abrirModal}>
          Registrar venda
        </button>
      </div>

      <div className={`${styles.card} ${styles.cardDestaque}`}>
        <div className={styles.filtros}>
          <div className={styles.campo}>
            <label htmlFor="mesFiltro">Mês</label>
            <input
              type="month"
              id="mesFiltro"
              value={mesFiltro}
              onChange={(evento) => setMesFiltro(evento.target.value)}
            />
          </div>
        </div>

        {!carregando && vendas.length > 0 && (
          <div className={styles.resumo}>
            <div className={styles.cardResumo}>
              <span className={styles.cardLabel}>Total vendido no mês</span>
              <span className={styles.cardValor}>{formatarMoeda(totalDoMes)}</span>
            </div>
            <div className={styles.cardResumo}>
              <span className={styles.cardLabel}>Vendas registradas</span>
              <span className={styles.cardValor}>{vendas.length}</span>
            </div>
          </div>
        )}

        {carregando && <p className={styles.mensagem}>Carregando...</p>}
        {erro && <p className={styles.mensagemErro}>{erro}</p>}

        {!carregando && vendas.length === 0 && (
          <p className={styles.mensagem}>Nenhuma venda registrada neste mês</p>
        )}

        {!carregando && vendas.length > 0 && (
          <ul className={styles.lista}>
            {vendas.map((venda) => (
              <li key={venda.id} className={styles.item}>
                <div className={styles.infoPagamento}>
                  <span className={styles.nomeUsuario}>
                    {venda.quantidade}x {venda.produto.nome}
                  </span>
                  <span className={styles.detalhe}>
                    {venda.usuario ? venda.usuario.nome : 'Venda avulsa'}
                  </span>
                  <span className={styles.detalhe}>
                    {formatarData(venda.data)} · {LABELS_FORMA_PAGAMENTO[venda.formaPagamento]}
                  </span>
                </div>
                <div className={styles.acoesItem}>
                  <span className={styles.valorPagamento}>{formatarMoeda(venda.valorTotal)}</span>
                  <button
                    className={styles.botaoRegistrar}
                    onClick={() => apagar(venda)}
                    title="Excluir venda"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalAberto && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitulo}>Registrar venda</h2>

            <div className={styles.campo}>
              <label htmlFor="produtoId">Produto</label>
              <select
                id="produtoId"
                value={produtoId}
                onChange={(evento) => escolherProduto(evento.target.value)}
              >
                <option value="">Selecione...</option>
                {produtos.map((produto) => (
                  <option key={produto.id} value={produto.id}>
                    {produto.nome} — {formatarMoeda(produto.preco)}
                  </option>
                ))}
              </select>
              {produtos.length === 0 && (
                <span className={styles.erro}>
                  Nenhum produto ativo cadastrado. Cadastre um na aba Produtos.
                </span>
              )}
            </div>

            <div className={styles.campo}>
              <label htmlFor="quantidade">Quantidade</label>
              <input
                type="number"
                id="quantidade"
                min="1"
                step="1"
                value={quantidade}
                onChange={(evento) => setQuantidade(evento.target.value)}
              />
            </div>

            <div className={styles.campo}>
              <label htmlFor="valorUnitario">Valor unitário</label>
              <input
                type="number"
                id="valorUnitario"
                step="0.01"
                min="0"
                value={valorUnitario}
                onChange={(evento) => setValorUnitario(evento.target.value)}
              />
              {totalPrevisto > 0 && (
                <span className={styles.detalhe}>Total: {formatarMoeda(totalPrevisto)}</span>
              )}
            </div>

            <div className={styles.campo}>
              <label htmlFor="formaPagamentoVenda">Forma de pagamento</label>
              <select
                id="formaPagamentoVenda"
                value={formaPagamento}
                onChange={(evento) => setFormaPagamento(evento.target.value as FormaPagamento)}
              >
                <option value="DINHEIRO">Dinheiro</option>
                <option value="PIX">Pix</option>
                <option value="CARTAO">Cartão</option>
              </select>
            </div>

            <div className={styles.campo}>
              <label htmlFor="dataVenda">Data</label>
              <input
                type="date"
                id="dataVenda"
                value={data}
                onChange={(evento) => setData(evento.target.value)}
              />
            </div>

            <div className={styles.campo}>
              <label htmlFor="buscaAluna">Aluna (opcional)</label>
              {alunaSelecionada ? (
                <div className={styles.alunaSelecionada}>
                  <span>{alunaSelecionada.nome}</span>
                  <button
                    type="button"
                    className={styles.botaoTrocar}
                    onClick={() => {
                      setAlunaSelecionada(null)
                      setBuscaAluna('')
                    }}
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    id="buscaAluna"
                    placeholder="Digite o nome..."
                    value={buscaAluna}
                    onChange={(evento) => setBuscaAluna(evento.target.value)}
                  />
                  {resultadosBusca.length > 0 && (
                    <ul className={styles.resultados}>
                      {resultadosBusca.slice(0, 6).map((aluna) => (
                        <li key={aluna.id}>
                          <button
                            type="button"
                            className={styles.resultadoItem}
                            onClick={() => {
                              setAlunaSelecionada(aluna)
                              setResultadosBusca([])
                            }}
                          >
                            {aluna.nome}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>

            {erroModal && <p className={styles.erroModal}>{erroModal}</p>}

            <div className={styles.acoesModal}>
              <button className={styles.botaoCancelar} onClick={fecharModal} disabled={enviando}>
                Cancelar
              </button>
              <button className={styles.botaoConfirmar} onClick={salvar} disabled={enviando}>
                {enviando ? 'Salvando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
