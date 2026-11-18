'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { CalendarClock, ListChecks, Camera, Trophy, Pencil } from 'lucide-react'
import LayoutCompartilhado from '../../components/LayoutCompartilhado'
import { apiGet } from '../../lib/api'
import type { ViagemDetalhe } from '../../lib/viagem'
import AbaInformacoes from './AbaInformacoes'
import AbaChecklist from './AbaChecklist'
import AbaGaleria from './AbaGaleria'
import AbaRanking from './AbaRanking'
import styles from './viagem.module.css'

type Aba = 'info' | 'checklist' | 'galeria' | 'ranking'

const ABAS: { id: Aba; label: string; icone: typeof Camera }[] = [
  { id: 'info', label: 'Programação', icone: CalendarClock },
  { id: 'checklist', label: 'O que levar', icone: ListChecks },
  { id: 'galeria', label: 'Fotos e vídeos', icone: Camera },
  { id: 'ranking', label: 'Concurso', icone: Trophy },
]

const CHAVE_ABA = 'conecta.viagem.aba'

function lerAba(): Aba {
  try {
    const salva = sessionStorage.getItem(CHAVE_ABA)
    if (ABAS.some((a) => a.id === salva)) return salva as Aba
  } catch {}
  return 'info'
}

function ConteudoViagem({ ehAdmin }: { ehAdmin: boolean }) {
  const { id } = useParams<{ id: string }>()
  const [viagem, setViagem] = useState<ViagemDetalhe | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [aba, setAba] = useState<Aba>(lerAba)

  const carregar = useCallback(() => {
    apiGet<ViagemDetalhe>(`/viagens/${id}`)
      .then((dados) => {
        setViagem(dados)
        setErro(null)
      })
      .catch((e: Error) => setErro(e.message))
  }, [id])

  useEffect(() => {
    carregar()
  }, [carregar])

  const trocarAba = (nova: Aba) => {
    setAba(nova)
    try {
      sessionStorage.setItem(CHAVE_ABA, nova)
    } catch {}
  }

  if (erro) {
    return (
      <div className={styles.pagina}>
        <p className={styles.mensagem}>{erro}</p>
      </div>
    )
  }

  if (!viagem) {
    return (
      <div className={styles.pagina}>
        <p className={styles.mensagem}>Carregando...</p>
      </div>
    )
  }

  return (
    <div className={styles.pagina}>
      <header className={styles.cabecalho}>
        <div>
          <p className={styles.sobretitulo}>Viagem{viagem.destino ? ` · ${viagem.destino}` : ''}</p>
          <h1 className={styles.titulo}>{viagem.nome}</h1>
          {!viagem.ativa && <span className={styles.selo}>Desativada</span>}
        </div>
        {ehAdmin && (
          <Link href={`/viagens/${viagem.id}`} className={styles.botaoSecundario}>
            <Pencil size={18} /> Organizar
          </Link>
        )}
      </header>

      <nav className={styles.abas} role="tablist">
        {ABAS.map((item) => {
          const Icone = item.icone
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={aba === item.id}
              className={`${styles.aba} ${aba === item.id ? styles.abaAtiva : ''}`}
              onClick={() => trocarAba(item.id)}
            >
              <Icone size={22} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <section role="tabpanel">
        {aba === 'info' && <AbaInformacoes viagem={viagem} />}
        {aba === 'checklist' && <AbaChecklist viagem={viagem} aoMudar={carregar} />}
        {aba === 'galeria' && <AbaGaleria viagemId={viagem.id} ehAdmin={ehAdmin} />}
        {aba === 'ranking' && <AbaRanking viagemId={viagem.id} />}
      </section>
    </div>
  )
}

export default function ViagemPage() {
  return <LayoutCompartilhado>{(papel) => <ConteudoViagem ehAdmin={papel === 'ADMIN'} />}</LayoutCompartilhado>
}
