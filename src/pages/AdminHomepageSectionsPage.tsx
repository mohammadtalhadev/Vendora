import React, { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { adminKeys, useAdminScope } from '../features/admin/hooks/admin-keys';
import {
  createSection,
  createSectionItem,
  deleteSection,
  deleteSectionItem,
  fetchAdminSections,
  slugifySectionKey,
  updateSection,
  updateSectionItem,
  type AdminSection,
  type AdminSectionItem,
  type SectionItemDraft,
} from '../features/admin/api/sections';
import { uploadAdminMedia } from '../features/admin/api/media';
import {
  ADMIN_CREATABLE_TYPES,
  sectionTypeDefinition,
  type SectionTypeDefinition,
} from '../features/home/sections/registry';
import { Button } from '../components/ui/button';

/**
 * Homepage Sections (Batch 85): the console for `site_sections`. Every
 * image block of the homepage that the section registry renders is created,
 * edited, reordered, enabled/disabled and deleted here - no deploy. The
 * type picker comes from the same registry the storefront renders from,
 * so a type a developer registers appears here the moment it ships.
 */

const reason = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message.trim() !== '' ? error.message : fallback;

const anchorLabel = (def: SectionTypeDefinition | undefined): string => {
  switch (def?.anchor) {
    case 'categories':
      return 'Renders under the hero';
    case 'mosaic':
      return 'Renders mid-page, before Brand Spotlight';
    case 'promo':
      return 'Renders at the end of the homepage';
    default:
      return 'Homepage';
  }
};

interface ItemFormState {
  imageUrl: string;
  heading: string;
  subtext: string;
  ctaLabel: string;
  ctaLink: string;
  isActive: boolean;
}

const emptyItemForm: ItemFormState = {
  imageUrl: '',
  heading: '',
  subtext: '',
  ctaLabel: '',
  ctaLink: '',
  isActive: true,
};

function itemToForm(item: AdminSectionItem): ItemFormState {
  return {
    imageUrl: item.imageUrl,
    heading: item.heading,
    subtext: item.subtext,
    ctaLabel: item.ctaLabel,
    ctaLink: item.ctaLink,
    isActive: item.isActive,
  };
}

const ItemForm: React.FC<{
  def: SectionTypeDefinition;
  initial: ItemFormState;
  submitLabel: string;
  pending: boolean;
  error: string | null;
  onSubmit: (draft: SectionItemDraft) => void;
  onCancel?: () => void;
}> = ({ def, initial, submitLabel, pending, error, onSubmit, onCancel }) => {
  const [form, setForm] = useState<ItemFormState>(initial);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<ItemFormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      // Platform-owned, into the media library's `cms` folder (Batch 72);
      // the recorded row's public URL is what the section item points at.
      const uploaded = await uploadAdminMedia(file, { vendorId: null, folder: 'cms' });
      set({ imageUrl: uploaded.cdnUrl });
    } catch (err) {
      setUploadError(reason(err, 'The image could not be uploaded.'));
    } finally {
      setUploading(false);
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({
      imageUrl: form.imageUrl.trim(),
      heading: form.heading.trim(),
      subtext: form.subtext.trim(),
      ctaLabel: form.ctaLabel.trim(),
      ctaLink: form.ctaLink.trim(),
      isActive: form.isActive,
    });
  };

  const inputClass = 'w-full rounded-xl border border-slate-200 p-2.5 bg-white';
  const labelClass = 'block font-bold text-slate-700 mb-1';

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      {def.usesImage && (
        <div>
          <label className={labelClass}>Image</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.imageUrl}
              onChange={(e) => set({ imageUrl: e.target.value })}
              placeholder="/images/home/... or https://..."
              className={`${inputClass} flex-1`}
              aria-label="Image URL"
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleUpload(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
          </div>
          {uploadError && (
            <p role="alert" className="mt-1.5 font-bold text-rose-700">{uploadError}</p>
          )}
          {form.imageUrl && (
            <img
              src={form.imageUrl}
              alt=""
              className="mt-2 h-20 w-32 rounded-lg border border-slate-200 object-cover"
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Heading</label>
          <input
            type="text"
            value={form.heading}
            onChange={(e) => set({ heading: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{def.usesCta ? 'CTA label' : 'Label / tag'}</label>
          <input
            type="text"
            value={form.ctaLabel}
            onChange={(e) => set({ ctaLabel: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Subtext</label>
        <input
          type="text"
          value={form.subtext}
          onChange={(e) => set({ subtext: e.target.value })}
          className={inputClass}
        />
      </div>

      {def.usesCta && (
        <div>
          <label className={labelClass}>Link</label>
          <input
            type="text"
            value={form.ctaLink}
            onChange={(e) => set({ ctaLink: e.target.value })}
            placeholder="/products?category=..."
            className={inputClass}
          />
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => set({ isActive: e.target.checked })}
            className="rounded text-sun-orange focus:ring-sun-orange"
          />
          <span>Active</span>
        </label>
        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
          )}
          <Button type="submit" variant="default" size="sm" disabled={pending}>
            {pending ? 'Saving…' : submitLabel}
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="flex items-center gap-2 font-bold text-rose-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
    </form>
  );
};

const SectionCard: React.FC<{
  section: AdminSection;
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: -1 | 1) => void;
  refresh: () => void;
}> = ({ section, isFirst, isLast, onMove, refresh }) => {
  const def = sectionTypeDefinition(section.type);
  const [expanded, setExpanded] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [confirmingItemDeleteId, setConfirmingItemDeleteId] = useState<string | null>(null);
  const [title, setTitle] = useState(section.title);
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of def?.settingsFields ?? []) {
      const value = section.settings[field.key];
      initial[field.key] =
        field.kind === 'lines' && Array.isArray(value)
          ? value.map((entry) => String(entry)).join('\n')
          : typeof value === 'string'
            ? value
            : '';
    }
    return initial;
  });

  const updateMutation = useMutation({
    mutationFn: (patch: Parameters<typeof updateSection>[1]) => updateSection(section.id, patch),
    onSuccess: refresh,
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteSection(section.id),
    onSuccess: refresh,
  });
  const createItemMutation = useMutation({
    mutationFn: (draft: SectionItemDraft) =>
      createSectionItem(
        section.id,
        draft,
        section.items.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1,
      ),
    onSuccess: refresh,
  });
  const updateItemMutation = useMutation({
    mutationFn: (vars: { id: string; patch: Parameters<typeof updateSectionItem>[1] }) =>
      updateSectionItem(vars.id, vars.patch),
    onSuccess: () => {
      setEditingItemId(null);
      refresh();
    },
  });
  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => deleteSectionItem(id),
    onSuccess: refresh,
  });

  const moveItem = (item: AdminSectionItem, direction: -1 | 1) => {
    const index = section.items.findIndex((entry) => entry.id === item.id);
    const neighbour = section.items[index + direction];
    if (!neighbour) return;
    void (async () => {
      await updateSectionItem(item.id, { sortOrder: neighbour.sortOrder });
      await updateSectionItem(neighbour.id, { sortOrder: item.sortOrder });
      refresh();
    })();
  };

  const saveBasics = (event: React.FormEvent) => {
    event.preventDefault();
    // Merge over the stored settings so keys this form does not know
    // (a type's structured data, e.g. the mosaic's hotspot pins) survive.
    const settings: Record<string, unknown> = { ...section.settings };
    for (const field of def?.settingsFields ?? []) {
      const raw = settingsForm[field.key] ?? '';
      settings[field.key] =
        field.kind === 'lines'
          ? raw.split('\n').map((line) => line.trim()).filter((line) => line !== '')
          : raw;
    }
    updateMutation.mutate({ title: title.trim(), settings });
  };

  const inputClass = 'w-full rounded-xl border border-slate-200 p-2.5 bg-white';
  const labelClass = 'block font-bold text-slate-700 mb-1';

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-2xs text-xs overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 p-5">
        <div className="flex flex-col">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => onMove(-1)}
            className="text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
            aria-label={`Move ${section.title || section.key} up`}
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={isLast}
            onClick={() => onMove(1)}
            className="text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
            aria-label={`Move ${section.title || section.key} down`}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              {section.title || '(untitled section)'}
            </h3>
            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-sun-orange-700">
              {def?.label ?? section.type}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
              {anchorLabel(def)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Key <code className="text-[11px]">{section.key}</code>
            {def?.usesItems ? ` · ${section.items.length} item${section.items.length === 1 ? '' : 's'}` : ''}
          </p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
          <input
            type="checkbox"
            checked={section.isEnabled}
            disabled={updateMutation.isPending}
            onChange={(e) => updateMutation.mutate({ isEnabled: e.target.checked })}
            className="rounded text-sun-orange focus:ring-sun-orange"
          />
          <span>Enabled</span>
        </label>

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="rounded-full border border-slate-200 px-3.5 py-1.5 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
        >
          {expanded ? 'Close' : 'Edit'}
        </button>

        {confirmingDelete ? (
          <span className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="rounded-lg bg-rose-600 px-2.5 py-1.5 font-bold text-white hover:bg-rose-700 cursor-pointer"
            >
              Confirm delete
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="flex items-center gap-1 font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        )}
      </div>

      {(updateMutation.isError || deleteMutation.isError) && (
        <p role="alert" className="mx-5 mb-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 font-bold text-rose-800">
          <AlertCircle className="h-4 w-4" />
          {reason(
            updateMutation.error ?? deleteMutation.error,
            'The section could not be updated.',
          )}
        </p>
      )}

      {expanded && (
        <div className="space-y-5 border-t border-slate-100 p-5 pt-4">
          <form onSubmit={saveBasics} className="space-y-3">
            <div>
              <label className={labelClass} htmlFor={`section-title-${section.id}`}>
                Section title
              </label>
              <input
                id={`section-title-${section.id}`}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
              />
            </div>
            {(def?.settingsFields ?? []).map((field) => (
              <div key={field.key}>
                <label className={labelClass} htmlFor={`setting-${section.id}-${field.key}`}>
                  {field.label}
                </label>
                {field.kind === 'text' ? (
                  <input
                    id={`setting-${section.id}-${field.key}`}
                    type="text"
                    value={settingsForm[field.key] ?? ''}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    className={inputClass}
                  />
                ) : (
                  <textarea
                    id={`setting-${section.id}-${field.key}`}
                    value={settingsForm[field.key] ?? ''}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    rows={field.kind === 'lines' ? 4 : 3}
                    className={inputClass}
                  />
                )}
              </div>
            ))}
            <div className="flex justify-end">
              <Button type="submit" variant="default" size="sm" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save section'}
              </Button>
            </div>
          </form>

          {def?.usesItems && (
            <div className="space-y-3">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Items
              </h4>
              {section.items.map((item, index) => (
                <div key={item.id} className="rounded-2xl border border-slate-100 p-3">
                  <div className="flex items-center gap-3">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-400">
                        No image
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-slate-800">
                        {item.heading || '(no heading)'}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        {item.ctaLink || item.subtext || ''}
                      </p>
                    </div>
                    <div className="flex flex-col">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveItem(item, -1)}
                        className="text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        aria-label={`Move item ${item.heading || item.id} up`}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={index === section.items.length - 1}
                        onClick={() => moveItem(item, 1)}
                        className="text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        aria-label={`Move item ${item.heading || item.id} down`}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-600">
                      <input
                        type="checkbox"
                        checked={item.isActive}
                        onChange={(e) =>
                          updateItemMutation.mutate({
                            id: item.id,
                            patch: { isActive: e.target.checked },
                          })
                        }
                        className="rounded text-sun-orange focus:ring-sun-orange"
                      />
                      <span>Active</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setEditingItemId(editingItemId === item.id ? null : item.id)}
                      className="font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      Edit
                    </button>
                    {confirmingItemDeleteId === item.id ? (
                      <span className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setConfirmingItemDeleteId(null)}
                          className="rounded-lg border border-slate-200 px-2 py-1 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteItemMutation.mutate(item.id)}
                          className="rounded-lg bg-rose-600 px-2 py-1 font-bold text-white hover:bg-rose-700 cursor-pointer"
                        >
                          Confirm
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingItemDeleteId(item.id)}
                        className="font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  {editingItemId === item.id && (
                    <div className="mt-3">
                      <ItemForm
                        def={def}
                        initial={itemToForm(item)}
                        submitLabel="Save item"
                        pending={updateItemMutation.isPending}
                        error={
                          updateItemMutation.isError
                            ? reason(updateItemMutation.error, 'The item could not be saved.')
                            : null
                        }
                        onSubmit={(draft) =>
                          updateItemMutation.mutate({ id: item.id, patch: draft })
                        }
                        onCancel={() => setEditingItemId(null)}
                      />
                    </div>
                  )}
                </div>
              ))}

              <ItemForm
                def={def}
                initial={emptyItemForm}
                submitLabel="Add item"
                pending={createItemMutation.isPending}
                error={
                  createItemMutation.isError
                    ? reason(createItemMutation.error, 'The item could not be added.')
                    : null
                }
                onSubmit={(draft) => createItemMutation.mutate(draft)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const AdminHomepageSectionsPage: React.FC = () => {
  const userId = useAdminScope();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newType, setNewType] = useState<string>(ADMIN_CREATABLE_TYPES[0]?.type ?? '');
  const [newTitle, setNewTitle] = useState('');
  const [newKey, setNewKey] = useState('');

  const sectionsQuery = useQuery({
    queryKey: adminKeys.sections(userId),
    queryFn: ({ signal }) => fetchAdminSections(signal),
    enabled: Boolean(userId),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.sections(userId) });
    // The storefront reads the same rows under the ['home', ...] keys; drop
    // those too so a preview in another tab of this browser is current.
    void queryClient.invalidateQueries({ queryKey: ['home'] });
  };

  const createMutation = useMutation({
    mutationFn: createSection,
    onSuccess: () => {
      setIsCreateOpen(false);
      setNewTitle('');
      setNewKey('');
      refresh();
    },
  });

  const moveSectionMutation = useMutation({
    mutationFn: async (vars: { section: AdminSection; neighbour: AdminSection }) => {
      await updateSection(vars.section.id, { sortOrder: vars.neighbour.sortOrder });
      await updateSection(vars.neighbour.id, { sortOrder: vars.section.sortOrder });
    },
    onSuccess: refresh,
  });

  const moveSection = (section: AdminSection, direction: -1 | 1) => {
    const list = sectionsQuery.data ?? [];
    const index = list.findIndex((entry) => entry.id === section.id);
    const neighbour = list[index + direction];
    if (!neighbour) return;
    moveSectionMutation.mutate({ section, neighbour });
  };

  const sections = sectionsQuery.data ?? [];
  const selectedType = useMemo(
    () => ADMIN_CREATABLE_TYPES.find((def) => def.type === newType) ?? ADMIN_CREATABLE_TYPES[0],
    [newType],
  );

  const submitCreate = (event: React.FormEvent) => {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title || !selectedType) return;
    const maxOrder = sections.reduce((max, s) => Math.max(max, s.sortOrder), 0);
    createMutation.mutate({
      type: selectedType.type,
      title,
      key: slugifySectionKey(newKey || title),
      sortOrder: maxOrder + 10,
      isEnabled: true,
    });
  };

  return (
    <WorkspaceLayout role="admin" roleBadgeText="SUPER ADMIN" title="Homepage Sections" sidebar={<AdminNav />}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-outfit">
              Homepage Sections
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              The homepage&apos;s image blocks live in <code className="text-[11px]">site_sections</code>:
              create, edit, reorder, enable or delete them here and the storefront follows - no
              deploy. A section renders at the fixed slot its type is registered for; its items
              and copy are yours.
            </p>
          </div>
          <Button type="button" variant="default" size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 text-white stroke-[2.5]" />
            <span className="text-white">Add Section</span>
          </Button>
        </div>

        {sectionsQuery.isError && (
          <p role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
            <AlertCircle className="h-4 w-4" />
            {reason(sectionsQuery.error, 'The homepage sections could not be loaded.')}
          </p>
        )}

        {isCreateOpen && (
          <form
            onSubmit={submitCreate}
            className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs text-xs"
          >
            <h3 className="text-sm font-bold text-slate-900">New section</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="section-type" className="block font-bold text-slate-700 mb-1">
                  Type
                </label>
                <select
                  id="section-type"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 bg-white"
                >
                  {ADMIN_CREATABLE_TYPES.map((def) => (
                    <option key={def.type} value={def.type}>
                      {def.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="section-title" className="block font-bold text-slate-700 mb-1">
                  Title
                </label>
                <input
                  id="section-title"
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Summer Lookbook"
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                  required
                />
              </div>
              <div>
                <label htmlFor="section-key" className="block font-bold text-slate-700 mb-1">
                  Key (auto from title)
                </label>
                <input
                  id="section-key"
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder={slugifySectionKey(newTitle) || 'my-section'}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-mono"
                />
              </div>
            </div>
            {selectedType && <p className="text-[11px] text-slate-500">{selectedType.description}</p>}
            {createMutation.isError && (
              <p role="alert" className="flex items-center gap-2 font-bold text-rose-700">
                <AlertCircle className="h-4 w-4" />
                {reason(createMutation.error, 'The section could not be created.')}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-full border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer text-xs"
              >
                Cancel
              </button>
              <Button type="submit" variant="default" size="sm" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create section'}
              </Button>
            </div>
          </form>
        )}

        {sectionsQuery.isPending && !sectionsQuery.isError ? (
          <p className="text-xs text-slate-500">Loading the homepage sections…</p>
        ) : sections.length === 0 && !sectionsQuery.isError ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
            No homepage sections yet. Add one to put a managed block on the homepage.
          </div>
        ) : (
          <div className="space-y-4">
            {sections.map((section, index) => (
              <SectionCard
                key={section.id}
                section={section}
                isFirst={index === 0}
                isLast={index === sections.length - 1}
                onMove={(direction) => moveSection(section, direction)}
                refresh={refresh}
              />
            ))}
          </div>
        )}

        {createMutation.isSuccess && (
          <p className="flex items-center gap-2 text-[11px] font-bold text-emerald-700">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Saved to the database.
          </p>
        )}
      </div>
    </WorkspaceLayout>
  );
};
