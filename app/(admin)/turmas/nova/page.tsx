'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiGet, apiPost } from '../../../lib/api'
import styles from './nova.module.css'

const turmaSchema = z.object({
  nome: z.string().min(1, 'Informe o nome'),
  projetoId: z.coerce.number({ message: 'Escolha um projeto' }),
  horario: z.string().min(1, 'Informe o horário'),
})

type TurmaFormInput = z.input<typeof turmaSchema>
type TurmaFormOutput = z.output<typeof turmaSchema>

type Projeto = {
  id: string
  nome: string
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

export default function NovaTurmaPage() {
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [diasSelecionados, setDiasSelecionados] = useState<string[]>([])
  const [erroDias, setErroDias] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TurmaFormInput, unknown, TurmaFormOutput>({
    resolver: zodResolver(turmaSchema),
  })

  useEffect(() => {
    apiGet<Projeto[]>('/projetos').then(setProjetos)
  }, [])

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
      await apiPost('/turmas', {
        nome: dados.nome,
        projetoId: dados.projetoId,
        horario: dados.horario,
        dias: diasSelecionados,
      })
      setSucesso(true)
      reset()
      setDiasSelecionados([])
    } catch {
      setErro('Não foi possível criar a turma')
    }
  }

  return (
    <div className={styles.pagina}>
      <div className={styles.card}>
        <h1 className={styles.titulo}>Nova turma</h1>

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

          <button className={styles.botao} disabled={isSubmitting}>
            Cadastrar
          </button>
        </form>

        {sucesso && <p className={styles.sucesso}>Turma criada!</p>}
        {erro && <p className={styles.mensagemErro}>{erro}</p>}
      </div>
    </div>
  )
}
