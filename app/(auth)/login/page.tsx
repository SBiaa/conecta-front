'use client'

import { useState, type FormEvent } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { apiPost } from '../../lib/api'
import { salvarSessao } from '../../lib/auth'
import styles from './login.module.css'

type RespostaLogin = {
  token: string
  usuario: { papel: 'ADMIN' | 'PROFESSOR' | 'ASSOCIADO' } & Record<string, unknown>
}

// Máscara 000.000.000-00 enquanto digita; o que vai pra API são
// só os dígitos (a API guarda e compara o CPF sem pontuação).
function mascararCpf(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export default function LoginPage() {
  const [cpf, setCpf] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const router = useRouter()

  async function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro('')
    setCarregando(true)

    try {
      const dados = await apiPost<RespostaLogin>('/auth/login', { cpf: cpf.replace(/\D/g, ''), senha })
      salvarSessao(dados.token, dados.usuario)
      router.push(dados.usuario.papel === 'ADMIN' ? '/inicio-admin' : '/inicio')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'CPF ou senha inválidos')
      setCarregando(false)
    }
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
        <h1 className={styles.titulo}>Conecta</h1>
        <p className={styles.subtitulo}>Entre com seu CPF e senha</p>

        <form onSubmit={handleSubmit}>
          <div className={styles.campo}>
            <label htmlFor="cpf">CPF</label>
            <input
              type="text"
              id="cpf"
              inputMode="numeric"
              autoComplete="username"
              placeholder="000.000.000-00"
              value={cpf}
              maxLength={14}
              onChange={(e) => setCpf(mascararCpf(e.target.value))}
            />
          </div>

          <div className={styles.campo}>
            <label htmlFor="senha">Senha</label>
            <div className={styles.senhaLinha}>
              <input
                type={mostrarSenha ? 'text' : 'password'}
                id="senha"
                autoComplete="current-password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
              <button
                type="button"
                className={styles.mostrarSenha}
                aria-pressed={mostrarSenha}
                onClick={() => setMostrarSenha((v) => !v)}
              >
                {mostrarSenha ? 'Esconder senha' : 'Mostrar senha'}
              </button>
            </div>
          </div>

          {erro && (
            <p className={styles.erro} role="alert" aria-live="assertive">
              {erro}
            </p>
          )}

          <button className={styles.botao} disabled={carregando}>
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>

          <p className={styles.ajuda}>Esqueceu a senha? Fale com a coordenação.</p>
        </form>
      </div>
    </div>
  )
}
