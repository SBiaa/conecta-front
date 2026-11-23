import { Home, Users, GraduationCap, FolderKanban, Wallet, User, Rss, HandCoins, CalendarCheck, Bus } from 'lucide-react'
import type { ItemMenu } from '../components/BottomNav'

// Fonte única dos itens de menu por papel. Antes cada layout (admin, user,
// feed) mantinha sua própria cópia dessa lista — e elas já tinham
// divergido (o Feed perdeu "Progresso" e "Frequência" nas cópias dele).
// Importar daqui evita que isso volte a acontecer.
export const itensAdmin: ItemMenu[] = [
  { label: 'Início', href: '/inicio-admin', icone: Home },
  { label: 'Mural', href: '/feed', icone: Rss },
  { label: 'Associados', href: '/associados', icone: Users },
  { label: 'Professoras', href: '/professores', icone: GraduationCap },
  { label: 'Projetos', href: '/projetos', icone: FolderKanban },
  { label: 'Frequência', href: '/frequencia', icone: CalendarCheck },
  { label: 'Financeiro', href: '/financeiro', icone: Wallet },
  { label: 'Viagens', href: '/viagens', icone: Bus },
  { label: 'Perfil', href: '/perfil-admin', icone: User },
]

export const itensAssociado: ItemMenu[] = [
  // No máximo 5 itens no menu de baixo. "Meus Projetos", "Viagem" e
  // "Meus filhos" ficam como atalhos na tela de Início.
  { label: 'Início', href: '/inicio', icone: Home },
  { label: 'Mural', href: '/feed', icone: Rss },
  { label: 'Progresso', href: '/meu-progresso', icone: CalendarCheck },
  { label: 'Pagamentos', href: '/contribuicoes', icone: HandCoins },
  { label: 'Perfil', href: '/perfil', icone: User },
]

export const itensProfessor: ItemMenu[] = [
  { label: 'Início', href: '/inicio', icone: Home },
  { label: 'Mural', href: '/feed', icone: Rss },
  { label: 'Minhas Turmas', href: '/turmas', icone: GraduationCap },
  { label: 'Perfil', href: '/perfil', icone: User },
]

export function itensPorPapel(papel: 'ADMIN' | 'PROFESSOR' | 'ASSOCIADO'): ItemMenu[] {
  if (papel === 'ADMIN') return itensAdmin
  if (papel === 'PROFESSOR') return itensProfessor
  return itensAssociado
}
