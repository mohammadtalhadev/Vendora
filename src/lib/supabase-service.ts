import { supabase, isSupabaseConfigured } from './supabase-legacy';
import type { Product, Category, SubOrder, OrderGroup, Dispute, DisputeStatus } from '../types/domain';

export const isUuid = (val?: string): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

/**
 * Catalog & Products Service
 */
export const supabaseCatalog = {
  async getCategories(): Promise<Category[]> {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('[Supabase] Failed to fetch categories:', error);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      icon: row.icon || undefined,
      image: row.image || undefined,
      commissionRateOverride: row.commission_rate_override ? Number(row.commission_rate_override) : undefined,
    }));
  },

  async createCategory(category: { id: string; name: string; slug: string; image?: string; icon?: string; commissionRateOverride?: number }): Promise<Category | null> {
    if (!isSupabaseConfigured) return null;

    const row = {
      id: category.id,
      name: category.name,
      slug: category.slug,
      image: category.image || null,
      icon: category.icon || null,
      commission_rate_override: category.commissionRateOverride || null,
    };

    const { data, error } = await supabase.from('categories').insert(row).select().single();
    if (error) {
      console.error('[Supabase] Failed to create category:', error);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      icon: data.icon || undefined,
      image: data.image || undefined,
      commissionRateOverride: data.commission_rate_override ? Number(data.commission_rate_override) : undefined,
    };
  },

  async updateCategory(id: string, updates: Partial<Category>): Promise<boolean> {
    if (!isSupabaseConfigured) return false;

    const row: Record<string, any> = {};
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.slug !== undefined) row.slug = updates.slug;
    if (updates.image !== undefined) row.image = updates.image;
    if (updates.icon !== undefined) row.icon = updates.icon;
    if (updates.commissionRateOverride !== undefined) row.commission_rate_override = updates.commissionRateOverride;

    const { error } = await supabase.from('categories').update(row).eq('id', id);
    if (error) {
      console.error('[Supabase] Failed to update category:', error);
      return false;
    }
    return true;
  },

  async deleteCategory(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      console.error('[Supabase] Failed to delete category:', error);
      return false;
    }
    return true;
  },

  async getProducts(filter?: { category?: string; status?: string | 'all'; sellerId?: string }): Promise<Product[]> {
    if (!isSupabaseConfigured) return [];

    let query = supabase.from('products').select('*');

    if (filter?.status && filter.status !== 'all') {
      query = query.eq('status', filter.status);
    } else if (!filter?.status) {
      // Default to approved only if no status specified
      query = query.eq('status', 'approved');
    }
    // If filter.status === 'all', query without status filter

    if (filter?.category) {
      const cat = filter.category;
      if (cat.startsWith('cat-')) {
        query = query.eq('category_id', cat);
      } else {
        // Lookup matching category id by slug (e.g. 'electronics' -> 'cat-electronics')
        const { data: catData } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', cat)
          .maybeSingle();

        if (catData?.id) {
          query = query.eq('category_id', catData.id);
        } else {
          query = query.or(`category_id.eq.${cat},category_id.eq.cat-${cat}`);
        }
      }
    }

    if (filter?.sellerId) {
      query = query.eq('seller_id', filter.sellerId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.error('[Supabase] Failed to fetch products:', error);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description || '',
      category: row.category_id || '',
      brand: row.brand || '',
      images: row.images || [],
      price: Number(row.price),
      compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : undefined,
      type: row.type,
      sellerId: row.seller_id,
      sellerName: row.seller_name,
      sellerType: row.seller_type,
      variants: row.variants || [],
      stock: row.stock || 0,
      shippingSettings: row.shipping_settings || undefined,
      digitalAssetInfo: row.digital_asset_info || undefined,
      rating: Number(row.rating || 0),
      reviewCount: row.review_count || 0,
      status: row.status,
      rejectionReason: row.rejection_reason || undefined,
      createdAt: row.created_at,
    }));
  },

  async getProductBySlug(slug: string): Promise<Product | null> {
    if (!isSupabaseConfigured) return null;

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or(`id.eq.${slug},slug.eq.${slug}`)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      title: data.title,
      slug: data.slug,
      description: data.description || '',
      category: data.category_id || '',
      brand: data.brand || '',
      images: data.images || [],
      price: Number(data.price),
      compareAtPrice: data.compare_at_price ? Number(data.compare_at_price) : undefined,
      type: data.type,
      sellerId: data.seller_id,
      sellerName: data.seller_name,
      sellerType: data.seller_type,
      variants: data.variants || [],
      stock: data.stock || 0,
      shippingSettings: data.shipping_settings || undefined,
      digitalAssetInfo: data.digital_asset_info || undefined,
      rating: Number(data.rating || 0),
      reviewCount: data.review_count || 0,
      status: data.status,
      rejectionReason: data.rejection_reason || undefined,
      createdAt: data.created_at,
    };
  },

  async createProduct(product: Partial<Product>): Promise<Product | null> {
    if (!isSupabaseConfigured) return null;

    const row = {
      id: product.id || `prod-${Date.now()}`,
      title: product.title,
      slug: product.slug,
      description: product.description || '',
      category_id: product.category,
      brand: product.brand || '',
      images: product.images || [],
      price: product.price,
      compare_at_price: product.compareAtPrice || null,
      type: product.type || 'physical',
      seller_id: product.sellerId || 'vendor-apple',
      seller_name: product.sellerName || 'Apple Official Store',
      seller_type: product.sellerType || 'vendor',
      variants: product.variants || [],
      stock: product.stock ?? 10,
      shipping_settings: product.shippingSettings || {},
      digital_asset_info: product.digitalAssetInfo || {},
      rating: product.rating ?? 5.0,
      review_count: product.reviewCount ?? 0,
      status: product.status || 'approved',
    };

    const { data, error } = await supabase.from('products').insert(row).select().single();
    if (error) {
      console.error('[Supabase] Failed to create product:', error);
      return null;
    }
    return {
      ...product,
      id: data.id,
    } as Product;
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<boolean> {
    if (!isSupabaseConfigured) return false;

    const row: Record<string, any> = {};
    if (updates.title !== undefined) row.title = updates.title;
    if (updates.price !== undefined) row.price = updates.price;
    if (updates.compareAtPrice !== undefined) row.compare_at_price = updates.compareAtPrice;
    if (updates.stock !== undefined) row.stock = updates.stock;
    if (updates.status !== undefined) row.status = updates.status;
    if (updates.rejectionReason !== undefined) row.rejection_reason = updates.rejectionReason;
    if (updates.category !== undefined) row.category_id = updates.category;
    if (updates.brand !== undefined) row.brand = updates.brand;
    if (updates.description !== undefined) row.description = updates.description;

    const { error } = await supabase.from('products').update(row).eq('id', id);
    if (error) {
      console.error('[Supabase] Failed to update product:', error);
      return false;
    }
    return true;
  },

  async deleteProduct(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      console.error('[Supabase] Failed to delete product:', error);
      return false;
    }
    return true;
  },
};

