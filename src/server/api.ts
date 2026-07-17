import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/index.ts';
import {
  users,
  categories,
  services,
  orders,
  payments,
  coupons,
  tickets,
  ticketMessages,
  announcements,
  activityLogs,
  affiliates,
  referrals,
  favoriteServices,
  providers,
  childPanels,
  refillRequests,
  settings,
  blogs,
} from '../db/schema.ts';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth.ts';
import { eq, and, desc, sql, or, inArray } from 'drizzle-orm';
import { syncUserToSupabase, getSupabaseSyncStats } from '../lib/supabase.ts';

const router = Router();

// Helper to log user actions
async function logActivity(userId: number | null, action: string, details: string, ip: string | null) {
  try {
    await db.insert(activityLogs).values({
      userId,
      action,
      details,
      ipAddress: ip || 'unknown',
    });
  } catch (err) {
    console.error('Failed to write activity log:', err);
  }
}

const DEFAULT_SETTINGS: Record<string, string> = {
  websiteLogo: '',
  favicon: '',
  websiteName: 'Premium SMM Panel',
  defaultLanguage: 'English',
  homepageYoutubeId: '',
  addFundPageContent: '<div class="space-y-4"><p class="text-gray-300">You can add funds via Razorpay, PhonePe, Razorpay UPI, or Manual Payments.</p><p class="text-gray-300">Contact admin for manual payment approval.</p></div>',
  orderIdSkip: '0',
  seoKeywords: 'smm, social media marketing, buy likes, followers',
  seoDescription: 'The best social media marketing service provider.',
  headerCode: '',
  footerCode: '',
  headerCodeAfterLogin: '',
  whatsappNumber: '8795005604',
  activeTheme: 'default',
  bharatpePhone: '8795005604',
  bharatpeMerchantName: 'PRIYA',
  bharatpeVpa: 'BHARATPE2HOD0Q1Y4T29351@unitype',
  bharatpeStatus: 'linked',
  bharatpeQrUrl: '',
  stripeStatus: 'enabled',
  paypalStatus: 'enabled',
  usdManualStatus: 'enabled',
  stripePublishableKey: '',
  stripeSecretKey: '',
  paypalClientId: '',
  paypalSecretKey: '',
  phonepeStatus: 'enabled',
  razorpayStatus: 'enabled',
  upiStatus: 'enabled',
  inrStripeStatus: 'enabled',
  inrManualStatus: 'enabled',
  upiDirectVpa: 'admin@upi',
  upiDirectMerchantName: 'SMM QR Business',
  upiDirectQrUrl: 'https://assets.gpay.com/images/default_upi_qr.png',
  phonepeMerchantId: '',
  phonepeSaltKey: '',
  phonepeSaltIndex: '1',
  razorpayKeyId: '',
  razorpayKeySecret: ''
};

async function getSettingsMap(): Promise<Record<string, string>> {
  try {
    const rows = await db.select().from(settings);
    const map = { ...DEFAULT_SETTINGS };
    rows.forEach(r => {
      map[r.key] = r.value;
    });
    return map;
  } catch (err) {
    console.error('Error fetching settings map:', err);
    return { ...DEFAULT_SETTINGS };
  }
}

// Ensure the PRIYA BharatPe details are synchronized in the database
async function initBharatpeSettings() {
  try {
    const keysToVerify = {
      bharatpeMerchantName: 'PRIYA',
      bharatpeVpa: 'BHARATPE2HOD0Q1Y4T29351@unitype',
      bharatpeStatus: 'linked',
      bharatpePhone: '8795005604'
    };

    for (const [key, value] of Object.entries(keysToVerify)) {
      const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
      if (existing.length > 0) {
        if (
          existing[0].value === '' || 
          existing[0].value === 'unlinked' || 
          existing[0].value === '9988776655@bharatpe' || 
          existing[0].value === 'BharatPe Merchant' ||
          existing[0].value === '9988776655'
        ) {
          await db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.key, key));
        }
      } else {
        await db.insert(settings).values({ key, value });
      }
    }
  } catch (error) {
    console.error('Error initializing BharatPe settings:', error);
  }
}
initBharatpeSettings();

async function getOrderIdOffset(): Promise<number> {
  try {
    const row = await db.select().from(settings).where(eq(settings.key, 'orderIdSkip')).limit(1);
    if (row.length > 0) {
      const val = parseInt(row[0].value, 10);
      return isNaN(val) ? 0 : val;
    }
  } catch (err) {
    console.error('Error getting orderIdSkip offset:', err);
  }
  return 0;
}

// Secure server-to-server SMM API Dispatcher
async function dispatchOrderToProvider(orderId: number) {
  try {
    const orderObj = await db
      .select({
        id: orders.id,
        link: orders.link,
        quantity: orders.quantity,
        serviceId: orders.serviceId,
        providerOrderId: orders.providerOrderId,
        userId: orders.userId,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (orderObj.length === 0) return;
    const ord = orderObj[0];

    const srv = await db
      .select({
        providerId: services.providerId,
        providerServiceId: services.providerServiceId,
      })
      .from(services)
      .where(eq(services.id, ord.serviceId))
      .limit(1);

    let apiUrl = '';
    let apiKey = '';
    let providerName = '';

    // Check if the user has configured custom provider API credentials
    let hasCustomProvider = false;
    if (ord.userId) {
      const userResult = await db
        .select({
          customProviderUrl: users.customProviderUrl,
          customProviderKey: users.customProviderKey,
        })
        .from(users)
        .where(eq(users.id, ord.userId))
        .limit(1);

      if (userResult.length > 0 && userResult[0].customProviderUrl && userResult[0].customProviderKey) {
        apiUrl = userResult[0].customProviderUrl;
        apiKey = userResult[0].customProviderKey;
        providerName = `User's Custom SMM Provider`;
        hasCustomProvider = true;
      }
    }

    if (!hasCustomProvider) {
      if (srv.length === 0 || !srv[0].providerId || !srv[0].providerServiceId) {
        return; // No provider linked
      }

      const prov = await db
        .select()
        .from(providers)
        .where(eq(providers.id, srv[0].providerId))
        .limit(1);

      if (prov.length === 0) return;
      apiUrl = prov[0].apiUrl;
      apiKey = prov[0].apiKey;
      providerName = prov[0].name;
    }

    const providerServiceId = srv[0]?.providerServiceId || '1';

    // Build standard SMM api parameters in x-www-form-urlencoded
    const params = new URLSearchParams();
    params.append('key', apiKey);
    params.append('action', 'add');
    params.append('service', providerServiceId);
    params.append('link', ord.link);
    params.append('quantity', String(ord.quantity));

    console.log(`[PROVIDER DISPATCH] Dispatching order #${orderId} to ${providerName} at ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP Error ${response.status}: ${text}`);
    }

    const data = await response.json();
    console.log(`[PROVIDER DISPATCH] Response received:`, data);

    if (data && (data.order || data.order_id)) {
      const pOrderId = String(data.order || data.order_id);
      await db
        .update(orders)
        .set({
          providerOrderId: pOrderId,
          status: 'processing',
        })
        .where(eq(orders.id, orderId));

      await logActivity(
        null,
        'API Provider Dispatch',
        `Successfully dispatched order #${orderId} to SMM Provider: ${providerName} (Provider Order ID: ${pOrderId})`,
        'system'
      );
    } else if (data && data.error) {
      throw new Error(data.error);
    } else {
      throw new Error(JSON.stringify(data) || 'No order ID returned from SMM provider.');
    }
  } catch (err: any) {
    console.error(`[PROVIDER DISPATCH FAILED] Order #${orderId}:`, err);
    await logActivity(
      null,
      'API Provider Dispatch Failed',
      `Failed to dispatch order #${orderId}. Reason: ${err.message || err}`,
      'system'
    );
  }
}

// Secure server-to-server SMM API Status Syncing
async function syncProviderOrders() {
  try {
    const activeOrders = await db
      .select({
        id: orders.id,
        providerOrderId: orders.providerOrderId,
        serviceId: orders.serviceId,
        userId: orders.userId,
      })
      .from(orders)
      .where(
        and(
          sql`${orders.providerOrderId} IS NOT NULL`,
          or(eq(orders.status, 'pending'), eq(orders.status, 'processing'))
        )
      );

    if (activeOrders.length === 0) return { synced: 0 };

    let syncedCount = 0;

    for (const ord of activeOrders) {
      if (!ord.providerOrderId) continue;

      let apiUrl = '';
      let apiKey = '';
      let hasCustomProvider = false;

      // Check if the user has custom provider configured
      if (ord.userId) {
        const userResult = await db
          .select({
            customProviderUrl: users.customProviderUrl,
            customProviderKey: users.customProviderKey,
          })
          .from(users)
          .where(eq(users.id, ord.userId))
          .limit(1);

        if (userResult.length > 0 && userResult[0].customProviderUrl && userResult[0].customProviderKey) {
          apiUrl = userResult[0].customProviderUrl;
          apiKey = userResult[0].customProviderKey;
          hasCustomProvider = true;
        }
      }

      if (!hasCustomProvider) {
        const srv = await db
          .select({ providerId: services.providerId })
          .from(services)
          .where(eq(services.id, ord.serviceId))
          .limit(1);

        if (srv.length === 0 || !srv[0].providerId) continue;

        const prov = await db
          .select()
          .from(providers)
          .where(eq(providers.id, srv[0].providerId))
          .limit(1);

        if (prov.length === 0) continue;
        apiUrl = prov[0].apiUrl;
        apiKey = prov[0].apiKey;
      }

      try {
        const params = new URLSearchParams();
        params.append('key', apiKey);
        params.append('action', 'status');
        params.append('order', ord.providerOrderId);

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        if (!response.ok) continue;

        const data = await response.json();
        if (data && data.status) {
          const rawStatus = String(data.status).toLowerCase();
          let internalStatus = 'processing';
          
          if (rawStatus.includes('complete')) {
            internalStatus = 'completed';
          } else if (rawStatus.includes('cancel')) {
            internalStatus = 'cancelled';
          } else if (rawStatus.includes('refund')) {
            internalStatus = 'refunded';
          } else if (rawStatus.includes('partial')) {
            internalStatus = 'partial';
          } else if (rawStatus.includes('pend')) {
            internalStatus = 'pending';
          } else if (rawStatus.includes('progress') || rawStatus.includes('process')) {
            internalStatus = 'processing';
          }

          const startCount = data.start_count ? parseInt(data.start_count) : 0;
          const remains = data.remains ? parseInt(data.remains) : 0;

          await db
            .update(orders)
            .set({
              status: internalStatus,
              startCount: isNaN(startCount) ? 0 : startCount,
              remains: isNaN(remains) ? 0 : remains,
            })
            .where(eq(orders.id, ord.id));

          syncedCount++;
        }
      } catch (err) {
        console.error(`Failed to sync provider order status for order ID ${ord.id}:`, err);
      }
    }

    return { synced: syncedCount };
  } catch (err) {
    console.error('Failed to sync provider orders:', err);
    throw err;
  }
}

// Global Cron Job state for background order status sync
export const cronState = {
  lastRun: null as Date | null,
  runCount: 0,
  status: 'idle' as 'idle' | 'running' | 'success' | 'failed',
  lastSyncedCount: 0,
  error: null as string | null,
  intervalMs: 120000, // Default to 2 minutes
  isActive: true,
};

let cronTimer: NodeJS.Timeout | null = null;

export function startOrderSyncCron() {
  if (cronTimer) {
    clearInterval(cronTimer);
  }

  const runSync = async () => {
    if (!cronState.isActive) return;
    if (cronState.status === 'running') return;

    cronState.status = 'running';
    try {
      console.log('[CRON] Starting background order status sync...');
      const result = await syncProviderOrders();
      cronState.lastRun = new Date();
      cronState.runCount++;
      cronState.status = 'success';
      cronState.lastSyncedCount = result?.synced || 0;
      cronState.error = null;
      console.log(`[CRON] Background order sync completed. Synced: ${cronState.lastSyncedCount}`);
    } catch (err: any) {
      console.error('[CRON] Background order sync failed:', err);
      cronState.lastRun = new Date();
      cronState.status = 'failed';
      cronState.error = err?.message || String(err);
    }
  };

  cronTimer = setInterval(runSync, cronState.intervalMs);
  
  // Also run once immediately after 10 seconds of server startup
  setTimeout(() => {
    runSync().catch(err => console.error('[CRON] Initial background sync error:', err));
  }, 10000);
}

// Start cron immediately on server startup
startOrderSyncCron();

// ==========================================
// PUBLIC ENDPOINTS
// ==========================================

// Get services for landing page
router.get('/services/public', async (req, res) => {
  try {
    const list = await db
      .select({
        id: services.id,
        name: services.name,
        description: services.description,
        pricePerThousand: services.pricePerThousand,
        minAmount: services.minAmount,
        maxAmount: services.maxAmount,
        status: services.status,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        icon: services.icon,
      })
      .from(services)
      .innerJoin(categories, eq(services.categoryId, categories.id))
      .where(eq(services.status, 'active'))
      .orderBy(categories.sortOrder, services.id);
    res.json(list);
  } catch (error) {
    console.error('Error fetching public services:', error);
    res.status(500).json({ error: 'Failed to retrieve services.' });
  }
});

// ==========================================
// USER DASHBOARD ENDPOINTS
// ==========================================

// Get Current User Profile & Balance
router.get('/user/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

// Toggle User's Role (Developer/Tester feature)
router.post('/user/toggle-role', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    
    // Only allow role toggling for the primary admin email
    if (req.user.email.toLowerCase() !== 'bhattg805@gmail.com') {
      return res.status(403).json({ error: 'Forbidden: Only the primary administrator can toggle roles.' });
    }

    const newRole = req.user.role === 'admin' ? 'user' : 'admin';
    
    await db
      .update(users)
      .set({ role: newRole })
      .where(eq(users.id, req.user.id));
      
    await logActivity(req.user.id, 'Toggle Role', `Toggled user role to ${newRole}`, req.ip);
    
    res.json({ success: true, newRole });
  } catch (error) {
    console.error('Failed to toggle role:', error);
    res.status(500).json({ error: 'Failed to toggle role.' });
  }
});

