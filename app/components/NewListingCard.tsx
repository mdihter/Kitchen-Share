'use client';

import type { Listing } from '@/app/types/listing';
import pb from '@/app/lib/pb';
import { Check, Clock3, Heart, MapPin, Share2, Star } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useCurrentUser } from '@/app/hooks';
import { toast } from 'react-toastify';
import { useIsListing } from '@/app/providers/ListingProvider';
import {CATEGORY_OPTIONS} from "@/app/types/categories";

export function ListingCard({
  listing,
  favoriteIds,
  onUnfavorite,
  onFavorite,
}: {
  listing: Listing;
  favoriteIds?: Map<string, string>;
  onUnfavorite?: () => void;
  onFavorite?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [isFavorite, setIsFavorite] = useState(() => favoriteIds?.has(listing.id) ?? null);
  const [favoriteRecordId, setFavoriteRecordId] = useState<string | null>(() => favoriteIds?.get(listing.id) ?? null);
  const [isPending, setIsPending] = useState(false);
  const { openListing } = useIsListing();
  const userId = useCurrentUser();

  const seller = listing.expand?.seller;
  const sellerName = seller?.displayName || 'Local seller';
  const sellerRating = seller?.rating;
  const badgeLabel = CATEGORY_OPTIONS.find(c => c.value === listing.category)?.label ?? 'Other';
  const badgeClassName = badgeLabel === 'Popular'
    ? 'bg-violet-100 text-violet-700'
    : 'bg-lime-100 text-lime-700';

  const imgUrl = useMemo(() => {
    try {
      return pb.files.getURL(listing, listing.main_image as string, { thumb: '640x480' }) || '/placeholder.jpg';
    } catch {
      return '/placeholder.jpg';
    }
  }, [listing]);

  const sellerAvatar = useMemo(() => {
    try {
      if (seller?.avatar) {
        const str = pb.files.getURL(seller, seller.avatar, {thumb: '100x100'});
        return str;
      }
    } catch {
      // ignore and use fallback avatar
    }

    return null;
  }, [seller]);

  const copyLinkToast = () => toast.success('Link copied!');
  const copyLinkFailedToast = () => toast.error('Failed to copy link!');

  const copyListingLink = async () => {
    const url = `${window.location.origin}/listing/${listing.id}`;
    try {
      await navigator.clipboard.writeText(url);
      copyLinkToast();
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      copyLinkFailedToast();
      console.error('Failed to copy listing link', error);
    }
  };

  const toggleFavorite = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!userId) {
      toast.error('Please log in to add items to your favorites.');
      return;
    }

    if (isPending) return;
    setIsPending(true);

    try {
      if (isFavorite && favoriteRecordId) {
        await pb.collection('favorites').delete(favoriteRecordId);
        setIsFavorite(false);
        setFavoriteRecordId(null);
        onUnfavorite?.();
      } else {
        const newFavorite = await pb.collection('favorites').create({
          user: userId,
          listing: listing.id,
        });

        setIsFavorite(true);
        setFavoriteRecordId(newFavorite.id);
        onFavorite?.();
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <li className="group overflow-hidden rounded-[24px] border border-stone-200 bg-white shadow-[0_8px_24px_rgba(28,25,23,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(28,25,23,0.10)]">
      <div
        onClick={() => openListing(listing.id)}
        className="block cursor-pointer"
      >
        <div className="relative aspect-[1.5/1] overflow-hidden bg-stone-100">
          <img
            src={imgUrl}
            alt={listing.title || 'Food listing'}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />

          {badgeLabel && (
              <div className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm backdrop-blur-sm ${badgeClassName}`}>
                {badgeLabel}
              </div>
          )}
          <button
            type="button"
            onClick={toggleFavorite}
            disabled={isPending}
            className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center text-stone-700 transition"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <div className="absolute inset-0 rounded-full bg-black opacity-0 transition group-hover:opacity-25"/>
            <Heart className={`h-6.5 w-6.5 stroke-[2.2] drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] hover:scale-125 transition ${isFavorite ? 'fill-red-500 text-red-500' : 'fill-none text-white hover:text-red-300'}`} />
          </button>

          <div className="absolute bottom-3 right-3 rounded-full bg-white px-3 py-1 text-xs font-bold text-stone-900 shadow-sm">
            ${Number(listing.price || 0).toLocaleString()}
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-stone-900">
                {listing.title || 'Untitled listing'}
              </h3>
              <div className="mt-1 flex items-center gap-1 text-xs text-stone-500">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{listing.location || 'Location unavailable'}</span>
              </div>
            </div>

            {sellerRating !== null && sellerRating !== undefined ? (
              <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {Number(sellerRating).toFixed(1)}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 text-xs text-stone-500">
            <div className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              <span>{listing.updated ? 'Recently posted' : 'Available now'}</span>
            </div>

            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                copyListingLink();
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition hover:bg-stone-50"
              aria-label="Share listing"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-stone-100 pt-3">
            <div className="flex min-w-0 items-center gap-2">
              {sellerAvatar ? (
                <img
                  src={sellerAvatar}
                  alt={sellerName}
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-200 text-[10px] font-semibold text-stone-600">
                  {sellerName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="truncate text-xs font-medium text-stone-700">{sellerName}</span>
            </div>

          </div>
        </div>
      </div>
    </li>
  );
}
