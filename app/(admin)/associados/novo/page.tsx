'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiGet, apiPost } from '../../../lib/api'
import { montarMensagemAcesso, montarLinkWhatsapp, type AcessoGerado } from '../../../lib/acesso'
import styles from './novo.module.css'

// O CPF é obrigatório para adultos, mas não para o dependente (criança): quem
// decide é a tela, pelo ?responsavel= — ver onSubmit.
const associadoSchema = z.object({
  nome: z.string().min(1, 'Informe o nome'),
  cpf: z.string().optional(),
  dataNascimento: z.string().optional(),
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

type AssociadoSimilar = {
  id: string
  nome: string
  cpf: string | null
  telefone: string | null
}

export default function NovoAssociadoPage() {
  const router = useRouter()
  // /associados/novo?responsavel=<id> cadastra um dependente (criança) desse
  // responsável: sem CPF obrigatório, sem senha, sem endereço (herda o dele).
  const responsavelId = useSearchParams().get('responsavel')
  const [responsavelNome, setResponsavelNome] = useState('')

  const [cepNaoEncontrado, setCepNaoEncontrado] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')
  const [acesso, setAcesso] = useState<AcessoGerado | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [similares, setSimilares] = useState<AssociadoSimilar[]>([])
  const [avisoDispensado, setAvisoDispensado] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AssociadoForm>({
    resolver: zodResolver(associadoSchema),
  })

  const registroCep = register('cep')
  const nome = watch('nome')

  useEffect(() => {
    if (!responsavelId) return
    apiGet<{ nome: string }>(`/usuarios/${responsavelId}`)
      .then((r) => setResponsavelNome(r.nome))
      .catch(() => setErro('Responsável não encontrado.'))
  }, [responsavelId])

  // Cadastro duplicado por nome parecido (ex: "Maria Aparecida Soares de
  // Oliveira" x "...Oliveira Silva") passava batido porque só o CPF tem
  // constraint de unicidade no banco. Avisa antes de deixar cadastrar de novo.
  useEffect(() => {
    const nomeBusca = (nome ?? '').trim()

    if (nomeBusca.length < 4 || responsavelId) {
      setSimilares([])
      return
    }

    const timeout = setTimeout(() => {
      apiGet<AssociadoSimilar[]>(`/usuarios?papel=ASSOCIADO&busca=${encodeURIComponent(nomeBusca)}`)
        .then((encontrados) => {
          setSimilares(encontrados)
          setAvisoDispensado(false)
        })
        .catch(() => setSimilares([]))
    }, 400)

    return () => clearTimeout(timeout)
  }, [nome, responsavelId])

  const temAvisoDuplicata = similares.length > 0 && !avisoDispensado

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
    setAcesso(null)

    if (!responsavelId && !dados.cpf?.trim()) {
      setErro('Informe o CPF')
      return
    }

    if (responsavelId) {
      try {
        const criado = await apiPost<{ id: string }>('/usuarios', {
          nome: dados.nome,
          dataNascimento: dados.dataNascimento || undefined,
          responsavelId,
        })
        router.push(`/associados/${criado.id}`)
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Não foi possível cadastrar o dependente.')
      }
      return
    }

    try {
      const usuarioCriado = await apiPost<{ senhaInicial?: string }>('/usuarios', {
        nome: dados.nome,
        cpf: dados.cpf ?? '',
        telefone: dados.telefone,
        // Sem senha: a API sempre gera uma senha amigável (ex: "girassol42")
        // pra associada, nunca aceita o CPF como senha — ver usuarioController.
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
      if (usuarioCriado.senhaInicial) {
        setAcesso({
          nome: dados.nome,
          cpf: dados.cpf ?? '',
          senha: usuarioCriado.senhaInicial,
          telefone: dados.telefone,
        })
      }
      reset()
      setCepNaoEncontrado(false)
      setSimilares([])
      setAvisoDispensado(false)
    } catch {
      setErro('Não foi possível cadastrar o associado. Verifique se o CPF já está cadastrado.')
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
        <h1 className={styles.titulo}>{responsavelId ? 'Novo dependente' : 'Novo associado'}</h1>
        {responsavelId && (
          <p className={styles.aviso}>
            Dependente de <strong>{responsavelNome || '...'}</strong>. Não tem login: quem acompanha é o
            responsável.
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.campo}>
            <label htmlFor="nome">Nome</label>
            <input type="text" id="nome" {...register('nome')} />
            {errors.nome && <span className={styles.erro}>{errors.nome.message}</span>}
          </div>

          {responsavelId ? (
            <div className={styles.campo}>
              <label htmlFor="dataNascimento">Data de nascimento</label>
              <input type="date" id="dataNascimento" {...register('dataNascimento')} />
            </div>
          ) : (
            <>
              <div className={styles.campo}>
                <label htmlFor="cpf">CPF</label>
                <input type="text" id="cpf" {...register('cpf')} />
                {errors.cpf && <span className={styles.erro}>{errors.cpf.message}</span>}
              </div>

              <div className={styles.campo}>
                <label htmlFor="telefone">Telefone</label>
                <input type="text" id="telefone" {...register('telefone')} />
              </div>
            </>
          )}

          {similares.length > 0 && (
            <div className={styles.avisoDuplicata}>
              <p className={styles.avisoDuplicataTexto}>
                Já existe {similares.length === 1 ? 'um cadastro parecido' : 'cadastros parecidos'}:
              </p>
              <ul className={styles.avisoDuplicataLista}>
                {similares.map((associado) => (
                  <li key={associado.id} className={styles.avisoDuplicataItem}>
                    <strong>{associado.nome}</strong>
                    <span>
                      CPF {associado.cpf}
                      {associado.telefone ? ` · Tel. ${associado.telefone}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
              {!avisoDispensado && (
                <button
                  type="button"
                  className={styles.avisoDuplicataConfirmar}
                  onClick={() => setAvisoDispensado(true)}
                >
                  Não é a mesma pessoa, continuar cadastro
                </button>
              )}
            </div>
          )}

          {!responsavelId && (
            <>
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

            </>
          )}

          <button className={styles.botao} disabled={isSubmitting || temAvisoDuplicata}>
            Cadastrar
          </button>
        </form>

        {acesso && (
          <div className={styles.avisoSenha}>
            <p className={styles.avisoSenhaTexto}>
              Associado cadastrado! Envie a mensagem abaixo para a associada.
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

        {!acesso && sucesso && <p className={styles.sucesso}>Associado cadastrado!</p>}
        {erro && <p className={styles.mensagemErro}>{erro}</p>}
      </div>
    </div>
  )
}
