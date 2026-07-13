'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { apiGet } from '../../../lib/api'
import styles from './perfil.module.css'

type Professor = {
  id: string
  nome: string
  cpf: string
  email: string | null
  telefone: string | null
  status: 'ATIVO' | 'INATIVO'
}

type Turma = {
  id: number
  nome: string
  horario: string | null
  dias: string[]
  projeto: { nome: string }
  ativas: number
}

const LABELS_DIA: Record<string, string> = {
  SEGUNDA: 'Seg',
  TERCA: 'Ter',
  QUARTA: 'Qua',
  QUINTA: 'Qui',
  SEXTA: 'Sex',
  SABADO: 'Sáb',
  DOMINGO: 'Dom',
}

export default function PerfilProfessorPage() {
  const { id } = useParams<{ id: string }>()

  const [professor, setProfessor] = useState<Professor | null>(null)
  const [erro, setErro] = useState('')
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [carregandoTurmas, setCarregandoTurmas] = useState(true)

  useEffect(() => {
    apiGet<Professor>(`/usuarios/${id}`)
      .then(setProfessor)
      .catch(() => setErro('Professora não encontrada'))
  }, [id])

  useEffect(() => {
    setCarregandoTurmas(true)
    apiGet<Turma[]>(`/turmas?professorId=${id}`)
      .then(setTurmas)
      .finally(() => setCarregandoTurmas(false))
  }, [id])

  if (erro) {
    return (
      <div className={styles.pagina}>
        <p className={styles.erro}>{erro}</p>
      </div>
    )
  }

  if (!professor) {
    return (
      <div className={styles.pagina}>
        <p className={styles.mensagem}>Carregando...</p>
      </div>
    )
  }

  return (
    <div className={styles.pagina}>
      <h1 className={styles.titulo}>{professor.nome}</h1>

      <div className={styles.card}>
        <h2 className={styles.subtitulo}>Dados pessoais</h2>

        <dl className={styles.grade}>
          <div className={styles.campo}>
            <dt>CPF</dt>
            <dd>{professor.cpf}</dd>
          </div>
          <div className={styles.campo}>
            <dt>Telefone</dt>
            <dd>{professor.telefone || '—'}</dd>
          </div>
          <div className={styles.campo}>
            <dt>Email</dt>
            <dd>{professor.email || '—'}</dd>
          </div>
          <div className={styles.campo}>
            <dt>Status</dt>
            <dd>{professor.status === 'ATIVO' ? 'Ativo' : 'Inativo'}</dd>
          </div>
        </dl>
      </div>

      <div className={styles.card}>
        <h2 className={styles.subtitulo}>Turmas atribuídas</h2>

        {carregandoTurmas && <p className={styles.mensagem}>Carregando...</p>}

        {!carregandoTurmas && turmas.length === 0 && (
          <p className={styles.mensagem}>Nenhuma turma atribuída a esta professora</p>
        )}

        {!carregandoTurmas && turmas.length > 0 && (
          <ul className={styles.listaTurmas}>
            {turmas.map((turma) => (
              <li key={turma.id}>
                <Link href={`/turmas/${turma.id}/alunas`} className={styles.itemTurma}>
                  <span className={styles.nomeProjeto}>{turma.projeto.nome}</span>
                  <p className={styles.nomeTurma}>{turma.nome}</p>
                  <span className={styles.detalhe}>
                    {turma.dias.map((d) => LABELS_DIA[d] ?? d).join(', ')}
                    {turma.horario ? ` — ${turma.horario}` : ''}
                    {turma.dias.length > 0 || turma.horario ? ' · ' : ''}
                    {turma.ativas} alunas
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
