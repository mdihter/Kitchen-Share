'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import pb from '@/app/lib/pb';
import { CATEGORY_OPTIONS } from '@/app/types/categories';
import type { Listing } from '@/app/types/listing';

type EditForm = {
  title: string;
  price: string;
  location: string;
  description: string;
  category: string;
  tags: string;
};

interface EditListingModalProps {
  listing: Listing;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditListingModal({ listing, onClose, onSaved }: EditListingModalProps) {
  const [form, setForm] = useState<EditForm>({
    title: listing.title ?? '',
    price: String(listing.price ?? ''),
    location: listing.location ?? '',
    description: listing.description ?? '',
    category: listing.category ?? '',
    tags: listing.tags ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof EditForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) {
      setError('Valid price is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await pb.collection('listings').update(listing.id, {
        title: form.title.trim(),
        price: Number(form.price),
        location: form.location.trim(),
        description: form.description.trim(),
        category: form.category,
        tags: form.tags.trim(),
      });
      onSaved();
      onClose();
    } catch {
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-stone-900 transition-colors bg-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
          <h2 className="text-lg font-bold text-stone-900">Edit Listing</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1.5">Title</label>
            <input
              className={inputClass}
              value={form.title}
              onChange={handleChange('title')}
              placeholder="e.g. Homemade lasagna"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1.5">Price ($)</label>
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={handleChange('price')}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1.5">Location</label>
            <input
              className={inputClass}
              value={form.location}
              onChange={handleChange('location')}
              placeholder="e.g. Downtown LA"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1.5">Category</label>
            <select className={inputClass} value={form.category} onChange={handleChange('category')}>
              <option value="">Select a category</option>
              {CATEGORY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1.5">Description</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={3}
              value={form.description}
              onChange={handleChange('description')}
              placeholder="Tell buyers about your food..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1.5">Tags</label>
            <input
              className={inputClass}
              value={form.tags}
              onChange={handleChange('tags')}
              placeholder="Separate with spaces"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold text-stone-600 border border-stone-200 rounded-full hover:bg-stone-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-stone-900 rounded-full hover:bg-stone-700 transition-colors disabled:opacity-40"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