/**
 * Vendor Profiles Service with Supabase
 */
export const supabaseVendors = {
  async getVendors(): Promise<any[]> {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await supabase
      .from('vendor_profiles')
      .select('*')
      .order('store_name');

    if (error) {
      console.error('[Supabase] Failed to fetch vendors:', error);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      storeName: row.store_name,
      slug: row.slug,
      subdomain: `${row.slug}.vendora.market`,
      description: row.description || '',
      logo: row.logo || '',
      banner: row.banner || '',
      rating: Number(row.rating || 5.0),
      reviewCount: Number(row.review_count || 0),
      commissionRateOverride: row.commission_rate_override ? Number(row.commission_rate_override) : undefined,
      commissionRate: row.commission_rate_override ? Number(row.commission_rate_override) : 0.10,
      status: (row.status as 'active' | 'suspended') || 'active',
      createdAt: row.created_at,
    }));
  },

  async getVendorById(id: string): Promise<any | null> {
    if (!isSupabaseConfigured) return null;

    const { data, error } = await supabase
      .from('vendor_profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      storeName: data.store_name,
      slug: data.slug,
      subdomain: `${data.slug}.vendora.market`,
      description: data.description || '',
      logo: data.logo || '',
      banner: data.banner || '',
      rating: Number(data.rating || 5.0),
      reviewCount: Number(data.review_count || 0),
      commissionRateOverride: data.commission_rate_override ? Number(data.commission_rate_override) : undefined,
      commissionRate: data.commission_rate_override ? Number(data.commission_rate_override) : 0.10,
      status: (data.status as 'active' | 'suspended') || 'active',
      createdAt: data.created_at,
    };
  },

  async updateVendor(id: string, updates: Record<string, any>): Promise<boolean> {
    if (!isSupabaseConfigured) return false;

    const row: Record<string, any> = {};
    if (updates.storeName !== undefined) row.store_name = updates.storeName;
    if (updates.status !== undefined) row.status = updates.status;
    if (updates.commissionRateOverride !== undefined) row.commission_rate_override = updates.commissionRateOverride;
    if (updates.description !== undefined) row.description = updates.description;
    if (updates.logo !== undefined) row.logo = updates.logo;
    if (updates.banner !== undefined) row.banner = updates.banner;

    const { error } = await supabase.from('vendor_profiles').update(row).eq('id', id);
    if (error) {
      console.error('[Supabase] Failed to update vendor:', error);
      return false;
    }
    return true;
  },

  async createVendor(vendor: {
    id?: string;
    storeName: string;
    slug?: string;
    description?: string;
    status?: 'active' | 'suspended';
    commissionRateOverride?: number;
    logo?: string;
    banner?: string;
  }): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const slug =
        vendor.slug ||
        vendor.storeName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '');
      const id = vendor.id || `vendor-${slug}`;
      const { error } = await supabase.from('vendor_profiles').upsert({
        id,
        store_name: vendor.storeName,
        slug,
        description: vendor.description || `${vendor.storeName} official storefront on Vendora.`,
        status: vendor.status || 'active',
        commission_rate_override: vendor.commissionRateOverride ?? 0.08,
        logo: vendor.logo || '',
        banner: vendor.banner || '',
      });
      if (error) {
        console.warn('[Supabase] Failed to create vendor profile:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[Supabase] createVendor error:', err);
      return false;
    }
  },
};

