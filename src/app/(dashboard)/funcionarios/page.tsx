"use client";

import { useState, useEffect } from "react";
import { getUsers, saveUser, deleteUser } from "./actions";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  commissionRate: number;
};

const initialForm = {
  id: "",
  name: "",
  email: "",
  role: "CASHIER",
  commissionRate: "0"
};

export default function Funcionarios() {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (query?: string) => {
    const data = await getUsers(query);
    setUsers(data as User[]);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    loadData(e.target.value);
  };

  const handleEdit = (user: User) => {
    setFormData({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      commissionRate: user.commissionRate.toString()
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este funcionário?")) {
      try {
        await deleteUser(id);
        loadData(search);
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      alert("O nome e o e-mail são obrigatórios.");
      return;
    }
    
    setIsProcessing(true);
    try {
      await saveUser({
        id: formData.id ? formData.id : undefined,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        commissionRate: Number(formData.commissionRate) || 0
      });
      setIsModalOpen(false);
      setFormData(initialForm);
      loadData(search);
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar funcionário. Verifique se o e-mail já está cadastrado.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header">
        <h1 className="page-title">Funcionários / Vendedores</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Buscar funcionários..." 
              style={{ width: '300px' }}
              value={search}
              onChange={handleSearch}
            />
          </div>
          <button className="btn btn-primary" onClick={() => {
            setFormData(initialForm);
            setIsModalOpen(true);
          }}>
            + Novo Funcionário
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Cargo</th>
                <th>Comissão (%)</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                    Nenhum funcionário encontrado.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className="badge badge-primary">
                        {user.role === 'ADMIN' ? 'Administrador' : user.role === 'MANAGER' ? 'Gerente' : 'Caixa/Vendedor'}
                      </span>
                    </td>
                    <td>{user.commissionRate}%</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.5rem', fontSize: '0.8rem', marginRight: '0.5rem' }} onClick={() => handleEdit(user)}>Editar</button>
                      <button className="btn btn-secondary" style={{ padding: '0.5rem', fontSize: '0.8rem', background: '#dc3545', color: 'white' }} onClick={() => handleDelete(user.id)}>Excluir</button>
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
            <h2 style={{ marginBottom: '1.5rem' }}>{formData.id ? 'Editar Funcionário' : 'Novo Funcionário'}</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">Nome Completo</label>
                <input type="text" className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">E-mail</label>
                <input type="email" className="input-field" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">Cargo</label>
                <select className="input-field" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  <option value="CASHIER">Caixa / Vendedor</option>
                  <option value="MANAGER">Gerente</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Taxa de Comissão (%)</label>
                <input type="number" step="0.1" className="input-field" value={formData.commissionRate} onChange={e => setFormData({...formData, commissionRate: e.target.value})} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={isProcessing}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={isProcessing}>
                {isProcessing ? 'Salvando...' : 'Salvar Funcionário'}
              </button>
            </div>
            
            {!formData.id && (
              <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                * A senha padrão para novos usuários é <strong>password123</strong>.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
