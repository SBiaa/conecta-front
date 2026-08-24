'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUsuario } from '../lib/auth'
import { itensAdmin } from '../lib/menus'
import BottomNav from '../components/BottomNav'
import styles from './layout.module.css'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [verificando, setVerificando] = useState(true)

  useEffect(() => {
    const usuario = getUsuario()

    if (!usuario) {
      router.replace('/login')
      return
    }

    if (usuario.papel !== 'ADMIN') {
      router.replace('/inicio')
      return
    }

    setVerificando(false)
  }, [router])

  if (verificando) {
    return null
  }

  return (
    <div className={styles.layout}>
      <BottomNav itens={itensAdmin} />
      <main className={styles.conteudo}>{children}</main>
    </div>
  )
}
