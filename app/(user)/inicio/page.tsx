'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FolderOpen, Wallet, User, GraduationCap, Bus, Baby } from 'lucide-react'
import { getUsuario } from '../../lib/auth'
import { apiGet } from '../../lib/api'
import { diaSemanaHoje } from '../../lib/dias'
import { resumirPendencias } from '../../lib/pagamentos'
import styles from './inicio.module.css'

type Pagamento = {
  id: number
  valor: string
  status: 'PAGA' | 'PENDENTE' | 'CANCELADA'
  mesReferencia: string
  vencimento: string
  formaPagamento: string | null
  matricula: {
    turmas: {
      nome: string
      projeto: { nome: string }
    }[]
  }
}

type SituacaoInfo =
  | { tipo: 'carregando' }
  | { tipo: 'erro' }
  | { tipo: 'emDia' }
  | { tipo: 'atrasada'; quantidade: number; valor: number }
  | { tipo: 'pendente'; mesReferencia: string; vencimento: string }

type ExameMedico = 'APTO' | 'NAO_APTO' | 'AGUARDANDO'

type TurmaMatricula = {
  nome: string
  horario: string | null
  diasContratados: string[]
}

type Matricula = {
  id: number
  ativa: boolean
  exameMedico: ExameMedico
  turmas: TurmaMatricula[]
}

type FrequenciaTurma = {
  turmaId: number
  totalRegistros: number
  faltas: number
}

type TurmaProfessor = {
  id: number
  nome: string
  horario: string | null
  dias: string[]
  projeto: { nome: string }
  totalAlunas: number
  temAulaHoje: boolean
  chamadaFeitaHoje: boolean
}

type PostResumo = {
  id: number
  conteudo: string
  criadoEm: string
  autor: { nome: string }
}

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

