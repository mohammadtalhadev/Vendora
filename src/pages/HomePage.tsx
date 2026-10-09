import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
} from 'lucide-react';
import { useCartStore } from '../store/cart-store';
import { useWishlistStore } from '../store/wishlist-store';
import {
  ProductCard,
  ProductCarouselWithTabs,
  ProductCarouselWithoutTabs,
  type ProductItem,
} from '../features/products';

// Hero Carousel Slides matching User Upscaled Images
const HERO_CAROUSEL_SLIDES = [
  {
    id: 'hero-iphone-18',
    title: 'iPhone 18 Pro Max From $ 1,199*',
    subtitle: 'A19 Bionic. Quantum Leap in Performance. Revolutionary Holo-Display.',
    image: '/images/emox/hero_iphone.jpg',
    link: '/products?category=electronics',
    alt: 'iPhone 18 Pro Max From $ 1,199*',
  },
  {
    id: 'hero-apple-watch-10',
    title: 'Apple Watch Series 10 Starting at $399*',
    subtitle: 'Thinnest design ever. Largest display yet.',
    image: '/images/emox/hero_apple_watch.jpg',
    link: '/products?category=electronics',
    alt: 'Apple Watch Series 10 Starting at $399*',
  },
  {
    id: 'hero-samsung-s24-ultra',
    title: 'Samsung Galaxy S24 Ultra From $ 1,299*',
    subtitle: 'Snapdragon 8 Gen 3 for Galaxy. Galaxy AI. 200MP Main Camera.',
    image: '/images/bevesi/hero_samsung_s24.jpg',
    link: '/products?category=electronics',
    alt: 'Samsung Galaxy S24 Ultra From $ 1,299*',
  },
];

// The 12 Parent Categories with High-Resolution 2K Thumbnails
const POPULAR_CATEGORIES = [
  { id: 'cat-electronics', name: 'Electronics', image: '/images/categories/cat_electronics_2k.png', slug: 'electronics' },
  { id: 'cat-audio', name: 'Audio & Wearables', image: '/images/categories/cat_audio_wearables_2k.png', slug: 'audio-wearables' },
  { id: 'cat-cameras', name: 'Cameras & Photo', image: '/images/categories/cat_cameras_photo_2k.png', slug: 'cameras-photo' },
  { id: 'cat-fashion', name: 'Fashion', image: '/images/categories/cat_fashion_2k.png', slug: 'fashion' },
  { id: 'cat-shoes', name: 'Shoes', image: '/images/categories/cat_shoes_2k.png', slug: 'shoes' },
  { id: 'cat-bags', name: 'Bags & Luggage', image: '/images/categories/cat_bags_luggage_2k.png', slug: 'bags-luggage' },
  { id: 'cat-jewelry', name: 'Jewelry & Watches', image: '/images/categories/cat_jewelry_watches_2k.png', slug: 'jewelry-watches' },
  { id: 'cat-beauty', name: 'Beauty & Personal Care', image: '/images/categories/cat_beauty_personalcare_2k.png', slug: 'beauty-personal-care' },
  { id: 'cat-home', name: 'Home & Kitchen', image: '/images/categories/cat_home_kitchen_2k.png', slug: 'home-kitchen' },
  { id: 'cat-kids', name: 'Kids & Baby', image: '/images/categories/cat_kids_baby_2k.png', slug: 'kids-baby' },
  { id: 'cat-sports', name: 'Sports & Outdoors', image: '/images/categories/cat_sports_outdoors_2k.png', slug: 'sports-outdoors' },
  { id: 'cat-digital', name: 'Digital Products', image: '/images/categories/cat_digital_products_2k.png', slug: 'digital-products' },
];

// Featured Stores — fictional vendor names only
const BRAND_STORES = [
  { name: 'AeroStride', category: 'Sportswear & Shoes', logo: '👟' },
  { name: 'NourishCo', category: 'Food & Nutrition', logo: '🥛' },
  { name: 'FizzBlend', category: 'Beverages', logo: '🥤' },
  { name: 'HomeTech Hub', category: 'Home Tech', logo: '📺' },
  { name: 'CorePulse', category: 'Laptops & PCs', logo: '💻' },
  { name: 'NovaCrest', category: 'Phones & Macs', logo: '📱' },
  { name: 'LumoScent', category: 'Luxury Fragrance', logo: '✨' },
  { name: 'ThreadWise', category: 'Apparel & Trends', logo: '👗' },
];

// Sub-categories under parent category Electronics
const ELECTRONICS_SUBCATEGORIES = [
  { id: 'sub-audio', name: 'Audio & Headphones' },
  { id: 'sub-computers', name: 'Computers & Laptops' },
  { id: 'sub-smartphones', name: 'Smartphones & Tablets' },
  { id: 'sub-cameras', name: 'Cameras & Drones' },
];

