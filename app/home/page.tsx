'use client';
import { useState } from "react";
import { ListingCard } from "../components/NewListingCard";
import { useCurrentUser, useListings } from "@/app/hooks";
import { useLocation } from "@/app/providers/LocationProvider";
import { CATEGORY_OPTIONS } from "@/app/types/categories";
import {useFavorites} from "@/app/hooks/useFavorites";
import {ChevronRight} from "lucide-react";
import Image from "next/image";
import homeBanner from "@/public/homebanner.webp"

const PAGE_SIZE = 8;

export default function Home() {
    const currentUserId = useCurrentUser();
    const { city, state, locationReady } = useLocation();
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    const handleCategoryChange = (cat: string | null) => {
        setSelectedCategory(cat);
        setVisibleCount(PAGE_SIZE);
    };
    const { favoriteIds } = useFavorites(currentUserId);

    const { listings, loading, error } = useListings({ city, state, enabled: locationReady, excludeSeller: currentUserId, category: selectedCategory });

    const visibleListings = listings.slice(0, visibleCount);
    const hasMore = visibleCount < listings.length;

    if (!locationReady) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-stone-500">Loading...</p>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-stone-50 text-stone-900 mb-25">
            <div className="mx-auto px-4 py-10 sm:px-14 md:px-16 lg:px-20 xl:px-30">
                <section className="p-6 sm:p-8">
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                            <div className="relative">
                                <div className={"relative z-10"}>
                                    <p className="text-[2rem] font-extrabold leading-none tracking-[-0.03em] text-stone-900 sm:text-[2.75rem]">
                                        Good food is
                                        <br />
                                        <span className="text-orange-500">closer than you think.</span>
                                    </p>
                                    <p className="mt-3 text-sm text-stone-500 sm:text-base">
                                        Real food. Real people. Real community.
                                    </p>
                                </div>

                                <Image src={homeBanner} alt={""} className={"translate-0 lg:translate-x-1/1 pointer-events-none absolute right-0 lg:-right-20 top-1/2 h-auto w-80 -translate-y-1/2 opacity-25 lg:opacity-40 sm:w-105 lg:w-130"}/>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 md:gap-2.5 overflow-x-auto pb-1">
                            <button
                                key="all"
                                type="button"
                                onClick={() => handleCategoryChange(null)}
                                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm md:px-5 md:py-2.5 md:text-base font-medium transition ${
                                    selectedCategory === null
                                        ? 'border-orange-500 bg-orange-500 text-white shadow-sm'
                                        : 'border-stone-100 bg-white text-stone-700 hover:border-stone-300'
                                }`}
                            >
                                🍽️ All
                            </button>
                            {CATEGORY_OPTIONS.map(({value, label, emoji}) => {
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => handleCategoryChange(selectedCategory === value ? null : value)}
                                        className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm md:px-5 md:py-2.5 md:text-base font-medium transition ${
                                            selectedCategory === value
                                                ? 'border-orange-500 bg-orange-500 text-white shadow-sm'
                                                : 'border-stone-100 bg-white text-stone-700 hover:border-stone-300'
                                        }`}
                                    >
                                        <span className="mr-1">{emoji}</span>{label}
                                    </button>
                                );
                            })}
                        </div>

                        {error && (
                            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                Failed to load listings. Please try again.
                            </div>
                        )}

                        {loading ? (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                {Array.from({ length: 8 }).map((_, index) => (
                                    <div
                                        key={index}
                                        className="h-75 animate-pulse rounded-3xl border border-stone-200 bg-white"
                                    />
                                ))}
                            </div>
                        ) : listings.length === 0 ? (
                            <div className="flex min-h-80 items-center justify-center rounded-3xl border border-dashed border-stone-300 bg-white/70 px-6 text-center">
                                <p className="max-w-md text-sm text-stone-500 sm:text-base">
                                    No listings found{city ? ` in ${city}${state ? `, ${state}` : ''}` : ''}. Try another location or category.
                                </p>
                            </div>
                        ) : (
                            <div className={"flex flex-col items-center justify-center"}>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-sm sm:max-w-full mb-10">
                                    {visibleListings.map((listing) => (
                                        <ListingCard key={listing.id} listing={listing} favoriteIds={favoriteIds} />
                                    ))}
                                </div>

                                {hasMore && (
                                    <div className="flex justify-center pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                                            className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-5 py-3 text-sm font-medium text-stone-700 shadow-sm transition hover:border-stone-300 hover:bg-stone-50"
                                        >
                                            Load more
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}