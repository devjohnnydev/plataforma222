import React, { Component, useEffect } from 'react';
import { DataProvider, useData } from './DataContext';
import Login from './Login';
import DashboardAdmin from './DashboardAdmin';
import DashboardSuperAdmin from './DashboardSuperAdmin';
import DashboardStudent from './DashboardStudent';

// Error Boundary to catch the "sume a tela" issue
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("CRASH DETECTADO:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: 'white', background: '#991b1b', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <h1>🛑 OPA! Aconteceu um erro.</h1>
          <p style={{ margin: '1rem 0' }}>O sistema travou por causa de um erro técnico.</p>
          <pre style={{ background: 'rgba(0,0,0,0.5)', padding: '1rem', borderRadius: '8px', maxWidth: '90%', overflow: 'auto' }}>
            {this.state.error?.toString()}
          </pre>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="btn" style={{ marginTop: '2rem', background: 'white', color: 'black' }}>
            Limpar tudo e Reiniciar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppContent = () => {
  const { user, loading, logout } = useData();

  useEffect(() => {
    console.log('[DEBUG] AppContent Render:', { user: user?.username, loading });
  }, [user, loading]);

  if (loading && !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', color: 'white' }}>
        <div className="loader-spin" style={{ width: '50px', height: '50px', border: '5px solid rgba(255,255,255,0.1)', borderTop: '5px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <h2 style={{ marginTop: '1.5rem' }}>Carregando a Guilda...</h2>
      </div>
    );
  }

  if (!user) {
    console.log('[DEBUG] Rendering Login');
    return <Login />;
  }

  if (!user.role) {
    console.warn('[DEBUG] User without role detected');
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '10rem', color: 'white' }}>
        <h1>Erro de Perfil</h1>
        <p>Dados de login inválidos.</p>
        <button onClick={logout} className="btn btn-primary" style={{ margin: '1rem auto' }}>Resetar e Sair</button>
      </div>
    );
  }

  console.log('[DEBUG] Rendering Dashboard for role:', user.role);
  if (user.role === 'ADMIN') return <DashboardSuperAdmin />;
  if (user.role === 'PROFESSOR') return <DashboardAdmin />;
  return <DashboardStudent />;
};

function App() {
  return (
    <ErrorBoundary>
      <DataProvider>
        <AppContent />
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          .loader-spin { animation: spin 1s linear infinite; }
        `}</style>
      </DataProvider>
    </ErrorBoundary>
  );
}

export default App;