// Update User's Custom SMM Provider Details
router.post('/user/custom-provider', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { customProviderUrl, customProviderKey } = req.body;

    await db
      .update(users)
      .set({
        customProviderUrl: customProviderUrl || null,
        customProviderKey: customProviderKey || null,
      })
      .where(eq(users.id, req.user.id));

    await logActivity(
      req.user.id,
      'Update Custom Provider',
      `Updated custom API provider URL to: ${customProviderUrl || 'none'}`,
      req.ip
    );

    res.json({
      success: true,
      customProviderUrl: customProviderUrl || null,
      customProviderKey: customProviderKey || null,
    });
  } catch (error) {
    console.error('Failed to update custom provider details:', error);
    res.status(500).json({ error: 'Failed to update custom provider details.' });
  }
});

// ==========================================
// RESELLER SMM API (V1) ENDPOINTS
// ==========================================

// Generate or Regenerate API Key
router.post('/user/generate-api-key', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    
    const newApiKey = crypto.randomBytes(32).toString('hex');
    
    await db
      .update(users)
      .set({ apiKey: newApiKey })
      .where(eq(users.id, req.user.id));
      
    await logActivity(req.user.id, 'Generate API Key', 'Generated a new API key', req.ip);
    
    res.json({ success: true, apiKey: newApiKey });
  } catch (error) {
    console.error('Failed to generate API Key:', error);
    res.status(500).json({ error: 'Failed to generate API Key.' });
  }
});

// Reseller v1 API Endpoint (SMM standard)
router.all('/v1', async (req, res) => {
  try {
    const key = req.body?.key || req.query?.key;
    const action = req.body?.action || req.query?.action;

    if (!key) {
      return res.status(400).json({ error: 'Invalid API key' });
    }

    // Authenticate user via API key
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.apiKey, String(key)))
      .limit(1);

    if (userResult.length === 0) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const apiUser = userResult[0];

    if (apiUser.status !== 'active') {
      return res.status(403).json({ error: 'Your account is suspended' });
    }

    if (!action) {
      return res.status(400).json({ error: 'Missing action parameter. Supported actions: balance, services, add, status' });
    }

    switch (action) {
      case 'balance': {
        return res.json({
          balance: apiUser.balance.toFixed(4),
          currency: 'USD'
        });
      }

      case 'services': {
        const activeServices = await db
          .select({
            id: services.id,
            name: services.name,
            description: services.description,
            pricePerThousand: services.pricePerThousand,
            minAmount: services.minAmount,
            maxAmount: services.maxAmount,
            categoryName: categories.name,
          })
          .from(services)
          .innerJoin(categories, eq(services.categoryId, categories.id))
          .where(eq(services.status, 'active'));

        const responseServices = activeServices.map(srv => {
          // Adjust rate for user's customRate if applicable
          const rate = srv.pricePerThousand * apiUser.customRate;
          return {
            service: srv.id.toString(),
            name: srv.name,
            type: 'Default',
            category: srv.categoryName,
            rate: rate.toFixed(4),
            min: srv.minAmount.toString(),
            max: srv.maxAmount.toString(),
            refill: false,
            description: srv.description || ''
          };
        });

        return res.json(responseServices);
      }

      case 'add': {
        const service = req.body?.service || req.query?.service;
        const link = req.body?.link || req.query?.link;
        const quantity = req.body?.quantity || req.query?.quantity;

        if (!service || !link || !quantity) {
          return res.status(400).json({ error: 'Missing required parameters: service, link, quantity' });
        }

        const srvId = Number(service);
        const qty = Number(quantity);

        if (isNaN(srvId) || isNaN(qty)) {
          return res.status(400).json({ error: 'Invalid service or quantity parameters' });
        }

        // Fetch service details
        const sResult = await db
          .select()
          .from(services)
          .where(eq(services.id, srvId))
          .limit(1);

        if (sResult.length === 0 || sResult[0].status !== 'active') {
          return res.status(400).json({ error: 'Service is unavailable' });
        }

        const s = sResult[0];

        if (qty < s.minAmount || qty > s.maxAmount) {
          return res.status(400).json({ error: `Quantity must be between ${s.minAmount} and ${s.maxAmount}` });
        }

        // Calculate custom charged price
        const rate = s.pricePerThousand * apiUser.customRate;
        const charge = (qty / 1000) * rate;

        if (apiUser.balance < charge) {
          return res.status(400).json({ error: 'Insufficient funds' });
        }

        // Deduct balance
        const newBalance = apiUser.balance - charge;
        await db
          .update(users)
          .set({ balance: newBalance })
          .where(eq(users.id, apiUser.id));

        // Create the order
        const orderResult = await db
          .insert(orders)
          .values({
            userId: apiUser.id,
            serviceId: s.id,
            link: String(link),
            quantity: qty,
            charge: charge,
            status: 'pending',
            startCount: Math.floor(Math.random() * 5000), // simulate initial count
            remains: qty,
          })
          .returning();

        const createdOrder = orderResult[0];

        await logActivity(
          apiUser.id,
          'API Place Order',
          `Ordered service ID: ${s.id} via API for charge: $${charge.toFixed(4)}`,
          req.ip
        );

        // Forward to actual SMM provider asynchronously
        dispatchOrderToProvider(createdOrder.id).catch(err => {
          console.error('[RESELLER API ERROR] Async dispatch failed:', err);
        });

        return res.json({
          order: createdOrder.id.toString()
        });
      }

      case 'status': {
        const order = req.body?.order || req.query?.order;
        const multiOrders = req.body?.orders || req.query?.orders;

        if (order) {
          const ordId = Number(order);
          if (isNaN(ordId)) {
            return res.status(400).json({ error: 'Invalid order parameter' });
          }

          const oResult = await db
            .select()
            .from(orders)
            .where(and(eq(orders.id, ordId), eq(orders.userId, apiUser.id)))
            .limit(1);

          if (oResult.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
          }

          const o = oResult[0];
          return res.json({
            charge: o.charge.toFixed(4),
            start_count: o.startCount.toString(),
            status: o.status.toUpperCase(),
            remains: o.remains.toString(),
            currency: 'USD'
          });
        } else if (multiOrders) {
          const ids = String(multiOrders)
            .split(',')
            .map(id => Number(id.trim()))
            .filter(id => !isNaN(id));

          if (ids.length === 0) {
            return res.status(400).json({ error: 'No valid order IDs provided' });
          }

          // Fetch orders for this user
          const oResults = await db
            .select()
            .from(orders)
            .where(and(sql`${orders.id} IN (${sql.join(ids, sql`, `)})`, eq(orders.userId, apiUser.id)));

          const statusMap: Record<string, any> = {};
          for (const o of oResults) {
            statusMap[o.id.toString()] = {
              charge: o.charge.toFixed(4),
              start_count: o.startCount.toString(),
              status: o.status.toUpperCase(),
              remains: o.remains.toString(),
              currency: 'USD'
            };
          }

          // Return errors for IDs not found
          for (const id of ids) {
            const idStr = id.toString();
            if (!statusMap[idStr]) {
              statusMap[idStr] = { error: 'Order not found' };
            }
          }

          return res.json(statusMap);
        } else {
          return res.status(400).json({ error: 'Missing order or orders parameter' });
        }
      }

      default: {
        return res.status(400).json({ error: 'Invalid action parameter. Supported actions: balance, services, add, status' });
      }
    }
  } catch (error) {
    console.error('Reseller API Error:', error);
    res.status(500).json({ error: 'Internal API Server Error' });
  }
});

