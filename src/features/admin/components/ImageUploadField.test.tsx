import React, { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { ImageUploadField } from './ImageUploadField';
import { supabaseDouble } from '../../../test/supabase-double';

const PLACEHOLDER = 'https://images.unsplash.com/...';

const Harness: React.FC = () => {
  const [value, setValue] = useState('');
  return (
    <ImageUploadField id="banner-image" value={value} onChange={setValue} placeholder={PLACEHOLDER} />
  );
};

function pickFile(file: File) {
  const input = screen.getByTestId('image-upload-file-input');
  fireEvent.change(input, { target: { files: [file] } });
}

beforeEach(() => {
  supabaseDouble.reset();
});

describe('ImageUploadField', () => {
  it('keeps the manual URL route: typing a URL sets the value and previews it', () => {
    render(<Harness />);
    const urlInput = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.change(urlInput, { target: { value: 'https://example.com/banner.jpg' } });

    expect(urlInput).toHaveValue('https://example.com/banner.jpg');
    const preview = document.querySelector('img');
    expect(preview?.getAttribute('src')).toBe('https://example.com/banner.jpg');
    expect(supabaseDouble.storageUploads).toHaveLength(0);
  });

  it('uploads a picked image and replaces the field value with the hosted URL', async () => {
    render(<Harness />);
    pickFile(new File(['fake-image-bytes'], 'hero.png', { type: 'image/png' }));

    const urlInput = screen.getByPlaceholderText(PLACEHOLDER) as HTMLInputElement;
    await waitFor(() => {
      expect(urlInput.value).toContain(
        '/storage/v1/object/public/product-images/vendora/cms/',
      );
    });
    expect(supabaseDouble.storageUploads).toHaveLength(1);
    expect(supabaseDouble.storageUploads[0].bucket).toBe('product-images');
    expect(await screen.findByText(/Image uploaded/)).toBeInTheDocument();
  });

  it('rejects an invalid file with a toast and never touches storage', async () => {
    render(<Harness />);
    pickFile(new File(['not-an-image'], 'notes.pdf', { type: 'application/pdf' }));

    expect(await screen.findByText(/Pick a JPG, PNG, WebP or GIF/)).toBeInTheDocument();
    expect(supabaseDouble.storageUploads).toHaveLength(0);
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toHaveValue('');
  });
});
