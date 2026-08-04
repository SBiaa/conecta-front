'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiGet, apiPatch, apiPost } from '../../../lib/api'
import styles from './nova.module.css'

const matriculaSchema = z.object({
  telefone: z.string().optional(),
  rg: z.string().optional(),
  dataNascimento: z.string().optional(),
  tomaMedicamento: z.boolean().optional(),
  qualMedicamento: z.string().optional(),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),
  projetoId: z.coerce.number({ message: 'Escolha um projeto' }),
  turmaId: z.coerce.number({ message: 'Escolha uma turma' }),
  exameMedico: z.enum(['APTO', 'NAO_APTO', 'AGUARDANDO'], {
    message: 'Escolha o exame médico',
  }),
})

type MatriculaFormInput = z.input<typeof matriculaSchema>
type MatriculaFormOutput = z.output<typeof matriculaSchema>

type AssociadaResumo = {
  id: string
  nome: string
  cpf: string
}

type AssociadaCompleta = {
  id: string
  nome: string
  telefone: string | null
  rg: string | null
  dataNascimento: string | null
  tomaMedicamento: boolean
  qualMedicamento: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
}

type Projeto = {
  id: string
  nome: string
}

type Turma = {
  id: string
  nome: string
}

type RespostaViaCep = {
  erro?: boolean
  logradouro?: string
  bairro?: string
  localidade?: string
  uf?: string
}

const VALORES_PADRAO: MatriculaFormInput = {
  telefone: '',
  rg: '',
  dataNascimento: '',
  tomaMedicamento: false,
  qualMedicamento: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  projetoId: '' as unknown as number,
  turmaId: '' as unknown as number,
  exameMedico: 'AGUARDANDO',
}

function dadosAssociadaParaFormulario(dados: AssociadaCompleta): MatriculaFormInput {
  return {
    ...VALORES_PADRAO,
    telefone: dados.telefone ?? '',
    rg: dados.rg ?? '',
    dataNascimento: dados.dataNascimento ? dados.dataNascimento.slice(0, 10) : '',
    tomaMedicamento: dados.tomaMedicamento,
    qualMedicamento: dados.qualMedicamento ?? '',
    cep: dados.cep ?? '',
    logradouro: dados.logradouro ?? '',
    numero: dados.numero ?? '',
    complemento: dados.complemento ?? '',
    bairro: dados.bairro ?? '',
    cidade: dados.cidade ?? '',
    uf: dados.uf ?? '',
  }
}

