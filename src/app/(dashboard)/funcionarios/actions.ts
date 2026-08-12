"use server"

import { prisma } from "@/lib/prisma"

export async function getUsers(search?: string) {
  return await prisma.user.findMany({
    where: {
      isActive: true,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      } : {})
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      commissionRate: true
    },
    orderBy: { name: 'asc' }
  });
}

export async function saveUser(data: {
  id?: string;
  name: string;
  email: string;
  role: string;
  commissionRate: number;
}) {
  const { id, ...userData } = data;
  
  if (id) {
    return await prisma.user.update({
      where: { id },
      data: userData
    });
  } else {
    return await prisma.user.create({
      data: {
        ...userData,
        password: 'password123' // Default password for new users
      }
    });
  }
}

export async function deleteUser(id: string) {
  try {
    return await prisma.user.delete({
      where: { id }
    });
  } catch (error: any) {
    // Soft delete se estiver atrelado a vendas
    return await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });
  }
}
