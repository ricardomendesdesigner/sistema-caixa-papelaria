"use client";

import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getSales } from "./actions";

export default function VendasHistorico() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSales().then((data) => {
      setSales(data);
      setLoading(false);
    });
  }, []);

  const printReceipt = async (sale: any) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200]
    });

    let yPos = 5;

    try {
      const response = await fetch('/logo.png');
      if (response.ok) {
        const blob = await response.blob();
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        doc.addImage(base64Data, 'PNG', 30, yPos, 20, 20);
        yPos += 25;
      }
    } catch (e) {
      console.error(e);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("PAPELARIA DANI RIO", 40, yPos, { align: 'center' });
    yPos += 5;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Comprovante #${sale.id.slice(-6).toUpperCase()}`, 40, yPos, { align: 'center' });
    yPos += 5;
    doc.text(`Data: ${new Date(sale.createdAt).toLocaleString()}`, 40, yPos, { align: 'center' });

    yPos += 10;
    doc.setFontSize(10);
    doc.text("ITENS DA VENDA:", 5, yPos);
    yPos += 5;

    const tableData = sale.items.map((item: any) => [
      `${item.quantity}x ${item.product.name}`,
      `R$ ${item.total.toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Produto', 'Total']],
      body: tableData,
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 1 },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: 5, right: 5 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL PAGO: R$ ${sale.total.toFixed(2)}`, 5, yPos);
    
    yPos += 5;
    doc.setFont("helvetica", "normal");
    
    const paymentMethodMap: Record<string, string> = {
      'CASH': 'Dinheiro',
      'PIX': 'PIX',
      'CREDIT_CARD': 'Cartão Crédito',
      'DEBIT_CARD': 'Cartão Débito',
      'A_PRAZO': 'A Prazo (Fiado)'
    };
    const translatedPayment = paymentMethodMap[sale.paymentMethod] || sale.paymentMethod;
    
    doc.text(`MÉTODO: ${translatedPayment}`, 5, yPos);
    
    if (sale.customer) {
      yPos += 5;
      doc.text(`CLIENTE: ${sale.customer.name}`, 5, yPos);
    }

    yPos += 15;
    doc.setFont("helvetica", "italic");
    doc.text("Agradecemos a preferência! <3", 40, yPos, { align: 'center' });

    doc.save(`comprovante_${sale.id.slice(-6).toUpperCase()}.pdf`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header">
        <h1 className="page-title">Histórico de Vendas</h1>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: '2rem' }}>Carregando histórico...</p>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data / Hora</th>
                  <th>ID da Venda</th>
                  <th>Cliente</th>
                  <th>Vendedor</th>
                  <th>Forma de Pag.</th>
                  <th>Total</th>
                  <th>Itens</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                      Nenhuma venda registrada ainda.
                    </td>
                  </tr>
                ) : (
                  sales.map((sale) => (
                    <tr key={sale.id}>
                      <td>{new Date(sale.createdAt).toLocaleString()}</td>
                      <td>#{sale.id.slice(-6).toUpperCase()}</td>
                      <td>{sale.customer?.name || 'Cliente Balcão'}</td>
                      <td>{sale.user?.name || 'Sem Vendedor'}</td>
                      <td>
                        <span className="badge badge-primary">
                          {sale.paymentMethod === 'CASH' ? 'Dinheiro' 
                            : sale.paymentMethod === 'PIX' ? 'PIX'
                            : sale.paymentMethod === 'CREDIT_CARD' ? 'Cartão Crédito'
                            : sale.paymentMethod === 'DEBIT_CARD' ? 'Cartão Débito'
                            : sale.paymentMethod === 'A_PRAZO' ? 'A Prazo (Fiado)'
                            : sale.paymentMethod}
                        </span>
                      </td>
                      <td style={{ fontWeight: 'bold' }}>R$ {sale.total.toFixed(2)}</td>
                      <td>
                        <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                          {sale.items.map((item: any) => (
                            <div key={item.id}>
                              {item.quantity}x {item.product.name}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>
                        <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => printReceipt(sale)}>
                          🖨️ Comprovante
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
