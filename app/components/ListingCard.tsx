"use client";

import { Listing } from "@/app/types/listing";
import pb from "@/app/lib/pb";
import Link from "next/link";
import {Check, Heart, MapPin, Share2, Star} from "lucide-react";
import React, { useState } from "react";
import { useCurrentUser } from "@/app/hooks";
import {toast} from "react-toastify";
import {useIsListing} from "@/app/providers/ListingProvider";
import {useIsLogin} from "@/app/providers/LoginProvider";


export function ListingCard({ listing, favoriteIds, onUnfavorite }: { listing: Listing; favoriteIds?: Map<string, string>; onUnfavorite?: () => void }) {
    const [copied, setCopied] = useState(false);
    const [isFavorite, setIsFavorite] = useState(() => favoriteIds?.has(listing.id) ?? false);
    const [favoriteRecordId, setFavoriteRecordId] = useState<string | null>(
        () => favoriteIds?.get(listing.id) ?? null
    );
    const [isPending, setIsPending] = useState(false);
    const {openListing} = useIsListing();

    const copyLinkToast = () => toast.success("Link Copied!");
    const copyLinkFailedToast = () => toast.error("Failed to copy link!");

    const imgUrl =
        pb.files.getURL(listing, listing.main_image as string, { thumb: "640x480" }) ||
        "/placeholder.jpg";

    const rating = listing.expand?.seller?.rating;
    const userId = useCurrentUser();

    const copyListingLink = async () => {
        const url = `${window.location.origin}/listing/${listing.id}`;
        try {
            await navigator.clipboard.writeText(url);
            copyLinkToast();
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            copyLinkFailedToast();
            console.error("Failed to copy listing link", error);
        }
    };

    const toggleFavorite = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();

        if (!userId) {
            alert("Please log in to add items to your favorites.");
            return;
        }

        if (isPending) return; // prevent double-click race condition
        setIsPending(true);

        try {
            if (isFavorite && favoriteRecordId) {
                await pb.collection("favorites").delete(favoriteRecordId);
                setIsFavorite(false);
                setFavoriteRecordId(null);
                onUnfavorite?.();
            } else {
                const newFavorite = await pb.collection("favorites").create({
                    user: userId,
                    listing: listing.id,
                });

                setIsFavorite(true);
                setFavoriteRecordId(newFavorite.id);
            }
        } catch (error) {
            console.error("Error toggling favorite:", error);
        } finally {
            setIsPending(false);
        }
    };

    return (
        <li className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div onClick={() => openListing(listing.id)} className="block">
                <div className="relative aspect-4/3 overflow-hidden bg-stone-100">
                    <img
                        src={imgUrl}
                        alt={listing.title}
                        className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                    />

                    {/* Heart Button */}
                    {userId &&
                        <button
                            type="button"
                            onClick={toggleFavorite}
                            disabled={isPending}
                            className="absolute top-3 right-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-stone-700 shadow-sm backdrop-blur-sm transition hover:scale-110 disabled:opacity-50"
                        >
                            <Heart
                                className={`h-5 w-5 transition ${
                                    isFavorite ? "fill-red-300 text-red-300" : "text-stone-600"
                                }`}
                            />
                        </button>
                    }

                    <div className="absolute bottom-3 right-3 rounded-full bg-white/60 px-3 py-1 text-sm font-semibold text-stone-900 shadow-sm backdrop-blur-sm">
                        ${listing.price.toLocaleString()}
                    </div>
                </div>

                <div className="space-y-3 p-5">
                    <div className="flex flex-col gap-4">
                        <div>
                            <h3 className="line-clamp-1 text-lg font-semibold text-stone-900">
                                {listing.title || "Unknown"}
                            </h3>
                            <div className="mt-2 flex items-center gap-2 text-sm text-stone-500">
                                <MapPin className="h-4 w-4" />
                                <span className="line-clamp-1">
                                    {listing.location || "Neighborhood unavailable"}
                                </span>
                            </div>
                        </div>

                        {rating !== null && rating !== undefined && (
                            <div className="mt-2 flex items-center justify-between gap-3 text-sm text-stone-500">
                                <div className="inline-flex items-center gap-1">
                                    <Star className="h-4 w-4 text-amber-500" />
                                    <span>{rating.toFixed(1)}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            copyListingLink();
                                        }}
                                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 transition hover:bg-stone-50"
                                    >
                                        {copied ?
                                            <Check className="h-3 w-3" />
                                            :
                                            <Share2 className="h-3 w-3" />
                                        }
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </li>
    );
}
