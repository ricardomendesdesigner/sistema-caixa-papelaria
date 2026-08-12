import { getCurrentCashRegister } from "@/app/(dashboard)/caixa/actions";

export default async function Header() {
  let caixa = null;
  try {
    caixa = await getCurrentCashRegister();
  } catch (error) {
    console.error("Erro ao buscar caixa no Header:", error);
  }
  
  const userName = caixa ? caixa.user.name : "Nenhum Operador";
  const statusCaixa = caixa ? "Caixa Aberto" : "Caixa Fechado";
  const initials = userName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <header className="mobile-header" style={{ 
      display: 'flex', 
      justifyContent: 'flex-end', 
      alignItems: 'center', 
      paddingBottom: '1.5rem',
      marginBottom: '2rem',
      borderBottom: '1px solid var(--border-light)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{userName}</p>
          <p style={{ fontSize: '0.75rem', color: caixa ? 'var(--success-color)' : 'var(--danger-color)' }}>{statusCaixa}</p>
        </div>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          borderRadius: 'var(--radius-full)', 
          background: caixa ? 'var(--primary-color)' : 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          boxShadow: 'var(--shadow-sm)'
        }}>
          {initials}
        </div>
      </div>
    </header>
  );
}
