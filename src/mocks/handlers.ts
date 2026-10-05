import { http, HttpResponse, delay } from 'msw';
import { mockDb } from './db';
import { canTransitionSubOrder } from '../lib/order-state-machine';
import type { UserRole, SubOrderStatus } from '../types/domain';

// Helper to extract bearer token role
function getActorRoleFromHeader(request: Request): UserRole {
  const auth = request.headers.get('Authorization');
  if (!auth) return 'guest';
  if (auth.includes('usr-admin')) return 'admin';
  if (auth.includes('usr-vendor')) return 'vendor';
  if (auth.includes('usr-rider')) return 'rider';
  if (auth.includes('usr-support')) return 'support';
  return 'customer';
}

export const handlers = [
  // ==========================================
  // Health & System
  // ==========================================
  http.get('/api/health', async () => {
    await delay(100);
    return HttpResponse.json({
      status: 'ok',
      service: 'Vendora Mock Engine',
      timestamp: new Date().toISOString(),
    });
  }),

  http.post('/api/system/reset-demo', async () => {
    mockDb.resetToSeed();
    return HttpResponse.json({ success: true, message: 'Database reset to initial seed' });
  }),

  // ==========================================
  // Catalog & Search
  // ==========================================
  http.get('/api/categories', async () => {
    await delay(150);
    return HttpResponse.json({ categories: mockDb.categories });
  }),

  http.get('/api/products', async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.toLowerCase();
    const category = url.searchParams.get('category');
    const type = url.searchParams.get('type');
    const seller = url.searchParams.get('seller');
    const minPrice = parseFloat(url.searchParams.get('minPrice') || '0');
    const maxPrice = parseFloat(url.searchParams.get('maxPrice') || '999999');
    const sort = url.searchParams.get('sort') || 'featured';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '12', 10);

    let filtered = mockDb.products.filter((p) => p.status === 'approved');

    if (q) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.sellerName.toLowerCase().includes(q),
      );
    }

    if (category) {
      filtered = filtered.filter((p) => p.category === category);
    }

    if (type) {
      filtered = filtered.filter((p) => p.type === type);
    }

    if (seller === 'platform') {
      filtered = filtered.filter((p) => p.sellerType === 'platform');
    } else if (seller === 'vendor') {
      filtered = filtered.filter((p) => p.sellerType === 'vendor');
    }

    filtered = filtered.filter((p) => p.price >= minPrice && p.price <= maxPrice);

    // Sorting
    if (sort === 'price_asc') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sort === 'price_desc') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sort === 'rating') {
      filtered.sort((a, b) => b.rating - a.rating);
    }

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const items = filtered.slice(startIndex, startIndex + limit);

    return HttpResponse.json({
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: startIndex + limit < total,
    });
  }),

  http.get('/api/search/suggestions', async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.toLowerCase() || '';

    if (q.length < 2) {
      return HttpResponse.json({ suggestions: [] });
    }

    const matchedProducts = mockDb.products
      .filter((p) => p.title.toLowerCase().includes(q))
      .slice(0, 5)
      .map((p) => ({ type: 'product', title: p.title, id: p.id, price: p.price }));

    const matchedCategories = mockDb.categories
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 2)
      .map((c) => ({ type: 'category', title: c.name, id: c.id }));

    return HttpResponse.json({
      suggestions: [...matchedCategories, ...matchedProducts],
    });
  }),

  http.get('/api/products/:id', async ({ params }) => {
    await delay(150);
    const product = mockDb.products.find((p) => p.id === params.id);
    if (!product) {
      return new HttpResponse(JSON.stringify({ error: 'Product not found' }), { status: 404 });
    }
    return HttpResponse.json(product);
  }),

  http.get('/api/vendors/:id', async ({ params }) => {
    await delay(150);
    const vendor = mockDb.vendors.find((v) => v.id === params.id);
    if (!vendor) {
      return new HttpResponse(JSON.stringify({ error: 'Vendor not found' }), { status: 404 });
    }
    const vendorProducts = mockDb.products.filter((p) => p.sellerId === vendor.id && p.status === 'approved');
    return HttpResponse.json({ ...vendor, products: vendorProducts });
  }),

  // ==========================================
  // Orders & Multi-Vendor Checkout
  // ==========================================
  http.post('/api/orders', async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as any;

    if (!body.items || body.items.length === 0) {
      return new HttpResponse(JSON.stringify({ error: 'Cart is empty' }), { status: 400 });
    }

    const { orderGroup, createdSubOrders } = mockDb.createOrderGroup({
      customerId: body.customerId || 'guest',
      customerEmail: body.customerEmail || 'customer@demo.test',
      items: body.items,
      shippingAddress: body.shippingAddress,
      paymentMethod: body.paymentMethod || 'card',
      paymentBrand: body.paymentBrand,
      last4: body.last4,
    });

    return HttpResponse.json(
      {
        orderGroup,
        subOrders: createdSubOrders,
      },
      { status: 201 },
    );
  }),

  http.get('/api/orders', async ({ request }) => {
    await delay(200);
    const role = getActorRoleFromHeader(request);
    if (role === 'guest') {
      return new HttpResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    return HttpResponse.json({
      orderGroups: mockDb.orderGroups,
      subOrders: mockDb.subOrders,
    });
  }),

  http.get('/api/orders/:id', async ({ params }) => {
    await delay(150);
    const orderGroup = mockDb.orderGroups.find((og) => og.id === params.id);
    if (!orderGroup) {
      return new HttpResponse(JSON.stringify({ error: 'Order not found' }), { status: 404 });
    }

    const subOrders = mockDb.subOrders.filter((so) => so.orderGroupId === orderGroup.id);
    return HttpResponse.json({ orderGroup, subOrders });
  }),

  http.patch('/api/suborders/:id/status', async ({ params, request }) => {
    await delay(200);
    const role = getActorRoleFromHeader(request);
    const body = (await request.json()) as { nextStatus: SubOrderStatus; note?: string };

    const subOrder = mockDb.subOrders.find((so) => so.id === params.id);
    if (!subOrder) {
      return new HttpResponse(JSON.stringify({ error: 'SubOrder not found' }), { status: 404 });
    }

    const validation = canTransitionSubOrder(subOrder.status, body.nextStatus, subOrder.type, role);
    if (!validation.allowed) {
      return new HttpResponse(
        JSON.stringify({ error: validation.reason }),
        { status: 403 },
      );
    }

    const updated = mockDb.updateSubOrderStatus(subOrder.id, body.nextStatus, role, body.note);
    return HttpResponse.json(updated);
  }),

  // ==========================================
  // Commission Settings (Admin)
  // ==========================================
  http.get('/api/admin/commission', async ({ request }) => {
    const role = getActorRoleFromHeader(request);
    if (role !== 'admin') {
      return new HttpResponse(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }
    return HttpResponse.json(mockDb.commissionConfig);
  }),

  http.put('/api/admin/commission', async ({ request }) => {
    const role = getActorRoleFromHeader(request);
    if (role !== 'admin') {
      return new HttpResponse(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }
    const body = (await request.json()) as any;
    mockDb.commissionConfig = {
      ...mockDb.commissionConfig,
      ...body,
    };
    return HttpResponse.json(mockDb.commissionConfig);
  }),
];
