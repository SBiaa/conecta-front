'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiGet, apiPatch } from '../../../../lib/api'
import styles from './editar.module.css'

type Projeto = {
  id: number
  nome: string
  ativo: boolean
}

export default function EditarProjetoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [nome, setNome] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [carregando, setCarregando] = useState(true)
  const [erroValidacao, setErroValidacao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    apiGet<Projeto[]>('/projetos')
      .then((projetos) => {
        const projeto = projetos.find((item) => String(item.id) === id)
        if (projeto) {
          setNome(projeto.nome)
          setAtivo(projeto.ativo)
        } else {
          setErro('Projeto não encontrado')
        }
      })
      .catch(() => setErro('Não foi possível carregar o projeto'))
      .finally(() => setCarregando(false))
  }, [id])

  async function onSubmit(evento: FormEvent) {
    evento.preventDefault()
    setErro('')

    if (nome.trim() === '') {
      setErroValidacao('Informe o nome do projeto')
      return
    }
    setErroValidacao('')

    setSalvando(true)
    try {
      await apiPatch(`/projetos/${id}`, { nome: nome.trim(), ativo })
      router.push(`/projetos/${id}/turmas`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar o projeto')
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <div className={styles.pagina}>
        <div className={styles.card}>
          <p className={styles.mensagem}>Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.pagina}>
      <div className={styles.card}>
        <h1 className={styles.titulo}>Editar projeto</h1>

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

          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={ativo}
              onChange={(evento) => setAtivo(evento.target.checked)}
            />
            <span>Projeto ativo</span>
          </label>

          <div className={styles.acoes}>
            <Link href={`/projetos/${id}/turmas`} className={styles.botaoCancelar}>
              Cancelar
            </Link>
            <button className={styles.botao} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>

        {erro && <p className={styles.mensagemErro}>{erro}</p>}
      </div>
    </div>
  )
}
