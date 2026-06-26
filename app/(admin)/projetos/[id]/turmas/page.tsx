'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { apiGet } from '../../../../lib/api'
import styles from './turmas.module.css'

type Turma = {
  id: string
  nome: string
  dias: string[]
  horario: string
}

type Projeto = {
  id: string
  nome: string
}

const DIAS_LABELS: Record<string, string> = {
  SEGUNDA: 'Seg',
  TERCA: 'Ter',
  QUARTA: 'Qua',
  QUINTA: 'Qui',
  SEXTA: 'Sex',
  SABADO: 'Sáb',
  DOMINGO: 'Dom',
}

function formatarDias(dias: string[]) {
  return dias.map((dia) => DIAS_LABELS[dia] ?? dia).join(', ')
}

export default function TurmasDoProjetoPage() {
  const { id } = useParams<{ id: string }>()
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [carregando, setCarregando] = useState(true)
  const [nomeProjeto, setNomeProjeto] = useState('')

  useEffect(() => {
    apiGet<Turma[]>(`/turmas?projetoId=${id}`)
      .then(setTurmas)
      .finally(() => setCarregando(false))
  }, [id])

  useEffect(() => {
    apiGet<Projeto[]>('/projetos').then((projetos) => {
      const projeto = projetos.find((item) => item.id === id)
      setNomeProjeto(projeto?.nome ?? '')
    })
  }, [id])

  return (
    <div className={styles.pagina}>
      <div className={styles.header}>
        <h1 className={styles.titulo}>
          {nomeProjeto ? `Turmas — ${nomeProjeto}` : 'Turmas do projeto'}
        </h1>
        <Link href={`/turmas/nova?projetoId=${id}`} className={styles.botaoNovo}>
          Nova turma
        </Link>
      </div>

      {carregando && <p className={styles.mensagem}>Carregando...</p>}

      {!carregando && turmas.length === 0 && (
        <p className={styles.mensagem}>Nenhuma turma neste projeto ainda</p>
      )}

      {!carregando && turmas.length > 0 && (
        <ul className={styles.lista}>
          {turmas.map((turma) => (
            <li key={turma.id} className={styles.item}>
              <span className={styles.nome}>{turma.nome}</span>
              <span className={styles.detalhe}>
                {formatarDias(turma.dias)} — {turma.horario}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
