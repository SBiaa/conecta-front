'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Home, FolderKanban, HandCoins, User } from 'lucide-react'
import { getUsuario } from '../lib/auth'
import BottomNav, { type ItemMenu } from '../components/BottomNav'
import styles from './layout.module.css'

const itensUser: ItemMenu[] = [
  { label: 'Home', href: '/inicio', icone: Home },
  { label: 'Meus Projetos', href: '/meus-projetos', icone: FolderKanban },
  { label: 'Contribuições', href: '/contribuicoes', icone: HandCoins },
  { label: 'Perfil', href: '/perfil', icone: User },
]

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [verificando, setVerificando] = useState(true)

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

    setVerificando(false)
  }, [router])

  if (verificando) {
    return null
  }

  return (
    <div className={styles.layout}>
      <BottomNav itens={itensUser} />
      <main className={styles.conteudo}>{children}</main>
    </div>
  )
}
