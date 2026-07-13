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
  papel: 'ADMIN' | 'PROFESSOR' | 'ASSOCIADO'
  rg: string | null
  dataNascimento: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
}

function formatarData(data: string | null): string {
  if (!data) return '—'
  const d = new Date(data)
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${d.getUTCFullYear()}`
}

function montarEndereco(u: Usuario): string | null {
  const partes: string[] = []
  if (u.logradouro) {
    let linha = u.logradouro
    if (u.numero) linha += `, ${u.numero}`
    if (u.complemento) linha += ` — ${u.complemento}`
    partes.push(linha)
  }
  if (u.bairro) partes.push(u.bairro)
  if (u.cidade || u.uf) partes.push([u.cidade, u.uf].filter(Boolean).join('/'))
  if (u.cep) partes.push(`CEP ${u.cep}`)
  return partes.length > 0 ? partes.join(', ') : null
}

export default function PerfilPage() {
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

  const endereco = montarEndereco(usuario)

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
          <div className={styles.campo}>
            <dt>Email</dt>
            <dd>{usuario.email || '—'}</dd>
          </div>
          <div className={styles.campo}>
            <dt>RG</dt>
            <dd>{usuario.rg || '—'}</dd>
          </div>
          <div className={styles.campo}>
            <dt>Data de nascimento</dt>
            <dd>{formatarData(usuario.dataNascimento)}</dd>
          </div>
          <div className={`${styles.campo} ${styles.campoLargo}`}>
            <dt>Endereço</dt>
            <dd>{endereco || '—'}</dd>
          </div>
        </dl>
      </div>

      <button className={styles.sair} onClick={sair}>
        Sair
      </button>
    </div>
  )
}
