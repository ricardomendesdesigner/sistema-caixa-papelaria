"use client";

import { useState, useEffect } from "react";
import { getSuppliers, saveSupplier, deleteSupplier } from "./actions";

type Supplier = {
  id: string;
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
};

const initialForm = {
  id: "",
  name: "",
  cnpj: "",
  email: "",
  phone: ""
};

export default function Fornecedores() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (query?: string) => {
    const data = await getSuppliers(query);
    setSuppliers(data);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    loadData(e.target.value);
  };

  const handleEdit = (supplier: Supplier) => {
    setFormData({
      id: supplier.id,
      name: supplier.name,
      cnpj: supplier.cnpj || "",
      email: supplier.email || "",
      phone: supplier.phone || ""
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este fornecedor?")) {
      try {
        await deleteSupplier(id);
        loadData(search);
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      alert("O nome do fornecedor é obrigatório.");
      return;
    }
    
    setIsProcessing(true);
    try {
      await saveSupplier({
        id: formData.id ? formData.id : undefined,
        name: formData.name,
        cnpj: formData.cnpj || null,
        email: formData.email || null,
        phone: formData.phone || null
      });
      setIsModalOpen(false);
      setFormData(initialForm);
      loadData(search);
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar fornecedor. Verifique se o CNPJ já está cadastrado.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header">
        <h1 className="page-title">Fornecedores</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Buscar fornecedores..." 
              style={{ width: '300px' }}
              value={search}
              onChange={handleSearch}
            />
          </div>
          <button className="btn btn-primary" onClick={() => {
            setFormData(initialForm);
            setIsModalOpen(true);
          }}>
            + Novo Fornecedor
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Razão Social / Nome</th>
                <th>CNPJ</th>
                <th>E-mail</th>
                <th>Telefone</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                    Nenhum fornecedor encontrado.
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td>{supplier.name}</td>
                    <td>{supplier.cnpj || '-'}</td>
                    <td>{supplier.email || '-'}</td>
                    <td>{supplier.phone || '-'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.5rem', fontSize: '0.8rem', marginRight: '0.5rem' }} onClick={() => handleEdit(supplier)}>Editar</button>
                      <button className="btn btn-secondary" style={{ padding: '0.5rem', fontSize: '0.8rem', background: '#dc3545', color: 'white' }} onClick={() => handleDelete(supplier.id)}>Excluir</button>
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
            <h2 style={{ marginBottom: '1.5rem' }}>{formData.id ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">Razão Social / Nome</label>
                <input type="text" className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">CNPJ</label>
                <input type="text" className="input-field" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} />
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
                {isProcessing ? 'Salvando...' : 'Salvar Fornecedor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
