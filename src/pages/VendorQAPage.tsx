import React, { useState } from 'react';
import {
  CheckCircle2,
  Send,
  User,
  Edit2,
  Search,
  MessageSquare,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';

export interface QAItem {
  id: string;
  productId: string;
  productTitle: string;
  productThumbnail: string;
  customerName: string;
  question: string;
  answer?: string;
  answeredAt?: string;
  isPublished: boolean;
  createdAt: string;
}

const INITIAL_QA: QAItem[] = [
  {
    id: 'qa-1',
    productId: 'prod-kb-1',
    productTitle: 'Apex Pro Magnetic Keyboard',
    productThumbnail: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80',
    customerName: '@mech_enthusiast88',
    question: 'Does this keyboard support magnetic rapid-trigger actuation adjustment down to 0.1mm?',
    createdAt: '2026-10-08T10:00:00Z',
    isPublished: false,
  },
  {
    id: 'qa-2',
    productId: 'prod-head-1',
    productTitle: 'AudioPulse Studio Pro Headphones',
    productThumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
    customerName: '@nomad_coder',
    question: 'Does the active noise cancellation require the desktop software or can presets be saved to hardware memory?',
    createdAt: '2026-10-07T14:20:00Z',
    isPublished: false,
  },
  {
    id: 'qa-3',
    productId: 'prod-kb-1',
    productTitle: 'Apex Pro Magnetic Keyboard',
    productThumbnail: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80',
    customerName: '@tech_reviewer_dan',
    question: 'Are the switches hot-swappable with standard mechanical MX pins or only Hall Effect switches?',
    createdAt: '2026-10-06T09:15:00Z',
    isPublished: false,
  },
  {
    id: 'qa-4',
    productId: 'prod-desk-mat',
    productTitle: 'Minimalist Felt Desk Mat',
    productThumbnail: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&q=80',
    customerName: '@minimal_desk',
    question: 'Is the desk mat spill-resistant if water or coffee accidentally spills on it?',
    answer: 'Yes, absolutely! The surface features a hydrophobic coating that causes liquid to bead up immediately.',
    answeredAt: '2026-10-05T16:00:00Z',
    isPublished: true,
    createdAt: '2026-10-05T12:30:00Z',
  },
  {
    id: 'qa-5',
    productId: 'prod-mouse-1',
    productTitle: 'ErgoPrecision Wireless Mouse',
    productThumbnail: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80',
    customerName: '@designer_alex',
    question: 'What is the polling rate when connected via Bluetooth vs 2.4GHz dongle?',
    answer: 'Polling rate is 1000Hz via 2.4GHz wireless dongle and 125Hz via Bluetooth 5.2.',
    answeredAt: '2026-10-04T11:00:00Z',
    isPublished: true,
    createdAt: '2026-10-04T08:15:00Z',
  },
  {
    id: 'qa-6',
    productId: 'prod-cable-1',
    productTitle: 'Braided Coiled Aviator Cable',
    productThumbnail: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80',
    customerName: '@custom_boards',
    question: 'Is this compatible with USB Type-C high power delivery charging?',
    answer: 'Yes, tested up to 60W USB-PD charging and high-speed data transmission.',
    answeredAt: '2026-10-03T14:30:00Z',
    isPublished: true,
    createdAt: '2026-10-03T10:00:00Z',
  },
  {
    id: 'qa-7',
    productId: 'prod-stand-1',
    productTitle: 'Aluminum Laptop Stand',
    productThumbnail: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=80',
    customerName: '@workfromhome_pro',
    question: 'Will this hold a 16-inch MacBook Pro securely without wobbling while typing?',
    answer: 'Yes, it features reinforced CNC aluminum hinges and non-slip silicone pads tested up to 17-inch laptops.',
    answeredAt: '2026-10-02T15:20:00Z',
    isPublished: true,
    createdAt: '2026-10-02T09:45:00Z',
  },
  {
    id: 'qa-8',
    productId: 'prod-mic-1',
    productTitle: 'Studio USB Condenser Microphone',
    productThumbnail: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&q=80',
    customerName: '@podcast_host',
    question: 'Does it come with a shock mount and pop filter in the retail package?',
    answer: 'Both the metal spider shock mount and dual-layer pop filter are included inside the box.',
    answeredAt: '2026-10-01T12:00:00Z',
    isPublished: true,
    createdAt: '2026-10-01T09:00:00Z',
  },
  {
    id: 'qa-9',
    productId: 'prod-light-1',
    productTitle: 'ScreenBar Monitor Light Bar',
    productThumbnail: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80',
    customerName: '@night_coder',
    question: 'Does it cause glare or reflection on curved gaming monitors?',
    answer: 'The asymmetrical optical design directs light only down toward the desk, eliminating screen glare.',
    answeredAt: '2026-09-30T17:10:00Z',
    isPublished: true,
    createdAt: '2026-09-30T14:15:00Z',
  },
  {
    id: 'qa-10',
    productId: 'prod-hub-1',
    productTitle: '10-in-1 USB-C Docking Hub',
    productThumbnail: 'https://images.unsplash.com/photo-1544652478-6653e09f18a2?w=800&q=80',
    customerName: '@mac_power_user',
    question: 'Can this drive dual 4K 60Hz displays simultaneously?',
    answer: 'Yes, supports dual 4K @ 60Hz via DisplayPort 1.4 and HDMI 2.0 on compatible host devices.',
    answeredAt: '2026-09-29T10:40:00Z',
    isPublished: true,
    createdAt: '2026-09-29T08:00:00Z',
  },
  {
    id: 'qa-11',
    productId: 'prod-head-1',
    productTitle: 'AudioPulse Studio Pro Headphones',
    productThumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
    customerName: '@audiophile_sam',
    question: 'Are replacement ear pads available directly from the store?',
    answer: 'Yes, genuine memory foam magnetic ear pads are available in our accessories catalog.',
    answeredAt: '2026-09-28T16:00:00Z',
    isPublished: true,
    createdAt: '2026-09-28T11:20:00Z',
  },
  {
    id: 'qa-12',
    productId: 'prod-webcam-1',
    productTitle: '4K UltraHD Streaming Webcam',
    productThumbnail: 'https://images.unsplash.com/photo-1588508065123-287b28e013da?w=800&q=80',
    customerName: '@remote_worker',
    question: 'Does it have a physical privacy shutter cover included?',
    answer: 'Yes, an integrated slide-to-close physical privacy shutter is built right into the bezel.',
    answeredAt: '2026-09-27T13:45:00Z',
    isPublished: true,
    createdAt: '2026-09-27T09:30:00Z',
  },
  {
    id: 'qa-13',
    productId: 'prod-kb-1',
    productTitle: 'Apex Pro Magnetic Keyboard',
    productThumbnail: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80',
    customerName: '@esports_fan',
    question: 'What is the default debounce time configured in the firmware?',
    answer: 'Because of Hall Effect magnetic sensor technology, debounce time is zero milliseconds.',
    answeredAt: '2026-09-26T18:00:00Z',
    isPublished: true,
    createdAt: '2026-09-26T14:10:00Z',
  },
  {
    id: 'qa-14',
    productId: 'prod-mouse-1',
    productTitle: 'ErgoPrecision Wireless Mouse',
    productThumbnail: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80',
    customerName: '@cad_modeler',
    question: 'How long does a full USB-C fast charge last under continuous usage?',
    answer: 'Up to 70 hours of continuous use on a single full charge, with 3 hours from a 1-minute quick charge.',
    answeredAt: '2026-09-25T11:30:00Z',
    isPublished: true,
    createdAt: '2026-09-25T08:00:00Z',
  },
  {
    id: 'qa-15',
    productId: 'prod-desk-mat',
    productTitle: 'Minimalist Felt Desk Mat',
    productThumbnail: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&q=80',
    customerName: '@cozy_battlestation',
    question: 'What is the total thickness of the wool felt layer?',
    answer: 'The pad is 4mm thick, providing comfortable wrist cushioning and sound dampening.',
    answeredAt: '2026-09-24T16:15:00Z',
    isPublished: true,
    createdAt: '2026-09-24T10:00:00Z',
  },
];

export const VendorQAPage: React.FC = () => {
  const [qaItems, setQaItems] = useState<QAItem[]>(INITIAL_QA);
  const [activeTab, setActiveTab] = useState<'unanswered' | 'answered' | 'all'>('unanswered');
  const [searchQuery, setSearchQuery] = useState('');

  // Active compose / edit state
  const [composingId, setComposingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editText, setEditText] = useState('');

  // Notification banners
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const unansweredCount = qaItems.filter((q) => !q.answer).length;
  const answeredCount = qaItems.filter((q) => !!q.answer).length;
  const allCount = qaItems.length;

  const filteredItems = qaItems.filter((item) => {
    if (activeTab === 'unanswered' && item.answer) return false;
    if (activeTab === 'answered' && !item.answer) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchQuestion = item.question.toLowerCase().includes(q);
      const matchProduct = item.productTitle.toLowerCase().includes(q);
      const matchUser = item.customerName.toLowerCase().includes(q);
      const matchAnswer = item.answer?.toLowerCase().includes(q);
      return matchQuestion || matchProduct || matchUser || matchAnswer;
    }
    return true;
  });

  const handleStartCompose = (id: string) => {
    setComposingId(id);
    setReplyText('');
  };

  const handleStartEdit = (item: QAItem) => {
    setEditingId(item.id);
    setEditText(item.answer || '');
  };

  const handleSubmitAnswer = (id: string) => {
    if (!replyText.trim()) return;
    setQaItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            answer: replyText.trim(),
            answeredAt: new Date().toISOString(),
            isPublished: true,
          };
        }
        return item;
      })
    );
    setComposingId(null);
    setReplyText('');
    showToast('Answer submitted and published to Product Detail Page!');
  };

  const handleUpdateAnswer = (id: string) => {
    if (!editText.trim()) return;
    setQaItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            answer: editText.trim(),
            answeredAt: new Date().toISOString(),
          };
        }
        return item;
      })
    );
    setEditingId(null);
    setEditText('');
    showToast('Answer updated successfully');
  };

  return (
    <WorkspaceLayout role="vendor" sidebar={<VendorNav />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Customer Product Q&A Inbox
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Answer pre-sales customer questions asked on your product detail pages to increase conversion and build buyer trust.
          </p>
        </div>

        {successToast && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {successToast}
          </div>
        )}

        {/* Search & Tabs Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('unanswered')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'unanswered'
                  ? 'bg-[#0071DC] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Unanswered {unansweredCount}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('answered')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'answered'
                  ? 'bg-[#0071DC] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Answered {answeredCount}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#0071DC] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All {allCount}
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by question, product or user..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-[#0071DC]"
            />
          </div>
        </div>

        {/* Questions Cards List */}
        <div className="space-y-4">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
              No questions found matching your criteria.
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4 transition-all hover:shadow-xs"
              >
                {/* Header: Product Context & User */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.productThumbnail}
                      alt={item.productTitle}
                      className="h-10 w-10 rounded-xl object-cover bg-slate-100 border border-slate-100"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{item.productTitle}</h4>
                      <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-400" />
                        {item.customerName}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                    <div>
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
                    </div>
                  </div>
                </div>

                {/* Question */}
                <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                    "{item.question}"
                  </p>
                </div>

                {/* Answer or Composer */}
                {item.answer ? (
                  <div>
                    {editingId === item.id ? (
                      <div className="space-y-3 pt-2">
                        <textarea
                          rows={3}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:outline-none focus:border-[#0071DC]"
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
                            onClick={() => handleUpdateAnswer(item.id)}
                            className="px-4 py-1.5 text-xs font-bold bg-[#0071DC] hover:bg-[#005bb5] text-white rounded-xl shadow-xs transition-all cursor-pointer"
                          >
                            Update Answer
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-4 bg-blue-50/50 border border-blue-100 rounded-xl p-3 text-xs">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-[#0071DC] uppercase tracking-wider block">
                            Merchant Response
                          </span>
                          <p className="text-slate-800 font-medium leading-relaxed">
                            {item.answer}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="flex items-center gap-1 text-xs font-bold text-[#0071DC] hover:underline shrink-0 cursor-pointer pt-0.5"
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit Answer
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {composingId === item.id ? (
                      <div className="space-y-3 pt-1">
                        <textarea
                          rows={3}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Provide a clear, helpful response explaining product details, compatibility, or instructions..."
                          className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:outline-none focus:border-[#0071DC]"
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
                            onClick={() => handleSubmitAnswer(item.id)}
                            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-[#0071DC] hover:bg-[#005bb5] text-white rounded-xl shadow-xs transition-all cursor-pointer"
                          >
                            <Send className="h-3.5 w-3.5" />
                            Submit Answer
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => handleStartCompose(item.id)}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#0071DC] hover:bg-[#005bb5] text-white rounded-xl shadow-sm transition-all cursor-pointer"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Compose Answer
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
};
