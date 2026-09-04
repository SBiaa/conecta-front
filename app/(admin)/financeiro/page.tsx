'use client'

import { useEffect, useState } from 'react'
import { CirclePlus } from 'lucide-react'
import { apiGet, apiPatch, apiPost } from '../../lib/api'
import {
  formatarMoeda,
  formatarData,
  formatarMes,
  mesAtualISO,
  dataHojeISO,
} from '../../lib/formato'
import ConfirmDialog from '../../components/ConfirmDialog'
import styles from './financeiro.module.css'

type Projeto = {
  id: string
  nome: string
}

type FormaPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO'

type TipoPagamento = 'MENSALIDADE' | 'INSCRICAO'

type ResumoFinanceiro = {
  entradas: { mensalidades: number; inscricoes: number; vendas: number; total: number }
  saidas: { total: number; porCategoria: { categoriaId: number; nome: string; total: number }[] }
  saldo: number
}

type Pagamento = {
  id: string
  tipo: TipoPagamento
  valor: string
  status: 'PAGA' | 'PENDENTE'
  vencimento: string
  dataPagamento: string | null
  formaPagamento: FormaPagamento | null
  matricula: {
    usuario: { nome: string }
    turmas: {
      nome: string
      projeto: { nome: string }
    }[]
  }
}

