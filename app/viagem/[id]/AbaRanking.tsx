'use client'

import { useEffect, useState } from 'react'
import { Gift } from 'lucide-react'
import { apiGet } from '../../lib/api'
import { getUsuario } from '../../lib/auth'
import type { LinhaRanking } from '../../lib/viagem'
import Avatar from '../../components/Avatar'
import styles from './viagem.module.css'

const MEDALHAS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function AbaRanking({ viagemId }: { viagemId: number }) {
  const [dados, setDados] = useState<{ premio: string | null; ranking: LinhaRanking[] } | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [meuId] = useState<string | null>(() => getUsuario()?.id ?? null)

  useEffect(() => {
    apiGet<{ premio: string | null; ranking: LinhaRanking[] }>(`/viagens/${viagemId}/ranking`)
      .then(setDados)
      .catch((e: Error) => setErro(e.message))
  }, [viagemId])

  if (erro) return <p className={styles.erro}>{erro}</p>
  if (!dados) return <p className={styles.mensagem}>Carregando...</p>

  const algumPonto = dados.ranking.some((l) => l.pontos > 0)

  return (
    <div className={styles.coluna}>
      {dados.premio && (
        <div className={styles.cardPremio}>
          <Gift size={28} />
          <div>
            <p className={styles.destaqueRotulo}>Prêmio especial</p>
            <p className={styles.premioTexto}>{dados.premio}</p>
          </div>
        </div>
      )}

      <p className={styles.dica}>
        Cada foto ou vídeo ganha de 1 a 3 estrelas da coordenação. Os pontos são a soma das estrelas.
      </p>

      {!algumPonto && <p className={styles.mensagem}>Ninguém pontuou ainda. Mande suas fotos!</p>}

      <ol className={styles.listaSimples}>
        {dados.ranking.map((linha) => (
          <li
            key={linha.usuario.id}
            className={`${styles.linhaRanking} ${linha.usuario.id === meuId ? styles.linhaMinha : ''}`}
          >
            <span className={styles.posicao}>
              {linha.pontos > 0 && MEDALHAS[linha.posicao] ? MEDALHAS[linha.posicao] : `${linha.posicao}º`}
            </span>
            <Avatar nome={linha.usuario.nome} fotoUrl={linha.usuario.fotoUrl} tamanho={40} />
            <div className={styles.rankingInfo}>
              <span className={styles.rankingNome}>
                {linha.usuario.nome}
                {linha.usuario.id === meuId && ' (você)'}
              </span>
              <span className={styles.rankingDetalhe}>
                {linha.envios} envio{linha.envios === 1 ? '' : 's'}
              </span>
            </div>
            <span className={styles.pontos}>
              {linha.pontos}
              <small> pts</small>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
