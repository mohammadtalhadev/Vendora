import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ArrowRight } from 'lucide-react';

export interface MegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CategoryGroup {
  title: string;
  items: { label: string; query: string }[];
}

interface CategoryMeta {
  id: string;
  slug: string;
  name: string;
  hasChevron: boolean;
  iconPath: React.ReactNode;
  groups: CategoryGroup[];
}

interface FeaturedProduct {
  id: string;
  title: string;
  image: string;
  price: string;
  originalPrice?: string;
  isPriceRange?: boolean;
  link: string;
}

// 5 Featured Products matching the reference screenshot exactly
const FEATURED_PRODUCTS: FeaturedProduct[] = [
  {
    id: 'airpods-max-pink',
    title: 'Apple AirPods Max – Pink',
    image: '/images/products/airpods_max_pink.png',
    price: '$449.00',
    originalPrice: '$489.00',
    link: '/products/winter-airpods',
  },
  {
    id: 'iphone-15-pro-max',
    title: 'Apple iPhone 15 Pro Max 256GB Natural Titanium',
    image: '/images/products/iphone_15_pro_natural.png',
    price: '$190.99 – $71.50',
    isPriceRange: true,
    link: '/products/deal-s24ultra',
  },
  {
    id: 'apple-watch-s9',
    title: 'Apple Watch Series 9 GPS 45mm Midnight Aluminum Case with Midnight Sport Band',
    image: '/images/products/prod_smart_watch.jpg',
    price: '$71.15',
    originalPrice: '$87.98',
    link: '/products/winter-watch',
  },
  {
    id: 'aqueon-goldfish',
    title: 'Aqueon Goldfish Flakes 7.12 Ounces',
    image: '/images/bevesi/1-60.jpg',
    price: '$1.41',
    originalPrice: '$2.50',
    link: '/products?category=pets&q=Aqueon',
  },
  {
    id: 'adidas-gazelle',
    title: 'ADIDAS GAZELLE BOLD W',
    image: '/images/emox/cat_sneakers.png',
    price: '$110.00',
    originalPrice: '$130.00',
    link: '/products/deal-invincible',
  },
];

