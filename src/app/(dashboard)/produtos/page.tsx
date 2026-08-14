"use client";

import { useState, useEffect } from "react";
import { getProducts, getCategories, saveProduct, deleteProduct } from "./actions";

type Category = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  barcode: string | null;
  price: number;
  cost: number;
  stock: number;
  imageUrl: string | null;
  categoryId: string | null;
  category: Category | null;
};

const initialForm = {
  id: "",
  name: "",
  barcode: "",
  price: "",
  cost: "",
  stock: "",
  categoryId: "",
  imageUrl: ""
};

export default function Produtos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [search, setSearch] = useState("");
  
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (query?: string) => {
    const [prods, cats] = await Promise.all([
      getProducts(query),
      getCategories()
    ]);
    setProducts(prods);
    setCategories(cats);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    loadData(e.target.value);
  };

  const handleEdit = (product: Product) => {
    setFormData({
      id: product.id,
      name: product.name,
      barcode: product.barcode || "",
      price: product.price.toString(),
      cost: product.cost.toString(),
      stock: product.stock.toString(),
      categoryId: product.categoryId || "",
      imageUrl: product.imageUrl || ""
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este produto?")) {
      try {
        await deleteProduct(id);
        loadData(search);
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      alert("Nome do produto é obrigatório.");
      return;
    }
    
    setIsProcessing(true);
    try {
      await saveProduct({
        id: formData.id ? formData.id : undefined,
        name: formData.name,
        barcode: formData.barcode,
        price: Number(formData.price.toString().replace(',', '.')) || 0,
        cost: Number(formData.cost.toString().replace(',', '.')) || 0,
        stock: Number(formData.stock) || 0,
        categoryId: formData.categoryId || null,
        imageUrl: formData.imageUrl || null
      });
      setIsModalOpen(false);
      setFormData(initialForm);
      loadData(search);
    } catch (error: any) {
      console.error(error);
      alert(`Erro ao salvar produto: ${error.message || 'Verifique se o código de barras já existe.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header">
        <h1 className="page-title">Produtos</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Buscar produtos..." 
              style={{ width: '300px' }}
              value={search}
              onChange={handleSearch}
            />
          </div>
          <button className="btn btn-primary" onClick={() => {
            setFormData(initialForm);
            setIsModalOpen(true);
          }}>
            + Novo Produto
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Img</th>
                <th>Código / Barras</th>
                <th>Nome do Produto</th>
                <th>Categoria</th>
                <th>Preço</th>
                <th>Estoque</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      {product.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={product.imageUrl} alt={product.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px' }} />
                      ) : (
                        <div style={{ width: '40px', height: '40px', background: 'var(--bg-secondary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '10px' }}>Sem Img</span>
                        </div>
                      )}
                    </td>
                    <td>{product.barcode}</td>
                    <td>{product.name}</td>
                    <td>{product.category?.name || '-'}</td>
                    <td>R$ {product.price.toFixed(2)}</td>
                    <td>
                      <span className={`badge ${product.stock > 10 ? 'badge-success' : 'badge-danger'}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.5rem', fontSize: '0.8rem', marginRight: '0.5rem' }} onClick={() => handleEdit(product)}>Editar</button>
                      <button className="btn btn-secondary" style={{ padding: '0.5rem', fontSize: '0.8rem', background: '#dc3545', color: 'white' }} onClick={() => handleDelete(product.id)}>Excluir</button>
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
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '2rem', background: 'var(--bg-primary)' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>{formData.id ? 'Editar Produto' : 'Novo Produto'}</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">Nome do Produto</label>
                <input type="text" className="input-field" placeholder="Ex: Cerveja Lata 350ml" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">Código de Barras (Opcional)</label>
                <input type="text" className="input-field" placeholder="Deixe em branco para gerar auto." value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} disabled={!!formData.id} />
              </div>
              <div className="input-group">
                <label className="input-label">Preço de Venda (R$)</label>
                <input type="number" step="0.01" className="input-field" placeholder="0.00" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">Preço de Custo (R$)</label>
                <input type="number" step="0.01" className="input-field" placeholder="0.00" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">Estoque Atual</label>
                <input type="number" className="input-field" placeholder="0" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">Categoria</label>
                <select className="input-field" value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                  <option value="">Selecione...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="input-group" style={{ gridColumn: 'span 2' }}>
                <label className="input-label">URL da Imagem (Opcional)</label>
                <input type="text" className="input-field" placeholder="/coke.jpg ou https://..." value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={isProcessing}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={isProcessing}>
                {isProcessing ? 'Salvando...' : 'Salvar Produto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
