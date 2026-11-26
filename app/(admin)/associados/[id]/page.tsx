'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CirclePlus, Pencil, Trash2, KeyRound, Eye, EyeOff, MessageCircle } from 'lucide-react'
import { apiGet, apiPatch, apiPost, apiDelete, ApiError } from '../../../lib/api'
import { montarMensagemAcesso, montarLinkWhatsapp, type AcessoGerado } from '../../../lib/acesso'
import { mesAtualISO, ultimoDiaDoMesISO } from '../../../lib/formato'
import SeletorTurmasSemana, {
  chaveDiaSelecao,
  agruparSelecoesPorTurma,
} from '../../../components/SeletorTurmasSemana'
import BlocoInscricao, {
  INSCRICAO_INICIAL,
  inscricaoParaPayload,
  type EstadoInscricao,
} from '../../../components/BlocoInscricao'
import FormularioAvaliacao from '../../../components/FormularioAvaliacao'
import FormularioRegistroSaude from '../../../components/FormularioRegistroSaude'
import RelatorioSaude from '../../../components/RelatorioSaude'
import PainelNivelNatacao from '../../../components/PainelNivelNatacao'
import VincularResponsavel from '../../../components/VincularResponsavel'
import Avatar from '../../../components/Avatar'
import ConfirmDialog from '../../../components/ConfirmDialog'
import ModalBase from '../../../components/ModalBase'
import ModalRegistrarPagamento, {
  type PagamentoParaRegistrar,
} from '../../../components/ModalRegistrarPagamento'
import ModalCorrigirPagamento, {
  type PagamentoParaCorrigir,
} from '../../../components/ModalCorrigirPagamento'
import { useToast } from '../../../components/Toast'
import {
  LABELS_FORMA_PAGAMENTO as LABELS_FORMA,
  type FormaPagamento,
} from '../../../lib/admin-pagamentos'
import { buscarValoresDoProjeto, rotuloPlano, type PlanoValor } from '../../../lib/valores'
import type { Avaliacao, RegistroSaude, RelatorioDaAluna } from '../../../lib/saude'
import { estaAtrasado } from '../../../lib/pagamentos'
import styles from './perfil.module.css'
import layout from './associado.module.css'

const FLORES = [
  'girassol', 'violeta', 'jasmim', 'margarida', 'orquidea',
  'tulipa', 'rosa', 'lirio', 'camelia', 'hortensia',
]

function gerarSenhaSugerida() {
  const flor = FLORES[Math.floor(Math.random() * FLORES.length)]
  const digitos = String(Math.floor(Math.random() * 100)).padStart(2, '0')
  return `${flor}${digitos}`
}

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
  cpf: string | null
  responsavel: { id: string; nome: string; telefone: string | null } | null
  dependentes: { id: string; nome: string; dataNascimento: string | null }[]
  email: string | null
  telefone: string | null
  fotoUrl: string | null
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
  status: 'PAGA' | 'PENDENTE' | 'CANCELADA'
  mesReferencia: string
  vencimento: string
  dataPagamento: string | null
  formaPagamento: FormaPagamento | null
  editadoEm: string | null
  matricula: {
    usuario: { nome: string }
    turmas: { nome: string; diasContratados: string[]; projeto: { nome: string } }[]
  }
}

type TurmaOpcao = {
  id: string
  nome: string
  horario: string | null
  dias: string[]
}

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

const LIMITE_PAGAMENTOS = 8

function calcularIdade(dataNascimento: string | null): number | null {
  if (!dataNascimento) return null
  const [ano, mes, dia] = dataNascimento.slice(0, 10).split('-').map(Number)
  if (!ano) return null
  const hoje = new Date()
  let idade = hoje.getFullYear() - ano
  if (hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia)) idade--
  return idade >= 0 && idade < 130 ? idade : null
}

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function formatarMesCurto(mes: string) {
  const [ano, mesNumero] = mes.split('-')
  return `${MESES_CURTOS[Number(mesNumero) - 1]} ${ano}`
}

// dd/mm — o ano já aparece na coluna do mês.
function formatarDiaMes(data: string | null) {
  if (!data) return '—'
  const [, mes, dia] = data.slice(0, 10).split('-')
  return `${dia}/${mes}`
}

function formatarTelefone(telefone: string): string {
  const d = telefone.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return telefone
}

