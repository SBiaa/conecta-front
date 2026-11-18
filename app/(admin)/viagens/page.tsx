'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiGet, apiPost } from '../../lib/api'
import { formatarDiaCurto, type ViagemResumo } from '../../lib/viagem'
import styles from './viagens.module.css'

export default function ViagensAdminPage() {
  const router = useRouter()
  const [viagens, setViagens] = useState<ViagemResumo[] | null>(null)
  const [nome, setNome] = useState('')
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    apiGet<ViagemResumo[]>('/viagens').then(setViagens).catch((e: Error) => setErro(e.message))
  }, [])

  const criar = async (e: React.FormEvent) => {
    e.preventDefault()
    setCriando(true)
    setErro(null)
    try {
      const viagem = await apiPost<ViagemResumo>('/viagens', { nome })
      router.push(`/viagens/${viagem.id}`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível criar')
      setCriando(false)
    }
  }

  return (
    <div className={styles.pagina}>
      <h1 className={styles.titulo}>Viagens</h1>

      <form onSubmit={criar} className={styles.card}>
        <label className={styles.rotulo} htmlFor="nome-viagem">Nova viagem</label>
        <div className={styles.linha}>
          <input
            id="nome-viagem"
            className={styles.campo}
            placeholder="Ex.: Viagem de fim de ano — Águas de Lindóia"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <button className={styles.botao} disabled={criando || nome.trim() === ''}>
            {criando ? 'Criando...' : 'Criar'}
          </button>
        </div>
      </form>

      {erro && <p className={styles.erro}>{erro}</p>}
      {viagens === null && !erro && <p className={styles.mensagem}>Carregando...</p>}
      {viagens?.length === 0 && <p className={styles.mensagem}>Nenhuma viagem cadastrada ainda.</p>}

      <ul className={styles.lista}>
        {viagens?.map((v) => (
          <li key={v.id}>
            <Link href={`/viagens/${v.id}`} className={styles.item}>
              <div>
                <p className={styles.nome}>{v.nome}</p>
                <p className={styles.detalhe}>
                  {[
                    v.destino,
                    v.dataSaida && `saída ${formatarDiaCurto(v.dataSaida)}`,
                    `${v._count?.participantes ?? 0} participantes`,
                    `${v._count?.midias ?? 0} fotos/vídeos`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <span className={`${styles.status} ${v.ativa ? styles.ativo : styles.inativo}`}>
                {v.ativa ? 'Ativa' : 'Desativada'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
