// Recorta a imagem num quadrado central e reduz para `tamanho`x`tamanho`,
// devolvendo um data URL JPEG. Feito no navegador pra não mandar pro servidor
// uma foto de câmera de vários MB só para guardar um avatar de 256px.
export function redimensionarImagem(arquivo: File, tamanho = 256, qualidade = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()

    leitor.onerror = () => reject(new Error('Não foi possível ler o arquivo'))
    leitor.onload = () => {
      const imagem = new Image()

      imagem.onerror = () => reject(new Error('Arquivo não é uma imagem válida'))
      imagem.onload = () => {
        const lado = Math.min(imagem.width, imagem.height)
        const origemX = (imagem.width - lado) / 2
        const origemY = (imagem.height - lado) / 2

        const canvas = document.createElement('canvas')
        canvas.width = tamanho
        canvas.height = tamanho

        const contexto = canvas.getContext('2d')
        if (!contexto) {
          reject(new Error('Não foi possível processar a imagem'))
          return
        }

        contexto.drawImage(imagem, origemX, origemY, lado, lado, 0, 0, tamanho, tamanho)
        resolve(canvas.toDataURL('image/jpeg', qualidade))
      }

      imagem.src = leitor.result as string
    }

    leitor.readAsDataURL(arquivo)
  })
}