// Get Active Announcements
router.get('/user/announcements', requireAuth, async (req: AuthRequest, res) => {
  try {
    const activeAnnouncements = await db
      .select()
      .from(announcements)
      .where(eq(announcements.status, 'active'))
      .orderBy(desc(announcements.createdAt));
    res.json(activeAnnouncements);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve announcements.' });
  }
});

// Get User's Services (categorized)
router.get('/user/categories', requireAuth, async (req: AuthRequest, res) => {
  try {
    const activeCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.status, 'active'))
      .orderBy(categories.sortOrder);
    res.json(activeCategories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve categories.' });
  }
});

router.get('/user/services', requireAuth, async (req: AuthRequest, res) => {
  try {
    const activeServices = await db
      .select({
        id: services.id,
        categoryId: services.categoryId,
        name: services.name,
        description: services.description,
        pricePerThousand: services.pricePerThousand,
        minAmount: services.minAmount,
        maxAmount: services.maxAmount,
        status: services.status,
        icon: services.icon,
      })
      .from(services)
      .where(eq(services.status, 'active'))
      .orderBy(services.id);
    res.json(activeServices);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve services.' });
  }
});

// Get User's Favorite Services
router.get('/user/favorites', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const favorites = await db
      .select({ serviceId: favoriteServices.serviceId })
      .from(favoriteServices)
      .where(eq(favoriteServices.userId, req.user.id));
    res.json(favorites.map(f => f.serviceId));
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve favorite services.' });
  }
});

// Toggle Favorite Service
router.post('/user/favorites/toggle', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { serviceId } = req.body;
    if (!serviceId) return res.status(400).json({ error: 'Service ID required' });

    const existing = await db
      .select()
      .from(favoriteServices)
      .where(
        and(
          eq(favoriteServices.userId, req.user.id),
          eq(favoriteServices.serviceId, Number(serviceId))
        )
      );

    if (existing.length > 0) {
      await db
        .delete(favoriteServices)
        .where(
          and(
            eq(favoriteServices.userId, req.user.id),
            eq(favoriteServices.serviceId, Number(serviceId))
          )
        );
      res.json({ favorited: false });
    } else {
      await db.insert(favoriteServices).values({
        userId: req.user.id,
        serviceId: Number(serviceId),
      });
      res.json({ favorited: true });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle favorite service.' });
  }
});

// Place New Order
router.post('/orders/new', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { serviceId, link, quantity, couponCode } = req.body;

    if (!serviceId || !link || !quantity) {
      return res.status(400).json({ error: 'Missing required parameters.' });
    }

    const service = await db
      .select()
      .from(services)
      .where(eq(services.id, Number(serviceId)))
      .limit(1);

    if (service.length === 0 || service[0].status !== 'active') {
      return res.status(400).json({ error: 'Service is unavailable.' });
    }

    const s = service[0];
    if (quantity < s.minAmount || quantity > s.maxAmount) {
      return res.status(400).json({ error: `Quantity must be between ${s.minAmount} and ${s.maxAmount}.` });
    }

    // Calculate charge
    let charge = (quantity / 1000) * s.pricePerThousand;

    // Apply Coupon Discount
    if (couponCode) {
      const coupon = await db
        .select()
        .from(coupons)
        .where(and(eq(coupons.code, couponCode), eq(coupons.status, 'active')))
        .limit(1);

      if (coupon.length > 0) {
        const discount = (charge * coupon[0].discountPercent) / 100;
        charge -= discount;
        // Increment coupon usage
        await db
          .update(coupons)
          .set({ usageCount: sql`${coupons.usageCount} + 1` })
          .where(eq(coupons.id, coupon[0].id));
      }
    }

    if (req.user.balance < charge) {
      return res.status(400).json({ error: 'Insufficient funds in your wallet.' });
    }

    // Deduct user balance
    const newBalance = req.user.balance - charge;
    await db
      .update(users)
      .set({ balance: newBalance })
      .where(eq(users.id, req.user.id));

    // Insert order
    const result = await db
      .insert(orders)
      .values({
        userId: req.user.id,
        serviceId: s.id,
        link,
        quantity,
        charge,
        status: 'pending',
        startCount: Math.floor(Math.random() * 5000), // simulated
        remains: quantity,
      })
      .returning();

    await logActivity(req.user.id, 'Place Order', `Ordered service ID: ${s.id} for charge: $${charge.toFixed(4)}`, req.ip);

    // Securely forward to external SMM provider if linked (runs in the background safely)
    dispatchOrderToProvider(result[0].id).catch(err => {
      console.error('[AUTO-DISPATCH ERROR] Async dispatch failed:', err);
    });

    res.json({
      success: true,
      message: 'Order placed successfully!',
      order: result[0],
      newBalance,
    });
  } catch (error) {
    console.error('New order error:', error);
    res.status(500).json({ error: 'Failed to place order.' });
  }
});

// Mass Order
router.post('/orders/mass', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { massInput } = req.body; // Expect lines format: service_id|quantity|link

    if (!massInput || typeof massInput !== 'string') {
      return res.status(400).json({ error: 'Invalid input format.' });
    }

    const lines = massInput.split('\n').filter(line => line.trim() !== '');
    const results = [];
    let totalCharge = 0;
    const ordersToInsert = [];

    for (const line of lines) {
      const parts = line.split('|');
      if (parts.length < 3) {
        results.push({ line, error: 'Invalid line format. Use: service_id|quantity|link' });
        continue;
      }

      const serviceId = parseInt(parts[0].trim());
      const quantity = parseInt(parts[1].trim());
      const link = parts[2].trim();

      if (isNaN(serviceId) || isNaN(quantity) || !link) {
        results.push({ line, error: 'Invalid parameters.' });
        continue;
      }

      const service = await db
        .select()
        .from(services)
        .where(eq(services.id, serviceId))
        .limit(1);

      if (service.length === 0 || service[0].status !== 'active') {
        results.push({ line, error: 'Service not active or not found.' });
        continue;
      }

      const s = service[0];
      if (quantity < s.minAmount || quantity > s.maxAmount) {
        results.push({ line, error: `Quantity must be between ${s.minAmount} and ${s.maxAmount}.` });
        continue;
      }

      const charge = (quantity / 1000) * s.pricePerThousand;
      totalCharge += charge;

      ordersToInsert.push({
        serviceId,
        link,
        quantity,
        charge,
        serviceName: s.name,
      });
    }

    if (ordersToInsert.length === 0) {
      return res.status(400).json({ error: 'No valid orders found in input.', results });
    }

    if (req.user.balance < totalCharge) {
      return res.status(400).json({ error: `Insufficient wallet balance. Total required: $${totalCharge.toFixed(4)}` });
    }

    // Deduct user balance
    const newBalance = req.user.balance - totalCharge;
    await db
      .update(users)
      .set({ balance: newBalance })
      .where(eq(users.id, req.user.id));

    // Insert orders
    for (const ord of ordersToInsert) {
      const inserted = await db
        .insert(orders)
        .values({
          userId: req.user.id,
          serviceId: ord.serviceId,
          link: ord.link,
          quantity: ord.quantity,
          charge: ord.charge,
          status: 'pending',
          startCount: Math.floor(Math.random() * 5000),
          remains: ord.quantity,
        })
        .returning();

      // Securely forward to external SMM provider if linked (runs in the background safely)
      dispatchOrderToProvider(inserted[0].id).catch(err => {
        console.error('[MASS-DISPATCH ERROR] Async dispatch failed:', err);
      });

      results.push({
        line: `${ord.serviceId}|${ord.quantity}|${ord.link}`,
        success: true,
        orderId: inserted[0].id,
        charge: ord.charge,
      });
    }

    await logActivity(req.user.id, 'Place Mass Orders', `Placed ${ordersToInsert.length} mass orders. Total charge: $${totalCharge.toFixed(4)}`, req.ip);

    res.json({
      success: true,
      results,
      newBalance,
    });
  } catch (error) {
    console.error('Mass order error:', error);
    res.status(500).json({ error: 'Failed to process mass orders.' });
  }
});

// Get User's Order History
router.get('/user/orders', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const userOrders = await db
      .select({
        id: orders.id,
        link: orders.link,
        quantity: orders.quantity,
        charge: orders.charge,
        status: orders.status,
        startCount: orders.startCount,
        remains: orders.remains,
        refillStatus: orders.refillStatus,
        createdAt: orders.createdAt,
        serviceName: services.name,
      })
      .from(orders)
      .innerJoin(services, eq(orders.serviceId, services.id))
      .where(eq(orders.userId, req.user.id))
      .orderBy(desc(orders.createdAt));

    const offset = await getOrderIdOffset();
    if (offset > 0) {
      userOrders.forEach(o => {
        o.id += offset;
      });
    }

    res.json(userOrders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve orders.' });
  }
});