// Trending Electronics Carousel Products (Under Electronics Bento Section)
const TRENDING_ELECTRONICS_CAROUSEL: ProductItem[] = [
  // Audio & Headphones
  {
    id: 'elec-sony-wh',
    title: 'Sony WH-1000XM5 Wireless Noise-Canceling Headphones Black',
    category: 'AUDIO',
    subCategoryId: 'sub-audio',
    price: 298.0,
    compareAtPrice: 399.99,
    discountPercent: 25,
    rating: 4.9,
    reviewCount: 1420,
    stock: 18,
    maxStock: 30,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-13.jpg',
  },
  {
    id: 'elec-speaker-marshall',
    title: 'Marshall Emberton II Portable Waterproof Bluetooth Speaker Black & Brass',
    category: 'AUDIO',
    subCategoryId: 'sub-audio',
    price: 169.99,
    compareAtPrice: 199.99,
    discountPercent: 15,
    rating: 4.88,
    reviewCount: 512,
    stock: 29,
    maxStock: 40,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-14.jpg',
  },
  {
    id: 'elec-silver-headphones',
    title: 'Space Silver Wireless ANC Over-Ear Studio Headphones Hi-Res',
    category: 'AUDIO',
    subCategoryId: 'sub-audio',
    price: 349.0,
    compareAtPrice: 399.0,
    discountPercent: 12,
    rating: 4.9,
    reviewCount: 412,
    stock: 35,
    maxStock: 50,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/products/prod_silver_headphones.jpg',
  },
  {
    id: 'elec-aura-iem',
    title: 'Aura Precision Studio Reference In-Ear Monitors MMCX Cable',
    category: 'AUDIO',
    subCategoryId: 'sub-audio',
    price: 189.0,
    compareAtPrice: 220.0,
    discountPercent: 14,
    rating: 4.95,
    reviewCount: 112,
    stock: 14,
    maxStock: 25,
    sellerId: 'vendor-tech-1',
    sellerName: 'SoundWave Direct',
    sellerType: 'vendor',
    type: 'physical',
    image: '/images/bevesi/1-13.jpg',
  },
  {
    id: 'elec-airpods-max',
    title: 'Apple AirPods Max Space Gray Wireless Over-Ear Active Noise Cancelling Headphones',
    category: 'AUDIO',
    subCategoryId: 'sub-audio',
    price: 499.0,
    compareAtPrice: 549.0,
    discountPercent: 9,
    rating: 4.9,
    reviewCount: 1340,
    stock: 25,
    maxStock: 40,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-13.jpg',
  },
  {
    id: 'elec-jbl-flip',
    title: 'JBL Flip 6 Waterproof Portable Bluetooth Speaker Ocean Blue Deep Bass',
    category: 'AUDIO',
    subCategoryId: 'sub-audio',
    price: 119.95,
    compareAtPrice: 139.95,
    discountPercent: 14,
    rating: 4.82,
    reviewCount: 890,
    stock: 45,
    maxStock: 60,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-14.jpg',
  },
  {
    id: 'elec-sennheiser-m4',
    title: 'Sennheiser Momentum 4 Wireless ANC Headphones 60-Hour Battery Life',
    category: 'AUDIO',
    subCategoryId: 'sub-audio',
    price: 279.95,
    compareAtPrice: 379.95,
    discountPercent: 26,
    rating: 4.88,
    reviewCount: 640,
    stock: 22,
    maxStock: 35,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-13.jpg',
  },
  {
    id: 'elec-bose-qc-ultra',
    title: 'Bose QuietComfort Ultra Wireless Noise Cancelling Headphones Spatial Audio',
    category: 'AUDIO',
    subCategoryId: 'sub-audio',
    price: 379.0,
    compareAtPrice: 429.0,
    discountPercent: 12,
    rating: 4.92,
    reviewCount: 910,
    stock: 19,
    maxStock: 30,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/products/prod_silver_headphones.jpg',
  },
  {
    id: 'elec-ath-m50x',
    title: 'Audio-Technica ATH-M50xBT2 Professional Studio Monitor Bluetooth Headphones',
    category: 'AUDIO',
    subCategoryId: 'sub-audio',
    price: 199.0,
    compareAtPrice: 219.0,
    discountPercent: 9,
    rating: 4.86,
    reviewCount: 780,
    stock: 27,
    maxStock: 40,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-13.jpg',
  },
  {
    id: 'elec-sony-wf-1000xm5',
    title: 'Sony WF-1000XM5 Truly Wireless Noise Canceling Earbuds Hi-Res Audio',
    category: 'AUDIO',
    subCategoryId: 'sub-audio',
    price: 248.0,
    compareAtPrice: 299.99,
    discountPercent: 17,
    rating: 4.84,
    reviewCount: 1120,
    stock: 34,
    maxStock: 50,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-14.jpg',
  },
  {
    id: 'elec-beosound-explore',
    title: 'Bang & Olufsen Beosound Explore Durable Outdoor Bluetooth Speaker Black',
    category: 'AUDIO',
    subCategoryId: 'sub-audio',
    price: 199.0,
    compareAtPrice: 249.0,
    discountPercent: 20,
    rating: 4.9,
    reviewCount: 310,
    stock: 16,
    maxStock: 25,
    sellerId: 'vendor-tech-1',
    sellerName: 'SoundWave Direct',
    sellerType: 'vendor',
    type: 'physical',
    image: '/images/bevesi/1-14.jpg',
  },
  {
    id: 'elec-shure-aonic50',
    title: 'Shure AONIC 50 Gen 2 Wireless Studio Headphones with Custom EQ',
    category: 'AUDIO',
    subCategoryId: 'sub-audio',
    price: 349.0,
    compareAtPrice: 399.0,
    discountPercent: 13,
    rating: 4.89,
    reviewCount: 220,
    stock: 12,
    maxStock: 20,
    sellerId: 'vendor-tech-1',
    sellerName: 'SoundWave Direct',
    sellerType: 'vendor',
    type: 'physical',
    image: '/images/products/prod_silver_headphones.jpg',
  },

  // Computers & Laptops
  {
    id: 'elec-ideapad-1i',
    title: 'Lenovo IdeaPad 1i 15.6" Laptop, Intel Core i5-1235U, 8GB RAM, 512GB SSD',
    category: 'COMPUTERS',
    subCategoryId: 'sub-computers',
    price: 312.25,
    compareAtPrice: 396.45,
    discountPercent: 21,
    rating: 4.8,
    reviewCount: 388,
    stock: 22,
    maxStock: 35,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-18.jpg',
  },
  {
    id: 'elec-keebcraft-kbd',
    title: 'KeebCraft Pro 75% Gasket-Mount Mechanical Keyboard RGB Tactile',
    category: 'COMPUTERS',
    subCategoryId: 'sub-computers',
    price: 159.0,
    compareAtPrice: 199.0,
    discountPercent: 20,
    rating: 4.75,
    reviewCount: 64,
    stock: 8,
    maxStock: 20,
    sellerId: 'vendor-tech-1',
    sellerName: 'SoundWave Direct',
    sellerType: 'vendor',
    type: 'physical',
    image: '/images/bevesi/1-20.jpg',
  },
  {
    id: 'elec-charger-station',
    title: 'Vendora Qi2 3-in-1 Magnetic Fast Wireless Charging Hub',
    category: 'COMPUTERS',
    subCategoryId: 'sub-computers',
    price: 79.0,
    compareAtPrice: 99.0,
    discountPercent: 20,
    rating: 4.8,
    reviewCount: 194,
    stock: 140,
    maxStock: 150,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-19.jpg',
  },
  {
    id: 'elec-logitech-mx',
    title: 'Logitech MX Master 3S Wireless Performance Mouse Dark Gray Quiet Clicks',
    category: 'COMPUTERS',
    subCategoryId: 'sub-computers',
    price: 99.99,
    compareAtPrice: 119.99,
    discountPercent: 17,
    rating: 4.9,
    reviewCount: 2150,
    stock: 55,
    maxStock: 70,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-20.jpg',
  },
  {
    id: 'elec-asus-monitor',
    title: 'ASUS ProArt 27" 4K HDR Color-Accurate Creator IPS Monitor 100% sRGB',
    category: 'COMPUTERS',
    subCategoryId: 'sub-computers',
    price: 389.0,
    compareAtPrice: 449.0,
    discountPercent: 13,
    rating: 4.85,
    reviewCount: 412,
    stock: 16,
    maxStock: 30,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-18.jpg',
  },
  {
    id: 'elec-samsung-t7',
    title: 'Samsung T7 Shield 2TB Portable Rugged NVMe External SSD USB 3.2',
    category: 'COMPUTERS',
    subCategoryId: 'sub-computers',
    price: 179.99,
    compareAtPrice: 219.99,
    discountPercent: 18,
    rating: 4.9,
    reviewCount: 940,
    stock: 62,
    maxStock: 80,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-19.jpg',
  },
  {
    id: 'elec-macbook-air-m3',
    title: 'Apple MacBook Air 13.6" M3 Liquid Retina 16GB Memory 512GB SSD Midnight',
    category: 'COMPUTERS',
    subCategoryId: 'sub-computers',
    price: 1249.0,
    compareAtPrice: 1499.0,
    discountPercent: 17,
    rating: 4.96,
    reviewCount: 1450,
    stock: 25,
    maxStock: 35,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-18.jpg',
  },
  {
    id: 'elec-dell-xps13',
    title: 'Dell XPS 13 9340 Intel Core Ultra 7 16GB RAM 512GB SSD InfinityEdge OLED',
    category: 'COMPUTERS',
    subCategoryId: 'sub-computers',
    price: 1199.0,
    compareAtPrice: 1399.0,
    discountPercent: 14,
    rating: 4.82,
    reviewCount: 380,
    stock: 14,
    maxStock: 25,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-18.jpg',
  },
  {
    id: 'elec-keychron-q1',
    title: 'Keychron Q1 Pro Custom Mechanical Keyboard Wireless QMK/VIA Aluminum',
    category: 'COMPUTERS',
    subCategoryId: 'sub-computers',
    price: 199.0,
    compareAtPrice: 229.0,
    discountPercent: 13,
    rating: 4.91,
    reviewCount: 520,
    stock: 30,
    maxStock: 45,
    sellerId: 'vendor-tech-1',
    sellerName: 'SoundWave Direct',
    sellerType: 'vendor',
    type: 'physical',
    image: '/images/bevesi/1-20.jpg',
  },
  {
    id: 'elec-lg-ultrafine',
    title: 'LG UltraFine 32" 4K UHD Nano IPS Ergo Monitor USB-C 95% DCI-P3 HDR400',
    category: 'COMPUTERS',
    subCategoryId: 'sub-computers',
    price: 499.0,
    compareAtPrice: 599.0,
    discountPercent: 17,
    rating: 4.88,
    reviewCount: 290,
    stock: 11,
    maxStock: 20,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-18.jpg',
  },
  {
    id: 'elec-mx-keys-mini',
    title: 'Logitech MX Keys Mini Wireless Illuminated Keyboard Pale Gray Compact',
    category: 'COMPUTERS',
    subCategoryId: 'sub-computers',
    price: 89.99,
    compareAtPrice: 109.99,
    discountPercent: 18,
    rating: 4.9,
    reviewCount: 1670,
    stock: 42,
    maxStock: 60,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-20.jpg',
  },
  {
    id: 'elec-caldigit-ts4',
    title: 'CalDigit TS4 Thunderbolt 4 18-Port Docking Station 98W Power Delivery',
    category: 'COMPUTERS',
    subCategoryId: 'sub-computers',
    price: 379.99,
    compareAtPrice: 420.0,
    discountPercent: 10,
    rating: 4.93,
    reviewCount: 410,
    stock: 18,
    maxStock: 30,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-19.jpg',
  },

  // Smartphones & Tablets
  {
    id: 'elec-s24ultra',
    title: 'Samsung Galaxy S24 Ultra 12+GB Titanium Gray Galaxy AI',
    category: 'SMARTPHONES',
    subCategoryId: 'sub-smartphones',
    price: 959.99,
    compareAtPrice: 1199.99,
    discountPercent: 20,
    rating: 4.8,
    reviewCount: 1240,
    stock: 45,
    maxStock: 50,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/products/prod_titanium_phone.jpg',
  },
  {
    id: 'elec-ipad-space',
    title: 'Apple iPad 10.2-inch Retina Display Wi-Fi 64GB Space Gray (9th Gen)',
    category: 'TABLETS',
    subCategoryId: 'sub-smartphones',
    price: 759.65,
    compareAtPrice: 870.99,
    discountPercent: 13,
    rating: 4.95,
    reviewCount: 890,
    stock: 11,
    maxStock: 20,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-16.jpg',
  },
  {
    id: 'elec-smartwatch-ultra',
    title: 'Titanium Smart Fitness Watch Ultra with Sport Band GPS Tracker',
    category: 'WEARABLES',
    subCategoryId: 'sub-smartphones',
    price: 189.0,
    compareAtPrice: 229.0,
    discountPercent: 17,
    rating: 4.8,
    reviewCount: 164,
    stock: 24,
    maxStock: 40,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/products/prod_smart_watch.jpg',
  },
  {
    id: 'elec-anker-powerbank',
    title: 'Anker Prime 20,000mAh Power Bank 200W Fast Multi-Device Charging',
    category: 'SMARTPHONES',
    subCategoryId: 'sub-smartphones',
    price: 109.99,
    compareAtPrice: 139.99,
    discountPercent: 21,
    rating: 4.88,
    reviewCount: 780,
    stock: 38,
    maxStock: 50,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-19.jpg',
  },
  {
    id: 'elec-pixel-pro',
    title: 'Google Pixel 9 Pro 128GB Obsidian Tensor G4 Gemini AI Triple Camera',
    category: 'SMARTPHONES',
    subCategoryId: 'sub-smartphones',
    price: 899.0,
    compareAtPrice: 999.0,
    discountPercent: 10,
    rating: 4.8,
    reviewCount: 620,
    stock: 19,
    maxStock: 30,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/products/prod_titanium_phone.jpg',
  },
  {
    id: 'elec-galaxy-tab',
    title: 'Samsung Galaxy Tab S9 FE 10.9" Wi-Fi 128GB Gray with S Pen Included',
    category: 'TABLETS',
    subCategoryId: 'sub-smartphones',
    price: 419.0,
    compareAtPrice: 479.0,
    discountPercent: 12,
    rating: 4.75,
    reviewCount: 310,
    stock: 22,
    maxStock: 35,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-16.jpg',
  },
  {
    id: 'elec-iphone-16promax',
    title: 'Apple iPhone 16 Pro Max 256GB Natural Titanium Super Retina XDR Display',
    category: 'SMARTPHONES',
    subCategoryId: 'sub-smartphones',
    price: 1199.0,
    compareAtPrice: 1299.0,
    discountPercent: 8,
    rating: 4.95,
    reviewCount: 2340,
    stock: 28,
    maxStock: 40,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/products/prod_titanium_phone.jpg',
  },
  {
    id: 'elec-oneplus-12',
    title: 'OnePlus 12 512GB Silky Black Snapdragon 8 Gen 3 100W SUPERVOOC Fast Charge',
    category: 'SMARTPHONES',
    subCategoryId: 'sub-smartphones',
    price: 799.99,
    compareAtPrice: 899.99,
    discountPercent: 11,
    rating: 4.84,
    reviewCount: 470,
    stock: 19,
    maxStock: 30,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/products/prod_titanium_phone.jpg',
  },
  {
    id: 'elec-ipad-air-m2',
    title: 'Apple iPad Air 11-inch M2 Liquid Retina 128GB Starlight Wi-Fi 6E',
    category: 'TABLETS',
    subCategoryId: 'sub-smartphones',
    price: 549.0,
    compareAtPrice: 599.0,
    discountPercent: 8,
    rating: 4.92,
    reviewCount: 810,
    stock: 24,
    maxStock: 35,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-16.jpg',
  },
  {
    id: 'elec-galaxy-watch-ultra',
    title: 'Samsung Galaxy Watch Ultra 47mm Titanium Gray LTE Smartwatch BioActive Sensor',
    category: 'WEARABLES',
    subCategoryId: 'sub-smartphones',
    price: 579.0,
    compareAtPrice: 649.99,
    discountPercent: 11,
    rating: 4.86,
    reviewCount: 380,
    stock: 15,
    maxStock: 25,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/products/prod_smart_watch.jpg',
  },
  {
    id: 'elec-nomad-baseone',
    title: 'Nomad Base One Max MagSafe 3-in-1 Fast Wireless Stand Solid Metal & Glass',
    category: 'SMARTPHONES',
    subCategoryId: 'sub-smartphones',
    price: 149.95,
    compareAtPrice: 179.95,
    discountPercent: 17,
    rating: 4.89,
    reviewCount: 290,
    stock: 22,
    maxStock: 35,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-19.jpg',
  },
  {
    id: 'elec-belkin-magsafe-3in1',
    title: 'Belkin BoostCharge Pro 3-in-1 Fast Wireless Charger with Official 15W MagSafe',
    category: 'SMARTPHONES',
    subCategoryId: 'sub-smartphones',
    price: 129.99,
    compareAtPrice: 149.99,
    discountPercent: 13,
    rating: 4.88,
    reviewCount: 680,
    stock: 33,
    maxStock: 50,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-19.jpg',
  },

  // Cameras & Drones
  {
    id: 'elec-instax-evo',
    title: 'FUJIFILM instax mini Evo Hybrid Instant Camera & Smartphone Printer',
    category: 'CAMERAS',
    subCategoryId: 'sub-cameras',
    price: 175.45,
    compareAtPrice: 219.99,
    discountPercent: 20,
    rating: 4.85,
    reviewCount: 420,
    stock: 14,
    maxStock: 25,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-17.jpg',
  },
  {
    id: 'elec-dji-drone',
    title: 'DJI Mini 3 Lightweight Camera Drone with 4K HDR Video & True Vertical',
    category: 'DRONES',
    subCategoryId: 'sub-cameras',
    price: 469.0,
    compareAtPrice: 559.0,
    discountPercent: 16,
    rating: 4.92,
    reviewCount: 310,
    stock: 9,
    maxStock: 15,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-15.jpg',
  },
  {
    id: 'elec-sony-a7',
    title: 'Sony Alpha 7 IV Full-Frame Mirrorless Hybrid Camera 33MP 4K 60p',
    category: 'CAMERAS',
    subCategoryId: 'sub-cameras',
    price: 2298.0,
    compareAtPrice: 2499.0,
    discountPercent: 8,
    rating: 4.95,
    reviewCount: 540,
    stock: 8,
    maxStock: 15,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-15.jpg',
  },
  {
    id: 'elec-gopro-hero12',
    title: 'GoPro HERO12 Black Waterproof Action Camera 5.3K HDR HyperSmooth 6.0',
    category: 'CAMERAS',
    subCategoryId: 'sub-cameras',
    price: 349.0,
    compareAtPrice: 399.0,
    discountPercent: 12,
    rating: 4.8,
    reviewCount: 830,
    stock: 31,
    maxStock: 45,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-17.jpg',
  },
  {
    id: 'elec-canon-rf',
    title: 'Canon EOS R50 Mirrorless Camera with RF-S 18-45mm Lens Kit 4K Vlogging',
    category: 'CAMERAS',
    subCategoryId: 'sub-cameras',
    price: 699.0,
    compareAtPrice: 799.0,
    discountPercent: 12,
    rating: 4.78,
    reviewCount: 290,
    stock: 18,
    maxStock: 25,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-15.jpg',
  },
  {
    id: 'elec-dji-mic',
    title: 'DJI Mic 2 Wireless Microphone Transmitter & Receiver 32-Bit Float',
    category: 'CAMERAS',
    subCategoryId: 'sub-cameras',
    price: 319.0,
    compareAtPrice: 349.0,
    discountPercent: 8,
    rating: 4.9,
    reviewCount: 420,
    stock: 24,
    maxStock: 35,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-17.jpg',
  },
  {
    id: 'elec-sony-2470gm',
    title: 'Sony FE 24-70mm f/2.8 GM II G Master Full-Frame Standard Zoom Lens E-Mount',
    category: 'CAMERAS',
    subCategoryId: 'sub-cameras',
    price: 2198.0,
    compareAtPrice: 2399.0,
    discountPercent: 8,
    rating: 4.97,
    reviewCount: 340,
    stock: 6,
    maxStock: 12,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-15.jpg',
  },
  {
    id: 'elec-nikon-z6iii',
    title: 'Nikon Z6 III Full-Frame Mirrorless Camera Body 24.5MP 6K RAW 120fps Viewfinder',
    category: 'CAMERAS',
    subCategoryId: 'sub-cameras',
    price: 2496.95,
    compareAtPrice: 2799.0,
    discountPercent: 11,
    rating: 4.94,
    reviewCount: 280,
    stock: 7,
    maxStock: 15,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-15.jpg',
  },
  {
    id: 'elec-dji-pocket3',
    title: 'DJI Osmo Pocket 3 Creator Combo 1" CMOS 4K 120fps Gimbal Camera Rotating Touchscreen',
    category: 'CAMERAS',
    subCategoryId: 'sub-cameras',
    price: 669.0,
    compareAtPrice: 719.0,
    discountPercent: 7,
    rating: 4.96,
    reviewCount: 950,
    stock: 18,
    maxStock: 25,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-17.jpg',
  },
  {
    id: 'elec-sigma-1850',
    title: 'Sigma 18-50mm f/2.8 DC DN Contemporary Lens for Sony E-Mount Lightweight Zoom',
    category: 'CAMERAS',
    subCategoryId: 'sub-cameras',
    price: 499.0,
    compareAtPrice: 549.0,
    discountPercent: 9,
    rating: 4.88,
    reviewCount: 410,
    stock: 20,
    maxStock: 30,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-15.jpg',
  },
  {
    id: 'elec-rode-wireless-pro',
    title: 'Rode Wireless PRO Dual-Channel Compact Wireless Microphone System 32-Bit Float',
    category: 'CAMERAS',
    subCategoryId: 'sub-cameras',
    price: 399.0,
    compareAtPrice: 449.0,
    discountPercent: 11,
    rating: 4.93,
    reviewCount: 310,
    stock: 14,
    maxStock: 22,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-17.jpg',
  },
  {
    id: 'elec-insta360-x4',
    title: 'Insta360 X4 8K Waterproof 360 Action Camera with FlowState Stabilization',
    category: 'CAMERAS',
    subCategoryId: 'sub-cameras',
    price: 499.99,
    compareAtPrice: 549.99,
    discountPercent: 9,
    rating: 4.89,
    reviewCount: 620,
    stock: 25,
    maxStock: 35,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/1-17.jpg',
  },
];

