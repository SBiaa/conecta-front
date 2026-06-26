'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Home, Users, FolderKanban, Wallet, User } from 'lucide-react'
import { getUsuario } from '../lib/auth'
import BottomNav, { type ItemMenu } from '../components/BottomNav'
import styles from './layout.module.css'

const itensAdmin: ItemMenu[] = [
  { label: 'Home', href: '/inicio-admin', icone: Home },
  { label: 'Associados', href: '/associados', icone: Users },
  { label: 'Projetos', href: '/projetos', icone: FolderKanban },
  { label: 'Financeiro', href: '/financeiro', icone: Wallet },
  { label: 'Perfil', href: '/perfil-admin', icone: User },
]

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
