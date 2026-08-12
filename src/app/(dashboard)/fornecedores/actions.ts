"use server"

import { prisma } from "@/lib/prisma"

export async function getSuppliers(search?: string) {
  return await prisma.supplier.findMany({
    where: {
      isActive: true,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { cnpj: { contains: search } }
        ]
      } : {})
    },
    orderBy: { name: 'asc' }
  });
}

export async function saveSupplier(data: {
  id?: string;
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
}) {
  const { id, ...supplierData } = data;
  
  if (id) {
    return await prisma.supplier.update({
      where: { id },
      data: supplierData
    });
  } else {
    return await prisma.supplier.create({
      data: supplierData
    });
  }
}

export async function deleteSupplier(id: string) {
  try {
    return await prisma.supplier.delete({
      where: { id }
    });
  } catch (error: any) {
    // Soft delete fallback
    return await prisma.supplier.update({
      where: { id },
      data: { isActive: false }
    });
  }
}
