import pb from '@/app/lib/pb';
import {type} from "node:os";

export async function getUserRatings(sellerId: string | undefined) {
    if (!sellerId) return {
        averageRating: 0,
        totalRatings: 0,
        ratingSum: 0,
        totalSold: 0,
    };
    try {
        const stats = await pb.collection('stats').getOne(sellerId);

        return {
            averageRating: typeof(stats.avgRating) === 'number' ? stats.avgRating : 0,
            totalRatings: typeof(stats.totalRatings) === 'number' ? stats.totalRatings : 0,
            ratingSum: typeof(stats.ratingSum) === 'number' ? stats.ratingSum : 0,
            totalSold: typeof(stats.totalSold) === 'number' ? stats.totalSold : 0,
        };
    } catch (err) {
        return {
            averageRating: 0,
            totalRatings: 0,
            ratingSum: 0,
            totalSold: 0,
        };
    }
}

export async function getListingStats(listingId: string | undefined) {
    if (!listingId) return {
        salesCount: 0,
        averageRating: 0,
        totalRatings: 0,
        totalFavorites: 0,
        ratingSum: 0
    };
    try {
        const stats = await pb.collection('stats_listings').getOne(listingId);

        return {
            salesCount: typeof(stats.salesCount) === 'number' ? stats.salesCount : 0,
            averageRating: typeof(stats.avgRating) === 'number' ? stats.avgRating : 0,
            totalRatings: typeof(stats.totalRatings) === 'number' ? stats.totalRatings : 0,
            ratingSum: typeof(stats.ratingSum) === 'number' ? stats.ratingSum : 0,
            totalFavorites: typeof(stats.totalFavorites) === 'number' ? stats.totalFavorites : 0
        };
    } catch (err) {
        return {
            salesCount: 0,
            averageRating: 0,
            totalRatings: 0,
            totalFavorites: 0,
            ratingSum: 0
        };
    }
}