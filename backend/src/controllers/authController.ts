import { NextFunction, Request, Response } from 'express'
import { PrismaClient, Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { SignOptions } from 'jsonwebtoken'
import { env } from '../config/env.ts'

const prisma = new PrismaClient()

export const register = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password, name } = req.body
  try {
    // TODO(email-verification): Block login until user verifies email via tokenized link.
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) return res.status(400).json({ error: 'User already exists' })

    const hashedPassword = await bcrypt.hash(password, env.bcryptRounds)
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name
        }
      })

      // Seed initial categories for new user
      const incomeCategories: Array<{ name: string; icon: string }> = [
        { name: 'Salary', icon: 'Wallet' },
        { name: 'Family', icon: 'HeartHandshake' },
        { name: 'Bonus', icon: 'Sparkles' }
      ]
      const expenseCategories: Array<{ name: string; icon: string }> = [
        { name: 'Rent', icon: 'House' },
        { name: 'Groceries', icon: 'ShoppingCart' },
        { name: 'Transport', icon: 'Car' },
        { name: 'Entertainment', icon: 'Gamepad2' }
      ]

      await Promise.all([
        ...incomeCategories.map((category) => tx.category.create({
          data: { name: category.name, icon: category.icon, type: 'INCOME', userId: createdUser.id }
        })),
        ...expenseCategories.map((category) => tx.category.create({
          data: { name: category.name, icon: category.icon, type: 'EXPENSE', userId: createdUser.id }
        }))
      ])

      // Create default bank-like account
      await tx.account.create({
        data: {
          name: 'Primary',
          userId: createdUser.id
        }
      })

      return createdUser
    })

    const token = jwt.sign(
      { userId: user.id, sid: env.serverInstanceId },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'] }
    )
    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name }, token })
  } catch (error) {
    next(error)
  }
}

export const login = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body
  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(400).json({ error: 'Invalid credentials' })

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) return res.status(400).json({ error: 'Invalid credentials' })

    const token = jwt.sign(
      { userId: user.id, sid: env.serverInstanceId },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'] }
    )
    res.json({ user: { id: user.id, email: user.email, name: user.name }, token })
  } catch (error) {
    next(error)
  }
}

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).userId },
      select: { id: true, email: true, name: true }
    })
    res.json(user)
  } catch (error) {
    next(error)
  }
}

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId
  const { name, currentPassword, newPassword } = req.body
  try {
    const updateData: Prisma.UserUpdateInput = {}

    if (typeof name !== 'undefined') {
      updateData.name = name
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required.' })
      }

      const existingUser = await prisma.user.findUnique({ where: { id: userId } })
      if (!existingUser) return res.status(404).json({ error: 'User not found' })

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, existingUser.password)
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ error: 'Current password is incorrect.' })
      }

      updateData.password = await bcrypt.hash(newPassword, env.bcryptRounds)
      // TODO(email): Send password changed notification email to user.
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, email: true, name: true }
    })
    res.json(user)
  } catch (error) {
    next(error)
  }
}

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId
  const { password } = req.body
  try {
    if (!password) {
      return res.status(400).json({ error: 'Password is required to delete account.' })
    }

    const existingUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!existingUser) return res.status(404).json({ error: 'User not found' })

    const isPasswordValid = await bcrypt.compare(password, existingUser.password)
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Password is incorrect.' })
    }

    // Delete all related data (Prisma can do this if onDelete is set, but manually here to be safe)
    await prisma.transaction.deleteMany({ where: { userId } })
    await prisma.account.deleteMany({ where: { userId } })
    await prisma.category.deleteMany({ where: { userId } })
    await prisma.user.delete({ where: { id: userId } })
    res.json({ message: 'User and all related data deleted successfully' })
  } catch (error) {
    next(error)
  }
}
