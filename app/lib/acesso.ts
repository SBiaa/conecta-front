export type AcessoGerado = {
  nome: string
  cpf: string
  senha: string
  telefone?: string | null
}

export function montarMensagemAcesso(acesso: AcessoGerado, introducao?: string) {
  const intro = introducao ?? `Olá, ${acesso.nome}! Seu cadastro na Conecta foi feito com sucesso.`
  const link = typeof window !== 'undefined' ? `${window.location.origin}/login` : ''
  return [
    intro,
    '',
    'Acesse com:',
    `CPF: ${acesso.cpf}`,
    `Senha: ${acesso.senha}`,
    ...(link ? ['', `Link de acesso: ${link}`] : []),
    '',
    'Qualquer dúvida, é só chamar!',
  ].join('\n')
}

export function montarLinkWhatsapp(acesso: AcessoGerado, introducao?: string) {
  const digitos = (acesso.telefone ?? '').replace(/\D/g, '')
  const numero = digitos ? (digitos.startsWith('55') ? digitos : `55${digitos}`) : ''
  return `https://wa.me/${numero}?text=${encodeURIComponent(montarMensagemAcesso(acesso, introducao))}`
}