export default function NovaMatriculaPage() {
  const searchParams = useSearchParams()
  const associadoIdParam = searchParams.get('associadoId')
  const turmaIdParam = searchParams.get('turmaId')
  const router = useRouter()

  // When turmaId param is given, we find the project, set projetoId, then need to
  // set turmaId AFTER the projetoId effect loads turmas. This ref stores the
  // pending turmaId so the projetoId effect can apply it instead of clearing.
  const pendingTurmaIdRef = useRef<number | null>(null)

  const [buscaTexto, setBuscaTexto] = useState('')
  const [resultadosBusca, setResultadosBusca] = useState<AssociadaResumo[]>([])
  const [buscando, setBuscando] = useState(false)
  const [associadaSelecionada, setAssociadaSelecionada] = useState<AssociadaCompleta | null>(
    null
  )
  const [erroAssociada, setErroAssociada] = useState('')
  const [cepNaoEncontrado, setCepNaoEncontrado] = useState(false)

  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])

  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MatriculaFormInput, unknown, MatriculaFormOutput>({
    resolver: zodResolver(matriculaSchema),
    defaultValues: VALORES_PADRAO,
  })

  const tomaMedicamento = watch('tomaMedicamento')
  const projetoId = watch('projetoId')
  const registroCep = register('cep')

  useEffect(() => {
    apiGet<Projeto[]>('/projetos').then(setProjetos)
  }, [])

  // Pre-fill associada when ?associadoId= is given
  useEffect(() => {
    if (!associadoIdParam) return

    apiGet<AssociadaCompleta>(`/usuarios/${associadoIdParam}`)
      .then((dados) => {
        setAssociadaSelecionada(dados)
        setBuscaTexto(dados.nome)
        reset(dadosAssociadaParaFormulario(dados))
      })
      .catch(() => setErroAssociada('Não foi possível carregar a associada'))
  }, [associadoIdParam, reset])

  // Debounced search for associada
  useEffect(() => {
    if (associadaSelecionada) return

    if (buscaTexto.trim() === '') {
      setResultadosBusca([])
      return
    }

    const timeout = setTimeout(() => {
      setBuscando(true)
      apiGet<AssociadaResumo[]>(
        `/usuarios?papel=ASSOCIADO&busca=${encodeURIComponent(buscaTexto)}`
      )
        .then(setResultadosBusca)
        .finally(() => setBuscando(false))
    }, 400)

    return () => clearTimeout(timeout)
  }, [buscaTexto, associadaSelecionada])

  // Load turmas when projetoId changes.
  // If pendingTurmaIdRef has a value (set by the ?turmaId= preselect effect),
  // apply it instead of clearing turmaId.
  useEffect(() => {
    if (!projetoId) {
      setTurmas([])
      return
    }

    apiGet<Turma[]>(`/turmas?projetoId=${projetoId}`).then((data) => {
      setTurmas(data)
      if (pendingTurmaIdRef.current !== null) {
        setValue('turmaId', pendingTurmaIdRef.current)
        pendingTurmaIdRef.current = null
      } else {
        setValue('turmaId', '' as unknown as number)
      }
    })
  }, [projetoId, setValue])

  // Pre-select project + turma when ?turmaId= is given.
  // Searches projects sequentially until the turma is found.
  useEffect(() => {
    if (!turmaIdParam || projetos.length === 0) return

    const turmaId = Number(turmaIdParam)

    ;(async () => {
      for (const projeto of projetos) {
        const turmasDP = await apiGet<Turma[]>(`/turmas?projetoId=${projeto.id}`)
        if (turmasDP.some((t) => Number(t.id) === turmaId)) {
          pendingTurmaIdRef.current = turmaId
          setValue('projetoId', Number(projeto.id))
          break
        }
      }
    })()
  }, [turmaIdParam, projetos, setValue])

  async function selecionarAssociada(resumo: AssociadaResumo) {
    setErroAssociada('')
    const dadosCompletos = await apiGet<AssociadaCompleta>(`/usuarios/${resumo.id}`)
    setAssociadaSelecionada(dadosCompletos)
    setBuscaTexto(dadosCompletos.nome)
    setResultadosBusca([])
    setCepNaoEncontrado(false)

    reset(dadosAssociadaParaFormulario(dadosCompletos))
  }

  function trocarAssociada() {
    setAssociadaSelecionada(null)
    setBuscaTexto('')
    setResultadosBusca([])
    setTurmas([])
    setCepNaoEncontrado(false)
    reset(VALORES_PADRAO)
  }

  async function buscarCep() {
    const cepLimpo = (getValues('cep') ?? '').replace(/\D/g, '')

    if (cepLimpo.length !== 8) {
      return
    }

    setCepNaoEncontrado(false)

    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      const dados: RespostaViaCep = await resposta.json()

      if (dados.erro) {
        setCepNaoEncontrado(true)
        return
      }

      setValue('logradouro', dados.logradouro ?? '')
      setValue('bairro', dados.bairro ?? '')
      setValue('cidade', dados.localidade ?? '')
      setValue('uf', dados.uf ?? '')
    } catch {
      setCepNaoEncontrado(true)
    }
  }

  async function onSubmit(dados: MatriculaFormOutput) {
    setErro('')
    setSucesso(false)

    if (!associadaSelecionada) {
      setErroAssociada('Selecione uma associada')
      return
    }

    setErroAssociada('')
    try {
      await apiPatch(`/usuarios/${associadaSelecionada.id}`, {
        telefone: dados.telefone,
        rg: dados.rg,
        dataNascimento: dados.dataNascimento,
        tomaMedicamento: dados.tomaMedicamento,
        qualMedicamento: dados.tomaMedicamento ? dados.qualMedicamento : undefined,
        cep: dados.cep,
        logradouro: dados.logradouro,
        numero: dados.numero,
        complemento: dados.complemento,
        bairro: dados.bairro,
        cidade: dados.cidade,
        uf: dados.uf,
      })

      await apiPost('/matriculas', {
        usuarioId: associadaSelecionada.id,
        turmaId: dados.turmaId,
        exameMedico: dados.exameMedico,
      })

      router.push(`/associados/${associadaSelecionada.id}`)
    } catch {
      setErro('Não foi possível matricular a aluna')
    }
  }

  return (
    <div className={styles.pagina}>
      <div className={styles.card}>
        <h1 className={styles.titulo}>Nova matrícula</h1>

        {!associadaSelecionada && (
          <div className={styles.campo}>
            <label htmlFor="busca">Buscar associada</label>
            <input
              type="text"
              id="busca"
              placeholder="Digite o nome..."
              value={buscaTexto}
              onChange={(evento) => setBuscaTexto(evento.target.value)}
            />
            {buscando && <span className={styles.erro}>Buscando...</span>}
            {erroAssociada && <span className={styles.erro}>{erroAssociada}</span>}

            {resultadosBusca.length > 0 && (
              <ul className={styles.resultados}>
                {resultadosBusca.map((resumo) => (
                  <li key={resumo.id}>
                    <button
                      type="button"
                      className={styles.resultadoItem}
                      onClick={() => selecionarAssociada(resumo)}
                    >
                      <span className={styles.resultadoNome}>{resumo.nome}</span>
                      <span className={styles.resultadoCpf}>{resumo.cpf}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {associadaSelecionada && (
          <>
            <div className={styles.associadaSelecionada}>
              <span className={styles.associadaNome}>{associadaSelecionada.nome}</span>
              <button type="button" className={styles.botaoTrocar} onClick={trocarAssociada}>
                Trocar
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <h2 className={styles.subtitulo}>Dados da aluna</h2>

              <div className={styles.campo}>
                <label htmlFor="telefone">Telefone</label>
                <input type="text" id="telefone" {...register('telefone')} />
              </div>

              <div className={styles.campo}>
                <label htmlFor="rg">RG</label>
                <input type="text" id="rg" {...register('rg')} />
              </div>

              <div className={styles.campo}>
                <label htmlFor="dataNascimento">Data de nascimento</label>
                <input type="date" id="dataNascimento" {...register('dataNascimento')} />
              </div>

              <div className={styles.campoCheckbox}>
                <input
                  type="checkbox"
                  id="tomaMedicamento"
                  {...register('tomaMedicamento')}
                />
                <label htmlFor="tomaMedicamento">Toma medicamento</label>
              </div>

              {tomaMedicamento && (
                <div className={styles.campo}>
                  <label htmlFor="qualMedicamento">Qual medicamento</label>
                  <input type="text" id="qualMedicamento" {...register('qualMedicamento')} />
                </div>
              )}

              <h2 className={styles.subtitulo}>Endereço</h2>

              <div className={styles.campo}>
                <label htmlFor="cep">CEP</label>
                <input
                  type="text"
                  id="cep"
                  {...registroCep}
                  onBlur={(evento) => {
                    registroCep.onBlur(evento)
                    buscarCep()
                  }}
                />
                {cepNaoEncontrado && <span className={styles.aviso}>CEP não encontrado</span>}
              </div>

              <div className={styles.campo}>
                <label htmlFor="logradouro">Logradouro</label>
                <input type="text" id="logradouro" {...register('logradouro')} />
              </div>

              <div className={styles.linha}>
                <div className={styles.campo}>
                  <label htmlFor="numero">Número</label>
                  <input type="text" id="numero" {...register('numero')} />
                </div>

                <div className={styles.campo}>
                  <label htmlFor="complemento">Complemento</label>
                  <input type="text" id="complemento" {...register('complemento')} />
                </div>
              </div>

              <div className={styles.campo}>
                <label htmlFor="bairro">Bairro</label>
                <input type="text" id="bairro" {...register('bairro')} />
              </div>

              <div className={styles.linha}>
                <div className={styles.campo}>
                  <label htmlFor="cidade">Cidade</label>
                  <input type="text" id="cidade" {...register('cidade')} />
                </div>

                <div className={styles.campo}>
                  <label htmlFor="uf">UF</label>
                  <input type="text" id="uf" {...register('uf')} />
                </div>
              </div>

              <h2 className={styles.subtitulo}>Matrícula</h2>

              <div className={styles.campo}>
                <label htmlFor="projetoId">Projeto</label>
                <select id="projetoId" {...register('projetoId')}>
                  <option value="">Selecione...</option>
                  {projetos.map((projeto) => (
                    <option key={projeto.id} value={projeto.id}>
                      {projeto.nome}
                    </option>
                  ))}
                </select>
                {errors.projetoId && (
                  <span className={styles.erro}>{errors.projetoId.message}</span>
                )}
              </div>

              <div className={styles.campo}>
                <label htmlFor="turmaId">Turma</label>
                <select id="turmaId" disabled={!projetoId} {...register('turmaId')}>
                  <option value="">Selecione...</option>
                  {turmas.map((turma) => (
                    <option key={turma.id} value={turma.id}>
                      {turma.nome}
                    </option>
                  ))}
                </select>
                {errors.turmaId && <span className={styles.erro}>{errors.turmaId.message}</span>}
              </div>

              <div className={styles.campo}>
                <label htmlFor="exameMedico">Exame médico</label>
                <select id="exameMedico" {...register('exameMedico')}>
                  <option value="APTO">Apto</option>
                  <option value="NAO_APTO">Não apto</option>
                  <option value="AGUARDANDO">Aguardando</option>
                </select>
                {errors.exameMedico && (
                  <span className={styles.erro}>{errors.exameMedico.message}</span>
                )}
              </div>

              <button className={styles.botao} disabled={isSubmitting}>
                Matricular
              </button>
            </form>
          </>
        )}

        {sucesso && <p className={styles.sucesso}>Aluna matriculada!</p>}
        {erro && <p className={styles.mensagemErro}>{erro}</p>}
      </div>
    </div>
  )
}
