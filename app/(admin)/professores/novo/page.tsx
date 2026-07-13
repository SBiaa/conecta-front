'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiPost } from '../../../lib/api'
import styles from './novo.module.css'

const professorSchema = z.object({
  nome: z.string().min(1, 'Informe o nome'),
  cpf: z.string().min(1, 'Informe o CPF'),
  telefone: z.string().optional(),
  email: z.string().optional(),
})

type ProfessorForm = z.infer<typeof professorSchema>

export default function NovoProfessorPage() {
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')
  const [senhaGerada, setSenhaGerada] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfessorForm>({
    resolver: zodResolver(professorSchema),
  })

  async function onSubmit(dados: ProfessorForm) {
    setErro('')
    setSucesso(false)
    setSenhaGerada(null)

    try {
      const usuarioCriado = await apiPost<{ senhaInicial?: string }>('/usuarios', {
        nome: dados.nome,
        cpf: dados.cpf,
        telefone: dados.telefone,
        email: dados.email || undefined,
        papel: 'PROFESSOR',
      })
      setSucesso(true)
      setSenhaGerada(usuarioCriado.senhaInicial ?? null)
      reset()
    } catch {
      setErro('Não foi possível cadastrar a professora. Verifique se o CPF já está cadastrado.')
    }
  }

  function copiarSenha() {
    if (!senhaGerada) return
    navigator.clipboard.writeText(senhaGerada)
    setCopiado(true)
  }

  function dispensarAvisoSenha() {
    setSenhaGerada(null)
    setSucesso(false)
    setCopiado(false)
  }

  return (
    <div className={styles.pagina}>
      <div className={styles.card}>
        <h1 className={styles.titulo}>Nova professora</h1>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.campo}>
            <label htmlFor="nome">Nome</label>
            <input type="text" id="nome" {...register('nome')} />
            {errors.nome && <span className={styles.erro}>{errors.nome.message}</span>}
          </div>

          <div className={styles.campo}>
            <label htmlFor="cpf">CPF</label>
            <input type="text" id="cpf" {...register('cpf')} />
            {errors.cpf && <span className={styles.erro}>{errors.cpf.message}</span>}
          </div>

          <div className={styles.campo}>
            <label htmlFor="telefone">Telefone</label>
            <input type="text" id="telefone" {...register('telefone')} />
          </div>

          <div className={styles.campo}>
            <label htmlFor="email">Email</label>
            <input type="email" id="email" {...register('email')} />
          </div>

          <button className={styles.botao} disabled={isSubmitting}>
            Cadastrar
          </button>
        </form>

        {senhaGerada && (
          <div className={styles.avisoSenha}>
            <p className={styles.avisoSenhaTexto}>
              Professora cadastrada! Senha de acesso:{' '}
              <span className={styles.avisoSenhaValor}>{senhaGerada}</span> — anote e entregue a
              ela.
            </p>
            <div className={styles.avisoSenhaAcoes}>
              <button type="button" className={styles.avisoSenhaCopiar} onClick={copiarSenha}>
                {copiado ? 'Copiado!' : 'Copiar senha'}
              </button>
              <button
                type="button"
                className={styles.avisoSenhaDispensar}
                onClick={dispensarAvisoSenha}
              >
                Dispensar
              </button>
            </div>
          </div>
        )}

        {!senhaGerada && sucesso && <p className={styles.sucesso}>Professora cadastrada!</p>}
        {erro && <p className={styles.mensagemErro}>{erro}</p>}
      </div>
    </div>
  )
}
