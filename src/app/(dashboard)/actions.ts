"use server"

import { prisma } from "@/lib/prisma"

export async function getDashboardMetrics() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sales = await prisma.sale.findMany({
    where: {
      createdAt: { gte: today }
    },
    select: {
      total: true,
      customerId: true
    }
  });

  const totalSales = sales.reduce((acc: number, s: any) => acc + s.total, 0);
  const salesCount = sales.length;
  const avgTicket = salesCount > 0 ? totalSales / salesCount : 0;
  const uniqueCustomers = new Set(sales.map((s: any) => s.customerId).filter(Boolean)).size;

  return {
    totalSales,
    salesCount,
    avgTicket,
    customersServed: uniqueCustomers || salesCount
  };
}

export async function getRecentSales() {
  return await prisma.sale.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { name: true } },
      user: { select: { name: true } }
    }
  });
}

export async function getLowStockProducts() {
  // Busca produtos ativos e filtra no JS (stock <= minStock)
  const products = await prisma.product.findMany({
    where: {
      isActive: true
    },
    include: {
      category: { select: { name: true } }
    },
    orderBy: { stock: 'asc' }
  });

  return products
    .filter((p: any) => p.stock <= p.minStock)
    .slice(0, 5);
}
