'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { apiGet, apiPatch } from '../../../lib/api'
import { montarMensagemAcesso, montarLinkWhatsapp, type AcessoGerado } from '../../../lib/acesso'
import Avatar from '../../../components/Avatar'
import styles from './perfil.module.css'

type Professor = {
  id: string
  nome: string
  cpf: string
  email: string | null
  telefone: string | null
  fotoUrl: string | null
  status: 'ATIVO' | 'INATIVO'
}

type Turma = {
  id: number
  nome: string
  horario: string | null
  dias: string[]
  projeto: { nome: string }
  professor: { id: string; nome: string } | null
  ativas: number
}

const LABELS_DIA: Record<string, string> = {
  SEGUNDA: 'Seg',
  TERCA: 'Ter',
  QUARTA: 'Qua',
  QUINTA: 'Qui',
  SEXTA: 'Sex',
  SABADO: 'Sáb',
  DOMINGO: 'Dom',
}

export default function PerfilProfessorPage() {
  const { id } = useParams<{ id: string }>()

  const [professor, setProfessor] = useState<Professor | null>(null)
  const [erro, setErro] = useState('')

  const [editandoDados, setEditandoDados] = useState(false)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'ATIVO' | 'INATIVO'>('ATIVO')
  const [salvandoDados, setSalvandoDados] = useState(false)
  const [erroDados, setErroDados] = useState('')
  const [sucessoDados, setSucessoDados] = useState(false)

  const [acessoParaEnviar, setAcessoParaEnviar] = useState<AcessoGerado | null>(null)
  const [acessoCopiado, setAcessoCopiado] = useState(false)
  const [senhaConhecida, setSenhaConhecida] = useState<string | null>(null)
  const [gerandoAcesso, setGerandoAcesso] = useState(false)
  const [erroAcesso, setErroAcesso] = useState('')

  const [turmas, setTurmas] = useState<Turma[]>([])
  const [carregandoTurmas, setCarregandoTurmas] = useState(true)
  const [editandoTurmas, setEditandoTurmas] = useState(false)
  const [turmaIdsSelecionadas, setTurmaIdsSelecionadas] = useState<Set<number>>(new Set())
  const [salvandoTurmas, setSalvandoTurmas] = useState(false)
  const [erroTurmas, setErroTurmas] = useState('')
  const [sucessoTurmas, setSucessoTurmas] = useState(false)

  useEffect(() => {
    apiGet<Professor>(`/usuarios/${id}`)
      .then(setProfessor)
      .catch(() => setErro('Professora não encontrada'))
  }, [id])

  function carregarTurmas() {
    setCarregandoTurmas(true)
    apiGet<Turma[]>('/turmas')
      .then((todas) => {
        setTurmas(todas)
        setTurmaIdsSelecionadas(
          new Set(todas.filter((t) => t.professor?.id === id).map((t) => t.id))
        )
      })
      .finally(() => setCarregandoTurmas(false))
  }

  useEffect(() => {
    carregarTurmas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (erro) {
    return (
      <div className={styles.pagina}>
        <p className={styles.erro}>{erro}</p>
      </div>
    )
  }

  if (!professor) {
    return (
      <div className={styles.pagina}>
        <p className={styles.mensagem}>Carregando...</p>
      </div>
    )
  }

  async function abrirAcesso() {
    if (!professor) return
    setErroAcesso('')

    if (senhaConhecida) {
      setAcessoParaEnviar({
        nome: professor.nome,
        cpf: professor.cpf,
        senha: senhaConhecida,
        telefone: professor.telefone,
      })
      setAcessoCopiado(false)
      return
    }

    // Não há como recuperar a senha atual (fica só o hash), então geramos
    // uma nova senha real para poder mandar no acesso.
    setGerandoAcesso(true)
    try {
      const resposta = await apiPatch<{ senha: string }>(`/usuarios/${id}/senha`, {})
      setSenhaConhecida(resposta.senha)
      setAcessoParaEnviar({
        nome: professor.nome,
        cpf: professor.cpf,
        senha: resposta.senha,
        telefone: professor.telefone,
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

  function iniciarEdicaoDados() {
    if (!professor) return
    setNome(professor.nome)
    setTelefone(professor.telefone ?? '')
    setEmail(professor.email ?? '')
    setStatus(professor.status)
    setErroDados('')
    setSucessoDados(false)
    setEditandoDados(true)
  }

  async function salvarDados(evento: React.FormEvent) {
    evento.preventDefault()
    setErroDados('')
    setSucessoDados(false)
    setSalvandoDados(true)

    try {
      const atualizado = await apiPatch<Professor>(`/usuarios/${id}`, {
        nome,
        telefone: telefone || null,
        email: email || null,
        status,
      })
      setProfessor((anterior) => (anterior ? { ...anterior, ...atualizado } : anterior))
      setSucessoDados(true)
      setEditandoDados(false)
    } catch {
      setErroDados('Não foi possível salvar os dados da professora')
    } finally {
      setSalvandoDados(false)
    }
  }

  function alternarTurma(turmaId: number) {
    setTurmaIdsSelecionadas((anterior) => {
      const nova = new Set(anterior)
      if (nova.has(turmaId)) {
        nova.delete(turmaId)
      } else {
        nova.add(turmaId)
      }
      return nova
    })
  }

  function cancelarEdicaoTurmas() {
    setTurmaIdsSelecionadas(new Set(turmas.filter((t) => t.professor?.id === id).map((t) => t.id)))
    setErroTurmas('')
    setEditandoTurmas(false)
  }

  async function salvarTurmas() {
    setErroTurmas('')
    setSucessoTurmas(false)
    setSalvandoTurmas(true)

    const originais = new Set(turmas.filter((t) => t.professor?.id === id).map((t) => t.id))
    const alteradas = turmas.filter(
      (t) => originais.has(t.id) !== turmaIdsSelecionadas.has(t.id)
    )

    try {
      await Promise.all(
        alteradas.map((t) =>
          apiPatch(`/turmas/${t.id}`, {
            professorId: turmaIdsSelecionadas.has(t.id) ? id : null,
          })
        )
      )
      carregarTurmas()
      setSucessoTurmas(true)
      setEditandoTurmas(false)
    } catch {
      setErroTurmas('Não foi possível salvar as turmas atribuídas')
    } finally {
      setSalvandoTurmas(false)
    }
  }

  return (
    <div className={styles.pagina}>
      <div className={styles.cabecalho}>
        <Avatar nome={professor.nome} fotoUrl={professor.fotoUrl} tamanho={64} />
        <h1 className={styles.titulo}>{professor.nome}</h1>
      </div>

      <div className={styles.card}>
        <div className={styles.cabecalhoCard}>
          <h2 className={styles.subtitulo}>Dados pessoais</h2>
          {!editandoDados && (
            <div className={styles.acoesCabecalho}>
              <button className={styles.botaoEditar} onClick={iniciarEdicaoDados}>
                Editar
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
          )}
        </div>

        {erroAcesso && <p className={styles.erro}>{erroAcesso}</p>}

        {acessoParaEnviar && (
          <div className={styles.avisoSenha}>
            <p className={styles.avisoSenhaTexto}>Envie a mensagem abaixo para a professora.</p>
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

        {!editandoDados && (
          <dl className={styles.grade}>
            <div className={styles.campo}>
              <dt>CPF</dt>
              <dd>{professor.cpf}</dd>
            </div>
            <div className={styles.campo}>
              <dt>Telefone</dt>
              <dd>{professor.telefone || '—'}</dd>
            </div>
            <div className={styles.campo}>
              <dt>Email</dt>
              <dd>{professor.email || '—'}</dd>
            </div>
            <div className={styles.campo}>
              <dt>Status</dt>
              <dd>{professor.status === 'ATIVO' ? 'Ativo' : 'Inativo'}</dd>
            </div>
          </dl>
        )}

        {editandoDados && (
          <form className={styles.formEdicao} onSubmit={salvarDados}>
            <div className={styles.campoForm}>
              <label htmlFor="nome">Nome</label>
              <input
                id="nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
            <div className={styles.campoForm}>
              <label htmlFor="telefone">Telefone</label>
              <input
                id="telefone"
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
            </div>
            <div className={styles.campoForm}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className={styles.campoForm}>
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'ATIVO' | 'INATIVO')}
              >
                <option value="ATIVO">Ativo</option>
                <option value="INATIVO">Inativo</option>
              </select>
            </div>

            <div className={styles.acoesForm}>
              <button className={styles.botaoSalvar} disabled={salvandoDados}>
                {salvandoDados ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                type="button"
                className={styles.botaoCancelar}
                onClick={() => setEditandoDados(false)}
                disabled={salvandoDados}
              >
                Cancelar
              </button>
            </div>
            {erroDados && <span className={styles.erro}>{erroDados}</span>}
          </form>
        )}

        {sucessoDados && !editandoDados && (
          <span className={styles.sucesso}>Dados atualizados!</span>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.cabecalhoCard}>
          <h2 className={styles.subtitulo}>Turmas atribuídas</h2>
          {!editandoTurmas && (
            <button
              className={styles.botaoEditar}
              onClick={() => setEditandoTurmas(true)}
              disabled={carregandoTurmas}
            >
              Atribuir turma
            </button>
          )}
        </div>

        {carregandoTurmas && <p className={styles.mensagem}>Carregando...</p>}

        {!carregandoTurmas && !editandoTurmas && turmaIdsSelecionadas.size === 0 && (
          <p className={styles.mensagem}>Nenhuma turma atribuída a esta professora</p>
        )}

        {!carregandoTurmas && !editandoTurmas && turmaIdsSelecionadas.size > 0 && (
          <ul className={styles.listaTurmas}>
            {turmas
              .filter((turma) => turmaIdsSelecionadas.has(turma.id))
              .map((turma) => (
                <li key={turma.id} className={styles.itemTurma}>
                  <span className={styles.nomeProjeto}>{turma.projeto.nome}</span>
                  <p className={styles.nomeTurma}>{turma.nome}</p>
                  <span className={styles.detalhe}>
                    {turma.dias.map((d) => LABELS_DIA[d] ?? d).join(', ')}
                    {turma.horario ? ` — ${turma.horario}` : ''}
                    {turma.dias.length > 0 || turma.horario ? ' · ' : ''}
                    {turma.ativas} alunas
                  </span>
                </li>
              ))}
          </ul>
        )}

        {!carregandoTurmas && editandoTurmas && (
          <>
            <ul className={styles.listaSelecaoTurmas}>
              {turmas.map((turma) => {
                const atribuidaOutra = turma.professor && turma.professor.id !== id
                return (
                  <li key={turma.id} className={styles.itemSelecaoTurma}>
                    <label>
                      <input
                        type="checkbox"
                        checked={turmaIdsSelecionadas.has(turma.id)}
                        onChange={() => alternarTurma(turma.id)}
                      />
                      <span className={styles.nomeProjeto}>{turma.projeto.nome}</span>
                      <span className={styles.nomeTurma}>{turma.nome}</span>
                      {atribuidaOutra && (
                        <span className={styles.avisoOutraProfessora}>
                          atualmente com {turma.professor!.nome}
                        </span>
                      )}
                    </label>
                  </li>
                )
              })}
            </ul>

            <div className={styles.acoesForm}>
              <button
                className={styles.botaoSalvar}
                onClick={salvarTurmas}
                disabled={salvandoTurmas}
              >
                {salvandoTurmas ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                type="button"
                className={styles.botaoCancelar}
                onClick={cancelarEdicaoTurmas}
                disabled={salvandoTurmas}
              >
                Cancelar
              </button>
            </div>
            {erroTurmas && <span className={styles.erro}>{erroTurmas}</span>}
          </>
        )}

        {sucessoTurmas && !editandoTurmas && (
          <span className={styles.sucesso}>Turmas atualizadas!</span>
        )}
      </div>
    </div>
  )
}