/**
 * Storage Service for Product Images and Media Assets
 */
export const supabaseStorage = {
  /**
   * Uploads an image file to Supabase Storage bucket 'product-images'
   * Returns the permanent public URL
   */
  async uploadProductImage(
    file: File,
    folder: string = 'products'
  ): Promise<{ url: string | null; error: Error | null }> {
    if (!isSupabaseConfigured) {
      return { url: null, error: new Error('Supabase is not configured') };
    }

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const cleanName = file.name
        .substring(0, file.name.lastIndexOf('.'))
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${folder}/${Date.now()}_${cleanName}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        return { url: null, error: new Error(uploadError.message) };
      }

      const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
      return { url: data.publicUrl, error: null };
    } catch (err: any) {
      return { url: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Uploads a store logo or banner to bucket 'vendor-assets'
   */
  async uploadVendorAsset(
    file: File,
    vendorId: string,
    type: 'logo' | 'banner' = 'logo'
  ): Promise<{ url: string | null; error: Error | null }> {
    if (!isSupabaseConfigured) {
      return { url: null, error: new Error('Supabase is not configured') };
    }

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `${vendorId}/${type}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('vendor-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        return { url: null, error: new Error(uploadError.message) };
      }

      const { data } = supabase.storage.from('vendor-assets').getPublicUrl(fileName);
      return { url: data.publicUrl, error: null };
    } catch (err: any) {
      return { url: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Uploads dispute evidence to private bucket 'dispute-evidence'
   */
  async uploadDisputeEvidence(
    file: File,
    disputeId: string
  ): Promise<{ url: string | null; error: Error | null }> {
    if (!isSupabaseConfigured) {
      return { url: null, error: new Error('Supabase is not configured') };
    }

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${disputeId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('dispute-evidence')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        return { url: null, error: new Error(uploadError.message) };
      }

      const { data } = supabase.storage.from('dispute-evidence').getPublicUrl(fileName);
      return { url: data.publicUrl, error: null };
    } catch (err: any) {
      return { url: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Uploads user avatar to bucket 'user-avatars'
   */
  async uploadUserAvatar(
    file: File,
    userId: string
  ): Promise<{ url: string | null; error: Error | null }> {
    if (!isSupabaseConfigured) {
      return { url: null, error: new Error('Supabase is not configured') };
    }

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `${userId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        return { url: null, error: new Error(uploadError.message) };
      }

      const { data } = supabase.storage.from('user-avatars').getPublicUrl(fileName);
      return { url: data.publicUrl, error: null };
    } catch (err: any) {
      return { url: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },
};

/**
 * Orders Service
 */
export const supabaseOrders = {
  async getOrders(): Promise<{ orders: OrderGroup[]; subOrders: SubOrder[] }> {
    if (!isSupabaseConfigured) return { orders: [], subOrders: [] };

    try {
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: subOrdersData, error: subOrdersErr } = await supabase
        .from('sub_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersErr || subOrdersErr) {
        console.warn('[Supabase] Failed to fetch orders/sub_orders:', ordersErr || subOrdersErr);
        return { orders: [], subOrders: [] };
      }

      const orders: OrderGroup[] = (ordersData || []).map((o) => ({
        id: o.id,
        customerId: o.customer_id || 'guest',
        customerEmail: o.customer_email,
        shippingAddress: o.shipping_address,
        paymentMethod: o.payment_method,
        paymentDetails: o.payment_details || { brand: 'Visa', last4: '4242' },
        subOrderIds: [],
        createdAt: o.created_at,
      }));

      const subOrders: SubOrder[] = (subOrdersData || []).map((so) => {
        const matchingOrder = orders.find((o) => o.id === so.order_group_id);
        return {
          id: so.id,
          orderGroupId: so.order_group_id,
          shippingAddress: so.shipping_address || matchingOrder?.shippingAddress || undefined,
          sellerId: so.seller_id,
          sellerName: so.seller_name,
          sellerType: so.seller_type,
          type: so.type,
          items: so.items || [],
          subtotal: Number(so.subtotal),
          shippingFee: Number(so.shippingFee || so.shipping_fee || 0),
          commissionRate: Number(so.commissionRate || so.commission_rate || 0.1),
          commissionAmount: Number(so.commissionAmount || so.commission_amount || 0),
          netPayout: Number(so.netPayout || so.net_payout || 0),
          status: so.status,
          riderId: so.rider_id || undefined,
          deliveryCode: so.delivery_code || undefined,
          licenseKey: so.license_key || undefined,
          history: so.history || [],
          createdAt: so.created_at,
        };
      });

      // link subOrderIds to orders
      orders.forEach((o) => {
        o.subOrderIds = subOrders.filter((so) => so.orderGroupId === o.id).map((so) => so.id);
      });

      return { orders, subOrders };
    } catch (err) {
      console.error('[Supabase] Orders query error:', err);
      return { orders: [], subOrders: [] };
    }
  },

  async createOrder(orderGroup: OrderGroup, subOrders: SubOrder[]): Promise<boolean> {
    if (!isSupabaseConfigured) return false;

    // 1. Insert order group
    const customerUuid = isUuid(orderGroup.customerId) ? orderGroup.customerId : null;
    const { error: orderError } = await supabase.from('orders').insert({
      id: orderGroup.id,
      customer_id: customerUuid,
      customer_email: orderGroup.customerEmail,
      shipping_address: orderGroup.shippingAddress,
      payment_method: orderGroup.paymentMethod,
    });

    if (orderError) {
      console.error('[Supabase] Failed to create order group:', orderError);
      return false;
    }

    // 2. Insert sub orders
    const subOrdersData = subOrders.map((so) => ({
      id: so.id,
      order_group_id: orderGroup.id,
      seller_id: so.sellerId,
      seller_name: so.sellerName,
      seller_type: so.sellerType,
      type: so.type,
      items: so.items,
      subtotal: so.subtotal,
      shipping_fee: so.shippingFee,
      commission_rate: so.commissionRate,
      commission_amount: so.commissionAmount,
      net_payout: so.netPayout,
      status: so.status,
      rider_id: so.riderId,
      delivery_code: so.deliveryCode,
      license_key: so.licenseKey,
      history: so.history,
    }));

    const { error: subOrdersError } = await supabase.from('sub_orders').insert(subOrdersData);
    if (subOrdersError) {
      console.error('[Supabase] Failed to create sub orders:', subOrdersError);
      return false;
    }

    // 3. Auto-create delivery record for physical sub-orders
    try {
      const physicalSubOrders = subOrders.filter((so) => so.type === 'physical');
      if (physicalSubOrders.length > 0) {
        const deliveriesData = physicalSubOrders.map((so) => ({
          id: `del-${so.id}`,
          sub_order_id: so.id,
          status: 'pending',
          pickup_details: {
            seller_id: so.sellerId,
            seller_name: so.sellerName,
          },
          dropoff_details: {
            customer_email: orderGroup.customerEmail,
            shipping_address: orderGroup.shippingAddress,
          },
          handover_code_hash: so.deliveryCode || '4921',
        }));
        await supabase.from('deliveries').upsert(deliveriesData);
      }
    } catch (delErr) {
      console.warn('[Supabase] Non-fatal delivery creation error:', delErr);
    }

    return true;
  },

  async updateSubOrderStatus(subOrderId: string, status: string, note?: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;

    // Fetch existing history to append
    let historyUpdate: any = undefined;
    try {
      const { data } = await supabase.from('sub_orders').select('history').eq('id', subOrderId).single();
      const currentHistory = Array.isArray(data?.history) ? data.history : [];
      historyUpdate = [
        ...currentHistory,
        {
          status,
          timestamp: new Date().toISOString(),
          actor: 'Admin',
          note: note || `Status updated to ${status}`,
        },
      ];
    } catch {
      // ignore
    }

    const updatePayload: Record<string, any> = { status };
    if (historyUpdate) {
      updatePayload.history = historyUpdate;
    }

    const { error } = await supabase
      .from('sub_orders')
      .update(updatePayload)
      .eq('id', subOrderId);

    if (error) {
      console.error('[Supabase] Failed to update sub-order status:', error);
      return false;
    }
    return true;
  },
};

/**
 * Disputes Service with Supabase
 */
export const supabaseDisputes = {
  async getDisputes(): Promise<Dispute[]> {
    if (!isSupabaseConfigured) return [];

    try {
      const { data, error } = await supabase
        .from('disputes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // If disputes table not yet queried or empty
        return [];
      }

      return (data || []).map((row) => ({
        id: row.id,
        subOrderId: row.sub_order_id,
        orderGroupId: row.order_group_id || '',
        customerId: row.customer_id || '',
        customerName: row.customer_name || 'Customer',
        customerAvatar: row.customer_avatar || undefined,
        vendorId: row.vendor_id || '',
        vendorName: row.vendor_name || 'Vendor',
        reason: row.reason || '',
        status: row.status as DisputeStatus,
        urgency: row.urgency || 'standard',
        messages: row.messages || [],
        assignedAgentId: row.assigned_agent_id || undefined,
        resolutionNote: row.resolution_note || undefined,
        resolutionAmount: row.resolution_amount ? Number(row.resolution_amount) : undefined,
        evidencePhotos: row.evidence_photos || [],
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.warn('[Supabase] Disputes query error:', err);
      return [];
    }
  },

  async createDispute(dispute: Partial<Dispute>): Promise<boolean> {
    if (!isSupabaseConfigured) return false;

    try {
      const { error } = await supabase.from('disputes').insert({
        id: dispute.id || `dsp-${Date.now()}`,
        sub_order_id: dispute.subOrderId,
        order_group_id: dispute.orderGroupId || null,
        customer_id: dispute.customerId || null,
        customer_name: dispute.customerName || null,
        vendor_id: dispute.vendorId,
        vendor_name: dispute.vendorName || null,
        reason: dispute.reason,
        status: dispute.status || 'open',
        urgency: dispute.urgency || 'standard',
        messages: dispute.messages || [],
        evidence_photos: dispute.evidencePhotos || [],
      });

      if (error) {
        console.warn('[Supabase] Failed to create dispute in DB:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[Supabase] createDispute error:', err);
      return false;
    }
  },

  async resolveDispute(id: string, resolution: string, amount?: number): Promise<boolean> {
    if (!isSupabaseConfigured) return false;

    try {
      const { error } = await supabase
        .from('disputes')
        .update({
          status: 'resolved_refund',
          resolution_note: resolution,
          resolution_amount: amount || null,
        })
        .eq('id', id);

      if (error) {
        console.warn('[Supabase] Failed to resolve dispute in DB:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[Supabase] resolveDispute error:', err);
      return false;
    }
  },

  async addDisputeMessage(disputeId: string, message: any): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { data } = await supabase.from('disputes').select('messages').eq('id', disputeId).single();
      const current = (data?.messages || []) as any[];
      const updated = [...current, message];
      const { error } = await supabase.from('disputes').update({ messages: updated }).eq('id', disputeId);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('[Supabase] addDisputeMessage error:', err);
      return false;
    }
  },
};

/**
 * Supabase Admin Synchronization Service
 */
export const supabaseAdmin = {
  /**
   * Fetches the entire synchronized snapshot from Supabase for Admin Panel
   */
  async getSyncData(): Promise<{
    products: Product[];
    vendors: any[];
    categories: Category[];
    orders: OrderGroup[];
    subOrders: SubOrder[];
    disputes: Dispute[];
    promotions?: any[];
    payouts?: any[];
    riders?: any[];
    deliveries?: any[];
    auditLogs?: any[];
    contentBlocks?: any[];
    applications?: any[];
  }> {
    if (!isSupabaseConfigured) {
      return { products: [], vendors: [], categories: [], orders: [], subOrders: [], disputes: [] };
    }

    try {
      const [
        products,
        vendors,
        categories,
        ordersRes,
        disputes,
        promotions,
        payouts,
        riders,
        deliveries,
        auditLogs,
        contentBlocks,
        applications,
      ] = await Promise.all([
        supabaseCatalog.getProducts({ status: 'all' }),
        supabaseVendors.getVendors(),
        supabaseCatalog.getCategories(),
        supabaseOrders.getOrders(),
        supabaseDisputes.getDisputes(),
        supabasePromotions.getPromotions(),
        supabasePayouts.getPayouts(),
        supabaseLogistics.getRiders(),
        supabaseLogistics.getDeliveries(),
        supabaseAuditLogs.getLogs(),
        supabaseCMS.getContentBlocks(),
        supabaseApplications.getApplications(),
      ]);

      return {
        products,
        vendors,
        categories,
        orders: ordersRes.orders,
        subOrders: ordersRes.subOrders,
        disputes,
        promotions,
        payouts,
        riders,
        deliveries,
        auditLogs,
        contentBlocks,
        applications,
      };
    } catch (err) {
      console.error('[Supabase Admin] Failed to fetch sync data:', err);
      return { products: [], vendors: [], categories: [], orders: [], subOrders: [], disputes: [] };
    }
  },

  async moderateProduct(id: string, status: 'approved' | 'rejected', reason?: string): Promise<boolean> {
    return supabaseCatalog.updateProduct(id, {
      status,
      rejectionReason: reason || undefined,
    });
  },

  async updateVendorStatus(id: string, status: 'active' | 'suspended'): Promise<boolean> {
    return supabaseVendors.updateVendor(id, { status });
  },

  async updateVendorCommission(id: string, rate: number): Promise<boolean> {
    return supabaseVendors.updateVendor(id, { commissionRateOverride: rate });
  },

  async updateCategoryCommission(id: string, rate: number): Promise<boolean> {
    return supabaseCatalog.updateCategory(id, { commissionRateOverride: rate });
  },
};

/**
 * Promotions Service with Supabase
 */
export const supabasePromotions = {
  async getPromotions() {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[Supabase] getPromotions error:', err);
      return [];
    }
  },

  async createPromotion(promo: {
    id?: string;
    code: string;
    title: string;
    description?: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minimumOrder?: number;
    maxDiscount?: number;
    usageLimit?: number;
    active?: boolean;
  }): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const id = promo.id || `promo-${Date.now()}`;
      const { error } = await supabase.from('promotions').insert({
        id,
        code: promo.code.toUpperCase().trim(),
        title: promo.title,
        description: promo.description || '',
        discount_type: promo.discountType,
        discount_value: promo.discountValue,
        minimum_order: promo.minimumOrder || 0,
        max_discount: promo.maxDiscount || null,
        usage_limit: promo.usageLimit || 1000,
        usage_count: 0,
        active: promo.active ?? true,
      });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Supabase] createPromotion error:', err);
      return false;
    }
  },

  async togglePromotion(id: string, active: boolean): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase
        .from('promotions')
        .update({ active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Supabase] togglePromotion error:', err);
      return false;
    }
  },

  async deletePromotion(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('promotions').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Supabase] deletePromotion error:', err);
      return false;
    }
  },

  async validateCoupon(code: string, subtotal: number) {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .eq('active', true)
        .maybeSingle();
      if (error || !data) return null;
      if (data.minimum_order && subtotal < Number(data.minimum_order)) {
        return { valid: false, reason: `Minimum order of $${data.minimum_order} required.` };
      }
      return {
        valid: true,
        code: data.code,
        discountType: data.discount_type as 'percentage' | 'fixed',
        discountValue: Number(data.discount_value),
        maxDiscount: data.max_discount ? Number(data.max_discount) : undefined,
      };
    } catch (err) {
      console.warn('[Supabase] validateCoupon error:', err);
      return null;
    }
  },
};

