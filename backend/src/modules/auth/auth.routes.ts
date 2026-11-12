import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { Role, Specialization } from '@prisma/client';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-clinic-key';

// GET /api/auth/users-by-role?role=RECEPTIONIST
router.get('/users-by-role', async (req: Request, res: Response) => {
  try {
    const { role } = req.query;
    const where: any = { isActive: true };

    if (role === 'RECEPTIONIST') {
      where.role = Role.RECEPTIONIST;
    } else if (role === 'DOCTOR') {
      where.role = { in: [Role.DOCTOR_DENTAL, Role.DOCTOR_ORTHO] };
    } else if (role === 'ADMIN') {
      where.role = Role.ADMIN;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        doctorProfile: {
          select: {
            id: true,
            specialization: true,
            consultationFee: true,
            licenseNumber: true,
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/login
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        doctorProfile: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        doctorId: user.doctorProfile?.id,
        specialization: user.doctorProfile?.specialization,
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        doctorProfile: user.doctorProfile,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    res.status(500).json({ success: false, message: err.message || 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      include: {
        doctorProfile: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        doctorProfile: user.doctorProfile,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// ADMIN USER CREATION & MANAGEMENT
// ==========================================
// GET /api/auth/admin/users
router.get('/admin/users', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: { doctorProfile: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/admin/users - Admin creates Receptionist or Doctor
const createUserSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  role: z.enum(['RECEPTIONIST', 'DOCTOR_DENTAL', 'DOCTOR_ORTHO', 'ADMIN']),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  specialization: z.enum(['DENTAL', 'ORTHOPEDIC']).optional().nullable(),
  consultationFee: z.number().min(0).optional(),
  licenseNumber: z.string().optional().nullable(),
});

router.post('/admin/users', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const data = createUserSchema.parse(req.body);

    // Check unique username
    const existing = await prisma.user.findUnique({
      where: { username: data.username.toLowerCase().trim() },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Username is already taken. Please choose another.' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: data.username.toLowerCase().trim(),
          passwordHash,
          fullName: data.fullName,
          email: data.email || null,
          phone: data.phone || null,
          role: data.role as Role,
        },
      });

      if (data.role === 'DOCTOR_DENTAL' || data.role === 'DOCTOR_ORTHO') {
        const spec = (data.specialization as Specialization) || (data.role === 'DOCTOR_DENTAL' ? Specialization.DENTAL : Specialization.ORTHOPEDIC);
        await tx.doctor.create({
          data: {
            userId: user.id,
            specialization: spec,
            consultationFee: data.consultationFee !== undefined && data.consultationFee !== null ? Number(data.consultationFee) : (spec === 'DENTAL' ? 600 : 800),
            licenseNumber: data.licenseNumber || null,
          },
        });
      }

      return tx.user.findUnique({
        where: { id: user.id },
        include: { doctorProfile: true },
      });
    });

    res.status(201).json({
      success: true,
      message: `User ${newUser?.fullName} created successfully`,
      user: newUser,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/auth/admin/users/:id - Deactivate or remove user
router.delete('/admin/users/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
    res.json({ success: true, message: 'User deactivated' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
