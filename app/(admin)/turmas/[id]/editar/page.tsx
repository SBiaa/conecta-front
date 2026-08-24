'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiGet, apiPatch, apiDelete } from '../../../../lib/api'
import ConfirmDialog from '../../../../components/ConfirmDialog'
import styles from './editar.module.css'

const turmaSchema = z.object({
  nome: z.string().min(1, 'Informe o nome'),
  projetoId: z.coerce.number({ message: 'Escolha um projeto' }),
  horario: z.string().min(1, 'Informe o horário'),
  professorId: z.string().optional(),
})

type TurmaFormInput = z.input<typeof turmaSchema>
type TurmaFormOutput = z.output<typeof turmaSchema>

type Projeto = {
  id: string
  nome: string
}

type Professor = {
  id: string
  nome: string
}

type TurmaDetalhe = {
  id: number
  nome: string
  projetoId: number
  professorId: string | null
  horario: string | null
  dias: string[]
}

const DIAS_OPCOES = [
  { valor: 'SEGUNDA', label: 'Seg' },
  { valor: 'TERCA', label: 'Ter' },
  { valor: 'QUARTA', label: 'Qua' },
  { valor: 'QUINTA', label: 'Qui' },
  { valor: 'SEXTA', label: 'Sex' },
  { valor: 'SABADO', label: 'Sáb' },
  { valor: 'DOMINGO', label: 'Dom' },
]

export default function EditarTurmaPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [carregando, setCarregando] = useState(true)
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [professores, setProfessores] = useState<Professor[]>([])
  const [diasSelecionados, setDiasSelecionados] = useState<string[]>([])
  const [erroDias, setErroDias] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')
  const [excluindo, setExcluindo] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [projetoId, setProjetoId] = useState<number | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TurmaFormInput, unknown, TurmaFormOutput>({
    resolver: zodResolver(turmaSchema),
  })

  useEffect(() => {
    Promise.all([
      apiGet<Projeto[]>('/projetos'),
      apiGet<Professor[]>('/usuarios?papel=PROFESSOR'),
      apiGet<TurmaDetalhe>(`/turmas/${id}`),
    ])
      .then(([listaProjetos, listaProfessores, turma]) => {
        setProjetos(listaProjetos)
        setProfessores(listaProfessores)
        setProjetoId(turma.projetoId)
        setValue('nome', turma.nome)
        setValue('projetoId', turma.projetoId)
        setValue('horario', turma.horario ?? '')
        setValue('professorId', turma.professorId ?? '')
        setDiasSelecionados(turma.dias ?? [])
      })
      .catch(() => setErro('Não foi possível carregar a turma'))
      .finally(() => setCarregando(false))
  }, [id, setValue])

  function alternarDia(dia: string) {
    setDiasSelecionados((atual) =>
      atual.includes(dia) ? atual.filter((item) => item !== dia) : [...atual, dia]
    )
  }

  async function onSubmit(dados: TurmaFormOutput) {
    setErro('')
    setSucesso(false)

    if (diasSelecionados.length === 0) {
      setErroDias('Selecione pelo menos um dia')
      return
    }

    setErroDias('')
    try {
      await apiPatch(`/turmas/${id}`, {
        nome: dados.nome,
        projetoId: dados.projetoId,
        horario: dados.horario,
        dias: diasSelecionados,
        professorId: dados.professorId || null,
      })
      setSucesso(true)
      router.push(`/turmas/${id}/alunas`)
    } catch {
      setErro('Não foi possível salvar a turma')
    }
  }

  async function excluirTurma() {
    setErro('')
    setExcluindo(true)
    try {
      await apiDelete(`/turmas/${id}`)
      router.push(projetoId ? `/projetos/${projetoId}/turmas` : '/projetos')
    } catch (erro) {
      if (erro instanceof Error && erro.message.includes('409')) {
        setErro('Não é possível excluir a turma pois há matrículas ou presenças vinculadas a ela')
      } else {
        setErro('Não foi possível excluir a turma')
      }
      setExcluindo(false)
      setConfirmandoExclusao(false)
    }
  }

  if (carregando) {
    return (
      <div className={styles.pagina}>
        <div className={styles.card}>
          <p className={styles.carregando}>Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.pagina}>
      <div className={styles.card}>
        <h1 className={styles.titulo}>Editar turma</h1>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.campo}>
            <label htmlFor="nome">Nome</label>
            <input type="text" id="nome" {...register('nome')} />
            {errors.nome && <span className={styles.erro}>{errors.nome.message}</span>}
          </div>

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
            {errors.projetoId && <span className={styles.erro}>{errors.projetoId.message}</span>}
          </div>

          <div className={styles.campo}>
            <label>Dias</label>
            <div className={styles.chips}>
              {DIAS_OPCOES.map((dia) => (
                <button
                  key={dia.valor}
                  type="button"
                  className={`${styles.chip} ${
                    diasSelecionados.includes(dia.valor) ? styles.chipSelecionado : ''
                  }`}
                  onClick={() => alternarDia(dia.valor)}
                >
                  {dia.label}
                </button>
              ))}
            </div>
            {erroDias && <span className={styles.erro}>{erroDias}</span>}
          </div>

          <div className={styles.campo}>
            <label htmlFor="horario">Horário</label>
            <input type="time" id="horario" {...register('horario')} />
            {errors.horario && <span className={styles.erro}>{errors.horario.message}</span>}
          </div>

          <div className={styles.campo}>
            <label htmlFor="professorId">Professora responsável</label>
            <select id="professorId" {...register('professorId')}>
              <option value="">Sem professora definida</option>
              {professores.map((professor) => (
                <option key={professor.id} value={professor.id}>
                  {professor.nome}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.acoes}>
            <button
              type="button"
              className={styles.botaoCancelar}
              onClick={() => router.push(`/turmas/${id}/alunas`)}
            >
              Cancelar
            </button>
            <button className={styles.botao} disabled={isSubmitting}>
              Salvar
            </button>
          </div>
        </form>

        <button
          type="button"
          className={styles.botaoExcluir}
          onClick={() => setConfirmandoExclusao(true)}
          disabled={excluindo}
        >
          {excluindo ? 'Excluindo...' : 'Excluir turma'}
        </button>

        {sucesso && <p className={styles.sucesso}>Turma atualizada!</p>}
        {erro && <p className={styles.mensagemErro}>{erro}</p>}
      </div>

      <ConfirmDialog
        aberto={confirmandoExclusao}
        titulo="Excluir turma"
        mensagem="Tem certeza que deseja excluir esta turma? Essa ação não pode ser desfeita."
        carregando={excluindo}
        onConfirmar={excluirTurma}
        onCancelar={() => setConfirmandoExclusao(false)}
      />
    </div>
  )
}
