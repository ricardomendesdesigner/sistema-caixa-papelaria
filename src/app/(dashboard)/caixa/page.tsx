"use client";

import { useState, useEffect } from "react";
import { getCurrentCashRegister, openCashRegister, closeCashRegister, addCashMovement } from "./actions";
import { getUsers } from "../funcionarios/actions";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function CaixaPage() {
  const [caixa, setCaixa] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);

  // Modals state
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  // Form states
  const [selectedUserId, setSelectedUserId] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");
  
  const [moveType, setMoveType] = useState<"SANGRIA" | "SUPRIMENTO">("SANGRIA");
  const [moveAmount, setMoveAmount] = useState("");
  const [moveDesc, setMoveDesc] = useState("");

  const [closingBalance, setClosingBalance] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [currentCaixa, userList] = await Promise.all([
        getCurrentCashRegister(),
        getUsers()
      ]);
      setCaixa(currentCaixa);
      setUsers(userList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpen = async () => {
    if (!selectedUserId || !openingBalance) return alert("Preencha os campos!");
    try {
      await openCashRegister(selectedUserId, Number(openingBalance));
      setShowOpenModal(false);
      setOpeningBalance("0");
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleMovement = async () => {
    if (!moveAmount || !moveDesc) return alert("Preencha o valor e descrição!");
    try {
      await addCashMovement(caixa.id, moveType, Number(moveAmount), moveDesc);
      setShowMoveModal(false);
      setMoveAmount("");
      setMoveDesc("");
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleClose = async () => {
    if (!closingBalance) return alert("Informe o valor final em caixa!");
    try {
      await closeCashRegister(caixa.id, Number(closingBalance));
      setShowCloseModal(false);
      setClosingBalance("");
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) return <div>Carregando caixa...</div>;

  // Cálculos do Caixa Aberto
  const calcTotals = () => {
    if (!caixa) return { totalVendas: 0, totalSangria: 0, totalSuprimento: 0, saldoEsperado: 0 };
    
    // Somar apenas vendas em dinheiro (CASH) para o saldo do caixa
    const totalVendas = caixa.sales
      .filter((s: any) => s.paymentMethod === "CASH")
      .reduce((acc: number, s: any) => acc + s.total, 0);

    const totalSangria = caixa.movements
      .filter((m: any) => m.type === "SANGRIA")
      .reduce((acc: number, m: any) => acc + m.amount, 0);

    const totalSuprimento = caixa.movements
      .filter((m: any) => m.type === "SUPRIMENTO")
      .reduce((acc: number, m: any) => acc + m.amount, 0);

    const saldoEsperado = caixa.openingBalance + totalVendas + totalSuprimento - totalSangria;

    return { totalVendas, totalSangria, totalSuprimento, saldoEsperado };
  };

  const { totalVendas, totalSangria, totalSuprimento, saldoEsperado } = calcTotals();

  const imprimirMovimento = async () => {
    if (!caixa) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let yPos = 15;

    try {
      const response = await fetch('/logo.png');
      if (response.ok) {
        const blob = await response.blob();
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        doc.addImage(base64Data, 'PNG', 93, 10, 24, 24);
        yPos = 42; 
      }
    } catch (e) {
      console.error("Erro logo:", e);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PAPELARIA DANI RIO - MOVIMENTO DO CAIXA", 105, yPos, { align: 'center' });
    
    yPos += 7;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Operador: ${caixa.user?.name || '-'} | Abertura: ${new Date(caixa.createdAt).toLocaleString()}`, 105, yPos, { align: 'center' });

    yPos += 15;
    
    // Resumo
    doc.setFontSize(11);
    doc.text(`Fundo de Caixa Inicial: R$ ${caixa.openingBalance.toFixed(2)}`, 15, yPos);
    yPos += 7;
    doc.text(`Total em Vendas (Dinheiro): R$ ${totalVendas.toFixed(2)}`, 15, yPos);
    yPos += 7;
    doc.text(`Total Suprimentos: R$ ${totalSuprimento.toFixed(2)}`, 15, yPos);
    yPos += 7;
    doc.text(`Total Sangrias: R$ ${totalSangria.toFixed(2)}`, 15, yPos);
    yPos += 7;
    doc.setFont("helvetica", "bold");
    doc.text(`SALDO ESPERADO EM DINHEIRO: R$ ${saldoEsperado.toFixed(2)}`, 15, yPos);

    yPos += 12;

    const flow: any[] = [];
    
    caixa.sales.filter((s: any) => s.paymentMethod === "CASH").forEach((s: any) => {
      flow.push({
        date: new Date(s.createdAt),
        type: 'VENDA',
        desc: `Venda #${s.id.slice(-6).toUpperCase()}`,
        amount: s.total
      });
    });

    caixa.movements.forEach((m: any) => {
      flow.push({
        date: new Date(m.createdAt),
        type: m.type,
        desc: m.description,
        amount: m.amount
      });
    });

    flow.sort((a, b) => a.date.getTime() - b.date.getTime());

    const tableBody = flow.map(f => [
      f.date.toLocaleString(),
      f.type,
      f.desc,
      `R$ ${f.amount.toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Data/Hora', 'Tipo', 'Descrição', 'Valor']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [236, 72, 153] },
      columnStyles: { 
        1: { halign: 'center' },
        3: { halign: 'right' }
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 1) {
          if (data.cell.raw === 'SANGRIA') data.cell.styles.textColor = [220, 38, 38]; 
          if (data.cell.raw === 'SUPRIMENTO' || data.cell.raw === 'VENDA') data.cell.styles.textColor = [22, 163, 74]; 
        }
      }
    });

    doc.save(`movimento_caixa_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 className="page-title">Controle de Caixa</h1>
        {caixa && (
          <button className="btn btn-primary" onClick={imprimirMovimento}>
            🖨️ Imprimir Movimento do Dia
          </button>
        )}
      </div>

      {!caixa ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '1rem' }}>Caixa Fechado</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Abra o caixa para iniciar as vendas no PDV.</p>
          <button className="btn btn-primary" onClick={() => setShowOpenModal(true)}>Abrir Caixa Agora</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Fundo de Caixa</p>
              <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>R$ {caixa.openingBalance.toFixed(2)}</h2>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Vendas (Dinheiro)</p>
              <h2 style={{ fontSize: '1.5rem', color: 'var(--success-color)' }}>+ R$ {totalVendas.toFixed(2)}</h2>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Suprimentos</p>
              <h2 style={{ fontSize: '1.5rem', color: 'var(--success-color)' }}>+ R$ {totalSuprimento.toFixed(2)}</h2>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Sangrias</p>
              <h2 style={{ fontSize: '1.5rem', color: 'var(--danger-color)' }}>- R$ {totalSangria.toFixed(2)}</h2>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--primary-color)', color: 'white' }}>
              <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>Saldo em Dinheiro</p>
              <h2 style={{ fontSize: '2rem' }}>R$ {saldoEsperado.toFixed(2)}</h2>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => { setMoveType("SUPRIMENTO"); setShowMoveModal(true); }}>+ Suprimento (Entrada)</button>
            <button className="btn btn-secondary" onClick={() => { setMoveType("SANGRIA"); setShowMoveModal(true); }}>- Sangria (Retirada)</button>
            <button className="btn btn-danger" style={{ marginLeft: 'auto' }} onClick={() => setShowCloseModal(true)}>Fechar Caixa</button>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Histórico de Movimentações (Caixa Aberto)</h3>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data/Hora</th>
                    <th>Tipo</th>
                    <th>Descrição</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {caixa.movements.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '1rem' }}>Nenhuma movimentação</td></tr>
                  ) : (
                    caixa.movements.map((m: any) => (
                      <tr key={m.id}>
                        <td>{new Date(m.createdAt).toLocaleString()}</td>
                        <td>
                          <span className={`badge ${m.type === 'SANGRIA' ? 'badge-danger' : 'badge-success'}`}>
                            {m.type}
                          </span>
                        </td>
                        <td>{m.description}</td>
                        <td style={{ color: m.type === 'SANGRIA' ? 'var(--danger-color)' : 'var(--success-color)' }}>
                          {m.type === 'SANGRIA' ? '-' : '+'} R$ {m.amount.toFixed(2)}
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

      {/* MODAL ABERTURA */}
      {showOpenModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '400px', background: 'white' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Abertura de Caixa</h2>
            
            <div className="input-group">
              <label className="input-label">Operador do Caixa</label>
              <select className="input-field" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
                <option value="">Selecione o operador...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Fundo de Troco Inicial (R$)</label>
              <input type="number" className="input-field" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowOpenModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleOpen}>Confirmar Abertura</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MOVIMENTAÇÃO */}
      {showMoveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '400px', background: 'white' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>{moveType === 'SANGRIA' ? 'Nova Sangria' : 'Novo Suprimento'}</h2>
            
            <div className="input-group">
              <label className="input-label">Descrição / Motivo</label>
              <input type="text" className="input-field" value={moveDesc} onChange={e => setMoveDesc(e.target.value)} placeholder="Ex: Sangria para depósito, Pagamento de fornecedor..." />
            </div>

            <div className="input-group">
              <label className="input-label">Valor (R$)</label>
              <input type="number" className="input-field" value={moveAmount} onChange={e => setMoveAmount(e.target.value)} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowMoveModal(false)}>Cancelar</button>
              <button className={`btn ${moveType === 'SANGRIA' ? 'btn-danger' : 'btn-primary'}`} onClick={handleMovement}>Confirmar {moveType}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FECHAMENTO */}
      {showCloseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '400px', background: 'white' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Fechamento de Caixa</h2>
            
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Saldo Esperado em Dinheiro</p>
              <h3 style={{ fontSize: '1.5rem' }}>R$ {saldoEsperado.toFixed(2)}</h3>
            </div>

            <div className="input-group">
              <label className="input-label">Valor Contado em Dinheiro (R$)</label>
              <input type="number" className="input-field" value={closingBalance} onChange={e => setClosingBalance(e.target.value)} />
            </div>

            {closingBalance && Number(closingBalance) !== saldoEsperado && (
              <p style={{ color: 'var(--danger-color)', fontSize: '0.875rem', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                Diferença de Caixa: R$ {(Number(closingBalance) - saldoEsperado).toFixed(2)}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowCloseModal(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleClose}>Confirmar Fechamento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
