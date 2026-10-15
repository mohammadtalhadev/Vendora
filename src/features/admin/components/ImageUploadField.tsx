import React, { useRef, useState } from 'react';
import { ImageIcon, Loader2, Upload } from 'lucide-react';
import { Toast } from '../../../components/common/Toast';
import { useToast } from '../../../hooks/useToast';
import { CMS_IMAGE_ACCEPT, uploadCmsImage, validateCmsImageFile } from '../api/cms-media';

interface ImageUploadFieldProps {
  /** Binds the page's <label htmlFor> to the URL input, as before. */
  id: string;
  /** The stored value: one image URL, exactly as the form has always kept it. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * An image field that takes EITHER a pasted URL (the behaviour the CMS form
 * always had — the input below is that same field) OR an uploaded file:
 * picking or dropping a file sends it through `uploadCmsImage` and, on
 * success, replaces the field's value with the hosted public URL. The save
 * flow downstream never learns which route produced the URL. Upload state
 * and failures surface through the shared Toast; validation reasons come
 * from the same `validateCmsImageFile` the API enforces.
 */
export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  id,
  value,
  onChange,
  placeholder,
  disabled = false,
}) => {
  const { toast, showToast, hideToast } = useToast(3600);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file || uploading || disabled) return;
    // Validate before the upload starts so the reason is immediate and
    // honest; the API validates again so no caller can skip it.
    const problem = validateCmsImageFile(file);
    if (problem) {
      showToast(problem, 'error');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadCmsImage(file);
      onChange(url);
      showToast('Image uploaded — the field now holds its hosted URL.', 'success');
    } catch (error) {
      showToast(
        error instanceof Error && error.message.trim() !== ''
          ? error.message
          : 'The image could not be uploaded.',
        'error',
      );
    } finally {
      setUploading(false);
      // Clear the picker so choosing the same file again re-fires change.
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const trimmed = value.trim();

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!uploading && !disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        void handleFile(event.dataTransfer.files?.[0]);
      }}
      className={`rounded-xl ${dragOver ? 'ring-2 ring-slate-900/60 ring-offset-2' : ''}`}
    >
      <div className="flex items-stretch gap-2">
        <input
          id={id}
          type="url"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full flex-1 rounded-xl border border-slate-200 p-2.5"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || disabled}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-900 bg-slate-900 px-3 py-2 font-bold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>{uploading ? 'Uploading…' : 'Upload'}</span>
        </button>
        <input
          ref={fileInputRef}
          data-testid="image-upload-file-input"
          type="file"
          accept={CMS_IMAGE_ACCEPT}
          className="hidden"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
      </div>

      {trimmed !== '' ? (
        <div className="mt-2 flex items-center gap-3">
          <img
            src={trimmed}
            alt=""
            className="h-12 w-20 shrink-0 rounded-lg border border-slate-200 object-cover"
          />
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <ImageIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Preview of the image this URL points at.
          </p>
        </div>
      ) : (
        <p className="mt-1.5 text-[11px] font-semibold text-slate-500">
          Paste a URL, upload a file, or drop an image here — JPG, PNG, WebP or GIF, up to 5 MB.
        </p>
      )}

      <Toast toast={toast} onDismiss={hideToast} />
    </div>
  );
};
