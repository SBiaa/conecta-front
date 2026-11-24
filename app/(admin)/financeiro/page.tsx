'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CirclePlus, Pencil, TriangleAlert } from 'lucide-react'
import { apiGet, apiPost } from '../../lib/api'
import {
  formatarMoeda,
  formatarData,
  formatarMes,
  mesAtualISO,
  ultimoDiaDoMesISO,
} from '../../lib/formato'
import {
  LABELS_FORMA_PAGAMENTO,
  descricaoTurmas,
  mensagemDeErro,
  type FormaPagamento,
  type StatusPagamento,
} from '../../lib/admin-pagamentos'
import ConfirmDialog from '../../components/ConfirmDialog'
import ModalBase from '../../components/ModalBase'
import ModalRegistrarPagamento, {
  type PagamentoParaRegistrar,
} from '../../components/ModalRegistrarPagamento'
import ModalCorrigirPagamento, {
  type PagamentoParaCorrigir,
} from '../../components/ModalCorrigirPagamento'
import { useToast } from '../../components/Toast'
import styles from './financeiro.module.css'

type Projeto = {
  id: string
  nome: string
}

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
  status: StatusPagamento
  mesReferencia: string
  vencimento: string
  dataPagamento: string | null
  formaPagamento: FormaPagamento | null
  editadoEm: string | null
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
  valor: string
}

