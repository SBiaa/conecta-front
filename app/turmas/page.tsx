'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiGet } from '../lib/api'
import styles from './turmas.module.css'

type Turma = {
  id: string
  nome: string
  createdAt: string
  _count: {
    alunas: number
  }
}

export default function TurmasPage() {
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    apiGet<Turma[]>('/turmas')
      .then(setTurmas)
      .finally(() => setCarregando(false))
  }, [])

  return (
    <div className={styles.pagina}>
      <h1 className={styles.titulo}>Turmas</h1>

      {carregando && <p className={styles.mensagem}>Carregando...</p>}

      {!carregando && turmas.length === 0 && (
        <p className={styles.mensagem}>Nenhuma turma ainda</p>
      )}

      {!carregando && turmas.length > 0 && (
        <ul className={styles.lista}>
          {turmas.map((turma) => (
            <li key={turma.id} className={styles.item}>
              <Link href={`/turmas/${turma.id}`} className={styles.link}>
                <span className={styles.nome}>{turma.nome}</span>
                <span className={styles.contagem}>
                  {turma._count.alunas} aluna{turma._count.alunas === 1 ? '' : 's'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