// Beauty & Skincare Carousel Products (Under Beauty Dual Promo Section)
const BEAUTY_SKINCARE_CAROUSEL: ProductItem[] = [
  {
    id: 'beauty-mineral-primer',
    title: 'Outside Beauty & Skincare SPF 50+ Broad Spectrum Mineral Sunscreen Primer',
    category: 'SUNSCREEN & PRIMER',
    price: 48.0,
    compareAtPrice: 62.0,
    discountPercent: 23,
    rating: 4.95,
    reviewCount: 840,
    stock: 35,
    maxStock: 50,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/promo_beauty_ageless.jpg',
  },
  {
    id: 'beauty-glytone-cleanser',
    title: 'Glytone Mild Cream Cleanser with 3.4 Free Acid Value & Glycolic Acid 200ml',
    category: 'CLEANSERS',
    price: 79.99,
    compareAtPrice: 95.0,
    discountPercent: 16,
    rating: 4.88,
    reviewCount: 2477,
    stock: 28,
    maxStock: 45,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/products/prod_amber_serum.jpg',
  },
  {
    id: 'beauty-amber-serum',
    title: 'Amber & Botanicals Restorative Facial Serum with Hyaluronic Acid 30ml',
    category: 'SERUMS',
    price: 68.0,
    compareAtPrice: 85.0,
    discountPercent: 20,
    rating: 4.94,
    reviewCount: 612,
    stock: 42,
    maxStock: 60,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/products/prod_amber_serum.jpg',
  },
  {
    id: 'beauty-nocturne-perfume',
    title: 'Nocturne Eau De Parfum Paris Luxury Artisanal Fragrance 100ml',
    category: 'FRAGRANCE',
    price: 185.0,
    compareAtPrice: 220.0,
    discountPercent: 16,
    rating: 4.96,
    reviewCount: 719,
    stock: 19,
    maxStock: 30,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/products/prod_luxury_perfume.jpg',
  },
  {
    id: 'beauty-jade-sculpt',
    title: 'Natural Green Jade Facial Roller & Contouring Gua Sha Stone Set',
    category: 'BEAUTY TOOLS',
    price: 28.0,
    compareAtPrice: 38.0,
    discountPercent: 26,
    rating: 4.87,
    reviewCount: 425,
    stock: 50,
    maxStock: 70,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/products/prod_jade_roller.jpg',
  },
  {
    id: 'beauty-kerastase-oil',
    title: 'Kérastase Elixir Ultime L’Huile Originale Hydrating Hair Oil 100ml',
    category: 'HAIR CARE',
    price: 54.0,
    compareAtPrice: 65.0,
    discountPercent: 17,
    rating: 4.92,
    reviewCount: 1104,
    stock: 31,
    maxStock: 45,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/promo_beauty_radiance.jpg',
  },
  {
    id: 'beauty-night-cream',
    title: 'Peptide & Ceramide Intensive Overnight Recovery Moisture Cream 50ml',
    category: 'MOISTURIZERS',
    price: 62.0,
    compareAtPrice: 78.0,
    discountPercent: 20,
    rating: 4.91,
    reviewCount: 530,
    stock: 36,
    maxStock: 50,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/products/prod_amber_serum.jpg',
  },
  {
    id: 'beauty-rose-mist',
    title: 'Bulgarian Rose Water Balancing Facial Toner & Hydrating Mist 150ml',
    category: 'TONERS',
    price: 32.0,
    compareAtPrice: 42.0,
    discountPercent: 24,
    rating: 4.82,
    reviewCount: 390,
    stock: 48,
    maxStock: 65,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/promo_beauty_radiance.jpg',
  },
  {
    id: 'beauty-eye-cream',
    title: 'Caffeine & Green Tea Brightening Under-Eye Depuffing Serum 15ml',
    category: 'EYE CARE',
    price: 38.5,
    compareAtPrice: 49.0,
    discountPercent: 21,
    rating: 4.87,
    reviewCount: 610,
    stock: 26,
    maxStock: 40,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/promo_beauty_ageless.jpg',
  },
  {
    id: 'beauty-clay-mask',
    title: 'Pore Purifying French Pink Clay Detoxifying Exfoliating Face Mask 100g',
    category: 'MASKS',
    price: 34.0,
    compareAtPrice: 45.0,
    discountPercent: 24,
    rating: 4.79,
    reviewCount: 480,
    stock: 44,
    maxStock: 60,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/products/prod_jade_roller.jpg',
  },
  {
    id: 'beauty-lip-oil',
    title: 'Hydrating Honey Infused Nourishing Lip Plumping Treatment Oil 10ml',
    category: 'LIP CARE',
    price: 22.0,
    compareAtPrice: 28.0,
    discountPercent: 21,
    rating: 4.94,
    reviewCount: 950,
    stock: 58,
    maxStock: 80,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/products/prod_luxury_perfume.jpg',
  },
  {
    id: 'beauty-body-lotion',
    title: 'Shea Butter & Vanilla Ultra-Rich Deep Nourishing Body Lotion 250ml',
    category: 'BODY CARE',
    price: 44.0,
    compareAtPrice: 55.0,
    discountPercent: 20,
    rating: 4.89,
    reviewCount: 720,
    stock: 33,
    maxStock: 50,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/products/prod_amber_serum.jpg',
  },
  {
    id: 'beauty-estee-lauder',
    title: 'Estée Lauder Advanced Night Repair Synchronized Multi-Recovery Complex 50ml',
    category: 'SERUMS',
    price: 115.0,
    compareAtPrice: 135.0,
    discountPercent: 15,
    rating: 4.93,
    reviewCount: 3100,
    stock: 24,
    maxStock: 40,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/products/prod_amber_serum.jpg',
  },
  {
    id: 'beauty-aesop-hand',
    title: 'Aesop Resurrection Aromatique Hand Balm Mandarin Rind Rosemary 75ml',
    category: 'BODY CARE',
    price: 35.0,
    compareAtPrice: 42.0,
    discountPercent: 17,
    rating: 4.91,
    reviewCount: 940,
    stock: 45,
    maxStock: 60,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/promo_beauty_radiance.jpg',
  },
  {
    id: 'beauty-lamer-cream',
    title: 'La Mer The Moisturizing Soft Cream Antioxidant Miracle Broth 60ml',
    category: 'MOISTURIZERS',
    price: 380.0,
    compareAtPrice: 420.0,
    discountPercent: 10,
    rating: 4.98,
    reviewCount: 650,
    stock: 14,
    maxStock: 25,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/promo_beauty_ageless.jpg',
  },
  {
    id: 'beauty-dyson-airwrap',
    title: 'Dyson Airwrap Multi-Styler Complete Long Nickel & Copper Styling Tool',
    category: 'HAIR CARE',
    price: 599.99,
    compareAtPrice: 649.99,
    discountPercent: 8,
    rating: 4.94,
    reviewCount: 1820,
    stock: 18,
    maxStock: 30,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/products/prod_silver_headphones.jpg',
  },
  {
    id: 'beauty-biossance-eye',
    title: 'Biossance Squalane + Marine Algae Eye Cream Firming & Lifting 15ml',
    category: 'EYE CARE',
    price: 56.0,
    compareAtPrice: 68.0,
    discountPercent: 18,
    rating: 4.88,
    reviewCount: 420,
    stock: 29,
    maxStock: 45,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/products/prod_amber_serum.jpg',
  },
  {
    id: 'beauty-tatcha-water-cream',
    title: 'Tatcha The Water Cream Pore-Refining Oil-Free Lightweight Moisturizer 50ml',
    category: 'MOISTURIZERS',
    price: 72.0,
    compareAtPrice: 85.0,
    discountPercent: 15,
    rating: 4.92,
    reviewCount: 1250,
    stock: 36,
    maxStock: 50,
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/bevesi/promo_beauty_radiance.jpg',
  },
];

