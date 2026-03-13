import { PrismaClient, TransactionType } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding categories...')

  // This is a placeholder user
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      password: 'hashed_password_here',
      name: 'Demo User',
    },
  })

  const incomeCategories = [
    { name: 'Plata', subcategories: ['Bonus', 'Prekovremeno'] },
    { name: 'Porodica', subcategories: ['Poklon', 'Džeparac'] },
  ]

  const expenseCategories = [
    { name: 'Kirija', subcategories: ['Struja', 'Voda', 'Internet'] },
    { name: 'Izlazak u kafić', subcategories: ['Kafa', 'Piće', 'Hrana u restoranu'] },
    { name: 'Transport', subcategories: ['Gorivo', 'Autobus', 'Taxi'] },
    { name: 'Naručivanje hrane online', subcategories: ['Glovo', 'Wolt'] },
  ]

  // Seed Income
  for (const cat of incomeCategories) {
    const parent = await prisma.category.create({
      data: {
        name: cat.name,
        type: TransactionType.INCOME,
        userId: user.id,
      },
    })

    for (const sub of cat.subcategories) {
      await prisma.category.create({
        data: {
          name: sub,
          type: TransactionType.INCOME,
          userId: user.id,
          parentId: parent.id,
        },
      })
    }
  }

  // Seed Expenses
  for (const cat of expenseCategories) {
    const parent = await prisma.category.create({
      data: {
        name: cat.name,
        type: TransactionType.EXPENSE,
        userId: user.id,
      },
    })

    for (const sub of cat.subcategories) {
      await prisma.category.create({
        data: {
          name: sub,
          type: TransactionType.EXPENSE,
          userId: user.id,
          parentId: parent.id,
        },
      })
    }
  }

  console.log('Seeding completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
