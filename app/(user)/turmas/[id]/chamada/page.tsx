'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { apiGet, apiPost } from '../../../../lib/api'
import styles from './chamada.module.css'

type AlunaResposta = {
  matriculaId: number
  nome: string
  presente: boolean | null
}

type ChamadaResposta = {
  turma: { id: number; nome: string }
  data: string
  alunas: AlunaResposta[]
}

type AlunaChamada = {
  matriculaId: number
  nome: string
  presente: boolean
}

function dataHojeISO(): string {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function chaveRascunho(turmaId: string, data: string): string {
  return `chamada-rascunho:${turmaId}:${data}`
}

// Rascunho guarda só { matriculaId: presente }. localStorage pode estar
// bloqueado (aba anônima etc.): qualquer falha é ignorada.
function lerRascunho(turmaId: string, data: string): Record<string, boolean> | null {
  try {
    const bruto = localStorage.getItem(chaveRascunho(turmaId, data))
    return bruto ? (JSON.parse(bruto) as Record<string, boolean>) : null
  } catch {
    return null
  }
}

function gravarRascunho(turmaId: string, data: string, alunas: AlunaChamada[]) {
  try {
    const mapa: Record<string, boolean> = {}
    alunas.forEach((a) => {
      mapa[a.matriculaId] = a.presente
    })
    localStorage.setItem(chaveRascunho(turmaId, data), JSON.stringify(mapa))
  } catch {
    // sem rascunho, mas a chamada continua funcionando
  }
}

function apagarRascunho(turmaId: string, data: string) {
  try {
    localStorage.removeItem(chaveRascunho(turmaId, data))
  } catch {
    // nada a fazer
  }
}

export default function ChamadaPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [data, setData] = useState(searchParams.get('data') || dataHojeISO())
  const [nomeTurma, setNomeTurma] = useState('')
  const [alunas, setAlunas] = useState<AlunaChamada[]>([])
  const [jaRegistrada, setJaRegistrada] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erroCarregar, setErroCarregar] = useState('')
  const [erroSalvar, setErroSalvar] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvou, setSalvou] = useState(false)
  const [alterada, setAlterada] = useState(false)
  const [rascunhoRestaurado, setRascunhoRestaurado] = useState(false)
  const [tentativa, setTentativa] = useState(0)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setCarregando(true)
    setErroCarregar('')
    setErroSalvar('')
    setSalvou(false)
    setAlterada(false)
    setRascunhoRestaurado(false)

    apiGet<ChamadaResposta>(`/professor/turmas/${id}/chamada?data=${data}`)
      .then((resposta) => {
        setNomeTurma(resposta.turma.nome)
        // Dia sem registro: a API devolve presente null. Na tela começa como
        // "presente" (o normal), mas o aviso do topo deixa claro que ainda
        // não foi salvo.
        setJaRegistrada(resposta.alunas.some((aluna) => aluna.presente !== null))
        const base = resposta.alunas.map((aluna) => ({
          matriculaId: aluna.matriculaId,
          nome: aluna.nome,
          presente: aluna.presente ?? true,
        }))

        const rascunho = lerRascunho(id, data)
        if (rascunho) {
          setAlunas(
            base.map((aluna) => ({
              ...aluna,
              presente:
                typeof rascunho[aluna.matriculaId] === 'boolean'
                  ? rascunho[aluna.matriculaId]
                  : aluna.presente,
            }))
          )
          setAlterada(true)
          setRascunhoRestaurado(true)
        } else {
          setAlunas(base)
        }
      })
      .catch(() => setErroCarregar('Não foi possível carregar a chamada.'))
      .finally(() => setCarregando(false))
  }, [id, data, tentativa])

  // Avisa antes de fechar/recarregar a aba com marcações não salvas.
  useEffect(() => {
    if (!alterada) return
    function aoSair(evento: BeforeUnloadEvent) {
      evento.preventDefault()
    }
    window.addEventListener('beforeunload', aoSair)
    return () => window.removeEventListener('beforeunload', aoSair)
  }, [alterada])

  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current)
    }
  }, [])

  const atualizar = useCallback(
    (proximas: AlunaChamada[]) => {
      setAlunas(proximas)
      setAlterada(true)
      setSalvou(false)
      setErroSalvar('')
      gravarRascunho(id, data, proximas)
    },
    [id, data]
  )

  function alternarPresenca(matriculaId: number) {
    atualizar(
      alunas.map((aluna) =>
        aluna.matriculaId === matriculaId ? { ...aluna, presente: !aluna.presente } : aluna
      )
    )
  }

  function marcarTodasPresentes() {
    atualizar(alunas.map((aluna) => ({ ...aluna, presente: true })))
  }

  async function salvar() {
    setSalvando(true)
    setErroSalvar('')
    try {
      await apiPost(`/professor/turmas/${id}/chamada`, {
        data,
        presencas: alunas.map(({ matriculaId, presente }) => ({ matriculaId, presente })),
      })
      apagarRascunho(id, data)
      setAlterada(false)
      setRascunhoRestaurado(false)
      setJaRegistrada(true)
      setSalvou(true)
      temporizador.current = setTimeout(() => router.push('/inicio'), 2500)
    } catch {
      // A lista continua na tela: só o aviso de erro aparece.
      setErroSalvar('Não foi possível salvar a chamada. Suas marcações continuam aqui — tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  const presentes = alunas.filter((a) => a.presente).length
  const ausentes = alunas.length - presentes

  return (
    <div className={styles.pagina}>
      <Link href="/turmas" className={styles.voltar}>
        ← Minhas Turmas
      </Link>

      <div className={styles.cabecalho}>
        <h1 className={styles.titulo}>{nomeTurma ? `Chamada — ${nomeTurma}` : 'Chamada'}</h1>
        <Link href={`/turmas/${id}/frequencia`} className={styles.linkFrequencia}>
          Ver frequência
        </Link>
      </div>

      <label className={styles.dataRotulo} htmlFor="data-chamada">
        Dia da aula
      </label>
      <input
        id="data-chamada"
        type="date"
        className={styles.dataInput}
        value={data}
        onChange={(e) => e.target.value && setData(e.target.value)}
      />

      {carregando && <p className={styles.mensagem}>Carregando...</p>}

      {!carregando && erroCarregar && (
        <div role="alert">
          <p className={styles.mensagemErro}>{erroCarregar}</p>
          <button type="button" className={styles.botaoSecundario} onClick={() => setTentativa((n) => n + 1)}>
            Tentar de novo
          </button>
        </div>
      )}

      {!carregando && !erroCarregar && alunas.length === 0 && (
        <p className={styles.mensagem}>Nenhuma aluna ativa nesta turma.</p>
      )}

      {!carregando && !erroCarregar && alunas.length > 0 && (
        <>
          {salvou ? (
            <div className={styles.sucessoGrande} role="status">
              <p className={styles.sucessoTitulo}>Chamada salva ✓</p>
              <p className={styles.sucessoTexto}>
                {presentes} {presentes === 1 ? 'presente' : 'presentes'}, {ausentes}{' '}
                {ausentes === 1 ? 'ausente' : 'ausentes'}. Voltando para o início…
              </p>
              <Link href="/inicio" className={styles.botaoVoltarInicio}>
                Voltar ao início
              </Link>
            </div>
          ) : (
            <p
              className={`${styles.situacaoRegistro} ${
                jaRegistrada ? styles.registroFeito : styles.registroPendente
              }`}
            >
              {jaRegistrada ? 'Chamada já registrada' : 'Ainda não registrada'}
              {alterada && ' · alterações não salvas'}
            </p>
          )}

          {rascunhoRestaurado && !salvou && (
            <p className={styles.aviso}>Recuperamos suas marcações que ainda não tinham sido salvas.</p>
          )}

          {erroSalvar && (
            <p className={styles.mensagemErro} role="alert">
              {erroSalvar}
            </p>
          )}

          <button type="button" className={styles.marcarTodas} onClick={marcarTodasPresentes}>
            Marcar todas presentes
          </button>

          <ul className={styles.lista}>
            {alunas.map((aluna) => (
              <li key={aluna.matriculaId}>
                <button
                  type="button"
                  aria-pressed={aluna.presente}
                  className={`${styles.item} ${aluna.presente ? styles.itemPresente : styles.itemAusente}`}
                  onClick={() => alternarPresenca(aluna.matriculaId)}
                >
                  <span className={styles.nome}>{aluna.nome}</span>
                  <span
                    className={`${styles.toggle} ${
                      aluna.presente ? styles.togglePresente : styles.toggleAusente
                    }`}
                  >
                    {aluna.presente ? '✓ Presente' : '✗ Ausente'}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {!salvou && (
            <div className={styles.barraSalvar}>
              <button className={styles.botaoSalvar} onClick={salvar} disabled={salvando}>
                {salvando
                  ? 'Salvando...'
                  : `Salvar chamada · ${presentes} ${presentes === 1 ? 'presente' : 'presentes'}, ${ausentes} ${
                      ausentes === 1 ? 'ausente' : 'ausentes'
                    }`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