/**
 * Payouts Service with Supabase
 */
export const supabasePayouts = {
  async getPayouts(sellerId?: string) {
    if (!isSupabaseConfigured) return [];
    try {
      let query = supabase.from('payouts').select('*').order('created_at', { ascending: false });
      if (sellerId) query = query.eq('seller_id', sellerId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((p) => ({
        id: p.id,
        period: p.metadata?.destination ? `Settlement to ${p.metadata.destination}` : 'Accelerated Settlement',
        destination: p.metadata?.destination || 'Primary Registered Bank',
        amount: Number(p.amount),
        status: p.status as 'processing' | 'completed' | 'failed',
        traceId: p.payment_reference || `FAST-${p.id}`,
        createdAt: p.created_at,
      }));
    } catch (err) {
      console.warn('[Supabase] getPayouts error:', err);
      return [];
    }
  },

  async requestInstantPayout(sellerId: string, amount: number, destination: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const id = `TR-${Date.now().toString().slice(-5)}-FAST`;
      const traceId = `FAST-${Math.floor(10000000 + Math.random() * 90000000)}`;
      const { error } = await supabase.from('payouts').insert({
        id,
        seller_id: sellerId || 'vendor-apple',
        amount,
        currency: 'USD',
        status: 'processing',
        payment_method: 'ACH Instant Direct Transfer',
        payment_reference: traceId,
        metadata: { destination, type: 'instant' },
      });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Supabase] requestInstantPayout error:', err);
      return false;
    }
  },
};

