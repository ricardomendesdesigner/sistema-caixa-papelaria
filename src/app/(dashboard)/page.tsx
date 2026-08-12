"use client";

import { useState, useEffect } from "react";
import { getDashboardMetrics, getRecentSales, getLowStockProducts } from "./actions";

export default function Dashboard() {
  const [metrics, setMetrics] = useState({ totalSales: 0, salesCount: 0, avgTicket: 0, customersServed: 0 });
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);

  useEffect(() => {
    getDashboardMetrics().then(setMetrics);
    getRecentSales().then(setRecentSales);
    getLowStockProducts().then(setLowStock);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>

      {/* Cards de Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Vendas do Dia</p>
          <h2 style={{ fontSize: '2rem' }}>R$ {metrics.totalSales.toFixed(2)}</h2>
        </div>
        
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Pedidos Realizados</p>
          <h2 style={{ fontSize: '2rem' }}>{metrics.salesCount}</h2>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Ticket Médio</p>
          <h2 style={{ fontSize: '2rem' }}>R$ {metrics.avgTicket.toFixed(2)}</h2>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Clientes Atendidos</p>
          <h2 style={{ fontSize: '2rem' }}>{metrics.customersServed}</h2>
        </div>
      </div>

      {/* Tabelas */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Últimas Vendas</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cliente</th>
                  <th>Vendedor</th>
                  <th>Data</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      Nenhuma venda registrada ainda.
                    </td>
                  </tr>
                ) : (
                  recentSales.map((sale) => (
                    <tr key={sale.id}>
                      <td>#{sale.id.slice(-6).toUpperCase()}</td>
                      <td>{sale.customer?.name || 'Cliente Balcão'}</td>
                      <td>{sale.user?.name || '-'}</td>
                      <td>{new Date(sale.createdAt).toLocaleString()}</td>
                      <td style={{ fontWeight: 600 }}>R$ {sale.total.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Produtos em Baixa</h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {lowStock.length === 0 ? (
              <li style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                Nenhum produto com estoque baixo.
              </li>
            ) : (
              lowStock.map((p) => (
                <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
                  <div>
                    <p style={{ fontWeight: 500 }}>{p.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.category?.name || 'Sem categoria'}</p>
                  </div>
                  <span className="badge badge-danger">{p.stock} unid.</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
