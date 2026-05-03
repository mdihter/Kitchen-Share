'use client';

import { ListingCard as NewListingCard } from "@/app/components/NewListingCard";
import { ListingCard } from "@/app/components/NewListingCard";
import { useFavorites } from "@/app/hooks/useFavorites";
import { useCurrentUser, useListings } from "@/app/hooks";
import { useLocation } from "@/app/providers/LocationProvider";
import { useCallback, useEffect, useRef, useState } from "react";
import pb from "@/app/lib/pb";
import type { Listing } from "@/app/types/listing";
import { useRouter } from "next/navigation";
import { setAuthRedirect } from "@/app/api/authRedirect";
import { CATEGORY_OPTIONS } from "@/app/types/categories";

const LEAVE_DURATION_MS = 300;

export default function Favorites() {
    const userId = useCurrentUser();
    const { favorites, favoriteIds, loading, error, refetch } = useFavorites(userId);
    const router = useRouter();
    const { city, state, locationReady } = useLocation();

    const [categoryFilter, setCategoryFilter] = useState("all");
    const [leavingIds, setLeavingIds] = useState<Set<string>>(new Set());
    const leavingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const [isLeavingEmpty, setIsLeavingEmpty] = useState(false);

    const filteredFavorites = favorites.filter((listing: Listing) => {
        const category = listing.category?.toLowerCase();
        if (categoryFilter === "all") return true;
        return category === categoryFilter;
    });

    const handleNearbyFavorite = useCallback(() => {
        setIsLeavingEmpty(true);
        refetch();
    }, [refetch]);

    const handleUnfavorite = useCallback((id: string) => {
        // Cancel any existing timer for this id to avoid double-refetch
        const existing = leavingTimers.current.get(id);
        if (existing) clearTimeout(existing);

        // If this is the last visible item in the current filter, snap back to all
        if (filteredFavorites.filter(l => l.id !== id).length === 0 && categoryFilter !== "all") {
            setCategoryFilter("all");
        }

        setLeavingIds(prev => new Set(prev).add(id));
        const timer = setTimeout(() => {
            leavingTimers.current.delete(id);
            refetch();
            setLeavingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
        }, LEAVE_DURATION_MS);
        leavingTimers.current.set(id, timer);
    }, [refetch, filteredFavorites, categoryFilter]);

    const { listings: nearbyListings, loading: nearbyLoading } = useListings({
        city,
        state,
        enabled: locationReady && !loading && favorites.length === 0,
        excludeSeller: userId,
    });

    useEffect(() => {
        if (!userId && !pb.authStore.isValid) {
            setAuthRedirect();
            router.push("/auth");
        }
    }, [userId, router]);

    if (!userId) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-stone-50">
                <p className="text-stone-400">Loading...</p>
            </div>
        );
    }

    if (error) {
        return (
            <main className="min-h-screen bg-stone-50">
                <div className="mx-auto max-w-6xl px-8 py-16">
                    <h1 className="text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
                        Your Favorites
                    </h1>
                    <p className="mt-10 text-lg text-red-500">Couldn&apos;t load favorites.</p>
                    <button onClick={refetch} className="mt-4 rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700">
                        Retry
                    </button>
                </div>
            </main>
        );
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-stone-50">
                <div className="mx-auto max-w-6xl px-8 py-16">
                    <h1 className="text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
                        Your Favorites
                    </h1>
                    <p className="mt-10 text-lg text-stone-400">Loading...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-stone-50">
            <div className="mx-auto max-w-6xl px-8 py-16">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
                        Your Favorites
                    </h1>
                    <p className="mt-2 text-lg font-medium text-stone-500">
                        {favorites.length} saved {favorites.length === 1 ? "item" : "items"}
                    </p>
                </div>

                <div className="mb-10 flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            key="all"
                            type="button"
                            onClick={() => setCategoryFilter("all")}
                            className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition ${
                                categoryFilter === "all"
                                    ? "border-orange-500 bg-orange-500 text-white shadow-sm"
                                    : "border-stone-100 bg-white text-stone-700 hover:border-stone-300"
                            }`}
                        >
                            🍽️ All
                        </button>
                        {CATEGORY_OPTIONS.map(({ value, label, emoji }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setCategoryFilter(value)}
                                className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition ${
                                    categoryFilter === value
                                        ? "border-orange-500 bg-orange-500 text-white shadow-sm"
                                        : "border-stone-100 bg-white text-stone-700 hover:border-stone-300"
                                }`}
                            >
                                <span className="mr-1">{emoji}</span>{label}
                            </button>
                        ))}
                    </div>
                </div>

                {(favorites.length === 0 || isLeavingEmpty) ? (
                    <div
                        onTransitionEnd={() => { if (isLeavingEmpty) setIsLeavingEmpty(false); }}
                        className={`flex flex-col items-center justify-center py-24 transition-all duration-300 ${
                            isLeavingEmpty
                                ? 'opacity-0 scale-95 pointer-events-none'
                                : 'opacity-100 scale-100 animate-[fadeIn_250ms_ease-out]'
                        }`}
                        style={{ animationFillMode: 'both' }}
                    >
                        <h2 className="mb-5 text-center text-7xl font-bold tracking-tight text-stone-900">No favorites yet</h2>
                        <p className="mb-12 max-w-md text-center text-xl leading-relaxed text-stone-400">
                            Save listings you love and they&apos;ll show up here. In the meantime, check out what&apos;s popular near you.
                        </p>
                        <button
                            type="button"
                            onClick={() => router.push("/home")}
                            className="mb-24 rounded-2xl bg-orange-500 px-10 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-orange-600"
                        >
                            Browse Listings →
                        </button>

                        {locationReady && (
                            nearbyLoading ? (
                                <div className="w-full grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className="h-75 animate-pulse rounded-3xl border border-stone-200 bg-white" />
                                    ))}
                                </div>
                            ) : nearbyListings.length > 0 ? (
                                <div className="w-full">
                                    <p className="mb-6 text-center text-xs font-semibold uppercase tracking-wider text-stone-400">
                                        {city && state ? `Available near ${city}, ${state}` : 'Popular listings'}
                                    </p>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                        {nearbyListings.slice(0, 4).map((listing) => (
                                            <ListingCard key={listing.id} listing={listing} favoriteIds={favoriteIds} onFavorite={handleNearbyFavorite} />
                                        ))}
                                    </div>
                                </div>
                            ) : (city && state) ? (
                                <div className="flex flex-col items-center gap-3">
                                    <p className="text-center text-3xl font-bold text-stone-700">Nothing nearby in {city}, {state}</p>
                                    <p className="max-w-sm text-center text-lg text-stone-400">Try a different location from the navbar or check back later.</p>
                                </div>
                            ) : null
                        )}
                    </div>
                ) : filteredFavorites.length === 0 ? (
                    <p className="mt-10 text-lg text-stone-400">
                        No favorites match these filters.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3 animate-[fadeIn_300ms_ease-out]">
                        {filteredFavorites.map((listing) => (
                            <div
                                key={listing.id}
                                className={`transition-all duration-300 ${
                                    leavingIds.has(listing.id) ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                                }`}
                            >
                                <NewListingCard
                                    listing={listing}
                                    favoriteIds={favoriteIds}
                                    onUnfavorite={() => handleUnfavorite(listing.id)}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}