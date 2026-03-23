import { NextFunction, Request, Response } from 'express'
import { UserRole } from '@prisma/client'
import { writeAuditLog } from '../lib/auditLog.ts'
import { prisma } from '../lib/prisma.ts'
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

const resolveMonthStart = (month: string) => new Date(`${month}-01T00:00:00.000Z`)

export const getBudgetGoals = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId as string
  const month = String(req.query.month)

  try {
    const monthStart = resolveMonthStart(month)
    const goals = await prisma.budgetGoal.findMany({
      where: { userId, monthStart },
      include: {
        category: {
          select: { id: true, name: true, icon: true, type: true, parentId: true }
        }
      },
      orderBy: {
        category: { name: 'asc' }
      }
    })

    res.json(goals)
  } catch (error) {
    next(error)
  }
}

export const createBudgetGoal = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId as string
  const userRole = (req as any).userRole as UserRole
  const { categoryId, month, amount } = req.body as { categoryId: string; month: string; amount: number }

  try {
    const category = await prisma.category.findUnique({ where: { id: categoryId } })
    if (!category || category.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized category.' })
    }

    if (category.type !== 'EXPENSE') {
      return res.status(400).json({ error: 'Budget goals can only be set for expense categories.' })
    }

    const monthStart = resolveMonthStart(month)
    const goal = await prisma.budgetGoal.upsert({
      where: {
        userId_categoryId_monthStart: {
          userId,
          categoryId,
          monthStart
        }
      },
      update: { amount },
      create: {
        userId,
        categoryId,
        monthStart,
        amount
      },
      include: {
        category: {
          select: { id: true, name: true, icon: true, type: true, parentId: true }
        }
      }
    })

    await writeAuditLog({
      actorUserId: userId,
      actorRole: userRole,
      targetUserId: userId,
      action: 'BUDGET_GOAL_UPSERT',
      details: { budgetGoalId: goal.id, categoryId, month, amount }
    })

    res.status(201).json(goal)
  } catch (error) {
    next(error)
  }
}

export const updateBudgetGoal = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId as string
  const userRole = (req as any).userRole as UserRole
  const id = String(req.params.id)
  const amount = Number(req.body.amount)

  try {
    const existing = await prisma.budgetGoal.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized budget goal.' })
    }

    const updated = await prisma.budgetGoal.update({
      where: { id },
      data: { amount },
      include: {
        category: {
          select: { id: true, name: true, icon: true, type: true, parentId: true }
        }
      }
    })

    await writeAuditLog({
      actorUserId: userId,
      actorRole: userRole,
      targetUserId: userId,
      action: 'BUDGET_GOAL_UPDATE',
      details: { budgetGoalId: id, amount }
    })

    res.json(updated)
  } catch (error) {
    next(error)
  }
}

export const deleteBudgetGoal = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId as string
  const userRole = (req as any).userRole as UserRole
  const id = String(req.params.id)

  try {
    const existing = await prisma.budgetGoal.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized budget goal.' })
    }

    await prisma.budgetGoal.delete({ where: { id } })

    await writeAuditLog({
      actorUserId: userId,
      actorRole: userRole,
      targetUserId: userId,
      action: 'BUDGET_GOAL_DELETE',
      details: { budgetGoalId: id }
    })

    res.json({ message: 'Budget goal deleted successfully.' })
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

export const getCategoryRules = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId as string
  try {
    const rules = await prisma.categoryRule.findMany({
      where: { userId },
      include: {
        category: {
          select: { id: true, name: true, icon: true, type: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    })
    res.json(rules)
  } catch (error) {
    next(error)
  }
}

export const createCategoryRule = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId as string
  const userRole = (req as any).userRole as UserRole
  const { keyword, categoryId, isActive } = req.body as { keyword: string; categoryId: string; isActive: boolean }

  try {
    const category = await prisma.category.findUnique({ where: { id: categoryId } })
    if (!category || category.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized category.' })
    }

    const rule = await prisma.categoryRule.create({
      data: {
        userId,
        keyword,
        categoryId,
        isActive
      },
      include: {
        category: {
          select: { id: true, name: true, icon: true, type: true }
        }
      }
    })

    await writeAuditLog({
      actorUserId: userId,
      actorRole: userRole,
      targetUserId: userId,
      action: 'CATEGORY_RULE_CREATE',
      details: { ruleId: rule.id, keyword: rule.keyword, categoryId }
    })

    res.status(201).json(rule)
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002') {
      return res.status(400).json({ error: 'Rule with this keyword already exists.' })
    }
    next(error)
  }
}

export const updateCategoryRule = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId as string
  const userRole = (req as any).userRole as UserRole
  const ruleId = String(req.params.id)
  const { keyword, categoryId, isActive } = req.body as { keyword?: string; categoryId?: string; isActive?: boolean }

  try {
    const existing = await prisma.categoryRule.findUnique({ where: { id: ruleId } })
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: 'Rule not found.' })
    }

    if (categoryId) {
      const category = await prisma.category.findUnique({ where: { id: categoryId } })
      if (!category || category.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized category.' })
      }
    }

    const updated = await prisma.categoryRule.update({
      where: { id: ruleId },
      data: {
        keyword,
        categoryId,
        isActive
      },
      include: {
        category: {
          select: { id: true, name: true, icon: true, type: true }
        }
      }
    })

    await writeAuditLog({
      actorUserId: userId,
      actorRole: userRole,
      targetUserId: userId,
      action: 'CATEGORY_RULE_UPDATE',
      details: { ruleId: updated.id }
    })

    res.json(updated)
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002') {
      return res.status(400).json({ error: 'Rule with this keyword already exists.' })
    }
    next(error)
  }
}

export const deleteCategoryRule = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId as string
  const userRole = (req as any).userRole as UserRole
  const ruleId = String(req.params.id)

  try {
    const existing = await prisma.categoryRule.findUnique({ where: { id: ruleId } })
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: 'Rule not found.' })
    }

    await prisma.categoryRule.delete({ where: { id: ruleId } })

    await writeAuditLog({
      actorUserId: userId,
      actorRole: userRole,
      targetUserId: userId,
      action: 'CATEGORY_RULE_DELETE',
      details: { ruleId }
    })

    res.json({ message: 'Rule deleted successfully.' })
  } catch (error) {
    next(error)
  }
}
