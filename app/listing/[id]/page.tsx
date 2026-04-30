'use client';
import React, { useState, useEffect } from 'react';
import pb from "@/app/lib/pb"
import { useParams, useRouter } from 'next/navigation';
import PillButton from "@/app/components/PillButton"
import InputField from "@/app/components/InputField"
import EditListingModal from '@/app/components/EditListingModal';
import { useStartConversation } from "../../hooks";
import { useCurrentUser } from "@/app/hooks/useCurrentUser";
import { isBlockedBy } from "@/app/lib/blockUtils";
import type { Listing } from '@/app/types/listing';

type Seller = {
    displayName: string;
    firstName: string;
    lastName: string;
    avatar: string;
    rating: number;
    created: string;
    id: string;
};

export default function ItemPage() {
    const id = useParams().id as string;
    const router = useRouter();
    const currentUserId = useCurrentUser();
    const [listing, setListing] = useState<Listing | null>(null);
    const [seller, setSeller] = useState<Seller | null>(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showOfferModal, setShowOfferModal] = useState(false);
    const [offerAmount, setOfferAmount] = useState('');
    const [offerError, setOfferError] = useState<string | undefined>(undefined);
    const [isBlocked, setIsBlocked] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const { startConversation, loading: messagingLoading } = useStartConversation(seller?.id || '');

    const renderStars = (rating: number) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            if (i <= Math.round(rating)) {
                stars.push(<span key={i} className="text-yellow-400 text-4xl">★</span>);
            } else {
                stars.push(<span key={i} className="text-gray-300 text-4xl">★</span>);
            }
        }
        return stars;
    };

    const fetchListing = async () => {
        const data = await pb.collection("listings").getOne<Listing>(id);
        setListing(data);
        const data2 = await pb.collection("users").getOne<Seller>(data.seller);
        setSeller(data2);
    };

    useEffect(() => {
        fetchListing();
    }, [id]);

    // Show "unavailable" page if the listing seller has blocked current user
    useEffect(() => {
        if (!seller || !currentUserId) return;
        
        const checkBlocked = async () => {
            const blockedBy = await isBlockedBy(currentUserId, seller.id);
            if (blockedBy) {
                setIsBlocked(true);
            }
        };
        checkBlocked();
    }, [seller, currentUserId]);

    // Show unavailable page if blocked
    if (isBlocked) {
        return (
            <div className="min-h-screen bg-[#f5f5f7] p-4">
            <div className="max-w-lg mx-auto pt-20">
                <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] px-7 py-12 text-center">
                    <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Listing Unavailable</h1>
                    <p className="text-sm text-gray-400 mt-2">This listing is not available.</p>
                </div>
            </div>
        </div>
        );
    }

    const handleOpenOfferModal = () => {
        setOfferAmount('');
        setOfferError(undefined);
        setShowOfferModal(true);
    };

    const handleSubmitOffer = () => {
        const amount = parseFloat(offerAmount);
        if (!offerAmount || isNaN(amount) || amount <= 0) {
            setOfferError('Please enter a valid offer amount.');
            return;
        }
        if (listing && amount >= listing.price) {
            setOfferError(`Offer must be below the asking price ($${listing.price.toFixed(2)}).`);
            return;
        }
        setOfferError(undefined);
        setShowOfferModal(false);
        startConversation(id, amount);
    };

    if (!listing) return <div>Loading...</div>;
    if (!seller) return <div>Loading...</div>;
    //check if logged in user is the owner of the listing
    const isOwner = listing.seller === currentUserId;
    const handleEditListing = () => {
        setIsEditing(true);
    };


    return (
        <div className="flex h-screen font-sans items-center justify-center bg-gray-100">
            <div className="transform scale-90 origin-center">
                <div className="flex h-screen w-screen rounded-lg shadow-lg overflow-hidden">
                    {/* Left Thumbnail Gallery */}
                    <div className="w-24 h-full bg-gray-100 flex flex-col gap-2 p-2 overflow-y-auto">
                        <img
                            src={pb.files.getURL(listing, listing.main_image, { thumb: '80x80' }) || '/placeholder.jpg'}
                            alt={`${listing.title} - Main`}
                            onClick={() => setCurrentImageIndex(0)}
                            className={`w-20 h-20 object-cover cursor-pointer rounded transition-all ${
                                currentImageIndex === 0 ? 'ring-2 ring-blue-500 ring-offset-2' : 'opacity-60 hover:opacity-100'
                            }`}
                        />
                        {listing.images && listing.images.length > 0 && listing.images.map((image, index) => (
                            <img
                                key={index + 1}
                                src={pb.files.getURL(listing, image, { thumb: '80x80' }) || '/placeholder.jpg'}
                                alt={`${listing.title} ${index + 1}`}
                                onClick={() => setCurrentImageIndex(index + 1)}
                                className={`w-20 h-20 object-cover cursor-pointer rounded transition-all ${
                                    currentImageIndex === index + 1 ? 'ring-2 ring-blue-500 ring-offset-2' : 'opacity-60 hover:opacity-100'
                                }`}
                            />
                        ))}
                    </div>

                    {/* Main Image Display */}
                    <div className="flex-2 h-full bg-white flex items-center justify-center">
                        <img
                            src={pb.files.getURL(listing, currentImageIndex === 0 ? listing.main_image : listing.images?.[currentImageIndex - 1] as string, { thumb: '512x512' }) || '/placeholder.jpg'}
                            alt={listing.title}
                            className="max-h-full max-w-full object-contain"
                        />
                    </div>

                    {/* Right Info Panel */}
                    <div className="flex-1 p-10 flex flex-col justify-center bg-white border-l border-gray-200">
                        <h1 className="text-6xl font-black mb-4">{listing.title}</h1>
                        <p className="text-2xl mb-4"><strong>Location: </strong>{listing.location}</p>
                        <p className="font-bold text-4xl mb-4">${listing.price.toFixed(2)}</p>
                        <div className="flex items-center mt-2.5 mb-4 cursor-pointer" onClick={() => router.push(`/profile/${seller.id}`)}>
                            <div className="w-24 h-24 mr-2.5">
                                <img
                                    className="w-full h-full object-cover object-center rounded-full hover:opacity-80 transition-opacity"
                                    src={pb.files.getURL(seller, seller.avatar, { thumb: "80x80" })}
                                    alt="Seller Profile Picture"
                                />
                            </div>
                            <div>
                                <p className="text-2xl font-bold m-0">
                                    {seller.displayName !== "" ? seller.displayName : `${seller.firstName} ${seller.lastName}`}
                                </p>
                                <div className="mt-1.25 flex gap-1">{renderStars(seller.rating)}</div>
                                <p className="text-lg mt-1.25 m-0">Joined {new Date(seller.created).toLocaleDateString()}</p>
                            </div>
                        </div>

                        <div className="mt-5 flex gap-4">
                            {/* check if current user is the owner of the listing */}
                            {isOwner ? (
                                <PillButton
                                    type="button"
                                    onClick={handleEditListing}
                                    className="w-full"
                                >
                                    Edit Listing
                                </PillButton>
                            ) : (
                                <>
                                    {/* if not owner show purchase options */}
                                    <PillButton
                                        type="button"
                                        onClick={() => startConversation(id, listing.price)}
                                        disabled={messagingLoading}
                                        className="w-full"
                                    >
                                        {messagingLoading ? 'Opening...' : 'Buy'}
                                    </PillButton>
                                    <PillButton
                                        type="button"
                                        onClick={handleOpenOfferModal}
                                        disabled={messagingLoading}
                                        className="w-full"
                                    >
                                        Make Offer
                                    </PillButton>
                                </>
                            )}
                        </div>
                        {/* listing description */}
                        <p className ="font-bold text-2xl mt-5">Description:</p>
                        <p className="text-2xl">{listing.description}</p>
                    </div>
                </div>
            </div>

            {isEditing && listing && (
                <EditListingModal
                    listing={listing}
                    onClose={() => setIsEditing(false)}
                    onSaved={() => {
                        setIsEditing(false);
                        fetchListing();
                    }}
                />
            )}

            {/* Make Offer Modal */}
            {showOfferModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm mx-4 flex flex-col gap-4">
                        <h2 className="text-2xl font-bold text-gray-900">Make an Offer</h2>
                        <p className="text-sm text-gray-500">
                            Asking price: <span className="font-semibold text-gray-800">${listing.price.toFixed(2)}</span>
                        </p>
                        <InputField
                            label="Your Offer ($)"
                            fieldType="textS"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            error={offerError}
                            value={offerAmount}
                            onChange={e => {
                                setOfferAmount(e.target.value);
                                setOfferError(undefined);
                            }}
                        />
                        <div className="flex gap-3">
                            <PillButton
                                type="button"
                                onClick={() => setShowOfferModal(false)}
                                className="w-full"
                            >
                                Cancel
                            </PillButton>
                            <PillButton
                                type="button"
                                onClick={handleSubmitOffer}
                                disabled={messagingLoading}
                                className="w-full"
                            >
                                {messagingLoading ? 'Sending...' : 'Send Offer'}
                            </PillButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}