'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FolderOpen, Wallet, User } from 'lucide-react'
import { getUsuario } from '../../lib/auth'
import { apiGet } from '../../lib/api'
import styles from './inicio.module.css'

type Pagamento = {
  id: number
  valor: string
  status: 'PAGA' | 'PENDENTE'
  mesReferencia: string
  vencimento: string
  formaPagamento: string | null
  matricula: {
    turma: {
      nome: string
      projeto: { nome: string }
    }
  }
}

type SituacaoInfo =
  | { tipo: 'carregando' }
  | { tipo: 'erro' }
  | { tipo: 'emDia' }
  | { tipo: 'atrasada'; quantidade: number }
  | { tipo: 'pendente'; mesReferencia: string; vencimento: string }

function primeiroNome(nome: string): string {
  return nome.split(' ')[0]
}

function formatarMes(mesRef: string): string {
  const [ano, mes] = mesRef.split('-').map(Number)
  const nome = new Date(ano, mes - 1).toLocaleString('pt-BR', { month: 'long' })
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} ${ano}`
}

function formatarDDMM(iso: string): string {
  const d = new Date(iso)
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}`
}

function calcularSituacao(pagamentos: Pagamento[]): SituacaoInfo {
  const pendentes = pagamentos.filter((p) => p.status === 'PENDENTE')
  if (pendentes.length === 0) return { tipo: 'emDia' }

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const atrasados = pendentes.filter((p) => {
    const venc = new Date(p.vencimento)
    venc.setHours(0, 0, 0, 0)
    return venc < hoje
  })

  if (atrasados.length > 0) return { tipo: 'atrasada', quantidade: atrasados.length }

  const proxima = [...pendentes].sort(
    (a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime()
  )[0]

  return { tipo: 'pendente', mesReferencia: proxima.mesReferencia, vencimento: proxima.vencimento }
}

export default function InicioPage() {
  const [usuario] = useState<{ nome: string } | null>(() =>
    typeof window !== 'undefined' ? getUsuario() : null
  )
  const [situacao, setSituacao] = useState<SituacaoInfo>({ tipo: 'carregando' })

  useEffect(() => {
    apiGet<Pagamento[]>('/me/pagamentos')
      .then((dados) => setSituacao(calcularSituacao(dados)))
      .catch(() => setSituacao({ tipo: 'erro' }))
  }, [])

  const nome = usuario?.nome ? primeiroNome(usuario.nome) : '...'

  const variante =
    situacao.tipo === 'emDia'
      ? styles.situacaoEmDia
      : situacao.tipo === 'atrasada'
      ? styles.situacaoAtrasada
      : situacao.tipo === 'pendente'
      ? styles.situacaoPendente
      : ''

  return (
    <div className={styles.pagina}>
      <h1 className={styles.saudacao}>Olá, {nome} 👋</h1>

      <div className={`${styles.situacao} ${variante}`}>
        {situacao.tipo === 'carregando' && (
          <p className={styles.situacaoTexto}>Verificando sua situação...</p>
        )}
        {situacao.tipo === 'erro' && (
          <p className={styles.situacaoTexto}>Não foi possível carregar agora.</p>
        )}
        {situacao.tipo === 'emDia' && (
          <p className={styles.situacaoTexto}>Você está em dia ✓</p>
        )}
        {situacao.tipo === 'atrasada' && (
          <p className={styles.situacaoTexto}>
            Você tem {situacao.quantidade}{' '}
            {situacao.quantidade === 1 ? 'mensalidade atrasada' : 'mensalidades atrasadas'}
          </p>
        )}
        {situacao.tipo === 'pendente' && (
          <p className={styles.situacaoTexto}>
            Sua mensalidade de {formatarMes(situacao.mesReferencia)} vence em{' '}
            {formatarDDMM(situacao.vencimento)}
          </p>
        )}
      </div>

      <h2 className={styles.tituloSecao}>Acesso rápido</h2>

      <div className={styles.atalhos}>
        <Link href="/meus-projetos" className={styles.atalho}>
          <FolderOpen size={30} />
          <span>Meus Projetos</span>
        </Link>
        <Link href="/contribuicoes" className={styles.atalho}>
          <Wallet size={30} />
          <span>Contribuições</span>
        </Link>
        <Link href="/perfil" className={styles.atalho}>
          <User size={30} />
          <span>Perfil</span>
        </Link>
      </div>
    </div>
  )
}
