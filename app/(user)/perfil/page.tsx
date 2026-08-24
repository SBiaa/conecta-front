'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CalendarCheck, Scale, TrendingDown, TrendingUp } from 'lucide-react'
import { apiGet } from '../../lib/api'
import { formatarNumero } from '../../lib/formato'
import { logout } from '../../lib/auth'
import { faixaImc, type Relatorio, rotuloSituacao } from '../../lib/saude'
import FotoPerfil from '../../components/FotoPerfil'
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

// Frase do peso no mês. Ganhar peso é tão normal quanto perder — as duas
// direções são ditas do mesmo jeito, sem adjetivo em cima de nenhuma.
function frasePeso(variacao: number): string {
  const quilos = Math.abs(variacao)
  const unidade = quilos === 1 ? 'quilo' : 'quilos'
  return variacao < 0
    ? `Você já perdeu ${formatarNumero(quilos)} ${unidade} este mês`
    : `Você ganhou ${formatarNumero(quilos)} ${unidade} este mês`
}

/** Resumo do mês da associada, logo abaixo do nome. Some inteiro se não houver
 *  nada pra mostrar — card vazio só ocupa espaço. */
function ResumoDoMes() {
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null)

  useEffect(() => {
    apiGet<Relatorio>('/me/relatorio')
      .then(setRelatorio)
      .catch(() => {})
  }, [])

  if (!relatorio) return null

  const temFrequencia = relatorio.frequencia.totalAulas > 0
  const temPeso = relatorio.peso.variacao !== null && relatorio.peso.variacao !== 0
  const temImc = relatorio.imc !== null

  if (!temFrequencia && !temPeso && !temImc) return null

  return (
    <div className={styles.resumo}>
      <p className={styles.resumoTitulo}>Seu mês até aqui</p>

      <ul className={styles.resumoLista}>
        {temFrequencia && (
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
        )}

        {temPeso && (
          <li className={styles.resumoItem}>
            {relatorio.peso.variacao! < 0 ? (
              <TrendingDown size={18} className={styles.resumoIcone} />
            ) : (
              <TrendingUp size={18} className={styles.resumoIcone} />
            )}
            <span>
              {frasePeso(relatorio.peso.variacao!)}
              <span className={styles.resumoNota}>
                está em {formatarNumero(relatorio.peso.ultimo!)} kg
              </span>
            </span>
          </li>
        )}

        {temImc && (
          <li className={styles.resumoItem}>
            <Scale size={18} className={styles.resumoIcone} />
            <span>
              IMC <strong>{formatarNumero(relatorio.imc!)}</strong>
              <span className={styles.resumoNota}>{faixaImc(relatorio.imc)}</span>
            </span>
          </li>
        )}
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

      <button className={styles.sair} onClick={sair}>
        Sair
      </button>
    </div>
  )
}
