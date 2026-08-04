'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { apiGet, apiPatch } from '../../../../lib/api'
import styles from './alunas.module.css'

type Aluna = {
  id: string
  ativa: boolean
  usuario: { id: string; nome: string }
}

type Turma = {
  id: string
  nome: string
  professor: { id: string; nome: string } | null
}

type Professor = {
  id: string
  nome: string
}

export default function AlunasDaTurmaPage() {
  const { id } = useParams<{ id: string }>()

  const [nomeTurma, setNomeTurma] = useState('')
  const [alunas, setAlunas] = useState<Aluna[]>([])
  const [carregando, setCarregando] = useState(true)

  const [professores, setProfessores] = useState<Professor[]>([])
  const [professorId, setProfessorId] = useState('')
  const [salvandoProfessora, setSalvandoProfessora] = useState(false)
  const [sucessoProfessora, setSucessoProfessora] = useState(false)
  const [erroProfessora, setErroProfessora] = useState('')

  useEffect(() => {
    apiGet<Turma>(`/turmas/${id}`)
      .then((turma) => {
        setNomeTurma(turma.nome)
        setProfessorId(turma.professor?.id ?? '')
      })
      .catch(() => {})
  }, [id])

  useEffect(() => {
    apiGet<Professor[]>('/usuarios?papel=PROFESSOR').then(setProfessores)
  }, [])

  async function salvarProfessora(evento: React.FormEvent) {
    evento.preventDefault()
    setErroProfessora('')
    setSucessoProfessora(false)
    setSalvandoProfessora(true)

    try {
      await apiPatch(`/turmas/${id}`, { professorId: professorId || null })
      setSucessoProfessora(true)
    } catch {
      setErroProfessora('Não foi possível salvar a professora responsável')
    } finally {
      setSalvandoProfessora(false)
    }
  }

  useEffect(() => {
    apiGet<Aluna[]>(`/turmas/${id}/matriculas?ativa=true`)
      .then(setAlunas)
      .finally(() => setCarregando(false))
  }, [id])

  return (
    <div className={styles.pagina}>
      <div className={styles.header}>
        <h1 className={styles.titulo}>
          {nomeTurma ? `Alunas — ${nomeTurma}` : 'Alunas da turma'}
        </h1>
        <Link href={`/matriculas/nova?turmaId=${id}`} className={styles.botaoNovo}>
          Nova aluna nesta turma
        </Link>
      </div>

      <form className={styles.formProfessora} onSubmit={salvarProfessora}>
        <label htmlFor="professorId">Professora responsável</label>
        <select
          id="professorId"
          value={professorId}
          onChange={(evento) => setProfessorId(evento.target.value)}
        >
          <option value="">Sem professora definida</option>
          {professores.map((professor) => (
            <option key={professor.id} value={professor.id}>
              {professor.nome}
            </option>
          ))}
        </select>
        <button className={styles.botaoSalvar} disabled={salvandoProfessora}>
          {salvandoProfessora ? 'Salvando...' : 'Salvar'}
        </button>
        {sucessoProfessora && <span className={styles.sucesso}>Professora atualizada!</span>}
        {erroProfessora && <span className={styles.erro}>{erroProfessora}</span>}
      </form>

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
