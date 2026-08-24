import { Home, Users, GraduationCap, FolderKanban, Wallet, User, Rss, HandCoins, CalendarCheck } from 'lucide-react'
import type { ItemMenu } from '../components/BottomNav'

// Fonte única dos itens de menu por papel. Antes cada layout (admin, user,
// feed) mantinha sua própria cópia dessa lista — e elas já tinham
// divergido (o Feed perdeu "Progresso" e "Frequência" nas cópias dele).
// Importar daqui evita que isso volte a acontecer.
export const itensAdmin: ItemMenu[] = [
  { label: 'Home', href: '/inicio-admin', icone: Home },
  { label: 'Feed', href: '/feed', icone: Rss },
  { label: 'Associados', href: '/associados', icone: Users },
  { label: 'Professoras', href: '/professores', icone: GraduationCap },
  { label: 'Projetos', href: '/projetos', icone: FolderKanban },
  { label: 'Frequência', href: '/frequencia', icone: CalendarCheck },
  { label: 'Financeiro', href: '/financeiro', icone: Wallet },
  { label: 'Perfil', href: '/perfil-admin', icone: User },
]

export const itensAssociado: ItemMenu[] = [
  { label: 'Home', href: '/inicio', icone: Home },
  { label: 'Feed', href: '/feed', icone: Rss },
  { label: 'Meus Projetos', href: '/meus-projetos', icone: FolderKanban },
  { label: 'Progresso', href: '/meu-progresso', icone: CalendarCheck },
  { label: 'Contribuições', href: '/contribuicoes', icone: HandCoins },
  { label: 'Perfil', href: '/perfil', icone: User },
]

export const itensProfessor: ItemMenu[] = [
  { label: 'Home', href: '/inicio', icone: Home },
  { label: 'Feed', href: '/feed', icone: Rss },
  { label: 'Minhas Turmas', href: '/turmas', icone: GraduationCap },
  { label: 'Perfil', href: '/perfil', icone: User },
]

export function itensPorPapel(papel: 'ADMIN' | 'PROFESSOR' | 'ASSOCIADO'): ItemMenu[] {
  if (papel === 'ADMIN') return itensAdmin
  if (papel === 'PROFESSOR') return itensProfessor
  return itensAssociado
}
