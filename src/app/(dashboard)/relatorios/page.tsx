"use client";

import { useState, useEffect } from "react";
import { getCashFlow } from "./actions";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function RelatoriosPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [reportType, setReportType] = useState<"MONTH" | "DAY">("MONTH");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const loadReport = async () => {
    setLoading(true);
    try {
      let result;
      if (reportType === "MONTH") {
        result = await getCashFlow(selectedYear, selectedMonth);
      } else {
        const [y, m, d] = selectedDate.split("-");
        result = await getCashFlow(Number(y), Number(m), Number(d));
      }
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
  }, [reportType, selectedMonth, selectedYear, selectedDate]);

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
        
        doc.addImage(base64Data, 'PNG', 93, 10, 24, 24);
        yPos = 42; 
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
    
    let reportTitle = "";
    let fileName = "";
    if (reportType === "MONTH") {
      const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('pt-BR', { month: 'long' });
      reportTitle = `Fluxo de Caixa - ${monthName.toUpperCase()} / ${selectedYear}`;
      fileName = `fluxo_de_caixa_${monthName}_${selectedYear}.pdf`;
    } else {
      const [y, m, d] = selectedDate.split("-");
      reportTitle = `Fluxo de Caixa Diário - ${d}/${m}/${y}`;
      fileName = `fluxo_de_caixa_${d}_${m}_${y}.pdf`;
    }

    doc.text(reportTitle, 105, yPos, { align: 'center' });

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
      headStyles: { fillColor: [236, 72, 153] },
      columnStyles: { 
        3: { halign: 'center' },
        4: { halign: 'right' }
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 3) {
          if (data.cell.raw === 'SAÍDA') data.cell.styles.textColor = [220, 38, 38]; 
          if (data.cell.raw === 'ENTRADA') data.cell.styles.textColor = [22, 163, 74]; 
        }
      }
    });

    doc.save(fileName);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header mobile-flex-col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 className="page-title">Relatórios Financeiros</h1>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="input-field" value={reportType} onChange={e => setReportType(e.target.value as any)}>
            <option value="MONTH">Mensal</option>
            <option value="DAY">Diário</option>
          </select>

          {reportType === "MONTH" ? (
            <>
              <select className="input-field" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}</option>
                ))}
              </select>
              <select className="input-field" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </>
          ) : (
            <input 
              type="date" 
              className="input-field" 
              value={selectedDate} 
              onChange={e => setSelectedDate(e.target.value)} 
            />
          )}
          
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
