import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  panelName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Error boundary caught an error in ${this.props.panelName || 'Panel'}:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-[#0F1114] border border-rose-900/50 rounded-2xl text-rose-300 text-xs font-code space-y-2">
          <p className="font-semibold text-rose-400">⚠️ Error in {this.props.panelName || 'Panel'}</p>
          <p>{this.state.error?.message || 'An unexpected error occurred in this component.'}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="px-3 py-1 bg-rose-950 hover:bg-rose-900 text-rose-200 rounded border border-rose-800 transition-colors"
          >
            Retry Panel
          </button>
        </div>
      );
    }

    return this.renderChildren();
  }

  private renderChildren() {
    return this.props.children;
  }
}
