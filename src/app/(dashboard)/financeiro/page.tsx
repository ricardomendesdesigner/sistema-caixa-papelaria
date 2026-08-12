"use client";

import { useState, useEffect } from "react";
import { 
  getTransactions, getReceivables, getPayables, receiveAccount, payAccount, savePayable, getSuppliersForSelect 
} from "./actions";

type Tab = 'CAIXA' | 'RECEBER' | 'PAGAR';

export default function Financeiro() {
  const [activeTab, setActiveTab] = useState<Tab>('CAIXA');
  
  const [transactions, setTransactions] = useState<any[]>([]);
  const [receivables, setReceivables] = useState<any[]>([]);
  const [payables, setPayables] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // Modal de Contas a Pagar
  const [isPayableModalOpen, setIsPayableModalOpen] = useState(false);
  const [payableForm, setPayableForm] = useState({ description: '', amount: '', dueDate: '', supplierId: '' });

  useEffect(() => {
    loadData();
    getSuppliersForSelect().then(setSuppliers);
  }, []);

  const loadData = async () => {
    getTransactions().then(setTransactions);
    getReceivables().then(setReceivables);
    getPayables().then(setPayables);
  };

  const handleReceive = async (id: string) => {
    if (confirm("Confirmar o recebimento desta conta? (O valor entrará no caixa)")) {
      await receiveAccount(id);
      loadData();
    }
  };

  const handlePay = async (id: string) => {
    if (confirm("Confirmar o pagamento desta conta? (O valor sairá do caixa)")) {
      await payAccount(id);
      loadData();
    }
  };

  const handleSavePayable = async () => {
    if (!payableForm.description || !payableForm.amount || !payableForm.dueDate) {
      alert("Preencha a descrição, valor e data de vencimento.");
      return;
    }
    await savePayable({
      description: payableForm.description,
      amount: Number(payableForm.amount),
      dueDate: new Date(payableForm.dueDate),
      supplierId: payableForm.supplierId || null
    });
    setIsPayableModalOpen(false);
    setPayableForm({ description: '', amount: '', dueDate: '', supplierId: '' });
    loadData();
  };

  // Balanço de Caixa
  const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header">
        <h1 className="page-title">Financeiro</h1>
      </div>

      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <button className={`btn ${activeTab === 'CAIXA' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('CAIXA')}>
          Fluxo de Caixa
        </button>
        <button className={`btn ${activeTab === 'RECEBER' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('RECEBER')}>
          Contas a Receber
        </button>
        <button className={`btn ${activeTab === 'PAGAR' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('PAGAR')}>
          Contas a Pagar
        </button>
      </div>

      {activeTab === 'CAIXA' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <h3>Entradas</h3>
              <p style={{ fontSize: '2rem', color: '#10b981', fontWeight: 'bold' }}>R$ {totalIncome.toFixed(2)}</p>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <h3>Saídas</h3>
              <p style={{ fontSize: '2rem', color: '#ef4444', fontWeight: 'bold' }}>R$ {totalExpense.toFixed(2)}</p>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', background: balance >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
              <h3>Saldo Total</h3>
              <p style={{ fontSize: '2rem', color: balance >= 0 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>R$ {balance.toFixed(2)}</p>
            </div>
          </div>
          
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2>Histórico de Transações</h2>
            <div className="table-container" style={{ marginTop: '1rem' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Operador</th>
                    <th>Tipo</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr><td colSpan={5} style={{textAlign: 'center'}}>Nenhuma transação registrada.</td></tr>
                  ) : (
                    transactions.map(t => (
                      <tr key={t.id}>
                        <td>{new Date(t.createdAt).toLocaleString()}</td>
                        <td>{t.description}</td>
                        <td>{t.user?.name}</td>
                        <td>
                          <span className={`badge ${t.type === 'INCOME' ? 'badge-success' : 'badge-danger'}`}>
                            {t.type === 'INCOME' ? 'Entrada' : 'Saída'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 'bold', color: t.type === 'INCOME' ? '#10b981' : '#ef4444' }}>
                          {t.type === 'INCOME' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'RECEBER' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2>Contas a Receber (Vendas Fiado)</h2>
          <div className="table-container" style={{ marginTop: '1rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vencimento</th>
                  <th>Descrição</th>
                  <th>Cliente</th>
                  <th>Status</th>
                  <th>Valor</th>
                  <th style={{ textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {receivables.length === 0 ? (
                  <tr><td colSpan={6} style={{textAlign: 'center'}}>Nenhuma conta a receber pendente.</td></tr>
                ) : (
                  receivables.map(r => (
                    <tr key={r.id}>
                      <td>{new Date(r.dueDate).toLocaleDateString()}</td>
                      <td>{r.description}</td>
                      <td>{r.customer?.name || 'Não informado'}</td>
                      <td>
                        <span className={`badge ${r.status === 'RECEIVED' ? 'badge-success' : 'badge-primary'}`}>
                          {r.status === 'RECEIVED' ? 'Recebido' : 'Pendente'}
                        </span>
                      </td>
                      <td>R$ {r.amount.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {r.status === 'PENDING' && (
                          <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleReceive(r.id)}>
                            Confirmar Pagamento
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'PAGAR' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Contas a Pagar</h2>
            <button className="btn btn-primary" onClick={() => setIsPayableModalOpen(true)}>+ Nova Conta</button>
          </div>
          <div className="table-container" style={{ marginTop: '1rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vencimento</th>
                  <th>Descrição</th>
                  <th>Fornecedor</th>
                  <th>Status</th>
                  <th>Valor</th>
                  <th style={{ textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {payables.length === 0 ? (
                  <tr><td colSpan={6} style={{textAlign: 'center'}}>Nenhuma conta a pagar registrada.</td></tr>
                ) : (
                  payables.map(p => (
                    <tr key={p.id}>
                      <td>{new Date(p.dueDate).toLocaleDateString()}</td>
                      <td>{p.description}</td>
                      <td>{p.supplier?.name || 'Não informado'}</td>
                      <td>
                        <span className={`badge ${p.status === 'PAID' ? 'badge-success' : 'badge-danger'}`}>
                          {p.status === 'PAID' ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                      <td>R$ {p.amount.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {p.status === 'PENDING' && (
                          <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handlePay(p.id)}>
                            Pagar (Baixar no Caixa)
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isPayableModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(5px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem', background: 'var(--bg-primary)' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Nova Conta a Pagar</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">Descrição</label>
                <input type="text" className="input-field" value={payableForm.description} onChange={e => setPayableForm({...payableForm, description: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">Fornecedor (Opcional)</label>
                <select className="input-field" value={payableForm.supplierId} onChange={e => setPayableForm({...payableForm, supplierId: e.target.value})}>
                  <option value="">Selecione...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label">Valor (R$)</label>
                  <input type="number" step="0.01" className="input-field" value={payableForm.amount} onChange={e => setPayableForm({...payableForm, amount: e.target.value})} />
                </div>
                <div className="input-group">
                  <label className="input-label">Data de Vencimento</label>
                  <input type="date" className="input-field" value={payableForm.dueDate} onChange={e => setPayableForm({...payableForm, dueDate: e.target.value})} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsPayableModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSavePayable}>
                Salvar Conta
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
