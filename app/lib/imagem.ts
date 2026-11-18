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

// Reduz uma foto de câmera (que costuma ter 4000px e vários MB) pra no máximo
// `ladoMaximo` no lado maior, mantendo a proporção. Devolve um arquivo JPEG
// pronto pra enviar. Fotos que o navegador não consegue abrir (ex.: HEIC no
// Chrome do Windows) voltam como estão — o envio continua, só sem reduzir.
export function reduzirFoto(arquivo: File, ladoMaximo = 1920, qualidade = 0.85): Promise<File> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(arquivo)
    const imagem = new Image()

    imagem.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(arquivo)
    }
    imagem.onload = () => {
      URL.revokeObjectURL(url)
      const escala = Math.min(1, ladoMaximo / Math.max(imagem.width, imagem.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(imagem.width * escala)
      canvas.height = Math.round(imagem.height * escala)

      const contexto = canvas.getContext('2d')
      if (!contexto) {
        resolve(arquivo)
        return
      }
      contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= arquivo.size) {
            resolve(arquivo)
            return
          }
          const nome = arquivo.name.replace(/\.[^.]+$/, '') + '.jpg'
          resolve(new File([blob], nome, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        qualidade,
      )
    }

    imagem.src = url
  })
}
