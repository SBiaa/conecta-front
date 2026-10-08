'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Baby } from 'lucide-react'
import { getUsuario } from '../lib/auth'
import { apiGet } from '../lib/api'
import { itensAssociado, itensProfessor } from '../lib/menus'
import BottomNav from '../components/BottomNav'
import styles from './layout.module.css'

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [verificando, setVerificando] = useState(true)
  const [papel, setPapel] = useState<'ASSOCIADO' | 'PROFESSOR'>('ASSOCIADO')
  const [temFilhos, setTemFilhos] = useState(false)

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

    // Só quem é responsável por alguém ganha o item "Meus filhos" no menu.
    if (usuario.papel === 'ASSOCIADO') {
      apiGet<unknown[]>('/me/dependentes')
        .then((lista) => setTemFilhos(lista.length > 0))
        .catch(() => setTemFilhos(false))
    }
  }, [router])

  if (verificando) {
    return null
  }

  return (
    <div className={styles.layout}>
      <BottomNav
        itens={
          papel === 'PROFESSOR'
            ? itensProfessor
            : temFilhos
              ? [
                  ...itensAssociado.slice(0, -1),
                  { label: 'Meus filhos', href: '/meus-filhos', icone: Baby },
                  ...itensAssociado.slice(-1),
                ]
              : itensAssociado
        }
      />
      <main className={styles.conteudo}>{children}</main>
    </div>
  )
}
