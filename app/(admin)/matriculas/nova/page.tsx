'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiGet, apiPatch, apiPost } from '../../../lib/api'
import styles from './nova.module.css'

const matriculaSchema = z.object({
  rg: z.string().optional(),
  dataNascimento: z.string().optional(),
  tomaMedicamento: z.boolean().optional(),
  qualMedicamento: z.string().optional(),
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
  rg: string | null
  dataNascimento: string | null
  tomaMedicamento: boolean
  qualMedicamento: string | null
}

type Projeto = {
  id: string
  nome: string
}

type Turma = {
  id: string
  nome: string
}

const VALORES_PADRAO: MatriculaFormInput = {
  rg: '',
  dataNascimento: '',
  tomaMedicamento: false,
  qualMedicamento: '',
  projetoId: '' as unknown as number,
  turmaId: '' as unknown as number,
  exameMedico: 'AGUARDANDO',
}

export default function NovaMatriculaPage() {
  const [buscaTexto, setBuscaTexto] = useState('')
  const [resultadosBusca, setResultadosBusca] = useState<AssociadaResumo[]>([])
  const [buscando, setBuscando] = useState(false)
  const [associadaSelecionada, setAssociadaSelecionada] = useState<AssociadaCompleta | null>(
    null
  )
  const [erroAssociada, setErroAssociada] = useState('')

  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])

  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MatriculaFormInput, unknown, MatriculaFormOutput>({
    resolver: zodResolver(matriculaSchema),
    defaultValues: VALORES_PADRAO,
  })

  const tomaMedicamento = watch('tomaMedicamento')
  const projetoId = watch('projetoId')

  useEffect(() => {
    apiGet<Projeto[]>('/projetos').then(setProjetos)
  }, [])

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

  useEffect(() => {
    if (!projetoId) {
      setTurmas([])
      return
    }

    apiGet<Turma[]>(`/turmas?projetoId=${projetoId}`).then(setTurmas)
    setValue('turmaId', '' as unknown as number)
  }, [projetoId, setValue])

  async function selecionarAssociada(resumo: AssociadaResumo) {
    setErroAssociada('')
    const dadosCompletos = await apiGet<AssociadaCompleta>(`/usuarios/${resumo.id}`)
    setAssociadaSelecionada(dadosCompletos)
    setBuscaTexto(dadosCompletos.nome)
    setResultadosBusca([])

    reset({
      ...VALORES_PADRAO,
      rg: dadosCompletos.rg ?? '',
      dataNascimento: dadosCompletos.dataNascimento
        ? dadosCompletos.dataNascimento.slice(0, 10)
        : '',
      tomaMedicamento: dadosCompletos.tomaMedicamento,
      qualMedicamento: dadosCompletos.qualMedicamento ?? '',
    })
  }

  function trocarAssociada() {
    setAssociadaSelecionada(null)
    setBuscaTexto('')
    setResultadosBusca([])
    setTurmas([])
    reset(VALORES_PADRAO)
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
        rg: dados.rg,
        dataNascimento: dados.dataNascimento,
        tomaMedicamento: dados.tomaMedicamento,
        qualMedicamento: dados.tomaMedicamento ? dados.qualMedicamento : undefined,
      })

      await apiPost('/matriculas', {
        usuarioId: associadaSelecionada.id,
        turmaId: dados.turmaId,
        exameMedico: dados.exameMedico,
      })

      setSucesso(true)
      trocarAssociada()
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
