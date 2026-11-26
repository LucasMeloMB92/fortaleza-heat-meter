// "Skeleton" (esqueleto): bloco cinza pulsando no lugar do gráfico/tabela enquanto carrega,
// com contador de segundos — alguns cálculos levam mais de 1 minuto na primeira vez (D45).
import { useTempoDecorrido } from '../useTempoDecorrido'

export function Esqueleto(props: { altura?: string; mensagem?: string; dica?: string }) {
  const segundos = useTempoDecorrido(true)
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={`flex animate-pulse flex-col items-center justify-center gap-1 rounded-lg bg-plano ${props.altura ?? 'h-80'}`}
    >
      <span className="text-sm font-medium text-tinta-2">
        {props.mensagem ?? 'Carregando…'}
        {segundos >= 2 && <span className="ml-1 tabular-nums text-tinta-3">{segundos} s</span>}
      </span>
      {props.dica && <span className="text-xs text-tinta-3">{props.dica}</span>}
    </div>
  )
}