// The 11 Marketplace Categories with precise vector icons matching the reference screenshot
const CATEGORIES: CategoryMeta[] = [
  {
    id: 'electronics',
    slug: 'electronics',
    name: 'Electronics',
    hasChevron: true,
    iconPath: (
      <path d="M6.00225 8.00007C6.00223 3.00208 7 3.00208 11 3.00208H13.0001C17 3.00201 18 3.00208 18 8.00005L18.0002 9.22872C18.0007 11.3213 18.0016 14.9356 17.9978 16C17.9799 20.998 17 21 13 21H11C6.99998 21 6.00222 20.998 6.00223 16C6.00223 15.6488 6.0019 15.0198 6.0015 14.2596C6.00039 12.1341 5.99873 8.98209 6.00225 8.00007ZM10 6C10 6.55229 10.4477 7 11 7H13C13.5523 7 14 6.55229 14 6C14 5.44772 13.5523 5 13 5H11C10.4477 5 10 5.44772 10 6ZM12 19C12.5523 19 13 18.5523 13 18C13 17.4477 12.5523 17 12 17C11.4477 17 11 17.4477 11 18C11 18.5523 11.4477 19 12 19Z" />
    ),
    groups: [
      {
        title: 'Cell Phones & Tablets',
        items: [
          { label: 'Apple iPhone & MagSafe', query: 'iphone' },
          { label: 'Samsung Galaxy Series', query: 'samsung' },
          { label: 'iPad & Android Tablets', query: 'tablet' },
          { label: 'Protective Cases & Covers', query: 'phone case' },
          { label: 'Screen Protectors & Glass', query: 'screen protector' },
          { label: 'Fast Wireless Chargers', query: 'wireless charger' },
        ],
      },
      {
        title: 'Computers & Laptops',
        items: [
          { label: 'Apple MacBook Pro & Air', query: 'macbook' },
          { label: 'Gaming & Windows Laptops', query: 'laptop' },
          { label: 'Curved UltraWide Monitors', query: 'monitor' },
          { label: 'Mechanical Keyboards & RGB', query: 'keyboard' },
          { label: 'Precision Wireless Mice', query: 'mouse' },
          { label: 'High-Speed NVMe SSDs', query: 'ssd' },
        ],
      },
      {
        title: 'Audio, TV & Cameras',
        items: [
          { label: 'Wireless ANC Headphones', query: 'headphones' },
          { label: 'Spatial Audio Earbuds', query: 'earbuds' },
          { label: 'Bluetooth Party Speakers', query: 'speaker' },
          { label: 'Dolby Atmos Soundbars', query: 'soundbar' },
          { label: 'Mirrorless 4K Cameras', query: 'camera' },
          { label: 'Drones & Action Cams', query: 'drone' },
        ],
      },
    ],
  },
  {
    id: 'grocery',
    slug: 'grocery-fruits',
    name: 'Grocery & Fruits',
    hasChevron: true,
    iconPath: (
      <>
        <path d="M4 13.5C4 10 6 8 8.5 8C10 8 10.5 9 12 9C13.5 9 14 8 15.5 8C18 8 20 10 20 13.5C20 17 17 20 12 20C7 20 4 17 4 13.5Z" />
        <path d="M11.005 6.7883C9.63595 6.39842 8.64807 5.52771 8.20985 3.99022C7.67643 2.11871 8.12143 1.68353 9.98922 2.20343C11.6516 2.66617 12.4501 3.73472 12.7989 5.00666C13.3145 6.88715 12.8808 7.32251 11.005 6.7883Z" />
      </>
    ),
    groups: [
      {
        title: 'Fresh Fruits & Vegetables',
        items: [
          { label: 'Organic Crisp Apples', query: 'apples' },
          { label: 'Bananas & Sweet Citrus', query: 'citrus' },
          { label: 'Fresh Strawberries & Berries', query: 'berries' },
          { label: 'Avocados & Organic Greens', query: 'greens' },
          { label: 'Fresh Farm Salads', query: 'salad' },
          { label: 'Exotic Tropical Fruits', query: 'fruits' },
        ],
      },
      {
        title: 'Dairy, Eggs & Cold Drinks',
        items: [
          { label: 'Organic Whole & Oat Milk', query: 'milk' },
          { label: 'Cage-Free Fresh Eggs', query: 'eggs' },
          { label: 'Artisan Cheeses & Butter', query: 'cheese' },
          { label: 'Cold-Pressed Fruit Juices', query: 'juice' },
          { label: 'Sparkling & Mineral Water', query: 'sparkling water' },
          { label: 'Specialty Cold Brew Coffee', query: 'coffee' },
        ],
      },
      {
        title: 'Pantry Essentials & Bakery',
        items: [
          { label: 'Sourdough & Artisanal Breads', query: 'bread' },
          { label: 'Italian Pasta & Truffle Sauces', query: 'pasta' },
          { label: 'Extra Virgin Cold Olive Oil', query: 'olive oil' },
          { label: 'Granola & High-Protein Cereals', query: 'cereal' },
          { label: 'Raw Organic Honey & Spreads', query: 'honey' },
          { label: 'Nuts, Seeds & Dried Fruits', query: 'nuts' },
        ],
      },
    ],
  },
  {
    id: 'furniture',
    slug: 'home-kitchen',
    name: 'Home & Furniture',
    hasChevron: true,
    iconPath: (
      <>
        <path d="M12 3C18.125 3 19 4 19 8.5C19 9.5 18.931 9.76658 17.5 10.1154C16.9145 10.2582 16.3867 10.5357 15.9612 10.9612C15.6607 11.2617 15.434 11.6132 15.2765 12C15.2428 12.0827 15.2132 12.1585 15.1861 12.2279C14.9897 12.7312 14.9239 12.8997 14.3726 12.9402C13.564 12.9995 12.601 13 12 13C11.399 13 10.436 12.9995 9.62736 12.9402C9.07606 12.8997 9.01032 12.7313 8.8139 12.228C8.7868 12.1585 8.75721 12.0827 8.72352 12C8.56599 11.6132 8.3393 11.2617 8.03879 10.9612C7.61326 10.5357 7.08554 10.2582 6.5 10.1154C5.06895 9.76658 5 9.5 5 8.5C5 4 5.875 3 12 3Z" />
        <path d="M18.5 11C16.9488 11 16 11.9488 16 13.5C16 14.5 8 14.5 8 13.5C8 11.9488 7.05117 11 5.5 11C3.94883 11 3 11.9488 3 13.5C3 14.6822 3.55113 15.5145 4.5 15.8436C4.5661 15.8665 4.62347 15.8851 4.67328 15.9013C4.82391 15.9501 4.90526 15.9764 4.94913 16.0323C5.00062 16.0978 5.00045 16.2039 5.00007 16.4347L5 16.5C5 17.4901 5.28593 18.1126 6.28243 18.4888L6.01943 19.8038C5.91112 20.3454 6.26233 20.8722 6.80389 20.9805C7.34545 21.0888 7.87228 20.7376 7.98059 20.1961L8.24526 18.8727C9.20603 18.964 10.4351 19 12 19C13.3096 19 14.384 18.9748 15.2628 18.9131L15.5194 20.1961C15.6277 20.7376 16.1545 21.0888 16.6961 20.9805C17.2377 20.8722 17.5889 20.3454 17.4806 19.8038L17.2468 18.635C18.6267 18.2826 19 17.6313 19 16.5L18.9999 16.4347C18.9996 16.2039 18.9994 16.0978 19.0509 16.0323C19.0947 15.9764 19.1761 15.9501 19.3267 15.9013C19.3765 15.8851 19.4339 15.8665 19.5 15.8436C20.4489 15.5145 21 14.6822 21 13.5C21 11.9488 20.0512 11 18.5 11Z" />
      </>
    ),
    groups: [
      {
        title: 'Living Room Furniture',
        items: [
          { label: 'Modular Sofas & Sectionals', query: 'sofa' },
          { label: 'Solid Oak Coffee Tables', query: 'coffee table' },
          { label: 'Velvet Accent Armchairs', query: 'armchair' },
          { label: 'Media TV Consoles & Units', query: 'tv stand' },
          { label: 'Geometric Bookshelves', query: 'bookshelf' },
          { label: 'Woven Floor Poufs & Ottomans', query: 'ottoman' },
        ],
      },
      {
        title: 'Bedroom & Bath Comfort',
        items: [
          { label: 'Upholstered Platform Beds', query: 'bed' },
          { label: 'Hybrid Memory Mattresses', query: 'mattress' },
          { label: 'Egyptian Cotton Sheets', query: 'bedding' },
          { label: 'Minimalist Bedside Nightstands', query: 'nightstand' },
          { label: 'Plush Turkish Bath Towels', query: 'towel' },
          { label: 'Vanity Mirrors & Storage', query: 'mirror' },
        ],
      },
      {
        title: 'Kitchen & Modern Dining',
        items: [
          { label: 'Hardwood Dining Table Sets', query: 'dining table' },
          { label: 'Mid-Century Bar Stools', query: 'bar stool' },
          { label: 'Non-Stick Ceramic Cookware', query: 'cookware' },
          { label: 'Stoneware Dinner Sets', query: 'dinnerware' },
          { label: 'Gooseneck Electric Kettles', query: 'kettle' },
          { label: 'Espresso Machines & Grinders', query: 'espresso' },
        ],
      },
    ],
  },
  {
    id: 'fashion',
    slug: 'fashion',
    name: 'Fashion & Accessories',
    hasChevron: false,
    iconPath: (
      <path d="M6 15C6 19 6.3569 20 12 20C17.6431 20 18 19 18 15C18 11.9153 17.8642 11.1143 18.2018 10.7372C18.4114 10.5031 18.8036 10.4324 19.5241 10.08C21.4052 9.16 21.4052 9 19.9944 6.5C19.5241 5.66667 18.5836 4 16.7026 4C14.8215 4 14.5864 4.5 14.3513 5C14.1162 5.5 13.881 6 12 6C10.1295 6 9.88653 5.5056 9.64216 5.00843C9.39503 4.50563 9.14651 4 7.21192 4C5.41639 4 4.47587 5.66666 4.00561 6.5C2.59485 9 2.59484 9.16 4.47587 10.08C5.193 10.4307 5.58486 10.5141 5.79522 10.7555C6.13664 11.1473 6 11.9557 6 15ZM13 9H14C14.5523 9 15 9.44772 15 10C15 10.5523 14.5523 11 14 11H13C12.4477 11 12 10.5523 12 10C12 9.44772 12.4477 9 13 9Z" />
    ),
    groups: [
      {
        title: "Men's Apparel",
        items: [
          { label: 'Tailored Oxford Shirts', query: 'shirt' },
          { label: 'Heavyweight Cotton Tees', query: 't-shirt' },
          { label: 'Slim & Relaxed Denim', query: 'jeans' },
          { label: 'Wool Blazers & Overcoats', query: 'jacket' },
          { label: 'Athletic Joggers & Shorts', query: 'shorts' },
          { label: 'Sneakers & Leather Boots', query: 'shoes' },
        ],
      },
      {
        title: "Women's Collection",
        items: [
          { label: 'Flowing Silk Maxi Dresses', query: 'dress' },
          { label: 'Linen Tops & Blouses', query: 'blouse' },
          { label: 'Tailored Wide-Leg Trousers', query: 'pants' },
          { label: 'Pure Cashmere Sweaters', query: 'sweater' },
          { label: 'Classic Trench Coats', query: 'trench coat' },
          { label: 'Designer Leather Handbags', query: 'handbag' },
        ],
      },
      {
        title: 'Jewelry & Accessories',
        items: [
          { label: 'Automatic Luxury Watches', query: 'watch' },
          { label: 'Polarized UV Sunglasses', query: 'sunglasses' },
          { label: 'Full-Grain Leather Belts', query: 'belt' },
          { label: 'Minimalist Gold Necklaces', query: 'necklace' },
          { label: 'Diamond & Silver Earrings', query: 'earrings' },
          { label: 'Travel Duffle Bags & Wallets', query: 'wallet' },
        ],
      },
    ],
  },
  {
    id: 'beauty',
    slug: 'beauty-personal-care',
    name: 'Beauty & Personal Care',
    hasChevron: true,
    iconPath: (
      <>
        <path d="M16 5.23677C16 4.00203 15.0232 3 13.8182 3C13.0814 3 12.4068 3.37607 12 3.9573C11.5932 3.37607 10.9186 3 10.1818 3C8.97677 3 8 4.00203 8 5.23677C8 7.16004 10.1014 9 12 9C13.8983 9 16 7.15989 16 5.23677Z" />
        <path d="M7 9C5 9 3 11.0638 3 14C3 18.941 6.2355 21 12 21C17.7645 21 21 18.941 21 14C21 11.0638 19 9 17 9C15 9 13.8458 10 12 10C10.1542 10 9 9 7 9ZM12 17C10.3431 17 9 16.3284 9 15.5C9 14.6716 10.3431 14 12 14C13.6569 14 15 14.6716 15 15.5C15 16.3284 13.6569 17 12 17Z" />
      </>
    ),
    groups: [
      {
        title: 'Skincare Solutions',
        items: [
          { label: 'Gentle Foaming Cleansers', query: 'cleanser' },
          { label: 'Niacinamide & Vitamin C Serums', query: 'serum' },
          { label: 'Barrier Repair Moisturizers', query: 'moisturizer' },
          { label: 'Invisible Sunscreen SPF 50+', query: 'sunscreen' },
          { label: 'Anti-Aging Peptide Creams', query: 'cream' },
          { label: 'Hydrating Overnight Masks', query: 'face mask' },
        ],
      },
      {
        title: 'Fragrances & Aromas',
        items: [
          { label: 'Luxury Eau de Parfum', query: 'perfume' },
          { label: 'Woody & Fresh Colognes', query: 'cologne' },
          { label: 'Hydrating Body Mists', query: 'body mist' },
          { label: 'Organic Pure Essential Oils', query: 'essential oil' },
          { label: 'Aromatherapy Diffusers', query: 'diffuser' },
          { label: 'Scented Soy Wax Candles', query: 'candle' },
        ],
      },
      {
        title: 'Hair, Makeup & Bath',
        items: [
          { label: 'Botanical Repair Shampoos', query: 'shampoo' },
          { label: 'Ionic High-Speed Hair Dryers', query: 'hair dryer' },
          { label: 'Velvet Matte Lipsticks', query: 'lipstick' },
          { label: 'Weightless Liquid Foundations', query: 'foundation' },
          { label: 'Exfoliating Sea Salt Body Scrubs', query: 'body scrub' },
          { label: 'Relaxing Mineral Bath Soaks', query: 'bath' },
        ],
      },
    ],
  },
  {
    id: 'pets',
    slug: 'pets',
    name: 'Pets',
    hasChevron: true,
    iconPath: (
      <path d="M3.95509 17.294C2.72077 15.9137 2.49295 13.054 4.7642 11.9362C6.15562 11.2515 8.46765 11.0095 10.433 11.7384C11.0827 11.9794 11.5617 12.4411 12.0039 12.0582C12.3732 11.7384 11.9446 11.2106 11.3783 10.8628C10.0757 10.0628 8 9.5 5 10.5C3.70118 10.9329 3.58398 10.0251 3.47192 9.00789C3.35985 7.99073 3.12129 5.8942 3.00728 4.85941C2.94348 4.28028 3.29765 3.95756 4.12237 4.27799C4.44252 4.40238 5.14804 5.18444 5.50521 5.32321C6.7755 5.81677 6.90861 5.16007 8.27778 5C9.41489 4.86706 10.1258 5.52248 11.0166 4.82828C11.3854 4.54083 11.6444 3.50927 12.004 3.22903C12.3991 2.92106 12.9522 2.81763 13.2018 3.60827C13.3727 4.14954 13.7905 5.50435 13.9719 6.07896C14.2606 6.99364 14.4853 7.22268 15.5628 7.40825C16.8263 7.62584 18.7925 8.12917 20.0839 9.25389C22.1176 11.0253 22.7566 14.5128 20.8954 17.0203C19.4485 18.9534 15.9777 19.9572 12.494 19.9987C9.06283 20.0395 5.6201 19.1467 3.95509 17.294Z" />
    ),
    groups: [
      {
        title: 'Dog Food & Gear',
        items: [
          { label: 'Grain-Free High-Protein Kibble', query: 'dog food' },
          { label: 'Durable Natural Rubber Chews', query: 'chew toy' },
          { label: 'Memory Foam Orthopedic Beds', query: 'dog bed' },
          { label: 'Reflective No-Pull Harnesses', query: 'dog harness' },
          { label: 'Dental Defense Chew Sticks', query: 'dental treats' },
          { label: 'Stainless Grooming Clippers', query: 'grooming' },
        ],
      },
      {
        title: 'Cat Care & Play',
        items: [
          { label: 'Gourmet Salmon Wet Pouch Food', query: 'cat food' },
          { label: 'Multi-Tiered Sisal Cat Trees', query: 'cat tree' },
          { label: 'Odor-Lock Clumping Litter', query: 'cat litter' },
          { label: 'Feather & Motion Interactive Toys', query: 'cat toy' },
          { label: 'Ceramic Whisker-Friendly Bowls', query: 'cat bowl' },
          { label: 'Self-Cleaning Litter Boxes', query: 'litter box' },
        ],
      },
      {
        title: 'Fish, Aquatics & Birds',
        items: [
          { label: 'Aqueon Goldfish Flakes 7.12 Oz', query: 'Aqueon' },
          { label: 'Rimless Glass Fish Aquariums', query: 'aquarium' },
          { label: 'Submersible Water Filters', query: 'aquarium filter' },
          { label: 'Full Spectrum LED Aquarium Lights', query: 'aquarium light' },
          { label: 'Organic Timothy Hay & Chews', query: 'timothy hay' },
          { label: 'Spacious Hamster & Bird Cages', query: 'pet cage' },
        ],
      },
    ],
  },
  {
    id: 'baby-kids',
    slug: 'kids-baby',
    name: 'Baby & Kids',
    hasChevron: false,
    iconPath: (
      <path d="M11.5 3C14.6765 2.99998 16.7647 4 16.7647 4.5C16.7647 5.08035 16.1307 5.43616 15.292 5.65431C15.5734 6.36158 15.7059 7.1635 15.7059 8C15.7059 8.60781 15.4851 8.87958 14.6471 9C12.2074 9.35056 8.29412 10.7594 8.29412 13.5C8.29412 14.5682 8.76048 15.4594 9.5438 16.0747C10.3183 16.6832 11.372 17 12.5294 17C13.7685 17 14.8221 16.4168 15.5508 15.7285C15.9176 15.3822 16.2149 14.9978 16.423 14.6226C16.6265 14.2557 16.7647 13.8611 16.7647 13.5C16.7647 13.2239 16.5277 13 16.2353 13C15.9429 13 15.7059 13.2239 15.7059 13.5C15.7059 13.6389 15.6455 13.8693 15.4851 14.1586C15.3292 14.4397 15.0971 14.7428 14.8021 15.0214C14.2073 15.5832 13.4079 16 12.5294 16C11.5692 16 10.7699 15.7373 10.2209 15.3059C9.6807 14.8816 9.35294 14.2727 9.35294 13.5C9.35294 12.3347 10.3761 11.4525 12.0577 10.8417C12.7447 10.5921 13.794 10.3862 14.6681 10.2146C15.0678 10.1362 15.4308 10.0649 15.7059 10C16.7914 9.7437 17.4752 9.50606 17.991 9.3268C18.5654 9.12721 18.9314 9 19.4118 9C20.9782 9 21 11 21 13C21 15 20.8695 20 12.5294 20C7.23529 20 3 18.577 3 15.0214C3 12.5248 4.63243 11.7709 5.87035 11.1991C6.6264 10.85 7 10.5687 7 10C7 9.22882 6.48633 9.11194 6.12224 9.0291C6.07901 9.01926 6.0379 9.00991 6 9C4.91095 8.71513 4 8.02943 4 7C4 6.54998 4.36352 6.07778 5 6C5.90713 5.88914 6.77032 5.63368 7.48267 4.91916C8.61374 3.78464 9.8125 3.00001 11.5 3ZM10 6C10 5.44771 9.58477 5 9 5C8.41523 5 8 5.44771 8 6C8 6.55228 8.41523 7 9 7C9.58477 7 10 6.55228 10 6Z" />
    ),
    groups: [
      {
        title: 'Baby Travel & Strollers',
        items: [
          { label: 'All-Terrain Foldable Strollers', query: 'stroller' },
          { label: 'Convertible Safety Car Seats', query: 'car seat' },
          { label: 'Ergonomic Baby Carriers', query: 'baby carrier' },
          { label: 'Portable Travel Playards', query: 'playard' },
          { label: 'Insulated Diaper Backpacks', query: 'diaper bag' },
        ],
      },
      {
        title: 'Nursery & Baby Apparel',
        items: [
          { label: 'Organic Cotton Onesies', query: 'onesie' },
          { label: 'Solid Wood Convertible Cribs', query: 'crib' },
          { label: 'Breathable Muslin Swaddles', query: 'swaddle' },
          { label: 'Smart Baby Video Monitors', query: 'baby monitor' },
          { label: 'Gentle Tear-Free Baby Wash', query: 'baby wash' },
        ],
      },
    ],
  },
  {
    id: 'toys',
    slug: 'toys',
    name: 'Toys & Video Games',
    hasChevron: false,
    iconPath: (
      <path d="M13.4889 16.0086C13.1123 16.0432 12.6891 16.0821 11.9999 16.0821C11.3108 16.0821 10.8876 16.0432 10.511 16.0086C10.2092 15.9809 9.93735 15.9559 9.58261 15.9559C8.27054 15.9559 7.91711 17.039 7.57381 18.0911C7.56858 18.1072 7.56335 18.1232 7.55812 18.1392C7.53969 18.1956 7.52178 18.2508 7.50428 18.3047C7.14075 19.4243 6.95401 19.9994 5.99994 19.9994C5.97296 19.9994 5.94433 19.9995 5.91419 19.9997C5.05351 20.0038 2.96278 20.014 3.00101 16.9655C3.00101 6 4.93748 4.12621 11.9999 4C19.0624 4.12621 20.9989 6 20.9989 16.9655C21.0371 20.014 18.9464 20.0038 18.0857 19.9997C18.0555 19.9995 18.0269 19.9994 17.9999 19.9994C17.0459 19.9994 16.8591 19.4243 16.4956 18.3046C16.4781 18.2508 16.4602 18.1956 16.4418 18.1392C16.4365 18.1232 16.4313 18.1071 16.4261 18.0911C16.0828 17.039 15.7293 15.9559 14.4173 15.9559C14.0625 15.9559 13.7907 15.9809 13.4889 16.0086ZM8.99994 9C8.99994 8.44772 8.55222 8 7.99994 8C7.44765 8 6.99994 8.44772 6.99994 9V10H5.99994C5.44765 10 4.99994 10.4477 4.99994 11C4.99994 11.5523 5.44765 12 5.99994 12H6.99994V13C6.99994 13.5523 7.44765 14 7.99994 14C8.55222 14 8.99994 13.5523 8.99994 13V12H9.99994C10.5522 12 10.9999 11.5523 10.9999 11C10.9999 10.4477 10.5522 10 9.99994 10H8.99994V9ZM16.9999 9C16.9999 8.44772 16.5522 8 15.9999 8C15.4477 8 14.9999 8.44772 14.9999 9C14.9999 9.55228 15.4477 10 15.9999 10C16.5522 10 16.9999 9.55228 16.9999 9ZM15.9999 14C16.5522 14 16.9999 13.5523 16.9999 13C16.9999 12.4477 16.5522 12 15.9999 12C15.4477 12 14.9999 12.4477 14.9999 13C14.9999 13.5523 15.4477 14 15.9999 14ZM13.9999 12C14.5522 12 14.9999 11.5523 14.9999 11C14.9999 10.4477 14.5522 10 13.9999 10C13.4477 10 12.9999 10.4477 12.9999 11C12.9999 11.5523 13.4477 12 13.9999 12ZM17.9999 12C18.5522 12 18.9999 11.5523 18.9999 11C18.9999 10.4477 18.5522 10 17.9999 10C17.4477 10 16.9999 10.4477 16.9999 11C16.9999 11.5523 17.4477 12 17.9999 12Z" />
    ),
    groups: [
      {
        title: 'Building Sets & Figures',
        items: [
          { label: 'LEGO Creator & Technic', query: 'lego' },
          { label: 'STEM Magnetic Tiles & Blocks', query: 'building blocks' },
          { label: 'Action Figures & Hero Toys', query: 'action figure' },
          { label: 'Collectible Anime & Plushies', query: 'plush' },
          { label: 'Remote Control High-Speed Cars', query: 'rc car' },
        ],
      },
      {
        title: 'Gaming & Consoles',
        items: [
          { label: 'PlayStation 5 Games & Gear', query: 'playstation' },
          { label: 'Nintendo Switch OLED & Games', query: 'switch' },
          { label: 'Wireless Pro Controllers', query: 'controller' },
          { label: 'Board Games & Card Strategy', query: 'board game' },
          { label: '1000-Piece Art Puzzles', query: 'puzzle' },
        ],
      },
    ],
  },
  {
    id: 'health',
    slug: 'health',
    name: 'Health & Wellness',
    hasChevron: false,
    iconPath: (
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1 6a1 1 0 10-2 0v3H8a1 1 0 100 2h3v3a1 1 0 102 0v-3h3a1 1 0 100-2h-3V8z"
      />
    ),
    groups: [
      {
        title: 'Vitamins & Supplements',
        items: [
          { label: 'Daily Complete Multivitamins', query: 'multivitamin' },
          { label: 'Pure Grass-Fed Whey Protein', query: 'protein' },
          { label: 'Omega-3 Wild Fish Oil', query: 'fish oil' },
          { label: 'Collagen Peptides & Biotin', query: 'collagen' },
          { label: 'Immune Defense Vitamin C+Zinc', query: 'vitamin c' },
        ],
      },
      {
        title: 'Home Medical & Recovery',
        items: [
          { label: 'Deep Tissue Massage Guns', query: 'massage gun' },
          { label: 'Digital Blood Pressure Monitors', query: 'blood pressure' },
          { label: 'Infrared Forehead Thermometers', query: 'thermometer' },
          { label: 'Pulse Oximeter & Wellness Sensors', query: 'oximeter' },
          { label: 'Heating Pads & Cold Therapy', query: 'heating pad' },
        ],
      },
    ],
  },
  {
    id: 'household',
    slug: 'household',
    name: 'Household & Essentials',
    hasChevron: false,
    iconPath: (
      <>
        <path d="M20 6C20 8 18.6667 8 12 8C5.33333 8 4 8 4 6C4 4 5.33333 4 12 4C18.6667 4 20 4 20 6ZM16 7C16.5523 7 17 6.55228 17 6C17 5.44772 16.5523 5 16 5C15.4477 5 15 5.44772 15 6C15 6.55228 15.4477 7 16 7ZM14 6C14 5.44772 13.5523 5 13 5C12.4477 5 12 5.44772 12 6C12 6.55228 12.4477 7 13 7C13.5523 7 14 6.55228 14 6Z" />
        <path d="M7.9081 8.96837C8.98532 9.00005 10.3306 9.00005 11.9845 9.00005H12.0155C13.6694 9.00005 15.0147 9.00005 16.0919 8.96837C17.1621 8.93689 18.0313 8.8732 18.7095 8.72785C19.9986 8.45163 20 9.00004 20 9.50004V12.5001C20 19.0001 20 20.0001 12 20.0001C4 20.0001 4 19.0001 4 12.5001L4 9.50004C4 9.00002 4.00141 8.45163 5.29047 8.72785C5.96874 8.8732 6.83785 8.93689 7.9081 8.96837ZM15 14C15 12.3431 13.6569 11 12 11C10.3431 11 9 12.3431 9 14C9 15.6569 10.3431 17 12 17C13.6569 17 15 15.6569 15 14Z" />
      </>
    ),
    groups: [
      {
        title: 'Laundry & Surface Cleaning',
        items: [
          { label: 'Plant-Based Laundry Pods', query: 'detergent' },
          { label: 'Fabric Softeners & Fragrance', query: 'softener' },
          { label: 'Multi-Surface Botanical Sprays', query: 'cleaner' },
          { label: 'Ultra-Dense Microfiber Cloths', query: 'microfiber' },
          { label: 'Cordless Wet & Dry Vacuums', query: 'vacuum' },
        ],
      },
      {
        title: 'Paper, Wrap & Storage',
        items: [
          { label: 'Bamboo Paper Towels 12-Pack', query: 'paper towel' },
          { label: 'Silicone Reusable Storage Bags', query: 'storage bag' },
          { label: 'Clear Stackable Fridge Bins', query: 'storage bin' },
          { label: 'Heavy Duty Trash Bags', query: 'trash bag' },
          { label: 'Space-Saving Velvet Hangers', query: 'hangers' },
        ],
      },
    ],
  },
  {
    id: 'patio-garden',
    slug: 'patio-garden',
    name: 'Patio & Garden',
    hasChevron: false,
    iconPath: (
      <>
        <path d="M5.03846 4.96042C5.23741 6.65335 5.78251 8.91407 7.26411 9.65342C8.32672 10.1837 9.99423 9.99285 10.9536 9.81615C10.9864 10.4747 10.996 11.1993 10.9988 12H7.50008C4.50012 12 4.72233 13 5.50004 16.4998C6.27778 19.9998 7 21 12 21C17 21 17.7223 20 18.5001 16.5C19.2778 13 19.5001 12 16.5001 12H12.9989C12.9952 10.9009 12.9783 9.88571 12.9028 8.97946C12.8051 7.80765 12.6037 6.72126 12.1444 5.8028C11.635 4.78388 10.6796 3.95579 9.59105 3.60366C8.737 3.28048 7.77473 3.1137 6.94702 3.02889C5.2658 2.85669 4.86079 3.44852 5.03846 4.96042Z" />
        <path d="M15.0789 9.05816C14.968 8.2964 14.9235 7.28533 15.2938 6.62522C15.7197 5.86607 16.7877 5.40481 17.6164 5.15019C18.5 4.87863 18.7694 4.88747 18.9211 5.9301C19.0319 6.69186 19.0765 7.70294 18.7062 8.36304C18.263 9.15288 17.125 9.62025 16.2844 9.86794C15.4438 10.1156 15.2306 10.1008 15.0789 9.05816Z" />
      </>
    ),
    groups: [
      {
        title: 'Outdoor Living & Patio',
        items: [
          { label: 'All-Weather Wicker Dining Sets', query: 'patio set' },
          { label: 'Hanging Rattan Egg Chairs', query: 'egg chair' },
          { label: 'Propane Outdoor Fire Pits', query: 'fire pit' },
          { label: 'Cantilever Sun Umbrellas', query: 'umbrella' },
          { label: 'Solar Powered Garden Lights', query: 'solar light' },
        ],
      },
      {
        title: 'Garden Care & Planters',
        items: [
          { label: 'Terracotta & Ceramic Planters', query: 'planter' },
          { label: 'Raised Cedar Garden Beds', query: 'garden bed' },
          { label: 'Flexible Expandable Hoses', query: 'garden hose' },
          { label: 'Organic Plant Nutrition & Soil', query: 'plant food' },
          { label: 'Stainless Steel Pruning Shears', query: 'pruner' },
        ],
      },
    ],
  },
];

