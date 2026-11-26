// "Error boundary" (limite de erro): se algo dentro dele quebrar ao desenhar a tela, só aquele
// pedaço mostra um aviso — o resto continua funcionando. Sem isso, um erro deixaria a página
// inteira em branco (D45). No React, isso precisa ser uma classe.
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  titulo?: string
}

interface Estado {
  erro: Error | null
}

export class LimiteDeErro extends Component<Props, Estado> {
  state: Estado = { erro: null }

  static getDerivedStateFromError(erro: Error): Estado {
    return { erro }
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error('Erro ao desenhar a seção:', erro, info.componentStack)
  }

  render() {
    if (!this.state.erro) return this.props.children
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        <p className="font-medium">{this.props.titulo ?? 'Esta parte da tela não pôde ser exibida.'}</p>
        <p className="mt-1 text-red-800">{this.state.erro.message}</p>
        <button
          type="button"
          onClick={() => this.setState({ erro: null })}
          className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1 text-red-900 hover:bg-red-100"
        >
          Tentar de novo
        </button>
      </div>
    )
  }
}
