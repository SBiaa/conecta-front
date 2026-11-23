'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { apiGet, apiPost } from '../../lib/api'
import { getUsuario, salvarSessao } from '../../lib/auth'
import { formatarDiaCurto } from '../../lib/viagem'
import styles from '../../(auth)/login/login.module.css'

type DadosLink = { nome: string; destino: string | null; dataSaida: string | null }

type RespostaEntrada =
  | { escolher: { id: string; nome: string }[] }
  | { token: string; viagemId: number; usuario: Record<string, unknown> }

// Máscara (11) 99999-9999 enquanto digita.
function mascararCelular(valor: string) {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

// Porta de entrada do link mandado no grupo da viagem: a pessoa digita o
// celular que está na lista e entra só na área desta viagem, sem CPF nem senha.
export default function EntradaViagemPage() {
  const { codigo } = useParams<{ codigo: string }>()
  const router = useRouter()
  const [viagem, setViagem] = useState<DadosLink | null>(null)
  const [erroLink, setErroLink] = useState('')
  const [celular, setCelular] = useState('')
  const [opcoes, setOpcoes] = useState<{ id: string; nome: string }[] | null>(null)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    // Quem já entrou por este mesmo link vai direto pra viagem (o celular fica
    // lembrado); a área da viagem confere o acesso de verdade.
    const usuario = getUsuario()
    if (usuario?.papel === 'CONVIDADO' && usuario.viagemId && usuario.codigo === codigo.toUpperCase()) {
      router.replace(`/viagem/${usuario.viagemId}`)
      return
    }
    apiGet<DadosLink>(`/acesso-viagem/${encodeURIComponent(codigo)}`)
      .then(setViagem)
      .catch((e: Error) => setErroLink(e.message))
  }, [codigo, router])

  async function entrar(usuarioId?: string) {
    setErro('')
    setEnviando(true)
    try {
      const resposta = await apiPost<RespostaEntrada>(`/acesso-viagem/${encodeURIComponent(codigo)}`, {
        celular: celular.replace(/\D/g, ''),
        usuarioId,
      })
      if ('escolher' in resposta) {
        setOpcoes(resposta.escolher)
        setEnviando(false)
        return
      }
      salvarSessao(resposta.token, { ...resposta.usuario, codigo: codigo.toUpperCase() })
      router.replace(`/viagem/${resposta.viagemId}`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível entrar')
      setEnviando(false)
    }
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (celular.replace(/\D/g, '').length < 10) {
      setErro('Digite o celular com DDD, por exemplo (11) 99999-9999')
      return
    }
    entrar()
  }

  return (
    <div className={styles.pagina}>
      <div className={styles.card}>
        <Image
          src="/logo-novo-millenium.png"
          alt="Novo Millenium"
          width={200}
          height={58}
          className={styles.logo}
          priority
        />

        {erroLink && (
          <>
            <h1 className={styles.titulo}>Link da viagem</h1>
            <p className={styles.erro} role="alert">{erroLink}</p>
          </>
        )}

        {!erroLink && !viagem && <p className={styles.subtitulo}>Carregando...</p>}

        {viagem && (
          <>
            <h1 className={styles.titulo}>{viagem.nome}</h1>
            <p className={styles.subtitulo}>
              {[viagem.destino, viagem.dataSaida && `saída ${formatarDiaCurto(viagem.dataSaida)}`]
                .filter(Boolean)
                .join(' · ') || 'Área da viagem'}
            </p>

            {opcoes ? (
              <div>
                <p className={styles.subtitulo} style={{ marginBottom: '1rem' }}>
                  Esse celular é de mais de uma pessoa. Quem é você?
                </p>
                {opcoes.map((o) => (
                  <button key={o.id} className={styles.botao} disabled={enviando} onClick={() => entrar(o.id)}>
                    {o.nome}
                  </button>
                ))}
                {erro && <p className={styles.erro} role="alert">{erro}</p>}
                <p className={styles.ajuda}>
                  <button
                    type="button"
                    onClick={() => setOpcoes(null)}
                    style={{ background: 'none', border: 'none', textDecoration: 'underline', color: 'inherit', font: 'inherit', cursor: 'pointer', minHeight: 44 }}
                  >
                    Digitar outro celular
                  </button>
                </p>
              </div>
            ) : (
              <form onSubmit={enviar}>
                <div className={styles.campo}>
                  <label htmlFor="celular">Seu celular</label>
                  <input
                    id="celular"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="(11) 99999-9999"
                    value={celular}
                    onChange={(e) => setCelular(mascararCelular(e.target.value))}
                  />
                </div>
                {erro && <p className={styles.erro} role="alert" aria-live="assertive">{erro}</p>}
                <button className={styles.botao} disabled={enviando}>
                  {enviando ? 'Entrando...' : 'Entrar na viagem'}
                </button>
                <p className={styles.ajuda}>Use o mesmo celular que você deu para a coordenação na inscrição.</p>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