export const MegaMenu: React.FC<MegaMenuProps> = ({ isOpen, onClose }) => {
  const [activeCategoryId, setActiveCategoryId] = useState<string>('electronics');

  if (!isOpen) return null;

  const activeCategory =
    CATEGORIES.find((c) => c.id === activeCategoryId) || CATEGORIES[0];

  return (
    <div
      role="menu"
      aria-label="All Categories Mega Menu"
      className="absolute left-0 top-full mt-2.5 z-50 rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-1 text-slate-800 overflow-hidden w-[960px] lg:w-[1060px] xl:w-[1160px] max-w-[calc(100vw-24px)] flex flex-row"
    >
      {/* =========================================================================
          Column 1: Left Categories List (11 items with exact icons and chevrons)
          ========================================================================= */}
      <div className="w-[260px] xl:w-[280px] shrink-0 border-r border-slate-100 py-2.5 bg-white select-none">
        <div className="space-y-0.5">
          {CATEGORIES.map((cat) => {
            const isActive = cat.id === activeCategoryId;
            return (
              <div
                key={cat.id}
                onMouseEnter={() => setActiveCategoryId(cat.id)}
                className="relative"
              >
                <Link
                  to={`/products?category=${cat.slug}`}
                  onClick={onClose}
                  className={`group flex items-center justify-between px-4 py-2.5 text-[13px] font-semibold transition-colors cursor-pointer rounded-xl mx-1.5 ${
                    isActive
                      ? 'bg-orange-50 text-[#FF7A1A] font-bold'
                      : 'text-slate-800 hover:bg-slate-50 hover:text-[#FF7A1A]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className={`shrink-0 transition-colors ${
                        isActive
                          ? 'fill-[#FF7A1A]'
                          : 'fill-slate-400 group-hover:fill-[#FF7A1A]'
                      }`}
                    >
                      {cat.iconPath}
                    </svg>
                    <span className="truncate">{cat.name}</span>
                  </div>

                  {cat.hasChevron && (
                    <ChevronRight
                      className={`h-4 w-4 shrink-0 transition-transform ${
                        isActive
                          ? 'text-[#FF7A1A] translate-x-0.5'
                          : 'text-slate-400 group-hover:text-[#FF7A1A]'
                      }`}
                    />
                  )}
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          Column 2: Middle Subcategory Columns & Departments for Active Category
          ========================================================================= */}
      <div className="flex-1 min-w-0 p-6 bg-white flex flex-col justify-between overflow-y-auto max-h-[520px]">
        <div>
          <div className="border-b border-slate-100 pb-3 mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                {activeCategory.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Browse popular departments, essentials, and trending collections
              </p>
            </div>
            <Link
              to={`/products?category=${activeCategory.slug}`}
              onClick={onClose}
              className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-[#FF7A1A] hover:underline"
            >
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div
            className={`grid gap-x-6 gap-y-6 ${
              activeCategory.groups.length >= 3
                ? 'grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-2'
            }`}
          >
            {activeCategory.groups.map((group, idx) => (
              <div key={idx} className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  {group.title}
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {group.items.map((item, itemIdx) => (
                    <li key={itemIdx}>
                      <Link
                        to={`/products?category=${activeCategory.slug}&q=${encodeURIComponent(
                          item.query
                        )}`}
                        onClick={onClose}
                        className="hover:text-[#FF7A1A] hover:translate-x-0.5 transition-all block py-0.5"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Quick-Action Bar */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/70 -mx-6 -mb-6 px-6 py-3">
          <span className="text-xs text-slate-600">
            Looking for something specific in{' '}
            <strong className="text-slate-900">{activeCategory.name}</strong>?
          </span>
          <Link
            to={`/products?category=${activeCategory.slug}`}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF7A1A] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#EA580C] transition-colors"
          >
            <span>Explore All</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* =========================================================================
          Column 3: Right Featured Products List (Exact items from Reference Image)
          ========================================================================= */}
      <div className="w-[280px] xl:w-[320px] shrink-0 border-l border-slate-100 p-4 bg-white flex flex-col justify-start">
        <div className="space-y-4">
          {FEATURED_PRODUCTS.map((prod) => (
            <Link
              key={prod.id}
              to={prod.link}
              onClick={onClose}
              className="group flex items-center gap-3 transition-colors"
            >
              {/* Product Thumbnail */}
              <div className="w-14 h-14 shrink-0 rounded-lg bg-white border border-slate-100 p-1 flex items-center justify-center overflow-hidden group-hover:border-slate-300 transition-colors">
                <img
                  src={prod.image}
                  alt={prod.title}
                  className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                  onError={(e) => {
                    // Fallback to placeholder if asset unavailable
                    (e.currentTarget as HTMLImageElement).src =
                      '/images/bevesi/1-13.jpg';
                  }}
                />
              </div>

              {/* Product Title and Price matching reference image */}
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-[#FF7A1A] transition-colors">
                  {prod.title}
                </h4>

                <div className="mt-1 flex items-baseline gap-1.5">
                  {prod.isPriceRange ? (
                    <span className="text-xs font-bold text-slate-900">
                      {prod.price}
                    </span>
                  ) : (
                    <>
                      <span className="text-xs font-bold text-emerald-600">
                        {prod.price}
                      </span>
                      {prod.originalPrice && (
                        <span className="text-[11px] text-slate-400 line-through">
                          {prod.originalPrice}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
