'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { CirclePlus, Pencil, Trash2, KeyRound, Eye, EyeOff, MessageCircle } from 'lucide-react'
import { apiGet, apiPatch, apiPost, apiDelete } from '../../../lib/api'
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
import RelatorioSaude from '../../../components/RelatorioSaude'
import Avatar from '../../../components/Avatar'
import type { Avaliacao, RelatorioDaAluna } from '../../../lib/saude'
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
  // Altura e versão do bloco de saúde: a versão remonta o relatório depois que
  // uma avaliação nova é salva.
  const [alturaAluna, setAlturaAluna] = useState<number | null>(null)
  const [versaoSaude, setVersaoSaude] = useState(0)
  const [avaliacoesAluna, setAvaliacoesAluna] = useState<Avaliacao[]>([])
  const aoCarregarSaude = useCallback((relatorio: RelatorioDaAluna) => {
    setAlturaAluna(relatorio.alturaCm)
    setAvaliacoesAluna(relatorio.avaliacoes)
  }, [])

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
  const [enviandoEdicao, setEnviandoEdicao] = useState(false)
  const [erroModalEdicao, setErroModalEdicao] = useState('')

  const [matriculaParaExcluir, setMatriculaParaExcluir] = useState<Matricula | null>(null)
  const [excluindoMatricula, setExcluindoMatricula] = useState(false)
  const [erroExclusao, setErroExclusao] = useState('')

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
  }

  function fecharModalExclusao() {
    setMatriculaParaExcluir(null)
  }

  async function confirmarExclusao() {
    if (!matriculaParaExcluir) return
    setExcluindoMatricula(true)
    setErroExclusao('')
    try {
      await apiDelete(`/matriculas/${matriculaParaExcluir.id}`)
      await buscarAssociado()
      fecharModalExclusao()
    } catch {
      setErroExclusao('Não foi possível excluir a matrícula. Verifique se há pagamentos ou presenças vinculados a ela.')
    } finally {
      setExcluindoMatricula(false)
    }
  }

  function abrirModalDados() {
    if (!associado) return
    setNomeEdit(associado.nome)
    setCpfEdit(associado.cpf)
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

    if (!cpfEdit.trim()) {
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

  return (
    <div className={styles.pagina}>
      <div className={styles.cabecalho}>
        <Avatar nome={associado.nome} fotoUrl={associado.fotoUrl} tamanho={64} />
        <h1 className={styles.titulo}>{associado.nome}</h1>
      </div>

      {/* Bloco 1 — Dados pessoais */}
      <div className={styles.card}>
        <div className={styles.cabecalhoSecao}>
          <h2 className={styles.subtitulo}>Dados pessoais</h2>
          <div className={styles.botoesSenha}>
            <button className={styles.botaoAlterarSenha} onClick={abrirModalDados}>
              <Pencil size={14} />
              Editar dados
            </button>
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
            <dt>Email</dt>
            <dd>{associado.email || '—'}</dd>
          </div>
          <div className={styles.campo}>
            <dt>RG</dt>
            <dd>{associado.rg || '—'}</dd>
          </div>
          <div className={styles.campo}>
            <dt>Status</dt>
            <dd>{associado.status === 'ATIVO' ? 'Ativo' : 'Inativo'}</dd>
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
                  <div className={styles.acoesMatricula}>
                    <button
                      className={styles.botaoEditar}
                      onClick={() => abrirModalEdicao(matricula)}
                      title="Editar matrícula"
                      aria-label="Editar matrícula"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className={styles.botaoEditar}
                      onClick={() => abrirModalExclusao(matricula)}
                      title="Excluir matrícula"
                      aria-label="Excluir matrícula"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Bloco 3 — Extrato de pagamentos */}
      <div className={styles.card}>
        <div className={styles.cabecalhoSecao}>
          <h2 className={styles.subtitulo}>Extrato de pagamentos</h2>
          <button className={styles.botaoNovaMatricula} onClick={abrirModalGerar}>
            Gerar mensalidade
          </button>
        </div>

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
                      aria-label={`Registrar pagamento de ${formatarMes(pagamento.mesReferencia)}`}
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

      {/* Bloco 4 — Saúde e progresso */}
      <div className={styles.card}>
        <div className={styles.cabecalhoSecao}>
          <h2 className={styles.subtitulo}>Saúde e progresso</h2>
        </div>

        <p className={styles.avisoSaude}>
          Dado de saúde informado pela própria associada. Use só para acompanhar e adaptar as
          atividades dela.
        </p>

        <FormularioAvaliacao
          caminho={`/usuarios/${id}/avaliacoes`}
          alturaAtual={alturaAluna}
          avaliacoes={avaliacoesAluna}
          aoSalvar={() => setVersaoSaude((v) => v + 1)}
        />

        <RelatorioSaude
          key={versaoSaude}
          caminho={`/usuarios/${id}/saude`}
          aoCarregar={aoCarregarSaude}
        />
      </div>

      {/* Modal editar dados pessoais */}
      {modalDadosAberto && (
        <div className={styles.overlay} onClick={fecharModalDados}>
          <div className={`${styles.modal} ${styles.modalLargo}`} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitulo}>Editar dados pessoais</h3>

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
          </div>
        </div>
      )}

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

            {rematriculando && (
              <BlocoInscricao
                valor={inscricaoModal}
                onChange={setInscricaoModal}
                styles={styles}
                titulo="Rematrícula"
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
          </div>
        </div>
      )}

      {/* Modal excluir matrícula */}
      {matriculaParaExcluir && (
        <div className={styles.overlay} onClick={fecharModalExclusao}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitulo}>Excluir matrícula</h3>

            <p className={styles.mensagem}>
              Tem certeza que deseja excluir a matrícula em{' '}
              {matriculaParaExcluir.turmas.map((turma) => turma.nome).join(', ') || 'turma não informada'}?
              Essa ação não pode ser desfeita.
            </p>

            {erroExclusao && <p className={styles.erroModal}>{erroExclusao}</p>}

            <div className={styles.acoesModal}>
              <button className={styles.botaoCancelar} onClick={fecharModalExclusao}>
                Cancelar
              </button>
              <button
                className={styles.botaoConfirmar}
                onClick={confirmarExclusao}
                disabled={excluindoMatricula}
              >
                {excluindoMatricula ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal gerar mensalidade avulsa */}
      {modalGerarAberto && (
        <div className={styles.overlay} onClick={() => setModalGerarAberto(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitulo}>Gerar mensalidade</h3>

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