/**
 * Logistics & Rider Service with Supabase
 */
export const supabaseLogistics = {
  async getDeliveries() {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[Supabase] getDeliveries error:', err);
      return [];
    }
  },

  async getRiders() {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('rider_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((r) => ({
        id: r.id,
        name: r.full_name || 'Fleet Courier',
        phone: r.phone || '',
        vehicle: (r.vehicle_type as any) || 'Motorcycle',
        isOnline: r.status === 'available' || r.status === 'busy',
        activeDeliveriesCount: r.status === 'busy' ? 2 : 0,
        completedToday: 8,
        onTimeRate: 98.5,
      }));
    } catch (err) {
      console.warn('[Supabase] getRiders error:', err);
      return [];
    }
  },

  async assignRider(deliveryId: string, riderId: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase
        .from('deliveries')
        .update({
          rider_id: riderId,
          status: 'assigned',
          assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', deliveryId);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Supabase] assignRider error:', err);
      return false;
    }
  },

  async updateDeliveryStatus(deliveryId: string, status: string, notes?: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const updates: Record<string, any> = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (status === 'picked_up') updates.picked_up_at = new Date().toISOString();
      if (status === 'delivered') updates.delivered_at = new Date().toISOString();
      if (notes) updates.proof_of_delivery = { notes };

      const { error } = await supabase.from('deliveries').update(updates).eq('id', deliveryId);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Supabase] updateDeliveryStatus error:', err);
      return false;
    }
  },

  async updateRiderStatus(riderId: string, status: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase
        .from('rider_profiles')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', riderId);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Supabase] updateRiderStatus error:', err);
      return false;
    }
  },
};

