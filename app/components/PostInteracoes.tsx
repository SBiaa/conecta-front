'use client'

import { useState } from 'react'
import { MessageCircle, Trash2 } from 'lucide-react'
import { apiGet, apiPost, apiDelete } from '../lib/api'
import Avatar from './Avatar'
import ConfirmDialog from './ConfirmDialog'
import styles from './PostInteracoes.module.css'

export type TipoReacao = 'CURTIR' | 'AMEI' | 'FORCA' | 'PARABENS'

export type ResumoReacoes = {
  reacoes: Partial<Record<TipoReacao, number>>
  minhaReacao: TipoReacao | null
}

type Comentario = {
  id: number
  conteudo: string
  criadoEm: string
  autor: { id: string; nome: string; fotoUrl: string | null }
}

// As contagens vêm do feed e voltam pra ele: quem manda são os dados do
// servidor, senão um recarregamento do feed não apareceria aqui.
type Props = {
  postId: number
  autorDoPostId: string
  reacoes: Partial<Record<TipoReacao, number>>
  minhaReacao: TipoReacao | null
  totalComentarios: number
  usuario: { id: string; papel: string } | null
  formatarQuando: (dataIso: string) => string
  aoMudarReacoes: (resumo: ResumoReacoes) => void
  aoMudarTotalComentarios: (total: number) => void
}

const REACOES: { tipo: TipoReacao; emoji: string; rotulo: string }[] = [
  { tipo: 'CURTIR', emoji: '👍', rotulo: 'Curtir' },
  { tipo: 'AMEI', emoji: '❤️', rotulo: 'Amei' },
  { tipo: 'FORCA', emoji: '💪', rotulo: 'Força' },
  { tipo: 'PARABENS', emoji: '🎉', rotulo: 'Parabéns' },
]

const LIMITE_COMENTARIO = 500

