'use client'

import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { apiGet, apiPost, apiDelete } from '../../../lib/api'
import { formatarMoeda, formatarData, mesAtualISO, dataHojeISO } from '../../../lib/formato'
import ConfirmDialog from '../../../components/ConfirmDialog'
import styles from '../financeiro.module.css'

type Categoria = {
  id: number
  nome: string
  ativa: boolean
}

type Despesa = {
  id: number
  descricao: string
  valor: string
  data: string
  categoria: { id: number; nome: string }
}

export default function GastosPage() {
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [mesFiltro, setMesFiltro] = useState(mesAtualISO())
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [modalAberto, setModalAberto] = useState(false)
  const [descricao, setDescricao] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(dataHojeISO())
  const [enviando, setEnviando] = useState(false)
  const [erroModal, setErroModal] = useState('')

  const [modalCategorias, setModalCategorias] = useState(false)
  const [novaCategoria, setNovaCategoria] = useState('')
  const [erroCategoria, setErroCategoria] = useState('')

  const [despesaParaApagar, setDespesaParaApagar] = useState<Despesa | null>(null)
  const [excluindoDespesa, setExcluindoDespesa] = useState(false)
  const [categoriaParaApagar, setCategoriaParaApagar] = useState<Categoria | null>(null)
  const [excluindoCategoria, setExcluindoCategoria] = useState(false)

  function buscarDespesas() {
    setCarregando(true)
    const params = new URLSearchParams({ mes: mesFiltro })
    if (categoriaFiltro) params.set('categoriaId', categoriaFiltro)

    return apiGet<Despesa[]>(`/despesas?${params.toString()}`)
      .then(setDespesas)
      .catch(() => setErro('Não foi possível carregar os gastos'))
      .finally(() => setCarregando(false))
  }

  function buscarCategorias() {
    return apiGet<Categoria[]>('/categorias-despesa').then(setCategorias).catch(() => {})
  }

  useEffect(() => {
    buscarDespesas()
  }, [mesFiltro, categoriaFiltro])

  useEffect(() => {
    buscarCategorias()
  }, [])

  function abrirModal() {
    setDescricao('')
    setCategoriaId('')
    setValor('')
    setData(dataHojeISO())
    setErroModal('')
    setModalAberto(true)
  }

  async function salvar() {
    if (!descricao.trim()) {
      setErroModal('Informe a descrição do gasto')
      return
    }

    if (!categoriaId) {
      setErroModal('Escolha a categoria')
      return
    }

    if (valor === '' || Number(valor) < 0) {
      setErroModal('Informe um valor válido')
      return
    }

    setEnviando(true)
    setErroModal('')
    try {
      await apiPost('/despesas', {
        descricao: descricao.trim(),
        categoriaId: Number(categoriaId),
        valor: Number(valor),
        data,
      })
      await buscarDespesas()
      setModalAberto(false)
    } catch {
      setErroModal('Não foi possível lançar o gasto')
    } finally {
      setEnviando(false)
    }
  }

  async function apagarDespesa(despesa: Despesa) {
    setExcluindoDespesa(true)
    try {
      await apiDelete(`/despesas/${despesa.id}`)
      await buscarDespesas()
    } catch {
      setErro('Não foi possível excluir o gasto')
    } finally {
      setExcluindoDespesa(false)
      setDespesaParaApagar(null)
    }
  }

  async function criarCategoria() {
    if (!novaCategoria.trim()) return

    setErroCategoria('')
    try {
      await apiPost('/categorias-despesa', { nome: novaCategoria.trim() })
      setNovaCategoria('')
      await buscarCategorias()
    } catch {
      setErroCategoria('Não foi possível criar. Talvez já exista uma categoria com esse nome.')
    }
  }

  async function apagarCategoria(categoria: Categoria) {
    setErroCategoria('')
    setExcluindoCategoria(true)
    try {
      await apiDelete(`/categorias-despesa/${categoria.id}`)
      await buscarCategorias()
    } catch (e) {
      setErroCategoria(
        e instanceof Error
          ? e.message
          : 'Não foi possível excluir. Se já houver gastos nessa categoria, ela não pode ser removida.'
      )
    } finally {
      setExcluindoCategoria(false)
      setCategoriaParaApagar(null)
    }
  }

  const totalDoMes = despesas.reduce((soma, despesa) => soma + Number(despesa.valor), 0)

  return (
    <div className={styles.pagina}>
      <div className={styles.cabecalho}>
        <h1 className={styles.titulo}>Gastos</h1>
        <div className={styles.acoesCabecalho}>
          <button
            type="button"
            className={styles.botaoSecundario}
            onClick={() => setModalCategorias(true)}
          >
            Categorias
          </button>
          <button type="button" className={styles.botaoGerar} onClick={abrirModal}>
            Lançar gasto
          </button>
        </div>
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

          <div className={styles.campo}>
            <label htmlFor="categoriaFiltro">Categoria</label>
            <select
              id="categoriaFiltro"
              value={categoriaFiltro}
              onChange={(evento) => setCategoriaFiltro(evento.target.value)}
            >
              <option value="">Todas</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!carregando && despesas.length > 0 && (
          <div className={styles.resumo}>
            <div className={styles.cardResumo}>
              <span className={styles.cardLabel}>Total gasto no mês</span>
              <span className={styles.cardValor}>{formatarMoeda(totalDoMes)}</span>
            </div>
            <div className={styles.cardResumo}>
              <span className={styles.cardLabel}>Lançamentos</span>
              <span className={styles.cardValor}>{despesas.length}</span>
            </div>
          </div>
        )}

        {carregando && <p className={styles.mensagem}>Carregando...</p>}
        {erro && <p className={styles.mensagemErro}>{erro}</p>}

        {!carregando && despesas.length === 0 && (
          <p className={styles.mensagem}>Nenhum gasto lançado neste filtro</p>
        )}

        {!carregando && despesas.length > 0 && (
          <ul className={styles.lista}>
            {despesas.map((despesa) => (
              <li key={despesa.id} className={styles.item}>
                <div className={styles.infoPagamento}>
                  <span className={styles.nomeUsuario}>{despesa.descricao}</span>
                  <span className={styles.detalhe}>{despesa.categoria.nome}</span>
                  <span className={styles.detalhe}>{formatarData(despesa.data)}</span>
                </div>
                <div className={styles.acoesItem}>
                  <span className={styles.valorPagamento}>{formatarMoeda(despesa.valor)}</span>
                  <button
                    className={styles.botaoRegistrar}
                    onClick={() => setDespesaParaApagar(despesa)}
                    title="Excluir gasto"
                    aria-label={`Excluir gasto ${despesa.descricao}`}
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
            <h2 className={styles.modalTitulo}>Lançar gasto</h2>

            <div className={styles.campo}>
              <label htmlFor="descricao">Descrição</label>
              <input
                type="text"
                id="descricao"
                value={descricao}
                onChange={(evento) => setDescricao(evento.target.value)}
                placeholder="Ex: Compra de material de limpeza"
              />
            </div>

            <div className={styles.campo}>
              <label htmlFor="categoriaId">Categoria</label>
              <select
                id="categoriaId"
                value={categoriaId}
                onChange={(evento) => setCategoriaId(evento.target.value)}
              >
                <option value="">Selecione...</option>
                {categorias
                  .filter((categoria) => categoria.ativa)
                  .map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
              </select>
            </div>

            <div className={styles.campo}>
              <label htmlFor="valorGasto">Valor</label>
              <input
                type="number"
                id="valorGasto"
                step="0.01"
                min="0"
                value={valor}
                onChange={(evento) => setValor(evento.target.value)}
              />
            </div>

            <div className={styles.campo}>
              <label htmlFor="dataGasto">Data</label>
              <input
                type="date"
                id="dataGasto"
                value={data}
                onChange={(evento) => setData(evento.target.value)}
              />
            </div>

            {erroModal && <p className={styles.erroModal}>{erroModal}</p>}

            <div className={styles.acoesModal}>
              <button
                className={styles.botaoCancelar}
                onClick={() => setModalAberto(false)}
                disabled={enviando}
              >
                Cancelar
              </button>
              <button className={styles.botaoConfirmar} onClick={salvar} disabled={enviando}>
                {enviando ? 'Salvando...' : 'Lançar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalCategorias && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitulo}>Categorias de gasto</h2>

            <div className={styles.campo}>
              <label htmlFor="novaCategoria">Nova categoria</label>
              <div className={styles.linhaNovaCategoria}>
                <input
                  type="text"
                  id="novaCategoria"
                  value={novaCategoria}
                  onChange={(evento) => setNovaCategoria(evento.target.value)}
                  placeholder="Ex: Transporte"
                />
                <button type="button" className={styles.botaoGerar} onClick={criarCategoria}>
                  Adicionar
                </button>
              </div>
            </div>

            {erroCategoria && <p className={styles.erroModal}>{erroCategoria}</p>}

            <ul className={styles.lista}>
              {categorias.map((categoria) => (
                <li key={categoria.id} className={styles.item}>
                  <span className={styles.nomeUsuario}>{categoria.nome}</span>
                  <button
                    className={styles.botaoRegistrar}
                    onClick={() => setCategoriaParaApagar(categoria)}
                    title="Excluir categoria"
                    aria-label={`Excluir categoria ${categoria.nome}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </li>
              ))}
            </ul>

            <div className={styles.acoesModal}>
              <button
                className={styles.botaoCancelar}
                onClick={() => {
                  setModalCategorias(false)
                  setErroCategoria('')
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        aberto={despesaParaApagar !== null}
        titulo="Excluir gasto"
        mensagem={`Excluir o gasto "${despesaParaApagar?.descricao}"?`}
        carregando={excluindoDespesa}
        onConfirmar={() => despesaParaApagar && apagarDespesa(despesaParaApagar)}
        onCancelar={() => setDespesaParaApagar(null)}
      />

      <ConfirmDialog
        aberto={categoriaParaApagar !== null}
        titulo="Excluir categoria"
        mensagem={`Excluir a categoria "${categoriaParaApagar?.nome}"?`}
        carregando={excluindoCategoria}
        onConfirmar={() => categoriaParaApagar && apagarCategoria(categoriaParaApagar)}
        onCancelar={() => setCategoriaParaApagar(null)}
      />
    </div>
  )
}
