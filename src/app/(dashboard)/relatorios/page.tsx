"use client";

import { useState, useEffect } from "react";
import { getMonthlyCashFlow } from "./actions";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function RelatoriosPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const loadReport = async () => {
    setLoading(true);
    try {
      const result = await getMonthlyCashFlow(selectedYear, selectedMonth);
      setData(result);
    } catch (e) {
      console.error(e);
      alert("Erro ao carregar relatório");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [selectedMonth, selectedYear]);

  const imprimirPDF = async () => {
    if (!data) return;

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
        
        // Adicionar logo centralizada no topo da página A4
        // Largura 24, Altura 24. A4 centro X = 105. Logo X = 105 - 12 = 93
        doc.addImage(base64Data, 'PNG', 93, 10, 24, 24);
        yPos = 42; // Move title below the logo
      }
    } catch (e) {
      console.error("Erro ao carregar logo:", e);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PAPELARIA DANI RIO - RELATÓRIO FINANCEIRO", 105, yPos, { align: 'center' });
    
    yPos += 7;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('pt-BR', { month: 'long' });
    doc.text(`Fluxo de Caixa - ${monthName.toUpperCase()} / ${selectedYear}`, 105, yPos, { align: 'center' });

    // Resumo
    yPos += 15;
    doc.setFontSize(11);
    doc.text(`Total Entradas: R$ ${data.totalEntradas.toFixed(2)}`, 15, yPos);
    yPos += 7;
    doc.text(`Total Saídas: R$ ${data.totalSaidas.toFixed(2)}`, 15, yPos);
    yPos += 7;
    doc.setFont("helvetica", "bold");
    doc.text(`Saldo Final: R$ ${data.saldoFinal.toFixed(2)}`, 15, yPos);

    yPos += 10;

    // Tabela
    const tableBody = data.flow.map((i: any) => [
      new Date(i.date).toLocaleString('pt-BR'),
      i.source,
      i.description,
      i.type,
      `R$ ${i.amount.toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Data/Hora', 'Origem', 'Descrição', 'Tipo', 'Valor']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [236, 72, 153] }, // Cor Rosa (--primary-color)
      columnStyles: { 
        3: { halign: 'center' },
        4: { halign: 'right' }
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 3) {
          if (data.cell.raw === 'SAÍDA') data.cell.styles.textColor = [220, 38, 38]; // Red
          if (data.cell.raw === 'ENTRADA') data.cell.styles.textColor = [22, 163, 74]; // Green
        }
      }
    });

    doc.save(`fluxo_de_caixa_${monthName}_${selectedYear}.pdf`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Relatórios Financeiros</h1>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select className="input-field" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}</option>
            ))}
          </select>
          <select className="input-field" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
          
          <button className="btn btn-primary" onClick={imprimirPDF} disabled={!data || data.flow.length === 0}>
            🖨️ Imprimir PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div>Carregando relatório...</div>
      ) : !data ? (
        <div>Nenhum dado encontrado.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Cards de Resumo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Entradas (Receitas)</p>
              <h2 style={{ fontSize: '1.5rem', color: 'var(--success-color)' }}>R$ {data.totalEntradas.toFixed(2)}</h2>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Saídas (Despesas)</p>
              <h2 style={{ fontSize: '1.5rem', color: 'var(--danger-color)' }}>R$ {data.totalSaidas.toFixed(2)}</h2>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', background: data.saldoFinal >= 0 ? 'var(--primary-color)' : 'var(--danger-color)', color: 'white' }}>
              <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>Saldo Líquido do Mês</p>
              <h2 style={{ fontSize: '2rem' }}>R$ {data.saldoFinal.toFixed(2)}</h2>
            </div>
          </div>

          {/* Tabela de Movimentações */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Extrato Detalhado</h3>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data/Hora</th>
                    <th>Origem</th>
                    <th>Descrição</th>
                    <th>Tipo</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {data.flow.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '1rem' }}>Nenhuma movimentação neste mês.</td></tr>
                  ) : (
                    data.flow.map((item: any, idx: number) => (
                      <tr key={item.id + idx}>
                        <td>{new Date(item.date).toLocaleString('pt-BR')}</td>
                        <td>{item.source}</td>
                        <td>{item.description}</td>
                        <td>
                          <span className={`badge ${item.type === 'SAÍDA' ? 'badge-danger' : 'badge-success'}`}>
                            {item.type}
                          </span>
                        </td>
                        <td style={{ color: item.type === 'SAÍDA' ? 'var(--danger-color)' : 'var(--success-color)' }}>
                          {item.type === 'SAÍDA' ? '-' : '+'} R$ {item.amount.toFixed(2)}
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
    </div>
  );
}
