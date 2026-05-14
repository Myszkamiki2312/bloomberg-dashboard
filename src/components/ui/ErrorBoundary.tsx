'use client'
import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  label?: string
}

interface State {
  hasError: boolean
  message: string
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error(`[ErrorBoundary] ${this.props.label ?? 'panel'}:`, error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 p-4 bg-[#080808]">
        <span className="text-[#ff0040] text-lg">⚠</span>
        <span className="text-[#ff0040] text-[11px] font-bold">
          BŁĄD PANELU{this.props.label ? `: ${this.props.label.toUpperCase()}` : ''}
        </span>
        {this.state.message && (
          <span className="text-[#555] text-[9px] text-center max-w-[200px] break-words font-mono">
            {this.state.message}
          </span>
        )}
        <button
          onClick={() => this.setState({ hasError: false, message: '' })}
          className="mt-1 border border-[#333] text-[#666] px-3 py-0.5 text-[10px] hover:border-[#ff0040] hover:text-[#ff0040] transition-colors"
        >
          ↺ Odśwież panel
        </button>
      </div>
    )
  }
}
