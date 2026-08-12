const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv/config');

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // Ordem importa por causa das foreign keys
  const del1 = await prisma.transaction.deleteMany({});
  console.log(`❌ Transações removidas: ${del1.count}`);

  const del2 = await prisma.accountReceivable.deleteMany({});
  console.log(`❌ Contas a Receber removidas: ${del2.count}`);

  const del3 = await prisma.accountPayable.deleteMany({});
  console.log(`❌ Contas a Pagar removidas: ${del3.count}`);

  const del4 = await prisma.saleItem.deleteMany({});
  console.log(`❌ Itens de Venda removidos: ${del4.count}`);

  const del5 = await prisma.sale.deleteMany({});
  console.log(`❌ Vendas removidas: ${del5.count}`);

  console.log('\n✅ Tudo zerado com sucesso!');

  await prisma.$disconnect();
  await pool.end();
}

run().catch(console.error);
