'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Home, Users, GraduationCap, FolderKanban, Wallet, User, Rss, HandCoins } from 'lucide-react'
import { getUsuario } from '../lib/auth'
import BottomNav, { type ItemMenu } from '../components/BottomNav'
import Feed from '../components/Feed'
import styles from './layout.module.css'

const itensAdmin: ItemMenu[] = [
  { label: 'Home', href: '/inicio-admin', icone: Home },
  { label: 'Feed', href: '/feed', icone: Rss },
  { label: 'Associados', href: '/associados', icone: Users },
  { label: 'Professoras', href: '/professores', icone: GraduationCap },
  { label: 'Projetos', href: '/projetos', icone: FolderKanban },
  { label: 'Financeiro', href: '/financeiro', icone: Wallet },
  { label: 'Perfil', href: '/perfil-admin', icone: User },
]

const itensAssociado: ItemMenu[] = [
  { label: 'Home', href: '/inicio', icone: Home },
  { label: 'Feed', href: '/feed', icone: Rss },
  { label: 'Meus Projetos', href: '/meus-projetos', icone: FolderKanban },
  { label: 'Contribuições', href: '/contribuicoes', icone: HandCoins },
  { label: 'Perfil', href: '/perfil', icone: User },
]

const itensProfessor: ItemMenu[] = [
  { label: 'Home', href: '/inicio', icone: Home },
  { label: 'Feed', href: '/feed', icone: Rss },
  { label: 'Minhas Turmas', href: '/turmas', icone: GraduationCap },
  { label: 'Perfil', href: '/perfil', icone: User },
]

export default function FeedPage() {
  const router = useRouter()
  const [verificando, setVerificando] = useState(true)
  const [itens, setItens] = useState<ItemMenu[]>(itensAssociado)

  useEffect(() => {
    const usuario = getUsuario()

    if (!usuario) {
      router.replace('/login')
      return
    }

    if (usuario.papel === 'ADMIN') {
      setItens(itensAdmin)
    } else if (usuario.papel === 'PROFESSOR') {
      setItens(itensProfessor)
    } else {
      setItens(itensAssociado)
    }

    setVerificando(false)
  }, [router])

  if (verificando) {
    return null
  }

  return (
    <div className={styles.layout}>
      <BottomNav itens={itens} />
      <main className={styles.conteudo}>
        <Feed />
      </main>
    </div>
  )
}
