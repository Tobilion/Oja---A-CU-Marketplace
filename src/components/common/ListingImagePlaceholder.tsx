/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Laptop,
  BookOpen,
  Shirt,
  Utensils,
  Home,
  Sparkles,
  Wrench,
  Package,
} from 'lucide-react';

interface ListingImagePlaceholderProps {
  categoryId?: string;
  title?: string;
  className?: string;
  compact?: boolean;
}

export const ListingImagePlaceholder: React.FC<ListingImagePlaceholderProps> = ({
  categoryId = 'cat_other',
  title = '',
  className = '',
  compact = false,
}) => {
  const getIcon = () => {
    switch (categoryId) {
      case 'cat_electronics':
        return <Laptop className={compact ? 'w-5 h-5' : 'w-8 h-8'} />;
      case 'cat_books':
        return <BookOpen className={compact ? 'w-5 h-5' : 'w-8 h-8'} />;
      case 'cat_fashion':
        return <Shirt className={compact ? 'w-5 h-5' : 'w-8 h-8'} />;
      case 'cat_food':
        return <Utensils className={compact ? 'w-5 h-5' : 'w-8 h-8'} />;
      case 'cat_hostel':
        return <Home className={compact ? 'w-5 h-5' : 'w-8 h-8'} />;
      case 'cat_beauty':
        return <Sparkles className={compact ? 'w-5 h-5' : 'w-8 h-8'} />;
      case 'cat_services':
        return <Wrench className={compact ? 'w-5 h-5' : 'w-8 h-8'} />;
      default:
        return <Package className={compact ? 'w-5 h-5' : 'w-8 h-8'} />;
    }
  };

  return (
    <div
      className={`w-full h-full flex flex-col items-center justify-center bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] select-none p-3 transition-colors ${className}`}
      aria-label={title ? `Placeholder for ${title}` : 'Listing image placeholder'}
    >
      <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-brand-primary)] shadow-2xs">
        {getIcon()}
      </div>
      {!compact && title && (
        <span className="text-[11px] font-semibold text-[var(--color-text-main)] text-center line-clamp-1 max-w-[85%] mt-2">
          {title}
        </span>
      )}
    </div>
  );
};