// Telefone brasileiro cadastrado sem DDI: o link do WhatsApp precisa do 55.
function linkWhatsappTelefone(telefone: string): string | null {
  const digitos = telefone.replace(/\D/g, '')
  if (digitos.length < 10) return null
  return `https://wa.me/${digitos.startsWith('55') && digitos.length > 11 ? digitos : `55${digitos}`}`
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
  const router = useRouter()
  const { avisar, toast } = useToast()
  // Altura e versão do bloco de saúde: a versão remonta o relatório depois que
  // uma avaliação nova é salva.
  const [alturaAluna, setAlturaAluna] = useState<number | null>(null)
  const [versaoSaude, setVersaoSaude] = useState(0)
  const [filtroPagamentos, setFiltroPagamentos] = useState<'todos' | 'aberto' | 'pagos'>('todos')
  const [verTodosPagamentos, setVerTodosPagamentos] = useState(false)
  const [avaliacoesAluna, setAvaliacoesAluna] = useState<Avaliacao[]>([])
  const [registrosAluna, setRegistrosAluna] = useState<RegistroSaude[]>([])
  const aoCarregarSaude = useCallback((relatorio: RelatorioDaAluna) => {
    setAlturaAluna(relatorio.alturaCm)
    setAvaliacoesAluna(relatorio.avaliacoes)
    setRegistrosAluna(relatorio.registros)
  }, [])

  const [associado, setAssociado] = useState<Associado | null>(null)
  const [carregandoAssociado, setCarregandoAssociado] = useState(true)
  const [erroAssociado, setErroAssociado] = useState('')

  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [carregandoPagamentos, setCarregandoPagamentos] = useState(true)

  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<PagamentoParaRegistrar | null>(null)
  const [pagamentoEditando, setPagamentoEditando] = useState<PagamentoParaCorrigir | null>(null)
  const [escolhendoPagamento, setEscolhendoPagamento] = useState(false)

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

  const [modalGerarAberto, setModalGerarAberto] = useState(false)
  const [matriculaGerar, setMatriculaGerar] = useState('')
  const [mesGerar, setMesGerar] = useState('')
  const [vencimentoGerar, setVencimentoGerar] = useState('')
  const [gerandoMensalidade, setGerandoMensalidade] = useState(false)
  const [erroGerar, setErroGerar] = useState('')

  const [matriculaParaEditar, setMatriculaParaEditar] = useState<Matricula | null>(null)
  const [turmasModal, setTurmasModal] = useState<TurmaOpcao[]>([])
  const [carregandoTurmasModal, setCarregandoTurmasModal] = useState(false)
  const [exameModal, setExameModal] = useState('AGUARDANDO')
  const [ativaModal, setAtivaModal] = useState(true)
  const [inscricaoModal, setInscricaoModal] = useState<EstadoInscricao>(INSCRICAO_INICIAL)
  const [diaSelecoesModal, setDiaSelecoesModal] = useState<string[]>([])
  const [frequenciaModal, setFrequenciaModal] = useState<number | ''>('')
  const [planosModal, setPlanosModal] = useState<PlanoValor[]>([])
  const [enviandoEdicao, setEnviandoEdicao] = useState(false)
  const [erroModalEdicao, setErroModalEdicao] = useState('')

  const [matriculaParaExcluir, setMatriculaParaExcluir] = useState<Matricula | null>(null)
  const [excluindoMatricula, setExcluindoMatricula] = useState(false)
  const [vinculosParaApagar, setVinculosParaApagar] = useState('')
  const [erroExclusao, setErroExclusao] = useState('')

  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [excluindoAssociado, setExcluindoAssociado] = useState(false)
  const [vinculosAssociadoParaApagar, setVinculosAssociadoParaApagar] = useState('')
  const [bloqueioPermanenteAssociado, setBloqueioPermanenteAssociado] = useState(false)
  const [erroExclusaoAssociado, setErroExclusaoAssociado] = useState('')

  const [modalDadosAberto, setModalDadosAberto] = useState(false)
  const [nomeEdit, setNomeEdit] = useState('')
  const [cpfEdit, setCpfEdit] = useState('')
  const [telefoneEdit, setTelefoneEdit] = useState('')
  const [emailEdit, setEmailEdit] = useState('')
  const [statusEdit, setStatusEdit] = useState<'ATIVO' | 'INATIVO'>('ATIVO')
  const [rgEdit, setRgEdit] = useState('')
  const [dataNascimentoEdit, setDataNascimentoEdit] = useState('')
  const [tomaMedicamentoEdit, setTomaMedicamentoEdit] = useState<'' | 'true' | 'false'>('')
  const [qualMedicamentoEdit, setQualMedicamentoEdit] = useState('')
  const [cepEdit, setCepEdit] = useState('')
  const [logradouroEdit, setLogradouroEdit] = useState('')
  const [numeroEdit, setNumeroEdit] = useState('')
  const [complementoEdit, setComplementoEdit] = useState('')
  const [bairroEdit, setBairroEdit] = useState('')
  const [cidadeEdit, setCidadeEdit] = useState('')
  const [ufEdit, setUfEdit] = useState('')
  const [cepNaoEncontradoEdit, setCepNaoEncontradoEdit] = useState(false)
  const [enviandoDados, setEnviandoDados] = useState(false)
  const [erroDados, setErroDados] = useState('')

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

  function paraRegistrar(pagamento: Pagamento): PagamentoParaRegistrar {
    return {
      id: pagamento.id,
      valor: pagamento.valor,
      descricao: `${formatarMes(pagamento.mesReferencia)} — ${pagamento.matricula.turmas
        .map((turma) => turma.nome)
        .join(', ')}`,
    }
  }

  function abrirModalEdicaoPagamento(pagamento: Pagamento) {
    setPagamentoEditando({
      id: pagamento.id,
      valor: pagamento.valor,
      formaPagamento: pagamento.formaPagamento,
      mesReferencia: pagamento.mesReferencia,
      vencimento: pagamento.vencimento,
      dataPagamento: pagamento.dataPagamento,
      status: pagamento.status,
    })
  }

  // Botão "Registrar pagamento" do cabeçalho: com uma só cobrança em aberto já abre o
  // registro; com várias, a pessoa escolhe qual.
  function registrarDoCabecalho() {
    const emAberto = pagamentos.filter((pagamento) => pagamento.status === 'PENDENTE')
    if (emAberto.length === 1) setPagamentoSelecionado(paraRegistrar(emAberto[0]))
    else if (emAberto.length > 1) setEscolhendoPagamento(true)
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
    if (!associado || !associado.cpf) return
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

  function abrirModalGerar() {
    const mes = mesAtualISO()
    const ativas = associado?.matriculas.filter((matricula) => matricula.ativa) ?? []

    setMatriculaGerar(ativas.length === 1 ? String(ativas[0].id) : '')
    setMesGerar(mes)
    setVencimentoGerar(ultimoDiaDoMesISO(mes))
    setErroGerar('')
    setModalGerarAberto(true)
  }

  function trocarMesGerar(mes: string) {
    setMesGerar(mes)
    if (mes) setVencimentoGerar(ultimoDiaDoMesISO(mes))
  }

  async function confirmarGerarMensalidade() {
    if (!matriculaGerar) {
      setErroGerar('Escolha a matrícula')
      return
    }

    if (!mesGerar || !vencimentoGerar) {
      setErroGerar('Preencha o mês e o vencimento')
      return
    }

    setGerandoMensalidade(true)
    setErroGerar('')
    try {
      await apiPost('/pagamentos/gerar-matricula', {
        matriculaId: Number(matriculaGerar),
        mesReferencia: mesGerar,
        vencimento: vencimentoGerar,
      })
      await buscarPagamentos()
      avisar('Mensalidade gerada')
      setModalGerarAberto(false)
    } catch (erro) {
      setErroGerar(
        erro instanceof Error ? erro.message : 'Não foi possível gerar a mensalidade'
      )
    } finally {
      setGerandoMensalidade(false)
    }
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
    setInscricaoModal(INSCRICAO_INICIAL)
    setErroModalEdicao('')
    setTurmasModal([])
    setCarregandoTurmasModal(true)
    const projetoId = matricula.turmas[0]?.projeto.id
    setPlanosModal([])
    if (projetoId) {
      buscarValoresDoProjeto(projetoId)
        .then((valores) => setPlanosModal(valores.planos))
        .catch(() => setPlanosModal([]))
    }
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

  // Rematrícula: a aluna estava inativa e está voltando. Só nesse caso a inscrição
  // é oferecida — trocar de turma ou corrigir o exame não cobra nada.
  const rematriculando = Boolean(matriculaParaEditar && !matriculaParaEditar.ativa && ativaModal)

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
        ...(rematriculando ? { inscricao: inscricaoParaPayload(inscricaoModal) } : {}),
      })
      await buscarAssociado()
      avisar('Matrícula salva')
      fecharModalEdicao()
    } catch {
      setErroModalEdicao('Não foi possível salvar a matrícula')
    } finally {
      setEnviandoEdicao(false)
    }
  }

  function abrirModalExclusao(matricula: Matricula) {
    setMatriculaParaExcluir(matricula)
    setErroExclusao('')
    setVinculosParaApagar('')
  }

  function fecharModalExclusao() {
    setMatriculaParaExcluir(null)
    setVinculosParaApagar('')
  }

  async function confirmarExclusao(forcar = false) {
    if (!matriculaParaExcluir) return
    setExcluindoMatricula(true)
    setErroExclusao('')
    try {
      await apiDelete(`/matriculas/${matriculaParaExcluir.id}${forcar ? '?forcar=true' : ''}`)
      // A exclusão forçada leva as cobranças junto, então o extrato também precisa recarregar.
      await Promise.all([buscarAssociado(), buscarPagamentos()])
      avisar('Matrícula excluída')
      fecharModalExclusao()
    } catch (erro) {
      // 409 = a matrícula tem histórico vinculado. Não é um erro sem saída: a
      // coordenação pode confirmar de novo e apagar o histórico junto.
      if (erro instanceof ApiError && erro.status === 409) {
        setVinculosParaApagar(erro.message)
      } else {
        setErroExclusao('Não foi possível excluir a matrícula. Tente novamente.')
      }
    } finally {
      setExcluindoMatricula(false)
    }
  }

  function abrirModalExcluir() {
    setErroExclusaoAssociado('')
    setVinculosAssociadoParaApagar('')
    setBloqueioPermanenteAssociado(false)
    setModalExcluirAberto(true)
  }

  function fecharModalExcluir() {
    setModalExcluirAberto(false)
    setVinculosAssociadoParaApagar('')
    setBloqueioPermanenteAssociado(false)
  }

  async function confirmarExclusaoAssociado(forcar = false) {
    setExcluindoAssociado(true)
    setErroExclusaoAssociado('')
    try {
      await apiDelete(`/usuarios/${id}${forcar ? '?forcar=true' : ''}`)
      router.push('/associados')
    } catch (erro) {
      // 409 = existe histórico vinculado. Se for vínculo de responsabilidade
      // sobre dado de OUTRA pessoa (bloqueioPermanente), forçar não resolve —
      // precisa arrumar isso à mão antes (ex.: trocar o professor da turma).
      if (erro instanceof ApiError && erro.status === 409) {
        setVinculosAssociadoParaApagar(erro.message)
        setBloqueioPermanenteAssociado(Boolean(erro.corpo?.bloqueioPermanente))
      } else {
        setErroExclusaoAssociado('Não foi possível excluir o associado. Tente novamente.')
      }
    } finally {
      setExcluindoAssociado(false)
    }
  }

  function abrirModalDados() {
    if (!associado) return
    setNomeEdit(associado.nome)
    setCpfEdit(associado.cpf ?? '')
    setTelefoneEdit(associado.telefone ?? '')
    setEmailEdit(associado.email ?? '')
    setStatusEdit(associado.status)
    setRgEdit(associado.rg ?? '')
    setDataNascimentoEdit(associado.dataNascimento ? associado.dataNascimento.slice(0, 10) : '')
    setTomaMedicamentoEdit(
      associado.tomaMedicamento === true ? 'true' : associado.tomaMedicamento === false ? 'false' : ''
    )
    setQualMedicamentoEdit(associado.qualMedicamento ?? '')
    setCepEdit(associado.cep ?? '')
    setLogradouroEdit(associado.logradouro ?? '')
    setNumeroEdit(associado.numero ?? '')
    setComplementoEdit(associado.complemento ?? '')
    setBairroEdit(associado.bairro ?? '')
    setCidadeEdit(associado.cidade ?? '')
    setUfEdit(associado.uf ?? '')
    setCepNaoEncontradoEdit(false)
    setErroDados('')
    setModalDadosAberto(true)
  }

  function fecharModalDados() {
    setModalDadosAberto(false)
  }

  async function buscarCepEdit() {
    const cepLimpo = cepEdit.replace(/\D/g, '')
    if (cepLimpo.length !== 8) return

    setCepNaoEncontradoEdit(false)

    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      const dados: { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string } =
        await resposta.json()

      if (dados.erro) {
        setCepNaoEncontradoEdit(true)
        return
      }

      setLogradouroEdit(dados.logradouro ?? '')
      setBairroEdit(dados.bairro ?? '')
      setCidadeEdit(dados.localidade ?? '')
      setUfEdit(dados.uf ?? '')
    } catch {
      setCepNaoEncontradoEdit(true)
    }
  }

  async function confirmarDados() {
    if (!nomeEdit.trim()) {
      setErroDados('O nome é obrigatório')
      return
    }

    if (!cpfEdit.trim() && !associado?.responsavel) {
      setErroDados('O CPF é obrigatório')
      return
    }

    setEnviandoDados(true)
    setErroDados('')
    try {
      await apiPatch(`/usuarios/${id}`, {
        nome: nomeEdit.trim(),
        cpf: cpfEdit.trim(),
        telefone: telefoneEdit || undefined,
        email: emailEdit || undefined,
        status: statusEdit,
        rg: rgEdit || undefined,
        dataNascimento: dataNascimentoEdit || undefined,
        tomaMedicamento: tomaMedicamentoEdit === '' ? undefined : tomaMedicamentoEdit === 'true',
        qualMedicamento: qualMedicamentoEdit || undefined,
        cep: cepEdit || undefined,
        logradouro: logradouroEdit || undefined,
        numero: numeroEdit || undefined,
        complemento: complementoEdit || undefined,
        bairro: bairroEdit || undefined,
        cidade: cidadeEdit || undefined,
        uf: ufEdit || undefined,
      })
      await buscarAssociado()
      avisar('Dados salvos')
      fecharModalDados()
    } catch {
      setErroDados('Não foi possível salvar os dados. Verifique se o CPF ou email já estão em uso.')
    } finally {
      setEnviandoDados(false)
    }
  }

  if (carregandoAssociado) {
    return <div className={styles.pagina}><p className={styles.mensagem}>Carregando...</p></div>
  }

  if (erroAssociado || !associado) {
    return <div className={styles.pagina}><p className={styles.erro}>{erroAssociado || 'Erro ao carregar associado'}</p></div>
  }

  const endereco = montarEndereco(associado)
  const idade = calcularIdade(associado.dataNascimento)

  // Em aberto = cobranças pendentes (canceladas não são dívida).
  const pendentesAluna = pagamentos.filter((pagamento) => pagamento.status === 'PENDENTE')
  const totalEmAberto = pendentesAluna.reduce((soma, pagamento) => soma + Number(pagamento.valor), 0)
  const atrasadasAluna = pendentesAluna.filter((pagamento) => estaAtrasado(pagamento)).length

  const anoAtual = String(new Date().getFullYear())
  const pagoNoAno = pagamentos
    .filter((p) => p.status === 'PAGA' && (p.dataPagamento ?? '').startsWith(anoAtual))
    .reduce((soma, p) => soma + Number(p.valor), 0)

  const pagamentosFiltrados = pagamentos.filter((p) =>
    filtroPagamentos === 'aberto' ? p.status === 'PENDENTE' : filtroPagamentos === 'pagos' ? p.status === 'PAGA' : true
  )
  const variasTurmas =
    new Set(pagamentos.map((p) => p.matricula.turmas.map((t) => t.nome).join(', '))).size > 1
  const pagamentosVisiveis = verTodosPagamentos ? pagamentosFiltrados : pagamentosFiltrados.slice(0, LIMITE_PAGAMENTOS)

  const matriculasAtivas = associado.matriculas.filter((m) => m.ativa)
  const resumoMatriculas = matriculasAtivas
    .map((m) => `${m.turmas[0]?.projeto.nome ?? ''}${m.turmas.length ? `, ${m.turmas.map((t) => t.nome).join(' e ')}` : ''}`)
    .filter(Boolean)
    .join(' · ')

  const linkWhatsapp = associado.telefone ? linkWhatsappTelefone(associado.telefone) : null

  function rotuloStatus(pagamento: Pagamento) {
    if (pagamento.status === 'PAGA') return { texto: 'Paga', classe: styles.statusPaga }
    if (pagamento.status === 'CANCELADA') return { texto: 'Cancelada', classe: styles.statusCancelada }
    if (estaAtrasado(pagamento)) return { texto: 'Atrasada', classe: styles.statusAtrasada }
    return { texto: 'A vencer', classe: styles.statusPendente }
  }

  return (
    <div className={layout.pagina}>
      <header className={layout.cabecalho}>
        <Avatar nome={associado.nome} fotoUrl={associado.fotoUrl} tamanho={56} />
        <div className={layout.cabecalhoInfo}>
          <span className={layout.trilha}>
            <Link href="/associados">Associados</Link> /
          </span>
          <h1 className={layout.nome}>{associado.nome}</h1>
          <p className={layout.resumo}>
            <strong className={associado.status === 'ATIVO' ? layout.ativa : layout.inativa}>
              {associado.status === 'ATIVO' ? 'Ativa' : 'Inativa'}
            </strong>
            {idade !== null && ` · ${idade} anos`}
            {resumoMatriculas && ` · ${resumoMatriculas}`}
          </p>
        </div>
        <div className={layout.cabecalhoAcoes}>
          <button
            type="button"
            className={layout.botaoPrimario}
            onClick={registrarDoCabecalho}
            disabled={carregandoPagamentos || pendentesAluna.length === 0}
            title={pendentesAluna.length === 0 ? 'Não há cobranças pendentes' : undefined}
          >
            <CirclePlus size={18} aria-hidden="true" />
            Registrar pagamento
          </button>
          <Link href={`/matriculas/nova?associadoId=${id}`} className={layout.botaoSecundario}>
            Nova matrícula
          </Link>
          <button type="button" className={layout.botaoSecundario} onClick={abrirModalDados}>
            <Pencil size={15} aria-hidden="true" />
            Editar dados
          </button>
        </div>
      </header>

      <div className={layout.linha}>
        {/* Pagamentos — o que a coordenação mais consulta, por isso no topo */}
        <section className={`${layout.cartao} ${layout.cartaoLargo} ${layout.semPadding}`} aria-label="Pagamentos">
          <div className={layout.topoPagamentos}>
            <h2 className={layout.tituloCartao}>Pagamentos</h2>
            {!carregandoPagamentos &&
              (totalEmAberto > 0 ? (
                <span className={layout.emAberto}>
                  {formatarMoeda(String(totalEmAberto))} em aberto
                  {atrasadasAluna > 0 && ` · ${atrasadasAluna} ${atrasadasAluna === 1 ? 'atrasada' : 'atrasadas'}`}
                </span>
              ) : (
                <span className={layout.emDia}>Em dia</span>
              ))}
            <span className={layout.espaco} />
            <div className={layout.filtro} role="group" aria-label="Mostrar pagamentos">
              {(
                [
                  ['todos', 'Todos'],
                  ['aberto', 'Em aberto'],
                  ['pagos', 'Pagos'],
                ] as const
              ).map(([valor, rotulo]) => (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={filtroPagamentos === valor}
                  className={filtroPagamentos === valor ? layout.filtroAtivo : ''}
                  onClick={() => setFiltroPagamentos(valor)}
                >
                  {rotulo}
                </button>
              ))}
            </div>
            <button type="button" className={layout.botaoPequeno} onClick={abrirModalGerar}>
              Gerar mensalidade
            </button>
          </div>

          {carregandoPagamentos && <p className={layout.mensagemCartao}>Carregando pagamentos...</p>}
          {!carregandoPagamentos && pagamentosFiltrados.length === 0 && (
            <p className={layout.mensagemCartao}>
              {pagamentos.length === 0 ? 'Nenhum pagamento encontrado' : 'Nenhum pagamento neste filtro'}
            </p>
          )}

          {!carregandoPagamentos && pagamentosFiltrados.length > 0 && (
            <div className={layout.tabelaRolagem}>
              <table className={layout.tabela}>
                <thead>
                  <tr>
                    <th>Mês</th>
                    {variasTurmas && <th>Turma</th>}
                    <th>Vencimento</th>
                    <th>Pagamento</th>
                    <th className={layout.direita}>Valor</th>
                    <th>Status</th>
                    <th className={layout.direita}>
                      <span className={layout.soLeitor}>Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagamentosVisiveis.map((pagamento) => {
                    const status = rotuloStatus(pagamento)
                    return (
                      <tr key={pagamento.id}>
                        <td className={`${layout.forte} ${layout.semQuebra}`}>{formatarMesCurto(pagamento.mesReferencia)}</td>
                        {variasTurmas && (
                          <td className={layout.suave}>{pagamento.matricula.turmas.map((t) => t.nome).join(', ') || '—'}</td>
                        )}
                        <td className={`${layout.suave} ${layout.semQuebra}`}>{formatarDiaMes(pagamento.vencimento)}</td>
                        <td className={`${layout.suave} ${layout.semQuebra}`}>
                          {pagamento.status === 'PAGA' && pagamento.dataPagamento
                            ? `${formatarDiaMes(pagamento.dataPagamento)}${
                                pagamento.formaPagamento ? ` · ${LABELS_FORMA[pagamento.formaPagamento]}` : ''
                              }`
                            : '—'}
                          {pagamento.editadoEm && (
                            <span className={layout.nota}>Corrigido em {formatarData(pagamento.editadoEm)}</span>
                          )}
                        </td>
                        <td className={`${layout.forte} ${layout.direita} ${layout.semQuebra}`}>
                          {formatarMoeda(pagamento.valor)}
                        </td>
                        <td>
                          <span
                            className={`${styles.statusBadge} ${status.classe}`}
                            title={
                              pagamento.status === 'CANCELADA'
                                ? 'Matrícula encerrada: esta cobrança não é mais cobrada'
                                : undefined
                            }
                          >
                            {status.texto}
                          </span>
                        </td>
                        <td>
                          <div className={layout.acoesLinha}>
                            {pagamento.status === 'PENDENTE' && (
                              <button
                                type="button"
                                className={layout.botaoRegistrar}
                                onClick={() => setPagamentoSelecionado(paraRegistrar(pagamento))}
                                aria-label={`Registrar pagamento de ${formatarMes(pagamento.mesReferencia)}`}
                              >
                                Registrar
                              </button>
                            )}
                            <button
                              type="button"
                              className={layout.botaoIcone}
                              onClick={() => abrirModalEdicaoPagamento(pagamento)}
                              title="Corrigir pagamento"
                              aria-label={`Corrigir pagamento de ${formatarMes(pagamento.mesReferencia)}`}
                            >
                              <Pencil size={15} aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!carregandoPagamentos && pagamentos.length > 0 && (
            <div className={layout.rodapeCartao}>
              <span>
                Pago em {anoAtual}: <strong className={layout.ativa}>{formatarMoeda(String(pagoNoAno))}</strong>
              </span>
              {pagamentosFiltrados.length > LIMITE_PAGAMENTOS && (
                <button type="button" className={layout.botaoLink} onClick={() => setVerTodosPagamentos((v) => !v)}>
                  {verTodosPagamentos ? 'Mostrar só os mais recentes' : `Ver histórico completo (${pagamentosFiltrados.length})`}
                </button>
              )}
            </div>
          )}
        </section>

        {/* Dados pessoais */}
        <section className={`${layout.cartao} ${layout.cartaoMedio}`} aria-label="Dados pessoais">
          <h2 className={layout.tituloCartao}>Dados pessoais</h2>

          {erroAcesso && <p className={styles.erro}>{erroAcesso}</p>}

          {senhaSalva && (
            <div className={styles.avisoSenha}>
              <p className={styles.avisoSenhaTexto}>
                Senha alterada! Nova senha de acesso:{' '}
                <span className={styles.avisoSenhaValor}>{senhaSalva}</span> — anote e entregue à associada.
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

          <dl className={layout.dados}>
            <div>
              <dt>Telefone</dt>
              <dd>
                {associado.telefone ? formatarTelefone(associado.telefone) : '—'}
                {linkWhatsapp && (
                  <a href={linkWhatsapp} target="_blank" rel="noopener noreferrer" className={layout.linkWhatsapp}>
                    WhatsApp
                  </a>
                )}
              </dd>
            </div>
            <div>
              <dt>Nascimento</dt>
              <dd>
                {formatarData(associado.dataNascimento)}
                {idade !== null && <span className={layout.suave}> ({idade} anos)</span>}
              </dd>
            </div>
            <div>
              <dt>CPF</dt>
              <dd>{associado.cpf || '—'}</dd>
            </div>
            <div>
              <dt>RG</dt>
              <dd>{associado.rg || '—'}</dd>
            </div>
            <div className={layout.dadoLargo}>
              <dt>Endereço</dt>
              <dd>{endereco || '—'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd className={layout.quebraLonga}>{associado.email || '—'}</dd>
            </div>
            <div>
              <dt>Medicamento</dt>
              <dd>
                {associado.tomaMedicamento === true
                  ? associado.qualMedicamento || 'Toma (não informado qual)'
                  : associado.tomaMedicamento === false
                  ? 'Não toma'
                  : '—'}
              </dd>
            </div>
          </dl>

          {!associado.responsavel && (
            <div className={layout.acessoApp}>
              <span className={layout.rotuloAcesso}>Acesso ao app:</span>
              <button type="button" className={layout.botaoPequeno} onClick={abrirAcesso} disabled={gerandoAcesso}>
                <MessageCircle size={14} aria-hidden="true" />
                {gerandoAcesso ? 'Gerando...' : 'Enviar acesso'}
              </button>
              <button type="button" className={layout.botaoPequeno} onClick={abrirModalSenha}>
                <KeyRound size={14} aria-hidden="true" />
                Alterar senha
              </button>
            </div>
          )}
        </section>
      </div>

      <div className={layout.linha}>
        <div className={`${layout.coluna} ${layout.cartaoMedio}`}>
          {/* Matrículas */}
          <section className={layout.cartao} aria-label="Matrículas">
            <div className={layout.topoCartao}>
              <h2 className={layout.tituloCartao}>Matrículas</h2>
              <Link href={`/matriculas/nova?associadoId=${id}`} className={layout.linkAcao}>
                + Nova matrícula
              </Link>
            </div>

            {associado.matriculas.length === 0 ? (
              <p className={layout.suave}>Nenhuma matrícula</p>
            ) : (
              <ul className={layout.listaMatriculas}>
                {associado.matriculas.map((matricula) => {
                  const dias = matricula.turmas
                    .flatMap((t) => (t.diasContratados.length ? t.diasContratados : t.dias))
                    .filter((d, i, todos) => todos.indexOf(d) === i)
                    .map((d) => LABELS_DIA[d] ?? d)
                  const horarios = matricula.turmas.map((t) => t.horario).filter(Boolean)
                  const detalhes = [
                    dias.join(', '),
                    horarios.join(' · '),
                    matricula.frequenciaSemanal
                      ? `${matricula.frequenciaSemanal} ${matricula.frequenciaSemanal === 1 ? 'aula' : 'aulas'}/semana`
                      : 'Plano pendente de revisão',
                    matricula.exameMedico ? `exame ${LABELS_EXAME[matricula.exameMedico].toLowerCase()}` : '',
                  ].filter(Boolean)
                  return (
                    <li key={matricula.id} className={layout.matricula}>
                      <div className={layout.matriculaTexto}>
                        <span className={layout.forte}>
                          {matricula.turmas[0]?.projeto.nome ?? '—'} · {matricula.turmas.map((t) => t.nome).join(', ')}
                        </span>
                        <span className={layout.suave}>{detalhes.join(' · ')}</span>
                      </div>
                      <span className={`${styles.badge} ${matricula.ativa ? styles.badgeAtiva : styles.badgeInativa}`}>
                        {matricula.ativa ? 'Ativa' : 'Inativa'}
                      </span>
                      <button
                        type="button"
                        className={layout.botaoIcone}
                        onClick={() => abrirModalEdicao(matricula)}
                        title="Editar matrícula"
                        aria-label="Editar matrícula"
                      >
                        <Pencil size={15} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={layout.botaoIcone}
                        onClick={() => abrirModalExclusao(matricula)}
                        title="Excluir matrícula"
                        aria-label="Excluir matrícula"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* Família: responsável ou dependentes */}
          <section className={layout.cartao} aria-label="Família">
            <h2 className={layout.tituloCartao}>{associado.responsavel ? 'Responsável' : 'Família'}</h2>
            {associado.responsavel ? (
              <>
                <p className={layout.suave}>
                  Este cadastro é de um dependente: não tem login. A cobrança e o acompanhamento ficam com o
                  responsável.
                </p>
                <p>
                  <Link href={`/associados/${associado.responsavel.id}`}>{associado.responsavel.nome}</Link>
                  {associado.responsavel.telefone ? ` · ${associado.responsavel.telefone}` : ''}
                </p>
                <div className={layout.botoesLinha}>
                  <button
                    type="button"
                    className={layout.botaoPequeno}
                    onClick={async () => {
                      await apiPatch(`/usuarios/${id}`, { responsavelId: null })
                      buscarAssociado()
                    }}
                  >
                    Desvincular do responsável
                  </button>
                </div>
              </>
            ) : (
              <>
                {associado.dependentes.length === 0 ? (
                  <p className={layout.suave}>Nenhum dependente cadastrado.</p>
                ) : (
                  <ul className={layout.listaSimples}>
                    {associado.dependentes.map((d) => (
                      <li key={d.id}>
                        <Link href={`/associados/${d.id}`}>{d.nome}</Link>
                      </li>
                    ))}
                  </ul>
                )}
                <div className={layout.botoesLinha}>
                  <Link href={`/associados/novo?responsavel=${id}`} className={layout.botaoPequeno}>
                    Cadastrar dependente
                  </Link>
                </div>
                {associado.dependentes.length === 0 && (
                  <VincularResponsavel usuarioId={id} aoVincular={buscarAssociado} />
                )}
              </>
            )}
          </section>

          <button type="button" className={layout.botaoExcluir} onClick={abrirModalExcluir}>
            <Trash2 size={14} aria-hidden="true" />
            Excluir associado
          </button>
        </div>

        <div className={`${layout.coluna} ${layout.cartaoLargo}`}>
          {/* Saúde e progresso */}
          <section className={layout.cartao} aria-label="Saúde e progresso">
            <h2 className={layout.tituloCartao}>Saúde e progresso</h2>
            <p className={layout.notaSaude}>
              Dado de saúde registrado pela professora da turma dela (ou pela coordenação). Use só para
              acompanhar e adaptar as atividades dela.
            </p>

            <div>
            <FormularioRegistroSaude
              caminho={`/usuarios/${id}/registros-saude`}
              registros={registrosAluna}
              aoSalvar={() => setVersaoSaude((v) => v + 1)}
            />

            <FormularioAvaliacao
              caminho={`/usuarios/${id}/avaliacoes`}
              alturaAtual={alturaAluna}
              avaliacoes={avaliacoesAluna}
              aoSalvar={() => setVersaoSaude((v) => v + 1)}
            />

            <RelatorioSaude key={versaoSaude} caminho={`/usuarios/${id}/saude`} aoCarregar={aoCarregarSaude} />
            </div>
          </section>

          {/* Nível na natação (só se há matrícula em projeto de natação) */}
          {associado.matriculas.some((m) => m.turmas.some((t) => /nata[cç][aã]o/i.test(t.projeto.nome))) && (
            <section className={layout.cartao} aria-label="Nível na natação">
              <h2 className={layout.tituloCartao}>Nível na natação</h2>
              <PainelNivelNatacao caminho={`/usuarios/${id}/niveis-natacao`} />
            </section>
          )}
        </div>
      </div>

      {/* Modal editar dados pessoais */}
      {modalDadosAberto && (
        <ModalBase titulo="Editar dados pessoais" onFechar={fecharModalDados} larga>

            <div className={styles.campo}>
              <label htmlFor="nomeEdit">Nome</label>
              <input type="text" id="nomeEdit" value={nomeEdit} onChange={(e) => setNomeEdit(e.target.value)} />
            </div>

            <div className={styles.campo}>
              <label htmlFor="cpfEdit">CPF</label>
              <input type="text" id="cpfEdit" value={cpfEdit} onChange={(e) => setCpfEdit(e.target.value)} />
            </div>

            <div className={styles.campo}>
              <label htmlFor="telefoneEdit">Telefone</label>
              <input
                type="text"
                id="telefoneEdit"
                value={telefoneEdit}
                onChange={(e) => setTelefoneEdit(e.target.value)}
              />
            </div>

            <div className={styles.campo}>
              <label htmlFor="emailEdit">Email</label>
              <input type="email" id="emailEdit" value={emailEdit} onChange={(e) => setEmailEdit(e.target.value)} />
            </div>

            <div className={styles.campo}>
              <label htmlFor="statusEdit">Status</label>
              <select
                id="statusEdit"
                value={statusEdit}
                onChange={(e) => setStatusEdit(e.target.value as 'ATIVO' | 'INATIVO')}
              >
                <option value="ATIVO">Ativo</option>
                <option value="INATIVO">Inativo</option>
              </select>
            </div>

            <div className={styles.campo}>
              <label htmlFor="rgEdit">RG</label>
              <input type="text" id="rgEdit" value={rgEdit} onChange={(e) => setRgEdit(e.target.value)} />
            </div>

            <div className={styles.campo}>
              <label htmlFor="dataNascimentoEdit">Data de nascimento</label>
              <input
                type="date"
                id="dataNascimentoEdit"
                value={dataNascimentoEdit}
                onChange={(e) => setDataNascimentoEdit(e.target.value)}
              />
            </div>

            <div className={styles.campo}>
              <label htmlFor="tomaMedicamentoEdit">Toma medicamento</label>
              <select
                id="tomaMedicamentoEdit"
                value={tomaMedicamentoEdit}
                onChange={(e) => setTomaMedicamentoEdit(e.target.value as '' | 'true' | 'false')}
              >
                <option value="">Não informado</option>
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </div>

            {tomaMedicamentoEdit === 'true' && (
              <div className={styles.campo}>
                <label htmlFor="qualMedicamentoEdit">Qual medicamento</label>
                <input
                  type="text"
                  id="qualMedicamentoEdit"
                  value={qualMedicamentoEdit}
                  onChange={(e) => setQualMedicamentoEdit(e.target.value)}
                />
              </div>
            )}

            <div className={styles.campo}>
              <label htmlFor="cepEdit">CEP</label>
              <input
                type="text"
                id="cepEdit"
                value={cepEdit}
                onChange={(e) => setCepEdit(e.target.value)}
                onBlur={buscarCepEdit}
              />
              {cepNaoEncontradoEdit && <span className={styles.aviso}>CEP não encontrado</span>}
            </div>

            <div className={styles.campo}>
              <label htmlFor="logradouroEdit">Logradouro</label>
              <input
                type="text"
                id="logradouroEdit"
                value={logradouroEdit}
                onChange={(e) => setLogradouroEdit(e.target.value)}
              />
            </div>

            <div className={styles.linha}>
              <div className={styles.campo}>
                <label htmlFor="numeroEdit">Número</label>
                <input
                  type="text"
                  id="numeroEdit"
                  value={numeroEdit}
                  onChange={(e) => setNumeroEdit(e.target.value)}
                />
              </div>

              <div className={styles.campo}>
                <label htmlFor="complementoEdit">Complemento</label>
                <input
                  type="text"
                  id="complementoEdit"
                  value={complementoEdit}
                  onChange={(e) => setComplementoEdit(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.campo}>
              <label htmlFor="bairroEdit">Bairro</label>
              <input type="text" id="bairroEdit" value={bairroEdit} onChange={(e) => setBairroEdit(e.target.value)} />
            </div>

            <div className={styles.linha}>
              <div className={styles.campo}>
                <label htmlFor="cidadeEdit">Cidade</label>
                <input
                  type="text"
                  id="cidadeEdit"
                  value={cidadeEdit}
                  onChange={(e) => setCidadeEdit(e.target.value)}
                />
              </div>

              <div className={styles.campo}>
                <label htmlFor="ufEdit">UF</label>
                <input type="text" id="ufEdit" value={ufEdit} onChange={(e) => setUfEdit(e.target.value)} />
              </div>
            </div>

            {erroDados && <p className={styles.erroModal}>{erroDados}</p>}

            <div className={styles.acoesModal}>
              <button className={styles.botaoCancelar} onClick={fecharModalDados}>
                Cancelar
              </button>
              <button className={styles.botaoConfirmar} onClick={confirmarDados} disabled={enviandoDados}>
                {enviandoDados ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
        </ModalBase>
      )}

      {/* Modal alterar senha */}
      {modalSenhaAberto && (
        <ModalBase titulo="Alterar senha" onFechar={fecharModalSenha}>

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
                  aria-label={mostrarSenhaInput ? 'Ocultar senha' : 'Exibir senha'}
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
        </ModalBase>
      )}

      {/* Modal editar matrícula */}
      {matriculaParaEditar && (
        <ModalBase titulo="Editar matrícula" onFechar={fecharModalEdicao} larga>

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
                {planosModal.map((plano) => (
                  <option key={plano.aulasPorSemana} value={plano.aulasPorSemana}>
                    {rotuloPlano(plano.aulasPorSemana)} — R$ {plano.valorMensal}
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

            {rematriculando && (
              <BlocoInscricao
                valor={inscricaoModal}
                onChange={setInscricaoModal}
                styles={styles}
                titulo="Rematrícula"
                projetoId={matriculaParaEditar?.turmas[0]?.projeto.id}
              />
            )}

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
        </ModalBase>
      )}

      {/* Excluir matrícula */}
      <ConfirmDialog
        aberto={matriculaParaExcluir !== null}
        titulo="Excluir matrícula"
        mensagem={
          vinculosParaApagar
            ? `${vinculosParaApagar} Se você excluir mesmo assim, esse histórico é apagado junto: as presenças somem da frequência e as cobranças somem do financeiro. Essa ação não pode ser desfeita.`
            : `Tem certeza que deseja excluir a matrícula em ${
                matriculaParaExcluir?.turmas.map((turma) => turma.nome).join(', ') || 'turma não informada'
              }? Essa ação não pode ser desfeita.`
        }
        confirmarLabel={vinculosParaApagar ? 'Excluir mesmo assim' : 'Excluir'}
        carregando={excluindoMatricula}
        erro={erroExclusao || null}
        onConfirmar={() => confirmarExclusao(Boolean(vinculosParaApagar))}
        onCancelar={fecharModalExclusao}
      />

      {/* Excluir associado */}
      <ConfirmDialog
        aberto={modalExcluirAberto}
        titulo="Excluir associado"
        mensagem={
          vinculosAssociadoParaApagar
            ? `${vinculosAssociadoParaApagar}${
                bloqueioPermanenteAssociado
                  ? ''
                  : ' Se você excluir mesmo assim, esse histórico é apagado junto e não pode ser recuperado.'
              }`
            : `Tem certeza que deseja excluir ${associado.nome}? Essa ação não pode ser desfeita.`
        }
        confirmarLabel={
          bloqueioPermanenteAssociado ? 'Entendi' : vinculosAssociadoParaApagar ? 'Excluir mesmo assim' : 'Excluir'
        }
        perigoso={!bloqueioPermanenteAssociado}
        carregando={excluindoAssociado}
        erro={erroExclusaoAssociado || null}
        onConfirmar={() =>
          bloqueioPermanenteAssociado
            ? fecharModalExcluir()
            : confirmarExclusaoAssociado(Boolean(vinculosAssociadoParaApagar))
        }
        onCancelar={fecharModalExcluir}
      />

      {/* Modal gerar mensalidade avulsa */}
      {modalGerarAberto && (
        <ModalBase titulo="Gerar mensalidade" onFechar={() => setModalGerarAberto(false)}>

            <div className={styles.campo}>
              <label htmlFor="matriculaGerar">Matrícula</label>
              <select
                id="matriculaGerar"
                value={matriculaGerar}
                onChange={(e) => setMatriculaGerar(e.target.value)}
              >
                <option value="">Selecione...</option>
                {associado.matriculas
                  .filter((matricula) => matricula.ativa)
                  .map((matricula) => (
                    <option key={matricula.id} value={matricula.id}>
                      {matricula.turmas[0]?.projeto.nome ?? 'Projeto'} —{' '}
                      {matricula.turmas.map((turma) => turma.nome).join(', ')}
                      {matricula.frequenciaSemanal
                        ? ` (${matricula.frequenciaSemanal} aulas)`
                        : ' (sem plano)'}
                    </option>
                  ))}
              </select>
              {associado.matriculas.filter((matricula) => matricula.ativa).length === 0 && (
                <span className={styles.erro}>Esta associada não tem matrícula ativa</span>
              )}
            </div>

            <div className={styles.campo}>
              <label htmlFor="mesGerar">Mês</label>
              <input
                type="month"
                id="mesGerar"
                value={mesGerar}
                onChange={(e) => trocarMesGerar(e.target.value)}
              />
            </div>

            <div className={styles.campo}>
              <label htmlFor="vencimentoGerar">Vencimento</label>
              <input
                type="date"
                id="vencimentoGerar"
                value={vencimentoGerar}
                onChange={(e) => setVencimentoGerar(e.target.value)}
              />
            </div>

            {erroGerar && <p className={styles.erroModal}>{erroGerar}</p>}

            <div className={styles.acoesModal}>
              <button
                className={styles.botaoCancelar}
                onClick={() => setModalGerarAberto(false)}
                disabled={gerandoMensalidade}
              >
                Cancelar
              </button>
              <button
                className={styles.botaoConfirmar}
                onClick={confirmarGerarMensalidade}
                disabled={gerandoMensalidade}
              >
                {gerandoMensalidade ? 'Gerando...' : 'Gerar'}
              </button>
            </div>
        </ModalBase>
      )}

      {/* Escolher qual cobrança registrar (quando há mais de uma em aberto) */}
      {escolhendoPagamento && (
        <ModalBase titulo="Registrar pagamento" onFechar={() => setEscolhendoPagamento(false)} sujo={false}>
          <p className={styles.explicacaoModal}>Há mais de uma cobrança em aberto. Escolha qual registrar:</p>
          <ul className={styles.listaEscolha}>
            {pendentesAluna.map((pagamento) => (
              <li key={pagamento.id} className={styles.itemEscolha}>
                <div>
                  <strong>{formatarMes(pagamento.mesReferencia)}</strong>
                  <span className={styles.detalhe}>
                    {pagamento.matricula.turmas.map((turma) => turma.nome).join(', ')} · vence em{' '}
                    {formatarData(pagamento.vencimento)}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.botaoPrimario}
                  onClick={() => {
                    setEscolhendoPagamento(false)
                    setPagamentoSelecionado(paraRegistrar(pagamento))
                  }}
                >
                  {formatarMoeda(pagamento.valor)} · Registrar
                </button>
              </li>
            ))}
          </ul>
        </ModalBase>
      )}

      <ModalRegistrarPagamento
        pagamento={pagamentoSelecionado}
        onFechar={() => setPagamentoSelecionado(null)}
        onRegistrado={async () => {
          avisar('Pagamento registrado')
          await buscarPagamentos()
        }}
      />

      <ModalCorrigirPagamento
        pagamento={pagamentoEditando}
        onFechar={() => setPagamentoEditando(null)}
        onSalvo={async (acao) => {
          avisar(acao === 'desfeito' ? 'Pagamento desfeito' : 'Correção salva')
          await buscarPagamentos()
        }}
      />

      {toast}
    </div>
  )
}
