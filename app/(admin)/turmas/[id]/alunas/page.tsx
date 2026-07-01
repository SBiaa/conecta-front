'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { apiGet } from '../../../../lib/api'
import styles from './alunas.module.css'

type Aluna = {
  id: string
  ativa: boolean
  usuario: { id: string; nome: string }
}

type Turma = {
  id: string
  nome: string
}

export default function AlunasDaTurmaPage() {
  const { id } = useParams<{ id: string }>()

  const [nomeTurma, setNomeTurma] = useState('')
  const [alunas, setAlunas] = useState<Aluna[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    apiGet<Turma>(`/turmas/${id}`)
      .then((turma) => setNomeTurma(turma.nome))
      .catch(() => {})
  }, [id])

  useEffect(() => {
    apiGet<Aluna[]>(`/turmas/${id}/matriculas?ativa=true`)
      .then(setAlunas)
      .finally(() => setCarregando(false))
  }, [id])

  return (
    <div className={styles.pagina}>
      <h1 className={styles.titulo}>
        {nomeTurma ? `Alunas — ${nomeTurma}` : 'Alunas da turma'}
      </h1>

      {carregando && <p className={styles.mensagem}>Carregando...</p>}

      {!carregando && alunas.length === 0 && (
        <p className={styles.mensagem}>Nenhuma aluna ativa nesta turma</p>
      )}

      {!carregando && alunas.length > 0 && (
        <ul className={styles.lista}>
          {alunas.map((aluna) => (
            <li key={aluna.id}>
              <Link href={`/associados/${aluna.usuario.id}`} className={styles.item}>
                <span className={styles.nome}>{aluna.usuario.nome}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
