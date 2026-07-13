'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Home, FolderKanban, HandCoins, User, GraduationCap } from 'lucide-react'
import { getUsuario } from '../lib/auth'
import BottomNav, { type ItemMenu } from '../components/BottomNav'
import styles from './layout.module.css'

const itensAssociado: ItemMenu[] = [
  { label: 'Home', href: '/inicio', icone: Home },
  { label: 'Meus Projetos', href: '/meus-projetos', icone: FolderKanban },
  { label: 'Contribuições', href: '/contribuicoes', icone: HandCoins },
  { label: 'Perfil', href: '/perfil', icone: User },
]

const itensProfessor: ItemMenu[] = [
  { label: 'Home', href: '/inicio', icone: Home },
  { label: 'Minhas Turmas', href: '/turmas', icone: GraduationCap },
  { label: 'Perfil', href: '/perfil', icone: User },
]

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [verificando, setVerificando] = useState(true)
  const [papel, setPapel] = useState<'ASSOCIADO' | 'PROFESSOR'>('ASSOCIADO')

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
    setVerificando(false)
  }, [router])

  if (verificando) {
    return null
  }

  return (
    <div className={styles.layout}>
      <BottomNav itens={papel === 'PROFESSOR' ? itensProfessor : itensAssociado} />
      <main className={styles.conteudo}>{children}</main>
    </div>
  )
}