export default function FinanceiroPage() {
  const { avisar, toast } = useToast()

  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [modalGerarAberto, setModalGerarAberto] = useState(false)
  const [gerarAlterado, setGerarAlterado] = useState(false)
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
  const [erroPagamentos, setErroPagamentos] = useState('')

  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<PagamentoParaRegistrar | null>(null)
  const [pagamentoEditando, setPagamentoEditando] = useState<PagamentoParaCorrigir | null>(null)

  const [atrasados, setAtrasados] = useState<Atrasado[]>([])
  const [carregandoAtrasados, setCarregandoAtrasados] = useState(true)

  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null)

  const [confirmandoGeracao, setConfirmandoGeracao] = useState(false)

  useEffect(() => {
    apiGet<Projeto[]>('/projetos')
      .then(setProjetos)
      .catch(() => setProjetos([]))
  }, [])

  function buscarPagamentos() {
    setCarregandoPagamentos(true)
    setErroPagamentos('')
    const params = new URLSearchParams({ mes: mesFiltro })
    if (statusFiltro) params.set('status', statusFiltro)
    if (projetoIdFiltro) params.set('projetoId', projetoIdFiltro)

    return apiGet<Pagamento[]>(`/pagamentos?${params.toString()}`)
      .then(setPagamentos)
      .catch((e) => {
        setPagamentos([])
        setErroPagamentos(mensagemDeErro(e, 'Não foi possível carregar os pagamentos.'))
      })
      .finally(() => setCarregandoPagamentos(false))
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    buscarPagamentos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesFiltro, statusFiltro, projetoIdFiltro])

  function buscarResumo() {
    return apiGet<ResumoFinanceiro>(`/financeiro/resumo?mes=${mesFiltro}`)
      .then(setResumo)
      .catch(() => setResumo(null))
  }

  useEffect(() => {
    buscarResumo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesFiltro])

  function buscarAtrasados() {
    setCarregandoAtrasados(true)
    return apiGet<Atrasado[]>('/pagamentos/atrasados')
      .then(setAtrasados)
      .catch(() => setAtrasados([]))
      .finally(() => setCarregandoAtrasados(false))
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    buscarAtrasados()
  }, [])

  function recarregarTudo() {
    return Promise.all([buscarPagamentos(), buscarAtrasados(), buscarResumo()])
  }

  function abrirModalRegistro(pagamento: Pagamento) {
    setPagamentoSelecionado({
      id: pagamento.id,
      valor: pagamento.valor,
      nome: pagamento.matricula.usuario.nome,
      descricao: `${formatarMes(pagamento.mesReferencia)} — ${descricaoTurmas(pagamento.matricula.turmas)}`,
    })
  }

  function abrirModalEdicao(pagamento: Pagamento) {
    setPagamentoEditando({
      id: pagamento.id,
      valor: pagamento.valor,
      formaPagamento: pagamento.formaPagamento,
      mesReferencia: pagamento.mesReferencia,
      vencimento: pagamento.vencimento,
      dataPagamento: pagamento.dataPagamento,
      status: pagamento.status,
      nome: pagamento.matricula.usuario.nome,
    })
  }

  function abrirModalGerar() {
    // Já abre no mês e no projeto que a pessoa está olhando.
    setProjetoId(projetoIdFiltro)
    setMes(mesFiltro)
    setVencimento(mesFiltro ? ultimoDiaDoMesISO(mesFiltro) : '')
    setGerarAlterado(false)
    setErroValidacao('')
    setSucesso('')
    setErro('')
    setModalGerarAberto(true)
  }

  function trocarMesGerar(novo: string) {
    setMes(novo)
    setGerarAlterado(true)
    if (novo) setVencimento(ultimoDiaDoMesISO(novo))
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
      avisar(`${criados.length} mensalidade${criados.length === 1 ? '' : 's'} gerada${criados.length === 1 ? '' : 's'}`)
      // Se gerou para outro mês, leva a lista para lá (a mudança já recarrega).
      if (mes !== mesFiltro) setMesFiltro(mes)
      else await recarregarTudo()
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível gerar as mensalidades'))
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

  const porFormaPagamento = new Map<string, { total: number; quantidade: number }>()
  pagas.forEach((pagamento) => {
    const chave = pagamento.formaPagamento ?? 'Não informado'
    const atual = porFormaPagamento.get(chave) ?? { total: 0, quantidade: 0 }
    porFormaPagamento.set(chave, {
      total: atual.total + Number(pagamento.valor),
      quantidade: atual.quantidade + 1,
    })
  })

  const totalAtrasado = atrasados.reduce((soma, item) => soma + Number(item.valor), 0)
  const percentualRecebido = totalGeral > 0 ? Math.round((totalRecebido / totalGeral) * 100) : 0
  const maiorForma = Math.max(1, ...Array.from(porFormaPagamento.values()).map((f) => f.total))
  const mostrarNumeros = !carregandoPagamentos && !erroPagamentos

  return (
    <div className={styles.pagina}>
      <div className={styles.cabecalho}>
        <div className={styles.tituloComMes}>
          <h1 className={styles.titulo}>Financeiro</h1>
          <span className={styles.mesTitulo}>{formatarMes(mesFiltro)}</span>
        </div>
        <button type="button" className={styles.botaoGerar} onClick={abrirModalGerar}>
          Gerar mensalidades
        </button>
      </div>

      <div className={styles.numerosTopo}>
        <div className={styles.numeroCartao}>
          <span className={styles.cardLabel}>Recebido</span>
          <span className={`${styles.numeroGrande} ${styles.valorPositivo}`}>
            {mostrarNumeros ? formatarMoeda(totalRecebido) : '—'}
          </span>
          <span className={styles.numeroDetalhe}>{pagas.length} pagas</span>
        </div>
        <div className={styles.numeroCartao}>
          <span className={styles.cardLabel}>Pendente</span>
          <span className={`${styles.numeroGrande} ${styles.valorAtencao}`}>
            {mostrarNumeros ? formatarMoeda(totalPendente) : '—'}
          </span>
          <span className={styles.numeroDetalhe}>{pendentes.length} pendentes</span>
        </div>
        <div className={styles.numeroCartao}>
          <span className={styles.cardLabel}>Total do mês</span>
          <span className={styles.numeroGrande}>{mostrarNumeros ? formatarMoeda(totalGeral) : '—'}</span>
          <span
            className={styles.barraRecebido}
            role="img"
            aria-label={`${percentualRecebido}% do total já recebido`}
          >
            <span style={{ width: `${percentualRecebido}%` }} />
          </span>
        </div>
        <Link
          href="/financeiro/atrasados"
          className={`${styles.numeroCartao} ${atrasados.length > 0 ? styles.numeroAtrasados : ''}`}
        >
          <span className={styles.cardLabel}>
            {atrasados.length > 0 && <TriangleAlert size={14} aria-hidden="true" />} Atrasados
          </span>
          <span className={styles.numeroGrande}>
            {carregandoAtrasados ? '—' : formatarMoeda(totalAtrasado)}
          </span>
          <span className={styles.numeroDetalhe}>
            {atrasados.length === 0
              ? 'Nenhum atrasado'
              : `${atrasados.length} ${atrasados.length === 1 ? 'cobrança' : 'cobranças'} · ver e cobrar →`}
          </span>
        </Link>
      </div>

      <div className={styles.corpoFinanceiro}>
        <section className={`${styles.card} ${styles.cardTabela}`} aria-label={`Pagamentos de ${formatarMes(mesFiltro)}`}>
          <div className={styles.barraFiltros}>
            <div className={`${styles.campo} ${styles.campoBusca}`}>
              <label htmlFor="nomeFiltro">Buscar neste mês</label>
              <input
                type="search"
                id="nomeFiltro"
                placeholder="Nome da aluna"
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
                onChange={(evento) => evento.target.value && setMesFiltro(evento.target.value)}
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
              <span className={styles.rotuloGrupo} id="rotuloStatus">Status</span>
              <div className={styles.grupoStatus} role="group" aria-labelledby="rotuloStatus">
                {[
                  ['', 'Todos'],
                  ['PENDENTE', 'Pendentes'],
                  ['PAGA', 'Pagas'],
                  ['CANCELADA', 'Canceladas'],
                ].map(([valor, rotulo]) => (
                  <button
                    key={valor}
                    type="button"
                    aria-pressed={statusFiltro === valor}
                    className={`${styles.opcaoStatus} ${statusFiltro === valor ? styles.opcaoStatusAtiva : ''}`}
                    onClick={() => setStatusFiltro(valor)}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {carregandoPagamentos && <p className={styles.mensagemTabela}>Carregando...</p>}

          {!carregandoPagamentos && erroPagamentos && (
            <div className={`${styles.estadoErro} ${styles.mensagemTabela}`} role="alert">
              <p>{erroPagamentos}</p>
              <button type="button" className={styles.botaoSecundario} onClick={() => buscarPagamentos()}>
                Tentar de novo
              </button>
            </div>
          )}

          {!carregandoPagamentos && !erroPagamentos && pagamentosFiltrados.length === 0 && (
            <p className={styles.mensagemTabela}>Nenhum pagamento neste filtro</p>
          )}

          {!carregandoPagamentos && !erroPagamentos && pagamentosFiltrados.length > 0 && (
            <>
              <div className={styles.cabecalhoLinhas} aria-hidden="true">
                <span>Aluna</span>
                <span>Turma</span>
                <span>Valor</span>
                <span>Status</span>
                <span>Ações</span>
              </div>
              <ul className={`${styles.lista} ${styles.listaTabela}`}>
                {pagamentosFiltrados.map((pagamento) => (
                  <li key={pagamento.id} className={styles.linhaPagamento}>
                    <div className={styles.colNome}>
                      <span className={styles.nomeUsuario}>
                        {pagamento.matricula.usuario.nome}
                        {pagamento.tipo === 'INSCRICAO' && <span className={styles.badgeTipo}>Inscrição</span>}
                      </span>
                      <span className={styles.detalhe}>
                        {[
                          pagamento.formaPagamento && LABELS_FORMA_PAGAMENTO[pagamento.formaPagamento],
                          pagamento.status === 'PAGA' && pagamento.dataPagamento
                            ? `Pago em ${formatarData(pagamento.dataPagamento)}`
                            : pagamento.status === 'PENDENTE'
                              ? `Vence em ${formatarData(pagamento.vencimento)}`
                              : null,
                          pagamento.editadoEm ? `Corrigido em ${formatarData(pagamento.editadoEm)}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </div>
                    <span className={`${styles.detalhe} ${styles.colTurma}`}>
                      {descricaoTurmas(pagamento.matricula.turmas)}
                    </span>
                    <span className={styles.valorPagamento}>{formatarMoeda(Number(pagamento.valor))}</span>
                    <span className={styles.colStatus}>
                      {pagamento.status === 'PAGA' && (
                        <span className={`${styles.status} ${styles.statusPaga}`}>Paga</span>
                      )}
                      {pagamento.status === 'CANCELADA' && (
                        <span
                          className={`${styles.status} ${styles.statusCancelada}`}
                          title="Matrícula encerrada: esta cobrança não é mais cobrada"
                        >
                          Cancelada
                        </span>
                      )}
                      {pagamento.status === 'PENDENTE' && (
                        <span className={`${styles.status} ${styles.statusPendente}`}>Pendente</span>
                      )}
                    </span>
                    <div className={styles.acoesItem}>
                      {pagamento.status === 'PENDENTE' && (
                        <button
                          type="button"
                          className={styles.botaoRegistrarTexto}
                          onClick={() => abrirModalRegistro(pagamento)}
                          aria-label={`Registrar pagamento de ${pagamento.matricula.usuario.nome}`}
                        >
                          <CirclePlus size={18} aria-hidden="true" />
                          Registrar
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.botaoRegistrar}
                        onClick={() => abrirModalEdicao(pagamento)}
                        aria-label={`Corrigir pagamento de ${pagamento.matricula.usuario.nome}`}
                        title="Corrigir pagamento"
                      >
                        <Pencil size={18} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className={styles.rodapeTabela}>
                {pagamentosFiltrados.length} {pagamentosFiltrados.length === 1 ? 'cobrança' : 'cobranças'} em{' '}
                {formatarMes(mesFiltro)}
              </p>
            </>
          )}
        </section>

        <aside className={styles.colunaResumo}>
          <section className={`${styles.card} ${styles.cardLateral}`} aria-label="Recebido por forma de pagamento">
            <h2 className={styles.tituloLateral}>Recebido por forma</h2>
            {porFormaPagamento.size === 0 && <p className={styles.mensagem}>Nenhum pagamento pago neste filtro</p>}
            {Array.from(porFormaPagamento.entries())
              .sort((a, b) => b[1].total - a[1].total)
              .map(([forma, { total, quantidade }]) => (
                <div key={forma} className={styles.formaLinha}>
                  <div className={styles.formaTexto}>
                    <span>{LABELS_FORMA_PAGAMENTO[forma as FormaPagamento] ?? forma}</span>
                    <strong>
                      {forma === 'ABONADO'
                        ? `${quantidade} aluna${quantidade === 1 ? '' : 's'}`
                        : formatarMoeda(total)}
                    </strong>
                  </div>
                  {forma !== 'ABONADO' && (
                    <span className={styles.formaBarra} aria-hidden="true">
                      <span style={{ width: `${Math.round((total / maiorForma) * 100)}%` }} />
                    </span>
                  )}
                </div>
              ))}
          </section>

          {resumo && (
            <section className={`${styles.card} ${styles.cardLateral}`} aria-label="Caixa do mês">
              <h2 className={styles.tituloLateral}>Caixa do mês</h2>
              <ul className={styles.listaFormas}>
                <li className={styles.linhaForma}>
                  <span>Mensalidades</span>
                  <span>{formatarMoeda(resumo.entradas.mensalidades)}</span>
                </li>
                <li className={styles.linhaForma}>
                  <span>Inscrições</span>
                  <span>{formatarMoeda(resumo.entradas.inscricoes)}</span>
                </li>
                <li className={styles.linhaForma}>
                  <span>Vendas</span>
                  <span>{formatarMoeda(resumo.entradas.vendas)}</span>
                </li>
                <li className={styles.linhaForma}>
                  <span>Gastos</span>
                  <span className={styles.valorNegativo}>− {formatarMoeda(resumo.saidas.total)}</span>
                </li>
                <li className={`${styles.linhaForma} ${styles.linhaSaldo}`}>
                  <span>Saldo</span>
                  <span className={resumo.saldo < 0 ? styles.valorNegativo : styles.valorPositivo}>
                    {formatarMoeda(resumo.saldo)}
                  </span>
                </li>
              </ul>
              <span className={styles.numeroDetalhe}>Tudo que entrou e saiu no mês, de todos os projetos</span>
            </section>
          )}
        </aside>
      </div>

      {modalGerarAberto && (
        <ModalBase
          titulo="Gerar mensalidades"
          onFechar={() => setModalGerarAberto(false)}
          sujo={gerarAlterado && !sucesso}
          escAtivo={!confirmandoGeracao}
        >
          <form onSubmit={onSubmit}>
            <div className={styles.campo}>
              <label htmlFor="projetoId">Projeto</label>
              <select
                id="projetoId"
                value={projetoId}
                onChange={(evento) => {
                  setProjetoId(evento.target.value)
                  setGerarAlterado(true)
                }}
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
              <input type="month" id="mes" value={mes} onChange={(evento) => trocarMesGerar(evento.target.value)} />
            </div>

            <div className={styles.campo}>
              <label htmlFor="vencimento">Vencimento</label>
              <input
                type="date"
                id="vencimento"
                value={vencimento}
                onChange={(evento) => {
                  setVencimento(evento.target.value)
                  setGerarAlterado(true)
                }}
              />
            </div>

            {erroValidacao && <span className={styles.erro}>{erroValidacao}</span>}
            {sucesso && <p className={styles.sucesso}>{sucesso}</p>}
            {erro && <p className={styles.mensagemErro}>{erro}</p>}

            <div className={styles.acoesModal}>
              <button
                type="button"
                className={styles.botaoCancelar}
                onClick={() => setModalGerarAberto(false)}
                disabled={gerando}
              >
                Fechar
              </button>
              <button className={styles.botaoConfirmar} disabled={gerando}>
                {gerando ? 'Gerando...' : 'Gerar mensalidades'}
              </button>
            </div>
          </form>
        </ModalBase>
      )}

      <ModalRegistrarPagamento
        pagamento={pagamentoSelecionado}
        onFechar={() => setPagamentoSelecionado(null)}
        onRegistrado={async () => {
          avisar('Pagamento registrado')
          await recarregarTudo()
        }}
      />

      <ModalCorrigirPagamento
        pagamento={pagamentoEditando}
        onFechar={() => setPagamentoEditando(null)}
        onSalvo={async (acao) => {
          avisar(acao === 'desfeito' ? 'Pagamento desfeito' : 'Correção salva')
          await recarregarTudo()
        }}
      />

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

      {toast}
    </div>
  )
}