// Product Data Rows matching Image 2
const HOME_KITCHEN_CAROUSEL: ProductItem[] = [
  { id: 'home-cookware', title: 'Ceramic Non-Stick Cookware Set with Detachable Handle, 10 Piece', category: 'KITCHEN', price: 129.0, compareAtPrice: 169.0, discountPercent: 24, rating: 4.7, reviewCount: 842, stock: 34, maxStock: 60, sellerId: 'platform', sellerName: 'Vendora', sellerType: 'platform', type: 'physical', image: '/images/bevesi/1-39.jpg' },
  { id: 'home-lamp', title: 'Woven Rattan Globe Table Lamp with Linen Shade', category: 'LIGHTING', price: 74.5, compareAtPrice: 99.0, discountPercent: 25, rating: 4.5, reviewCount: 316, stock: 22, maxStock: 50, sellerId: 'platform', sellerName: 'Vendora', sellerType: 'platform', type: 'physical', image: '/images/bevesi/1-40.jpg' },
  { id: 'home-kettle', title: 'Gooseneck Electric Kettle 1.0L, Blush Pink with Gold Accents', category: 'SMALL APPLIANCES', price: 59.99, compareAtPrice: 79.99, discountPercent: 25, rating: 4.8, reviewCount: 1204, stock: 41, maxStock: 80, sellerId: 'platform', sellerName: 'Vendora', sellerType: 'platform', type: 'physical', image: '/images/bevesi/1-41.jpg' },
  { id: 'home-airfryer', title: 'Digital Air Fryer 6 Qt, Touch Display, White with Gold Handle', category: 'SMALL APPLIANCES', price: 89.0, compareAtPrice: 119.0, discountPercent: 25, rating: 4.6, reviewCount: 2310, stock: 15, maxStock: 70, sellerId: 'platform', sellerName: 'Vendora', sellerType: 'platform', type: 'physical', image: '/images/bevesi/1-44.jpg' },
  { id: 'home-microwave', title: 'Retro Countertop Microwave Oven 0.7 cu ft, Surf Blue', category: 'APPLIANCES', price: 119.0, compareAtPrice: 149.0, discountPercent: 20, rating: 4.4, reviewCount: 689, stock: 27, maxStock: 50, sellerId: 'platform', sellerName: 'Vendora', sellerType: 'platform', type: 'physical', image: '/images/bevesi/1-45.jpg' },
  { id: 'home-espresso', title: 'Semi-Automatic Espresso Machine with Built-in Grinder, Matte Black', category: 'COFFEE', price: 899.0, compareAtPrice: 1099.0, discountPercent: 18, rating: 4.9, reviewCount: 523, stock: 9, maxStock: 30, sellerId: 'platform', sellerName: 'Vendora', sellerType: 'platform', type: 'physical', image: '/images/bevesi/1-46.jpg' },
  { id: 'home-washer', title: 'Front Load Washer 4.5 cu ft with Steam Cycle, Chrome Shadow', category: 'LAUNDRY', price: 749.0, compareAtPrice: 899.0, discountPercent: 17, rating: 4.7, reviewCount: 411, stock: 12, maxStock: 25, sellerId: 'platform', sellerName: 'Vendora', sellerType: 'platform', type: 'physical', image: '/images/bevesi/1-47.jpg' },
  { id: 'home-blender', title: 'High-Speed Professional Countertop Blender 1200W with 64oz Pitcher', category: 'SMALL APPLIANCES', price: 139.0, compareAtPrice: 179.0, discountPercent: 22, rating: 4.8, reviewCount: 640, stock: 28, maxStock: 50, sellerId: 'platform', sellerName: 'Vendora', sellerType: 'platform', type: 'physical', image: '/images/bevesi/1-41.jpg' },
  { id: 'home-toaster', title: '4-Slice Retro Stainless Steel Toaster with Extra-Wide Slots & Defrost', category: 'SMALL APPLIANCES', price: 69.99, compareAtPrice: 89.99, discountPercent: 22, rating: 4.65, reviewCount: 320, stock: 35, maxStock: 55, sellerId: 'platform', sellerName: 'Vendora', sellerType: 'platform', type: 'physical', image: '/images/bevesi/1-44.jpg' },
  { id: 'home-vacuum', title: 'Cordless Stick Vacuum Cleaner Lightweight 25kPa Strong Suction', category: 'APPLIANCES', price: 199.0, compareAtPrice: 249.0, discountPercent: 20, rating: 4.85, reviewCount: 780, stock: 18, maxStock: 40, sellerId: 'platform', sellerName: 'Vendora', sellerType: 'platform', type: 'physical', image: '/images/bevesi/1-45.jpg' },
  { id: 'home-knife-set', title: 'Japanese Steel 15-Piece Kitchen Knife Block Set with Built-in Sharpener', category: 'KITCHEN', price: 149.5, compareAtPrice: 199.0, discountPercent: 25, rating: 4.9, reviewCount: 510, stock: 22, maxStock: 45, sellerId: 'platform', sellerName: 'Vendora', sellerType: 'platform', type: 'physical', image: '/images/bevesi/1-39.jpg' },
  { id: 'home-juicer', title: 'Cold Press Masticating Slow Juicer Easy Clean Quiet Motor Silver', category: 'SMALL APPLIANCES', price: 119.0, compareAtPrice: 159.0, discountPercent: 25, rating: 4.75, reviewCount: 430, stock: 19, maxStock: 35, sellerId: 'platform', sellerName: 'Vendora', sellerType: 'platform', type: 'physical', image: '/images/bevesi/1-46.jpg' },
  { id: 'home-lecreuset-dutch', title: 'Le Creuset Enameled Cast Iron Signature Round Dutch Oven 5.5 Qt Cerise Red', category: 'KITCHEN', price: 349.95, compareAtPrice: 420.0, discountPercent: 17, rating: 4.96, reviewCount: 1680, stock: 16, maxStock: 30, sellerId: 'platform', sellerName: 'Vendora', sellerType: 'platform', type: 'physical', image: '/images/bevesi/1-39.jpg' },
  { id: 'home-kitchenaid-mixer', title: 'KitchenAid Artisan Series 5-Quart Tilt-Head Stand Mixer Pistachio', category: 'SMALL APPLIANCES', price: 379.99, compareAtPrice: 449.99, discountPercent: 15, rating: 4.95, reviewCount: 3420, stock: 24, maxStock: 40, sellerId: 'platform', sellerName: 'Vendora', sellerType: 'platform', type: 'physical', image: '/images/bevesi/1-41.jpg' },
  { id: 'home-breville-barista', title: 'Breville Barista Touch Impress Espresso Machine Brushed Stainless Steel', category: 'COFFEE', price: 1199.95, compareAtPrice: 1499.95, discountPercent: 20, rating: 4.92, reviewCount: 480, stock: 10, maxStock: 20, sellerId: 'platform', sellerName: 'Vendora', sellerType: 'platform', type: 'physical', image: '/images/bevesi/1-46.jpg' },
  { id: 'home-philips-hue', title: 'Philips Hue Smart LED Starter Kit Color Ambiance 4 Bulbs with Hue Bridge', category: 'LIGHTING', price: 159.0, compareAtPrice: 199.0, discountPercent: 20, rating: 4.86, reviewCount: 920, stock: 35, maxStock: 50, sellerId: 'platform', sellerName: 'Vendora', sellerType: 'platform', type: 'physical', image: '/images/bevesi/1-40.jpg' },
  { id: 'home-vitamix-a3500', title: 'Vitamix A3500 Ascent Series Smart Countertop Blender Brushed Stainless', category: 'SMALL APPLIANCES', price: 599.95, compareAtPrice: 699.95, discountPercent: 14, rating: 4.97, reviewCount: 890, stock: 15, maxStock: 25, sellerId: 'platform', sellerName: 'Vendora', sellerType: 'platform', type: 'physical', image: '/images/bevesi/1-41.jpg' },
  { id: 'home-fellow-stagg', title: 'Fellow Stagg EKG Electric Gooseneck Pour-Over Kettle 0.9L Matte White', category: 'SMALL APPLIANCES', price: 165.0, compareAtPrice: 195.0, discountPercent: 15, rating: 4.93, reviewCount: 1340, stock: 28, maxStock: 45, sellerId: 'platform', sellerName: 'Vendora', sellerType: 'platform', type: 'physical', image: '/images/bevesi/1-41.jpg' },
];

interface ParentSaleCategory {
  id: string;
  name: string;
  slug: string;
  products: ProductItem[];
}

