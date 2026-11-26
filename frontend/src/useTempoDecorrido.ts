import { useEffect, useState } from 'react'

/** Segundos desde que `ativo` virou true (volta a zero quando desliga). Usado nos esqueletos. */
export function useTempoDecorrido(ativo: boolean): number {
  const [segundos, setSegundos] = useState(0)
  useEffect(() => {
    if (!ativo) return
    const inicio = Date.now()
    const relogio = setInterval(() => setSegundos(Math.floor((Date.now() - inicio) / 1000)), 1000)
    return () => {
      clearInterval(relogio)
      setSegundos(0)
    }
  }, [ativo])
  return segundos
}
