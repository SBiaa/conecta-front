'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { apiGet } from '../../../lib/api'
import { formatarData, formatarMes, formatarMoeda } from '../../../lib/formato'
import type { HistoricoNivel } from '../../../lib/natacao'
import Avatar from '../../../components/Avatar'
import PainelNivelNatacao from '../../../components/PainelNivelNatacao'
import styles from './filho.module.css'

type Turma = {
  nome: string
  horario: string | null
  diasContratados: string[]
  projeto: { nome: string }
}

type Frequencia = {
  turmaId: number
  nome: string
  projeto: string
  totalRegistros: number
  faltas: number
  percentualPresenca: number | null
  registros: { data: string; presente: boolean }[]
}

type Pagamento = {
  id: number
  valor: string
  status: 'PAGA' | 'PENDENTE'
  mesReferencia: string
  vencimento: string
}

type Filho = {
  id: string
  nome: string
  fotoUrl: string | null
  dataNascimento: string | null
  matriculas: { id: number; turmas: Turma[] }[]
  frequencia: Frequencia[]
  pagamentos: Pagamento[]
  natacao: HistoricoNivel
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

export default function FilhoPage() {
  const { id } = useParams<{ id: string }>()
  const [filho, setFilho] = useState<Filho | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    apiGet<Filho>(`/me/dependentes/${id}`)
      .then(setFilho)
      .catch(() => setErro('Não foi possível carregar o perfil.'))
  }, [id])

  if (erro) return <div className={styles.pagina}><p className={styles.mensagemErro}>{erro}</p></div>
  if (!filho) return <div className={styles.pagina}><p className={styles.mensagem}>Carregando...</p></div>

  const turmas = filho.matriculas.flatMap((m) => m.turmas)
  const temNatacao = turmas.some((t) => /natação|natacao/i.test(t.projeto.nome)) || filho.natacao.historico.length > 0

  return (
    <div className={styles.pagina}>
      <Link href="/meus-filhos" className={styles.voltar}>← Meus filhos</Link>

      <div className={styles.cabecalho}>
        <Avatar nome={filho.nome} fotoUrl={filho.fotoUrl} tamanho={64} />
        <div>
          <h1 className={styles.titulo}>{filho.nome}</h1>
          {filho.dataNascimento && (
            <span className={styles.detalhe}>Nascimento: {formatarData(filho.dataNascimento)}</span>
          )}
        </div>
      </div>

      {temNatacao && (
        <section className={styles.card}>
          <h2 className={styles.subtitulo}>Nível na natação</h2>
          <PainelNivelNatacao historico={filho.natacao} somenteLeitura />
        </section>
      )}

      <section className={styles.card}>
        <h2 className={styles.subtitulo}>Aulas</h2>
        {turmas.length === 0 ? (
          <p className={styles.mensagem}>Ainda sem matrícula ativa.</p>
        ) : (
          <ul className={styles.lista}>
            {turmas.map((t, i) => (
              <li key={i}>
                <strong>{t.projeto.nome}</strong> — {t.nome}
                <span className={styles.detalhe}>
                  {' '}
                  {t.diasContratados.map((d) => LABELS_DIA[d] ?? d).join(', ')}
                  {t.horario ? ` · ${t.horario}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.subtitulo}>Presença</h2>
        {filho.frequencia.length === 0 ? (
          <p className={styles.mensagem}>Nenhuma aula registrada ainda.</p>
        ) : (
          filho.frequencia.map((f) => (
            <div key={f.turmaId} className={styles.bloco}>
              <p className={styles.resumo}>
                <strong>{f.nome}</strong>
                {f.percentualPresenca !== null && (
                  <span> · esteve em {f.totalRegistros - f.faltas} de {f.totalRegistros} aulas</span>
                )}
              </p>
              <ul className={styles.datas}>
                {f.registros.slice(0, 12).map((r) => (
                  <li key={r.data} className={r.presente ? styles.presente : styles.ausente}>
                    {formatarData(r.data)} · {r.presente ? 'Presente' : 'Faltou'}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.subtitulo}>Mensalidades</h2>
        {filho.pagamentos.length === 0 ? (
          <p className={styles.mensagem}>Nenhuma cobrança.</p>
        ) : (
          <ul className={styles.lista}>
            {filho.pagamentos.map((p) => (
              <li key={p.id} className={styles.pagamento}>
                <span>{formatarMes(p.mesReferencia)}</span>
                <span>{formatarMoeda(p.valor)}</span>
                <span className={p.status === 'PAGA' ? styles.paga : styles.pendente}>
                  {p.status === 'PAGA' ? 'Paga' : 'Em aberto'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
