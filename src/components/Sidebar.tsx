import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src="/logo.png" 
          alt="Papelaria Dani Rio" 
          style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', marginBottom: '0.5rem' }} 
        />
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-color)' }}>
          Papelaria Dani Rio
        </h1>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Sistema de Gestão</p>
      </div>
      
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        <Link href="/" className="sidebar-link">
          📊 Dashboard
        </Link>
        <Link href="/pdv" className="sidebar-link">
          🛒 Frente de Caixa (PDV)
        </Link>
        <Link href="/caixa" className="sidebar-link">
          💵 Caixa
        </Link>
        <Link href="/relatorios" className="sidebar-link">
          📊 Relatórios
        </Link>
        <Link href="/produtos" className="sidebar-link">
          📦 Produtos
        </Link>
        <Link href="/clientes" className="sidebar-link">
          👥 Clientes
        </Link>
        <Link href="/fornecedores" className="sidebar-link">
          🏭 Fornecedores
        </Link>
        <Link href="/funcionarios" className="sidebar-link">
          👤 Funcionários
        </Link>
        <Link href="/vendas" className="sidebar-link">
          📋 Vendas
        </Link>
        <Link href="/financeiro" className="sidebar-link">
          💰 Financeiro
        </Link>
      </nav>

      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
        <Link href="/login" className="sidebar-link" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger-color)' }}>
          🚪 Sair
        </Link>
      </div>
      
      <style>{`
        .sidebar-link {
          padding: 0.65rem 1rem;
          border-radius: var(--radius-md);
          font-weight: 500;
          font-size: 0.9rem;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
        }
        .sidebar-link:hover {
          background: rgba(236, 72, 153, 0.1);
          color: var(--primary-color);
        }
      `}</style>
    </aside>
  );
}
