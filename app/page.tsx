'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUsuario } from './lib/auth'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const usuario = getUsuario()

    if (!usuario) {
      router.replace('/login')
      return
    }

    if (usuario.papel === 'CONVIDADO') {
      router.replace(`/viagem/${usuario.viagemId}`)
      return
    }
    router.replace(usuario.papel === 'ADMIN' ? '/inicio-admin' : '/inicio')
  }, [router])

  return null
}
