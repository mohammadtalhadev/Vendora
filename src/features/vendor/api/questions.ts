import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database';
import { requireVendorId, text } from './vendor-client';

type QuestionRow = Database['public']['Tables']['product_qa']['Row'] & {
  product: { id: string; title: string; slug: string; images: string[] } | null;
};

/**
 * A buyer's question about one of the store's listings. The question, the product it was
 * asked about and the asker are immutable to the seller: `qa_update_vendor` refuses a
 * write that rewrites them, so an answer cannot be attached to a different product or a
 * reworded question.
 */
export interface VendorQuestion {
  id: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  productImage: string;
  customerId?: string;
  customerName: string;
  question: string;
  answer?: string;
  published: boolean;
  createdAt: string;
  answeredAt?: string;
}

const QUESTION_SELECT =
  'id, product_id, vendor_id, customer_id, customer_name, question, answer, published, ' +
  'created_at, answered_at, product:products(id, title, slug, images)';

function mapQuestion(row: QuestionRow): VendorQuestion {
  return {
    id: row.id,
    productId: row.product_id,
    productTitle: text(row.product?.title),
    productSlug: text(row.product?.slug),
    productImage: row.product?.images?.[0] ?? '',
    customerId: row.customer_id ?? undefined,
    customerName: row.customer_name,
    question: row.question,
    answer: row.answer ?? undefined,
    published: row.published,
    createdAt: row.created_at,
    answeredAt: row.answered_at ?? undefined,
  };
}

export async function fetchVendorQuestions(signal?: AbortSignal): Promise<VendorQuestion[]> {
  const vendorId = await requireVendorId();
  let query = supabase
    .from('product_qa')
    .select(QUESTION_SELECT)
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load your questions: ${error.message}`);
  return ((data ?? []) as unknown as QuestionRow[]).map(mapQuestion);
}

/**
 * Answers and, by default, publishes. `answered_at` is stamped by this call so the
 * "answered on" column reflects the write rather than the page's clock.
 */
export async function answerQuestion(
  questionId: string,
  answer: string,
  publish = true,
): Promise<VendorQuestion> {
  const vendorId = await requireVendorId();

  const { data, error } = await supabase
    .from('product_qa')
    .update({
      answer,
      published: publish,
      answered_at: new Date().toISOString(),
    })
    .eq('id', questionId)
    .eq('vendor_id', vendorId)
    .select(QUESTION_SELECT)
    .maybeSingle();
  if (error) throw new Error(`Failed to save the answer: ${error.message}`);
  if (!data) throw new Error('This question is not yours to answer.');
  return mapQuestion(data as unknown as QuestionRow);
}

/** Hides an answer again without deleting it. */
export async function setQuestionPublished(
  questionId: string,
  published: boolean,
): Promise<VendorQuestion> {
  const vendorId = await requireVendorId();

  const { data, error } = await supabase
    .from('product_qa')
    .update({ published })
    .eq('id', questionId)
    .eq('vendor_id', vendorId)
    .select(QUESTION_SELECT)
    .maybeSingle();
  if (error) throw new Error(`Failed to update this question: ${error.message}`);
  if (!data) throw new Error('This question is not yours to change.');
  return mapQuestion(data as unknown as QuestionRow);
}
