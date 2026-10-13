import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Send,
  User,
  Edit2,
  Search,
  MessageSquare,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';
import type { VendorQuestion } from '../features/vendor/api/questions';
import {
  useAnswerQuestion,
  useSetQuestionPublished,
  useVendorQuestions,
} from '../features/vendor/hooks/useVendorQuestions';

type Tab = 'unanswered' | 'answered' | 'all';

export const VendorQAPage: React.FC = () => {
  const questions = useVendorQuestions();
  const answerQuestion = useAnswerQuestion();
  const setPublished = useSetQuestionPublished();

  const [activeTab, setActiveTab] = useState<Tab>('unanswered');
  const [searchQuery, setSearchQuery] = useState('');
  const [composingId, setComposingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const items = useMemo(() => questions.data ?? [], [questions.data]);

  const counts = useMemo(
    () => ({
      unanswered: items.filter((item) => !item.answer).length,
      answered: items.filter((item) => Boolean(item.answer)).length,
      all: items.length,
    }),
    [items],
  );

  const visible = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (activeTab === 'unanswered' && item.answer) return false;
      if (activeTab === 'answered' && !item.answer) return false;
      if (!query) return true;
      return (
        item.question.toLowerCase().includes(query) ||
        item.productTitle.toLowerCase().includes(query) ||
        item.customerName.toLowerCase().includes(query) ||
        (item.answer?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [items, activeTab, searchQuery]);

  const note = (message: string) => {
    setError(null);
    setBanner(message);
    window.setTimeout(() => setBanner(null), 4000);
  };

  const fail = (cause: unknown) => {
    setBanner(null);
    setError((cause as Error).message);
  };

  const submitAnswer = (item: VendorQuestion, mode: 'compose' | 'edit') => {
    const body = replyText.trim();
    if (!body) return;
    answerQuestion.mutate(
      { questionId: item.id, answer: body, publish: true },
      {
        onSuccess: () => {
          setComposingId(null);
          setEditingId(null);
          setReplyText('');
          note(
            mode === 'compose'
              ? `Answered ${item.customerName}'s question and published it on the listing.`
              : 'Answer updated.',
          );
        },
        onError: fail,
      },
    );
  };

  const togglePublished = (item: VendorQuestion) => {
    setPublished.mutate(
      { questionId: item.id, published: !item.published },
      {
        onSuccess: (saved) =>
          note(saved.published ? 'The answer is visible on the listing again.' : 'The answer is hidden from shoppers.'),
        onError: fail,
      },
    );
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'unanswered', label: 'Unanswered', count: counts.unanswered },
    { id: 'answered', label: 'Answered', count: counts.answered },
    { id: 'all', label: 'All', count: counts.all },
  ];

  return (
    <WorkspaceLayout role="vendor" sidebar={<VendorNav />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Customer Product Q&amp;A Inbox
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Questions buyers asked on your listings, newest first. The question, the product and
            the asker are fixed once posted - answering writes only the response.
          </p>
        </div>

        {banner && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {banner}
          </div>
        )}
        {error && (
          <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-sun-orange text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label} {tab.count}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by question, product or user..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-sun-orange"
            />
          </div>
        </div>

        {questions.isPending ? (
          <p className="text-xs text-slate-500">Loading your questions…</p>
        ) : questions.isError ? (
          <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
            {(questions.error as Error).message}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
            {counts.all === 0
              ? 'No buyer has asked a question on your listings yet.'
              : 'No questions match this tab and search.'}
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4 transition-all hover:shadow-xs"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {item.productImage ? (
                      <img
                        src={item.productImage}
                        alt={item.productTitle}
                        className="h-10 w-10 rounded-xl object-cover bg-slate-100 border border-slate-100"
                      />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-100 text-[10px] font-bold text-slate-400">
                        No image
                      </span>
                    )}
                    <div>
                      <Link
                        to={`/products/${item.productSlug || item.productId}`}
                        className="text-xs font-bold text-slate-900 line-clamp-1 hover:underline"
                      >
                        {item.productTitle || 'Listing removed from the catalog'}
                      </Link>
                      <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-400" aria-hidden="true" />
                        {item.customerName || 'A buyer'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex flex-wrap justify-end gap-1">
                      {item.answer ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Answered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          Pending Answer
                        </span>
                      )}
                      {item.answer &&
                        (item.published ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            <Eye className="h-3 w-3" aria-hidden="true" />
                            Live
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            <EyeOff className="h-3 w-3" aria-hidden="true" />
                            Hidden
                          </span>
                        ))}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                    “{item.question}”
                  </p>
                  {item.answeredAt && (
                    <p className="mt-1 text-[10px] text-slate-400">
                      Answered {new Date(item.answeredAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {item.answer ? (
                  editingId === item.id ? (
                    <div className="space-y-3 pt-2">
                      <textarea
                        rows={3}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:outline-none focus:border-sun-orange"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => submitAnswer(item, 'edit')}
                          disabled={answerQuestion.isPending}
                          className="px-4 py-1.5 text-xs font-bold bg-sun-orange hover:bg-[#EA580C] text-white rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                        >
                          Update Answer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4 bg-orange-50/50 border border-orange-100 rounded-xl p-3 text-xs">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-sun-orange uppercase tracking-wider block">
                          Merchant Response
                        </span>
                        <p className="text-slate-800 font-medium leading-relaxed">{item.answer}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(item.id);
                            setReplyText(item.answer ?? '');
                          }}
                          className="flex items-center gap-1 text-xs font-bold text-sun-orange hover:underline cursor-pointer"
                        >
                          <Edit2 className="h-3 w-3" aria-hidden="true" />
                          Edit Answer
                        </button>
                        <button
                          type="button"
                          onClick={() => togglePublished(item)}
                          disabled={setPublished.isPending}
                          className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 disabled:opacity-50 cursor-pointer"
                        >
                          {item.published ? <EyeOff className="h-3 w-3" aria-hidden="true" /> : <Eye className="h-3 w-3" aria-hidden="true" />}
                          {item.published ? 'Hide from listing' : 'Publish again'}
                        </button>
                      </div>
                    </div>
                  )
                ) : composingId === item.id ? (
                  <div className="space-y-3 pt-1">
                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Provide a clear, helpful response explaining product details, compatibility, or instructions..."
                      className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:outline-none focus:border-sun-orange"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setComposingId(null)}
                        className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => submitAnswer(item, 'compose')}
                        disabled={answerQuestion.isPending || !replyText.trim()}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-sun-orange hover:bg-[#EA580C] text-white rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5" aria-hidden="true" />
                        Submit Answer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setComposingId(item.id);
                        setReplyText('');
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-sun-orange hover:bg-[#EA580C] text-white rounded-xl shadow-sm transition-all cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                      Compose Answer
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-xs shadow-2xs space-y-2">
          <h2 className="text-sm font-bold text-slate-900">What this queue can and cannot do</h2>
          <ul className="space-y-1.5 text-[11px] text-slate-500">
            <li>
              — One answer per question. Editing replaces the stored text and re-stamps
              <em> answered on</em>; there is no answer history, so an edit is not auditable here.
            </li>
            <li>
              — Hiding an answer keeps it in the database and removes it from the listing; deleting
              buyer content is a platform action, not a seller one.
            </li>
            <li>
              — A seller cannot post a question. The insert policy is customer-only, so nothing here
              can seed an answer to a question nobody asked.
            </li>
            <li>
              — The buyer's email and order history are not attached to a question; the asker is a
              display name, which is all the listing's Q&amp;A section exposes.
            </li>
          </ul>
        </section>
      </div>
    </WorkspaceLayout>
  );
};