// Sale Offers categorized by Parent Categories for the Hero Grid section (Limited Campaign)
// Note: Only categories that have products on sale will be displayed as options to the user
const ALL_PARENT_SALE_CATEGORIES: ParentSaleCategory[] = [
  {
    id: 'cat-electronics',
    name: 'Electronics',
    slug: 'electronics',
    products: [
      {
        id: 'deal-s24ultra',
        title: 'Samsung Galaxy S24 Ultra 12+GB Titanium Gray',
        category: 'SMARTPHONES',
        price: 959.99,
        compareAtPrice: 1199.99,
        discountPercent: 20,
        rating: 4.8,
        reviewCount: 1240,
        stock: 45,
        maxStock: 50,
        sellerId: 'platform',
        sellerName: 'Vendora',
        sellerType: 'platform',
        type: 'physical',
        image: '/images/products/prod_titanium_phone.jpg',
      },
      {
        id: 'deal-ideapad',
        title: 'Lenovo IdeaPad 1i 15.6" Laptop, Intel Core i5-1235U, 8GB RAM, 512GB SSD',
        category: 'COMPUTERS',
        price: 312.25,
        compareAtPrice: 396.45,
        discountPercent: 21,
        rating: 4.8,
        reviewCount: 388,
        stock: 22,
        maxStock: 35,
        sellerId: 'platform',
        sellerName: 'Vendora',
        sellerType: 'platform',
        type: 'physical',
        image: '/images/bevesi/1-18.jpg',
      },
      {
        id: 'deal-ipad',
        title: 'Apple iPad 10.2-inch Retina Display Wi-Fi 64GB Space Gray (9th Gen)',
        category: 'TABLETS',
        price: 759.65,
        compareAtPrice: 870.99,
        discountPercent: 13,
        rating: 4.95,
        reviewCount: 890,
        stock: 11,
        maxStock: 20,
        sellerId: 'platform',
        sellerName: 'Vendora',
        sellerType: 'platform',
        type: 'physical',
        image: '/images/bevesi/1-16.jpg',
      },
      {
        id: 'deal-keebcraft',
        title: 'KeebCraft Pro 75% Gasket-Mount Mechanical Keyboard RGB',
        category: 'ACCESSORIES',
        price: 159.0,
        compareAtPrice: 199.0,
        discountPercent: 20,
        rating: 4.75,
        reviewCount: 64,
        stock: 8,
        maxStock: 20,
        sellerId: 'vendor-tech-1',
        sellerName: 'SoundWave Direct',
        sellerType: 'vendor',
        type: 'physical',
        image: '/images/bevesi/1-20.jpg',
      },
      {
        id: 'deal-charger-hub',
        title: 'Vendora Qi2 3-in-1 Magnetic Fast Wireless Charging Station',
        category: 'CHARGERS',
        price: 79.0,
        compareAtPrice: 99.0,
        discountPercent: 20,
        rating: 4.8,
        reviewCount: 194,
        stock: 140,
        maxStock: 150,
        sellerId: 'platform',
        sellerName: 'Vendora',
        sellerType: 'platform',
        type: 'physical',
        image: '/images/bevesi/1-19.jpg',
      },
    ],
  },
  {
    id: 'cat-audio',
    name: 'Audio & Wearables',
    slug: 'audio-wearables',
    products: [
      {
        id: 'deal-sony-wh',
        title: 'Sony WH-1000XM5 Wireless Noise-Canceling Headphones Black',
        category: 'AUDIO',
        price: 298.0,
        compareAtPrice: 399.99,
        discountPercent: 25,
        rating: 4.9,
        reviewCount: 1420,
        stock: 18,
        maxStock: 30,
        sellerId: 'platform',
        sellerName: 'Vendora',
        sellerType: 'platform',
        type: 'physical',
        image: '/images/bevesi/1-13.jpg',
      },
      {
        id: 'deal-marshall',
        title: 'Marshall Emberton II Portable Waterproof Bluetooth Speaker Black & Brass',
        category: 'SPEAKERS',
        price: 169.99,
        compareAtPrice: 199.99,
        discountPercent: 15,
        rating: 4.88,
        reviewCount: 512,
        stock: 29,
        maxStock: 40,
        sellerId: 'platform',
        sellerName: 'Vendora',
        sellerType: 'platform',
        type: 'physical',
        image: '/images/bevesi/1-14.jpg',
      },
      {
        id: 'deal-silver-headphones',
        title: 'Space Silver Wireless ANC Over-Ear Studio Headphones Hi-Res',
        category: 'AUDIO',
        price: 349.0,
        compareAtPrice: 399.0,
        discountPercent: 12,
        rating: 4.9,
        reviewCount: 412,
        stock: 35,
        maxStock: 50,
        sellerId: 'platform',
        sellerName: 'Vendora',
        sellerType: 'platform',
        type: 'physical',
        image: '/images/products/prod_silver_headphones.jpg',
      },
      {
        id: 'deal-smartwatch-ultra',
        title: 'Titanium Smart Fitness Watch Ultra with Sport Band GPS Tracker',
        category: 'WEARABLES',
        price: 189.0,
        compareAtPrice: 229.0,
        discountPercent: 17,
        rating: 4.8,
        reviewCount: 164,
        stock: 24,
        maxStock: 40,
        sellerId: 'platform',
        sellerName: 'Vendora',
        sellerType: 'platform',
        type: 'physical',
        image: '/images/products/prod_smart_watch.jpg',
      },
      {
        id: 'deal-aura-iem',
        title: 'Aura Precision Studio Reference In-Ear Monitors MMCX Cable',
        category: 'AUDIO',
        price: 189.0,
        compareAtPrice: 220.0,
        discountPercent: 14,
        rating: 4.95,
        reviewCount: 112,
        stock: 14,
        maxStock: 25,
        sellerId: 'vendor-tech-1',
        sellerName: 'SoundWave Direct',
        sellerType: 'vendor',
        type: 'physical',
        image: '/images/bevesi/1-13.jpg',
      },
    ],
  },
  {
    id: 'cat-fashion',
    name: 'Fashion',
    slug: 'fashion',
    products: [
      {
        id: 'deal-hoodie',
        title: 'Cozy Ribbed Knit Cashmere Pullover Sweater',
        category: 'KNITWEAR',
        price: 85.0,
        compareAtPrice: 120.0,
        discountPercent: 29,
        rating: 4.8,
        reviewCount: 549,
        stock: 22,
        maxStock: 30,
        sellerId: 'platform',
        sellerName: 'Vendora',
        sellerType: 'platform',
        type: 'physical',
        image: '/images/products/prod_cashmere_sweater.jpg',
      },
      {
        id: 'deal-trench',
        title: 'Aurora Classic Double-Breasted Heritage Trench Coat Camel',
        category: 'OUTERWEAR',
        price: 280.0,
        compareAtPrice: 350.0,
        discountPercent: 20,
        rating: 4.95,
        reviewCount: 300,
        stock: 18,
        maxStock: 30,
        sellerId: 'vendor-design-1',
        sellerName: 'StudioCraft Assets',
        sellerType: 'vendor',
        type: 'physical',
        image: '/images/products/prod_trench_coat.jpg',
      },
      {
        id: 'deal-leather-bag',
        title: 'Italian Saffiano Structured Top-Handle Leather Handbag',
        category: 'BAGS',
        price: 340.0,
        compareAtPrice: 420.0,
        discountPercent: 19,
        rating: 4.9,
        reviewCount: 111,
        stock: 14,
        maxStock: 25,
        sellerId: 'vendor-design-1',
        sellerName: 'StudioCraft Assets',
        sellerType: 'vendor',
        type: 'physical',
        image: '/images/products/prod_leather_bag.jpg',
      },
      {
        id: 'deal-rolex-gold',
        title: 'Rolex Oyster Perpetual Day-Date 18K Yellow Gold Watch',
        category: 'WATCHES',
        price: 14950.0,
        compareAtPrice: 16500.0,
        discountPercent: 9,
        rating: 5.0,
        reviewCount: 28,
        stock: 3,
        maxStock: 5,
        sellerId: 'platform',
        sellerName: 'Vendora',
        sellerType: 'platform',
        type: 'physical',
        image: '/images/products/prod_gold_watch.jpg',
      },
      {
        id: 'deal-pure-cashmere',
        title: 'Pure Cashmere Ribbed Crewneck Luxury Sweater Oatmeal',
        category: 'KNITWEAR',
        price: 195.0,
        compareAtPrice: 240.0,
        discountPercent: 19,
        rating: 4.88,
        reviewCount: 115,
        stock: 16,
        maxStock: 25,
        sellerId: 'platform',
        sellerName: 'Vendora',
        sellerType: 'platform',
        type: 'physical',
        image: '/images/products/prod_cashmere_sweater.jpg',
      },
    ],
  },
  {
    id: 'cat-beauty',
    name: 'Beauty & Personal Care',
    slug: 'beauty-personal-care',
    products: [
      {
        id: 'deal-beauty-mineral',
        title: 'Outside Beauty & Skincare SPF 50+ Broad Spectrum Mineral Sunscreen Primer',
        category: 'SUNSCREEN',
        price: 48.0,
        compareAtPrice: 62.0,
        discountPercent: 23,
        rating: 4.95,
        reviewCount: 840,
        stock: 35,
        maxStock: 50,
        sellerId: 'platform',
        sellerName: 'Vendora',
        sellerType: 'platform',
        type: 'physical',
        image: '/images/bevesi/promo_beauty_ageless.jpg',
      },
      {
        id: 'deal-glytone',
        title: 'Glytone Mild Cream Cleanser with 3.4 Free Acid Value & Glycolic Acid 200ml',
        category: 'CLEANSERS',
        price: 79.99,
        compareAtPrice: 95.0,
        discountPercent: 16,
        rating: 4.88,
        reviewCount: 2477,
        stock: 28,
        maxStock: 45,
        sellerId: 'platform',
        sellerName: 'Vendora',
        sellerType: 'platform',
        type: 'physical',
        image: '/images/products/prod_amber_serum.jpg',
      },
      {
        id: 'deal-amber-serum',
        title: 'Amber & Botanicals Restorative Facial Serum with Hyaluronic Acid 30ml',
        category: 'SERUMS',
        price: 68.0,
        compareAtPrice: 85.0,
        discountPercent: 20,
        rating: 4.94,
        reviewCount: 612,
        stock: 42,
        maxStock: 60,
        sellerId: 'platform',
        sellerName: 'Vendora',
        sellerType: 'platform',
        type: 'physical',
        image: '/images/products/prod_amber_serum.jpg',
      },
      {
        id: 'deal-perfume',
        title: 'Nocturne Eau De Parfum Paris Luxury Artisanal Fragrance 100ml',
        category: 'FRAGRANCE',
        price: 185.0,
        compareAtPrice: 220.0,
        discountPercent: 16,
        rating: 4.96,
        reviewCount: 719,
        stock: 19,
        maxStock: 30,
        sellerId: 'platform',
        sellerName: 'Vendora',
        sellerType: 'platform',
        type: 'physical',
        image: '/images/products/prod_luxury_perfume.jpg',
      },
      {
        id: 'deal-jade',
        title: 'Natural Green Jade Facial Roller & Contouring Gua Sha Stone Set',
        category: 'TOOLS',
        price: 28.0,
        compareAtPrice: 38.0,
        discountPercent: 26,
        rating: 4.87,
        reviewCount: 425,
        stock: 50,
        maxStock: 70,
        sellerId: 'platform',
        sellerName: 'Vendora',
        sellerType: 'platform',
        type: 'physical',
        image: '/images/products/prod_jade_roller.jpg',
      },
    ],
  },
  {
    id: 'cat-home',
    name: 'Home & Kitchen',
    slug: 'home-kitchen',
    products: [
      {
        id: 'deal-pampas-vase',
        title: 'Handcrafted Fluted Ceramic Pampas Grass Decor Vase',
        category: 'DECOR',
        price: 42.0,
        compareAtPrice: 58.0,
        discountPercent: 27,
        rating: 4.7,
        reviewCount: 110,
        stock: 14,
        maxStock: 25,
        sellerId: 'platform',
        sellerName: 'Vendora',
        sellerType: 'platform',
        type: 'physical',
        image: '/images/products/prod_pampas_vase.jpg',
      },
      {
        id: 'deal-cookware',
        title: 'Ceramic Non-Stick Cookware Set with Detachable Handle, 10 Piece',
        category: 'KITCHEN',
        price: 129.0,
        compareAtPrice: 169.0,
        discountPercent: 24,
        rating: 4.7,
        reviewCount: 842,
        stock: 34,
        maxStock: 60,
        sellerId: 'platform',
        sellerName: 'Vendora',
        sellerType: 'platform',
        type: 'physical',
        image: '/images/bevesi/1-39.jpg',
      },
      {
        id: 'deal-kettle',
        title: 'Gooseneck Electric Kettle 1.0L, Blush Pink with Gold Accents',
        category: 'APPLIANCES',
        price: 59.99,
        compareAtPrice: 79.99,
        discountPercent: 25,
        rating: 4.8,
        reviewCount: 1204,
        stock: 41,
        maxStock: 80,
        sellerId: 'platform',
        sellerName: 'Vendora',
        sellerType: 'platform',
        type: 'physical',
        image: '/images/bevesi/1-41.jpg',
      },
      {
        id: 'deal-airfryer',
        title: 'Digital Air Fryer 6 Qt, Touch Display, White with Gold Handle',
        category: 'APPLIANCES',
        price: 89.0,
        compareAtPrice: 119.0,
        discountPercent: 25,
        rating: 4.6,
        reviewCount: 2310,
        stock: 15,
        maxStock: 70,
        sellerId: 'platform',
        sellerName: 'Vendora',
        sellerType: 'platform',
        type: 'physical',
        image: '/images/bevesi/1-44.jpg',
      },
      {
        id: 'deal-microwave',
        title: 'Retro Countertop Microwave Oven 0.7 cu ft, Surf Blue',
        category: 'APPLIANCES',
        price: 119.0,
        compareAtPrice: 149.0,
        discountPercent: 20,
        rating: 4.4,
        reviewCount: 689,
        stock: 27,
        maxStock: 50,
        sellerId: 'platform',
        sellerName: 'Vendora',
        sellerType: 'platform',
        type: 'physical',
        image: '/images/bevesi/1-45.jpg',
      },
    ],
  },
  {
    id: 'cat-shoes',
    name: 'Shoes',
    slug: 'shoes',
    products: [
      {
        id: 'deal-invincible',
        title: 'Hype Air Velocity Pro Cushioning Running Shoes',
        category: 'FOOTWEAR',
        price: 165.0,
        compareAtPrice: 210.0,
        discountPercent: 21,
        rating: 4.9,
        reviewCount: 787,
        stock: 19,
        maxStock: 40,
        sellerId: 'platform',
        sellerName: 'Vendora',
        sellerType: 'platform',
        type: 'physical',
        image: '/images/products/prod_hype_sneaker.jpg',
      },
      {
        id: 'deal-puma-sneaker',
        title: 'Puma Nitro Pro Distance Lightweight Running Shoes',
        category: 'FOOTWEAR',
        price: 118.0,
        compareAtPrice: 155.0,
        discountPercent: 24,
        rating: 4.84,
        reviewCount: 342,
        stock: 28,
        maxStock: 50,
        sellerId: 'vendor-tech-1',
        sellerName: 'SoundWave Direct',
        sellerType: 'vendor',
        type: 'physical',
        image: '/images/emox/hero_sneaker_clean.jpg',
      },
      {
        id: 'deal-aerostride-road',
        title: 'AeroStride Carbon Road Elite Breathable Athletic Sneakers',
        category: 'FOOTWEAR',
        price: 145.0,
        compareAtPrice: 189.0,
        discountPercent: 23,
        rating: 4.91,
        reviewCount: 220,
        stock: 17,
        maxStock: 35,
        sellerId: 'platform',
        sellerName: 'Vendora',
        sellerType: 'platform',
        type: 'physical',
        image: '/images/products/prod_hype_sneaker.jpg',
      },
      {
        id: 'deal-streetflex-low',
        title: 'StreetFlex Casual Minimalist Canvas Low-Top Sneakers White',
        category: 'FOOTWEAR',
        price: 55.0,
        compareAtPrice: 75.0,
        discountPercent: 27,
        rating: 4.76,
        reviewCount: 188,
        stock: 45,
        maxStock: 60,
        sellerId: 'vendor-design-1',
        sellerName: 'StudioCraft Assets',
        sellerType: 'vendor',
        type: 'physical',
        image: '/images/products/prod_hype_sneaker.jpg',
      },
      {
        id: 'deal-trailgrip-hike',
        title: 'TrailGrip All-Terrain Waterproof Outdoor Hiking Shoes',
        category: 'FOOTWEAR',
        price: 139.0,
        compareAtPrice: 179.0,
        discountPercent: 22,
        rating: 4.89,
        reviewCount: 310,
        stock: 21,
        maxStock: 40,
        sellerId: 'platform',
        sellerName: 'Vendora',
        sellerType: 'platform',
        type: 'physical',
        image: '/images/emox/hero_sneaker_clean.jpg',
      },
    ],
  },
  // Parent categories without sale products (demonstrating dynamic filter: only show categories with products on sale)
  {
    id: 'cat-kids',
    name: 'Kids & Baby',
    slug: 'kids-baby',
    products: [],
  },
  {
    id: 'cat-bags',
    name: 'Bags & Luggage',
    slug: 'bags-luggage',
    products: [],
  },
  {
    id: 'cat-jewelry',
    name: 'Jewelry & Watches',
    slug: 'jewelry-watches',
    products: [],
  },
  {
    id: 'cat-sports',
    name: 'Sports & Outdoors',
    slug: 'sports-outdoors',
    products: [],
  },
  {
    id: 'cat-digital',
    name: 'Digital Products',
    slug: 'digital-products',
    products: [],
  },
  {
    id: 'cat-cameras',
    name: 'Cameras & Photo',
    slug: 'cameras-photo',
    products: [],
  },
];

