'use client'

import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { apiGet, apiPost, apiDelete } from '../lib/api'
import { getUsuario } from '../lib/auth'
import PostInteracoes, { type TipoReacao } from './PostInteracoes'
import Avatar from './Avatar'
import styles from './Feed.module.css'

type Alcance = 'GERAL' | 'PROJETO' | 'TURMA'

type Post = {
  id: number
  conteudo: string
  tipo: Alcance
  criadoEm: string
  autor: { id: string; nome: string; fotoUrl: string | null }
  projeto?: { nome: string } | null
  turma?: { nome: string } | null
  reacoes: Partial<Record<TipoReacao, number>>
  minhaReacao: TipoReacao | null
  totalComentarios: number
}

type Opcao = { id: number; nome: string }

type Matricula = {
  id: number
  ativa: boolean
  turmas: {
    id: number
    nome: string
    projeto: { id: number; nome: string }
  }[]
}

type TurmaProfessor = {
  id: number
  nome: string
  projetoId: number
  projeto: { nome: string }
}

function formatarQuando(dataIso: string): string {
  const data = new Date(dataIso)
  const diffMs = Date.now() - data.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `há ${diffMin} min`

  const diffHoras = Math.floor(diffMin / 60)
  if (diffHoras < 24) return `há ${diffHoras} h`

  const diffDias = Math.floor(diffHoras / 24)
  if (diffDias < 7) return `há ${diffDias} dia${diffDias > 1 ? 's' : ''}`

  const dia = String(data.getUTCDate()).padStart(2, '0')
  const mes = String(data.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${data.getUTCFullYear()}`
}

function rotuloAlcance(post: Post): string {
  if (post.tipo === 'PROJETO') return `Projeto: ${post.projeto?.nome ?? ''}`
  if (post.tipo === 'TURMA') return `Turma: ${post.turma?.nome ?? ''}`
  return 'Geral'
}

export default function Feed() {
  const [usuario, setUsuario] = useState<{ id: string; nome: string; papel: string } | null>(
    null
  )

  const [posts, setPosts] = useState<Post[] | null>(null)
  const [erroFeed, setErroFeed] = useState('')

  const [conteudo, setConteudo] = useState('')
  const [alcance, setAlcance] = useState<Alcance>('GERAL')
  const [projetoId, setProjetoId] = useState('')
  const [turmaId, setTurmaId] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erroForm, setErroForm] = useState('')

  const [projetosAdmin, setProjetosAdmin] = useState<Opcao[]>([])
  const [turmasDoProjetoAdmin, setTurmasDoProjetoAdmin] = useState<Opcao[]>([])
  const [matriculas, setMatriculas] = useState<Matricula[]>([])
  const [turmasProfessor, setTurmasProfessor] = useState<TurmaProfessor[]>([])

  const [apagandoId, setApagandoId] = useState<number | null>(null)

  const ehAdmin = usuario?.papel === 'ADMIN'
  const ehProfessor = usuario?.papel === 'PROFESSOR'

  useEffect(() => {
    setUsuario(getUsuario())
  }, [])

  useEffect(() => {
    if (!usuario) return

    if (usuario.papel === 'ADMIN') {
      apiGet<Opcao[]>('/projetos').then(setProjetosAdmin).catch(() => {})
    } else if (usuario.papel === 'PROFESSOR') {
      apiGet<TurmaProfessor[]>('/professor/turmas').then(setTurmasProfessor).catch(() => {})
    } else {
      apiGet<Matricula[]>('/me/matriculas').then(setMatriculas).catch(() => {})
    }
  }, [usuario])

  function buscarFeed() {
    apiGet<Post[]>('/posts/feed')
      .then((dados) => {
        setPosts(dados)
        setErroFeed('')
      })
      .catch(() => setErroFeed('Não foi possível carregar o feed.'))
  }

  useEffect(() => {
    buscarFeed()
  }, [])

  useEffect(() => {
    if (ehAdmin && alcance === 'TURMA' && projetoId) {
      apiGet<Opcao[]>(`/turmas?projetoId=${projetoId}`)
        .then(setTurmasDoProjetoAdmin)
        .catch(() => setTurmasDoProjetoAdmin([]))
    } else {
      setTurmasDoProjetoAdmin([])
    }
  }, [ehAdmin, alcance, projetoId])

  const projetosNaoAdmin: Opcao[] = ehProfessor
    ? Array.from(
        new Map(
          turmasProfessor.map((t) => [t.projetoId, { id: t.projetoId, nome: t.projeto.nome }])
        ).values()
      )
    : Array.from(
        new Map(
          matriculas.flatMap((m) => m.turmas.map((turma) => [turma.projeto.id, turma.projeto]))
        ).values()
      )

  const turmasNaoAdmin: Opcao[] = ehProfessor
    ? turmasProfessor.map((t) => ({ id: t.id, nome: t.nome }))
    : matriculas.flatMap((m) =>
        m.turmas.map((turma) => ({
          id: turma.id,
          nome: turma.nome,
        }))
      )

  function trocarAlcance(novoAlcance: Alcance) {
    setAlcance(novoAlcance)
    setProjetoId('')
    setTurmaId('')
    setTurmasDoProjetoAdmin([])
  }

  async function publicar(evento: React.FormEvent) {
    evento.preventDefault()
    setErroForm('')

    if (conteudo.trim() === '') {
      setErroForm('Escreva algo para publicar.')
      return
    }

    if (alcance === 'PROJETO' && !projetoId) {
      setErroForm('Escolha o projeto.')
      return
    }

    if (alcance === 'TURMA' && !turmaId) {
      setErroForm('Escolha a turma.')
      return
    }

    setEnviando(true)
    try {
      await apiPost('/posts', {
        conteudo: conteudo.trim(),
        tipo: alcance,
        projetoId: alcance === 'PROJETO' ? Number(projetoId) : undefined,
        turmaId: alcance === 'TURMA' ? Number(turmaId) : undefined,
      })

      setConteudo('')
      trocarAlcance('GERAL')
      buscarFeed()
    } catch {
      setErroForm('Não foi possível publicar. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  async function apagar(post: Post) {
    const confirmou = window.confirm('Tem certeza que deseja apagar esta publicação?')
    if (!confirmou) return

    setApagandoId(post.id)
    try {
      await apiDelete(`/posts/${post.id}`)
      buscarFeed()
    } catch {
      setErroFeed('Não foi possível apagar a publicação.')
    } finally {
      setApagandoId(null)
    }
  }

  // Reagir e comentar mexem só num post, então trocam esse item da lista em vez
  // de recarregar o feed inteiro — assim ninguém perde o lugar na rolagem.
  function atualizarPost(id: number, mudanca: Partial<Post>) {
    setPosts((atuais) =>
      atuais === null
        ? atuais
        : atuais.map((post) => (post.id === id ? { ...post, ...mudanca } : post))
    )
  }

  function podeApagar(post: Post): boolean {
    if (!usuario) return false
    return usuario.id === post.autor.id || usuario.papel === 'ADMIN'
  }

  return (
    <div className={styles.pagina}>
      <h1 className={styles.titulo}>Feed</h1>

      <div className={styles.cardForm}>
        <form onSubmit={publicar}>
          <textarea
            className={styles.textarea}
            placeholder="Escreva uma publicação..."
            rows={4}
            value={conteudo}
            onChange={(evento) => setConteudo(evento.target.value)}
          />

          <div className={styles.campo}>
            <label htmlFor="alcance">Onde publicar</label>
            <select
              id="alcance"
              value={alcance}
              onChange={(evento) => trocarAlcance(evento.target.value as Alcance)}
            >
              <option value="GERAL">Geral</option>
              <option value="PROJETO">Um projeto</option>
              <option value="TURMA">Uma turma</option>
            </select>
          </div>

          {alcance === 'PROJETO' && (
            <div className={styles.campo}>
              <label htmlFor="projetoId">Projeto</label>
              <select
                id="projetoId"
                value={projetoId}
                onChange={(evento) => setProjetoId(evento.target.value)}
              >
                <option value="">Selecione...</option>
                {(ehAdmin ? projetosAdmin : projetosNaoAdmin).map((projeto) => (
                  <option key={projeto.id} value={projeto.id}>
                    {projeto.nome}
                  </option>
                ))}
              </select>
              {!ehAdmin && projetosNaoAdmin.length === 0 && (
                <span className={styles.erro}>Você não participa de nenhum projeto.</span>
              )}
            </div>
          )}

          {alcance === 'TURMA' && ehAdmin && (
            <div className={styles.campo}>
              <label htmlFor="projetoParaTurma">Projeto</label>
              <select
                id="projetoParaTurma"
                value={projetoId}
                onChange={(evento) => {
                  setProjetoId(evento.target.value)
                  setTurmaId('')
                }}
              >
                <option value="">Selecione...</option>
                {projetosAdmin.map((projeto) => (
                  <option key={projeto.id} value={projeto.id}>
                    {projeto.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {alcance === 'TURMA' && (
            <div className={styles.campo}>
              <label htmlFor="turmaId">Turma</label>
              <select
                id="turmaId"
                value={turmaId}
                disabled={ehAdmin && !projetoId}
                onChange={(evento) => setTurmaId(evento.target.value)}
              >
                <option value="">Selecione...</option>
                {(ehAdmin ? turmasDoProjetoAdmin : turmasNaoAdmin).map((turma) => (
                  <option key={turma.id} value={turma.id}>
                    {turma.nome}
                  </option>
                ))}
              </select>
              {!ehAdmin && turmasNaoAdmin.length === 0 && (
                <span className={styles.erro}>Você não participa de nenhuma turma.</span>
              )}
            </div>
          )}

          {erroForm && <span className={styles.erro}>{erroForm}</span>}

          <button className={styles.botao} disabled={enviando}>
            {enviando ? 'Publicando...' : 'Publicar'}
          </button>
        </form>
      </div>

      {erroFeed && <p className={styles.mensagemErro}>{erroFeed}</p>}

      {!erroFeed && posts === null && <p className={styles.mensagem}>Carregando...</p>}

      {!erroFeed && posts !== null && posts.length === 0 && (
        <p className={styles.mensagem}>Nenhum post ainda.</p>
      )}

      {!erroFeed && posts !== null && posts.length > 0 && (
        <ul className={styles.lista}>
          {posts.map((post) => (
            <li key={post.id} className={styles.card}>
              <div className={styles.cabecalho}>
                <div className={styles.quemPostou}>
                  <Avatar nome={post.autor.nome} fotoUrl={post.autor.fotoUrl} tamanho={38} />
                  <div>
                    <span className={styles.autor}>{post.autor.nome}</span>
                    <span className={styles.quando}> · {formatarQuando(post.criadoEm)}</span>
                  </div>
                </div>

                {podeApagar(post) && (
                  <button
                    type="button"
                    className={styles.botaoApagar}
                    aria-label="Apagar publicação"
                    disabled={apagandoId === post.id}
                    onClick={() => apagar(post)}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              <span className={styles.badge}>{rotuloAlcance(post)}</span>

              <p className={styles.conteudo}>{post.conteudo}</p>

              <PostInteracoes
                postId={post.id}
                autorDoPostId={post.autor.id}
                reacoes={post.reacoes}
                minhaReacao={post.minhaReacao}
                totalComentarios={post.totalComentarios}
                usuario={usuario}
                formatarQuando={formatarQuando}
                aoMudarReacoes={(resumo) => atualizarPost(post.id, resumo)}
                aoMudarTotalComentarios={(total) =>
                  atualizarPost(post.id, { totalComentarios: total })
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
