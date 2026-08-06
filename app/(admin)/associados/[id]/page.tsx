'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { CirclePlus, Pencil, KeyRound, Eye, EyeOff, MessageCircle } from 'lucide-react'
import { apiGet, apiPatch } from '../../../lib/api'
import { montarMensagemAcesso, montarLinkWhatsapp, type AcessoGerado } from '../../../lib/acesso'
import SeletorTurmasSemana, {
  chaveDiaSelecao,
  agruparSelecoesPorTurma,
} from '../../../components/SeletorTurmasSemana'
import styles from './perfil.module.css'

const FLORES = [
  'girassol', 'violeta', 'jasmim', 'margarida', 'orquidea',
  'tulipa', 'rosa', 'lirio', 'camelia', 'hortensia',
]

function gerarSenhaSugerida() {
  const flor = FLORES[Math.floor(Math.random() * FLORES.length)]
  const digitos = String(Math.floor(Math.random() * 100)).padStart(2, '0')
  return `${flor}${digitos}`
}

type FormaPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO'

type Matricula = {
  id: string
  ativa: boolean
  dataInicio: string
  exameMedico: 'APTO' | 'NAO_APTO' | 'AGUARDANDO' | null
  frequenciaSemanal: number | null
  turmas: {
    id: string
    nome: string
    horario: string | null
    dias: string[]
    diasContratados: string[]
    projeto: { id: string; nome: string }
  }[]
}

type Associado = {
  id: string
  nome: string
  cpf: string
  email: string | null
  telefone: string | null
  status: 'ATIVO' | 'INATIVO'
  rg: string | null
  dataNascimento: string | null
  tomaMedicamento: boolean | null
  qualMedicamento: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  matriculas: Matricula[]
}

type Pagamento = {
  id: string
  valor: string
  status: 'PAGA' | 'PENDENTE'
  mesReferencia: string
  vencimento: string
  formaPagamento: FormaPagamento | null
  matricula: {
    usuario: { nome: string }
    turmas: { nome: string; diasContratados: string[]; projeto: { nome: string } }[]
  }
}

type PagamentoParaRegistrar = {
  id: string
  valor: string
}

type TurmaOpcao = {
  id: string
  nome: string
  horario: string | null
  dias: string[]
}

const PLANOS = [
  { frequencia: 2, valor: 85 },
  { frequencia: 3, valor: 120 },
  { frequencia: 4, valor: 160 },
]

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const LABELS_DIA: Record<string, string> = {
  SEGUNDA: 'Seg',
  TERCA: 'Ter',
  QUARTA: 'Qua',
  QUINTA: 'Qui',
  SEXTA: 'Sex',
  SABADO: 'Sáb',
  DOMINGO: 'Dom',
}

const LABELS_EXAME: Record<string, string> = {
  APTO: 'Apto',
  NAO_APTO: 'Não apto',
  AGUARDANDO: 'Aguardando',
}

const LABELS_FORMA: Record<FormaPagamento, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  CARTAO: 'Cartão',
}

function formatarMes(mes: string) {
  const [ano, mesNumero] = mes.split('-')
  return `${NOMES_MESES[Number(mesNumero) - 1]} ${ano}`
}

