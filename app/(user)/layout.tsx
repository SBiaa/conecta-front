'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUsuario } from '../lib/auth'
import { useItensMenu } from '../lib/useItensMenu'
import BottomNav from '../components/BottomNav'
import styles from './layout.module.css'

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [papel, setPapel] = useState<'ASSOCIADO' | 'PROFESSOR' | null>(null)
  const itens = useItensMenu(papel)

  useEffect(() => {
    const usuario = getUsuario()

    if (!usuario) {
      router.replace('/login')
      return
    }

    if (usuario.papel !== 'ASSOCIADO' && usuario.papel !== 'PROFESSOR') {
      router.replace('/inicio-admin')
      return
    }

    setPapel(usuario.papel)
  }, [router])

  if (!papel) {
    return (
      <div className={styles.carregando} role="status">
        Carregando...
      </div>
    )
  }

  return (
    <div className={styles.layout}>
      <BottomNav itens={itens} />
      <main className={styles.conteudo}>{children}</main>
    </div>
  )
}
