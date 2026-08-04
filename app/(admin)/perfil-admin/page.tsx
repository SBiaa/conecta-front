'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiGet } from '../../lib/api'
import { logout } from '../../lib/auth'
import styles from './perfil.module.css'

type Usuario = {
  nome: string
  cpf: string
  email: string | null
  telefone: string | null
}

export default function PerfilAdminPage() {
  const router = useRouter()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    apiGet<Usuario>('/me')
      .then(setUsuario)
      .catch(() => setErro('Não foi possível carregar seu perfil.'))
  }, [])

  function sair() {
    logout()
    router.replace('/login')
  }

  if (erro) {
    return (
      <div className={styles.pagina}>
        <h1 className={styles.titulo}>Perfil</h1>
        <p className={styles.mensagemErro}>{erro}</p>
      </div>
    )
  }

  if (!usuario) {
    return (
      <div className={styles.pagina}>
        <h1 className={styles.titulo}>Perfil</h1>
        <p className={styles.mensagem}>Carregando...</p>
      </div>
    )
  }

  return (
    <div className={styles.pagina}>
      <h1 className={styles.titulo}>{usuario.nome}</h1>

      <div className={styles.card}>
        <dl className={styles.grade}>
          <div className={styles.campo}>
            <dt>CPF</dt>
            <dd>{usuario.cpf}</dd>
          </div>
          <div className={styles.campo}>
            <dt>Telefone</dt>
            <dd>{usuario.telefone || '—'}</dd>
          </div>
          <div className={`${styles.campo} ${styles.campoLargo}`}>
            <dt>Email</dt>
            <dd>{usuario.email || '—'}</dd>
          </div>
        </dl>
      </div>

      <button className={styles.sair} onClick={sair}>
        Sair
      </button>
    </div>
  )
}
