"use server"

import { prisma } from "@/lib/prisma"

export async function getSales() {
  return await prisma.sale.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { name: true }
      },
      customer: {
        select: { name: true }
      },
      items: {
        include: {
          product: {
            select: { name: true }
          }
        }
      }
    }
  });
}