export default function PostInteracoes({
  postId,
  autorDoPostId,
  reacoes,
  minhaReacao,
  totalComentarios,
  usuario,
  formatarQuando,
  aoMudarReacoes,
  aoMudarTotalComentarios,
}: Props) {
  const [reagindo, setReagindo] = useState(false)

  const [aberto, setAberto] = useState(false)
  const [comentarios, setComentarios] = useState<Comentario[] | null>(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [comentarioParaApagar, setComentarioParaApagar] = useState<Comentario | null>(null)
  const [apagandoComentario, setApagandoComentario] = useState(false)

  // Clicar de novo na reação que já era minha tira a reação; clicar em outra troca.
  async function reagir(tipo: TipoReacao) {
    if (reagindo) return

    setReagindo(true)
    setErro('')
    try {
      const resumo =
        minhaReacao === tipo
          ? await apiDelete<ResumoReacoes>(`/posts/${postId}/reacao`)
          : await apiPost<ResumoReacoes>(`/posts/${postId}/reacao`, { tipo })

      aoMudarReacoes(resumo)
    } catch {
      setErro('Não foi possível registrar sua reação.')
    } finally {
      setReagindo(false)
    }
  }

  async function alternarComentarios() {
    const abrindo = !aberto
    setAberto(abrindo)

    if (!abrindo) return

    try {
      const lista = await apiGet<Comentario[]>(`/posts/${postId}/comentarios`)
      setComentarios(lista)
      aoMudarTotalComentarios(lista.length)
      setErro('')
    } catch {
      setErro('Não foi possível carregar os comentários.')
    }
  }

  async function comentar(evento: React.FormEvent) {
    evento.preventDefault()

    if (texto.trim() === '') return

    setEnviando(true)
    setErro('')
    try {
      const novo = await apiPost<Comentario>(`/posts/${postId}/comentarios`, {
        conteudo: texto.trim(),
      })

      const lista = [...(comentarios ?? []), novo]
      setComentarios(lista)
      aoMudarTotalComentarios(lista.length)
      setTexto('')
    } catch {
      setErro('Não foi possível comentar. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  async function apagarComentario(comentario: Comentario) {
    setErro('')
    setApagandoComentario(true)
    try {
      await apiDelete(`/posts/${postId}/comentarios/${comentario.id}`)

      const lista = (comentarios ?? []).filter((c) => c.id !== comentario.id)
      setComentarios(lista)
      aoMudarTotalComentarios(lista.length)
    } catch {
      setErro('Não foi possível apagar o comentário.')
    } finally {
      setApagandoComentario(false)
      setComentarioParaApagar(null)
    }
  }

  function podeApagarComentario(comentario: Comentario): boolean {
    if (!usuario) return false
    return (
      usuario.id === comentario.autor.id ||
      usuario.id === autorDoPostId ||
      usuario.papel === 'ADMIN'
    )
  }

  const totalReacoes = Object.values(reacoes).reduce((soma, n) => soma + (n ?? 0), 0)

  return (
    <div className={styles.interacoes}>
      <div className={styles.barra}>
        {REACOES.map(({ tipo, emoji, rotulo }) => {
          const quantidade = reacoes[tipo] ?? 0
          const minha = minhaReacao === tipo

          return (
            <button
              key={tipo}
              type="button"
              className={`${styles.reacao} ${minha ? styles.reacaoAtiva : ''}`}
              aria-pressed={minha}
              aria-label={rotulo}
              title={rotulo}
              disabled={reagindo}
              onClick={() => reagir(tipo)}
            >
              <span className={styles.emoji} aria-hidden="true">
                {emoji}
              </span>
              {quantidade > 0 && <span className={styles.contagem}>{quantidade}</span>}
            </button>
          )
        })}

        <button
          type="button"
          className={`${styles.comentar} ${aberto ? styles.comentarAtivo : ''}`}
          aria-expanded={aberto}
          onClick={alternarComentarios}
        >
          <MessageCircle size={16} />
          {totalComentarios === 0
            ? 'Comentar'
            : `${totalComentarios} ${totalComentarios === 1 ? 'comentário' : 'comentários'}`}
        </button>
      </div>

      {totalReacoes > 0 && (
        <p className={styles.resumo}>
          {totalReacoes} {totalReacoes === 1 ? 'reação' : 'reações'}
        </p>
      )}

      {erro && <p className={styles.erro}>{erro}</p>}

      {aberto && (
        <div className={styles.painel}>
          {comentarios === null && !erro && <p className={styles.vazio}>Carregando...</p>}

          {comentarios !== null && comentarios.length === 0 && (
            <p className={styles.vazio}>Nenhum comentário ainda. Seja a primeira!</p>
          )}

          {comentarios !== null && comentarios.length > 0 && (
            <ul className={styles.lista}>
              {comentarios.map((comentario) => (
                <li key={comentario.id} className={styles.comentario}>
                  <Avatar nome={comentario.autor.nome} fotoUrl={comentario.autor.fotoUrl} tamanho={30} />

                  <div className={styles.comentarioCorpo}>
                    <div className={styles.comentarioCabecalho}>
                      <span className={styles.comentarioAutor}>{comentario.autor.nome}</span>
                      <span className={styles.comentarioQuando}>
                        · {formatarQuando(comentario.criadoEm)}
                      </span>

                      {podeApagarComentario(comentario) && (
                        <button
                          type="button"
                          className={styles.botaoApagar}
                          aria-label="Apagar comentário"
                          onClick={() => setComentarioParaApagar(comentario)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <p className={styles.comentarioTexto}>{comentario.conteudo}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form className={styles.form} onSubmit={comentar}>
            <input
              className={styles.campo}
              placeholder="Escreva um comentário..."
              maxLength={LIMITE_COMENTARIO}
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
            />
            <button className={styles.botaoEnviar} disabled={enviando || texto.trim() === ''}>
              {enviando ? 'Enviando...' : 'Enviar'}
            </button>
          </form>
        </div>
      )}

      <ConfirmDialog
        aberto={comentarioParaApagar !== null}
        titulo="Apagar comentário"
        mensagem="Tem certeza que deseja apagar este comentário?"
        carregando={apagandoComentario}
        onConfirmar={() => comentarioParaApagar && apagarComentario(comentarioParaApagar)}
        onCancelar={() => setComentarioParaApagar(null)}
      />
    </div>
  )
}
