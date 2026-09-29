/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Category } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat_electronics',
    name: 'Electronics & Gadgets',
    slug: 'electronics',
    description: 'Phones, laptops, power banks, chargers, audio and accessories',
    iconName: 'Laptop',
    dynamicFields: [
      { key: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g. Apple, HP, Anker, Oraimo', required: true },
      { key: 'specs', label: 'Specifications', type: 'text', placeholder: 'e.g. 16GB RAM, 512GB SSD, Core i7', required: true },
      { key: 'warranty', label: 'Warranty / Testing Window', type: 'select', options: ['None', '24 Hours Testing', '3 Days', '1 Week', '1 Month+'], required: false },
    ],
  },
  {
    id: 'cat_books',
    name: 'Books & Course Materials',
    slug: 'books',
    description: 'Textbooks, past questions, course packs, lab manuals and notes',
    iconName: 'BookOpen',
    dynamicFields: [
      { key: 'courseCode', label: 'Course Code (if applicable)', type: 'text', placeholder: 'e.g. CSC 211, MAT 111, GEC 210', required: false },
      { key: 'edition', label: 'Edition / Year', type: 'text', placeholder: 'e.g. 8th Edition, 2024 Pack', required: false },
    ],
  },
  {
    id: 'cat_fashion',
    name: 'Fashion & Wears',
    slug: 'fashion',
    description: 'Corporate wear, casuals, sneakers, heels, bags, watches, jewelry',
    iconName: 'Shirt',
    dynamicFields: [
      { key: 'gender', label: 'Target Gender', type: 'select', options: ['Unisex', 'Male', 'Female'], required: true },
      { key: 'size', label: 'Size', type: 'text', placeholder: 'e.g. M, L, XL, EU 42, UK 8', required: true },
    ],
  },
  {
    id: 'cat_food',
    name: 'Food & Snacks',
    slug: 'food',
    description: 'Fresh pastries, small chops, bottled drinks, shawarma, meals',
    iconName: 'Utensils',
    dynamicFields: [
      { key: 'prepTime', label: 'Preparation / Delivery Window', type: 'select', options: ['Ready Now', '15-30 Mins', '1-2 Hours', 'Pre-order for Evening'], required: true },
      { key: 'dietary', label: 'Dietary Notes', type: 'text', placeholder: 'e.g. Halal, Spicy, Vegetarian', required: false },
    ],
  },
  {
    id: 'cat_hostel',
    name: 'Hostel Essentials',
    slug: 'hostel',
    description: 'Hangers, buckets, bedsheets, rechargeable lamps, irons, storage',
    iconName: 'Home',
    dynamicFields: [
      { key: 'itemType', label: 'Type of Essential', type: 'text', placeholder: 'e.g. Laundry, Storage, Lighting, Bedding', required: false },
    ],
  },
  {
    id: 'cat_beauty',
    name: 'Beauty & Hair',
    slug: 'beauty',
    description: 'Skincare, hair care, cosmetics, perfumes, braiding supplies',
    iconName: 'Sparkles',
    dynamicFields: [
      { key: 'brand', label: 'Brand / Origin', type: 'text', placeholder: 'e.g. CeraVe, Shea Butter, Fenty, Local Handcrafted', required: false },
    ],
  },
  {
    id: 'cat_services',
    name: 'Services & Skills',
    slug: 'services',
    description: 'Hair braiding, laundry, graphic design, tutoring, printing, repairs',
    iconName: 'Wrench',
    dynamicFields: [
      { key: 'serviceArea', label: 'Service Location / Hall Reach', type: 'text', placeholder: 'e.g. Peter Hall room 312, All Male Halls, Campus-wide', required: true },
      { key: 'availability', label: 'Available Hours', type: 'text', placeholder: 'e.g. Weekday evenings, Saturdays after chapel', required: true },
    ],
  },
  {
    id: 'cat_other',
    name: 'Other Items',
    slug: 'other',
    description: 'Stationery, musical gear, sports equipment, art supplies',
    iconName: 'Package',
    dynamicFields: [
      { key: 'details', label: 'Item Specifics', type: 'text', placeholder: 'Any extra technical notes', required: false },
    ],
  },
];

/**
 * Predicts the most likely category based on words in the title.
 */
export function predictCategoryFromTitle(title: string): string | null {
  const lower = title.toLowerCase();

  if (/laptop|phone|charger|adapter|cable|iphone|samsung|hp|dell|macbook|airpod|earbud|power\s*bank|screen|mouse|keyboard|monitor|ipad|tablet/i.test(lower)) {
    return 'cat_electronics';
  }
  if (/book|textbook|course|past\s*question|pq|exam|pack|lecture|notes|hardcopy|manual/i.test(lower)) {
    return 'cat_books';
  }
  if (/shoe|sneaker|shirt|pants|trousers|jeans|hoodie|thrift|okrika|dress|gown|skirt|heels|blazer|suit|tie|polo/i.test(lower)) {
    return 'cat_fashion';
  }
  if (/food|snack|pie|shawarma|cake|chin\s*chin|plantain|indomie|noodles|juice|smoothie|bread|biscuit|pastry|pepper/i.test(lower)) {
    return 'cat_food';
  }
  if (/hanger|iron|bucket|bedsheet|pillow|duvet|lamp|fan|rechargeable|extension|net|curtain|mop/i.test(lower)) {
    return 'cat_hostel';
  }
  if (/hair|wig|braid|cream|lotion|serum|soap|perfume|cologne|cuff|oil|makeup|lip/i.test(lower)) {
    return 'cat_beauty';
  }
  if (/braiding|barbing|laundry|wash|ironing|tutor|lesson|design|printing|print|repair|fix|install|tailor/i.test(lower)) {
    return 'cat_services';
  }

  return null;
}

/**
 * Campus prohibited content rules.
 */
export const BANNED_PATTERNS = [
  { regex: /\b(weed|marijuana|loud|skunk|edible|codeine|tramadol|refnol|drugs?)\b/i, reason: 'Illicit substances and drugs are strictly prohibited on campus.' },
  { regex: /\b(beer|wine|vodka|whiskey|spirit|alcohol|heineken|smirnoff)\b/i, reason: 'Alcoholic beverages are prohibited under Covenant University regulations.' },
  { regex: /\b(knife|gun|dagger|weapon|pepper\s*spray|taser)\b/i, reason: 'Weapons, knives, or harmful items are illegal.' },
  { regex: /\b(exam\s*leak|exam\s*paper|chits?|runz|expo|answer\s*sheet)\b/i, reason: 'Leaked examination materials violate academic integrity policies.' },
  { regex: /\b(write\s*my\s*assignment|do\s*my\s*project|take\s*my\s*exam|impersonat)\b/i, reason: 'Academic dishonesty and exam impersonation services are banned.' },
  { regex: /\b(porn|adult|sex|escort|hookup|nude)\b/i, reason: 'Adult or explicit content is strictly banned.' },
  { regex: /\b(counterfeit|fake\s*naira|clone\s*money)\b/i, reason: 'Counterfeit currency and counterfeit goods are banned.' },
];

export function checkBannedContent(text: string): { isBanned: boolean; reason?: string } {
  for (const item of BANNED_PATTERNS) {
    if (item.regex.test(text)) {
      return { isBanned: true, reason: item.reason };
    }
  }
  return { isBanned: false };
}
