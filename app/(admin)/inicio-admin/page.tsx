'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, FolderKanban, Wallet } from 'lucide-react'
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
  ativo: boolean
}

type Associado = {
  id: number
}

type ValorCard = number | 'erro'

type Resumo = {
  recebidoMes: ValorCard
  pendenteMes: ValorCard
  atrasadosQtd: ValorCard
  atrasadosTotal: ValorCard
  projetosAtivos: ValorCard
  totalAssociados: ValorCard
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

  useEffect(() => {
    const mes = new Date().toISOString().slice(0, 7)

    Promise.allSettled([
      apiGet<Pagamento[]>(`/pagamentos?mes=${mes}`),
      apiGet<PagamentoAtrasado[]>('/pagamentos/atrasados'),
      apiGet<Projeto[]>('/projetos'),
      apiGet<Associado[]>('/usuarios?papel=ASSOCIADO'),
    ]).then(([pagamentosRes, atrasadosRes, projetosRes, associadosRes]) => {
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

      setResumo({ recebidoMes, pendenteMes, atrasadosQtd, atrasadosTotal, projetosAtivos, totalAssociados })
    })
  }, [])

  const carregando = resumo === null

  return (
    <div className={styles.pagina}>
      <h1 className={styles.saudacao}>Olá, {usuario?.nome ?? '...'}</h1>

      <div className={styles.destaques}>
        <Link href="/matriculas/nova" className={styles.botaoDestaque}>
          Nova aluna
        </Link>
        <Link href="/associados/novo" className={styles.botaoDestaque}>
          Novo associado
        </Link>
      </div>

      <h2 className={styles.subtitulo}>Resumo do mês</h2>

      <div className={styles.resumoGrid}>
        <div className={`${styles.resumoCard} ${styles.resumoSuccess}`}>
          <span className={styles.resumoLabel}>Recebido no mês</span>
          <span className={styles.resumoValor}>
            {carregando ? '...' : valorOuErro(resumo.recebidoMes, moeda)}
          </span>
        </div>

        <div className={`${styles.resumoCard} ${styles.resumoWarning}`}>
          <span className={styles.resumoLabel}>Pendente no mês</span>
          <span className={styles.resumoValor}>
            {carregando ? '...' : valorOuErro(resumo.pendenteMes, moeda)}
          </span>
        </div>

        <div className={`${styles.resumoCard} ${styles.resumoDanger}`}>
          <span className={styles.resumoLabel}>Atrasados</span>
          <span className={styles.resumoValor}>
            {carregando
              ? '...'
              : resumo.atrasadosQtd === 'erro'
              ? '—'
              : `${resumo.atrasadosQtd} · ${typeof resumo.atrasadosTotal === 'number' ? moeda(resumo.atrasadosTotal) : '—'}`}
          </span>
        </div>

        <div className={`${styles.resumoCard} ${styles.resumoPrimary}`}>
          <span className={styles.resumoLabel}>Projetos ativos</span>
          <span className={styles.resumoValor}>
            {carregando ? '...' : valorOuErro(resumo.projetosAtivos, String)}
          </span>
        </div>

        <div className={`${styles.resumoCard} ${styles.resumoPrimary}`}>
          <span className={styles.resumoLabel}>Total de associados</span>
          <span className={styles.resumoValor}>
            {carregando ? '...' : valorOuErro(resumo.totalAssociados, String)}
          </span>
        </div>
      </div>

      <h2 className={styles.subtitulo}>Acesso rápido</h2>

      <div className={styles.cards}>
        <Link href="/associados" className={styles.card}>
          <Users size={28} />
          <span>Associados</span>
        </Link>
        <Link href="/projetos" className={styles.card}>
          <FolderKanban size={28} />
          <span>Projetos</span>
        </Link>
        <Link href="/financeiro" className={styles.card}>
          <Wallet size={28} />
          <span>Financeiro</span>
        </Link>
      </div>
    </div>
  )
}
