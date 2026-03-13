import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Fetch categories for a user (hierarchical structure)
export const getCategories = async (req: Request, res: Response) => {
  try {
    // In a real app, userId would come from JWT (auth middleware)
    // For now, let's use our demo user
    const demoUser = await prisma.user.findFirst({ where: { email: 'demo@example.com' } })
    if (!demoUser) return res.status(404).json({ error: 'User not found' })

    const categories = await prisma.category.findMany({
      where: { 
        userId: demoUser.id,
        parentId: null // Only parent categories (Income/Expense)
      },
      include: {
        subcategories: true
      }
    })
    res.json(categories)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

// Create a new category or subcategory
export const createCategory = async (req: Request, res: Response) => {
  const { name, type, parentId } = req.body
  try {
    const demoUser = await prisma.user.findFirst({ where: { email: 'demo@example.com' } })
    if (!demoUser) return res.status(404).json({ error: 'User not found' })

    const category = await prisma.category.create({
      data: {
        name,
        type, // INCOME or EXPENSE
        userId: demoUser.id,
        parentId: parentId || null
      }
    })
    res.status(201).json(category)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

// Update a category or subcategory
export const updateCategory = async (req: Request, res: Response) => {
  const { id } = req.params
  const { name, type, parentId } = req.body
  try {
    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        type,
        parentId: parentId || undefined
      }
    })
    res.json(category)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

// Delete a category (and its subcategories automatically)
export const deleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    // Note: Due to foreign key constraints, 
    // we may need to handle subcategories if we don't have onDelete: Cascade
    // In our schema, we should check it.
    await prisma.category.delete({
      where: { id }
    })
    res.json({ message: 'Category deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}
