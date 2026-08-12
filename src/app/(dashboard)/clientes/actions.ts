"use server"

import { prisma } from "@/lib/prisma"

export async function getCustomers(search?: string) {
  return await prisma.customer.findMany({
    where: {
      isActive: true,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { cpf: { contains: search } }
        ]
      } : {})
    },
    orderBy: { name: 'asc' }
  });
}

export async function saveCustomer(data: {
  id?: string;
  name: string;
  cpf: string | null;
  email: string | null;
  phone: string | null;
}) {
  const { id, ...customerData } = data;
  
  if (id) {
    return await prisma.customer.update({
      where: { id },
      data: customerData
    });
  } else {
    return await prisma.customer.create({
      data: customerData
    });
  }
}

export async function deleteCustomer(id: string) {
  try {
    return await prisma.customer.delete({
      where: { id }
    });
  } catch (error: any) {
    // Soft delete fallback se já fez compras
    return await prisma.customer.update({
      where: { id },
      data: { isActive: false }
    });
  }
}