/**
 * Notifications Service with Supabase
 */
export const supabaseNotifications = {
  async getNotifications(userId?: string) {
    if (!isSupabaseConfigured) return [];
    try {
      let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });
      if (userId && isUuid(userId)) {
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message || '',
        type: (n.type as any) || 'system',
        timestamp: n.created_at,
        isRead: Boolean(n.read_at),
        linkUrl: n.href || undefined,
        roleTarget: (n.role_target as any) || 'all',
      }));
    } catch (err) {
      console.warn('[Supabase] getNotifications error:', err);
      return [];
    }
  },

  async markAsRead(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Supabase] markAsRead error:', err);
      return false;
    }
  },

  async createNotification(notif: {
    id?: string;
    userId?: string;
    roleTarget?: string;
    type: string;
    title: string;
    message: string;
    href?: string;
  }): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const id = notif.id || `notif-${Date.now()}`;
      const { error } = await supabase.from('notifications').insert({
        id,
        user_id: isUuid(notif.userId) ? notif.userId : null,
        role_target: notif.roleTarget || 'all',
        type: notif.type,
        title: notif.title,
        message: notif.message,
        href: notif.href || null,
      });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Supabase] createNotification error:', err);
      return false;
    }
  },
};

/**
 * Admin Audit Logs Service with Supabase
 */