function formatarData(data: string | null) {
  if (!data) return '—'
  const d = new Date(data)
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${d.getUTCFullYear()}`
}

function formatarMoeda(valor: string) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function dataHojeISO() {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function montarEndereco(a: Associado): string | null {
  const partes: string[] = []
  if (a.logradouro) {
    let linha = a.logradouro
    if (a.numero) linha += `, ${a.numero}`
    if (a.complemento) linha += ` — ${a.complemento}`
    partes.push(linha)
  }
  if (a.bairro) partes.push(a.bairro)
  if (a.cidade || a.uf) {
    partes.push([a.cidade, a.uf].filter(Boolean).join('/'))
  }
  if (a.cep) partes.push(`CEP ${a.cep}`)
  return partes.length > 0 ? partes.join(', ') : null
}

export default function PerfilAssociadoPage() {
  const { id } = useParams<{ id: string }>()

  const [associado, setAssociado] = useState<Associado | null>(null)
  const [carregandoAssociado, setCarregandoAssociado] = useState(true)
  const [erroAssociado, setErroAssociado] = useState('')

  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [carregandoPagamentos, setCarregandoPagamentos] = useState(true)

  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<PagamentoParaRegistrar | null>(null)
  const [formaPagamentoModal, setFormaPagamentoModal] = useState<FormaPagamento>('DINHEIRO')
  const [dataPagamentoModal, setDataPagamentoModal] = useState('')
  const [valorModal, setValorModal] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erroModal, setErroModal] = useState('')

  const [modalSenhaAberto, setModalSenhaAberto] = useState(false)
  const [novaSenhaInput, setNovaSenhaInput] = useState('')
  const [mostrarSenhaInput, setMostrarSenhaInput] = useState(false)
  const [enviandoSenha, setEnviandoSenha] = useState(false)
  const [erroSenha, setErroSenha] = useState('')
  const [senhaSalva, setSenhaSalva] = useState<string | null>(null)
  const [senhaCopiada, setSenhaCopiada] = useState(false)

  const [acessoParaEnviar, setAcessoParaEnviar] = useState<AcessoGerado | null>(null)
  const [acessoCopiado, setAcessoCopiado] = useState(false)
  const [gerandoAcesso, setGerandoAcesso] = useState(false)
  const [erroAcesso, setErroAcesso] = useState('')

  const [matriculaParaEditar, setMatriculaParaEditar] = useState<Matricula | null>(null)
  const [turmasModal, setTurmasModal] = useState<TurmaOpcao[]>([])
  const [carregandoTurmasModal, setCarregandoTurmasModal] = useState(false)
  const [exameModal, setExameModal] = useState('AGUARDANDO')
  const [ativaModal, setAtivaModal] = useState(true)
  const [diaSelecoesModal, setDiaSelecoesModal] = useState<string[]>([])
  const [frequenciaModal, setFrequenciaModal] = useState<number | ''>('')
  const [enviandoEdicao, setEnviandoEdicao] = useState(false)
  const [erroModalEdicao, setErroModalEdicao] = useState('')

  function buscarAssociado() {
    return apiGet<Associado>(`/usuarios/${id}`)
      .then(setAssociado)
      .catch(() => setErroAssociado('Associado não encontrado'))
  }

  useEffect(() => {
    setCarregandoAssociado(true)
    buscarAssociado().finally(() => setCarregandoAssociado(false))
  }, [id])

  function buscarPagamentos() {
    setCarregandoPagamentos(true)
    return apiGet<Pagamento[]>(`/pagamentos?usuarioId=${id}`)
      .then(setPagamentos)
      .finally(() => setCarregandoPagamentos(false))
  }

  useEffect(() => {
    buscarPagamentos()
  }, [id])

  function abrirModal(pagamento: PagamentoParaRegistrar) {
    setPagamentoSelecionado(pagamento)
    setFormaPagamentoModal('DINHEIRO')
    setDataPagamentoModal(dataHojeISO())
    setValorModal(pagamento.valor)
    setErroModal('')
  }

  function fecharModal() {
    setPagamentoSelecionado(null)
  }

  async function confirmarRegistro() {
    if (!pagamentoSelecionado) return
    setEnviando(true)
    setErroModal('')
    try {
      await apiPatch(`/pagamentos/${pagamentoSelecionado.id}/pagar`, {
        dataPagamento: dataPagamentoModal,
        formaPagamento: formaPagamentoModal,
        valor: Number(valorModal),
      })
      await buscarPagamentos()
      fecharModal()
    } catch {
      setErroModal('Não foi possível registrar o pagamento')
    } finally {
      setEnviando(false)
    }
  }

  function abrirModalSenha() {
    setNovaSenhaInput('')
    setMostrarSenhaInput(false)
    setErroSenha('')
    setModalSenhaAberto(true)
  }

  function fecharModalSenha() {
    setModalSenhaAberto(false)
  }

  function preencherSenhaSugerida() {
    setNovaSenhaInput(gerarSenhaSugerida())
    setMostrarSenhaInput(true)
  }

  async function confirmarSenha() {
    setEnviandoSenha(true)
    setErroSenha('')
    try {
      const resposta = await apiPatch<{ senha: string }>(`/usuarios/${id}/senha`, {
        novaSenha: novaSenhaInput || undefined,
      })
      setSenhaSalva(resposta.senha)
      setSenhaCopiada(false)
      fecharModalSenha()
    } catch {
      setErroSenha('Não foi possível alterar a senha')
    } finally {
      setEnviandoSenha(false)
    }
  }

  function copiarSenhaSalva() {
    if (!senhaSalva) return
    navigator.clipboard.writeText(senhaSalva)
    setSenhaCopiada(true)
  }

  function dispensarSenhaSalva() {
    setSenhaSalva(null)
    setSenhaCopiada(false)
  }

  async function abrirAcesso() {
    if (!associado) return
    setErroAcesso('')

    if (senhaSalva) {
      setAcessoParaEnviar({
        nome: associado.nome,
        cpf: associado.cpf,
        senha: senhaSalva,
        telefone: associado.telefone,
      })
      setAcessoCopiado(false)
      return
    }

    // Não há como recuperar a senha atual (fica só o hash), então geramos
    // uma nova senha real para poder mandar no acesso.
    setGerandoAcesso(true)
    try {
      const resposta = await apiPatch<{ senha: string }>(`/usuarios/${id}/senha`, {})
      setSenhaSalva(resposta.senha)
      setAcessoParaEnviar({
        nome: associado.nome,
        cpf: associado.cpf,
        senha: resposta.senha,
        telefone: associado.telefone,
      })
      setAcessoCopiado(false)
    } catch {
      setErroAcesso('Não foi possível gerar a senha de acesso')
    } finally {
      setGerandoAcesso(false)
    }
  }

  function fecharAcesso() {
    setAcessoParaEnviar(null)
    setAcessoCopiado(false)
  }

  function copiarMensagemAcesso() {
    if (!acessoParaEnviar) return
    navigator.clipboard.writeText(
      montarMensagemAcesso(
        acessoParaEnviar,
        `Olá, ${acessoParaEnviar.nome}! Aqui estão seus dados de acesso à Conecta.`
      )
    )
    setAcessoCopiado(true)
  }

  function abrirModalEdicao(matricula: Matricula) {
    setMatriculaParaEditar(matricula)
    setExameModal(matricula.exameMedico ?? 'AGUARDANDO')
    setAtivaModal(matricula.ativa)
    setDiaSelecoesModal(
      matricula.turmas.flatMap((turma) =>
        turma.diasContratados.map((dia) => chaveDiaSelecao(turma.id, dia))
      )
    )
    setFrequenciaModal(matricula.frequenciaSemanal ?? '')
    setErroModalEdicao('')
    setTurmasModal([])
    setCarregandoTurmasModal(true)
    const projetoId = matricula.turmas[0]?.projeto.id
    apiGet<TurmaOpcao[]>(`/turmas?projetoId=${projetoId ?? ''}`)
      .then(setTurmasModal)
      .finally(() => setCarregandoTurmasModal(false))
  }

  function fecharModalEdicao() {
    setMatriculaParaEditar(null)
  }

  function alternarDiaModal(chave: string) {
    setDiaSelecoesModal((atual) =>
      atual.includes(chave) ? atual.filter((item) => item !== chave) : [...atual, chave]
    )
  }

  const totalDiasModal = diaSelecoesModal.length

  async function confirmarEdicao() {
    if (!matriculaParaEditar) return

    if (!frequenciaModal || diaSelecoesModal.length === 0) {
      setErroModalEdicao('Escolha o plano e ao menos um dia')
      return
    }

    if (totalDiasModal !== frequenciaModal) {
      setErroModalEdicao(
        `A quantidade de dias escolhidos (${totalDiasModal}) precisa bater com o plano (${frequenciaModal} aulas)`
      )
      return
    }

    setEnviandoEdicao(true)
    setErroModalEdicao('')
    try {
      await apiPatch(`/matriculas/${matriculaParaEditar.id}`, {
        exameMedico: exameModal,
        ativa: ativaModal,
        turmas: agruparSelecoesPorTurma(diaSelecoesModal),
        frequenciaSemanal: frequenciaModal,
      })
      await buscarAssociado()
      fecharModalEdicao()
    } catch {
      setErroModalEdicao('Não foi possível salvar a matrícula')
    } finally {
      setEnviandoEdicao(false)
    }
  }

  if (carregandoAssociado) {
    return <div className={styles.pagina}><p className={styles.mensagem}>Carregando...</p></div>
  }

  if (erroAssociado || !associado) {
    return <div className={styles.pagina}><p className={styles.erro}>{erroAssociado || 'Erro ao carregar associado'}</p></div>
  }

  const endereco = montarEndereco(associado)

  return (
    <div className={styles.pagina}>
      <h1 className={styles.titulo}>{associado.nome}</h1>

      {/* Bloco 1 — Dados pessoais */}
      <div className={styles.card}>
        <div className={styles.cabecalhoSecao}>
          <h2 className={styles.subtitulo}>Dados pessoais</h2>
          <div className={styles.botoesSenha}>
            <button className={styles.botaoAlterarSenha} onClick={abrirModalSenha}>
              <KeyRound size={14} />
              Alterar senha
            </button>
            <button
              className={styles.botaoEnviarAcesso}
              onClick={abrirAcesso}
              disabled={gerandoAcesso}
            >
              <MessageCircle size={14} />
              {gerandoAcesso ? 'Gerando...' : 'Enviar acesso'}
            </button>
          </div>
        </div>

        {erroAcesso && <p className={styles.erro}>{erroAcesso}</p>}

        {senhaSalva && (
          <div className={styles.avisoSenha}>
            <p className={styles.avisoSenhaTexto}>
              Senha alterada! Nova senha de acesso:{' '}
              <span className={styles.avisoSenhaValor}>{senhaSalva}</span> — anote e entregue à
              associada.
            </p>
            <div className={styles.avisoSenhaAcoes}>
              <button type="button" className={styles.avisoSenhaCopiar} onClick={copiarSenhaSalva}>
                {senhaCopiada ? 'Copiado!' : 'Copiar senha'}
              </button>
              <button type="button" className={styles.avisoSenhaDispensar} onClick={dispensarSenhaSalva}>
                Dispensar
              </button>
            </div>
          </div>
        )}

        {acessoParaEnviar && (
          <div className={styles.avisoSenha}>
            <p className={styles.avisoSenhaTexto}>Envie a mensagem abaixo para a associada.</p>
            <pre className={styles.mensagemAcesso}>
              {montarMensagemAcesso(
                acessoParaEnviar,
                `Olá, ${acessoParaEnviar.nome}! Aqui estão seus dados de acesso à Conecta.`
              )}
            </pre>
            <div className={styles.avisoSenhaAcoes}>
              <a
                className={styles.avisoSenhaWhatsapp}
                href={montarLinkWhatsapp(
                  acessoParaEnviar,
                  `Olá, ${acessoParaEnviar.nome}! Aqui estão seus dados de acesso à Conecta.`
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                Enviar no WhatsApp
              </a>
              <button type="button" className={styles.avisoSenhaCopiar} onClick={copiarMensagemAcesso}>
                {acessoCopiado ? 'Copiado!' : 'Copiar mensagem'}
              </button>
            </div>
            <div className={styles.avisoSenhaAcoesSecundarias}>
              <button type="button" className={styles.avisoSenhaDispensar} onClick={fecharAcesso}>
                Dispensar
              </button>
            </div>
          </div>
        )}

        <dl className={styles.grade}>
          <div className={styles.campo}>
            <dt>CPF</dt>
            <dd>{associado.cpf}</dd>
          </div>
          <div className={styles.campo}>
            <dt>Telefone</dt>
            <dd>{associado.telefone || '—'}</dd>
          </div>
          <div className={styles.campo}>
            <dt>RG</dt>
            <dd>{associado.rg || '—'}</dd>
          </div>
          <div className={styles.campo}>
            <dt>Data de nascimento</dt>
            <dd>{formatarData(associado.dataNascimento)}</dd>
          </div>
          <div className={`${styles.campo} ${styles.campoLargo}`}>
            <dt>Endereço</dt>
            <dd>{endereco || '—'}</dd>
          </div>
          <div className={`${styles.campo} ${styles.campoLargo}`}>
            <dt>Medicamento</dt>
            <dd>
              {associado.tomaMedicamento === true
                ? `Toma medicamento: ${associado.qualMedicamento || '—'}`
                : associado.tomaMedicamento === false
                ? 'Não toma medicamento'
                : '—'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Bloco 2 — Matrículas */}
      <div className={styles.card}>
        <div className={styles.cabecalhoSecao}>
          <h2 className={styles.subtitulo}>Matrículas</h2>
          <Link href={`/matriculas/nova?associadoId=${id}`} className={styles.botaoNovaMatricula}>
            Nova matrícula
          </Link>
        </div>

        {associado.matriculas.length === 0 ? (
          <p className={styles.mensagem}>Nenhuma matrícula</p>
        ) : (
          <ul className={styles.listaMatriculas}>
            {associado.matriculas.map((matricula) => (
              <li key={matricula.id} className={styles.itemMatricula}>
                <div className={styles.infoMatricula}>
                  <span className={styles.nomeProjeto}>{matricula.turmas[0]?.projeto.nome ?? '—'}</span>
                  <span className={styles.nomeTurma}>
                    {matricula.turmas.map((turma) => turma.nome).join(', ')}
                  </span>
                  {matricula.frequenciaSemanal && (
                    <span className={styles.detalhe}>{matricula.frequenciaSemanal} aulas/semana</span>
                  )}
                  {!matricula.frequenciaSemanal && (
                    <span className={styles.detalhe}>Plano pendente de revisão</span>
                  )}
                  {matricula.turmas.some((turma) => turma.horario) && (
                    <span className={styles.detalhe}>
                      {matricula.turmas.map((turma) => turma.horario).filter(Boolean).join(' · ')}
                    </span>
                  )}
                  {matricula.turmas.some((turma) => turma.diasContratados.length > 0) && (
                    <span className={styles.detalhe}>
                      {matricula.turmas
                        .map(
                          (turma) =>
                            `${turma.nome}: ${turma.diasContratados.map((d) => LABELS_DIA[d] ?? d).join(', ')}`
                        )
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  )}
                </div>
                <div className={styles.badgesMatricula}>
                  {matricula.exameMedico && (
                    <span className={`${styles.badge} ${styles[`exame${matricula.exameMedico}`]}`}>
                      {LABELS_EXAME[matricula.exameMedico]}
                    </span>
                  )}
                  <span className={`${styles.badge} ${matricula.ativa ? styles.badgeAtiva : styles.badgeInativa}`}>
                    {matricula.ativa ? 'Ativa' : 'Inativa'}
                  </span>
                  <button
                    className={styles.botaoEditar}
                    onClick={() => abrirModalEdicao(matricula)}
                    title="Editar matrícula"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Bloco 3 — Extrato de pagamentos */}
      <div className={styles.card}>
        <h2 className={styles.subtitulo}>Extrato de pagamentos</h2>

        {carregandoPagamentos && <p className={styles.mensagem}>Carregando pagamentos...</p>}

        {!carregandoPagamentos && pagamentos.length === 0 && (
          <p className={styles.mensagem}>Nenhum pagamento encontrado</p>
        )}

        {!carregandoPagamentos && pagamentos.length > 0 && (
          <ul className={styles.listaPagamentos}>
            {pagamentos.map((pagamento) => (
              <li key={pagamento.id} className={styles.itemPagamento}>
                <div className={styles.infoPagamento}>
                  <span className={styles.mesPagamento}>{formatarMes(pagamento.mesReferencia)}</span>
                  <span className={styles.detalhe}>
                    {pagamento.matricula.turmas[0]?.projeto.nome ?? '—'} —{' '}
                    {pagamento.matricula.turmas.map((turma) => turma.nome).join(', ')}
                  </span>
                  <span className={styles.detalhe}>
                    Vencimento: {formatarData(pagamento.vencimento)}
                    {pagamento.formaPagamento && ` · ${LABELS_FORMA[pagamento.formaPagamento]}`}
                  </span>
                </div>
                <div className={styles.acoesPagamento}>
                  <span className={styles.valorPagamento}>{formatarMoeda(pagamento.valor)}</span>
                  <span
                    className={`${styles.statusBadge} ${
                      pagamento.status === 'PAGA' ? styles.statusPaga : styles.statusPendente
                    }`}
                  >
                    {pagamento.status === 'PAGA' ? 'Paga' : 'Pendente'}
                  </span>
                  {pagamento.status === 'PENDENTE' && (
                    <button
                      className={styles.botaoRegistrar}
                      onClick={() => abrirModal({ id: pagamento.id, valor: pagamento.valor })}
                      title="Registrar pagamento"
                    >
                      <CirclePlus size={20} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal alterar senha */}
      {modalSenhaAberto && (
        <div className={styles.overlay} onClick={fecharModalSenha}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitulo}>Alterar senha</h3>

            <div className={styles.campo}>
              <label htmlFor="novaSenha">Nova senha</label>
              <div className={styles.campoSenha}>
                <input
                  type={mostrarSenhaInput ? 'text' : 'password'}
                  id="novaSenha"
                  value={novaSenhaInput}
                  onChange={(e) => setNovaSenhaInput(e.target.value)}
                  placeholder="Deixe em branco para gerar automaticamente"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className={styles.botaoOlho}
                  onClick={() => setMostrarSenhaInput((v) => !v)}
                  title={mostrarSenhaInput ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {mostrarSenhaInput ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button type="button" className={styles.botaoSugerirSenha} onClick={preencherSenhaSugerida}>
                Gerar senha sugerida
              </button>
            </div>

            {erroSenha && <p className={styles.erroModal}>{erroSenha}</p>}

            <div className={styles.acoesModal}>
              <button className={styles.botaoCancelar} onClick={fecharModalSenha}>
                Cancelar
              </button>
              <button className={styles.botaoConfirmar} onClick={confirmarSenha} disabled={enviandoSenha}>
                {enviandoSenha ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar matrícula */}
      {matriculaParaEditar && (
        <div className={styles.overlay} onClick={fecharModalEdicao}>
          <div className={`${styles.modal} ${styles.modalLargo}`} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitulo}>Editar matrícula</h3>

            <div className={styles.campo}>
              <label htmlFor="exameModal">Exame médico</label>
              <select
                id="exameModal"
                value={exameModal}
                onChange={(e) => setExameModal(e.target.value)}
              >
                <option value="APTO">Apto</option>
                <option value="NAO_APTO">Não apto</option>
                <option value="AGUARDANDO">Aguardando</option>
              </select>
            </div>

            <div className={styles.campo}>
              <label htmlFor="ativaModal">Situação</label>
              <select
                id="ativaModal"
                value={ativaModal ? 'true' : 'false'}
                onChange={(e) => setAtivaModal(e.target.value === 'true')}
              >
                <option value="true">Ativa</option>
                <option value="false">Inativa</option>
              </select>
            </div>

            <div className={styles.campo}>
              <label htmlFor="frequenciaModal">Plano</label>
              <select
                id="frequenciaModal"
                value={frequenciaModal}
                onChange={(e) => setFrequenciaModal(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Selecione...</option>
                {PLANOS.map((plano) => (
                  <option key={plano.frequencia} value={plano.frequencia}>
                    {plano.frequencia} aulas — R$ {plano.valor}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.campo}>
              <label>Turmas</label>
              {carregandoTurmasModal ? (
                <span className={styles.mensagem}>Carregando...</span>
              ) : (
                <>
                  <SeletorTurmasSemana
                    turmas={turmasModal}
                    selecionados={diaSelecoesModal}
                    onToggle={alternarDiaModal}
                  />
                  {frequenciaModal !== '' && (
                    <span className={totalDiasModal === frequenciaModal ? styles.aviso : styles.erro}>
                      {totalDiasModal} de {frequenciaModal} aulas selecionadas
                    </span>
                  )}
                </>
              )}
            </div>

            {erroModalEdicao && <p className={styles.erroModal}>{erroModalEdicao}</p>}

            <div className={styles.acoesModal}>
              <button className={styles.botaoCancelar} onClick={fecharModalEdicao}>
                Cancelar
              </button>
              <button
                className={styles.botaoConfirmar}
                onClick={confirmarEdicao}
                disabled={enviandoEdicao || carregandoTurmasModal}
              >
                {enviandoEdicao ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal registrar pagamento */}
      {pagamentoSelecionado && (
        <div className={styles.overlay} onClick={fecharModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitulo}>Registrar pagamento</h3>

            <div className={styles.campo}>
              <label htmlFor="formaPagamento">Forma de pagamento</label>
              <select
                id="formaPagamento"
                value={formaPagamentoModal}
                onChange={(e) => setFormaPagamentoModal(e.target.value as FormaPagamento)}
              >
                <option value="DINHEIRO">Dinheiro</option>
                <option value="PIX">Pix</option>
                <option value="CARTAO">Cartão</option>
              </select>
            </div>

            <div className={styles.campo}>
              <label htmlFor="dataPagamento">Data do pagamento</label>
              <input
                type="date"
                id="dataPagamento"
                value={dataPagamentoModal}
                onChange={(e) => setDataPagamentoModal(e.target.value)}
              />
            </div>

            <div className={styles.campo}>
              <label htmlFor="valorPago">Valor</label>
              <input
                type="number"
                id="valorPago"
                value={valorModal}
                onChange={(e) => setValorModal(e.target.value)}
              />
            </div>

            {erroModal && <p className={styles.erroModal}>{erroModal}</p>}

            <div className={styles.acoesModal}>
              <button className={styles.botaoCancelar} onClick={fecharModal}>
                Cancelar
              </button>
              <button className={styles.botaoConfirmar} onClick={confirmarRegistro} disabled={enviando}>
                {enviando ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
