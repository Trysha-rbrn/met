import { NextFunction, Request, Response } from 'express'
import { PrismaClient, UserRole } from '@prisma/client'
import { writeAuditLog } from '../lib/auditLog.ts'

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
  const userRole = (req as any).userRole as UserRole
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
    await writeAuditLog({
      actorUserId: userId,
      actorRole: userRole,
      targetUserId: userId,
      action: 'CATEGORY_CREATE',
      details: { categoryId: category.id, name: category.name, type: category.type }
    })
    res.status(201).json(category)
  } catch (error) {
    next(error)
  }
}

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId
  const userRole = (req as any).userRole as UserRole
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
    await writeAuditLog({
      actorUserId: userId,
      actorRole: userRole,
      targetUserId: userId,
      action: 'CATEGORY_UPDATE',
      details: { categoryId: category.id }
    })
    res.json(category)
  } catch (error) {
    next(error)
  }
}

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId
  const userRole = (req as any).userRole as UserRole
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
    await writeAuditLog({
      actorUserId: userId,
      actorRole: userRole,
      targetUserId: userId,
      action: 'CATEGORY_DELETE',
      details: { categoryId: id, categoryName: existing.name }
    })
    res.json({ message: 'Category deleted successfully' })
  } catch (error) {
    next(error)
  }
}
