import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as typedSupabase } from './supabase';

export { isSupabaseConfigured } from './supabase';

/**
 * LEGACY data access. The modules that import this still speak the pre-migration
 * schema (text ids, products.seller_name, sub_orders.shipping_address, numeric
 * columns read as numbers), so they are deliberately kept off the generated
 * Database types: the typed client gates new code, and each importer here is
 * deleted as its phase lands under src/features.
 */
export const supabase: SupabaseClient<any> = typedSupabase as unknown as SupabaseClient<any>;
