import Image from 'next/image'
import styles from './Avatar.module.css'

type Props = {
  nome: string
  fotoUrl?: string | null
  tamanho?: number
}

function iniciais(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()
}

export default function Avatar({ nome, fotoUrl, tamanho = 40 }: Props) {
  const estilo = { width: tamanho, height: tamanho }

  if (fotoUrl) {
    return (
      <Image
        src={fotoUrl}
        alt=""
        width={tamanho}
        height={tamanho}
        unoptimized
        className={styles.avatar}
        style={estilo}
      />
    )
  }

  return (
    <span
      className={styles.semFoto}
      style={{ ...estilo, fontSize: tamanho * 0.4 }}
      aria-hidden="true"
    >
      {iniciais(nome)}
    </span>
  )
}
