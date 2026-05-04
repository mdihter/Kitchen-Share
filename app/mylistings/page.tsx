'use client';
import { useEffect, useMemo, useState, type ElementType } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, ClipboardList, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react';
import pb from '@/app/lib/pb';
import { useMyListings } from '@/app/hooks/useMyListings';
import type { Listing } from '@/app/types/listing';
import EditListingModal from '@/app/components/EditListingModal';
import { getListingStats } from '@/app/api/getStats';
import { useIsListing } from '@/app/providers/ListingProvider';

// ─── Types ────────────────────────────────────────────────────────────────────

type Offer = {
    id: string;
    conversationId: string;
    displayName: string;
    email: string;
    avatar: string;
    offerPrice: number;
    created: string;
    status: string;
};

function getImageUrl(listing: Listing): string {
    if (!listing.main_image) return '/placeholder.jpg';
    return pb.files.getURL(listing, listing.main_image, { thumb: '640x480' });
}

function OffersModal({
    listing,
    onClose,
}: {
    listing: Listing;
    onClose: () => void;
}) {
    const router = useRouter();
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let ignore = false;

        const fetchOffers = async () => {
            setLoading(true);
            setError(null);

            try {
                const conversations = await pb.collection('conversations').getFullList({
                    filter: `listing = "${listing.id}"`,
                    expand: 'buyer',
                    sort: '-created',
                });

                const offerList: Offer[] = conversations.map(conversation => {
                    const expandedBuyer = conversation.expand?.buyer;
                    const buyer = Array.isArray(expandedBuyer) ? expandedBuyer[0] : expandedBuyer;
                    const firstName = stringifyValue(buyer?.firstName);
                    const lastName = stringifyValue(buyer?.lastName);
                    const displayName =
                        stringifyValue(buyer?.displayName) ||
                        `${firstName} ${lastName}`.trim() ||
                        stringifyValue(buyer?.email) ||
                        'Unknown buyer';
                    const avatar = stringifyValue(buyer?.avatar);

                    return {
                        id: stringifyValue(buyer?.id) || conversation.id,
                        conversationId: conversation.id,
                        displayName,
                        email: stringifyValue(buyer?.email) || 'No email available',
                        avatar: buyer && avatar ? pb.files.getURL(buyer, avatar, { thumb: '80x80' }) : '',
                        offerPrice: getNumberFromRecord(conversation, ['offerPrice', 'offer_price', 'price', 'amount']),
                        created: stringifyValue(conversation.created),
                        status: getOfferStatus(conversation),
                    };
                });

                if (!ignore) setOffers(offerList);
            } catch (e) {
                console.error(e);
                if (!ignore) setError('Failed to load offers. Please try again.');
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        fetchOffers();

        return () => {
            ignore = true;
        };
    }, [listing.id]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-stone-100 px-6 py-5">
                    <div>
                        <h2 className="text-lg font-bold text-stone-900">Offers</h2>
                        <p className="mt-0.5 text-sm text-stone-400">{listing.title}</p>
                    </div>
                    <button onClick={onClose} className="text-stone-400 transition-colors hover:text-stone-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {loading && <p className="py-8 text-center text-sm text-stone-400">Loading offers...</p>}
                    {error && <p className="py-8 text-center text-sm text-red-500">{error}</p>}
                    {!loading && !error && offers.length === 0 && (
                        <p className="py-8 text-center text-sm text-stone-400">No offers yet on this listing.</p>
                    )}
                    {!loading && !error && offers.length > 0 && (
                        <div className="flex flex-col gap-3">
                            {offers.map(offer => {
                                const offeredDate = formatDateString(offer.created);

                                return (
                                    <div
                                        key={offer.conversationId}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => {
                                            onClose();
                                            router.push(`/messages/${offer.conversationId}`);
                                        }}
                                        onKeyDown={event => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                onClose();
                                                router.push(`/messages/${offer.conversationId}`);
                                            }
                                        }}
                                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-100 p-3 transition-colors hover:bg-stone-50"
                                    >
                                        {offer.avatar ? (
                                            <img
                                                src={offer.avatar}
                                                alt={offer.displayName}
                                                className="h-11 w-11 shrink-0 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-100 text-sm font-bold text-stone-500">
                                                {offer.displayName[0]?.toUpperCase() ?? '?'}
                                            </div>
                                        )}

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="truncate text-sm font-bold text-stone-900">{offer.displayName}</p>
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${getOfferStatusClass(offer.status)}`}>
                                                    {offer.status}
                                                </span>
                                            </div>
                                            <p className="mt-1 truncate text-xs font-medium text-stone-400">{offer.email}</p>
                                            <p className="mt-1 text-xs font-medium text-stone-400">
                                                {offeredDate === '—' ? 'Offer date unavailable' : `Offered ${offeredDate}`}
                                            </p>
                                        </div>

                                        <div className="shrink-0 text-right">
                                            <p className="text-xs font-semibold text-stone-400">Offer</p>
                                            <p className="mt-1 text-base font-extrabold text-stone-900">
                                                {offer.offerPrice > 0 ? formatCurrency(offer.offerPrice) : 'No price'}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="border-t border-stone-100 px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full rounded-full bg-stone-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-700"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}


// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({
    listing,
    onClose,
    onDeleted,
}: {
    listing: Listing;
    onClose: () => void;
    onDeleted: () => void;
}) {
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
    setDeleting(true);
    try {
        // Archive all linked conversations
        const conversations = await pb.collection('conversations').getFullList({
            filter: `listing = "${listing.id}"`,
        });
        await Promise.all(conversations.map(c =>
            pb.collection('conversations').update(c.id, {
                buyer_archived: true,
                seller_archived: true,
            })
        ));

        // Soft delete the listing
        await pb.collection('listings').update(listing.id, {
            is_available: false,
        });

        onDeleted();
        onClose();
    } catch {
        setError('Failed to delete. Please try again.');
        setDeleting(false);
    }
};

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-stone-900">Delete Listing?</h2>
                        <p className="text-sm text-stone-400 mt-1">
                            "{listing.title}" will be permanently removed.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-700 transition-colors ml-4 flex-shrink-0">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 text-sm font-semibold text-stone-600 border border-stone-200 rounded-full hover:bg-stone-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-full hover:bg-red-600 transition-colors disabled:opacity-40"
                    >
                        {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}

type ListingTab = 'active';

type ListingActionProps = {
    icon: ElementType<{ className?: string }>;
    label: string;
    onClick?: () => void;
    className?: string;
};

const listingTabs: { key: ListingTab; label: string }[] = [
    { key: 'active', label: 'Active' },
];

function toRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function stringifyValue(value: unknown): string {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);

    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return stringifyValue(record.name) || stringifyValue(record.title) || stringifyValue(record.label);
    }

    return '';
}

function getStringValue(listing: Listing, keys: string[], fallback = '—'): string {
    const record = toRecord(listing);

    for (const key of keys) {
        const value = stringifyValue(record[key]);
        if (value) return value;
    }

    return fallback;
}

function getNumberFromRecord(value: unknown, keys: string[], fallback = 0): number {
    const record = toRecord(value);

    for (const key of keys) {
        const fieldValue = record[key];

        if (typeof fieldValue === 'number' && Number.isFinite(fieldValue)) return fieldValue;
        if (Array.isArray(fieldValue)) return fieldValue.length;

        if (typeof fieldValue === 'string') {
            const number = Number(fieldValue);
            if (Number.isFinite(number)) return number;
        }
    }

    return fallback;
}

function getNumberValue(listing: Listing, keys: string[], fallback = 0): number {
    return getNumberFromRecord(listing, keys, fallback);
}

type ListingStats = {
    salesCount: number;
    totalFavorites: number;
    totalRatings: number;
    ratingSum: number;
    averageRating: number;
};

function ListingStatsMetaItems({ listing, status }: { listing: Listing; status: ListingTab }) {
    const initialFavorites = getNumberValue(listing, ['favorites', 'favorite_count', 'favoriteCount', 'likes']);
    const initialSoldCount = getSoldDisplay(listing, status);
    const [stats, setStats] = useState<ListingStats>({
        salesCount: initialSoldCount,
        totalFavorites: initialFavorites,
        totalRatings: 0,
        ratingSum: 0,
        averageRating: 0,
    });

    useEffect(() => {
        let ignore = false;

        const fetchStats = async () => {
            try {
                const nextStats = await getListingStats(listing.id);
                if (!ignore) {
                    setStats(current => ({
                        ...current,
                        salesCount: typeof nextStats.salesCount === 'number' ? nextStats.salesCount : current.salesCount,
                        totalFavorites: typeof nextStats.totalFavorites === 'number' ? nextStats.totalFavorites : current.totalFavorites,
                        totalRatings: typeof nextStats.totalRatings === 'number' ? nextStats.totalRatings : current.totalRatings,
                        ratingSum: typeof nextStats.ratingSum === 'number' ? nextStats.ratingSum : current.ratingSum,
                        averageRating: typeof nextStats.averageRating === 'number' ? nextStats.averageRating : current.averageRating,
                    }));
                }
            } catch (error) {
                console.error('Failed to load listing stats', error);
            }
        };

        fetchStats();

        return () => {
            ignore = true;
        };
    }, [listing.id]);

    return (
        <>
            <ListingMetaItem label="Sold" value={stats.salesCount} />
            <ListingMetaItem label="Favorites" value={stats.totalFavorites} />
        </>
    );
}

function formatCurrency(value: unknown): string {
    const amount = typeof value === 'number' ? value : Number(value);

    if (!Number.isFinite(amount)) return '$0';

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
}

function formatPrice(price: Listing['price']): string {
    return formatCurrency(price);
}

function formatDateString(dateValue: string): string {
    if (!dateValue) return '—';

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return dateValue;

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
}


function formatListingDate(listing: Listing): string {
    const dateValue = getStringValue(
        listing,
        ['listed_on', 'listedAt', 'listed_at', 'created', 'createdAt', 'created_at', 'updated'],
        ''
    );

    return formatDateString(dateValue);
}

function getOfferStatus(conversation: unknown): string {
    const record = toRecord(conversation);
    const status = stringifyValue(record.status).toLowerCase();

    if (
        record.saleConfirmed === true ||
        record.sale_confirmed === true ||
        status.includes('accepted') ||
        status.includes('confirmed')
    ) {
        return 'Accepted';
    }

    if (record.saleCancelled === true || record.sale_cancelled === true || status.includes('cancel')) {
        return 'Cancelled';
    }

    if (record.seller_archived === true || record.buyer_archived === true || status.includes('archived')) {
        return 'Archived';
    }

    return 'Pending';
}

function getOfferStatusClass(status: string): string {
    const normalizedStatus = status.toLowerCase();

    if (normalizedStatus === 'accepted') return 'bg-lime-100 text-lime-700';
    if (normalizedStatus === 'cancelled') return 'bg-red-100 text-red-600';
    if (normalizedStatus === 'archived') return 'bg-stone-100 text-stone-500';

    return 'bg-orange-100 text-orange-600';
}

function getSoldDisplay(listing: Listing, status: ListingTab): number {
    const soldCount = getNumberFromRecord(
        listing,
        ['soldCount', 'sold_count', 'quantitySold', 'quantity_sold', 'totalSold', 'total_sold', 'sold'],
        Number.NaN
    );

    if (!Number.isNaN(soldCount)) return soldCount;

    const record = toRecord(listing);

    return record.is_sold === true || record.sold === true ? 1 : 0;
}

function getListingCategory(listing: Listing): string {
    const expand = toRecord(toRecord(listing).expand);
    const expandedCategory = stringifyValue(expand.category);

    return expandedCategory || getStringValue(listing, ['category', 'categoryName', 'category_name', 'foodCategory'], 'Uncategorized');
}

function getListingStatus(listing: Listing): ListingTab {
    return 'active';
}

function getStatusLabel(status: ListingTab): string {
    return 'Active';
}

function getStatusClass(status: ListingTab): string {
    return 'bg-lime-100 text-lime-700';
}

function ListingTabButton({
    label,
    count,
    active,
    onClick,
}: {
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`relative flex items-center gap-4 pb-4 text-sm font-bold transition-colors ${
                active ? 'text-orange-500' : 'text-stone-500 hover:text-stone-900'
            }`}
        >
            <span>{label}</span>
            <span
                className={`flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm ${
                    active ? 'bg-orange-100 text-orange-500' : 'bg-stone-100 text-stone-500'
                }`}
            >
                {count}
            </span>
            {active && <span className="absolute bottom-0 left-0 h-1 w-full rounded-full bg-orange-500" />}
        </button>
    );
}

function ListingActionButton({ icon: Icon, label, onClick, className = '' }: ListingActionProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`group flex w-16 flex-col items-center gap-2 text-xs font-semibold text-stone-500 transition-colors hover:text-stone-900 ${className}`}
        >
            <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-stone-200 bg-white shadow-sm transition-all group-hover:border-stone-300 group-hover:shadow-md">
                <Icon className="h-5 w-5" />
            </span>
            <span>{label}</span>
        </button>
    );
}

function ListingMetaItem({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="min-w-0">
            <p className="mb-3 text-xs font-semibold text-stone-400">{label}</p>
            <p className="truncate text-sm font-bold text-stone-900">{value}</p>
        </div>
    );
}

export default function MyListingsPage() {
    const router = useRouter();
    const { listings, loading, error, refetch } = useMyListings();
    const { openListing } = useIsListing();

    const [selectedTab, setSelectedTab] = useState<ListingTab>('active');
    const [visibleCount, setVisibleCount] = useState(6);
    const [offersListing, setOffersListing] = useState<Listing | null>(null);
    const [editListing, setEditListing] = useState<Listing | null>(null);
    const [deleteListing, setDeleteListing] = useState<Listing | null>(null);

    useEffect(() => {
        if (!pb.authStore.isValid) {
            router.replace('/auth');
        }
    }, [router]);

    useEffect(() => {
        setVisibleCount(6);
    }, [selectedTab]);

    const groupedListings = useMemo(() => {
        return listings.reduce<Record<ListingTab, Listing[]>>(
            (groups, listing) => {
                groups[getListingStatus(listing)].push(listing);
                return groups;
            },
            { active: [] }
        );
    }, [listings]);

    const visibleListings = groupedListings[selectedTab];
    const renderedListings = visibleListings.slice(0, visibleCount);

    const emptyMessage = {
        active: "You don't have any active listings yet.",
    }[selectedTab];

    return (
        <div className="w-full min-h-screen bg-stone-50 px-6 py-10 sm:px-8 lg:px-12 xl:px-16">
            <div className="mx-auto max-w-[1600px]">
                {/* Header */}
                <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-stone-950">My Listings</h1>
                        <p className="mt-3 text-sm font-semibold text-stone-500">
                            Manage all your food listings in one place.
                        </p>
                    </div>

                    <Link
                        href="/createlisting"
                        className="inline-flex h-12 items-center justify-center gap-2 self-start rounded-xl bg-orange-500 px-6 text-sm font-bold text-white shadow-[0_12px_24px_rgba(249,115,22,0.25)] transition-all hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-[0_16px_28px_rgba(249,115,22,0.3)]"
                    >
                        <Plus className="h-4 w-4" />
                        New Listing
                    </Link>
                </div>

                {/* Tabs */}
                <div className="mb-6 flex flex-wrap items-center gap-12">
                    {listingTabs.map(tab => (
                        <ListingTabButton
                            key={tab.key}
                            label={tab.label}
                            count={groupedListings[tab.key].length}
                            active={selectedTab === tab.key}
                            onClick={() => setSelectedTab(tab.key)}
                        />
                    ))}
                </div>

                {/* States */}
                {loading && (
                    <div className="rounded-2xl border border-stone-100 bg-white p-10 text-center text-sm font-semibold text-stone-400 shadow-[0_12px_45px_rgba(28,25,23,0.08)]">
                        Loading your listings...
                    </div>
                )}
                {error && (
                    <div className="rounded-2xl border border-red-100 bg-white p-10 text-center text-sm font-semibold text-red-500 shadow-[0_12px_45px_rgba(28,25,23,0.08)]">
                        Failed to load listings.
                    </div>
                )}
                {!loading && !error && visibleListings.length === 0 && (
                    <div className="rounded-2xl border border-stone-100 bg-white p-10 text-center text-sm font-semibold text-stone-400 shadow-[0_12px_45px_rgba(28,25,23,0.08)]">
                        {emptyMessage}
                    </div>
                )}

                {/* List */}
                {!loading && !error && visibleListings.length > 0 && (
                    <>
                        <ul className="space-y-6">
                            {renderedListings.map(listing => {
                                const status = getListingStatus(listing);
                                const location = getStringValue(listing, ['location', 'city', 'neighborhood'], 'Neighborhood unavailable');
                                const description = getStringValue(
                                    listing,
                                    ['description', 'details', 'summary'],
                                    'No description provided yet.'
                                );

                                return (
                                    <li
                                        key={listing.id}
                                        className="rounded-2xl border border-stone-100 bg-white p-4 shadow-[0_12px_45px_rgba(28,25,23,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_55px_rgba(28,25,23,0.12)]"
                                    >
                                        <div className="flex flex-col gap-6 xl:flex-row xl:items-center">
                                            <button
                                                type="button"
                                                onClick={() => openListing(listing.id)}
                                                className="relative block h-56 w-full shrink-0 overflow-hidden rounded-xl bg-stone-100 sm:h-64 xl:h-[208px] xl:w-[240px]"
                                            >
                                                <img
                                                    src={getImageUrl(listing)}
                                                    alt={listing.title || 'Listing image'}
                                                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                                                />
                                                <span className="absolute bottom-4 right-4 rounded-full bg-white/85 px-4 py-2 text-sm font-extrabold text-stone-900 shadow-sm backdrop-blur-sm">
                                                    {formatPrice(listing.price)}
                                                </span>
                                            </button>

                                            <div className="min-w-0 flex-1 xl:max-w-[360px] xl:pr-8">
                                                <button type="button" onClick={() => openListing(listing.id)} className="group inline-block max-w-full text-left">
                                                    <h2 className="truncate text-xl font-extrabold text-stone-950 group-hover:text-orange-500">
                                                        {listing.title || 'Untitled listing'}
                                                    </h2>
                                                </button>

                                                <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-stone-400">
                                                    <MapPin className="h-4 w-4 shrink-0" />
                                                    <span className="truncate">{location}</span>
                                                </div>

                                                <p className="mt-5 line-clamp-2 text-sm font-medium leading-6 text-stone-500">
                                                    {description}
                                                </p>

                                                <span
                                                    className={`mt-5 inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(status)}`}
                                                >
                                                    {getStatusLabel(status)}
                                                </span>
                                            </div>

                                            <div className="grid flex-[1.4] grid-cols-2 gap-x-8 gap-y-6 border-t border-stone-100 pt-6 sm:grid-cols-3 lg:grid-cols-5 xl:border-l xl:border-t-0 xl:py-6 xl:pl-8">
                                                <ListingMetaItem label="Price" value={formatPrice(listing.price)} />
                                                <ListingMetaItem label="Category" value={getListingCategory(listing)} />
                                                <ListingMetaItem label="Listed on" value={formatListingDate(listing)} />
                                                <ListingStatsMetaItems listing={listing} status={status} />
                                            </div>

                                            <div className="flex shrink-0 items-start gap-3 border-t border-stone-100 pt-6 xl:border-l xl:border-t-0 xl:py-4 xl:pl-8">
                                                <ListingActionButton
                                                    icon={ClipboardList}
                                                    label="Offers"
                                                    onClick={() => setOffersListing(listing)}
                                                />
                                                <ListingActionButton
                                                    icon={Pencil}
                                                    label="Edit"
                                                    onClick={() => setEditListing(listing)}
                                                />
                                                <ListingActionButton
                                                    icon={Trash2}
                                                    label="Delete"
                                                    onClick={() => setDeleteListing(listing)}
                                                    className="hover:text-red-500"
                                                />
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>

                        <div className="mt-10 flex justify-center">
                            <button
                                type="button"
                                onClick={() => setVisibleCount(count => Math.min(count + 6, visibleListings.length))}
                                className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-5 py-3 text-sm font-bold text-stone-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                            >
                                Load more
                                <ChevronDown className="h-4 w-4" />
                            </button>
                        </div>
                    </>
                )}

                {/* Modals */}
                {offersListing && (
                    <OffersModal
                        listing={offersListing}
                        onClose={() => setOffersListing(null)}
                    />
                )}
                {editListing && (
                    <EditListingModal
                        listing={editListing}
                        onClose={() => setEditListing(null)}
                        onSaved={refetch}
                    />
                )}
                {deleteListing && (
                    <DeleteModal
                        listing={deleteListing}
                        onClose={() => setDeleteListing(null)}
                        onDeleted={refetch}
                    />
                )}
            </div>
        </div>
    );
}