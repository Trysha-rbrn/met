import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'secret'

export const register = async (req: Request, res: Response) => {
  const { email, password, name } = req.body
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) return res.status(400).json({ error: 'User already exists' })

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name
      }
    })

    // Seed initial categories for new user
    const incomeCategories = ['Salary', 'Family', 'Bonus']
    const expenseCategories = ['Rent', 'Groceries', 'Transport', 'Entertainment']

    await Promise.all([
      ...incomeCategories.map(name => prisma.category.create({ data: { name, type: 'INCOME', userId: user.id } })),
      ...expenseCategories.map(name => prisma.category.create({ data: { name, type: 'EXPENSE', userId: user.id } }))
    ])

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name }, token })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body
  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(400).json({ error: 'Invalid credentials' })

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) return res.status(400).json({ error: 'Invalid credentials' })

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ user: { id: user.id, email: user.email, name: user.name }, token })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export const getMe = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).userId },
      select: { id: true, email: true, name: true }
    })
    res.json(user)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export const updateUser = async (req: Request, res: Response) => {
  const userId = (req as any).userId
  const { name, password } = req.body
  try {
    const updateData: any = { name }
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, email: true, name: true }
    })
    res.json(user)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export const deleteUser = async (req: Request, res: Response) => {
  const userId = (req as any).userId
  try {
    // Delete all related data (Prisma can do this if onDelete is set, but manually here to be safe)
    await prisma.transaction.deleteMany({ where: { userId } })
    await prisma.category.deleteMany({ where: { userId } })
    await prisma.user.delete({ where: { id: userId } })
    res.json({ message: 'User and all related data deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}
