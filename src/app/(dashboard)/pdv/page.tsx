"use client";

import { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { searchProduct, getCustomers, checkoutSale, getMasterUser, getUsers, getAllProducts } from './actions';
import { getCurrentCashRegister } from '../caixa/actions';

type CartItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  imageUrl?: string | null;
};

type Customer = {
  id: string;
  name: string;
  cpf: string | null;
  phone: string | null;
};

export default function PDV() {
  const [barcode, setBarcode] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [sellers, setSellers] = useState<{id: string, name: string}[]>([]);
  const [isCaixaOpen, setIsCaixaOpen] = useState<boolean | null>(null);

  // Modals state
  const [customerModal, setCustomerModal] = useState(false);
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [receiptModal, setReceiptModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // CASH, PIX, CREDIT_CARD
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [completedSaleData, setCompletedSaleData] = useState<any>(null);
  const [customerPhone, setCustomerPhone] = useState("");

  const [productModal, setProductModal] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Load User, Sellers & Cash Register
  useEffect(() => {
    getCurrentCashRegister().then(caixa => {
      setIsCaixaOpen(!!caixa);
    });
    getMasterUser().then(user => {
      if (user) setUserId(user.id);
    });
    getUsers().then(data => setSellers(data));
  }, []);

  const subtotal = cart.reduce((acc, item) => acc + item.total, 0);
  const finalTotal = Math.max(0, subtotal - discount);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid intercepting if user is typing in a generic input (except barcode)
      if (document.activeElement?.tagName === 'INPUT' && document.activeElement?.id !== 'barcode-input') {
        return;
      }
      
      if (['F2', 'F3', 'F4', 'F5', 'F6', 'F12'].includes(e.key)) {
        e.preventDefault();
      }
      
      switch (e.key) {
        case 'F2':
          barcodeInputRef.current?.focus();
          break;
        case 'F3':
          openCustomerModal();
          break;
        case 'F4': {
          let val = prompt('Digite o valor do desconto (R$):', discount.toString());
          if (val) {
            val = val.replace(',', '.');
            if (!isNaN(Number(val))) setDiscount(Number(val));
          }
          break;
        }
        case 'F5':
          if (confirm('Tem certeza que deseja cancelar a venda atual e limpar todos os itens?')) {
            setCart([]);
            setDiscount(0);
            setSelectedCustomer(null);
          }
          break;
        case 'F6':
          openProductModal();
          break;
        case 'F12':
          if (cart.length > 0) setCheckoutModal(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, discount]);

  const openCustomerModal = async () => {
    setCustomerModal(true);
    const data = await getCustomers();
    setCustomers(data);
  };

  const openProductModal = async () => {
    setProductModal(true);
    const data = await getAllProducts();
    setAllProducts(data);
  };

  const handleBarcodeSubmit = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && barcode.trim() !== '') {
      const product = await searchProduct(barcode.trim());
      if (product) {
        const existing = cart.find(item => item.productId === product.id);
        if (existing) {
          setCart(cart.map(item => item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price } 
            : item));
        } else {
          setCart([...cart, { 
            productId: product.id, 
            name: product.name, 
            quantity: 1, 
            price: product.price, 
            total: product.price,
            imageUrl: product.imageUrl
          }]);
        }
        setBarcode('');
      } else {
        alert('Produto não encontrado!');
      }
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || !userId) return;
    setIsProcessing(true);
    try {
      const saleResult = await checkoutSale({
        userId,
        customerId: selectedCustomer?.id,
        items: cart,
        total: finalTotal,
        paymentMethod
      });
      
      setCompletedSaleData({
        id: saleResult.id,
        items: cart,
        total: finalTotal,
        paymentMethod,
        customer: selectedCustomer
      });
      setCustomerPhone(selectedCustomer?.phone || "");
      
      setCheckoutModal(false);
      setReceiptModal(true);
      
      // We don't reset cart here yet, we reset it when closing the receipt modal
    } catch (err) {
      alert('Erro ao finalizar venda.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinishReceipt = () => {
    setCart([]);
    setDiscount(0);
    setSelectedCustomer(null);
    setReceiptModal(false);
    setCompletedSaleData(null);
    setTimeout(() => barcodeInputRef.current?.focus(), 100);
  };

  const sendWhatsAppReceipt = async () => {
    if (!completedSaleData || !customerPhone) return alert("Digite o número do WhatsApp");

    // 1. GERAR PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200] // Formato de cupom não fiscal (bobina 80mm)
    });

    let yPos = 5;

    // Tentar carregar e adicionar a logo
    try {
      const response = await fetch('/logo.png');
      if (response.ok) {
        const blob = await response.blob();
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        
        // Adicionar logo centralizada no topo (largura 20mm, altura 20mm)
        // Largura da bobina = 80mm. Centro = 40mm. X = 40 - (20/2) = 30
        doc.addImage(base64Data, 'PNG', 30, yPos, 20, 20);
        yPos += 25;
      }
    } catch (e) {
      console.error("Erro ao adicionar logo no PDF:", e);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("PAPELARIA DANI RIO", 40, yPos, { align: 'center' });
    yPos += 5;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Comprovante #${completedSaleData.id.slice(-6).toUpperCase()}`, 40, yPos, { align: 'center' });
    yPos += 5;
    doc.text(`Data: ${new Date().toLocaleString()}`, 40, yPos, { align: 'center' });

    yPos += 10;
    doc.setFontSize(10);
    doc.text("ITENS DA VENDA:", 5, yPos);
    yPos += 5;

    const tableData = completedSaleData.items.map((item: any) => [
      `${item.quantity}x ${item.name}`,
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
    
    const receiptSubtotal = completedSaleData.items.reduce((acc: number, item: any) => acc + item.total, 0);
    const receiptDiscount = receiptSubtotal - completedSaleData.total;
    
    if (receiptDiscount > 0) {
      doc.setFont("helvetica", "normal");
      doc.text(`SUBTOTAL: R$ ${receiptSubtotal.toFixed(2)}`, 5, yPos);
      yPos += 5;
      doc.text(`DESCONTO: R$ ${receiptDiscount.toFixed(2)}`, 5, yPos);
      yPos += 5;
    }
    
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL PAGO: R$ ${completedSaleData.total.toFixed(2)}`, 5, yPos);
    
    yPos += 5;
    doc.setFont("helvetica", "normal");
    doc.text(`MÉTODO: ${completedSaleData.paymentMethod}`, 5, yPos);
    
    if (completedSaleData.customer) {
      yPos += 5;
      doc.text(`CLIENTE: ${completedSaleData.customer.name}`, 5, yPos);
    }

    yPos += 15;
    doc.setFont("helvetica", "italic");
    doc.text("Agradecemos a preferência! <3", 40, yPos, { align: 'center' });

    // Salvar o PDF
    const filename = `comprovante_${completedSaleData.id.slice(-6).toUpperCase()}.pdf`;
    doc.save(filename);

    // 2. ABRIR WHATSAPP
    const text = `Olá! 🩷 Segue em anexo o seu comprovante de venda #${completedSaleData.id.slice(-6).toUpperCase()} da *Papelaria Dani Rio*. Agradecemos a preferência!`;
    const encoded = encodeURIComponent(text);
    const phone = customerPhone.replace(/\D/g, '');
    
    setTimeout(() => {
      window.open(`https://wa.me/55${phone}?text=${encoded}`, '_blank');
    }, 1000);
  };

  if (isCaixaOpen === null) return <div>Carregando PDV...</div>;

  if (isCaixaOpen === false) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--danger-color)' }}>Caixa Fechado</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Você não pode realizar vendas porque o caixa está fechado.</p>
        <button className="btn btn-primary" onClick={() => window.location.href = '/caixa'}>
          Ir para Abertura de Caixa
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-6 mobile-flex-col" style={{ height: 'calc(100vh - 140px)' }}>
      {/* Coluna Esquerda: Itens da Venda */}
      <div className="glass-panel" style={{ flex: '2', display: 'flex', flexDirection: 'column', padding: '1.5rem', overflow: 'hidden' }}>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Caixa Livre</span>
          {selectedCustomer && (
            <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Cliente: {selectedCustomer.name}</span>
          )}
          <span className="badge badge-success">Aberto</span>
        </h2>
        
        {/* Input Código de Barras */}
        <div className="input-group" style={{ marginBottom: '2rem' }}>
          <input 
            id="barcode-input"
            ref={barcodeInputRef}
            type="text" 
            className="input-field" 
            placeholder="Código de barras ou nome do produto (F2) + Enter" 
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={handleBarcodeSubmit}
            autoFocus
            style={{ fontSize: '1.25rem', padding: '1rem' }}
          />
        </div>

        {/* Tabela de Itens */}
        <div className="table-container" style={{ flex: 1, border: 'none', background: 'transparent', overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ background: 'transparent' }}>Item</th>
                <th style={{ background: 'transparent', width: '50px' }}>Img</th>
                <th style={{ background: 'transparent' }}>Produto</th>
                <th style={{ background: 'transparent' }}>Qtd</th>
                <th style={{ background: 'transparent' }}>Vl. Unit.</th>
                <th style={{ background: 'transparent' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {cart.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Nenhum item adicionado à venda.
                  </td>
                </tr>
              ) : (
                cart.map((item, index) => (
                  <tr key={item.productId}>
                    <td>{String(index + 1).padStart(3, '0')}</td>
                    <td>
                      {item.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={item.imageUrl} alt={item.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px' }} />
                      ) : (
                        <div style={{ width: '40px', height: '40px', background: 'var(--bg-secondary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '10px' }}>Sem Img</span>
                        </div>
                      )}
                    </td>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>R$ {item.price.toFixed(2)}</td>
                    <td>R$ {item.total.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Coluna Direita: Resumo e Pagamento */}
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--primary-gradient)', color: 'white' }}>
          <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>Total a Pagar</p>
          <h1 style={{ fontSize: '3.5rem', margin: '0.5rem 0', color: 'white' }}>R$ {finalTotal.toFixed(2)}</h1>
          {discount > 0 && <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>Desconto: R$ {discount.toFixed(2)}</p>}
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, position: 'relative' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Ações Rápidas</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <button className="btn btn-secondary" style={{ padding: '1rem' }} onClick={openCustomerModal}>F3 - Cliente</button>
            <button className="btn btn-secondary" style={{ padding: '1rem' }} onClick={() => {
              let val = prompt('Digite o valor do desconto (R$):', discount.toString());
              if (val) {
                val = val.replace(',', '.');
                if (!isNaN(Number(val))) setDiscount(Number(val));
              }
            }}>F4 - Desconto</button>
            <button className="btn btn-secondary" style={{ padding: '1rem' }} onClick={() => {
              if (confirm('Tem certeza que deseja cancelar a venda atual e limpar todos os itens?')) {
                setCart([]);
                setDiscount(0);
                setSelectedCustomer(null);
              }
            }}>F5 - Cancelar Venda</button>
            <button className="btn btn-secondary" style={{ padding: '1rem' }} onClick={openProductModal}>F6 - Produtos</button>
          </div>

          <button 
            className="btn" 
            style={{ width: 'calc(100% - 3rem)', padding: '1.5rem', fontSize: '1.25rem', position: 'absolute', bottom: '1.5rem', left: '1.5rem', opacity: cart.length === 0 ? 0.5 : 1, background: 'var(--primary-color)', color: 'white', boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)' }} 
            onClick={() => cart.length > 0 && setCheckoutModal(true)}
            disabled={cart.length === 0}
          >
            F12 - Finalizar Venda
          </button>
        </div>
      </div>

      {/* Modals */}
      {customerModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(5px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem', background: 'var(--bg-primary)' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Selecionar Cliente</h2>
            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {customers.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>Nenhum cliente encontrado.</p>
              ) : (
                customers.map(c => (
                  <button key={c.id} className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '1rem' }} onClick={() => {
                    setSelectedCustomer(c);
                    setCustomerModal(false);
                    barcodeInputRef.current?.focus();
                  }}>
                    {c.name} - {c.cpf || 'Sem CPF'}
                  </button>
                ))
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => {
                setCustomerModal(false);
                barcodeInputRef.current?.focus();
              }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {productModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(5px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '2rem', background: 'var(--bg-primary)' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Consultar Produtos</h2>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Buscar por nome ou código..." 
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              style={{ width: '100%', marginBottom: '1rem' }}
              autoFocus
            />
            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {allProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || (p.barcode && p.barcode.includes(productSearch))).length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>Nenhum produto encontrado.</p>
              ) : (
                allProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || (p.barcode && p.barcode.includes(productSearch))).map(p => (
                  <button key={p.id} className="btn btn-secondary" style={{ justifyContent: 'space-between', padding: '1rem' }} onClick={() => {
                    // Add to cart
                    const existing = cart.find(item => item.productId === p.id);
                    if (existing) {
                      setCart(cart.map(item => item.productId === p.id 
                        ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price } 
                        : item));
                    } else {
                      setCart([...cart, { 
                        productId: p.id, 
                        name: p.name, 
                        quantity: 1, 
                        price: p.price, 
                        total: p.price,
                        imageUrl: p.imageUrl
                      }]);
                    }
                    setProductModal(false);
                    setProductSearch('');
                    barcodeInputRef.current?.focus();
                  }}>
                    <span>{p.name}</span>
                    <span style={{ fontWeight: 'bold' }}>R$ {p.price.toFixed(2)}</span>
                  </button>
                ))
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => {
                setProductModal(false);
                barcodeInputRef.current?.focus();
              }}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {checkoutModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(5px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem', background: 'var(--bg-primary)' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Finalizar Venda</h2>
            <h1 style={{ fontSize: '3rem', textAlign: 'center', marginBottom: '2rem', color: 'var(--primary-color)' }}>R$ {finalTotal.toFixed(2)}</h1>
            
            <div className="input-group">
              <label className="input-label">Vendedor</label>
              <select className="input-field" value={userId} onChange={(e) => setUserId(e.target.value)}>
                {sellers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Forma de Pagamento</label>
              <select className="input-field" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="CASH">Dinheiro</option>
                <option value="PIX">PIX</option>
                <option value="CREDIT_CARD">Cartão de Crédito</option>
                <option value="DEBIT_CARD">Cartão de Débito</option>
                <option value="A_PRAZO">A Prazo (Fiado)</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-secondary" onClick={() => {
                setCheckoutModal(false);
                barcodeInputRef.current?.focus();
              }} disabled={isProcessing}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCheckout} disabled={isProcessing}>
                {isProcessing ? 'Processando...' : 'Confirmar Pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RECIBO WHATSAPP */}
      {receiptModal && completedSaleData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '400px', background: 'white', textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', background: 'var(--success-color)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 1.5rem auto' }}>
              ✓
            </div>
            <h2 style={{ marginBottom: '0.5rem' }}>Venda Finalizada!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>O caixa foi atualizado com sucesso.</p>

            <div className="input-group" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
              <label className="input-label">WhatsApp do Cliente (DDD + Número)</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Ex: 21999999999"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button 
                className="btn" 
                style={{ background: '#25D366', color: 'white' }}
                onClick={sendWhatsAppReceipt}
              >
                Enviar Comprovante via WhatsApp
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={handleFinishReceipt}
              >
                Nova Venda
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
