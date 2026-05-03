'use client';

import { ListingCard as NewListingCard } from "@/app/components/NewListingCard";
import { useFavorites } from "@/app/hooks/useFavorites";
import { useCurrentUser } from "@/app/hooks";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setAuthRedirect } from "@/app/api/authRedirect";
import { Pizza, Soup, Leaf, CupSoda, Salad, Fish, Sandwich, Beef, Utensils, Coffee, IceCream } from "lucide-react";

export default function Favorites() {
    const userId = useCurrentUser();
    const { favorites, favoriteIds, loading, error, refetch } = useFavorites(userId);
    const router = useRouter();

    const [categoryFilter, setCategoryFilter] = useState("all");
    
    const categoryFilters = [
    { label: "All", value: "all", icon: <Utensils size={16} /> },
    { label: "Pizza", value: "pizza", icon: <Pizza size={16} /> },
    { label: "Burgers", value: "burgers", icon: <Beef size={16} /> },
    { label: "BBQ", value: "bbq", icon: <Beef size={16} /> },
    { label: "Sandwiches", value: "sandwiches", icon: <Sandwich size={16} /> },
    { label: "Pasta", value: "pasta", icon: <Soup size={16} /> },
    { label: "Seafood", value: "seafood", icon: <Fish size={16} /> },
    { label: "Salads", value: "salads", icon: <Salad size={16} /> },
    { label: "Breakfast", value: "breakfast", icon: <Coffee size={16} /> },
    { label: "Desserts", value: "desserts", icon: <IceCream size={16} /> },
    { label: "Drinks", value: "drinks", icon: <CupSoda size={16} /> },
    { label: "Vegan", value: "vegan", icon: <Leaf size={16} /> }
    ];

    const filteredFavorites = favorites.filter((listing: any) => {
        const category = listing.category?.toLowerCase();

        if (categoryFilter === "all") return true;

        return category === categoryFilter;
    });


    useEffect(() => {
        if (!userId) {
            setAuthRedirect();
            router.push("/auth");
        }
    }, [userId, router]);

    if (!userId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <p className="text-gray-500">Loading...</p>
            </div>
        );
    }

    if (error) {
        return (
            <main className="min-h-screen bg-white font-sans relative overflow-hidden">
                <div className="mx-auto max-w-6xl px-8 py-16">
                    <h1 className="text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
                        Your Favorites
                    </h1>
                    <p className="text-lg text-red-500 mt-10">Couldn&apos;t load favorites.</p>
                    <button onClick={refetch} className="mt-4 px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-700 transition">
                        Retry
                    </button>
                </div>
            </main>
        );
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-white font-sans relative overflow-hidden">
                <div className="mx-auto max-w-6xl px-8 py-16">
                    <h1 className="text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
                        Your Favorites
                    </h1>
                    <p className="text-lg text-gray-500 mt-10">
                        Loading...
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-white font-sans relative overflow-hidden">
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

                    <div className="flex flex-wrap gap-3">
                        {categoryFilters.map((filter) => (
                            <button
                                key={filter.value}
                                type="button"
                                onClick={() => setCategoryFilter(filter.value)}
                                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                                    categoryFilter === filter.value
                                        ? "bg-orange-500 text-white shadow-sm"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                {filter.icon}
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>

                {favorites.length === 0 ? (
                    <p className="text-lg text-gray-500 mt-10">
                        You have no favorite meals yet.
                    </p>
                ) : filteredFavorites.length === 0 ? (
                    <p className="text-lg text-gray-500 mt-10">
                        No favorites match these filters.
                    </p>
                ) : (
                    <ul className="grid list-none grid-cols-1 gap-7 p-0 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredFavorites.map((listing) => (
                            <NewListingCard
                                key={listing.id}
                                listing={listing}
                                favoriteIds={favoriteIds}
                                onUnfavorite={refetch}
                            />
                        ))}
                    </ul>
                )}
            </div>
        </main>
    );
}