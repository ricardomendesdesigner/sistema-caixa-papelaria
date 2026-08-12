"use server"

import { prisma } from "@/lib/prisma"

// --- Fluxo de Caixa (Transactions) ---
export async function getTransactions() {
  return await prisma.transaction.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: true }
  });
}

// --- Contas a Receber ---
export async function getReceivables() {
  return await prisma.accountReceivable.findMany({
    where: { isActive: true },
    orderBy: { dueDate: 'asc' },
    include: { customer: true }
  });
}

export async function receiveAccount(id: string) {
  return await prisma.$transaction(async (tx: any) => {
    const acc = await tx.accountReceivable.update({
      where: { id },
      data: { status: 'RECEIVED' }
    });
    
    // Gera entrada no fluxo de caixa
    await tx.transaction.create({
      data: {
        description: `Recebimento de Conta: ${acc.description}`,
        amount: acc.amount,
        type: 'INCOME',
        userId: (await tx.user.findFirst({ orderBy: { createdAt: 'asc' } }))!.id // Fallback
      }
    });
    return acc;
  });
}

// --- Contas a Pagar ---
export async function getPayables() {
  return await prisma.accountPayable.findMany({
    where: { isActive: true },
    orderBy: { dueDate: 'asc' },
    include: { supplier: true }
  });
}

export async function savePayable(data: {
  id?: string;
  description: string;
  amount: number;
  dueDate: Date;
  supplierId?: string | null;
}) {
  if (data.id) {
    return await prisma.accountPayable.update({
      where: { id: data.id },
      data: {
        description: data.description,
        amount: data.amount,
        dueDate: data.dueDate,
        supplierId: data.supplierId
      }
    });
  } else {
    return await prisma.accountPayable.create({
      data: {
        description: data.description,
        amount: data.amount,
        dueDate: data.dueDate,
        supplierId: data.supplierId
      }
    });
  }
}

export async function payAccount(id: string) {
  return await prisma.$transaction(async (tx: any) => {
    const acc = await tx.accountPayable.update({
      where: { id },
      data: { status: 'PAID' }
    });
    
    // Gera saída no fluxo de caixa
    await tx.transaction.create({
      data: {
        description: `Pagamento de Conta: ${acc.description}`,
        amount: acc.amount,
        type: 'EXPENSE',
        userId: (await tx.user.findFirst({ orderBy: { createdAt: 'asc' } }))!.id // Fallback
      }
    });
    return acc;
  });
}

export async function getSuppliersForSelect() {
  return await prisma.supplier.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
  });
}
