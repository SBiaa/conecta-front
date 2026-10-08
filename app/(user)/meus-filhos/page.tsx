'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiGet } from '../../lib/api'
import { labelNivel, type NivelNatacao } from '../../lib/natacao'
import Avatar from '../../components/Avatar'
import styles from './meus-filhos.module.css'

type Dependente = {
  id: string
  nome: string
  fotoUrl: string | null
  projetos: string[]
  nivelNatacao: NivelNatacao | null
}

export default function MeusFilhosPage() {
  const [dependentes, setDependentes] = useState<Dependente[] | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    apiGet<Dependente[]>('/me/dependentes')
      .then(setDependentes)
      .catch(() => setErro('Não foi possível carregar seus filhos.'))
  }, [])

  return (
    <div className={styles.pagina}>
      <h1 className={styles.titulo}>Meus filhos</h1>

      {erro && <p className={styles.mensagemErro}>{erro}</p>}
      {!erro && dependentes === null && <p className={styles.mensagem}>Carregando...</p>}
      {dependentes !== null && dependentes.length === 0 && (
        <p className={styles.mensagem}>Nenhum filho cadastrado no seu nome.</p>
      )}

      {dependentes !== null && dependentes.length > 0 && (
        <ul className={styles.lista}>
          {dependentes.map((d) => (
            <li key={d.id}>
              <Link href={`/meus-filhos/${d.id}`} className={styles.card}>
                <Avatar nome={d.nome} fotoUrl={d.fotoUrl} tamanho={52} />
                <div className={styles.info}>
                  <span className={styles.nome}>{d.nome}</span>
                  {d.projetos.length > 0 && <span className={styles.detalhe}>{d.projetos.join(', ')}</span>}
                </div>
                {d.nivelNatacao && <span className={styles.nivel}>{labelNivel(d.nivelNatacao)}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
