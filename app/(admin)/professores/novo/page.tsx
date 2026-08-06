'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiPost } from '../../../lib/api'
import { montarMensagemAcesso, montarLinkWhatsapp, type AcessoGerado } from '../../../lib/acesso'
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
  const [acesso, setAcesso] = useState<AcessoGerado | null>(null)
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
    setAcesso(null)

    try {
      const usuarioCriado = await apiPost<{ senhaInicial?: string }>('/usuarios', {
        nome: dados.nome,
        cpf: dados.cpf,
        telefone: dados.telefone,
        email: dados.email || undefined,
        papel: 'PROFESSOR',
      })
      setSucesso(true)
      if (usuarioCriado.senhaInicial) {
        setAcesso({
          nome: dados.nome,
          cpf: dados.cpf,
          senha: usuarioCriado.senhaInicial,
          telefone: dados.telefone,
        })
      }
      reset()
    } catch {
      setErro('Não foi possível cadastrar a professora. Verifique se o CPF já está cadastrado.')
    }
  }

  function copiarMensagem() {
    if (!acesso) return
    navigator.clipboard.writeText(montarMensagemAcesso(acesso))
    setCopiado(true)
  }

  function dispensarAvisoAcesso() {
    setAcesso(null)
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

        {acesso && (
          <div className={styles.avisoSenha}>
            <p className={styles.avisoSenhaTexto}>
              Professora cadastrada! Envie a mensagem abaixo para ela.
            </p>
            <pre className={styles.mensagemAcesso}>{montarMensagemAcesso(acesso)}</pre>
            <div className={styles.avisoSenhaAcoes}>
              <a
                className={styles.avisoSenhaWhatsapp}
                href={montarLinkWhatsapp(acesso)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Enviar no WhatsApp
              </a>
              <button type="button" className={styles.avisoSenhaCopiar} onClick={copiarMensagem}>
                {copiado ? 'Copiado!' : 'Copiar mensagem'}
              </button>
            </div>
            <div className={styles.avisoSenhaAcoesSecundarias}>
              <button
                type="button"
                className={styles.avisoSenhaDispensar}
                onClick={dispensarAvisoAcesso}
              >
                Dispensar
              </button>
            </div>
          </div>
        )}

        {!acesso && sucesso && <p className={styles.sucesso}>Professora cadastrada!</p>}
        {erro && <p className={styles.mensagemErro}>{erro}</p>}
      </div>
    </div>
  )
}
