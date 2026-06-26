import Link from 'next/link'
import styles from './home.module.css'

export default function HomePage() {
  return (
    <div className={styles.pagina}>
      <h1 className={styles.titulo}>Conecta — Início</h1>

      <ul className={styles.lista}>
        <li className={styles.item}>
          <Link href="/turmas" className={styles.link}>
            Turmas
          </Link>
        </li>
        <li className={styles.item}>
          <Link href="/alunas" className={styles.link}>
            Alunas
          </Link>
        </li>
        <li className={styles.item}>
          <Link href="/alunas/nova" className={styles.link}>
            Cadastrar aluna
          </Link>
        </li>
        <li className={styles.item}>
          <Link href="/pagamentos" className={styles.link}>
            Pagamentos
          </Link>
        </li>
        <li className={styles.item}>
          <Link href="/login" className={styles.link}>
            Login
          </Link>
        </li>
      </ul>
    </div>
  )
}
