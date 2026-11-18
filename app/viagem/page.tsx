'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import LayoutCompartilhado from '../components/LayoutCompartilhado'
import { apiGet } from '../lib/api'
import { formatarDiaCurto, type ViagemResumo } from '../lib/viagem'
import styles from './[id]/viagem.module.css'

function ListaViagens() {
  const [viagens, setViagens] = useState<ViagemResumo[] | null>(null)

  useEffect(() => {
    apiGet<ViagemResumo[]>('/viagens').then(setViagens).catch(() => setViagens([]))
  }, [])

  return (
    <div className={styles.pagina}>
      <h1 className={styles.titulo}>Viagens</h1>
      {viagens === null && <p className={styles.mensagem}>Carregando...</p>}
      {viagens?.length === 0 && <p className={styles.mensagem}>Você não está em nenhuma viagem no momento.</p>}
      <ul className={styles.listaSimples} style={{ marginTop: '1rem' }}>
        {viagens?.map((v) => (
          <li key={v.id}>
            <Link href={`/viagem/${v.id}`} className={styles.aviso} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
              <p className={styles.avisoTitulo}>{v.nome}</p>
              <p className={styles.avisoRodape}>
                {[v.destino, v.dataSaida && `saída ${formatarDiaCurto(v.dataSaida)}`].filter(Boolean).join(' · ')}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ViagensPage() {
  return <LayoutCompartilhado>{() => <ListaViagens />}</LayoutCompartilhado>
}
