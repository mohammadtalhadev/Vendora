import { describe, expect, it } from 'vitest';
import {
  compareFolderNames,
  folderDisplayName,
  folderSectionLabel,
  folderSectionRank,
  MEDIA_FOLDER_SECTIONS,
} from './mediaData';

describe('canonical media folder sections', () => {
  it('names the three kind subfolders the upload flows file into', () => {
    expect(MEDIA_FOLDER_SECTIONS).toEqual([
      { folder: 'products', label: 'Product Images' },
      { folder: 'storefront', label: 'Storefront Banners' },
      { folder: 'profile', label: 'Profile Images' },
    ]);
    expect(folderSectionLabel('products')).toBe('Product Images');
    expect(folderSectionLabel('storefront')).toBe('Storefront Banners');
    expect(folderSectionLabel('profile')).toBe('Profile Images');
  });

  it('gives a custom folder no invented section', () => {
    expect(folderSectionLabel('campaign-shots')).toBeNull();
    expect(folderDisplayName('campaign-shots')).toBe('campaign-shots');
  });

  it('displays a canonical folder by its section label, and an empty folder as root', () => {
    expect(folderDisplayName('products')).toBe('Product Images');
    expect(folderDisplayName('')).toBe('root');
  });

  it('ranks canonical sections first, in section order, custom folders last', () => {
    expect(folderSectionRank('products')).toBe(0);
    expect(folderSectionRank('storefront')).toBe(1);
    expect(folderSectionRank('profile')).toBe(2);
    expect(folderSectionRank('anything-else')).toBe(MEDIA_FOLDER_SECTIONS.length);

    const sorted = ['zebra', 'profile', 'products', 'archive-2024', 'storefront'].sort(
      compareFolderNames,
    );
    expect(sorted).toEqual(['products', 'storefront', 'profile', 'archive-2024', 'zebra']);
  });
});
