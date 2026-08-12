"use client";

import { useState, useEffect } from "react";
import { getCustomers, saveCustomer, deleteCustomer } from "./actions";

type Customer = {
  id: string;
  name: string;
  cpf: string | null;
  email: string | null;
  phone: string | null;
};

const initialForm = {
  id: "",
  name: "",
  cpf: "",
  email: "",
  phone: ""
};

export default function Clientes() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (query?: string) => {
    const data = await getCustomers(query);
    setCustomers(data);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    loadData(e.target.value);
  };

  const handleEdit = (customer: Customer) => {
    setFormData({
      id: customer.id,
      name: customer.name,
      cpf: customer.cpf || "",
      email: customer.email || "",
      phone: customer.phone || ""
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este cliente?")) {
      try {
        await deleteCustomer(id);
        loadData(search);
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      alert("O nome do cliente é obrigatório.");
      return;
    }
    
    setIsProcessing(true);
    try {
      await saveCustomer({
        id: formData.id ? formData.id : undefined,
        name: formData.name,
        cpf: formData.cpf || null,
        email: formData.email || null,
        phone: formData.phone || null
      });
      setIsModalOpen(false);
      setFormData(initialForm);
      loadData(search);
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar cliente. Verifique se o CPF já está cadastrado.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header">
        <h1 className="page-title">Clientes</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Buscar clientes..." 
              style={{ width: '300px' }}
              value={search}
              onChange={handleSearch}
            />
          </div>
          <button className="btn btn-primary" onClick={() => {
            setFormData(initialForm);
            setIsModalOpen(true);
          }}>
            + Novo Cliente
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th>E-mail</th>
                <th>Telefone</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.name}</td>
                    <td>{customer.cpf || '-'}</td>
                    <td>{customer.email || '-'}</td>
                    <td>{customer.phone || '-'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.5rem', fontSize: '0.8rem', marginRight: '0.5rem' }} onClick={() => handleEdit(customer)}>Editar</button>
                      <button className="btn btn-secondary" style={{ padding: '0.5rem', fontSize: '0.8rem', background: '#dc3545', color: 'white' }} onClick={() => handleDelete(customer.id)}>Excluir</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          backdropFilter: 'blur(5px)'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem', background: 'var(--bg-primary)' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>{formData.id ? 'Editar Cliente' : 'Novo Cliente'}</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">Nome Completo</label>
                <input type="text" className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">CPF</label>
                <input type="text" className="input-field" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">E-mail</label>
                <input type="email" className="input-field" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">Telefone</label>
                <input type="text" className="input-field" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={isProcessing}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={isProcessing}>
                {isProcessing ? 'Salvando...' : 'Salvar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
