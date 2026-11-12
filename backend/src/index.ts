import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { initSocketIO } from './sockets';
import { prisma } from './config/prisma';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import patientRoutes from './modules/patients/patient.routes';
import appointmentRoutes from './modules/appointments/appointment.routes';
import clinicalNotesRoutes from './modules/clinical-notes/clinical-notes.routes';
import consultationBillingRoutes from './modules/billing/consultation-billing.routes';
import operationBillingRoutes from './modules/billing/operation-billing.routes';
import pharmacyRoutes from './modules/pharmacy/pharmacy.routes';
import operationRoutes from './modules/operations/operations.routes';
import reportsRoutes from './modules/reports/reports.routes';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Socket.io initialization
initSocketIO(server, CORS_ORIGIN);

// Middleware
app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan('dev'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/clinical-notes', clinicalNotesRoutes);
app.use('/api/billing/consultation', consultationBillingRoutes);
app.use('/api/billing/procedure', operationBillingRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/procedures', operationRoutes);
app.use('/api/reports', reportsRoutes);

// Health Route
app.get('/api/health', async (req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (err: any) {
    dbStatus = `error: ${err.message}`;
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Dental & Orthopedic Clinic Management API',
    database: dbStatus,
  });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[API Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

server.listen(PORT, () => {
  console.log(`[Clinic Server] Running on http://localhost:${PORT}`);
});