// Request Order Refill
router.post('/orders/:id/refill', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const offset = await getOrderIdOffset();
    const orderId = parseInt(req.params.id) - offset;

    const orderObj = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, req.user.id)))
      .limit(1);

    if (orderObj.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (orderObj[0].status !== 'completed') {
      return res.status(400).json({ error: 'Only completed orders can be refilled.' });
    }

    await db
      .update(orders)
      .set({ refillStatus: 'requested' })
      .where(eq(orders.id, orderId));

    // Also insert into refillRequests table
    await db
      .insert(refillRequests)
      .values({
        userId: req.user.id,
        orderId: orderId,
        status: 'pending',
      });

    await logActivity(req.user.id, 'Request Refill', `Requested refill for order ID: ${orderId}`, req.ip);

    res.json({ success: true, message: 'Refill requested successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to request refill.' });
  }
});

// Get User's Child Panels
router.get('/user/child-panels', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const userPanels = await db
      .select()
      .from(childPanels)
      .where(eq(childPanels.userId, req.user.id))
      .orderBy(desc(childPanels.createdAt));
    res.json(userPanels);
  } catch (error) {
    console.error('Failed to retrieve child panels:', error);
    res.status(500).json({ error: 'Failed to retrieve child panels.' });
  }
});

// Order a Child Panel
router.post('/user/child-panels', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { domain, currency, adminUsername, adminPassword, price } = req.body;

    if (!domain || !adminUsername || !adminPassword) {
      return res.status(400).json({ error: 'Please fill in all required fields (domain, admin username, admin password).' });
    }

    const panelPrice = Number(price) || 10.0;

    if (req.user.balance < panelPrice) {
      return res.status(400).json({ error: `Insufficient wallet balance. Total required: $${panelPrice.toFixed(2)}` });
    }

    // Deduct user balance
    const newBalance = req.user.balance - panelPrice;
    await db
      .update(users)
      .set({ balance: newBalance })
      .where(eq(users.id, req.user.id));

    // Create the child panel order
    const inserted = await db
      .insert(childPanels)
      .values({
        userId: req.user.id,
        domain,
        currency: currency || 'USD',
        adminUsername,
        adminPassword,
        price: panelPrice,
        status: 'pending',
      })
      .returning();

    await logActivity(
      req.user.id,
      'Order Child Panel',
      `Ordered child panel for domain: ${domain} (Price: $${panelPrice.toFixed(2)})`,
      req.ip
    );

    res.json({ success: true, message: 'Child panel ordered successfully!', panel: inserted[0] });
  } catch (error) {
    console.error('Failed to order child panel:', error);
    res.status(500).json({ error: 'Failed to order child panel.' });
  }
});

// Get User's Refill Requests
router.get('/user/refill-requests', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const requests = await db
      .select({
        id: refillRequests.id,
        orderId: refillRequests.orderId,
        status: refillRequests.status,
        createdAt: refillRequests.createdAt,
        link: orders.link,
        quantity: orders.quantity,
        charge: orders.charge,
        serviceName: services.name,
      })
      .from(refillRequests)
      .innerJoin(orders, eq(refillRequests.orderId, orders.id))
      .innerJoin(services, eq(orders.serviceId, services.id))
      .where(eq(refillRequests.userId, req.user.id))
      .orderBy(desc(refillRequests.createdAt));

    const offset = await getOrderIdOffset();
    if (offset > 0) {
      requests.forEach(r => {
        r.orderId += offset;
      });
    }

    res.json(requests);
  } catch (error) {
    console.error('Failed to retrieve refill requests:', error);
    res.status(500).json({ error: 'Failed to retrieve refill requests.' });
  }
});

// Support Tickets: Get Tickets
router.get('/user/tickets', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const userTickets = await db
      .select()
      .from(tickets)
      .where(eq(tickets.userId, req.user.id))
      .orderBy(desc(tickets.createdAt));
    res.json(userTickets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve tickets.' });
  }
});

// Support Tickets: Create Ticket
router.post('/tickets/new', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required.' });
    }

    const newTicket = await db
      .insert(tickets)
      .values({
        userId: req.user.id,
        subject,
        status: 'open',
      })
      .returning();

    const ticketId = newTicket[0].id;

    await db.insert(ticketMessages).values({
      ticketId,
      senderId: req.user.id,
      message,
    });

    await logActivity(req.user.id, 'Create Support Ticket', `Created ticket ID: ${ticketId} - ${subject}`, req.ip);

    res.json({ success: true, ticket: newTicket[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create support ticket.' });
  }
});

// Support Tickets: Get Messages
router.get('/tickets/:id/messages', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const ticketId = parseInt(req.params.id);

    // Verify ticket ownership
    const ticketObj = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, ticketId), or(eq(tickets.userId, req.user.id), eq(sql`${req.user.role}`, 'admin'))))
      .limit(1);

    if (ticketObj.length === 0) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const messages = await db
      .select({
        id: ticketMessages.id,
        message: ticketMessages.message,
        createdAt: ticketMessages.createdAt,
        senderName: users.name,
        senderRole: users.role,
      })
      .from(ticketMessages)
      .innerJoin(users, eq(ticketMessages.senderId, users.id))
      .where(eq(ticketMessages.ticketId, ticketId))
      .orderBy(ticketMessages.id);

    res.json({ ticket: ticketObj[0], messages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve ticket messages.' });
  }
});

// Support Tickets: Add Reply
router.post('/tickets/:id/reply', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const ticketId = parseInt(req.params.id);
    const { message } = req.body;

    if (!message) return res.status(400).json({ error: 'Message content is empty' });

    // Verify ticket ownership/admin role
    const ticketObj = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, ticketId), or(eq(tickets.userId, req.user.id), eq(sql`${req.user.role}`, 'admin'))))
      .limit(1);

    if (ticketObj.length === 0) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    await db.insert(ticketMessages).values({
      ticketId,
      senderId: req.user.id,
      message,
    });

    // If replier is user, ticket is "open", if admin, ticket is "answered"
    const newStatus = req.user.role === 'admin' ? 'answered' : 'open';
    await db
      .update(tickets)
      .set({ status: newStatus })
      .where(eq(tickets.id, ticketId));

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit reply.' });
  }
});

// Simulated Add Funds
router.post('/user/add-funds', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { amount, method } = req.body;

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ error: 'Invalid payment amount.' });
    }

    const txId = 'TXN-' + Math.floor(Math.random() * 10000000);

    // Create payment entry
    await db.insert(payments).values({
      userId: req.user.id,
      amount: amt,
      paymentMethod: method || 'Stripe',
      transactionId: txId,
      status: 'completed',
    });

    // Credit user's wallet
    const newBalance = req.user.balance + amt;
    await db
      .update(users)
      .set({ balance: newBalance })
      .where(eq(users.id, req.user.id));

    await logActivity(req.user.id, 'Deposit Funds', `Deposited $${amt.toFixed(2)} via ${method || 'Stripe'}`, req.ip);

    res.json({
      success: true,
      message: 'Deposit successful! Funds added to your wallet.',
      newBalance,
      transactionId: txId,
    });
  } catch (error) {
    console.error('Add funds error:', error);
    res.status(500).json({ error: 'Payment failed.' });
  }
});

// Simulated BharatPe Add Funds via UTR Verification
router.post('/user/add-funds-bharatpe', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { amount, utr, paymentMethod } = req.body;

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ error: 'Invalid deposit amount.' });
    }

    if (!utr || !/^\d{12}$/.test(utr)) {
      return res.status(400).json({ error: 'Invalid UPI Transaction Reference Number (UTR). Must be exactly 12 digits.' });
    }

    // Check for double spending / duplicate UTR
    const duplicate = await db.select().from(payments).where(eq(payments.transactionId, utr)).limit(1);
    if (duplicate.length > 0) {
      return res.status(400).json({ error: 'This Transaction Reference ID (UTR) has already been used or is under active review.' });
    }

    const methodLabel = paymentMethod || 'BharatPe Dynamic QR';

    // Create payment entry
    await db.insert(payments).values({
      userId: req.user.id,
      amount: amt,
      paymentMethod: methodLabel,
      transactionId: utr,
      status: 'completed',
    });

    // Credit user's wallet
    const newBalance = req.user.balance + amt;
    await db
      .update(users)
      .set({ balance: newBalance })
      .where(eq(users.id, req.user.id));

    await logActivity(req.user.id, 'Deposit Funds', `Deposited $${amt.toFixed(2)} via ${methodLabel} (UTR: ${utr})`, req.ip);

    res.json({
      success: true,
      message: `Deposit processed! $${amt.toFixed(2)} has been credited to your wallet via UPI Ref ${utr}.`,
      newBalance,
      transactionId: utr,
    });
  } catch (error) {
    console.error('BharatPe Add funds error:', error);
    res.status(500).json({ error: 'UPI Transaction verification failed.' });
  }
});

// Get User's Payments
router.get('/user/payments', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const list = await db
      .select()
      .from(payments)
      .where(eq(payments.userId, req.user.id))
      .orderBy(desc(payments.createdAt));
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve payments.' });
  }
});

// Affiliate: Get Stats / Create program
router.get('/user/affiliate', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    let partner = await db
      .select()
      .from(affiliates)
      .where(eq(affiliates.userId, req.user.id))
      .limit(1);

    if (partner.length === 0) {
      // Auto-create affiliate profile
      const refCode = 'REF-' + Math.floor(Math.random() * 10000);
      const inserted = await db
        .insert(affiliates)
        .values({
          userId: req.user.id,
          referralCode: refCode,
        })
        .returning();
      partner = [inserted[0]];
    }

    res.json(partner[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve affiliate details.' });
  }
});

// ==========================================
// ADMIN DASHBOARD ENDPOINTS
// ==========================================

// Admin: Get Stats & Analytics
router.get('/admin/stats', requireAdmin, async (req: AuthRequest, res) => {
  try {
    // Total users count
    const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(users);
    // Total orders count and summation of charge
    const totalOrders = await db.select({
      count: sql<number>`count(*)`,
      totalSpent: sql<number>`sum(charge)`,
    }).from(orders);

    // Payments totals
    const totalDeposits = await db.select({
      total: sql<number>`sum(amount)`,
    }).from(payments).where(eq(payments.status, 'completed'));

    // Status distributions
    const orderStatuses = await db.select({
      status: orders.status,
      count: sql<number>`count(*)`,
    }).from(orders).groupBy(orders.status);

    res.json({
      usersCount: Number(totalUsers[0].count),
      ordersCount: Number(totalOrders[0].count),
      totalRevenue: Number(totalOrders[0].totalSpent || 0.0),
      totalDeposited: Number(totalDeposits[0].total || 0.0),
      statusChart: orderStatuses,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to retrieve admin statistics.' });
  }
});

// Admin: Get Supabase Sync Diagnostics Status
router.get('/admin/supabase-status', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const stats = getSupabaseSyncStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve Supabase status.' });
  }
});

