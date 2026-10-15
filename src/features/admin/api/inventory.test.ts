import { describe, expect, it } from 'vitest';
import {
  LOW_STOCK_AT,
  filterInventoryRows,
  mapInventoryRow,
  stockStatusOf,
  summarizeInventory,
  type AdminInventoryRow,
} from './inventory';

const stores = new Map<string, string>([['store-1', 'SoundWave Direct']]);

const raw = (over: Partial<Parameters<typeof mapInventoryRow>[0]> = {}) => ({
  id: 'prod-abcdef123456',
  title: 'Reference Headphones',
  price: 19999,
  stock: 12,
  status: 'approved',
  seller_id: 'store-1',
  variants: [{ sku: 'SW-HP-100' }],
  images: ['https://cdn.example/hp.png'],
  ...over,
});

const row = (over: Partial<AdminInventoryRow> = {}): AdminInventoryRow => ({
  id: 'p-1',
  title: 'Reference Headphones',
  sku: 'SW-HP-100',
  sellerId: 'store-1',
  storeName: 'SoundWave Direct',
  price: 19999,
  stock: 12,
  stockStatus: 'in_stock',
  listingStatus: 'approved',
  imageUrl: null,
  ...over,
});

describe('stockStatusOf', () => {
  it('pins the threshold boundaries the vendor page uses', () => {
    expect(stockStatusOf(0)).toBe('out_of_stock');
    expect(stockStatusOf(1)).toBe('low_stock');
    expect(stockStatusOf(LOW_STOCK_AT)).toBe('low_stock');
    expect(stockStatusOf(LOW_STOCK_AT + 1)).toBe('in_stock');
    expect(stockStatusOf(500)).toBe('in_stock');
  });
});

describe('mapInventoryRow', () => {
  it('takes the SKU from the first variant and the store name from the map', () => {
    const mapped = mapInventoryRow(raw(), stores);
    expect(mapped.sku).toBe('SW-HP-100');
    expect(mapped.storeName).toBe('SoundWave Direct');
    expect(mapped.imageUrl).toBe('https://cdn.example/hp.png');
    expect(mapped.stockStatus).toBe('in_stock');
  });

  it('derives the display code from the id when no variant carries a SKU', () => {
    expect(mapInventoryRow(raw({ variants: [] }), stores).sku).toBe('SKU-123456');
    expect(mapInventoryRow(raw({ variants: [{ sku: '  ' }] }), stores).sku).toBe('SKU-123456');
    expect(mapInventoryRow(raw({ variants: null }), stores).sku).toBe('SKU-123456');
  });

  it('labels an unmapped seller honestly instead of inventing a store', () => {
    expect(mapInventoryRow(raw({ seller_id: 'store-x' }), stores).storeName).toBe('Unknown store');
  });

  it('clamps a negative or fractional stock to a whole, non-negative count', () => {
    expect(mapInventoryRow(raw({ stock: -3 }), stores).stock).toBe(0);
    expect(mapInventoryRow(raw({ stock: 4.9 }), stores).stock).toBe(4);
    expect(mapInventoryRow(raw({ stock: 0 }), stores).stockStatus).toBe('out_of_stock');
  });
});

describe('summarizeInventory', () => {
  it('counts statuses and sums units from the same rows', () => {
    const summary = summarizeInventory([
      row({ stock: 0, stockStatus: 'out_of_stock' }),
      row({ stock: 3, stockStatus: 'low_stock' }),
      row({ stock: 5, stockStatus: 'low_stock' }),
      row({ stock: 40, stockStatus: 'in_stock' }),
    ]);
    expect(summary).toEqual({ tracked: 4, outOfStock: 1, lowStock: 2, totalUnits: 48 });
  });

  it('is all zeroes for an empty platform', () => {
    expect(summarizeInventory([])).toEqual({
      tracked: 0,
      outOfStock: 0,
      lowStock: 0,
      totalUnits: 0,
    });
  });
});

describe('filterInventoryRows', () => {
  const rows = [
    row({ id: 'a', title: 'Reference Headphones', sku: 'SW-HP-100', sellerId: 'store-1' }),
    row({
      id: 'b',
      title: 'Apex Keyboard',
      sku: 'KB-9',
      sellerId: 'store-2',
      storeName: 'KeyWorld',
      stock: 2,
      stockStatus: 'low_stock',
    }),
    row({
      id: 'c',
      title: 'USB Cable',
      sku: 'CB-1',
      sellerId: 'store-2',
      storeName: 'KeyWorld',
      stock: 0,
      stockStatus: 'out_of_stock',
    }),
  ];

  it('searches title, SKU and store name case-insensitively', () => {
    expect(filterInventoryRows(rows, { query: 'headphones', sellerId: null, lowOnly: false })).toHaveLength(1);
    expect(filterInventoryRows(rows, { query: 'kb-9', sellerId: null, lowOnly: false })[0].id).toBe('b');
    expect(filterInventoryRows(rows, { query: 'KEYWORLD', sellerId: null, lowOnly: false })).toHaveLength(2);
  });

  it('narrows to one store and to low-or-out rows', () => {
    expect(filterInventoryRows(rows, { query: '', sellerId: 'store-2', lowOnly: false })).toHaveLength(2);
    expect(filterInventoryRows(rows, { query: '', sellerId: null, lowOnly: true })).toHaveLength(2);
    expect(filterInventoryRows(rows, { query: '', sellerId: 'store-1', lowOnly: true })).toHaveLength(0);
  });
});
