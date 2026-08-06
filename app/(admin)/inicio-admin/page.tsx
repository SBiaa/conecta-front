'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Users,
  FolderKanban,
  Wallet,
  DollarSign,
  Clock,
  AlertCircle,
  FolderOpen,
  Waves,
} from 'lucide-react'
import { getUsuario } from '../../lib/auth'
import { apiGet } from '../../lib/api'
import styles from './inicio-admin.module.css'

type Usuario = {
  nome: string
}

type Pagamento = {
  id: number
  valor: string
  status: 'PAGA' | 'PENDENTE'
}

type PagamentoAtrasado = {
  id: number
  valor: string
}

type Projeto = {
  id: number
  nome: string
  ativo: boolean
  alunasAtivas: number
}

type Associado = {
  id: number
}

type Turma = {
  id: number
  nome: string
  dias: string[]
  horario: string | null
  ativas: number
  inativas: number
  professor: { id: string; nome: string } | null
  projeto: { nome: string }
}

type ValorCard = number | 'erro'

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

type Resumo = {
  recebidoMes: ValorCard
  pendenteMes: ValorCard
  atrasadosQtd: ValorCard
  atrasadosTotal: ValorCard
  projetosAtivos: ValorCard
  totalAssociados: ValorCard
  totalAlunasAtivas: ValorCard
}

function moeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function valorOuErro(val: ValorCard, formatar: (n: number) => string) {
  return val === 'erro' ? '—' : formatar(val)
}

