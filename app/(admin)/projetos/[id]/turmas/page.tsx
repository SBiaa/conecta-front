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
  horario: string | null
  ativas: number
  inativas: number
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

function formatarInfo(turma: Turma): string {
  const partes: string[] = []
  if (turma.dias?.length) partes.push(formatarDias(turma.dias))
  if (turma.horario) partes.push(turma.horario)
  return partes.join(' — ')
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
            <li key={turma.id}>
              <Link href={`/turmas/${turma.id}/alunas`} className={styles.item}>
                <span className={styles.nome}>{turma.nome}</span>
                {formatarInfo(turma) && (
                  <span className={styles.detalhe}>{formatarInfo(turma)}</span>
                )}
                <span className={styles.contagem}>
                  {turma.ativas} ativas · {turma.inativas} inativas
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
