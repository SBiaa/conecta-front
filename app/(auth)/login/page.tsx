'use client'  // esta tela roda no navegador (reage a clique/digitação)

import { useState } from 'react'
import { useRouter } from 'next/navigation'  // pra redirecionar depois do login
import { salvarSessao } from '../../lib/auth'  // o helper que VOCÊ fez
import styles from './login.module.css'

export default function LoginPage() {
  // "memória" dos campos: cada um guarda o que foi digitado
  const [cpf, setCpf] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')      // mensagem de erro pra mostrar
  const [carregando, setCarregando] = useState(false)  // trava o botão enquanto envia

  const router = useRouter()  // ferramenta de redirecionamento

  // função que roda quando o formulário é enviado
  async function handleSubmit(evento) {
    evento.preventDefault()  // impede a página de recarregar (comportamento padrão do form)
    setErro('')              // limpa erro anterior
    setCarregando(true)      // trava o botão

    try {
      // 1. chama a API de login, mandando cpf e senha
      const resposta = await fetch('http://localhost:3001/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf, senha }),  // dobra o objeto em texto
      })

      // 2. se a resposta não foi ok (ex: 401 senha errada), mostra erro
      if (!resposta.ok) {
        setErro('CPF ou senha inválidos')
        setCarregando(false)
        return  // para aqui, não continua
      }

      // 3. desdobra a resposta (vem { token, usuario })
      const dados = await resposta.json()

      // 4. guarda a sessão usando o SEU auth.ts
      salvarSessao(dados.token, dados.usuario)

      // 5. redireciona conforme o papel
      if (dados.usuario.papel === 'ADMIN') {
        router.push('/inicio-admin')
      } else {
        router.push('/inicio')  // ASSOCIADO e PROFESSOR
      }
    } catch {
      // se a API nem respondeu (servidor caído, etc.)
      setErro('Não foi possível conectar. Tente novamente.')
      setCarregando(false)
    }
  }

  return (
    <div className={styles.pagina}>
      <div className={styles.card}>
        <h1 className={styles.titulo}>Conecta</h1>

        {/* onSubmit liga o form à função acima */}
        <form onSubmit={handleSubmit}>
          <div className={styles.campo}>
            <label htmlFor="cpf">CPF</label>
            <input
              type="text"
              id="cpf"
              placeholder="000.000.000-00"
              value={cpf}                              // mostra o valor guardado
              onChange={(e) => setCpf(e.target.value)} // atualiza a cada tecla
            />
          </div>

          <div className={styles.campo}>
            <label htmlFor="senha">Senha</label>
            <input
              type="password"
              id="senha"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>

          {/* só aparece se houver erro */}
          {erro && <p className={styles.erro}>{erro}</p>}

          <button className={styles.botao} disabled={carregando}>
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}