function formatarQuando(dataIso: string): string {
  const data = new Date(dataIso)
  const diffMs = Date.now() - data.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `há ${diffMin} min`

  const diffHoras = Math.floor(diffMin / 60)
  if (diffHoras < 24) return `há ${diffHoras} h`

  const diffDias = Math.floor(diffHoras / 24)
  if (diffDias < 7) return `há ${diffDias} dia${diffDias > 1 ? 's' : ''}`

  const dia = String(data.getUTCDate()).padStart(2, '0')
  const mes = String(data.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${data.getUTCFullYear()}`
}

function truncar(texto: string, max: number): string {
  return texto.length > max ? `${texto.slice(0, max).trimEnd()}…` : texto
}

function calcularSituacao(pagamentos: Pagamento[]): SituacaoInfo {
  const { pendentes, atrasados, proxima } = resumirPendencias(pagamentos)
  if (pendentes.length === 0 || !proxima) return { tipo: 'emDia' }
  if (atrasados.length > 0)
    return {
      tipo: 'atrasada',
      quantidade: atrasados.length,
      valor: atrasados.reduce((acc, p) => acc + Number(p.valor), 0),
    }
  return { tipo: 'pendente', mesReferencia: proxima.mesReferencia, vencimento: proxima.vencimento }
}

function FeedPreview({ posts }: { posts: PostResumo[] }) {
  return (
    <>
      <h2 className={styles.tituloSecao}>Últimas publicações</h2>

      {posts.length === 0 ? (
        <p className={styles.feedVazio}>Nenhuma publicação ainda.</p>
      ) : (
        <ul className={styles.feedLista}>
          {posts.map((post) => (
            <li key={post.id} className={styles.feedItem}>
              <p className={styles.feedCabecalho}>
                <span className={styles.feedAutor}>{post.autor.nome}</span>
                <span className={styles.feedQuando}>{formatarQuando(post.criadoEm)}</span>
              </p>
              <p className={styles.feedConteudo}>{truncar(post.conteudo, 110)}</p>
            </li>
          ))}
        </ul>
      )}

      <Link href="/feed" className={styles.verTudo}>
        Ver tudo →
      </Link>
    </>
  )
}

export default function InicioPage() {
  const [usuario] = useState<{ nome: string; papel: 'ASSOCIADO' | 'PROFESSOR' } | null>(() =>
    typeof window !== 'undefined' ? getUsuario() : null
  )
  const [situacao, setSituacao] = useState<SituacaoInfo>({ tipo: 'carregando' })
  // null = carregando; lista = carregou; erro = falhou (nunca confundir com "vazio")
  const [matriculas, setMatriculas] = useState<Matricula[] | null>(null)
  const [erroMatriculas, setErroMatriculas] = useState(false)
  const [frequencia, setFrequencia] = useState<FrequenciaTurma[] | null>(null)
  const [erroFrequencia, setErroFrequencia] = useState(false)
  const [turmasProfessor, setTurmasProfessor] = useState<TurmaProfessor[] | null>(null)
  const [erroTurmas, setErroTurmas] = useState(false)
  const [temViagem, setTemViagem] = useState<string | null>(null)
  const [temFilhos, setTemFilhos] = useState(false)
  const [tentativa, setTentativa] = useState(0)
  const [posts, setPosts] = useState<PostResumo[]>([])
  const ehProfessor = usuario?.papel === 'PROFESSOR'
  const hoje = diaSemanaHoje()

  useEffect(() => {
    if (ehProfessor) return
    setSituacao({ tipo: 'carregando' })
    setErroMatriculas(false)
    setErroFrequencia(false)
    apiGet<Pagamento[]>('/me/pagamentos')
      .then((dados) => setSituacao(calcularSituacao(dados)))
      .catch(() => setSituacao({ tipo: 'erro' }))
    apiGet<Matricula[]>('/me/matriculas')
      .then(setMatriculas)
      .catch(() => setErroMatriculas(true))
    apiGet<FrequenciaTurma[]>('/me/frequencia')
      .then(setFrequencia)
      .catch(() => setErroFrequencia(true))
    apiGet<unknown[]>('/me/dependentes')
      .then((lista) => setTemFilhos(lista.length > 0))
      .catch(() => setTemFilhos(false))
  }, [ehProfessor, tentativa])

  useEffect(() => {
    if (!ehProfessor) return
    setErroTurmas(false)
    apiGet<TurmaProfessor[]>('/professor/turmas')
      .then(setTurmasProfessor)
      .catch(() => setErroTurmas(true))
  }, [ehProfessor, tentativa])

  // Viagem ativa vira atalho aqui (o menu de baixo tem no máximo 5 itens).
  useEffect(() => {
    apiGet<{ id: number }[]>('/viagens')
      .then((lista) => {
        if (lista.length === 0) setTemViagem(null)
        else setTemViagem(lista.length === 1 ? `/viagem/${lista[0].id}` : '/viagem')
      })
      .catch(() => setTemViagem(null))
  }, [])

  useEffect(() => {
    apiGet<PostResumo[]>('/posts/feed?limit=3').then(setPosts).catch(() => {})
  }, [])

  const nome = usuario?.nome ? primeiroNome(usuario.nome) : '...'

  if (ehProfessor) {
    const turmasHoje = (turmasProfessor ?? [])
      .filter((t) => t.temAulaHoje)
      .sort((a, b) => (a.horario ?? '').localeCompare(b.horario ?? ''))

    return (
      <div className={styles.pagina}>
        <h1 className={styles.saudacao}>Olá, {nome} 👋</h1>

        <h2 className={styles.tituloSecao}>Hoje</h2>

        <div className={styles.hoje}>
          {erroTurmas ? (
            <div role="alert">
              <p className={styles.hojeErro}>Não foi possível carregar suas turmas.</p>
              <button type="button" className={styles.botaoTentar} onClick={() => setTentativa((n) => n + 1)}>
                Tentar de novo
              </button>
            </div>
          ) : turmasProfessor === null ? (
            <p className={styles.hojeVazio}>Carregando suas aulas...</p>
          ) : turmasHoje.length === 0 ? (
            <p className={styles.hojeVazio}>Sem aulas hoje.</p>
          ) : (
            turmasHoje.map((turma) => (
              <div key={turma.id} className={styles.hojeItem}>
                <div>
                  <p className={styles.hojeTurma}>{turma.nome}</p>
                  {turma.horario && <span className={styles.hojeHorario}>{turma.horario}</span>}
                </div>

                {turma.chamadaFeitaHoje ? (
                  <span className={styles.hojeFeita}>Chamada feita ✓</span>
                ) : (
                  <Link href={`/turmas/${turma.id}/chamada`} className={styles.hojeBotao}>
                    Fazer chamada
                  </Link>
                )}
              </div>
            ))
          )}
        </div>

        <h2 className={styles.tituloSecao}>Acesso rápido</h2>

        <div className={styles.atalhos}>
          <Link href="/turmas" className={styles.atalho}>
            <GraduationCap size={30} />
            <span>Minhas Turmas</span>
          </Link>
          {temViagem && (
            <Link href={temViagem} className={styles.atalho}>
              <Bus size={30} />
              <span>Viagem</span>
            </Link>
          )}
          <Link href="/perfil" className={styles.atalho}>
            <User size={30} />
            <span>Perfil</span>
          </Link>
        </div>

        <FeedPreview posts={posts} />
      </div>
    )
  }

  const variante =
    situacao.tipo === 'emDia'
      ? styles.situacaoEmDia
      : situacao.tipo === 'atrasada'
      ? styles.situacaoAtrasada
      : situacao.tipo === 'pendente'
      ? styles.situacaoPendente
      : ''

  const matriculaComPendenciaExame = (matriculas ?? []).find(
    (m) => m.ativa && (m.exameMedico === 'AGUARDANDO' || m.exameMedico === 'NAO_APTO')
  )

  const turmasHoje = (matriculas ?? [])
    .filter((m) => m.ativa)
    .flatMap((m) => m.turmas)
    .filter((t) => t.diasContratados.includes(hoje))

  const totalRegistros = (frequencia ?? []).reduce((acc, f) => acc + f.totalRegistros, 0)
  const totalFaltas = (frequencia ?? []).reduce((acc, f) => acc + f.faltas, 0)
  const percentualPresenca =
    totalRegistros > 0 ? Math.round(((totalRegistros - totalFaltas) / totalRegistros) * 100) : null

  return (
    <div className={styles.pagina}>
      <h1 className={styles.saudacao}>Olá, {nome} 👋</h1>

      <div className={`${styles.situacao} ${variante}`}>
        {situacao.tipo === 'carregando' && (
          <p className={styles.situacaoTexto}>Verificando sua situação...</p>
        )}
        {situacao.tipo === 'erro' && (
          <>
            <p className={styles.situacaoTexto}>Não foi possível carregar agora.</p>
            <button type="button" className={styles.botaoTentar} onClick={() => setTentativa((n) => n + 1)}>
              Tentar de novo
            </button>
          </>
        )}
        {situacao.tipo === 'emDia' && (
          <p className={styles.situacaoTexto}>Você está em dia ✓</p>
        )}
        {situacao.tipo === 'atrasada' && (
          <p className={styles.situacaoTexto}>
            Você tem {situacao.quantidade}{' '}
            {situacao.quantidade === 1 ? 'mensalidade atrasada' : 'mensalidades atrasadas'} ·{' '}
            {situacao.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        )}
        {situacao.tipo === 'pendente' && (
          <p className={styles.situacaoTexto}>
            Sua mensalidade de {formatarMes(situacao.mesReferencia)} vence em{' '}
            {formatarDDMM(situacao.vencimento)}
          </p>
        )}
        {(situacao.tipo === 'atrasada' || situacao.tipo === 'pendente') && (
          <Link href="/contribuicoes" className={styles.situacaoBotao}>
            Pagar agora
          </Link>
        )}
      </div>

      {matriculaComPendenciaExame && (
        <div className={styles.avisoExame}>
          <p className={styles.avisoExameTexto}>
            {matriculaComPendenciaExame.exameMedico === 'AGUARDANDO'
              ? 'Seu exame médico está pendente de envio.'
              : 'Seu exame médico está marcado como não apto. Fale com a coordenação.'}
          </p>
        </div>
      )}

      <h2 className={styles.tituloSecao}>Hoje</h2>

      <div className={styles.hoje}>
        {erroMatriculas ? (
          <div role="alert">
            <p className={styles.hojeErro}>Não foi possível carregar suas aulas.</p>
            <button type="button" className={styles.botaoTentar} onClick={() => setTentativa((n) => n + 1)}>
              Tentar de novo
            </button>
          </div>
        ) : matriculas === null ? (
          <p className={styles.hojeVazio}>Carregando suas aulas...</p>
        ) : turmasHoje.length === 0 ? (
          <p className={styles.hojeVazio}>Sem aula hoje.</p>
        ) : (
          turmasHoje.map((turma, indice) => (
            <div key={indice} className={styles.hojeItem}>
              <div>
                <p className={styles.hojeTurma}>{turma.nome}</p>
                {turma.horario && <span className={styles.hojeHorario}>{turma.horario}</span>}
              </div>
            </div>
          ))
        )}
      </div>

      {erroFrequencia && (
        <div className={styles.frequencia} role="alert">
          <span className={styles.frequenciaTexto}>Não foi possível carregar sua presença.</span>
          <button type="button" className={styles.botaoTentar} onClick={() => setTentativa((n) => n + 1)}>
            Tentar de novo
          </button>
        </div>
      )}

      {percentualPresenca !== null && (
        <div className={styles.frequencia}>
          <span className={styles.frequenciaPercentual}>{percentualPresenca}%</span>
          <span className={styles.frequenciaTexto}>
            de presença{totalFaltas > 0 ? ` · ${totalFaltas} ${totalFaltas === 1 ? 'falta' : 'faltas'}` : ''}
          </span>
        </div>
      )}

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
        {temViagem && (
          <Link href={temViagem} className={styles.atalho}>
            <Bus size={30} />
            <span>Viagem</span>
          </Link>
        )}
        {temFilhos && (
          <Link href="/meus-filhos" className={styles.atalho}>
            <Baby size={30} />
            <span>Meus filhos</span>
          </Link>
        )}
        <Link href="/perfil" className={styles.atalho}>
          <User size={30} />
          <span>Perfil</span>
        </Link>
      </div>

      <FeedPreview posts={posts} />
    </div>
  )
}
