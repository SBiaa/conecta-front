'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiGet, apiPost } from '../../lib/api'
import styles from './nova.module.css'

const alunaSchema = z.object({
  nome: z.string().min(1, 'Informe o nome'),
  telefone: z.string().optional(),
  turmaId: z.coerce.number({ message: 'Escolha uma turma' }),
})

type AlunaFormInput = z.input<typeof alunaSchema>
type AlunaFormOutput = z.output<typeof alunaSchema>

type Turma = {
  id: string
  nome: string
}

export default function NovaAlunaPage() {
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AlunaFormInput, unknown, AlunaFormOutput>({
    resolver: zodResolver(alunaSchema),
  })

  useEffect(() => {
    apiGet<Turma[]>('/turmas').then(setTurmas)
  }, [])

  async function onSubmit(dados: AlunaFormOutput) {
    setErro('')
    setSucesso(false)
    try {
      await apiPost('/alunas', dados)
      setSucesso(true)
      reset()
    } catch {
      setErro('Não foi possível cadastrar a aluna')
    }
  }

  return (
    <div className={styles.pagina}>
      <div className={styles.card}>
        <h1 className={styles.titulo}>Nova aluna</h1>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.campo}>
            <label htmlFor="nome">Nome</label>
            <input type="text" id="nome" {...register('nome')} />
            {errors.nome && <span className={styles.erro}>{errors.nome.message}</span>}
          </div>

          <div className={styles.campo}>
            <label htmlFor="telefone">Telefone</label>
            <input type="text" id="telefone" {...register('telefone')} />
          </div>

          <div className={styles.campo}>
            <label htmlFor="turmaId">Turma</label>
            <select id="turmaId" {...register('turmaId')}>
              <option value="">Selecione...</option>
              {turmas.map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {turma.nome}
                </option>
              ))}
            </select>
            {errors.turmaId && <span className={styles.erro}>{errors.turmaId.message}</span>}
          </div>

          <button className={styles.botao} disabled={isSubmitting}>
            Cadastrar
          </button>
        </form>

        {sucesso && <p className={styles.sucesso}>Aluna cadastrada!</p>}
        {erro && <p className={styles.mensagemErro}>{erro}</p>}
      </div>
    </div>
  )
}
