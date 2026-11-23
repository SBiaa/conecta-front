'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getUsuario } from '../lib/auth'
import MenuAdmin from '../components/MenuAdmin'
import styles from './layout.module.css'

// Telas de tabela/lista larga ocupam o espaço todo; as demais ficam na coluna de 960px.
const ROTAS_LARGAS = new RegExp('^/(associados|financeiro|frequencia)(/|$)')

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
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
      <MenuAdmin />
      <main className={`${styles.conteudo} ${ROTAS_LARGAS.test(pathname) ? styles.larga : ''}`}>{children}</main>
    </div>
  )
}
