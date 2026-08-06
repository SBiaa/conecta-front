'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { apiGet } from '../../lib/api'
import styles from './frequencia.module.css'

type Turma = {
  id: number
  nome: string
  projeto: { nome: string } | null
  ativas: number
}

export default function FrequenciaListaPage() {
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    apiGet<Turma[]>('/turmas')
      .then(setTurmas)
      .catch(() => setErro('Não foi possível carregar as turmas.'))
      .finally(() => setCarregando(false))
  }, [])

  const turmasPorProjeto = useMemo(() => {
    const grupos = new Map<string, Turma[]>()
    for (const turma of turmas) {
      const nomeProjeto = turma.projeto?.nome ?? 'Sem projeto'
      if (!grupos.has(nomeProjeto)) grupos.set(nomeProjeto, [])
      grupos.get(nomeProjeto)!.push(turma)
    }
    return grupos
  }, [turmas])

  return (
    <div className={styles.pagina}>
      <div className={styles.header}>
        <h1 className={styles.titulo}>Frequência</h1>
      </div>

      {carregando && <p className={styles.mensagem}>Carregando...</p>}
      {!carregando && erro && <p className={styles.mensagem}>{erro}</p>}
      {!carregando && !erro && turmas.length === 0 && (
        <p className={styles.mensagem}>Nenhuma turma cadastrada</p>
      )}

      {!carregando && !erro && turmas.length > 0 && (
        <>
          {Array.from(turmasPorProjeto.entries()).map(([nomeProjeto, turmasDoProjeto]) => (
            <div key={nomeProjeto} className={styles.grupo}>
              <h2 className={styles.subtitulo}>{nomeProjeto}</h2>
              <ul className={styles.lista}>
                {turmasDoProjeto.map((turma) => (
                  <li key={turma.id}>
                    <Link href={`/frequencia/${turma.id}`} className={styles.item}>
                      <span className={styles.nome}>{turma.nome}</span>
                      <span className={styles.detalhe}>{turma.ativas} ativas</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