type Atrasado = {
  id: string
  tipo: TipoPagamento
  valor: string
  vencimento: string
  mesReferencia: string
  matricula: {
    usuario: { nome: string }
    turmas: {
      nome: string
      projeto: { nome: string }
    }[]
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

function descricaoTurmas(turmas: { nome: string; projeto: { nome: string } }[]) {
  const projeto = turmas[0]?.projeto.nome ?? ''
  const nomesTurmas = turmas.map((turma) => turma.nome).join(', ')
  return `${projeto} — ${nomesTurmas}`
}

export default function FinanceiroPage() {
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [modalGerarAberto, setModalGerarAberto] = useState(false)
  const [projetoId, setProjetoId] = useState('')
  const [mes, setMes] = useState('')
  const [vencimento, setVencimento] = useState('')

  const [erroValidacao, setErroValidacao] = useState('')
  const [gerando, setGerando] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')

  const [mesFiltro, setMesFiltro] = useState(mesAtualISO())
  const [projetoIdFiltro, setProjetoIdFiltro] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')
  const [nomeFiltro, setNomeFiltro] = useState('')
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

  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null)

  const [confirmandoGeracao, setConfirmandoGeracao] = useState(false)

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

  function buscarResumo() {
    return apiGet<ResumoFinanceiro>(`/financeiro/resumo?mes=${mesFiltro}`)
      .then(setResumo)
      .catch(() => setResumo(null))
  }

  useEffect(() => {
    buscarResumo()
  }, [mesFiltro])

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

  function abrirModalGerar() {
    setErroValidacao('')
    setSucesso('')
    setErro('')
    setModalGerarAberto(true)
  }

  function fecharModalGerar() {
    setModalGerarAberto(false)
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
      await Promise.all([buscarPagamentos(), buscarAtrasados(), buscarResumo()])
      fecharModalRegistro()
    } catch {
      setErroModalRegistro('Não foi possível registrar o pagamento')
    } finally {
      setEnviandoRegistro(false)
    }
  }

  function onSubmit(evento: React.FormEvent) {
    evento.preventDefault()

    setSucesso('')
    setErro('')

    if (!projetoId || !mes || !vencimento) {
      setErroValidacao('Preencha projeto, mês e vencimento')
      return
    }

    setErroValidacao('')
    setConfirmandoGeracao(true)
  }

  async function gerarMensalidades() {
    setGerando(true)
    try {
      const resultado = await apiPost<{ criados: unknown[]; pendentes: { matriculaId: number; nome: string }[] }>(
        '/pagamentos/gerar-mes',
        {
          projetoId: Number(projetoId),
          mesReferencia: mes,
          vencimento,
        }
      )
      const { criados, pendentes } = resultado
      let mensagem = `${criados.length} mensalidade${criados.length === 1 ? '' : 's'} gerada${
        criados.length === 1 ? '' : 's'
      }`
      if (pendentes.length > 0) {
        const LIMITE_NOMES = 8
        const nomes = pendentes.slice(0, LIMITE_NOMES).map((p) => p.nome).join(', ')
        const resto = pendentes.length - LIMITE_NOMES
        mensagem += `. ${pendentes.length} não gerada${pendentes.length === 1 ? '' : 's'} por falta de plano válido: ${nomes}${
          resto > 0 ? ` e mais ${resto}` : ''
        } — corrija o plano dessas matrículas e gere novamente.`
      }
      setSucesso(mensagem)
      await buscarPagamentos()
    } catch {
      setErro('Não foi possível gerar as mensalidades')
    } finally {
      setGerando(false)
      setConfirmandoGeracao(false)
    }
  }

  const pagamentosFiltrados = pagamentos.filter((pagamento) =>
    pagamento.matricula.usuario.nome.toLowerCase().includes(nomeFiltro.trim().toLowerCase())
  )

  const pagas = pagamentosFiltrados.filter((pagamento) => pagamento.status === 'PAGA')
  const pendentes = pagamentosFiltrados.filter((pagamento) => pagamento.status === 'PENDENTE')

  const projetoDaGeracao = projetos.find((item) => item.id === projetoId)

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
      <div className={styles.cabecalho}>
        <h1 className={styles.titulo}>Financeiro</h1>
        <button type="button" className={styles.botaoGerar} onClick={abrirModalGerar}>
          Gerar mensalidades
        </button>
      </div>

      <div className={styles.grid}>
        <div className={`${styles.card} ${styles.cardSecundario} ${styles.blocoResumo}`}>
          <h2 className={styles.subtituloSecundario}>Resumo do mês</h2>

          {!carregandoPagamentos && pagamentosFiltrados.length > 0 && (
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

          {resumo && (
            <div className={styles.resumoFormas}>
              <span className={styles.cardLabel}>Caixa do mês (tudo que entrou e saiu)</span>
              <ul className={styles.listaFormas}>
                <li className={styles.linhaForma}>
                  <span>Mensalidades recebidas</span>
                  <span>{formatarMoeda(resumo.entradas.mensalidades)}</span>
                </li>
                <li className={styles.linhaForma}>
                  <span>Inscrições recebidas</span>
                  <span>{formatarMoeda(resumo.entradas.inscricoes)}</span>
                </li>
                <li className={styles.linhaForma}>
                  <span>Vendas</span>
                  <span>{formatarMoeda(resumo.entradas.vendas)}</span>
                </li>
                <li className={styles.linhaForma}>
                  <span>Gastos</span>
                  <span className={styles.valorNegativo}>
                    − {formatarMoeda(resumo.saidas.total)}
                  </span>
                </li>
                <li className={`${styles.linhaForma} ${styles.linhaSaldo}`}>
                  <span>Saldo</span>
                  <span className={resumo.saldo < 0 ? styles.valorNegativo : styles.valorPositivo}>
                    {formatarMoeda(resumo.saldo)}
                  </span>
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className={`${styles.card} ${styles.cardDestaque} ${styles.blocoLista}`}>
          <h2 className={styles.subtitulo}>Pagamentos do mês</h2>

          <div className={styles.filtros}>
            <div className={styles.campo}>
              <label htmlFor="nomeFiltro">Buscar por nome</label>
              <input
                type="text"
                id="nomeFiltro"
                placeholder="Nome da aluna..."
                value={nomeFiltro}
                onChange={(evento) => setNomeFiltro(evento.target.value)}
              />
            </div>

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

          {!carregandoPagamentos && pagamentosFiltrados.length === 0 && (
            <p className={styles.mensagem}>Nenhum pagamento neste filtro</p>
          )}

          {!carregandoPagamentos && pagamentosFiltrados.length > 0 && (
            <ul className={styles.lista}>
              {pagamentosFiltrados.map((pagamento) => (
                <li key={pagamento.id} className={styles.item}>
                  <div className={styles.infoPagamento}>
                    <span className={styles.nomeUsuario}>
                      {pagamento.matricula.usuario.nome}
                      {pagamento.tipo === 'INSCRICAO' && (
                        <span className={styles.badgeTipo}>Inscrição</span>
                      )}
                    </span>
                    <span className={styles.detalhe}>
                      {descricaoTurmas(pagamento.matricula.turmas)}
                    </span>
                    <span className={styles.detalhe}>
                      {formatarMoeda(Number(pagamento.valor))}
                    </span>
                    {pagamento.formaPagamento && (
                      <span className={styles.detalhe}>
                        {LABELS_FORMA_PAGAMENTO[pagamento.formaPagamento]}
                      </span>
                    )}
                    {pagamento.status === 'PAGA' && pagamento.dataPagamento && (
                      <span className={styles.detalhe}>
                        Pago em {formatarData(pagamento.dataPagamento)}
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

        <div className={`${styles.card} ${styles.cardSecundario} ${styles.blocoAtrasados}`}>
          <h2 className={styles.subtituloSecundario}>Atrasados</h2>

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
                      {descricaoTurmas(atrasado.matricula.turmas)}
                    </span>
                    <span className={styles.detalhe}>{atrasado.mesReferencia}</span>
                    <span className={styles.detalhe}>
                      {formatarMoeda(Number(atrasado.valor))}
                    </span>
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
      </div>

      {modalGerarAberto && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitulo}>Gerar mensalidades</h2>

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
                <label htmlFor="vencimento">Vencimento</label>
                <input
                  type="date"
                  id="vencimento"
                  value={vencimento}
                  onChange={(evento) => setVencimento(evento.target.value)}
                />
              </div>

              {erroValidacao && <span className={styles.erro}>{erroValidacao}</span>}
              {sucesso && <p className={styles.sucesso}>{sucesso}</p>}
              {erro && <p className={styles.mensagemErro}>{erro}</p>}

              <div className={styles.acoesModal}>
                <button
                  type="button"
                  className={styles.botaoCancelar}
                  onClick={fecharModalGerar}
                  disabled={gerando}
                >
                  Fechar
                </button>
                <button className={styles.botaoConfirmar} disabled={gerando}>
                  {gerando ? 'Gerando...' : 'Gerar mensalidades'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      <ConfirmDialog
        aberto={confirmandoGeracao}
        titulo="Gerar mensalidades"
        mensagem={`Gerar mensalidades de ${formatarMes(mes)} para o projeto ${projetoDaGeracao?.nome ?? ''}? O valor de cada mensalidade é calculado a partir do plano de cada matrícula.`}
        confirmarLabel="Gerar"
        carregandoLabel="Gerando..."
        perigoso={false}
        carregando={gerando}
        onConfirmar={gerarMensalidades}
        onCancelar={() => setConfirmandoGeracao(false)}
      />
    </div>
  )
}
