'use client'

import { useEffect, useState } from 'react'
import { Baby, Bus } from 'lucide-react'
import type { ItemMenu } from '../components/BottomNav'
import { apiGet } from './api'
import { itensAssociado, itensProfessor } from './menus'
import type { ViagemResumo } from './viagem'

// Menu de baixo de associada e professora, com os itens que só aparecem pra
// algumas pessoas: "Meus filhos" (quem é responsável por alguém) e "Viagem"
// (quem está na lista de uma viagem ativa). Usado no layout do (user), no
// Feed e na área da viagem, pra o menu ser o mesmo em todas as telas.
export function useItensMenu(papel: 'ASSOCIADO' | 'PROFESSOR' | null): ItemMenu[] {
  const [temFilhos, setTemFilhos] = useState(false)
  const [viagens, setViagens] = useState<ViagemResumo[]>([])

  useEffect(() => {
    if (!papel) return
    if (papel === 'ASSOCIADO') {
      apiGet<unknown[]>('/me/dependentes')
        .then((lista) => setTemFilhos(lista.length > 0))
        .catch(() => setTemFilhos(false))
    }
    apiGet<ViagemResumo[]>('/viagens')
      .then(setViagens)
      .catch(() => setViagens([]))
  }, [papel])

  const base = papel === 'PROFESSOR' ? itensProfessor : itensAssociado
  const extras: ItemMenu[] = []
  if (viagens.length > 0) {
    // Uma viagem só (o normal): o item leva direto pra ela.
    const href = viagens.length === 1 ? `/viagem/${viagens[0].id}` : '/viagem'
    extras.push({ label: 'Viagem', href, icone: Bus })
  }
  if (papel === 'ASSOCIADO' && temFilhos) {
    extras.push({ label: 'Meus filhos', href: '/meus-filhos', icone: Baby })
  }

  // Extras entram antes do "Perfil", que fica sempre por último, e só
  // enquanto couberem 5 itens (o Início oferece atalhos para o resto).
  const vagas = Math.max(0, 5 - base.length)
  return [...base.slice(0, -1), ...extras.slice(0, vagas), ...base.slice(-1)]
}
