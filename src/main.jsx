import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('ZAIN failed to render:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <main style={{ minHeight: '100vh', background: '#0b0d12', color: '#eceef5', fontFamily: 'system-ui, sans-serif', padding: '32px 22px' }}>
          <h1 style={{ color: '#a89aff' }}>ZAIN Code AI</h1>
          <h2>App startup error</h2>
          <p>ZAIN loaded, but a browser-side error stopped the interface from rendering.</p>
          <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', background: '#171a23', padding: '14px', borderRadius: '10px', color: '#ffb4b4' }}>{String(this.state.error?.message || this.state.error)}</pre>
          <p>Refresh this page. If the problem continues, share a screenshot of this error.</p>
        </main>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <AppErrorBoundary><App /></AppErrorBoundary>
    </React.StrictMode>
  );
}
