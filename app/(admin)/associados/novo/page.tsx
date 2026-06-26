'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiPost } from '../../../lib/api'
import styles from './novo.module.css'

const associadoSchema = z.object({
  nome: z.string().min(1, 'Informe o nome'),
  cpf: z.string().min(1, 'Informe o CPF'),
  telefone: z.string().optional(),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),
})

type AssociadoForm = z.infer<typeof associadoSchema>

type RespostaViaCep = {
  erro?: boolean
  logradouro?: string
  bairro?: string
  localidade?: string
  uf?: string
}

export default function NovoAssociadoPage() {
  const [cepNaoEncontrado, setCepNaoEncontrado] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')
  const [senhaGerada, setSenhaGerada] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AssociadoForm>({
    resolver: zodResolver(associadoSchema),
  })

  const registroCep = register('cep')

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

  async function onSubmit(dados: AssociadoForm) {
    setErro('')
    setSucesso(false)
    setSenhaGerada(null)

    try {
      const usuarioCriado = await apiPost<{ senhaInicial?: string }>('/usuarios', {
        nome: dados.nome,
        cpf: dados.cpf,
        telefone: dados.telefone,
        // Provisório: senha inicial = CPF. Trocar por um fluxo de definição
        // de senha (ex: convite por email/SMS) quando esse fluxo existir.
        senha: dados.cpf,
        papel: 'ASSOCIADO',
        cep: dados.cep,
        logradouro: dados.logradouro,
        numero: dados.numero,
        complemento: dados.complemento,
        bairro: dados.bairro,
        cidade: dados.cidade,
        uf: dados.uf,
      })
      setSucesso(true)
      setSenhaGerada(usuarioCriado.senhaInicial ?? null)
      reset()
      setCepNaoEncontrado(false)
    } catch {
      setErro('Não foi possível cadastrar o associado. Verifique se o CPF já está cadastrado.')
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
        <h1 className={styles.titulo}>Novo associado</h1>

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

          <button className={styles.botao} disabled={isSubmitting}>
            Cadastrar
          </button>
        </form>

        {senhaGerada && (
          <div className={styles.avisoSenha}>
            <p className={styles.avisoSenhaTexto}>
              Associado cadastrado! Senha de acesso:{' '}
              <span className={styles.avisoSenhaValor}>{senhaGerada}</span> — anote e entregue à
              associada.
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

        {!senhaGerada && sucesso && <p className={styles.sucesso}>Associado cadastrado!</p>}
        {erro && <p className={styles.mensagemErro}>{erro}</p>}
      </div>
    </div>
  )
}
