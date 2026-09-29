/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Trash2, RotateCcw, AlertTriangle, Package } from 'lucide-react';
import { Listing } from '../../types';
import { repo } from '../../data';
import { useAuth } from '../../context/AuthContext';
import { formatNaira } from '../../utils/money';
import { useNotifications } from '../../context/NotificationContext';
import { useModalEscape } from '../../hooks/useModalEscape';
import { ListingImagePlaceholder } from '../common/ListingImagePlaceholder';

interface RecycleBinModalProps {
  onClose: () => void;
  onListingsUpdated: () => void;
}

export const RecycleBinModal: React.FC<RecycleBinModalProps> = ({
  onClose,
  onListingsUpdated,
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useNotifications();

  const [recycledListings, setRecycledListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const modalRef = useModalEscape(true, onClose);

  const loadRecycled = async () => {
    setLoading(true);
    try {
      const all = await repo.getListings(true);
      const userRecycled = all.filter(
        (l) => l.sellerId === currentUser?.id && l.status === 'in_recycle_bin'
      );
      setRecycledListings(userRecycled);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecycled();
  }, [currentUser]);

  const handleRestore = async (id: string) => {
    await repo.restoreFromRecycleBin(id);
    showToast('Listing restored to active marketplace', 'success');
    await loadRecycled();
    onListingsUpdated();
  };

  const handlePermanentDelete = async (id: string) => {
    if (confirm('Are you sure you want to permanently delete this listing? This cannot be undone.')) {
      await repo.permanentlyDeleteListing(id);
      showToast('Listing permanently deleted', 'info');
      await loadRecycled();
      onListingsUpdated();
    }
  };

  return (
    <div ref={modalRef} className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 px-6 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-neutral-500" />
            <h2 className="text-base font-bold text-[var(--color-text-main)]">Recycle Bin</h2>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-muted)] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Items placed in the recycle bin are auto-purged after 30 days.</span>
          </div>

          {loading ? (
            <p className="text-center py-8 text-[var(--color-text-muted)]">Loading recycled items...</p>
          ) : recycledListings.length === 0 ? (
            <div className="py-12 text-center text-[var(--color-text-muted)]">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Your recycle bin is empty.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recycledListings.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.images[0] ? (
                      <img
                        src={item.images[0]}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover bg-neutral-200 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                        <ListingImagePlaceholder categoryId={item.categoryId} compact />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-semibold text-[var(--color-text-main)] truncate">{item.title}</h4>
                      <p className="font-mono text-xs text-[var(--color-text-muted)]">{formatNaira(item.price)}</p>
                      <p className="text-[10px] text-neutral-400">
                        Recycled: {item.recycledAt ? new Date(item.recycledAt).toLocaleDateString() : 'Recently'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRestore(item.id)}
                      className="p-2 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface)] text-[var(--color-brand-primary)] flex items-center gap-1 font-medium"
                      title="Restore listing"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(item.id)}
                      className="p-2 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10"
                      title="Delete permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