interface CountdownPillsProps {
  initialDays?: number;
  initialHours?: number;
  initialMinutes?: number;
  initialSeconds?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}

/** Live "Remaining Time" widget used on the promo banners (self-contained timer to prevent page re-renders). */
const CountdownPills: React.FC<CountdownPillsProps> = ({
  initialDays = 39,
  initialHours = 5,
  initialMinutes = 4,
  initialSeconds = 57,
  days: propDays,
  hours: propHours,
  minutes: propMinutes,
  seconds: propSeconds,
}) => {
  const [time, setTime] = useState(() => ({
    days: propDays ?? initialDays,
    hours: propHours ?? initialHours,
    minutes: propMinutes ?? initialMinutes,
    seconds: propSeconds ?? initialSeconds,
  }));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <div>
      <p className="font-outfit mb-1.5 text-[11px] font-medium text-[#5A5148]">Remaining Time:</p>
      <div className="font-outfit inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-xs font-bold tabular-nums shadow-sm sm:text-sm">
        <span className="text-slate-400">{pad(time.days)}</span>
        <span className="text-slate-400">:</span>
        <span className="text-slate-400">{pad(time.hours)}</span>
        <span className="text-slate-400">:</span>
        <span className="text-slate-400">{pad(time.minutes)}</span>
        <span className="text-slate-400">:</span>
        <span className="text-slate-900">{pad(time.seconds)}</span>
      </div>
    </div>
  );
};


