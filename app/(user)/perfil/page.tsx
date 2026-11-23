'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CalendarCheck } from 'lucide-react'
import { apiGet } from '../../lib/api'
import { logout } from '../../lib/auth'
import { type Relatorio, rotuloSituacao } from '../../lib/saude'
import FotoPerfil from '../../components/FotoPerfil'
import ConfirmDialog from '../../components/ConfirmDialog'
import styles from './perfil.module.css'

type Usuario = {
  nome: string
  cpf: string
  fotoUrl: string | null
  email: string | null
  telefone: string | null
  papel: 'ADMIN' | 'PROFESSOR' | 'ASSOCIADO'
  rg: string | null
  dataNascimento: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
}

function formatarData(data: string | null): string {
  if (!data) return '—'
  const d = new Date(data)
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${d.getUTCFullYear()}`
}

function montarEndereco(u: Usuario): string | null {
  const partes: string[] = []
  if (u.logradouro) {
    let linha = u.logradouro
    if (u.numero) linha += `, ${u.numero}`
    if (u.complemento) linha += ` — ${u.complemento}`
    partes.push(linha)
  }
  if (u.bairro) partes.push(u.bairro)
  if (u.cidade || u.uf) partes.push([u.cidade, u.uf].filter(Boolean).join('/'))
  if (u.cep) partes.push(`CEP ${u.cep}`)
  return partes.length > 0 ? partes.join(', ') : null
}

/** Resumo do mês da associada, logo abaixo do nome. Só presença: peso e IMC
 *  ficam em Meu Progresso, onde têm contexto e não aparecem de surpresa. Some
 *  inteiro se não houver nada pra mostrar — card vazio só ocupa espaço. */
function ResumoDoMes() {
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null)

  useEffect(() => {
    apiGet<Relatorio>('/me/relatorio')
      .then(setRelatorio)
      .catch(() => {})
  }, [])

  if (!relatorio) return null

  if (relatorio.frequencia.totalAulas === 0) return null

  return (
    <div className={styles.resumo}>
      <p className={styles.resumoTitulo}>Seu mês até aqui</p>

      <ul className={styles.resumoLista}>
        <li className={styles.resumoItem}>
          <CalendarCheck size={18} className={styles.resumoIcone} />
          <span>
            <strong>{relatorio.frequencia.percentual}%</strong> de presença ·{' '}
            {rotuloSituacao(relatorio.frequencia.situacao).toLowerCase()}
            <span className={styles.resumoNota}>
              {relatorio.frequencia.presencas} de {relatorio.frequencia.totalAulas}{' '}
              {relatorio.frequencia.totalAulas === 1 ? 'aula' : 'aulas'}
            </span>
          </span>
        </li>
      </ul>

      <Link href="/meu-progresso" className={styles.resumoLink}>
        Ver meu progresso →
      </Link>
    </div>
  )
}

export default function PerfilPage() {
  const router = useRouter()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [confirmandoSaida, setConfirmandoSaida] = useState(false)

  useEffect(() => {
    apiGet<Usuario>('/me')
      .then(setUsuario)
      .catch(() => setErro('Não foi possível carregar seu perfil.'))
  }, [])

  function sair() {
    logout()
    router.replace('/login')
  }

  if (erro) {
    return (
      <div className={styles.pagina}>
        <h1 className={styles.titulo}>Perfil</h1>
        <p className={styles.mensagemErro}>{erro}</p>
      </div>
    )
  }

  if (!usuario) {
    return (
      <div className={styles.pagina}>
        <h1 className={styles.titulo}>Perfil</h1>
        <p className={styles.mensagem}>Carregando...</p>
      </div>
    )
  }

  const endereco = montarEndereco(usuario)

  return (
    <div className={styles.pagina}>
      <div className={styles.cabecalho}>
        <FotoPerfil
          nome={usuario.nome}
          fotoUrl={usuario.fotoUrl}
          aoMudar={(fotoUrl) => setUsuario({ ...usuario, fotoUrl })}
        />
        <h1 className={styles.titulo}>{usuario.nome}</h1>
      </div>

      {usuario.papel === 'ASSOCIADO' && <ResumoDoMes />}

      <div className={styles.card}>
        <dl className={styles.grade}>
          <div className={styles.campo}>
            <dt>CPF</dt>
            <dd>{usuario.cpf}</dd>
          </div>
          <div className={styles.campo}>
            <dt>Telefone</dt>
            <dd>{usuario.telefone || '—'}</dd>
          </div>
          <div className={styles.campo}>
            <dt>Email</dt>
            <dd>{usuario.email || '—'}</dd>
          </div>
          <div className={styles.campo}>
            <dt>RG</dt>
            <dd>{usuario.rg || '—'}</dd>
          </div>
          <div className={styles.campo}>
            <dt>Data de nascimento</dt>
            <dd>{formatarData(usuario.dataNascimento)}</dd>
          </div>
          <div className={`${styles.campo} ${styles.campoLargo}`}>
            <dt>Endereço</dt>
            <dd>{endereco || '—'}</dd>
          </div>
        </dl>
      </div>

      <button className={styles.sair} onClick={() => setConfirmandoSaida(true)}>
        Sair
      </button>

      <ConfirmDialog
        aberto={confirmandoSaida}
        titulo="Sair do Conecta?"
        mensagem="Você vai precisar entrar de novo com seu CPF e sua senha."
        confirmarLabel="Sair"
        cancelarLabel="Continuar aqui"
        perigoso={false}
        onConfirmar={sair}
        onCancelar={() => setConfirmandoSaida(false)}
      />
    </div>
  )
}
