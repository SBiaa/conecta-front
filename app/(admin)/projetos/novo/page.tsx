'use client'

import { useState } from 'react'
import { apiPost } from '../../../lib/api'
import styles from './novo.module.css'

export default function NovoProjetoPage() {
  const [nome, setNome] = useState('')
  const [erroValidacao, setErroValidacao] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  async function onSubmit(evento: React.FormEvent) {
    evento.preventDefault()

    setSucesso(false)
    setErro('')

    if (nome.trim() === '') {
      setErroValidacao('Informe o nome do projeto')
      return
    }

    setErroValidacao('')
    setEnviando(true)
    try {
      await apiPost('/projetos', { nome: nome.trim() })
      setSucesso(true)
      setNome('')
    } catch {
      setErro('Não foi possível criar o projeto')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className={styles.pagina}>
      <div className={styles.card}>
        <h1 className={styles.titulo}>Novo projeto</h1>

        <form onSubmit={onSubmit}>
          <div className={styles.campo}>
            <label htmlFor="nome">Nome</label>
            <input
              type="text"
              id="nome"
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
            />
            {erroValidacao && <span className={styles.erro}>{erroValidacao}</span>}
          </div>

          <button className={styles.botao} disabled={enviando}>
            {enviando ? 'Enviando...' : 'Cadastrar'}
          </button>
        </form>

        {sucesso && <p className={styles.sucesso}>Projeto criado!</p>}
        {erro && <p className={styles.mensagemErro}>{erro}</p>}
      </div>
    </div>
  )
}