export const HomePage: React.FC = () => {
  const { addItem } = useCartStore();
  const { toggleWishlist, isInWishlist } = useWishlistStore();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Hero Section Carousel state
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);

  // Section 3: Limited Campaign (Sale Offers by Parent Category)
  // Only parent categories with products on sale are displayed as options to the user
  const parentCategoriesWithSales = useMemo(() => {
    return ALL_PARENT_SALE_CATEGORIES.filter(
      (cat) =>
        cat.products.length > 0 &&
        cat.products.some(
          (p) => (p.discountPercent ?? 0) > 0 || (p.compareAtPrice && p.compareAtPrice > p.price)
        )
    );
  }, []);

  const [selectedSaleCategory, setSelectedSaleCategory] = useState<string>('cat-electronics');

  const currentSaleCategory = useMemo(() => {
    return (
      parentCategoriesWithSales.find((c) => c.id === selectedSaleCategory) ||
      parentCategoriesWithSales[0]
    );
  }, [parentCategoriesWithSales, selectedSaleCategory]);

  // Ref for Popular Categories interactive smooth scrolling
  const categoriesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroSlideIndex((prev) => (prev + 1) % HERO_CAROUSEL_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const scrollContainer = useCallback((ref: React.RefObject<HTMLDivElement | null>, offset: number) => {
    const el = ref.current;
    if (!el) return;
    // Viewport-aware paging: move ~85% of the visible width per press,
    // in the direction requested (sign of offset).
    const step = Math.max(Math.round(el.clientWidth * 0.85), 160) * Math.sign(offset);
    el.scrollBy({ left: step, behavior: 'smooth' });
  }, []);

  const nextHeroSlide = () => {
    setHeroSlideIndex((prev) => (prev + 1) % HERO_CAROUSEL_SLIDES.length);
  };

  const prevHeroSlide = () => {
    setHeroSlideIndex((prev) => (prev - 1 + HERO_CAROUSEL_SLIDES.length) % HERO_CAROUSEL_SLIDES.length);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const handleAddToCart = useCallback((item: ProductItem) => {
    addItem({
      id: item.id,
      productId: item.id,
      title: item.title,
      price: item.price,
      maxStock: item.maxStock,
      image: item.image,
      sellerId: item.sellerId,
      sellerName: item.sellerName,
      sellerType: item.sellerType,
      type: item.type,
    });
    showToast(`Added ${item.title} to cart`);
  }, [addItem]);

  const handleToggleWishlist = useCallback((item: ProductItem) => {
    const isWishlisted = isInWishlist(item.id);
    toggleWishlist({
      id: item.id,
      title: item.title,
      slug: item.id,
      description: item.title,
      price: item.price,
      compareAtPrice: item.compareAtPrice,
      images: [item.image],
      category: item.category,
      brand: 'Vendora',
      sellerId: item.sellerId,
      sellerName: item.sellerName,
      sellerType: item.sellerType,
      type: item.type,
      stock: item.stock,
      rating: item.rating,
      reviewCount: item.reviewCount,
      variants: [],
      status: 'approved',
      createdAt: new Date().toISOString(),
    });
    showToast(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist');
  }, [isInWishlist, toggleWishlist]);


  return (
    <div className="bg-[#FFFFFF] min-h-screen text-[#1F2937]">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6">
        {/* =========================================================================
            1. Hero Bento Grid (Image 2)
            ========================================================================= */}
        <section className="mb-10">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Left Card: Interactive Carousel (iPhone 18 Pro Max & Apple Watch Series 10) (8 Cols) */}
            <div className="relative overflow-hidden rounded-[28px] bg-[#0C1046] shadow-xl lg:col-span-9 group aspect-[16/9] min-h-[260px] sm:min-h-[320px] flex items-center justify-center">
              {HERO_CAROUSEL_SLIDES.map((slide, idx) => (
                <div
                  key={slide.id}
                  className={`absolute inset-0 transition-opacity duration-700 ${
                    heroSlideIndex === idx ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
                  }`}
                >
                  <img
                    src={slide.image}
                    alt={slide.alt}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <Link to={slide.link} className="absolute inset-0 z-20" title={slide.title} />
                </div>
              ))}

              {/* Prev / Next Carousel Navigation Arrows */}
              <button
                type="button"
                onClick={prevHeroSlide}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs opacity-0 group-hover:opacity-100 hover:bg-black/60 transition-all cursor-pointer"
                aria-label="Previous Slide"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={nextHeroSlide}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs opacity-0 group-hover:opacity-100 hover:bg-black/60 transition-all cursor-pointer"
                aria-label="Next Slide"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Right Card: Sale Up to 50% Off Running Sneaker (3 Cols, hidden on mobile) */}
            <div className="relative overflow-hidden hidden md:block rounded-[28px] bg-[#1A9ACB] shadow-lg lg:col-span-3 group lg:aspect-auto aspect-[16/9] min-h-[260px] sm:min-h-[320px]">
              <img
                src="/images/emox/hero_sneaker_clean.jpg"
                alt="Sale Up to 50% Off Puma Running Sneaker"
                className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
              />
              <Link to="/products?category=shoes" className="absolute inset-0 z-20" title="Shop Sneakers Sale" />
            </div>
          </div>

          {/* Interactive Carousel Pagination Dots */}
          <div className="mt-4 flex items-center justify-center gap-2">
            {HERO_CAROUSEL_SLIDES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setHeroSlideIndex(idx)}
                aria-label={`Go to hero slide ${idx + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  heroSlideIndex === idx
                    ? 'h-2 w-7 bg-slate-900'
                    : 'h-2 w-2 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
        </section>

        {/* =========================================================================
            2. Explore Popular Categories (Image 2 - Centered Alignment)
            ========================================================================= */}
        <section className="mb-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
              Explore Popular Categories
            </h2>
            <Link
              to="/products"
              className="group flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-[#FF7A1A] transition-colors"
            >
              <span>View All</span>
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="relative flex items-center justify-between">
            {/* Left arrow scroll button */}
            <button
              type="button"
              onClick={() => scrollContainer(categoriesRef, -240)}
              className="flex mr-2 h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-md border border-slate-200 text-slate-700 hover:text-slate-900 hover:scale-105 transition-all cursor-pointer"
              title="Previous categories"
              aria-label="Previous categories"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div
              ref={categoriesRef}
              className="flex items-center gap-4 sm:gap-6 md:gap-7 overflow-x-auto scroll-smooth no-scrollbar py-3 px-2 justify-start w-full"
            >
              {POPULAR_CATEGORIES.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/products?category=${cat.slug}`}
                  className="group flex flex-col items-center shrink-0 transition-transform hover:-translate-y-1"
                >
                  <div className="flex h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 items-center justify-center rounded-full bg-[#F4F6F8] p-3 overflow-hidden shadow-2xs border border-slate-100 transition-all duration-300 group-hover:scale-105 group-hover:shadow-md group-hover:bg-[#EBF1F7] group-hover:border-sky-200">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110 drop-shadow-xs"
                    />
                  </div>
                  <span className="mt-3 text-xs font-bold text-slate-800 text-center tracking-tight group-hover:text-[#FF7A1A] transition-colors max-w-[100px] leading-tight">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>

            {/* Right arrow scroll button */}
            <button
              type="button"
              onClick={() => scrollContainer(categoriesRef, 240)}
              className="flex ml-2 h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-md border border-slate-200 text-slate-700 hover:text-slate-900 hover:scale-105 transition-all cursor-pointer"
              title="Next categories"
              aria-label="Next categories"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </section>

        {/* =========================================================================
            3. Limited Campaign (Sale Offers by Parent Category)
            ========================================================================= */}
        <section className="mb-14">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3 sm:gap-5">
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl whitespace-nowrap">
                Limited Campaign
              </h2>
              {/* Parent category pills: only show categories that have products on sale */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                {parentCategoriesWithSales.map((cat) => {
                  const isSelected = selectedSaleCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedSaleCategory(cat.id)}
                      className={`cursor-pointer rounded-full px-4 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                        isSelected
                          ? 'border border-[#FF7A1A] bg-orange-50 text-[#FF7A1A] shadow-2xs font-bold'
                          : 'border border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <Link
              to={`/products?category=${currentSaleCategory?.slug || 'electronics'}`}
              className="group hidden items-center gap-1 text-xs font-bold text-[#FF7A1A] hover:underline sm:flex shrink-0"
            >
              <span>View All</span>
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {currentSaleCategory?.products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
                onToggleWishlist={handleToggleWishlist}
                isWishlisted={isInWishlist(product.id)}
              />
            ))}
          </div>
        </section>

        {/* =========================================================================
            3A. Electronics Bento Countdown Promo (Screenshot 2026-10-05 235506.png)
            ========================================================================= */}
        <section className="mb-14">
          <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-12">
            {/* Left Large Card: Headphones, Laptops & More */}
            <div className="group relative min-h-[400px] overflow-hidden rounded-[26px] bg-[#EFEFEF] shadow-sm transition-all hover:shadow-lg sm:min-h-[460px] md:col-span-7">
              <img
                src="/images/bevesi/art_elec_man.png"
                alt="Man wearing wireless headphones"
                className="absolute bottom-0 right-0 h-full w-auto max-w-[62%] object-cover object-left [mask-image:linear-gradient(to_right,transparent,black_18%)] transition-transform duration-700 group-hover:scale-105"
              />
              <div className="relative z-10 flex h-full max-w-[62%] flex-col justify-between p-6 sm:p-9">
                <div>
                  <p className="font-outfit text-xs font-semibold text-[#5A5148] sm:text-sm">Top Deals on Tech</p>
                  <h3 className="font-outfit mt-2 text-3xl font-extrabold leading-[0.96] tracking-tight text-[#5A5148] sm:text-[44px] lg:text-[52px]">
                    Headphones,<br />Laptops & More
                  </h3>
                  <p className="font-outfit mt-3.5 max-w-[340px] text-xs font-normal leading-relaxed text-[#6B635B] sm:text-sm">
                    Save up to 30% on audio and computers from trusted vendors.
                  </p>
                  <Link
                    to="/products?category=electronics"
                    className="font-outfit mt-5 inline-flex items-center rounded-lg bg-white px-6 py-2.5 text-xs font-bold text-slate-900 shadow-sm transition-colors hover:bg-slate-900 hover:text-white sm:text-sm"
                  >
                    Shop Electronics
                  </Link>
                </div>
                <CountdownPills
                  initialDays={39}
                  initialHours={5}
                  initialMinutes={4}
                  initialSeconds={57}
                />
              </div>
            </div>

            {/* Right Bento Grid: 2 Top Cards + 1 Bottom Card */}
            <div className="flex flex-col justify-between gap-5 md:col-span-5">
              <div className="grid flex-1 grid-cols-2 gap-5">
                {/* Smartphones (Purple) */}
                <Link
                  to="/products?category=electronics"
                  className="group relative flex min-h-[240px] flex-col items-center overflow-hidden rounded-[22px] bg-[#EEE8F4] px-3 pt-5 text-center shadow-sm transition-all hover:shadow-lg"
                >
                  <p className="font-outfit text-[11px] font-semibold text-[#6B5B8A] sm:text-xs">Smartphones</p>
                  <h3 className="font-outfit mt-1.5 text-base font-extrabold leading-[1.05] tracking-tight text-[#6B5B8A] sm:text-xl">
                    Latest Phones,<br />Best Prices
                  </h3>
                  <p className="font-outfit text-[10px] text-[#6B5B8A]/80 mt-0.5">
                    Compare top brands. Free returns.
                  </p>
                  <img
                    src="/images/bevesi/art_elec_phones.png"
                    alt="Foldable smartphones"
                    className="mt-auto w-[88%] object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                </Link>

                {/* Retro Radio (Peach) */}
                <Link
                  to="/products?category=electronics"
                  className="group relative flex min-h-[240px] flex-col items-center overflow-hidden rounded-[22px] bg-[#F8F3EF] px-3 pt-5 text-center shadow-sm transition-all hover:shadow-lg"
                >
                  <p className="font-outfit text-[11px] font-semibold text-[#9A6B66] sm:text-xs">Home Audio</p>
                  <h3 className="font-outfit mt-1.5 text-base font-extrabold leading-[1.05] tracking-tight text-[#9A6B66] sm:text-xl">
                    Retro Sound,<br />Modern Quality
                  </h3>
                  <p className="font-outfit text-[10px] text-[#9A6B66]/80 mt-0.5">
                    Speakers & radios from $39.
                  </p>
                  <img
                    src="/images/bevesi/art_elec_radio.png"
                    alt="Retro bluetooth radio"
                    className="mt-auto w-full object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                </Link>
              </div>

              {/* Bottom Card: Coffee Maker / Gadgets (Mint) */}
              <Link
                to="/products?category=electronics"
                className="group relative flex min-h-[200px] flex-1 overflow-hidden rounded-[22px] bg-[#F2F2F2] shadow-sm transition-all hover:shadow-lg"
              >
                <div className="relative z-10 flex max-w-[58%] flex-col justify-center p-5 sm:p-7">
                  <p className="font-outfit text-[11px] font-semibold text-[#567A6B] sm:text-xs">Trending Now</p>
                  <h3 className="font-outfit mt-1.5 text-2xl font-extrabold leading-[1.02] tracking-tight text-[#567A6B] sm:text-[32px]">
                    Tech Everyone’s<br />Buying
                  </h3>
                  <p className="font-outfit mt-2 text-[11px] font-normal leading-relaxed text-[#567A6B] sm:text-sm">
                    Top-rated gadgets this week. Fast delivery from verified sellers.
                  </p>
                </div>
                <img
                  src="/images/bevesi/art_elec_coffee.png"
                  alt="Coffee maker"
                  className="absolute bottom-0 right-[6%] h-[92%] w-auto object-contain object-bottom transition-transform duration-500 group-hover:scale-105"
                />
              </Link>
            </div>
          </div>

          {/* Electronics Brand Strip */}
          <div className="mt-8 flex items-center justify-center border-t border-slate-100 pt-6">
            <img
              src="/images/bevesi/brands_electronics_strip_clean.png"
              alt="Official Electronics Brands: oppo, SIEMENS, dyson, SONY, DELL, Lenovo, intel"
              className="max-h-9 sm:max-h-11 w-full max-w-4xl object-contain opacity-80 hover:opacity-100 transition-opacity"
            />
          </div>
        </section>

        {/* =========================================================================
            3B. Product Cards Carousel 1: Electronics (with sub-category tabs)
            ========================================================================= */}
        <ProductCarouselWithTabs
          title="Electronics"
          categorySlug="electronics"
          tabs={ELECTRONICS_SUBCATEGORIES}
          products={TRENDING_ELECTRONICS_CAROUSEL}
          onAddToCart={handleAddToCart}
          onToggleWishlist={handleToggleWishlist}
          isInWishlist={isInWishlist}
        />

        {/* =========================================================================
            3C. Dual Countdown Beauty Promo
            ========================================================================= */}
        <section className="mb-14">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Card 1: Glow Up Your Routine */}
            <div className="group relative min-h-[360px] overflow-hidden rounded-[26px] bg-[#F2F1EF] shadow-sm transition-all hover:shadow-lg sm:min-h-[440px]">
              <img
                src="/images/bevesi/beauty_face_full.jpg"
                alt="Skincare model applying cleanser"
                className="absolute inset-0 h-full w-full object-cover object-right transition-transform duration-700 group-hover:scale-105"
              />
              <div className="relative z-10 flex h-full max-w-[56%] sm:max-w-[50%] flex-col justify-between p-6 sm:p-9">
                <div>
                  <p className="font-outfit text-xs font-semibold text-[#5A5148] sm:text-sm">Beauty Essentials</p>
                  <h3 className="font-outfit mt-2 text-2xl font-extrabold leading-[1.05] tracking-tight text-[#5A5148] sm:text-[34px] lg:text-[40px]">
                    Glow Up Your Routine
                  </h3>
                  <p className="font-outfit mt-3 max-w-[340px] text-xs leading-relaxed text-[#6B635B] sm:text-sm">
                    Skincare, makeup and fragrances. Up to 25% off.
                  </p>
                  <Link
                    to="/products?category=beauty"
                    className="font-outfit mt-5 inline-flex items-center rounded-full border border-slate-900 px-6 py-2.5 text-xs font-bold text-slate-900 transition-colors hover:bg-slate-900 hover:text-white sm:text-sm"
                  >
                    Shop Beauty
                  </Link>
                </div>
                <CountdownPills
                  initialDays={37}
                  initialHours={17}
                  initialMinutes={4}
                  initialSeconds={57}
                />
              </div>
            </div>

            {/* Card 2: Serums, SPF & Moisturizers */}
            <div className="group relative min-h-[360px] overflow-hidden rounded-[26px] bg-[#F2F1EF] shadow-sm transition-all hover:shadow-lg sm:min-h-[440px]">
              <img
                src="/images/bevesi/beauty_primer_full.jpg"
                alt="Coastal Glow Hydrating Tint SPF 30"
                className="absolute inset-0 h-full w-full object-cover object-right transition-transform duration-700 group-hover:scale-105"
              />
              <div className="relative z-10 flex h-full max-w-[62%] flex-col justify-between p-6 sm:p-9">
                <div>
                  <p className="font-outfit text-xs font-semibold text-[#5A5148] sm:text-sm">Skincare Picks</p>
                  <h3 className="font-outfit mt-2 text-2xl font-extrabold leading-[1.05] tracking-tight text-[#5A5148] sm:text-[34px] lg:text-[40px]">
                    Serums, SPF &amp; Moisturizers
                  </h3>
                  <p className="font-outfit mt-3 max-w-[340px] text-xs leading-relaxed text-[#6B635B] sm:text-sm">
                    Skincare, makeup and fragrances. Up to 25% off.
                  </p>
                  <Link
                    to="/products?category=beauty"
                    className="font-outfit mt-5 inline-flex items-center rounded-full border border-slate-900 px-6 py-2.5 text-xs font-bold text-slate-900 transition-colors hover:bg-slate-900 hover:text-white sm:text-sm"
                  >
                    Shop Beauty
                  </Link>
                </div>
                <CountdownPills
                  initialDays={38}
                  initialHours={17}
                  initialMinutes={4}
                  initialSeconds={57}
                />
              </div>
            </div>
          </div>

          {/* Beauty Brands Strip */}
          <div className="mt-8 flex items-center justify-center border-t border-slate-100 pt-6">
            <img
              src="/images/bevesi/brands_beauty_strip_clean.png"
              alt="Official Beauty Brands: allure, L'Oreal, Aesop, Kerastase, Biotherm, Unilever, Dior, Aveda"
              className="max-h-8 sm:max-h-10 w-full max-w-4xl object-contain opacity-80 hover:opacity-100 transition-opacity"
            />
          </div>
        </section>

        {/* =========================================================================
            3D. Product Cards Carousel 2: Beauty & Personal Care (without tabs)
            ========================================================================= */}
        <ProductCarouselWithoutTabs
          title="Beauty & Personal Care"
          categorySlug="beauty"
          products={BEAUTY_SKINCARE_CAROUSEL}
          onAddToCart={handleAddToCart}
          onToggleWishlist={handleToggleWishlist}
          isInWishlist={isInWishlist}
        />

        {/* =========================================================================
            3E. Home Equipment Bento Promo
            ========================================================================= */}
        <section className="mb-14">
          <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-12">
            {/* Left tall card: Kitchen Favorites */}
            <Link
              to="/products?category=appliances"
              className="group relative min-h-[420px] overflow-hidden rounded-[26px] bg-[#F3F3F3] shadow-sm transition-all hover:shadow-lg md:col-span-3 md:min-h-[480px]"
            >
              <img
                src="/images/bevesi/banner-16.jpg"
                alt="Pastel green stand mixer"
                className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
              />
              <div className="relative z-10 px-4 pt-7 text-center">
                <p className="font-outfit text-[11px] font-medium text-slate-500 sm:text-xs">Kitchen Favorites</p>
                <h3 className="font-outfit mt-1 text-2xl font-extrabold tracking-tight text-[#5A5A5A] sm:text-[28px]">
                  Make Cooking Easier
                </h3>
              </div>
              <p className="font-outfit absolute inset-x-0 bottom-6 z-10 px-4 text-center text-xs font-medium text-slate-600 sm:text-sm">
                Mixers, kettles &amp; cookware from $29.
              </p>
            </Link>

            {/* Center wide card: Home Appliances + countdown */}
            <div className="group relative min-h-[420px] overflow-hidden rounded-[26px] bg-[#EEF2F8] shadow-sm transition-all hover:shadow-lg md:col-span-6 md:min-h-[480px]">
              <img
                src="/images/bevesi/banner-13.jpg"
                alt="Front-load washing machine"
                className="absolute inset-0 h-full w-full object-cover object-right-bottom transition-transform duration-700 group-hover:scale-105"
              />
              <div className="relative z-10 flex h-full max-w-[62%] flex-col justify-between p-6 sm:p-9">
                <div>
                  <p className="font-outfit text-xs font-semibold text-slate-600 sm:text-sm">Home Appliances</p>
                  <h3 className="font-outfit mt-2 text-3xl font-extrabold leading-[1.02] tracking-tight text-[#3B4254] sm:text-[44px]">
                    Upgrade Your Home
                  </h3>
                  <p className="font-outfit mt-3 max-w-[340px] text-xs leading-relaxed text-slate-600 sm:text-sm">
                    Air fryers, vacuums &amp; more. Up to 25% off.
                  </p>
                  <Link
                    to="/products?category=appliances"
                    className="font-outfit mt-5 inline-flex items-center rounded-lg bg-[#FF7A1A] px-6 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#EA580C] sm:text-sm"
                  >
                    Shop Now
                  </Link>
                </div>
                <CountdownPills
                  initialDays={37}
                  initialHours={13}
                  initialMinutes={4}
                  initialSeconds={57}
                />
              </div>
            </div>

            {/* Right stacked cards: Small Appliances + Breakfast Corner */}
            <div className="flex flex-col gap-5 md:col-span-3">
              <Link
                to="/products?category=appliances"
                className="group relative min-h-[230px] flex-1 overflow-hidden rounded-[22px] bg-[#F1EFEA] shadow-sm transition-all hover:shadow-lg"
              >
                <img
                  src="/images/bevesi/banner-14.jpg"
                  alt="Air purifier"
                  className="absolute inset-0 h-full w-full object-cover object-bottom transition-transform duration-500 group-hover:scale-105"
                />
                <div className="relative z-10 px-3 pt-4 text-center">
                  <p className="font-outfit text-[11px] font-medium text-[#7A6A8A]">Small Appliances</p>
                  <h3 className="font-outfit mt-0.5 text-lg font-extrabold leading-tight tracking-tight text-[#6F5C86] sm:text-xl">
                    Everyday Essentials
                  </h3>
                  <p className="font-outfit mt-1 text-[11px] font-medium text-[#7A6A8A]/90">
                    Top-rated picks under $100.
                  </p>
                </div>
              </Link>
              <Link
                to="/products?category=appliances"
                className="group relative min-h-[230px] flex-1 overflow-hidden rounded-[22px] bg-[#EEF6EE] shadow-sm transition-all hover:shadow-lg"
              >
                <img
                  src="/images/bevesi/banner-15.jpg"
                  alt="Pastel green toaster"
                  className="absolute inset-0 h-full w-full object-cover object-bottom transition-transform duration-500 group-hover:scale-105"
                />
                <div className="relative z-10 px-3 pt-4 text-center">
                  <p className="font-outfit text-[11px] font-medium text-[#5E7A62]">Breakfast Corner</p>
                  <h3 className="font-outfit mt-0.5 text-lg font-extrabold leading-tight tracking-tight text-[#476A50] sm:text-xl">
                    Toasters &amp; Coffee Makers
                  </h3>
                  <p className="font-outfit mt-1 text-[11px] font-medium text-[#5E7A62]/90">
                    Start your day right.
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* =========================================================================
            3F. Product Cards Carousel 3: Home & Kitchen (without tabs)
            ========================================================================= */}
        <ProductCarouselWithoutTabs
          title="Home & Kitchen"
          categorySlug="appliances"
          products={HOME_KITCHEN_CAROUSEL}
          onAddToCart={handleAddToCart}
          onToggleWishlist={handleToggleWishlist}
          isInWishlist={isInWishlist}
        />

        {/* =========================================================================
            4. Featured Stores
            ========================================================================= */}
        <section className="mb-14">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
              Featured Stores
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            {BRAND_STORES.map((brand) => (
              <Link
                key={brand.name}
                to="/products"
                className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-2xs hover:border-[#FF7A1A]/40 hover:shadow-md transition-all hover:-translate-y-0.5"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-xl font-bold group-hover:bg-orange-50 transition-colors">
                  {brand.logo}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#FF7A1A] transition-colors truncate">
                    {brand.name}
                  </h4>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold mt-0.5">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    <span className="truncate">Delivery within 24 hours</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Floating Toast Notification Pill */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-slate-900/95 backdrop-blur-md px-5 py-3 text-xs font-semibold text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
