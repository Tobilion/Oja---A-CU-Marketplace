/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Upload, AlertTriangle, Sparkles, Check, Image as ImageIcon } from 'lucide-react';
import { Category, ListingCondition, ListingPostAs, Business } from '../../types';
import { predictCategoryFromTitle, checkBannedContent } from '../../utils/taxonomy';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { repo } from '../../data';
import { REQUIRE_LISTING_PHOTOS } from '../../config/appConfig';
import { validatePhotoCount } from '../../utils/listingPhotos';
import { compressImageClientSide } from '../../utils/imageCompress';

interface CreateListingModalProps {
  categories: Category[];
  userBusinesses: Business[];
  onClose: () => void;
  onCreated: () => void;
}

export const CreateListingModal: React.FC<CreateListingModalProps> = ({
  categories,
  userBusinesses,
  onClose,
  onCreated,
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useNotifications();

  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'cat_electronics');
  const [condition, setCondition] = useState<ListingCondition>('Like new');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [description, setDescription] = useState('');
  const [defaultDeliveryDays, setDefaultDeliveryDays] = useState('1');
  const [postAs, setPostAs] = useState<ListingPostAs>('me');
  const [selectedBusinessId, setSelectedBusinessId] = useState(userBusinesses[0]?.id || '');
  const [dynamicValues, setDynamicValues] = useState<Record<string, string | number>>({});
  const [images, setImages] = useState<string[]>([]);
  const [suggestedCat, setSuggestedCat] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Category prediction on title typing
  useEffect(() => {
    if (title.length > 3) {
      const pred = predictCategoryFromTitle(title);
      if (pred && pred !== categoryId) {
        setSuggestedCat(pred);
      } else {
        setSuggestedCat(null);
      }
    } else {
      setSuggestedCat(null);
    }
  }, [title, categoryId]);

  const activeCategory = categories.find((c) => c.id === categoryId);

  // Client-side photo handling: M-04 compresses to max ~1000px JPEG ~0.75 so
  // demo-mode localStorage never holds raw multi-megabyte uploads.
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).slice(0, 6 - images.length);

    files.forEach((file) => {
      compressImageClientSide(file).then(
        (compressed) => {
          setImages((prev) => [...prev, compressed].slice(0, 6));
        },
        () => {
          setValidationError('That photo could not be processed. Try a different image.');
        }
      );
    });
  };

  const removePhoto = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setValidationError(null);

    // 1. Title & Price Validation
    if (!title.trim()) {
      setValidationError('Please enter a listing title.');
      return;
    }
    const numPrice = parseInt(price.replace(/[^0-9]/g, ''), 10);
    if (isNaN(numPrice) || numPrice <= 0) {
      setValidationError('Please specify a valid price in Naira.');
      return;
    }
    const numStock = parseInt(stock, 10);
    if (isNaN(numStock) || numStock <= 0) {
      setValidationError('Quantity in stock must be at least 1.');
      return;
    }

    // 2. Photo validation: BUG-2 photos are optional (REQUIRE_LISTING_PHOTOS
    // is false). The 1-to-6 limit still applies when photos are added.
    const photoError = validatePhotoCount(images);
    if (photoError) {
      setValidationError(photoError);
      return;
    }

    // 3. Dynamic Category-Specific Validation
    if (activeCategory) {
      for (const field of activeCategory.dynamicFields) {
        if (field.required && !dynamicValues[field.key]) {
          setValidationError(`Please fill out required field: "${field.label}"`);
          return;
        }
      }
    }

    // 4. Prohibited Content Check
    const bannedCheck = checkBannedContent(`${title} ${description}`);
    if (bannedCheck.isBanned) {
      setValidationError(`Prohibited content: ${bannedCheck.reason}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await repo.createListing({
        title: title.trim(),
        description: description.trim(),
        categoryId,
        condition,
        price: numPrice,
        stock: numStock,
        images,
        sellerId: currentUser.id,
        businessId: postAs === 'business' || postAs === 'both' ? selectedBusinessId : undefined,
        postAs,
        defaultDeliveryDays: parseInt(defaultDeliveryDays, 10) || 1,
        dynamicValues,
        status: 'active',
      });

      showToast('Listing published successfully!', 'success');
      onCreated();
      onClose();
    } catch (err: any) {
      setValidationError(err.message || 'Failed to create listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-bold text-[var(--color-text-main)]">Create New Listing</h2>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 text-xs">
          {validationError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Post As Switcher */}
          {userBusinesses.length > 0 && (
            <div className="p-3 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-2">
              <span className="font-semibold text-[var(--color-text-main)]">Posting Identity:</span>
              <div className="flex gap-2">
                {(['me', 'business', 'both'] as ListingPostAs[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPostAs(mode)}
                    className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-colors ${
                      postAs === mode
                        ? 'bg-[var(--color-brand-primary)] text-white shadow-xs'
                        : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    {mode === 'me' ? 'Individual' : mode === 'business' ? 'Business Only' : 'Both (Co-listed)'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block font-semibold text-[var(--color-text-main)] mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Anker 65W GaN Charger or CSC 211 Past Questions Pack"
              className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text-main)] focus:ring-1 focus:ring-[var(--color-brand-primary)]"
            />
            {/* Category Suggestion Chip */}
            {suggestedCat && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--color-brand-primary)]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  Suggested category:{' '}
                  <strong>{categories.find((c) => c.id === suggestedCat)?.name}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryId(suggestedCat);
                    setSuggestedCat(null);
                  }}
                  className="underline font-semibold ml-1"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          {/* Category & Condition Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[var(--color-text-main)] mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setDynamicValues({});
                }}
                className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2 text-[var(--color-text-main)]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[var(--color-text-main)] mb-1">
                Condition <span className="text-red-500">*</span>
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as ListingCondition)}
                className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2 text-[var(--color-text-main)]"
              >
                <option value="New">Brand New</option>
                <option value="Like new">Like New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
              </select>
            </div>
          </div>

          {/* Dynamic Category-Specific Fields */}
          {activeCategory && activeCategory.dynamicFields.length > 0 && (
            <div className="p-3.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-3">
              <span className="font-semibold text-[var(--color-text-main)] uppercase tracking-wider text-[10px]">
                {activeCategory.name} Specific Details
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeCategory.dynamicFields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-[var(--color-text-muted)] mb-1 font-medium">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={dynamicValues[field.key] || ''}
                        onChange={(e) => setDynamicValues({ ...dynamicValues, [field.key]: e.target.value })}
                        className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-2 text-[var(--color-text-main)]"
                      >
                        <option value="">Select option</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        placeholder={field.placeholder}
                        value={dynamicValues[field.key] || ''}
                        onChange={(e) => setDynamicValues({ ...dynamicValues, [field.key]: e.target.value })}
                        className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-2 text-[var(--color-text-main)]"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Price, Stock & Delivery Window */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-[var(--color-text-main)] mb-1">
                Price (₦) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 15000"
                className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2 text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-[var(--color-text-main)] mb-1">
                Stock Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-[var(--color-text-main)] mb-1">Delivery Window</label>
              <select
                value={defaultDeliveryDays}
                onChange={(e) => setDefaultDeliveryDays(e.target.value)}
                className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2"
              >
                <option value="1">Same / Next Day (1 day)</option>
                <option value="2">2 Days</option>
                <option value="3">3 Days</option>
              </select>
            </div>
          </div>

          {/* Photo Upload (optional, 0 to 6) */}
          <div>
            <label className="block font-semibold text-[var(--color-text-main)] mb-1">
              Photos (Optional, Up to 6)
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              {images.map((img, i) => (
                <div key={i} className="relative w-20 h-16 rounded-lg overflow-hidden border border-[var(--color-border)] group">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 p-0.5 bg-red-600 text-white rounded-full opacity-80 hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {images.length < 6 && (
                <label className="w-20 h-16 rounded-lg border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-brand-primary)] flex flex-col items-center justify-center cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-brand-primary)] transition-colors">
                  <Upload className="w-4 h-4 mb-0.5" />
                  <span className="text-[10px]">Add photo</span>
                  <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-[var(--color-text-main)] mb-1">Detailed Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="State condition details, reason for sale, specs, or what is included in the package..."
              className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text-main)]"
            />
          </div>

          {/* Banned Rules Notice */}
          <div className="p-2.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              Prohibited: Alcohol, drugs, exam papers, impersonation/assignment services, weapons, adult content.
            </span>
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex justify-end gap-2 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-[var(--color-brand-primary)] text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isSubmitting ? 'Publishing...' : 'Publish Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
