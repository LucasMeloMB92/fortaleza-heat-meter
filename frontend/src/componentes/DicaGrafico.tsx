// Tooltip (dica ao passar o mouse) usado em todos os gráficos: data em DD-MM-AAAA e valores
// em °C com vírgula. Faixas (intervalo de 95%) chegam como [inferior, superior].
import { formatarData, formatarGraus } from '../formatacao'

interface ItemDica {
  name?: string | number
  value?: unknown
  color?: string
}

export function DicaGrafico(props: {
  active?: boolean
  payload?: readonly ItemDica[]
  label?: string | number
}) {
  if (!props.active || !props.payload?.length) return null
  const itens = props.payload.filter((item) => item.value != null)
  return (
    <div className="rounded-md border border-borda bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold">{formatarData(String(props.label))}</p>
      {itens.map((item) => (
        <p key={String(item.name)} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: item.color }} />
          <span className="text-tinta-2">{item.name}:</span>
          <span className="font-medium tabular-nums">{formatarValor(item.value)}</span>
        </p>
      ))}
    </div>
  )
}

function formatarValor(valor: unknown): string {
  if (Array.isArray(valor)) return `${formatarGraus(valor[0])} a ${formatarGraus(valor[1])}`
  return typeof valor === 'number' ? formatarGraus(valor) : String(valor)
}