export const supabaseAuditLogs = {
  async getLogs() {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []).map((l) => ({
        id: `aud-${l.id}`,
        timestamp: l.created_at,
        actor: l.actor_role === 'Super Admin' ? 'Elena Administrator' : (l.actor_role || 'System'),
        actorRole: l.actor_role || 'Admin',
        action: l.action as any,
        targetResource: `${l.entity_type || 'System'}: ${l.entity_id || 'All'}`,
        ipAddress: l.ip_address || '127.0.0.1 (Secure Console)',
        details: l.after_data?.details || `Operation executed: ${l.action}`,
        beforeState: l.before_data || {},
        afterState: l.after_data || {},
      }));
    } catch (err) {
      console.warn('[Supabase] getLogs error:', err);
      return [];
    }
  },

  async logAction(
    action: string,
    entityType: string,
    entityId: string,
    actorRole = 'Super Admin',
    details?: string,
    beforeData?: any,
    afterData?: any
  ): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('audit_logs').insert({
        actor_id: null,
        actor_role: actorRole,
        action,
        entity_type: entityType,
        entity_id: entityId,
        before_data: beforeData || null,
        after_data: afterData ? { details, ...afterData } : { details },
      });
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('[Supabase] logAction error:', err);
      return false;
    }
  },
};

/**
 * CMS & Content Blocks Service with Supabase
 */
export const supabaseCMS = {
  async getContentBlocks() {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('content_blocks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[Supabase] getContentBlocks error:', err);
      return [];
    }
  },

  async getBlockBySlug(slug: string) {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('content_blocks')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('[Supabase] getBlockBySlug error:', err);
      return null;
    }
  },

  async saveContentBlock(block: {
    id: string;
    slug: string;
    title: string;
    body: any;
    placement?: string;
    published?: boolean;
  }): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('content_blocks').upsert({
        id: block.id,
        slug: block.slug,
        title: block.title,
        body: block.body,
        placement: block.placement || 'homepage_hero',
        published: block.published ?? true,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Supabase] saveContentBlock error:', err);
      return false;
    }
  },
};

