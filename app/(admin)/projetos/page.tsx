'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiGet } from '../../lib/api'
import styles from './projetos.module.css'

type Projeto = {
  id: string
  nome: string
  ativo: boolean
  _count: {
    turmas: number
  }
}

export default function ProjetosPage() {
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    apiGet<Projeto[]>('/projetos')
      .then(setProjetos)
      .finally(() => setCarregando(false))
  }, [])

  return (
    <div className={styles.pagina}>
      <div className={styles.header}>
        <h1 className={styles.titulo}>Projetos</h1>
        <Link href="/projetos/novo" className={styles.botaoNovo}>
          Novo projeto
        </Link>
      </div>

      {carregando && <p className={styles.mensagem}>Carregando...</p>}

      {!carregando && projetos.length === 0 && (
        <p className={styles.mensagem}>Nenhum projeto cadastrado ainda</p>
      )}

      {!carregando && projetos.length > 0 && (
        <ul className={styles.lista}>
          {projetos.map((projeto) => (
            <li key={projeto.id} className={styles.item}>
              <div className={styles.info}>
                <span className={styles.nome}>{projeto.nome}</span>
                <span className={styles.contagem}>
                  {projeto._count.turmas} turma{projeto._count.turmas === 1 ? '' : 's'}
                </span>
              </div>
              <span
                className={`${styles.status} ${
                  projeto.ativo ? styles.statusAtivo : styles.statusInativo
                }`}
              >
                {projeto.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
