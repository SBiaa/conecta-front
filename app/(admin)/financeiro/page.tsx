'use client'

import { useEffect, useState } from 'react'
import { CirclePlus } from 'lucide-react'
import { apiGet, apiPatch, apiPost } from '../../lib/api'
import styles from './financeiro.module.css'

type Projeto = {
  id: string
  nome: string
}

type FormaPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO'

type Pagamento = {
  id: string
  valor: string
  status: 'PAGA' | 'PENDENTE'
  vencimento: string
  formaPagamento: FormaPagamento | null
  matricula: {
    usuario: { nome: string }
    turma: {
      nome: string
      projeto: { nome: string }
    }
  }
}

type Atrasado = {
  id: string
  valor: string
  vencimento: string
  mesReferencia: string
  matricula: {
    usuario: { nome: string }
    turma: {
      nome: string
      projeto: { nome: string }
    }
  }
}

type PagamentoParaRegistrar = {
  id: string
  valor: string
  matricula: { usuario: { nome: string } }
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

function dataHojeISO() {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(data: string) {
  return new Date(data).toLocaleDateString('pt-BR')
}

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

function formatarMes(mes: string) {
  const [ano, mesNumero] = mes.split('-')
  return `${NOMES_MESES[Number(mesNumero) - 1]} ${ano}`
}

export default function FinanceiroPage() {
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [projetoId, setProjetoId] = useState('')
  const [mes, setMes] = useState('')
  const [valor, setValor] = useState('')
  const [vencimento, setVencimento] = useState('')

  const [erroValidacao, setErroValidacao] = useState('')
  const [gerando, setGerando] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')

  const [mesFiltro, setMesFiltro] = useState(mesAtualISO())
  const [projetoIdFiltro, setProjetoIdFiltro] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [carregandoPagamentos, setCarregandoPagamentos] = useState(true)

  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<PagamentoParaRegistrar | null>(
    null
  )
  const [formaPagamentoModal, setFormaPagamentoModal] = useState<FormaPagamento>('DINHEIRO')
  const [dataPagamentoModal, setDataPagamentoModal] = useState('')
  const [valorModal, setValorModal] = useState('')
  const [enviandoRegistro, setEnviandoRegistro] = useState(false)
  const [erroModalRegistro, setErroModalRegistro] = useState('')

  const [atrasados, setAtrasados] = useState<Atrasado[]>([])
  const [carregandoAtrasados, setCarregandoAtrasados] = useState(true)

  useEffect(() => {
    apiGet<Projeto[]>('/projetos').then(setProjetos)
  }, [])

  function buscarPagamentos() {
    setCarregandoPagamentos(true)
    const params = new URLSearchParams({ mes: mesFiltro })
    if (statusFiltro) params.set('status', statusFiltro)
    if (projetoIdFiltro) params.set('projetoId', projetoIdFiltro)

    return apiGet<Pagamento[]>(`/pagamentos?${params.toString()}`)
      .then(setPagamentos)
      .finally(() => setCarregandoPagamentos(false))
  }

  useEffect(() => {
    buscarPagamentos()
  }, [mesFiltro, statusFiltro, projetoIdFiltro])

  function buscarAtrasados() {
    setCarregandoAtrasados(true)
    return apiGet<Atrasado[]>('/pagamentos/atrasados')
      .then(setAtrasados)
      .finally(() => setCarregandoAtrasados(false))
  }

  useEffect(() => {
    buscarAtrasados()
  }, [])

  function abrirModalRegistro(pagamento: PagamentoParaRegistrar) {
    setPagamentoSelecionado(pagamento)
    setFormaPagamentoModal('DINHEIRO')
    setDataPagamentoModal(dataHojeISO())
    setValorModal(pagamento.valor)
    setErroModalRegistro('')
  }

  function fecharModalRegistro() {
    setPagamentoSelecionado(null)
  }

  async function confirmarRegistro() {
    if (!pagamentoSelecionado) return

    setEnviandoRegistro(true)
    setErroModalRegistro('')
    try {
      await apiPatch(`/pagamentos/${pagamentoSelecionado.id}/pagar`, {
        dataPagamento: dataPagamentoModal,
        formaPagamento: formaPagamentoModal,
        valor: Number(valorModal),
      })
      await Promise.all([buscarPagamentos(), buscarAtrasados()])
      fecharModalRegistro()
    } catch {
      setErroModalRegistro('Não foi possível registrar o pagamento')
    } finally {
      setEnviandoRegistro(false)
    }
  }

  async function onSubmit(evento: React.FormEvent) {
    evento.preventDefault()

    setSucesso('')
    setErro('')

    if (!projetoId || !mes || !valor || !vencimento) {
      setErroValidacao('Preencha projeto, mês, valor e vencimento')
      return
    }

    setErroValidacao('')

    const projeto = projetos.find((item) => item.id === projetoId)
    const confirmado = window.confirm(
      `Gerar mensalidades de ${formatarMes(mes)} para o projeto ${projeto?.nome ?? ''}?`
    )

    if (!confirmado) return

    setGerando(true)
    try {
      const criados = await apiPost<unknown[]>('/pagamentos/gerar-mes', {
        projetoId: Number(projetoId),
        mesReferencia: mes,
        valor: Number(valor),
        vencimento,
      })
      setSucesso(
        `${criados.length} mensalidade${criados.length === 1 ? '' : 's'} gerada${
          criados.length === 1 ? '' : 's'
        }`
      )
    } catch {
      setErro('Não foi possível gerar as mensalidades')
    } finally {
      setGerando(false)
    }
  }

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
      <h1 className={styles.titulo}>Financeiro</h1>

      <div className={styles.card}>
        <h2 className={styles.subtitulo}>Gerar mensalidades</h2>

        <form onSubmit={onSubmit}>
          <div className={styles.campo}>
            <label htmlFor="projetoId">Projeto</label>
            <select
              id="projetoId"
              value={projetoId}
              onChange={(evento) => setProjetoId(evento.target.value)}
            >
              <option value="">Selecione...</option>
              {projetos.map((projeto) => (
                <option key={projeto.id} value={projeto.id}>
                  {projeto.nome}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.campo}>
            <label htmlFor="mes">Mês</label>
            <input
              type="month"
              id="mes"
              value={mes}
              onChange={(evento) => setMes(evento.target.value)}
            />
          </div>

          <div className={styles.campo}>
            <label htmlFor="valor">Valor</label>
            <input
              type="number"
              id="valor"
              value={valor}
              onChange={(evento) => setValor(evento.target.value)}
            />
          </div>

          <div className={styles.campo}>
            <label htmlFor="vencimento">Vencimento</label>
            <input
              type="date"
              id="vencimento"
              value={vencimento}
              onChange={(evento) => setVencimento(evento.target.value)}
            />
          </div>

          {erroValidacao && <span className={styles.erro}>{erroValidacao}</span>}

          <button className={styles.botao} disabled={gerando}>
            {gerando ? 'Gerando...' : 'Gerar mensalidades'}
          </button>
        </form>

        {sucesso && <p className={styles.sucesso}>{sucesso}</p>}
        {erro && <p className={styles.mensagemErro}>{erro}</p>}
      </div>

      <div className={styles.card}>
        <h2 className={styles.subtitulo}>Pagamentos do mês</h2>

        {!carregandoPagamentos && pagamentos.length > 0 && (
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

            <div className={styles.resumoFormas}>
              <span className={styles.cardLabel}>Recebido por forma de pagamento</span>
              {porFormaPagamento.size === 0 && (
                <p className={styles.mensagem}>Nenhum pagamento pago neste filtro</p>
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
          </>
        )}

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
            <label htmlFor="projetoIdFiltro">Projeto</label>
            <select
              id="projetoIdFiltro"
              value={projetoIdFiltro}
              onChange={(evento) => setProjetoIdFiltro(evento.target.value)}
            >
              <option value="">Todos</option>
              {projetos.map((projeto) => (
                <option key={projeto.id} value={projeto.id}>
                  {projeto.nome}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.campo}>
            <label htmlFor="statusFiltro">Status</label>
            <select
              id="statusFiltro"
              value={statusFiltro}
              onChange={(evento) => setStatusFiltro(evento.target.value)}
            >
              <option value="">Todos</option>
              <option value="PENDENTE">Pendente</option>
              <option value="PAGA">Paga</option>
            </select>
          </div>
        </div>

        {carregandoPagamentos && <p className={styles.mensagem}>Carregando...</p>}

        {!carregandoPagamentos && pagamentos.length === 0 && (
          <p className={styles.mensagem}>Nenhum pagamento neste filtro</p>
        )}

        {!carregandoPagamentos && pagamentos.length > 0 && (
          <ul className={styles.lista}>
            {pagamentos.map((pagamento) => (
              <li key={pagamento.id} className={styles.item}>
                <div className={styles.infoPagamento}>
                  <span className={styles.nomeUsuario}>{pagamento.matricula.usuario.nome}</span>
                  <span className={styles.detalhe}>
                    {pagamento.matricula.turma.projeto.nome} — {pagamento.matricula.turma.nome}
                  </span>
                  <span className={styles.detalhe}>{formatarMoeda(Number(pagamento.valor))}</span>
                  {pagamento.formaPagamento && (
                    <span className={styles.detalhe}>
                      {LABELS_FORMA_PAGAMENTO[pagamento.formaPagamento]}
                    </span>
                  )}
                </div>
                <div className={styles.acoesItem}>
                  {pagamento.status === 'PAGA' && (
                    <span className={`${styles.status} ${styles.statusPaga}`}>Paga</span>
                  )}
                  {pagamento.status === 'PENDENTE' && (
                    <>
                      <span className={`${styles.status} ${styles.statusPendente}`}>
                        Pendente
                      </span>
                      <button
                        className={styles.botaoRegistrar}
                        onClick={() => abrirModalRegistro(pagamento)}
                        aria-label="Registrar pagamento"
                        title="Registrar pagamento"
                      >
                        <CirclePlus size={20} />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.card}>
        <h2 className={styles.subtitulo}>Atrasados</h2>

        {carregandoAtrasados && <p className={styles.mensagem}>Carregando...</p>}

        {!carregandoAtrasados && atrasados.length === 0 && (
          <p className={styles.mensagem}>Nenhum pagamento atrasado</p>
        )}

        {!carregandoAtrasados && atrasados.length > 0 && (
          <ul className={styles.lista}>
            {atrasados.map((atrasado) => (
              <li key={atrasado.id} className={styles.item}>
                <div className={styles.infoPagamento}>
                  <span className={styles.nomeUsuario}>{atrasado.matricula.usuario.nome}</span>
                  <span className={styles.detalhe}>
                    {atrasado.matricula.turma.projeto.nome} — {atrasado.matricula.turma.nome}
                  </span>
                  <span className={styles.detalhe}>{atrasado.mesReferencia}</span>
                  <span className={styles.detalhe}>{formatarMoeda(Number(atrasado.valor))}</span>
                  <span className={styles.vencimentoAtrasado}>
                    Venceu em {formatarData(atrasado.vencimento)}
                  </span>
                </div>
                <div className={styles.acoesItem}>
                  <button
                    className={styles.botaoRegistrar}
                    onClick={() => abrirModalRegistro(atrasado)}
                    aria-label="Registrar pagamento"
                    title="Registrar pagamento"
                  >
                    <CirclePlus size={20} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pagamentoSelecionado && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitulo}>
              Registrar pagamento — {pagamentoSelecionado.matricula.usuario.nome}
            </h2>

            <div className={styles.campo}>
              <label htmlFor="formaPagamentoModal">Forma de pagamento</label>
              <select
                id="formaPagamentoModal"
                value={formaPagamentoModal}
                onChange={(evento) =>
                  setFormaPagamentoModal(evento.target.value as FormaPagamento)
                }
              >
                <option value="DINHEIRO">Dinheiro</option>
                <option value="PIX">Pix</option>
                <option value="CARTAO">Cartão</option>
              </select>
            </div>

            <div className={styles.campo}>
              <label htmlFor="dataPagamentoModal">Data do pagamento</label>
              <input
                type="date"
                id="dataPagamentoModal"
                value={dataPagamentoModal}
                onChange={(evento) => setDataPagamentoModal(evento.target.value)}
              />
            </div>

            <div className={styles.campo}>
              <label htmlFor="valorModal">Valor</label>
              <input
                type="number"
                id="valorModal"
                value={valorModal}
                onChange={(evento) => setValorModal(evento.target.value)}
              />
            </div>

            {erroModalRegistro && <p className={styles.erroModal}>{erroModalRegistro}</p>}

            <div className={styles.acoesModal}>
              <button
                className={styles.botaoCancelar}
                onClick={fecharModalRegistro}
                disabled={enviandoRegistro}
              >
                Cancelar
              </button>
              <button
                className={styles.botaoConfirmar}
                onClick={confirmarRegistro}
                disabled={enviandoRegistro}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
