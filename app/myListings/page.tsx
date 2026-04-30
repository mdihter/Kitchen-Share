'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Trash2, Pencil, CheckCircle, X} from 'lucide-react';
import pb from '@/app/lib/pb';
import { useMyListings } from '@/app/hooks/useMyListings';
import type { Listing } from '@/app/types/listing';
import PillButton from '@/app/components/PillButton';
import EditListingModal from '@/app/components/EditListingModal';

// ─── Types ────────────────────────────────────────────────────────────────────

type Buyer = {
    id: string;
    conversationId: string;
    displayName: string;
    email: string;
    avatar: string;
    offerPrice: number;
};

function getImageUrl(listing: Listing): string {
    if (!listing.main_image) return '/placeholder.jpg';
    return pb.files.getURL(listing, listing.main_image, { thumb: '640x480' });
}


function ConfirmSaleModal({
    listing,
    onClose,
    onSold,
}: {
    listing: Listing;
    onClose: () => void;
    onSold: () => void;
}) {
    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirming, setConfirming] = useState(false);
    const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBuyers = async () => {
            try {
                const conversations = await pb.collection('conversations').getFullList({
                    filter: `listing = "${listing.id}" && saleConfirmed = false`,
                    expand: 'buyer',
                });

                const buyerList: Buyer[] = conversations
                    .filter(c => c.expand?.buyer)
                    .map(c => ({
                        id: c.expand!.buyer.id,
                        conversationId: c.id,
                        displayName:
                            c.expand!.buyer.displayName ||
                            `${c.expand!.buyer.firstName ?? ''} ${c.expand!.buyer.lastName ?? ''}`.trim() ||
                            c.expand!.buyer.email,
                        email: c.expand!.buyer.email,
                        avatar: c.expand!.buyer.avatar
                            ? pb.files.getURL(c.expand!.buyer, c.expand!.buyer.avatar, { thumb: '80x80' })
                            : '',
                        offerPrice: c.offerPrice ?? 0,
                    }));

                setBuyers(buyerList);
            } catch {
                setError('Failed to load buyers.');
            } finally {
                setLoading(false);
            }
        };
        fetchBuyers();
    }, [listing.id]);

    const handleConfirm = async () => {
        if (!selectedBuyer) return;
        setConfirming(true);
        try {

            await pb.collection('listings').update(listing.id, {
                buyer: selectedBuyer.id,
            });

            // Update the conversation with a confirmed message
            await pb.collection('conversations').update(selectedBuyer.conversationId, {
                last_message: 'Seller has confirmed the purchase.',
                saleConfirmed: true,
            });

            // Increment seller's successfulListings
            const seller = await pb.collection('users').getOne(pb.authStore.record?.id ?? '');
            await pb.collection('users').update(pb.authStore.record?.id ?? '', {
                successfulListings: (seller.successfulListings ?? 0) + 1,
            });

            onSold();
            onClose();
        } catch {
            setError('Failed to confirm sale. Please try again.');
        } finally {
            setConfirming(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
                    <div>
                        <h2 className="text-lg font-bold text-stone-900">Confirm Sale</h2>
                        <p className="text-sm text-stone-400 mt-0.5">{listing.title}</p>
                    </div>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-700 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {loading && (
                        <p className="text-sm text-stone-400 text-center py-8">Loading buyers...</p>
                    )}
                    {error && (
                        <p className="text-sm text-red-500 text-center py-8">{error}</p>
                    )}
                    {!loading && !error && buyers.length === 0 && (
                        <p className="text-sm text-stone-400 text-center py-8">
                            No offers yet on this listing.
                        </p>
                    )}
                    {!loading && !error && buyers.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <p className="text-xs text-stone-400 mb-2">Select who you sold to:</p>
                            {buyers.map(buyer => (
                                <button
                                    key={buyer.conversationId}
                                    onClick={() => setSelectedBuyer(buyer)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                                        selectedBuyer?.conversationId === buyer.conversationId
                                            ? 'border-stone-900 bg-stone-50'
                                            : 'border-stone-200 hover:border-stone-400'
                                    }`}
                                >
                                    {buyer.avatar ? (
                                        <img
                                            src={buyer.avatar}
                                            alt={buyer.displayName}
                                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0 text-stone-500 text-sm font-bold">
                                            {buyer.displayName[0]?.toUpperCase()}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-stone-900 truncate">{buyer.displayName}</p>
                                        <p className="text-xs text-stone-400 truncate">{buyer.email}</p>
                                    </div>
                                    {buyer.offerPrice > 0 && (
                                        <span className="text-sm font-bold text-stone-900 flex-shrink-0">
                                            ${buyer.offerPrice.toFixed(2)}
                                        </span>
                                    )}
                                    {selectedBuyer?.conversationId === buyer.conversationId && (
                                        <CheckCircle className="w-5 h-5 text-stone-900 flex-shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
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
                        onClick={handleConfirm}
                        disabled={!selectedBuyer || confirming}
                        className="flex-1 py-2.5 text-sm font-semibold text-white bg-stone-900 rounded-full hover:bg-stone-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {confirming ? 'Confirming...' : 'Confirm Sale'}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
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

export default function MyListingsPage() {
    const router = useRouter();
    const { listings, loading, error, refetch } = useMyListings();

    const [confirmSaleListing, setConfirmSaleListing] = useState<Listing | null>(null);
    const [editListing, setEditListing] = useState<Listing | null>(null);
    const [deleteListing, setDeleteListing] = useState<Listing | null>(null);

    useEffect(() => {
        if (!pb.authStore.isValid) {
            router.replace('/auth');
        }
    }, [router]);

    return (
        <div className="max-w-5xl mx-auto px-6 py-10">

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-stone-900">My Listings</h1>
            </div>

            {/* Stats */}
            <div className="flex gap-8 mb-10">
                <div>
                    <p className="text-2xl font-bold text-stone-900">{listings.length}</p>
                    <p className="text-sm text-stone-400">Posts</p>
                </div>
            </div>

            {/* States */}
            {loading && (
                <div className="text-center py-16 text-stone-400 text-sm">Loading your listings...</div>
            )}
            {error && (
                <div className="text-center py-16 text-red-500 text-sm">Failed to load listings.</div>
            )}
            {!loading && !error && listings.length === 0 && (
                <div className="text-center py-16 text-stone-400 text-sm">You haven't posted any listings yet.</div>
            )}

            {/* Grid */}
            {!loading && !error && listings.length > 0 && (
                <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                    {listings.map((listing) => (
                        <li key={listing.id} className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col">
                            <Link href={`/listing/${listing.id}`} className="block">
                                <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
                                    <img
                                        src={getImageUrl(listing)}
                                        alt={listing.title}
                                        className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                                    />
                                    <div className="absolute bottom-3 right-3 rounded-full bg-white/60 px-3 py-1 text-sm font-semibold text-stone-900 shadow-sm backdrop-blur-sm">
                                        ${Number(listing.price).toLocaleString()}
                                    </div>
                                </div>
                                <div className="p-4 space-y-1">
                                    <h3 className="line-clamp-1 text-base font-semibold text-stone-900">
                                        {listing.title || 'Unknown'}
                                    </h3>
                                    <div className="flex items-center gap-1 text-sm text-stone-500">
                                        <MapPin className="h-3.5 w-3.5" />
                                        <span className="line-clamp-1">{listing.location || 'Neighborhood unavailable'}</span>
                                    </div>
                                </div>
                            </Link>

                            {/* Action buttons */}
                            <div className="px-4 pb-4 mt-auto flex flex-col gap-2">
                                <PillButton
                                    onClick={() => setConfirmSaleListing(listing)}
                                    className="w-full"
                                >
                                    Confirm Sale
                                </PillButton>
                                <div className="flex gap-2">
                                    <PillButton
                                        onClick={() => setEditListing(listing)}
                                        className="flex-1 flex items-center justify-center gap-1.5"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                        Edit
                                    </PillButton>
                                    <PillButton
                                        onClick={() => setDeleteListing(listing)}
                                        className="!border-red-500 !text-red-500 hover:!bg-red-500/10 px-3"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </PillButton>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {/* Modals */}
            {confirmSaleListing && (
                <ConfirmSaleModal
                    listing={confirmSaleListing}
                    onClose={() => setConfirmSaleListing(null)}
                    onSold={refetch}
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
    );
}
