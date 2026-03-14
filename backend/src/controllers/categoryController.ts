import { NextFunction, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const toParamString = (value: unknown) => {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return undefined
}

export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
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
    next(error)
  }
}

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId
  const { name, type, parentId, icon } = req.body
  try {
    const category = await prisma.category.create({
      data: {
        name,
        icon: icon || 'Tag',
        type, 
        userId,
        parentId: parentId || null
      }
    })
    res.status(201).json(category)
  } catch (error) {
    next(error)
  }
}

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId
  const id = toParamString(req.params.id)
  const { name, type, parentId, icon } = req.body
  try {
    if (!id) {
      return res.status(400).json({ error: 'Category id is required.' })
    }

    // Check ownership
    const existing = await prisma.category.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) return res.status(403).json({ error: 'Unauthorized' })

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        icon: typeof icon !== 'undefined' ? icon : undefined,
        type,
        parentId: parentId || undefined
      }
    })
    res.json(category)
  } catch (error) {
    next(error)
  }
}

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId
  const id = toParamString(req.params.id)
  try {
    if (!id) {
      return res.status(400).json({ error: 'Category id is required.' })
    }

    const existing = await prisma.category.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) return res.status(403).json({ error: 'Unauthorized' })

    await prisma.category.delete({
      where: { id }
    })
    res.json({ message: 'Category deleted successfully' })
  } catch (error) {
    next(error)
  }
}
