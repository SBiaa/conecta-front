import Image from 'next/image'
import styles from '../(auth)/login/login.module.css'

// Pra onde vai quem entrou pelo link da viagem quando o acesso acaba (a
// viagem terminou ou a coordenação trocou o link).
export default function AcessoViagemEncerradoPage() {
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
        <h1 className={styles.titulo}>Acesso à viagem</h1>
        <p className={styles.subtitulo}>
          Seu acesso pelo link terminou. Abra de novo o link que a coordenação mandou no grupo da viagem.
        </p>
        <p className={styles.ajuda}>Se o link não funcionar, fale com a coordenação.</p>
      </div>
    </div>
  )
}