/**
 * Seller KYC Applications Service with Supabase
 */
export const supabaseApplications = {
  async submitApplication(app: {
    id?: string;
    userId?: string;
    proposedStoreName: string;
    slug: string;
    businessType?: string;
    contactEmail: string;
    contactPhone?: string;
    businessAddress?: any;
    kycDocuments?: any;
  }): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const id = app.id || `app-${Date.now()}`;
      const { error } = await supabase.from('vendor_applications').insert({
        id,
        user_id: isUuid(app.userId) ? app.userId : null,
        proposed_store_name: app.proposedStoreName,
        slug: app.slug,
        business_type: app.businessType || 'General Retail',
        contact_email: app.contactEmail,
        contact_phone: app.contactPhone || null,
        business_address: app.businessAddress || null,
        kyc_documents: app.kycDocuments || null,
        status: 'pending',
      });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Supabase] submitApplication error:', err);
      return false;
    }
  },

  async getApplications() {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('vendor_applications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[Supabase] getApplications error:', err);
      return [];
    }
  },

  async reviewApplication(
    id: string,
    status: 'approved' | 'rejected' | 'under_review',
    note?: string
  ): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase
        .from('vendor_applications')
        .update({
          status,
          review_note: note || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Supabase] reviewApplication error:', err);
      return false;
    }
  },
};

/**
 * User Profiles Service with Supabase
 */
export const supabaseUsers = {
  async getUsers() {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((p) => {
        const roles = Array.isArray(p.roles) ? p.roles : ['customer'];
        let displayRole: any = 'Buyer';
        if (roles.includes('admin')) displayRole = 'Platform Admin';
        else if (roles.includes('vendor')) displayRole = 'Vendor Admin';
        else if (roles.includes('rider')) displayRole = 'Vendor Staff';

        const initials = (p.name || p.email.split('@')[0])
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        return {
          id: p.id,
          initials,
          name: p.name || p.email.split('@')[0],
          email: p.email,
          role: displayRole,
          status: (p.vendor_status === 'suspended' ? 'Suspended' : 'Active') as 'Active' | 'Suspended' | 'Inactive',
          totalVolume: '$0.00',
          lastActive: 'Recently',
          joinDate: p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Jan 2025',
        };
      });
    } catch (err) {
      console.warn('[Supabase] getUsers error:', err);
      return [];
    }
  },

  async updateUserRoles(userId: string, roles: string[]): Promise<boolean> {
    if (!isSupabaseConfigured || !isUuid(userId)) return false;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ roles, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Supabase] updateUserRoles error:', err);
      return false;
    }
  },

  async updateUserStatus(userId: string, vendorStatus: string): Promise<boolean> {
    if (!isSupabaseConfigured || !isUuid(userId)) return false;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ vendor_status: vendorStatus, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Supabase] updateUserStatus error:', err);
      return false;
    }
  },

  async createUser(user: { id?: string; name: string; email: string; role?: string; status?: string }): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const role = user.role?.toLowerCase().includes('admin')
        ? ['admin']
        : user.role?.toLowerCase().includes('vendor')
        ? ['vendor']
        : ['customer'];
      const payload: any = {
        name: user.name,
        email: user.email,
        roles: role,
        vendor_status: user.status === 'Active' ? 'approved' : 'none',
      };
      if (user.id && isUuid(user.id)) {
        payload.id = user.id;
      }
      const { error } = await supabase.from('profiles').upsert(payload);
      if (error) {
        console.warn('[Supabase] Failed to upsert profile:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[Supabase] createUser error:', err);
      return false;
    }
  },
};

/**
 * Chat & Messages Service with Supabase
 */
export const supabaseChat = {
  async getMessages(conversationId?: string) {
    if (!isSupabaseConfigured) return [];
    try {
      let query = supabase.from('messages').select('*').order('created_at', { ascending: true });
      if (conversationId) query = query.eq('conversation_id', conversationId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[Supabase] getMessages error:', err);
      return [];
    }
  },

  async sendMessage(msg: {
    id?: string;
    conversationId: string;
    senderId: string;
    senderName: string;
    senderRole?: string;
    recipientId?: string;
    text: string;
    attachments?: any[];
  }): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const id = msg.id || `m-${Date.now()}`;
      const { error } = await supabase.from('messages').insert({
        id,
        conversation_id: msg.conversationId,
        sender_id: msg.senderId,
        sender_name: msg.senderName,
        sender_role: msg.senderRole || 'customer',
        recipient_id: msg.recipientId || null,
        text: msg.text,
        attachments: msg.attachments || [],
        read: false,
      });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Supabase] sendMessage error:', err);
      return false;
    }
  },
};
