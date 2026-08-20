import { redirect } from 'next/navigation'

// A tela de frequência virou parte do Meu Progresso. Mantido só pra não quebrar
// link salvo ou aba aberta de quem já usava a rota antiga.
export default function MinhaFrequenciaPage() {
  redirect('/meu-progresso')
}
