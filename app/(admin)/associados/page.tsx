'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiGet } from '../../lib/api'
import styles from './associados.module.css'

type Associado = {
  id: string
  nome: string
  cpf: string
  telefone: string | null
  status: 'ATIVO' | 'INATIVO'
}

export default function AssociadosPage() {
  const [busca, setBusca] = useState('')
  const [associados, setAssociados] = useState<Associado[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    setCarregando(true)

    const timeout = setTimeout(() => {
      const query = busca.trim()
        ? `?papel=ASSOCIADO&busca=${encodeURIComponent(busca.trim())}`
        : '?papel=ASSOCIADO'

      apiGet<Associado[]>(`/usuarios${query}`)
        .then(setAssociados)
        .finally(() => setCarregando(false))
    }, 400)

    return () => clearTimeout(timeout)
  }, [busca])

  return (
    <div className={styles.pagina}>
      <div className={styles.header}>
        <h1 className={styles.titulo}>Associados</h1>
        <Link href="/associados/novo" className={styles.botaoNovo}>
          Novo associado
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

      {!carregando && associados.length === 0 && (
        <p className={styles.mensagem}>Nenhum associado encontrado</p>
      )}

      {!carregando && associados.length > 0 && (
        <ul className={styles.lista}>
          {associados.map((associado) => (
            <li key={associado.id} className={styles.item}>
              <Link href={`/associados/${associado.id}`} className={styles.link}>
                <div className={styles.info}>
                  <span className={styles.nome}>{associado.nome}</span>
                  <span className={styles.detalhe}>{associado.cpf}</span>
                  <span className={styles.detalhe}>{associado.telefone || '—'}</span>
                </div>
                <span
                  className={`${styles.status} ${
                    associado.status === 'ATIVO' ? styles.statusAtivo : styles.statusInativo
                  }`}
                >
                  {associado.status === 'ATIVO' ? 'Ativo' : 'Inativo'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
