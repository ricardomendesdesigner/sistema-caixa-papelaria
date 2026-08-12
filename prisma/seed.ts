import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  // Create generic User (Cashier)
  const user = await prisma.user.upsert({
    where: { email: 'master@master.com' },
    update: {},
    create: {
      email: 'master@master.com',
      name: 'Caixa Padrão',
      password: 'masterpassword',
      role: 'CASHIER'
    },
  })

  // Create Category
  const category = await prisma.category.upsert({
    where: { name: 'Bebidas' },
    update: {},
    create: {
      name: 'Bebidas'
    }
  })

  // Create Products
  await prisma.product.upsert({
    where: { barcode: '7891234567890' },
    update: {},
    create: {
      name: 'Coca-Cola 2L',
      barcode: '7891234567890',
      price: 9.50,
      cost: 5.00,
      stock: 50,
      category: { connect: { id: category.id } },
      imageUrl: '/coke.jpg'
    }
  })

  await prisma.product.upsert({
    where: { barcode: '123' },
    update: {},
    create: {
      name: 'Água Mineral 500ml',
      barcode: '123',
      price: 3.00,
      cost: 1.00,
      stock: 100,
      category: { connect: { id: category.id } },
      imageUrl: '/water.jpg'
    }
  })

  // Create Customer
  await prisma.customer.upsert({
    where: { cpf: '12345678900' },
    update: {},
    create: {
      name: 'Cliente Padrão',
      cpf: '12345678900',
      email: 'cliente@teste.com'
    }
  })

  console.log('Seed concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
