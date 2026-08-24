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

export default function LoginPage() {
  const [cpf, setCpf] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const router = useRouter()

  async function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro('')
    setCarregando(true)

    try {
      const dados = await apiPost<RespostaLogin>('/auth/login', { cpf, senha })
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
              onChange={(e) => setCpf(e.target.value)}
            />
          </div>

          <div className={styles.campo}>
            <label htmlFor="senha">Senha</label>
            <input
              type="password"
              id="senha"
              autoComplete="current-password"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>

          {erro && (
            <p className={styles.erro} role="alert" aria-live="assertive">
              {erro}
            </p>
          )}

          <button className={styles.botao} disabled={carregando}>
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
