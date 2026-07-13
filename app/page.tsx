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

    router.replace(usuario.papel === 'ADMIN' ? '/inicio-admin' : '/inicio')
  }, [router])

  return null
}
