'use client'

import { useEffect, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { apiGet, apiPost, apiPatch, apiDelete } from '../../../lib/api'
import { formatarMoeda } from '../../../lib/formato'
import ConfirmDialog from '../../../components/ConfirmDialog'
import styles from '../financeiro.module.css'

type Produto = {
  id: number
  nome: string
  preco: string
  ativo: boolean
}

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [modalAberto, setModalAberto] = useState(false)
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null)
  const [nome, setNome] = useState('')
  const [preco, setPreco] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [erroModal, setErroModal] = useState('')

  const [produtoParaApagar, setProdutoParaApagar] = useState<Produto | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  function buscarProdutos() {
    setCarregando(true)
    return apiGet<Produto[]>('/produtos')
      .then(setProdutos)
      .catch(() => setErro('Não foi possível carregar os produtos'))
      .finally(() => setCarregando(false))
  }

  useEffect(() => {
    buscarProdutos()
  }, [])

  function abrirNovo() {
    setProdutoEditando(null)
    setNome('')
    setPreco('')
    setAtivo(true)
    setErroModal('')
    setModalAberto(true)
  }

  function abrirEdicao(produto: Produto) {
    setProdutoEditando(produto)
    setNome(produto.nome)
    setPreco(String(produto.preco))
    setAtivo(produto.ativo)
    setErroModal('')
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
  }

  async function salvar() {
    if (!nome.trim()) {
      setErroModal('Informe o nome do produto')
      return
    }

    if (preco === '' || Number(preco) < 0) {
      setErroModal('Informe um preço válido')
      return
    }

    setEnviando(true)
    setErroModal('')
    try {
      const corpo = { nome: nome.trim(), preco: Number(preco), ativo }

      if (produtoEditando) {
        await apiPatch(`/produtos/${produtoEditando.id}`, corpo)
      } else {
        await apiPost('/produtos', corpo)
      }

      await buscarProdutos()
      fecharModal()
    } catch {
      setErroModal('Não foi possível salvar o produto')
    } finally {
      setEnviando(false)
    }
  }

  async function apagar(produto: Produto) {
    setErro('')
    setExcluindo(true)
    try {
      await apiDelete(`/produtos/${produto.id}`)
      await buscarProdutos()
    } catch {
      setErro(
        'Não foi possível excluir. Se já houver vendas deste produto, desative-o em vez de excluir.'
      )
    } finally {
      setExcluindo(false)
      setProdutoParaApagar(null)
    }
  }

  return (
    <div className={styles.pagina}>
      <div className={styles.cabecalho}>
        <h1 className={styles.titulo}>Produtos</h1>
        <button type="button" className={styles.botaoGerar} onClick={abrirNovo}>
          Novo produto
        </button>
      </div>

      <div className={`${styles.card} ${styles.cardDestaque}`}>
        {carregando && <p className={styles.mensagem}>Carregando...</p>}
        {erro && <p className={styles.mensagemErro}>{erro}</p>}

        {!carregando && produtos.length === 0 && (
          <p className={styles.mensagem}>Nenhum produto cadastrado ainda</p>
        )}

        {!carregando && produtos.length > 0 && (
          <ul className={styles.lista}>
            {produtos.map((produto) => (
              <li key={produto.id} className={styles.item}>
                <div className={styles.infoPagamento}>
                  <span className={styles.nomeUsuario}>{produto.nome}</span>
                  <span className={styles.detalhe}>{formatarMoeda(produto.preco)}</span>
                </div>
                <div className={styles.acoesItem}>
                  {!produto.ativo && (
                    <span className={`${styles.status} ${styles.statusPendente}`}>Inativo</span>
                  )}
                  <button
                    className={styles.botaoRegistrar}
                    onClick={() => abrirEdicao(produto)}
                    title="Editar produto"
                    aria-label={`Editar produto ${produto.nome}`}
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    className={styles.botaoRegistrar}
                    onClick={() => setProdutoParaApagar(produto)}
                    title="Excluir produto"
                    aria-label={`Excluir produto ${produto.nome}`}
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
            <h2 className={styles.modalTitulo}>
              {produtoEditando ? 'Editar produto' : 'Novo produto'}
            </h2>

            <div className={styles.campo}>
              <label htmlFor="nomeProduto">Nome</label>
              <input
                type="text"
                id="nomeProduto"
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
                placeholder="Ex: Touca de natação"
              />
            </div>

            <div className={styles.campo}>
              <label htmlFor="precoProduto">Preço</label>
              <input
                type="number"
                id="precoProduto"
                step="0.01"
                min="0"
                value={preco}
                onChange={(evento) => setPreco(evento.target.value)}
              />
            </div>

            <div className={styles.campoCheckbox}>
              <input
                type="checkbox"
                id="ativoProduto"
                checked={ativo}
                onChange={(evento) => setAtivo(evento.target.checked)}
              />
              <label htmlFor="ativoProduto">Disponível para venda</label>
            </div>

            {erroModal && <p className={styles.erroModal}>{erroModal}</p>}

            <div className={styles.acoesModal}>
              <button className={styles.botaoCancelar} onClick={fecharModal} disabled={enviando}>
                Cancelar
              </button>
              <button className={styles.botaoConfirmar} onClick={salvar} disabled={enviando}>
                {enviando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        aberto={produtoParaApagar !== null}
        titulo="Excluir produto"
        mensagem={`Excluir o produto "${produtoParaApagar?.nome}"?`}
        carregando={excluindo}
        onConfirmar={() => produtoParaApagar && apagar(produtoParaApagar)}
        onCancelar={() => setProdutoParaApagar(null)}
      />
    </div>
  )
}
