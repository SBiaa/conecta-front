'use client'

import styles from './SeletorTurmasSemana.module.css'

export type TurmaGrade = {
  id: string | number
  nome: string
  horario: string | null
  dias: string[]
}

type Props = {
  turmas: TurmaGrade[]
  selecionados: string[]
  onToggle: (chave: string) => void
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

export function chaveDiaSelecao(turmaId: string | number, dia: string) {
  return `${turmaId}:${dia}`
}

export function agruparSelecoesPorTurma(selecoes: string[]): { turmaId: number; dias: string[] }[] {
  const porTurma = new Map<number, string[]>()
  selecoes.forEach((chave) => {
    const [turmaIdTexto, dia] = chave.split(':')
    const turmaId = Number(turmaIdTexto)
    porTurma.set(turmaId, [...(porTurma.get(turmaId) ?? []), dia])
  })
  return Array.from(porTurma.entries()).map(([turmaId, dias]) => ({ turmaId, dias }))
}

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

export default function SeletorTurmasSemana({ turmas, selecionados, onToggle }: Props) {
  const turmasNaGrade = turmas.filter((turma) => turma.dias?.length && extrairHora(turma.horario) !== null)
  const turmasForaDaGrade = turmas.filter((turma) => !turma.dias?.length || extrairHora(turma.horario) === null)

  const dias = DIAS_ORDEM.filter((dia) => turmasNaGrade.some((turma) => turma.dias.includes(dia)))

  const horasPresentes = turmasNaGrade.map((turma) => extrairHora(turma.horario) as number)
  const horas = Array.from(new Set([...HORAS_PADRAO, ...horasPresentes])).sort((a, b) => a - b)

  if (turmasNaGrade.length === 0 && turmasForaDaGrade.length === 0) {
    return <p className={styles.mensagem}>Nenhuma turma cadastrada neste projeto</p>
  }

  return (
    <div>
      {dias.length > 0 && (
        <div className={styles.gradeWrapper}>
          <div
            className={styles.grade}
            style={{ gridTemplateColumns: `3.2rem repeat(${dias.length}, minmax(6rem, 1fr))` }}
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
                      {turmasCelula.map((turma) => {
                        const chave = chaveDiaSelecao(turma.id, dia)
                        const selecionada = selecionados.includes(chave)
                        return (
                          <button
                            key={turma.id}
                            type="button"
                            onClick={() => onToggle(chave)}
                            className={`${styles.gradeTurma} ${selecionada ? styles.gradeTurmaSelecionada : ''}`}
                          >
                            {turma.nome}
                          </button>
                        )
                      })}
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
          {dias.length > 0 && <p className={styles.subtitulo}>Sem dias/horário cadastrados</p>}
          <ul className={styles.listaSemHorario}>
            {turmasForaDaGrade.map((turma) => (
              <li key={turma.id} className={styles.itemSemHorario}>
                {turma.nome}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
