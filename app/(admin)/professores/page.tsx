'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiGet } from '../../lib/api'
import styles from './professores.module.css'

type Professor = {
  id: string
  nome: string
  cpf: string
  telefone: string | null
  status: 'ATIVO' | 'INATIVO'
}

export default function ProfessoresPage() {
  const [busca, setBusca] = useState('')
  const [professores, setProfessores] = useState<Professor[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    setCarregando(true)

    const timeout = setTimeout(() => {
      const query = busca.trim()
        ? `?papel=PROFESSOR&busca=${encodeURIComponent(busca.trim())}`
        : '?papel=PROFESSOR'

      apiGet<Professor[]>(`/usuarios${query}`)
        .then(setProfessores)
        .finally(() => setCarregando(false))
    }, 400)

    return () => clearTimeout(timeout)
  }, [busca])

  return (
    <div className={styles.pagina}>
      <div className={styles.header}>
        <h1 className={styles.titulo}>Professoras</h1>
        <Link href="/professores/novo" className={styles.botaoNovo}>
          Nova professora
        </Link>
      </div>

      <div className={styles.busca}>
        <input
          type="text"
          placeholder="Buscar por nome ou CPF"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
        />
      </div>

      {carregando && <p className={styles.mensagem}>Carregando...</p>}

      {!carregando && professores.length === 0 && (
        <p className={styles.mensagem}>Nenhuma professora encontrada</p>
      )}

      {!carregando && professores.length > 0 && (
        <ul className={styles.lista}>
          {professores.map((professor) => (
            <li key={professor.id} className={styles.item}>
              <Link href={`/professores/${professor.id}`} className={styles.link}>
                <div className={styles.info}>
                  <span className={styles.nome}>{professor.nome}</span>
                  <span className={styles.detalhe}>{professor.cpf}</span>
                  <span className={styles.detalhe}>{professor.telefone || '—'}</span>
                </div>
                <span
                  className={`${styles.status} ${
                    professor.status === 'ATIVO' ? styles.statusAtivo : styles.statusInativo
                  }`}
                >
                  {professor.status === 'ATIVO' ? 'Ativo' : 'Inativo'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