// Admin: Get Users List
router.get('/admin/users', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const list = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

// Admin: Update User Balance Manually
router.post('/admin/users/:id/balance', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { amount, action } = req.body;

    const amt = parseFloat(amount);
    if (isNaN(amt)) return res.status(400).json({ error: 'Invalid amount' });

    if (action === 'add') {
      const targetUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!targetUser.length) {
        return res.status(404).json({ error: 'User not found' });
      }
      const currentBalance = targetUser[0].balance || 0;
      const newBalance = currentBalance + amt;

      await db
        .update(users)
        .set({ balance: newBalance })
        .where(eq(users.id, userId));

      await logActivity(req.user?.id || null, 'Admin Balance Add', `Added ₹${amt.toFixed(2)} to user ID: ${userId} balance (New balance: ₹${newBalance.toFixed(2)})`, req.ip);
    } else {
      await db
        .update(users)
        .set({ balance: amt })
        .where(eq(users.id, userId));

      await logActivity(req.user?.id || null, 'Admin Balance Update', `Updated user ID: ${userId} balance to ₹${amt.toFixed(2)}`, req.ip);
    }

    const [updatedUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (updatedUser) {
      syncUserToSupabase(updatedUser).catch(err => console.error('[Supabase Background Error]', err));
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update balance:', error);
    res.status(500).json({ error: 'Failed to update balance.' });
  }
});

// Admin: Update User Status
router.post('/admin/users/:id/status', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { status } = req.body;

    if (!status) return res.status(400).json({ error: 'Status is required' });

    await db
      .update(users)
      .set({ status })
      .where(eq(users.id, userId));

    await logActivity(req.user?.id || null, 'Admin User Update', `Set user ID: ${userId} status to ${status}`, req.ip);

    const [updatedUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (updatedUser) {
      syncUserToSupabase(updatedUser).catch(err => console.error('[Supabase Background Error]', err));
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user status.' });
  }
});

// Admin: Get All Orders
router.get('/admin/orders', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const allOrders = await db
      .select({
        id: orders.id,
        link: orders.link,
        quantity: orders.quantity,
        charge: orders.charge,
        status: orders.status,
        startCount: orders.startCount,
        remains: orders.remains,
        refillStatus: orders.refillStatus,
        createdAt: orders.createdAt,
        serviceName: services.name,
        userEmail: users.email,
        userName: users.name,
        providerOrderId: orders.providerOrderId,
        providerName: providers.name,
      })
      .from(orders)
      .innerJoin(services, eq(orders.serviceId, services.id))
      .innerJoin(users, eq(orders.userId, users.id))
      .leftJoin(providers, eq(services.providerId, providers.id))
      .orderBy(desc(orders.createdAt));

    const offset = await getOrderIdOffset();
    if (offset > 0) {
      allOrders.forEach(o => {
        o.id += offset;
      });
    }

    res.json(allOrders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve orders.' });
  }
});

// Admin: Update Order Status / Process Refund
router.post('/admin/orders/:id/status', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const offset = await getOrderIdOffset();
    const orderId = parseInt(req.params.id) - offset;
    const { status } = req.body;

    if (!status) return res.status(400).json({ error: 'Status is required' });

    // Fetch the original order details to check for refunds
    const currentOrder = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (currentOrder.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const ord = currentOrder[0];

    // If transitioning to Refunded or Cancelled, refund the user
    if ((status === 'refunded' || status === 'cancelled') && ord.status !== 'refunded' && ord.status !== 'cancelled') {
      const userToRefund = await db
        .select()
        .from(users)
        .where(eq(users.id, ord.userId))
        .limit(1);

      if (userToRefund.length > 0) {
        const refundedBalance = userToRefund[0].balance + ord.charge;
        await db
          .update(users)
          .set({ balance: refundedBalance })
          .where(eq(users.id, ord.userId));

        // Create log entry for payment refund
        await db.insert(payments).values({
          userId: ord.userId,
          amount: ord.charge,
          paymentMethod: 'Refund',
          transactionId: 'REFUND-' + ord.id,
          status: 'completed',
        });
      }
    }

    await db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, orderId));

    await logActivity(req.user?.id || null, 'Admin Order Update', `Set order ID: ${orderId} status to ${status}`, req.ip);

    res.json({ success: true });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status.' });
  }
});

// Admin: Get all child panel requests
router.get('/admin/child-panels', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const list = await db
      .select({
        id: childPanels.id,
        userId: childPanels.userId,
        domain: childPanels.domain,
        currency: childPanels.currency,
        adminUsername: childPanels.adminUsername,
        adminPassword: childPanels.adminPassword,
        price: childPanels.price,
        status: childPanels.status,
        createdAt: childPanels.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(childPanels)
      .innerJoin(users, eq(childPanels.userId, users.id))
      .orderBy(desc(childPanels.createdAt));
    res.json(list);
  } catch (error) {
    console.error('Failed to fetch child panels for admin:', error);
    res.status(500).json({ error: 'Failed to retrieve child panels.' });
  }
});

// Admin: Update child panel status
router.post('/admin/child-panels/:id/status', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const panelId = parseInt(req.params.id);
    const { status } = req.body;

    if (!status) return res.status(400).json({ error: 'Status is required' });

    await db
      .update(childPanels)
      .set({ status })
      .where(eq(childPanels.id, panelId));

    await logActivity(req.user?.id || null, 'Admin Child Panel Update', `Updated child panel ID: ${panelId} status to ${status}`, req.ip);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update child panel status:', error);
    res.status(500).json({ error: 'Failed to update child panel status.' });
  }
});

// Admin: Get all refill requests
router.get('/admin/refill-requests', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const list = await db
      .select({
        id: refillRequests.id,
        orderId: refillRequests.orderId,
        status: refillRequests.status,
        createdAt: refillRequests.createdAt,
        userId: refillRequests.userId,
        userName: users.name,
        userEmail: users.email,
        link: orders.link,
        quantity: orders.quantity,
        charge: orders.charge,
        serviceName: services.name,
      })
      .from(refillRequests)
      .innerJoin(orders, eq(refillRequests.orderId, orders.id))
      .innerJoin(services, eq(orders.serviceId, services.id))
      .innerJoin(users, eq(refillRequests.userId, users.id))
      .orderBy(desc(refillRequests.createdAt));

    const offset = await getOrderIdOffset();
    if (offset > 0) {
      list.forEach(r => {
        r.orderId += offset;
      });
    }

    res.json(list);
  } catch (error) {
    console.error('Failed to fetch refill requests for admin:', error);
    res.status(500).json({ error: 'Failed to retrieve refill requests.' });
  }
});

// Admin: Update refill request status
router.post('/admin/refill-requests/:id/status', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const { status } = req.body; // 'completed', 'rejected', 'processing'

    if (!status) return res.status(400).json({ error: 'Status is required' });

    // Fetch the request
    const requestObj = await db
      .select()
      .from(refillRequests)
      .where(eq(refillRequests.id, requestId))
      .limit(1);

    if (requestObj.length === 0) {
      return res.status(404).json({ error: 'Refill request not found.' });
    }

    const reqItem = requestObj[0];

    // Update refillRequests table
    await db
      .update(refillRequests)
      .set({ status })
      .where(eq(refillRequests.id, requestId));

    // Update matching order's refillStatus
    let orderRefillStatus = 'requested';
    if (status === 'completed') orderRefillStatus = 'completed';
    if (status === 'rejected') orderRefillStatus = 'rejected';

    await db
      .update(orders)
      .set({ refillStatus: orderRefillStatus })
      .where(eq(orders.id, reqItem.orderId));

    await logActivity(req.user?.id || null, 'Admin Refill Update', `Updated refill request ID: ${requestId} status to ${status}`, req.ip);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update refill status:', error);
    res.status(500).json({ error: 'Failed to update refill status.' });
  }
});

// Admin: Manage Coupons
router.get('/admin/coupons', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const list = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve coupons.' });
  }
});

router.post('/admin/coupons', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { code, discountPercent } = req.body;
    if (!code || !discountPercent) return res.status(400).json({ error: 'Missing parameters.' });

    await db.insert(coupons).values({
      code: code.toUpperCase(),
      discountPercent: Number(discountPercent),
      status: 'active',
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create coupon.' });
  }
});

// Admin: Manage Announcements
router.post('/admin/announcements', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { title, content, type } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content required.' });

    await db.insert(announcements).values({
      title,
      content,
      type: type || 'info',
      status: 'active',
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create announcement.' });
  }
});

// Admin: Manage Services
router.post('/admin/services', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { categoryId, name, description, pricePerThousand, minAmount, maxAmount, providerId, providerServiceId, icon } = req.body;

    if (!categoryId || !name || !pricePerThousand) {
      return res.status(400).json({ error: 'Category ID, Name and Price are required.' });
    }

    await db.insert(services).values({
      categoryId: Number(categoryId),
      name,
      description,
      pricePerThousand: parseFloat(pricePerThousand),
      minAmount: Number(minAmount || 10),
      maxAmount: Number(maxAmount || 10000),
      providerId: providerId ? Number(providerId) : null,
      providerServiceId: providerServiceId ? String(providerServiceId) : null,
      icon: icon || null,
      status: 'active',
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create service.' });
  }
});

// Admin: Manage Categories
router.post('/admin/categories', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    await db.insert(categories).values({
      name,
      status: 'active',
      sortOrder: 1,
      icon: icon || null,
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category.' });
  }
});

// Admin: Update Category
router.put('/admin/categories/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const catId = parseInt(req.params.id);
    if (isNaN(catId)) return res.status(400).json({ error: 'Invalid Category ID' });

    const { name, status, sortOrder, icon } = req.body;
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;
    if (sortOrder !== undefined) updateData.sortOrder = typeof sortOrder === 'number' ? sortOrder : (parseInt(sortOrder) || 0);
    if (icon !== undefined) updateData.icon = icon;

    await db.update(categories).set(updateData).where(eq(categories.id, catId));

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update category:', error);
    res.status(500).json({ error: 'Failed to update category.' });
  }
});

