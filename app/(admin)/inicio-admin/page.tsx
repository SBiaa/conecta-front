'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, FolderKanban, Wallet } from 'lucide-react'
import { getUsuario } from '../../lib/auth'
import styles from './inicio-admin.module.css'

type Usuario = {
  nome: string
}

export default function InicioAdminPage() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)

  useEffect(() => {
    setUsuario(getUsuario())
  }, [])

  return (
    <div className={styles.pagina}>
      <h1 className={styles.saudacao}>Olá, {usuario?.nome ?? '...'}</h1>

      <div className={styles.destaques}>
        <Link href="/matriculas/nova" className={styles.botaoDestaque}>
          Nova aluna
        </Link>
        <Link href="/associados/novo" className={styles.botaoDestaque}>
          Novo associado
        </Link>
      </div>

      <h2 className={styles.subtitulo}>Acesso rápido</h2>

      <div className={styles.cards}>
        <Link href="/associados" className={styles.card}>
          <Users size={28} />
          <span>Associados</span>
        </Link>
        <Link href="/projetos" className={styles.card}>
          <FolderKanban size={28} />
          <span>Projetos</span>
        </Link>
        <Link href="/financeiro" className={styles.card}>
          <Wallet size={28} />
          <span>Financeiro</span>
        </Link>
      </div>
    </div>
  )
}
