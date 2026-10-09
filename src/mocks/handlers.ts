import { http, HttpResponse, delay } from 'msw';
import { mockDb } from './db';
import { canTransitionSubOrder } from '../lib/order-state-machine';
import type { UserRole, SubOrderStatus, DisputeStatus } from '../types/domain';

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

    const subcategory = url.searchParams.get('subcategory') || url.searchParams.get('subCategory');

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
      const matchedCat = mockDb.categories.find(
        (c) => c.id === category || c.slug === category,
      );
      const targetId = matchedCat?.id || category;
      const targetSlug = matchedCat?.slug || category;
      filtered = filtered.filter(
        (p) =>
          p.category === targetId ||
          p.category === targetSlug ||
          p.category.toLowerCase().includes(category.toLowerCase()) ||
          (matchedCat && p.category.toLowerCase().includes(targetSlug.toLowerCase())),
      );
    }

    if (subcategory) {
      filtered = filtered.filter(
        (p) =>
          (p as any).subCategoryId === subcategory ||
          p.category.toLowerCase().includes(subcategory.toLowerCase()) ||
          p.title.toLowerCase().includes(subcategory.toLowerCase()),
      );
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
    } else if (sort === 'best_selling' || sort === 'best-selling') {
      filtered.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0) || b.rating - a.rating);
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
    const productId = params.id as string;
    let product = mockDb.products.find((p) => p.id === productId || p.slug === productId);
    if (!product) {
      const cleanTitle = productId
        .replace(/^(elec|beauty|home|deal|winter|fash|prod|groc)-/, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      product = {
        id: productId,
        title: cleanTitle || 'Vendora Verified Product',
        slug: productId,
        description: `Official authentic ${cleanTitle} backed by Vendora 100% Quality Assurance Guarantee. Includes premium packaging, original accessories, and express delivery.`,
        category: productId.startsWith('beauty')
          ? 'cat-beauty'
          : productId.startsWith('home')
            ? 'cat-home'
            : productId.startsWith('fash') || productId.startsWith('winter')
              ? 'cat-fashion'
              : 'cat-electronics',
        brand: 'Vendora',
        images: [
          '/images/products/prod_silver_headphones.jpg',
          '/images/products/prod_titanium_phone.jpg',
          '/images/products/prod_smart_watch.jpg',
          '/images/products/prod_gold_watch.jpg',
        ],
        price: 199.0,
        compareAtPrice: 249.0,
        type: 'physical',
        sellerId: 'platform',
        sellerName: 'Vendora',
        sellerType: 'platform',
        variants: [
          {
            id: `${productId}-var-1`,
            name: 'Standard Edition',
            sku: `VEN-${productId.slice(0, 6).toUpperCase()}-1`,
            price: 199.0,
            stock: 35,
            attributes: { edition: 'Standard' },
          },
          {
            id: `${productId}-var-2`,
            name: 'Pro Edition',
            sku: `VEN-${productId.slice(0, 6).toUpperCase()}-2`,
            price: 249.0,
            stock: 15,
            attributes: { edition: 'Pro' },
          },
        ],
        stock: 50,
        shippingSettings: { freeShipping: true, standardFee: 0 },
        rating: 4.9,
        reviewCount: 388,
        status: 'approved',
        createdAt: new Date().toISOString(),
      };
      mockDb.products.push(product);
    }
    return HttpResponse.json(product);
  }),

  http.get('/api/vendors/:id', async ({ params }) => {
    await delay(150);
    const vendor = mockDb.vendors.find((v) => v.id === params.id);
    if (!vendor) {
      return HttpResponse.json({ error: 'Vendor not found' }, { status: 404 });
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

  // ==========================================
  // Rider Deliveries Console
  // ==========================================
  http.get('/api/rider/deliveries', async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const riderId = url.searchParams.get('riderId') || undefined;
    const deliveries = mockDb.getRiderDeliveries(riderId);
    return HttpResponse.json({ deliveries });
  }),

  http.post('/api/rider/verify-delivery', async ({ request }) => {
    await delay(200);
    const body = (await request.json()) as { subOrderId: string; code: string };
    const result = mockDb.verifyRiderDelivery(body.subOrderId, body.code);
    if (!result.success) {
      return new HttpResponse(JSON.stringify({ error: result.message }), { status: 400 });
    }
    return HttpResponse.json(result);
  }),

  http.patch('/api/rider/deliveries/:id/status', async ({ params, request }) => {
    await delay(150);
    const body = (await request.json()) as { nextStatus: SubOrderStatus; note?: string };
    const updated = mockDb.updateSubOrderStatus(params.id as string, body.nextStatus, 'Rider', body.note);
    return HttpResponse.json(updated);
  }),

  // ==========================================
  // Customer Support & Disputes Console
  // ==========================================
  http.get('/api/disputes', async () => {
    await delay(150);
    return HttpResponse.json({ disputes: mockDb.disputes });
  }),

  http.get('/api/disputes/:id', async ({ params }) => {
    await delay(100);
    const dispute = mockDb.disputes.find((d) => d.id === params.id);
    if (!dispute) {
      return new HttpResponse(JSON.stringify({ error: 'Dispute not found' }), { status: 404 });
    }
    return HttpResponse.json({ dispute });
  }),

  http.post('/api/disputes/:id/messages', async ({ params, request }) => {
    await delay(150);
    const body = (await request.json()) as {
      senderRole: UserRole;
      senderName: string;
      content: string;
      isInternalNote: boolean;
    };
    const updated = mockDb.addDisputeMessage(params.id as string, body);
    return HttpResponse.json(updated);
  }),

  http.patch('/api/disputes/:id/resolve', async ({ params, request }) => {
    await delay(200);
    const body = (await request.json()) as {
      status: DisputeStatus;
      resolutionNote?: string;
    };
    const updated = mockDb.updateDisputeStatus(params.id as string, body.status, body.resolutionNote);
    return HttpResponse.json(updated);
  }),
];