// Admin: Get Support Tickets
router.get('/admin/tickets', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const adminTickets = await db
      .select({
        id: tickets.id,
        subject: tickets.subject,
        status: tickets.status,
        createdAt: tickets.createdAt,
        userEmail: users.email,
        userName: users.name,
      })
      .from(tickets)
      .innerJoin(users, eq(tickets.userId, users.id))
      .orderBy(desc(tickets.createdAt));
    res.json(adminTickets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve tickets.' });
  }
});

// Admin: Get Activity Logs
router.get('/admin/logs', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const logs = await db
      .select({
        id: activityLogs.id,
        action: activityLogs.action,
        details: activityLogs.details,
        ipAddress: activityLogs.ipAddress,
        createdAt: activityLogs.createdAt,
        userEmail: users.email,
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .orderBy(desc(activityLogs.createdAt))
      .limit(100);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve activity logs.' });
  }
});

// Admin: Get SMM Providers List (Securely masking the API Key)
router.get('/admin/providers', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const list = await db.select().from(providers).orderBy(providers.id);
    
    // Mask API Keys for total client-side security
    const secureList = list.map(prov => ({
      ...prov,
      apiKey: prov.apiKey ? `${prov.apiKey.slice(0, 4)}••••••••${prov.apiKey.slice(-4)}` : '••••••••',
    }));
    
    res.json(secureList);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve API providers.' });
  }
});

// Admin: Create New SMM Provider
router.post('/admin/providers', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, apiUrl, apiKey } = req.body;
    if (!name || !apiUrl || !apiKey) {
      return res.status(400).json({ error: 'Name, API URL, and API Key are required.' });
    }

    const inserted = await db
      .insert(providers)
      .values({
        name,
        apiUrl,
        apiKey,
        status: 'active',
        balance: 0.0,
      })
      .returning();

    await logActivity(req.user?.id || null, 'Create API Provider', `Created provider: ${name} (${apiUrl})`, req.ip);
    res.json({ success: true, provider: inserted[0] });
  } catch (error) {
    console.error('Failed to create SMM provider:', error);
    res.status(500).json({ error: 'Failed to create SMM provider.' });
  }
});

// Admin: Update SMM Provider
router.put('/admin/providers/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const provId = parseInt(req.params.id);
    const { name, apiUrl, apiKey } = req.body;

    const existing = await db
      .select()
      .from(providers)
      .where(eq(providers.id, provId))
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Provider not found.' });
    }

    const updateFields: any = {};
    if (name) updateFields.name = name;
    if (apiUrl) updateFields.apiUrl = apiUrl;
    
    // Only update apiKey if it changed and is not the masked placeholder
    if (apiKey && !apiKey.includes('••••••••')) {
      updateFields.apiKey = apiKey;
    }

    await db
      .update(providers)
      .set(updateFields)
      .where(eq(providers.id, provId));

    await logActivity(req.user?.id || null, 'Update API Provider', `Updated provider ID: ${provId}`, req.ip);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update SMM provider.' });
  }
});

// Admin: Delete SMM Provider
router.delete('/admin/providers/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const provId = parseInt(req.params.id);
    
    // Dissociate any services using this provider first to avoid constraint issues
    await db
      .update(services)
      .set({ providerId: null, providerServiceId: null })
      .where(eq(services.providerId, provId));

    await db.delete(providers).where(eq(providers.id, provId));
    await logActivity(req.user?.id || null, 'Delete API Provider', `Deleted provider ID: ${provId}`, req.ip);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete provider error:', error);
    res.status(500).json({ error: 'Failed to delete SMM provider.' });
  }
});

// Admin: Fetch and Sync Provider Account Balance
router.post('/admin/providers/:id/balance', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const provId = parseInt(req.params.id);
    const prov = await db
      .select()
      .from(providers)
      .where(eq(providers.id, provId))
      .limit(1);

    if (prov.length === 0) {
      return res.status(404).json({ error: 'Provider not found.' });
    }

    const provider = prov[0];
    
    // Query the external yuthsmm's API balance action
    const params = new URLSearchParams();
    params.append('key', provider.apiKey);
    params.append('action', 'balance');

    const response = await fetch(provider.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const data = await response.json();
    if (data && data.balance !== undefined) {
      const parsedBalance = parseFloat(data.balance);
      await db
        .update(providers)
        .set({ balance: parsedBalance })
        .where(eq(providers.id, provId));

      res.json({ success: true, balance: parsedBalance });
    } else if (data && data.error) {
      res.status(400).json({ error: data.error });
    } else {
      res.status(400).json({ error: 'Invalid response from SMM API.' });
    }
  } catch (error: any) {
    console.error('Failed to fetch provider balance:', error);
    res.status(500).json({ error: `Connection failed: ${error.message || error}` });
  }
});

// Admin: Fetch all services from SMM Provider
router.get('/admin/providers/:id/services', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const provId = parseInt(req.params.id);
    const prov = await db
      .select()
      .from(providers)
      .where(eq(providers.id, provId))
      .limit(1);

    if (prov.length === 0) {
      return res.status(404).json({ error: 'Provider not found.' });
    }

    const provider = prov[0];

    const params = new URLSearchParams();
    params.append('key', provider.apiKey);
    params.append('action', 'services');

    const response = await fetch(provider.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const data = await response.json();
    if (Array.isArray(data)) {
      res.json(data);
    } else if (data && data.error) {
      res.status(400).json({ error: data.error });
    } else {
      res.status(400).json({ error: 'Invalid response or no services returned from SMM API.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch services from SMM API.' });
  }
});

// Admin: Bulk Import services from SMM Provider
router.post('/admin/services/import-bulk', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { services: servicesToImport, providerId, priceMultiplier } = req.body;
    if (!Array.isArray(servicesToImport) || !providerId) {
      return res.status(400).json({ error: 'Invalid input data. Expected services array and providerId.' });
    }

    const multiplier = parseFloat(priceMultiplier) || 1.0;

    // Fetch existing categories to reuse them
    const existingCategories = await db.select().from(categories);
    const categoryMap = new Map<string, number>();
    existingCategories.forEach(cat => {
      categoryMap.set(cat.name.toLowerCase().trim(), cat.id);
    });

    const results = [];

    for (const item of servicesToImport) {
      const categoryName = (item.category || 'Uncategorized').trim();
      const lowerCatName = categoryName.toLowerCase();

      let catId = categoryMap.get(lowerCatName);
      if (!catId) {
        // Create the category
        const [insertedCat] = await db.insert(categories).values({
          name: categoryName,
          status: 'active',
          sortOrder: 1,
        }).returning();
        
        catId = insertedCat.id;
        categoryMap.set(lowerCatName, catId);
      }

      // Calculate selling price: provider rate * multiplier
      const originalRate = parseFloat(item.rate) || 0;
      const finalPrice = originalRate * multiplier;

      // Insert service
      const [insertedSrv] = await db.insert(services).values({
        categoryId: catId,
        name: item.name,
        description: item.desc || `SMM Provider Service ID: ${item.service}`,
        pricePerThousand: finalPrice,
        minAmount: Number(item.min || 10),
        maxAmount: Number(item.max || 10000),
        providerId: Number(providerId),
        providerServiceId: String(item.service),
        status: 'active',
      }).returning();

      results.push(insertedSrv);
    }

    res.json({ success: true, count: results.length });
  } catch (error: any) {
    console.error('Failed bulk-importing provider services:', error);
    res.status(500).json({ error: error.message || 'Failed to import services.' });
  }
});

