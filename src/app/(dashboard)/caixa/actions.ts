"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getCurrentCashRegister() {
  return await prisma.cashRegister.findFirst({
    where: { status: "OPEN" },
    include: {
      movements: {
        orderBy: { createdAt: 'desc' }
      },
      sales: {
        orderBy: { createdAt: 'desc' }
      },
      user: {
        select: { name: true }
      }
    }
  });
}

export async function openCashRegister(userId: string, openingBalance: number) {
  const current = await getCurrentCashRegister();
  if (current) {
    throw new Error("Já existe um caixa aberto.");
  }

  const register = await prisma.cashRegister.create({
    data: {
      userId,
      openingBalance
    }
  });

  revalidatePath('/caixa');
  revalidatePath('/pdv');
  return register;
}

export async function closeCashRegister(id: string, closingBalance: number) {
  const register = await prisma.cashRegister.update({
    where: { id },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      closingBalance
    }
  });

  revalidatePath('/caixa');
  revalidatePath('/pdv');
  return register;
}

export async function addCashMovement(cashRegisterId: string, type: "SANGRIA" | "SUPRIMENTO", amount: number, description: string) {
  const movement = await prisma.cashMovement.create({
    data: {
      cashRegisterId,
      type,
      amount,
      description
    }
  });

  revalidatePath('/caixa');
  return movement;
}
