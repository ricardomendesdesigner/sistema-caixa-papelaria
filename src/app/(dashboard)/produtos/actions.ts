"use server"

import { prisma } from "@/lib/prisma"

export async function getProducts(search?: string) {
  return await prisma.product.findMany({
    where: {
      isActive: true,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { barcode: search }
        ]
      } : {})
    },
    include: {
      category: true
    },
    orderBy: { name: 'asc' }
  });
}

export async function getCategories() {
  return await prisma.category.findMany({
    orderBy: { name: 'asc' }
  });
}

export async function saveProduct(data: {
  id?: string;
  name: string;
  barcode?: string;
  price: number;
  cost: number;
  stock: number;
  categoryId?: string | null;
  imageUrl?: string | null;
}) {
  const { id, ...productData } = data;
  
  let finalBarcode = productData.barcode;
  if (!finalBarcode || finalBarcode.trim() === "") {
    // Generate an internal barcode if none is provided
    finalBarcode = `INT${Date.now().toString().slice(-8)}`;
  } else {
    finalBarcode = finalBarcode.trim();
  }
  
  if (id) {
    return await prisma.product.update({
      where: { id },
      data: { ...productData, barcode: finalBarcode }
    });
  } else {
    return await prisma.product.create({
      data: { ...productData, barcode: finalBarcode }
    });
  }
}

export async function deleteProduct(id: string) {
  try {
    return await prisma.product.delete({
      where: { id }
    });
  } catch (error: any) {
    // Soft delete fallback se houver relacionamentos
    return await prisma.product.update({
      where: { id },
      data: { isActive: false }
    });
  }
}
