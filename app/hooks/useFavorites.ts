import { useState, useEffect, useCallback, useRef } from 'react';
import pb from '../lib/pb';
import { Favorites } from '../types/favorites';
import { Listing } from '../types/listing';
import { getCachedBlockedIds } from '../lib/blockUtils';

export function useFavorites(userId: string | null) {
    const [favorites, setFavorites] = useState<Listing[]>([]);
    // map<listingId, favoriteRecordId> — lets ListingCard delete without a separate lookup
    const [favoriteIds, setFavoriteIds] = useState<Map<string, string>>(new Map());
    const [loading, setLoading] = useState(!!userId);
    const [error, setError] = useState<Error | null>(null);
    const [tick, setTick] = useState(0);
    const hasDataRef = useRef(false);

    useEffect(() => {
        if (!userId) {
            setFavorites([]);
            setFavoriteIds(new Map());
            setLoading(false);
            hasDataRef.current = false;
            return;
        }

        let cancelled = false;

        if (!hasDataRef.current) setLoading(true);
        setError(null);

        const run = async () => {
            try {
                const filter = pb.filter('user = {:userId}', { userId });

                const [records, blockedIds] = await Promise.all([
                    pb.collection('favorites').getFullList<Favorites>({
                        filter,
                        expand: 'listing',
                        requestKey: 'useFavorites',
                    }),
                    getCachedBlockedIds(userId),
                ]);

                if (cancelled) return;

                let favoritedListings: Listing[] = records
                    .map((record) => record.expand?.listing)
                    .filter((listing): listing is Listing => listing !== undefined);

                if (blockedIds.size > 0) {
                    favoritedListings = favoritedListings.filter(
                        listing => !blockedIds.has(listing.seller as string)
                    );
                }

                // map listingId → favoriteRecordId so ListingCard can delete correctly
                const favoriteMap = new Map(records.map((r) => [r.listing as string, r.id]));

                setFavorites(favoritedListings);
                setFavoriteIds(favoriteMap);
                hasDataRef.current = true;
            } catch (err) {
                if (!cancelled) {
                    setError(err as Error);
                    setFavorites([]);
                    setFavoriteIds(new Map());
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        run();
        return () => { cancelled = true; };
    }, [userId, tick]);

    const refetch = useCallback(() => setTick(t => t + 1), []);

    return { favorites, favoriteIds, loading, error, refetch };
}