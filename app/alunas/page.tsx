'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiGet } from '../lib/api'
import styles from './alunas.module.css'

type Aluna = {
  id: string
  nome: string
  telefone: string | null
  ativa: boolean
  createdAt: string
  turmaId: string
}

export default function AlunasPage() {
  const [alunas, setAlunas] = useState<Aluna[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    apiGet<Aluna[]>('/alunas')
      .then(setAlunas)
      .finally(() => setCarregando(false))
  }, [])

  return (
    <div className={styles.pagina}>
      <h1 className={styles.titulo}>Alunas</h1>

      {carregando && <p className={styles.mensagem}>Carregando...</p>}

      {!carregando && alunas.length === 0 && (
        <p className={styles.mensagem}>Nenhuma aluna ainda</p>
      )}

      {!carregando && alunas.length > 0 && (
        <ul className={styles.lista}>
          {alunas.map((aluna) => (
            <li key={aluna.id} className={styles.item}>
              <Link href={`/alunas/${aluna.id}`} className={styles.nome}>
                {aluna.nome}
              </Link>
              <span className={styles.detalhe}>{aluna.telefone}</span>
              <span className={styles.detalhe}>Turma {aluna.turmaId}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
