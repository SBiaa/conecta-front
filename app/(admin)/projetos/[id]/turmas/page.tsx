'use client'

import { useEffect, useMemo, useState } from 'react'
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
  professor: { id: string; nome: string } | null
}

type Projeto = {
  id: number
  nome: string
}

const DIAS_ORDEM = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO', 'DOMINGO']

const DIAS_LABELS: Record<string, string> = {
  SEGUNDA: 'Seg',
  TERCA: 'Ter',
  QUARTA: 'Qua',
  QUINTA: 'Qui',
  SEXTA: 'Sex',
  SABADO: 'Sáb',
  DOMINGO: 'Dom',
}

const HORAS_PADRAO = [8, 9, 10, 11, 14, 15, 16, 17, 18, 19]

function formatarHora(hora: number): string {
  return `${String(hora).padStart(2, '0')}h`
}

function extrairHora(horario: string | null): number | null {
  if (!horario) return null
  const match = horario.match(/\d{1,2}/)
  if (!match) return null
  const hora = Number(match[0])
  return hora >= 0 && hora <= 23 ? hora : null
}

export default function TurmasDoProjetoPage() {
  const { id } = useParams<{ id: string }>()
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [nomeProjeto, setNomeProjeto] = useState('')

  useEffect(() => {
    setErro('')
    apiGet<Turma[]>(`/turmas?projetoId=${id}`)
      .then(setTurmas)
      .catch(() => setErro('Não foi possível carregar as turmas deste projeto'))
      .finally(() => setCarregando(false))
  }, [id])

  useEffect(() => {
    apiGet<Projeto[]>('/projetos').then((projetos) => {
      const projeto = projetos.find((item) => String(item.id) === id)
      setNomeProjeto(projeto?.nome ?? '')
    }).catch(() => {})
  }, [id])

  const turmasNaGrade = useMemo(
    () => turmas.filter((turma) => turma.dias?.length && extrairHora(turma.horario) !== null),
    [turmas]
  )
  const turmasForaDaGrade = useMemo(
    () => turmas.filter((turma) => !turma.dias?.length || extrairHora(turma.horario) === null),
    [turmas]
  )

  const dias = useMemo(
    () => DIAS_ORDEM.filter((dia) => turmasNaGrade.some((turma) => turma.dias.includes(dia))),
    [turmasNaGrade]
  )

  const horas = useMemo(() => {
    const presentes = turmasNaGrade.map((turma) => extrairHora(turma.horario) as number)
    return Array.from(new Set([...HORAS_PADRAO, ...presentes])).sort((a, b) => a - b)
  }, [turmasNaGrade])

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

      {!carregando && erro && <p className={styles.mensagem}>{erro}</p>}

      {!carregando && !erro && turmas.length === 0 && (
        <p className={styles.mensagem}>Nenhuma turma neste projeto ainda</p>
      )}

      {!carregando && !erro && turmas.length > 0 && (
        <>
          {dias.length > 0 && (
            <div className={styles.gradeWrapper}>
              <div
                className={styles.grade}
                style={{ gridTemplateColumns: `4rem repeat(${dias.length}, minmax(7rem, 1fr))` }}
              >
                <div className={styles.gradeCantoVazio} />
                {dias.map((dia) => (
                  <div key={dia} className={styles.gradeDiaHeader}>
                    {DIAS_LABELS[dia]}
                  </div>
                ))}

                {horas.map((hora) => (
                  <div key={hora} className={styles.gradeLinha} style={{ display: 'contents' }}>
                    <div className={styles.gradeHoraLabel}>{formatarHora(hora)}</div>
                    {dias.map((dia) => {
                      const turmasCelula = turmasNaGrade.filter(
                        (turma) => extrairHora(turma.horario) === hora && turma.dias.includes(dia)
                      )
                      return (
                        <div key={dia} className={styles.gradeCelula}>
                          {turmasCelula.map((turma) => (
                            <Link
                              key={turma.id}
                              href={`/turmas/${turma.id}/alunas`}
                              className={styles.gradeTurma}
                            >
                              <span className={styles.gradeTurmaNome}>{turma.nome}</span>
                              <span className={styles.gradeTurmaContagem}>
                                {turma.ativas} ativas · {turma.inativas} inativas
                              </span>
                            </Link>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {turmasForaDaGrade.length > 0 && (
            <div className={styles.semHorario}>
              {dias.length > 0 && <h2 className={styles.subtitulo}>Sem horário definido</h2>}
              <ul className={styles.lista}>
                {turmasForaDaGrade.map((turma) => (
                  <li key={turma.id}>
                    <Link href={`/turmas/${turma.id}/alunas`} className={styles.item}>
                      <span className={styles.nome}>{turma.nome}</span>
                      <span className={styles.detalhe}>
                        {turma.professor ? `Professora: ${turma.professor.nome}` : 'Sem professora'}
                      </span>
                      <span className={styles.contagem}>
                        {turma.ativas} ativas · {turma.inativas} inativas
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
