"use server"

import { prisma } from "@/lib/prisma"

export async function searchProducts(query: string) {
  // First try exact barcode match
  const exactMatch = await prisma.product.findFirst({
    where: { barcode: query, isActive: true }
  });
  if (exactMatch) {
    return [exactMatch];
  }

  // Otherwise, search by name
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { barcode: { contains: query, mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } }
      ]
    },
    take: 50
  });
  return products;
}

export async function getAllProducts() {
  return await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    take: 200
  });
}

export async function getCustomers() {
  return await prisma.customer.findMany({
    orderBy: { name: 'asc' }
  });
}

// In a real app we get this from the session/token. For Phase 1 we fetch the generic master user.
export async function getMasterUser() {
  return await prisma.user.findUnique({
    where: { email: 'master@master.com' }
  });
}

export async function getUsers() {
  return await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
  });
}

export async function checkoutSale(data: {
  userId: string;
  customerId?: string | null;
  items: { productId: string; quantity: number; price: number; total: number }[];
  total: number;
  paymentMethod: string;
}) {
  return await prisma.$transaction(async (tx: any) => {
    // 1. Verificar Caixa Aberto
    const openRegister = await tx.cashRegister.findFirst({
      where: { status: "OPEN" }
    });
    if (!openRegister) {
      throw new Error("Não há caixa aberto. Abra o caixa primeiro.");
    }

    // Buscar a taxa de comissão do vendedor
    const seller = await tx.user.findUnique({
      where: { id: data.userId },
      select: { commissionRate: true }
    });
    
    const commissionValue = seller && seller.commissionRate > 0 
      ? data.total * (seller.commissionRate / 100) 
      : 0;

    let avulsoProductId: string | null = null;
    const hasAvulso = data.items.some(i => i.productId === "AVULSO");
    if (hasAvulso) {
      let avulsoProd = await tx.product.findFirst({ where: { barcode: "AVULSO" } });
      if (!avulsoProd) {
        avulsoProd = await tx.product.create({
          data: { name: "Produto Avulso", barcode: "AVULSO", price: 0, cost: 0, stock: 0 }
        });
      }
      avulsoProductId = avulsoProd.id;
    }

    // 1. Create Sale
    const sale = await tx.sale.create({
      data: {
        userId: data.userId,
        customerId: data.customerId || null,
        total: data.total,
        paymentMethod: data.paymentMethod,
        commissionValue: commissionValue,
        cashRegisterId: openRegister.id,
        items: {
          create: data.items.map(item => ({
            productId: item.productId === "AVULSO" && avulsoProductId ? avulsoProductId : item.productId,
            quantity: item.quantity,
            price: item.price,
            total: item.total
          }))
        }
      }
    });

    // 2. Update stock
    for (const item of data.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: { decrement: item.quantity }
        }
      });
    }

    // 3. Financeiro
    if (data.paymentMethod === 'A_PRAZO') {
      // Criar conta a receber
      await tx.accountReceivable.create({
        data: {
          description: `Venda #${sale.id.slice(-6).toUpperCase()}`,
          amount: data.total,
          dueDate: new Date(new Date().setDate(new Date().getDate() + 30)), // Vence em 30 dias
          status: 'PENDING',
          customerId: data.customerId || null,
          saleId: sale.id
        }
      });
    } else {
      // Criar transação de caixa (dinheiro imediato)
      await tx.transaction.create({
        data: {
          description: `Venda PDV - Pagamento em ${data.paymentMethod}`,
          amount: data.total,
          type: 'INCOME',
          userId: data.userId
        }
      });
    }

    return sale;
  });
}
