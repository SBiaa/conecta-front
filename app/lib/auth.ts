export function salvarSessao(token: string, usuario: object) {
  localStorage.setItem('token', token)                      
  localStorage.setItem('usuario', JSON.stringify(usuario)) 
}

export function getToken() {
return localStorage.getItem('token')
}

export function getUsuario() {
  const dados = localStorage.getItem('usuario')  
  if (!dados) return null                         
  return JSON.parse(dados)     
}

export function logout() {
  localStorage.removeItem('token')    
  localStorage.removeItem('usuario')  
}