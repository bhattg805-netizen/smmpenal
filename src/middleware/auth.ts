import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { syncUserToSupabase } from '../lib/supabase.ts';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    uid: string;
    email: string;
    name: string | null;
    role: string;
    balance: number;
    status: string;
    customProviderUrl: string | null;
    customProviderKey: string | null;
    apiKey: string | null;
  };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;
    const email = decodedToken.email || '';
    const name = decodedToken.name || email.split('@')[0];

    // Find or create the user in Cloud SQL
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);

    let dbUser;
    if (existing.length > 0) {
      dbUser = existing[0];
      // If they are the primary admin and somehow not an admin role, ensure they are elevated
      if (email.toLowerCase() === 'bhattg805@gmail.com') {
        if (dbUser.role !== 'admin') {
          const [updatedUser] = await db
            .update(users)
            .set({ role: 'admin' })
            .where(eq(users.id, dbUser.id))
            .returning();
          dbUser = updatedUser;
        }
      } else {
        // Demote any other users who have 'admin' role in the DB to 'user' role
        if (dbUser.role === 'admin') {
          const [updatedUser] = await db
            .update(users)
            .set({ role: 'user' })
            .where(eq(users.id, dbUser.id))
            .returning();
          dbUser = updatedUser;
        }
      }
    } else {
      // Primary admin email gets admin, all other new users default to 'user'
      const roleToSet = email.toLowerCase() === 'bhattg805@gmail.com' ? 'admin' : 'user';

      const result = await db.insert(users)
        .values({
          uid,
          email,
          name,
          role: roleToSet,
          balance: 0.0, // Start with zero balance
        })
        .returning();
      dbUser = result[0];
    }

    req.user = dbUser;
    
    // Sync user details to Supabase in the background
    syncUserToSupabase({
      uid: dbUser.uid,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      balance: dbUser.balance,
      status: dbUser.status,
    }).catch(err => console.error('[Supabase Background Error]', err));

    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  await requireAuth(req, res, () => {
    if (req.user?.role !== 'admin' || req.user?.email.toLowerCase() !== 'bhattg805@gmail.com') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    next();
  });
};
