import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '24px', textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
          <h1 style={{ fontSize: '20px', marginBottom: '8px' }}>Something went wrong</h1>
          <p style={{ color: '#888', fontSize: '14px', marginBottom: '16px' }}>
            {this.state.error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 24px',
              fontSize: '14px',
              borderRadius: '8px',
              border: '1px solid #ccc',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
