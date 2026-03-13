import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const getCategories = async (req: Request, res: Response) => {
  const userId = (req as any).userId
  try {
    const categories = await prisma.category.findMany({
      where: { 
        userId,
        parentId: null 
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

export const createCategory = async (req: Request, res: Response) => {
  const userId = (req as any).userId
  const { name, type, parentId } = req.body
  try {
    const category = await prisma.category.create({
      data: {
        name,
        type, 
        userId,
        parentId: parentId || null
      }
    })
    res.status(201).json(category)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export const updateCategory = async (req: Request, res: Response) => {
  const userId = (req as any).userId
  const { id } = req.params
  const { name, type, parentId } = req.body
  try {
    // Check ownership
    const existing = await prisma.category.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) return res.status(403).json({ error: 'Unauthorized' })

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

export const deleteCategory = async (req: Request, res: Response) => {
  const userId = (req as any).userId
  const { id } = req.params
  try {
    const existing = await prisma.category.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) return res.status(403).json({ error: 'Unauthorized' })

    await prisma.category.delete({
      where: { id }
    })
    res.json({ message: 'Category deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}