// Admin: Comprehensive Manual Seller Sync API
router.post('/admin/services/seller-sync', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { providerId, syncScope, profitPercentage, selectedServiceIds } = req.body;
    if (!providerId) {
      return res.status(400).json({ error: 'SMM Provider ID is required.' });
    }

    const prov = await db
      .select()
      .from(providers)
      .where(eq(providers.id, Number(providerId)))
      .limit(1);

    if (prov.length === 0) {
      return res.status(404).json({ error: 'SMM Provider not found.' });
    }

    const provider = prov[0];

    // Fetch remote services from SMM API
    const params = new URLSearchParams();
    params.append('key', provider.apiKey);
    params.append('action', 'services');

    const response = await fetch(provider.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch from SMM API: ${response.statusText}`);
    }

    const remoteServices = await response.json();
    if (!Array.isArray(remoteServices)) {
      return res.status(400).json({ error: 'Remote provider did not return a valid services array.' });
    }

    // Fetch existing services for this provider to compare
    const existingServices = await db
      .select()
      .from(services)
      .where(eq(services.providerId, provider.id));

    // Create a map of existing service by providerServiceId
    const existingMap = new Map<string, any>();
    existingServices.forEach(s => {
      if (s.providerServiceId) {
        existingMap.set(String(s.providerServiceId), s);
      }
    });

    // Fetch categories map for matching categories
    const existingCategories = await db.select().from(categories);
    const categoryMap = new Map<string, number>();
    existingCategories.forEach(cat => {
      categoryMap.set(cat.name.toLowerCase().trim(), cat.id);
    });

    const markup = 1 + (parseFloat(profitPercentage) || 0) / 100;

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const selectedSet = selectedServiceIds ? new Set(selectedServiceIds.map(String)) : null;

    for (const remote of remoteServices) {
      const remoteIdStr = String(remote.service);

      // Filter by selection if scope is selected
      if (syncScope === 'selected' && selectedSet && !selectedSet.has(remoteIdStr)) {
        skippedCount++;
        continue;
      }

      const existing = existingMap.get(remoteIdStr);

      if (syncScope === 'new_only' && existing) {
        skippedCount++;
        continue;
      }

      // Compute selling price
      const originalRate = parseFloat(remote.rate) || 0;
      const finalPrice = originalRate * markup;

      // Handle category check & insertion
      const categoryName = (remote.category || 'Uncategorized').trim();
      const lowerCatName = categoryName.toLowerCase();
      let catId = categoryMap.get(lowerCatName);

      if (!catId) {
        // Create Category dynamically
        const [insertedCat] = await db.insert(categories).values({
          name: categoryName,
          status: 'active',
          sortOrder: 1,
        }).returning();
        catId = insertedCat.id;
        categoryMap.set(lowerCatName, catId);
      }

      if (existing) {
        if (syncScope === 'price_only') {
          // Update only price & min/max
          await db.update(services)
            .set({
              pricePerThousand: finalPrice,
              minAmount: Number(remote.min || 10),
              maxAmount: Number(remote.max || 10000),
            })
            .where(eq(services.id, existing.id));
        } else {
          // Update details & price
          await db.update(services)
            .set({
              categoryId: catId,
              name: remote.name,
              description: remote.desc || `SMM Provider Service ID: ${remote.service}`,
              pricePerThousand: finalPrice,
              minAmount: Number(remote.min || 10),
              maxAmount: Number(remote.max || 10000),
            })
            .where(eq(services.id, existing.id));
        }
        updatedCount++;
      } else {
        // Not existing and we are importing (or we are in 'all' or 'selected')
        if (syncScope !== 'price_only') {
          await db.insert(services).values({
            categoryId: catId,
            name: remote.name,
            description: remote.desc || `SMM Provider Service ID: ${remote.service}`,
            pricePerThousand: finalPrice,
            minAmount: Number(remote.min || 10),
            maxAmount: Number(remote.max || 10000),
            providerId: provider.id,
            providerServiceId: remoteIdStr,
            status: 'active',
          });
          addedCount++;
        } else {
          skippedCount++;
        }
      }
    }

    await logActivity(req.user?.id || null, 'Seller Sync', `Synced SMM Provider ${provider.name}. Added: ${addedCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}`, req.ip);

    res.json({
      success: true,
      addedCount,
      updatedCount,
      skippedCount,
      totalProcessed: addedCount + updatedCount + skippedCount
    });
  } catch (error: any) {
    console.error('Error in seller-sync API:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error during synchronization.' });
  }
});

// Admin: Manual Sync All SMM Provider Orders Statuses
router.post('/admin/orders/sync', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const result = await syncProviderOrders();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync provider orders.' });
  }
});

// Admin: Get SMM Order status cron job status
router.get('/admin/cron/status', requireAdmin, async (req: AuthRequest, res) => {
  try {
    res.json({
      success: true,
      cronState: {
        lastRun: cronState.lastRun,
        runCount: cronState.runCount,
        status: cronState.status,
        lastSyncedCount: cronState.lastSyncedCount,
        error: cronState.error,
        intervalMs: cronState.intervalMs,
        isActive: cronState.isActive,
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve cron status.' });
  }
});

// Admin: Toggle SMM Order status cron active/inactive
router.post('/admin/cron/toggle', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { active } = req.body;
    if (typeof active === 'boolean') {
      cronState.isActive = active;
      if (active) {
        startOrderSyncCron();
      }
    } else {
      cronState.isActive = !cronState.isActive;
    }
    res.json({ success: true, cronState });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle cron state.' });
  }
});

// Admin: Manually trigger SMM Order status cron job sync instantly
router.post('/admin/cron/trigger', requireAdmin, async (req: AuthRequest, res) => {
  try {
    if (cronState.status === 'running') {
      return res.status(400).json({ error: 'Cron job is already running in the background.' });
    }
    cronState.status = 'running';
    console.log('[MANUAL TRIGGER] Manually triggering SMM status sync...');
    const result = await syncProviderOrders();
    cronState.lastRun = new Date();
    cronState.runCount++;
    cronState.status = 'success';
    cronState.lastSyncedCount = result?.synced || 0;
    cronState.error = null;
    res.json({ success: true, cronState });
  } catch (error: any) {
    console.error('[MANUAL TRIGGER] Sync failed:', error);
    cronState.lastRun = new Date();
    cronState.status = 'failed';
    cronState.error = error?.message || String(error);
    res.status(500).json({ error: error?.message || 'Manual trigger failed.', cronState });
  }
});

// Admin: Update SMM Order status cron interval config
router.post('/admin/cron/settings', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { intervalMinutes } = req.body;
    const mins = parseFloat(intervalMinutes);
    if (isNaN(mins) || mins < 0.5) {
      return res.status(400).json({ error: 'Interval must be at least 0.5 minutes (30 seconds).' });
    }
    cronState.intervalMs = Math.round(mins * 60 * 1000);
    startOrderSyncCron();
    res.json({ success: true, cronState });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update cron interval.' });
  }
});

// Admin: Get complete services list (with provider credentials)
router.get('/admin/services', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const list = await db
      .select({
        id: services.id,
        categoryId: services.categoryId,
        name: services.name,
        description: services.description,
        pricePerThousand: services.pricePerThousand,
        minAmount: services.minAmount,
        maxAmount: services.maxAmount,
        status: services.status,
        providerId: services.providerId,
        providerServiceId: services.providerServiceId,
        icon: services.icon,
        categoryName: categories.name,
      })
      .from(services)
      .innerJoin(categories, eq(services.categoryId, categories.id))
      .orderBy(services.id);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve admin services.' });
  }
});

// Admin: Update Service details & link to Provider
router.put('/admin/services/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const srvId = parseInt(req.params.id);
    const { categoryId, name, description, pricePerThousand, minAmount, maxAmount, providerId, providerServiceId, status, icon } = req.body;

    const existing = await db
      .select()
      .from(services)
      .where(eq(services.id, srvId))
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Service not found.' });
    }

    const updateFields: any = {};
    if (categoryId !== undefined) updateFields.categoryId = Number(categoryId);
    if (name !== undefined) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (pricePerThousand !== undefined) updateFields.pricePerThousand = parseFloat(pricePerThousand);
    if (minAmount !== undefined) updateFields.minAmount = Number(minAmount);
    if (maxAmount !== undefined) updateFields.maxAmount = Number(maxAmount);
    if (status !== undefined) updateFields.status = status;
    if (icon !== undefined) updateFields.icon = icon || null;
    
    // Support linking to provider
    updateFields.providerId = providerId ? Number(providerId) : null;
    updateFields.providerServiceId = providerServiceId || null;

    await db
      .update(services)
      .set(updateFields)
      .where(eq(services.id, srvId));

    await logActivity(req.user?.id || null, 'Update Service', `Updated service ID: ${srvId}`, req.ip);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update service:', error);
    res.status(500).json({ error: 'Failed to update service.' });
  }
});

// Admin: Delete Service
router.delete('/admin/services/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const srvId = parseInt(req.params.id);

    // 1. Get all orders for this service
    const serviceOrders = await db.select({ id: orders.id }).from(orders).where(eq(orders.serviceId, srvId));
    const orderIds = serviceOrders.map(o => o.id);

    if (orderIds.length > 0) {
      // 2. Delete refill requests referencing these orders
      await db.delete(refillRequests).where(inArray(refillRequests.orderId, orderIds));
      // 3. Delete orders referencing this service
      await db.delete(orders).where(inArray(orders.id, orderIds));
    }

    // 4. Delete favorite service associations
    await db.delete(favoriteServices).where(eq(favoriteServices.serviceId, srvId));

    // 5. Delete the service itself
    await db.delete(services).where(eq(services.id, srvId));

    await logActivity(req.user?.id || null, 'Delete Service', `Deleted service ID: ${srvId}`, req.ip);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete service:', error);
    res.status(500).json({ error: 'Failed to delete service.' });
  }
});

// Admin: Bulk Delete Categories
router.post('/admin/categories/bulk-delete', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty category IDs array.' });
    }

    const catIds = ids.map(id => parseInt(id)).filter(id => !isNaN(id));
    if (catIds.length === 0) {
      return res.status(400).json({ error: 'No valid category IDs provided.' });
    }

    // 1. Get all services belonging to these categories
    const catServices = await db.select({ id: services.id }).from(services).where(inArray(services.categoryId, catIds));
    const serviceIds = catServices.map(s => s.id);

    if (serviceIds.length > 0) {
      // 2. Get all orders for these services
      const serviceOrders = await db.select({ id: orders.id }).from(orders).where(inArray(orders.serviceId, serviceIds));
      const orderIds = serviceOrders.map(o => o.id);

      if (orderIds.length > 0) {
        // 3. Delete refill requests referencing these orders
        await db.delete(refillRequests).where(inArray(refillRequests.orderId, orderIds));
        // 4. Delete orders referencing these services
        await db.delete(orders).where(inArray(orders.id, orderIds));
      }

      // 5. Delete favorite services associations
      await db.delete(favoriteServices).where(inArray(favoriteServices.serviceId, serviceIds));

      // 6. Delete services
      await db.delete(services).where(inArray(services.id, serviceIds));
    }

    // 7. Delete categories
    await db.delete(categories).where(inArray(categories.id, catIds));

    await logActivity(req.user?.id || null, 'Bulk Delete Categories', `Bulk deleted category IDs: ${catIds.join(', ')}`, req.ip);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to bulk delete categories:', error);
    res.status(500).json({ error: 'Failed to bulk delete categories.' });
  }
});

// Admin: Delete Category
router.delete('/admin/categories/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const catId = parseInt(req.params.id);

    // 1. Get all services belonging to this category
    const catServices = await db.select({ id: services.id }).from(services).where(eq(services.categoryId, catId));
    const serviceIds = catServices.map(s => s.id);

    if (serviceIds.length > 0) {
      // 2. Get all orders for these services
      const serviceOrders = await db.select({ id: orders.id }).from(orders).where(inArray(orders.serviceId, serviceIds));
      const orderIds = serviceOrders.map(o => o.id);

      if (orderIds.length > 0) {
        // 3. Delete refill requests referencing these orders
        await db.delete(refillRequests).where(inArray(refillRequests.orderId, orderIds));
        // 4. Delete orders referencing these services
        await db.delete(orders).where(inArray(orders.id, orderIds));
      }

      // 5. Delete favorite services associations
      await db.delete(favoriteServices).where(inArray(favoriteServices.serviceId, serviceIds));

      // 6. Delete services
      await db.delete(services).where(inArray(services.id, serviceIds));
    }

    // 7. Finally delete the category itself
    await db.delete(categories).where(eq(categories.id, catId));

    await logActivity(req.user?.id || null, 'Delete Category', `Deleted category ID: ${catId}`, req.ip);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete category:', error);
    res.status(500).json({ error: 'Failed to delete category.' });
  }
});

// Admin: Bulk Clear Catalog (Delete all categories and services)
router.delete('/admin/clear-catalog', requireAdmin, async (req: AuthRequest, res) => {
  try {
    // 1. Delete all refill requests first as they depend on orders
    await db.delete(refillRequests);
    
    // 2. Delete all orders as they depend on services
    await db.delete(orders);

    // 3. Delete favorite services associations
    await db.delete(favoriteServices);

    // 4. Delete all services
    await db.delete(services);

    // 5. Delete all categories
    await db.delete(categories);

    await logActivity(req.user?.id || null, 'Clear Catalog', 'Purged all categories and services from catalog', req.ip);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to clear catalog:', error);
    res.status(500).json({ error: 'Failed to clear catalog.' });
  }
});

// Public: Get all public settings
router.get('/public-settings', async (req, res) => {
  try {
    const map = await getSettingsMap();
    const publicMap: Record<string, string> = {};
    const privateKeys = [
      'stripeSecretKey',
      'paypalSecretKey',
      'phonepeSaltKey',
      'phonepeSaltIndex',
      'razorpayKeySecret'
    ];
    for (const [key, val] of Object.entries(map)) {
      if (!privateKeys.includes(key)) {
        publicMap[key] = val;
      }
    }
    res.json(publicMap);
  } catch (error) {
    console.error('Failed to get public settings:', error);
    res.status(500).json({ error: 'Failed to retrieve public settings.' });
  }
});

// Admin: Get all settings
router.get('/admin/settings', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const map = await getSettingsMap();
    res.json(map);
  } catch (error) {
    console.error('Failed to get admin settings:', error);
    res.status(500).json({ error: 'Failed to retrieve settings.' });
  }
});

// Admin: Update settings
router.post('/admin/settings', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const payload = req.body;
    if (payload && typeof payload === 'object') {
      const entries = Object.entries(payload);
      for (const [key, val] of entries) {
        const stringVal = String(val);
        const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
        if (existing.length > 0) {
          await db.update(settings).set({ value: stringVal, updatedAt: new Date() }).where(eq(settings.key, key));
        } else {
          await db.insert(settings).values({ key, value: stringVal });
        }
      }
      await logActivity(req.user?.id || null, 'Update Settings', `Updated settings keys: ${Object.keys(payload).join(', ')}`, req.ip);
      const newMap = await getSettingsMap();
      return res.json({ success: true, settings: newMap });
    }
    res.status(400).json({ error: 'Invalid settings payload.' });
  } catch (error) {
    console.error('Failed to update settings:', error);
    res.status(500).json({ error: 'Failed to update settings.' });
  }
});

// Admin: BharatPe Gateway Actions
router.post('/admin/bharatpe/request-otp', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { phone } = req.body;
    if (!phone || phone.length < 10) {
      return res.status(400).json({ error: 'Please enter a valid phone number.' });
    }

    await logActivity(req.user?.id || null, 'BharatPe OTP Request', `Requested OTP for phone number: ${phone}`, req.ip);

    res.json({
      success: true,
      message: `A simulated OTP has been sent to +91 ${phone.slice(-10)}. Enter code 123456 to link.`,
      otp: '123456'
    });
  } catch (error) {
    console.error('BharatPe OTP Request failed:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/admin/bharatpe/verify-otp', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { phone, otp, merchantName, vpa } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP are required.' });
    }

    if (otp !== '123456') {
      return res.status(400).json({ error: 'Incorrect OTP. Use simulated code 123456.' });
    }

    const finalMerchantName = merchantName?.trim() || 'BharatPe Merchant';
    const finalVpa = vpa?.trim() || `${phone.replace(/\D/g, '')}@bharatpe`;

    const updates = {
      bharatpePhone: phone,
      bharatpeMerchantName: finalMerchantName,
      bharatpeVpa: finalVpa,
      bharatpeStatus: 'linked'
    };

    for (const [key, value] of Object.entries(updates)) {
      const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
      if (existing.length > 0) {
        await db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.key, key));
      } else {
        await db.insert(settings).values({ key, value });
      }
    }

    await logActivity(req.user?.id || null, 'BharatPe QR Linked', `Linked BharatPe Merchant account (${finalMerchantName}) to +91 ${phone}`, req.ip);

    const newMap = await getSettingsMap();
    res.json({
      success: true,
      message: 'BharatPe Merchant QR Linked successfully!',
      settings: newMap
    });
  } catch (error) {
    console.error('BharatPe OTP Verify failed:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/admin/bharatpe/unlink', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const resets = {
      bharatpePhone: '',
      bharatpeMerchantName: '',
      bharatpeVpa: '',
      bharatpeStatus: 'unlinked'
    };

    for (const [key, value] of Object.entries(resets)) {
      const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
      if (existing.length > 0) {
        await db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.key, key));
      } else {
        await db.insert(settings).values({ key, value });
      }
    }

    await logActivity(req.user?.id || null, 'BharatPe QR Unlinked', 'Unlinked BharatPe Merchant account', req.ip);

    const newMap = await getSettingsMap();
    res.json({
      success: true,
      message: 'BharatPe Merchant QR Unlinked successfully!',
      settings: newMap
    });
  } catch (error) {
    console.error('BharatPe Unlink failed:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// =====================================
// BLOGS ENDPOINTS
// =====================================

// Public: Get all published blogs
router.get('/blogs', async (req, res) => {
  try {
    const list = await db.select({
      id: blogs.id,
      title: blogs.title,
      slug: blogs.slug,
      content: blogs.content,
      authorId: blogs.authorId,
      status: blogs.status,
      coverImage: blogs.coverImage,
      createdAt: blogs.createdAt,
      updatedAt: blogs.updatedAt,
      authorName: users.name,
    })
    .from(blogs)
    .leftJoin(users, eq(blogs.authorId, users.id))
    .where(eq(blogs.status, 'published'))
    .orderBy(desc(blogs.createdAt));

    res.json(list);
  } catch (error) {
    console.error('Failed to get blogs:', error);
    res.status(500).json({ error: 'Failed to retrieve blog posts.' });
  }
});

// Public: Get single blog by slug or ID
router.get('/blogs/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const isId = /^\d+$/.test(identifier);

    const condition = isId 
      ? eq(blogs.id, parseInt(identifier, 10))
      : eq(blogs.slug, identifier);

    const result = await db.select({
      id: blogs.id,
      title: blogs.title,
      slug: blogs.slug,
      content: blogs.content,
      authorId: blogs.authorId,
      status: blogs.status,
      coverImage: blogs.coverImage,
      createdAt: blogs.createdAt,
      updatedAt: blogs.updatedAt,
      authorName: users.name,
    })
    .from(blogs)
    .leftJoin(users, eq(blogs.authorId, users.id))
    .where(condition)
    .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Blog post not found.' });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Failed to get blog:', error);
    res.status(500).json({ error: 'Failed to retrieve the blog post.' });
  }
});

// Admin: Get all blogs (including drafts)
router.get('/admin/blogs', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const list = await db.select({
      id: blogs.id,
      title: blogs.title,
      slug: blogs.slug,
      content: blogs.content,
      authorId: blogs.authorId,
      status: blogs.status,
      coverImage: blogs.coverImage,
      createdAt: blogs.createdAt,
      updatedAt: blogs.updatedAt,
      authorName: users.name,
    })
    .from(blogs)
    .leftJoin(users, eq(blogs.authorId, users.id))
    .orderBy(desc(blogs.createdAt));

    res.json(list);
  } catch (error) {
    console.error('Failed to get admin blogs:', error);
    res.status(500).json({ error: 'Failed to retrieve admin blog posts.' });
  }
});

// Admin: Create a new blog
router.post('/admin/blogs', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { title, slug, content, status, coverImage } = req.body;
    if (!title || !slug || !content) {
      return res.status(400).json({ error: 'Title, slug, and content are required.' });
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-');
    
    // Check if slug is unique
    const existing = await db.select().from(blogs).where(eq(blogs.slug, cleanSlug)).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'A blog post with this slug already exists.' });
    }

    const [newBlog] = await db.insert(blogs).values({
      title,
      slug: cleanSlug,
      content,
      authorId: req.user?.id || null,
      status: status || 'published',
      coverImage: coverImage || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    await logActivity(req.user?.id || null, 'Create Blog', `Created blog post: "${title}"`, req.ip);

    res.status(201).json(newBlog);
  } catch (error) {
    console.error('Failed to create blog:', error);
    res.status(500).json({ error: 'Failed to create blog post.' });
  }
});

// Admin: Update a blog
router.put('/admin/blogs/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { title, slug, content, status, coverImage } = req.body;
    if (!title || !slug || !content) {
      return res.status(400).json({ error: 'Title, slug, and content are required.' });
    }

    // Check if blog exists
    const existingBlog = await db.select().from(blogs).where(eq(blogs.id, id)).limit(1);
    if (existingBlog.length === 0) {
      return res.status(404).json({ error: 'Blog post not found.' });
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-');

    // Check if slug is taken by another blog
    const taken = await db.select().from(blogs).where(and(eq(blogs.slug, cleanSlug), sql`${blogs.id} != ${id}`)).limit(1);
    if (taken.length > 0) {
      return res.status(400).json({ error: 'Another blog post is already using this slug.' });
    }

    const [updatedBlog] = await db.update(blogs).set({
      title,
      slug: cleanSlug,
      content,
      status: status || 'published',
      coverImage: coverImage || null,
      updatedAt: new Date(),
    }).where(eq(blogs.id, id)).returning();

    await logActivity(req.user?.id || null, 'Update Blog', `Updated blog post: "${title}"`, req.ip);

    res.json(updatedBlog);
  } catch (error) {
    console.error('Failed to update blog:', error);
    res.status(500).json({ error: 'Failed to update blog post.' });
  }
});

// Admin: Delete a blog
router.delete('/admin/blogs/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const existingBlog = await db.select().from(blogs).where(eq(blogs.id, id)).limit(1);
    if (existingBlog.length === 0) {
      return res.status(404).json({ error: 'Blog post not found.' });
    }

    await db.delete(blogs).where(eq(blogs.id, id));

    await logActivity(req.user?.id || null, 'Delete Blog', `Deleted blog post: "${existingBlog[0].title}"`, req.ip);

    res.json({ success: true, message: 'Blog post deleted successfully.' });
  } catch (error) {
    console.error('Failed to delete blog:', error);
    res.status(500).json({ error: 'Failed to delete blog post.' });
  }
});

export default router;