export default function InicioAdminPage() {
  const [usuario] = useState<Usuario | null>(() =>
    typeof window !== 'undefined' ? getUsuario() : null
  )
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [projetoHidroId, setProjetoHidroId] = useState<number | null>(null)
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [carregandoTurmas, setCarregandoTurmas] = useState(true)

  useEffect(() => {
    apiGet<Turma[]>('/turmas')
      .then(setTurmas)
      .catch(() => setTurmas([]))
      .finally(() => setCarregandoTurmas(false))
  }, [])

  useEffect(() => {
    const mes = new Date().toISOString().slice(0, 7)

    Promise.allSettled([
      apiGet<Pagamento[]>(`/pagamentos?mes=${mes}`),
      apiGet<PagamentoAtrasado[]>('/pagamentos/atrasados'),
      apiGet<Projeto[]>('/projetos'),
      apiGet<Associado[]>('/usuarios?papel=ASSOCIADO'),
    ]).then(([pagamentosRes, atrasadosRes, projetosRes, associadosRes]) => {
      if (projetosRes.status === 'fulfilled') {
        const hidro = projetosRes.value.find((p) => p.nome === 'Viva Bem com Hidro')
        setProjetoHidroId(hidro?.id ?? null)
        setProjetos(projetosRes.value)
      }

      let recebidoMes: ValorCard = 'erro'
      let pendenteMes: ValorCard = 'erro'
      if (pagamentosRes.status === 'fulfilled') {
        recebidoMes = pagamentosRes.value
          .filter((p) => p.status === 'PAGA')
          .reduce((acc, p) => acc + Number(p.valor), 0)
        pendenteMes = pagamentosRes.value
          .filter((p) => p.status === 'PENDENTE')
          .reduce((acc, p) => acc + Number(p.valor), 0)
      }

      let atrasadosQtd: ValorCard = 'erro'
      let atrasadosTotal: ValorCard = 'erro'
      if (atrasadosRes.status === 'fulfilled') {
        atrasadosQtd = atrasadosRes.value.length
        atrasadosTotal = atrasadosRes.value.reduce((acc, p) => acc + Number(p.valor), 0)
      }

      const projetosAtivos: ValorCard =
        projetosRes.status === 'fulfilled'
          ? projetosRes.value.filter((p) => p.ativo).length
          : 'erro'

      const totalAssociados: ValorCard =
        associadosRes.status === 'fulfilled' ? associadosRes.value.length : 'erro'

      const totalAlunasAtivas: ValorCard =
        projetosRes.status === 'fulfilled'
          ? projetosRes.value.reduce((acc, p) => acc + p.alunasAtivas, 0)
          : 'erro'

      setResumo({
        recebidoMes,
        pendenteMes,
        atrasadosQtd,
        atrasadosTotal,
        projetosAtivos,
        totalAssociados,
        totalAlunasAtivas,
      })
    })
  }, [])

  const carregando = resumo === null

  const turmasNaGrade = useMemo(
    () => turmas.filter((turma) => turma.dias?.length && extrairHora(turma.horario) !== null),
    [turmas]
  )
  const turmasForaDaGrade = useMemo(
    () => turmas.filter((turma) => !turma.dias?.length || extrairHora(turma.horario) === null),
    [turmas]
  )

  const diasComTurma = useMemo(
    () => DIAS_ORDEM.filter((dia) => turmasNaGrade.some((turma) => turma.dias.includes(dia))),
    [turmasNaGrade]
  )

  const horasComTurma = useMemo(() => {
    const presentes = turmasNaGrade.map((turma) => extrairHora(turma.horario) as number)
    return Array.from(new Set([...HORAS_PADRAO, ...presentes])).sort((a, b) => a - b)
  }, [turmasNaGrade])

  return (
    <div className={styles.pagina}>

      <header className={styles.topo}>
        <h1 className={styles.saudacao}>Olá, {usuario?.nome ?? '...'} 👋</h1>
        <p className={styles.subtituloSaudacao}>Aqui está o resumo da sua ONG hoje.</p>
      </header>

      <div className={styles.acoes}>
        <Link href="/matriculas/nova" className={styles.botaoPrimario}>
          Nova aluna
        </Link>
        <Link href="/associados/novo" className={styles.botaoSecundario}>
          Novo associado
        </Link>
      </div>

      <section className={styles.secao}>
        <h2 className={styles.tituloSecao}>Resumo do mês</h2>
        <div className={styles.resumoGrid}>

          <div className={`${styles.resumoCard} ${styles.resumoSuccess}`}>
            <div className={styles.iconeWrap}>
              <DollarSign size={20} />
            </div>
            <span className={styles.resumoValor}>
              {carregando ? '...' : valorOuErro(resumo.recebidoMes, moeda)}
            </span>
            <span className={styles.resumoLabel}>Recebido no mês</span>
          </div>

          <div className={`${styles.resumoCard} ${styles.resumoWarning}`}>
            <div className={styles.iconeWrap}>
              <Clock size={20} />
            </div>
            <span className={styles.resumoValor}>
              {carregando ? '...' : valorOuErro(resumo.pendenteMes, moeda)}
            </span>
            <span className={styles.resumoLabel}>Pendente no mês</span>
          </div>

          <div className={`${styles.resumoCard} ${styles.resumoDanger}`}>
            <div className={styles.iconeWrap}>
              <AlertCircle size={20} />
            </div>
            <span className={styles.resumoValor}>
              {carregando
                ? '...'
                : resumo.atrasadosQtd === 'erro'
                ? '—'
                : `${resumo.atrasadosQtd} · ${typeof resumo.atrasadosTotal === 'number' ? moeda(resumo.atrasadosTotal) : '—'}`}
            </span>
            <span className={styles.resumoLabel}>Atrasados</span>
          </div>

          <div className={`${styles.resumoCard} ${styles.resumoPrimary}`}>
            <div className={styles.iconeWrap}>
              <FolderOpen size={20} />
            </div>
            <span className={styles.resumoValor}>
              {carregando ? '...' : valorOuErro(resumo.projetosAtivos, String)}
            </span>
            <span className={styles.resumoLabel}>Projetos ativos</span>
          </div>

          <div className={`${styles.resumoCard} ${styles.resumoPrimary}`}>
            <div className={styles.iconeWrap}>
              <Users size={20} />
            </div>
            <span className={styles.resumoValor}>
              {carregando ? '...' : valorOuErro(resumo.totalAssociados, String)}
            </span>
            <span className={styles.resumoLabel}>Total de associados</span>
          </div>

          <div className={`${styles.resumoCard} ${styles.resumoSuccess}`}>
            <div className={styles.iconeWrap}>
              <Users size={20} />
            </div>
            <span className={styles.resumoValor}>
              {carregando ? '...' : valorOuErro(resumo.totalAlunasAtivas, String)}
            </span>
            <span className={styles.resumoLabel}>Alunas ativas</span>
          </div>

        </div>
      </section>

      <section className={styles.secao}>
        <h2 className={styles.tituloSecao}>Alunas ativas por projeto</h2>

        {carregando && <p className={styles.mensagemTurmas}>Carregando...</p>}

        {!carregando && projetos.length === 0 && (
          <p className={styles.mensagemTurmas}>Nenhum projeto cadastrado</p>
        )}

        {!carregando && projetos.length > 0 && (
          <ul className={styles.lista}>
            {[...projetos]
              .sort((a, b) => b.alunasAtivas - a.alunasAtivas)
              .map((projeto) => (
                <li key={projeto.id}>
                  <Link href={`/projetos/${projeto.id}/turmas`} className={styles.item}>
                    <span className={styles.nome}>{projeto.nome}</span>
                    <span className={styles.contagem}>
                      {projeto.alunasAtivas} aluna{projeto.alunasAtivas === 1 ? '' : 's'} ativa
                      {projeto.alunasAtivas === 1 ? '' : 's'}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className={styles.secao}>
        <h2 className={styles.tituloSecao}>Acesso rápido</h2>
        <div className={styles.cards}>
          <Link href="/associados" className={styles.card}>
            <Users size={26} />
            <span>Associados</span>
          </Link>
          <Link href="/projetos" className={styles.card}>
            <FolderKanban size={26} />
            <span>Projetos</span>
          </Link>
          <Link href="/financeiro" className={styles.card}>
            <Wallet size={26} />
            <span>Financeiro</span>
          </Link>
          {projetoHidroId !== null && (
            <Link href={`/projetos/${projetoHidroId}/turmas`} className={styles.card}>
              <Waves size={26} />
              <span>Viva Bem com Hidro</span>
            </Link>
          )}
        </div>
      </section>

      <section className={styles.secao}>
        <h2 className={styles.tituloSecao}>Turmas</h2>

        {carregandoTurmas && <p className={styles.mensagemTurmas}>Carregando...</p>}

        {!carregandoTurmas && turmas.length === 0 && (
          <p className={styles.mensagemTurmas}>Nenhuma turma cadastrada</p>
        )}

        {!carregandoTurmas && turmas.length > 0 && (
          <>
            {diasComTurma.length > 0 && (
              <div className={styles.gradeWrapper}>
                <div
                  className={styles.grade}
                  style={{ gridTemplateColumns: `4rem repeat(${diasComTurma.length}, minmax(7rem, 1fr))` }}
                >
                  <div className={styles.gradeCantoVazio} />
                  {diasComTurma.map((dia) => (
                    <div key={dia} className={styles.gradeDiaHeader}>
                      {DIAS_LABELS[dia]}
                    </div>
                  ))}

                  {horasComTurma.map((hora) => (
                    <div key={hora} className={styles.gradeLinha} style={{ display: 'contents' }}>
                      <div className={styles.gradeHoraLabel}>{formatarHora(hora)}</div>
                      {diasComTurma.map((dia) => {
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
                                title={turma.projeto.nome}
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
                {diasComTurma.length > 0 && (
                  <h3 className={styles.subtitulo}>Sem horário definido</h3>
                )}
                <ul className={styles.lista}>
                  {turmasForaDaGrade.map((turma) => (
                    <li key={turma.id}>
                      <Link href={`/turmas/${turma.id}/alunas`} className={styles.item}>
                        <span className={styles.turmaProjeto}>{turma.projeto.nome}</span>
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
      </section>

    </div>
  )
}
