"use server"

import { prisma } from "@/lib/prisma"

export async function getCashFlow(year: number, month: number, day?: number) {
  let startDate, endDate;
  
  if (day) {
    startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
  } else {
    startDate = new Date(year, month - 1, 1);
    endDate = new Date(year, month, 0, 23, 59, 59, 999);
  }

  // Buscar transações globais
  const transactions = await prisma.transaction.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });

  // Buscar movimentos de caixa físico (sangria/suprimento)
  const movements = await prisma.cashMovement.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      cashRegister: {
        select: { user: { select: { name: true } } }
      }
    }
  });

  // Unificar tudo em um array cronológico
  const unifiedFlow: any[] = [];

  transactions.forEach((t: any) => {
    unifiedFlow.push({
      id: t.id,
      date: t.createdAt,
      description: t.description,
      type: t.type === 'INCOME' ? 'ENTRADA' : 'SAÍDA',
      amount: t.amount,
      source: 'Transação'
    });
  });

  movements.forEach((m: any) => {
    unifiedFlow.push({
      id: m.id,
      date: m.createdAt,
      description: m.description,
      type: m.type === 'SUPRIMENTO' ? 'ENTRADA' : 'SAÍDA',
      amount: m.amount,
      source: `Caixa (${m.cashRegister.user.name}) - ${m.type}`
    });
  });

  // Ordenar por data (mais antigos primeiro)
  unifiedFlow.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calcular totais
  const totalEntradas = unifiedFlow.filter(i => i.type === 'ENTRADA').reduce((acc, i) => acc + i.amount, 0);
  const totalSaidas = unifiedFlow.filter(i => i.type === 'SAÍDA').reduce((acc, i) => acc + i.amount, 0);
  const saldoFinal = totalEntradas - totalSaidas;

  return {
    flow: unifiedFlow,
    totalEntradas,
    totalSaidas,
    saldoFinal
  };
}
