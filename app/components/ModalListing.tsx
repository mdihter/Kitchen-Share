"use client";

import Image from "next/image";
import {useEffect, useMemo, useState} from "react";
import {
    ChevronLeft,
    ChevronRight,
    Leaf,
    MapPin,
    MessageCircleMore, Share2,
    ShoppingBag,
    Star,
    X,
} from "lucide-react";
import { useIsListing } from "@/app/providers/ListingProvider";
import pb from "@/app/lib/pb";
import Link from "next/link";
import {useCurrentUser, useStartConversation} from "@/app/hooks";
import {toast} from "react-toastify";
import {useIsLogin} from "@/app/providers/LoginProvider";
import {usePathname} from "next/navigation";

type ListingRecord = {
    id: string;
    title: string;
    description: string;
    seller: string;
    price: number;
    location: string;
    main_image: string;
    images?: string[];
    sizeLabel?: string;
    badgeLabel?: string;
    distanceAway?: string;
    servings?: string;
    reviewCount?: number;
    mealsSold?: number;
    kitchenNote?: string;
};

type SellerRecord = {
    id: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    rating?: number;
    reviewCount?: number;
    mealsSold?: number;
    created?: string;
};

function getSellerName(seller: SellerRecord) {
    const fullName = `${seller.firstName ?? ""} ${seller.lastName ?? ""}`.trim();
    return seller.displayName?.trim() || fullName || "Seller";
}

function getListingImages(listing: ListingRecord) {
    return [listing.main_image, ...(listing.images ?? [])].filter(Boolean);
}

function getImageUrl(record: ListingRecord | SellerRecord, file?: string, thumb?: string) {
    if (!file) return "/placeholder.png";
    return pb.files.getURL(record as never, file, thumb ? { thumb } : undefined);
}

function formatPrice(value: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
    }).format(value);
}

function splitDescription(description: string, fallbackServings?: string) {
    const parts = description
        .split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z])/)
        .map((part) => part.trim())
        .filter(Boolean);

    if (parts.length >= 2) return parts;

    return [
        description.trim()
    ].filter(Boolean);
}

export default function ModalListing() {
    const {
        open,
        loading,
        error,
        data,
        activeIndex,
        setActiveIndex,
        nextImage,
        previousImage,
        closeListing,
    } = useIsListing();

    const {isOnLogin, setIsOnLogin} = useIsLogin();
    const currentUser = useCurrentUser();

    useEffect(() => {
        if (!open) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") closeListing();
            if (event.key === "ArrowLeft") previousImage();
            if (event.key === "ArrowRight") nextImage();
        };

        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKeyDown);

        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [open, closeListing, nextImage, previousImage]);

    const [isOfferOpen, setIsOfferOpen] = useState(false);
    const [offerAmount, setOfferAmount] = useState("0");

    const images = useMemo(() => {
        if (!data) return [];
        return getListingImages(data.listing as ListingRecord);
    }, [data]);

    useEffect(() => {
        if (!open) {
            setIsOfferOpen(false);
            setOfferAmount("0");
        }
    }, [open]);

    const handleBuy = () => {
        if (!currentUser){
            closeListing();
            setIsOnLogin(true);
            return;
        }
        startConversation(listing.id, listing.price, 'buy');
    }

    const handleOffer = () => {
        if (!currentUser){
            closeListing();
            setIsOnLogin(true);
            return;
        }
        setOfferAmount("0");
        setIsOfferOpen(true);
    };

    const closeOfferModal = () => {
        setIsOfferOpen(false);
        setOfferAmount("0");
    };

    const handleConfirmOffer = () => {
        if (!data) return;

        const parsedOfferAmount = Math.max(0, Number(offerAmount) || 0);
        startConversation((data.listing as ListingRecord).id, parsedOfferAmount, 'offer');
        closeOfferModal();
    };

    const { startConversation, loading: messagingLoading } = useStartConversation(data?.seller.id || "");

    const handleShare = async () => {
        if (!data || typeof window === "undefined") return;

        const listing = data.listing as ListingRecord;
        const shareUrl = window.location.href;
        const shareData = {
            title: listing.title,
            text: `Check out ${listing.title} for ${formatPrice(listing.price)} on Neighborhood Eats.`,
            url: shareUrl,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
                toast.success("Link copied to clipboard!");
                return;
            }

            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(shareUrl);
                toast.success("Link copied to clipboard!");
            }
        } catch (error) {
            if ((error as Error)?.name === "AbortError") return;
            toast.error("Failed to share listing. Please try again.");
            console.error("Share failed", error);
        }
    };

    const pathname = usePathname();
    const hideBuyButtons = pathname.includes("messages/");

    useEffect(() => {
        if (open) closeListing();
    }, [pathname]);

    useEffect(() => {
        if (isOnLogin) closeListing();
    }, [isOnLogin]);

    if (!open) return null;

    if (loading) {
        return (
            <div className="fixed w-full h-full z-50 grid place-items-center bg-black/40 p-4">
                <div className="w-full max-w-[560px] rounded-[32px] bg-white p-10 text-center shadow-2xl">
                    <div className="text-lg font-medium text-neutral-500">Loading listing...</div>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
                <div className="w-full max-w-[560px] rounded-[32px] bg-white p-10 text-center shadow-2xl">
                    <div className="text-lg font-medium text-neutral-500">{error ?? "Listing not found."}</div>
                </div>
            </div>
        );
    }

    const listing = data.listing as ListingRecord;
    const seller = data.seller as SellerRecord;
    const activeImage = images[activeIndex] ?? images[0];
    const sellerName = getSellerName(seller);
    const descriptionParts = splitDescription(listing.description, listing.servings);
    const rating = seller.rating ?? 5;
    const reviewCount = seller.reviewCount ?? 24;
    const mealsSold = seller.mealsSold ?? 39;
    const badgeLabel = "Fresh";
    const kitchenNote = "Made with love by a neighbor.";

    return (
            <div
                className="fixed top-0 h-screen w-full z-40 flex items-center justify-center bg-black/35 px-3 py-4 sm:px-5"
                onClick={closeListing}
                role="dialog"
                aria-modal="true"
                aria-labelledby="listing-modal-title"
            >
                <div
                    className="relative max-h-[96vh] max-w-[1450px] overflow-hidden rounded-[30px] bg-[#fbfbfb] shadow-[0_30px_80px_rgba(0,0,0,0.18)] scale-70 object-scale-down"
                    onClick={(event) => event.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={closeListing}
                        aria-label="Close modal"
                        className="absolute right-6 top-6 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-neutral-800 shadow-sm ring-1 ring-black/10 transition hover:bg-neutral-50"
                    >
                        <X className="h-7 w-7" strokeWidth={2.25} />
                    </button>

                    <div className="grid max-h-[96vh] grid-cols-1 overflow-y-auto xl:grid-cols-[1.18fr_1fr]">
                        <div className="p-5 sm:p-7 xl:p-8">
                            <div className="relative overflow-hidden rounded-[26px] bg-black border border-black/10 shadow-inner">
                                <div className="absolute left-7 top-6 z-20 rounded-full bg-[#78aa50] px-5 py-2 text-[15px] font-semibold text-white shadow-sm">
                                    {badgeLabel}
                                </div>

                                <div className="flex items-center justify-center relative aspect-square w-full">
                                    <img
                                        src={getImageUrl(listing, activeImage, "1400x1200")}
                                        alt={listing.title}
                                        className="object-contain h-full w-full z-50"
                                        sizes="(max-width: 1280px) 100vw, 58vw"
                                    />
                                    <img
                                        src={getImageUrl(listing, activeImage, "1400x1200")}
                                        alt={listing.title}
                                        className="absolute top-0 left-0 object-cover h-full w-full blur opacity-40"
                                        sizes="(max-width: 1280px) 100vw, 58vw"
                                    />
                                </div>
                            </div>

                            <div className="mt-7 flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={previousImage}
                                    aria-label="Previous image"
                                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-neutral-700 shadow-sm ring-1 ring-black/10 transition hover:bg-neutral-50"
                                >
                                    <ChevronLeft className="h-6 w-6" />
                                </button>

                                <div className="flex min-w-0 flex-1 gap-4 overflow-x-auto pb-1">
                                    {images.map((image, index) => {
                                        const isActive = index === activeIndex;

                                        return (
                                            <button
                                                key={`${image}-${index}`}
                                                type="button"
                                                onClick={() => setActiveIndex(index)}
                                                aria-label={`View image ${index + 1}`}
                                                aria-pressed={isActive}
                                                className={`relative h-[126px] w-[142px] shrink-0 overflow-hidden rounded-[20px] bg-neutral-100 ring-1 transition ${
                                                    isActive
                                                        ? "ring-[3px] ring-[#f97316]"
                                                        : "ring-black/10 hover:ring-black/20"
                                                }`}
                                            >
                                                <img
                                                    src={getImageUrl(listing, image, "320x320")}
                                                    alt={`${listing.title} image ${index + 1}`}
                                                    className="object-cover h-full w-full"
                                                    sizes="142px"
                                                />
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    type="button"
                                    onClick={nextImage}
                                    aria-label="Next image"
                                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-neutral-700 shadow-sm ring-1 ring-black/10 transition hover:bg-neutral-50"
                                >
                                    <ChevronRight className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        <div className="border-t border-black/10 p-6 sm:p-8 xl:border-l xl:border-t-0 xl:px-14 xl:py-16">
                            <div className="space-y-8">
                                <div>
                                    <h2
                                        id="listing-modal-title"
                                        className="max-w-[620px] text-[38px] font-semibold leading-[1.08] tracking-[-0.03em] text-neutral-950 sm:text-[48px]"
                                    >
                                        {listing.title}
                                    </h2>

                                    <div className="mt-6 flex flex-wrap items-end gap-x-5 gap-y-2">
                                        <div className="text-[54px] font-bold leading-none tracking-[-0.04em] text-[#2f7d32]">
                                            {formatPrice(listing.price)}
                                        </div>
                                    </div>

                                    <div className="mt-8 flex items-start gap-3 text-neutral-700">
                                        <MapPin className="mt-1 h-5 w-5 shrink-0" />
                                        <div>
                                            <div className="text-[20px] font-medium leading-tight text-neutral-800">
                                                {listing.location}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-black/10 pt-8">
                                    <div className="text-[16px] font-medium text-neutral-500">Sold by</div>

                                    <Link href={`profile/${seller.id}`}>
                                        <div className="mt-5 flex items-center gap-4">
                                            <div className="relative h-17 w-17 overflow-hidden rounded-full bg-neutral-100 ring-1 ring-black/5">
                                                <img
                                                    src={getImageUrl(seller, seller.avatar, "160x160")}
                                                    alt={sellerName}
                                                    className="object-cover h-full"
                                                    sizes="68px"
                                                />
                                            </div>

                                            <div>
                                                <div className="text-[22px] font-semibold leading-tight text-neutral-900">
                                                    {sellerName}
                                                </div>
                                                <div className="mt-2 flex flex-wrap items-center gap-2 text-[16px] text-neutral-500">
                                          <span className="inline-flex items-center gap-1.5 font-medium text-[#2f7d32]">
                                            <Star className="h-4 w-4 fill-current" />
                                              {rating.toFixed(1)} ({reviewCount})
                                          </span>
                                                    <span aria-hidden="true">•</span>
                                                    <span>{mealsSold} meals sold</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </div>

                                <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2">
                                    {!hideBuyButtons && <>
                                    <button
                                        onClick={() => handleBuy()}
                                        disabled={messagingLoading}
                                        type="button"
                                        className="inline-flex min-h-[84px] items-center justify-center gap-3 rounded-[18px] bg-[#f97316] px-6 text-[20px] font-semibold text-white shadow-sm transition hover:bg-[#ea6a12]"
                                    >
                                        <ShoppingBag className="h-5 w-5" />
                                        Buy Now
                                    </button>

                                    <button
                                        onClick={handleOffer}
                                        type="button"
                                        className="inline-flex min-h-[84px] items-center justify-center gap-3 rounded-[18px] border-2 border-[#f59d63] bg-white px-6 text-[20px] font-semibold text-[#f97316] transition hover:bg-orange-50"
                                    >
                                        <MessageCircleMore className="h-5 w-5" />
                                        Make Offer
                                    </button>
                                        </>}
                                    <button
                                        onClick={handleShare}
                                        type="button"
                                        aria-label="Share listing"
                                        title="Share listing"
                                        className="inline-flex h-12 w-12 shrink-0 items-center justify-center self-center rounded-full text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-600" // ADDED
                                    >
                                        <Share2 className="h-4.5 w-4.5" />
                                    </button>
                                </div>

                                <div className="border-t border-black/10 pt-9">
                                    <h3 className="text-[22px] font-semibold text-neutral-950">Description</h3>

                                    <div className="mt-5 space-y-6 text-[18px] leading-[1.65] text-neutral-700">
                                        {descriptionParts.map((part, index) => (
                                            <p key={index}>{part}</p>
                                        ))}
                                    </div>

                                    <div className="mt-10 inline-flex items-center gap-2.5 text-[18px] font-medium text-[#5f8f43]">
                                        <Leaf className="h-5 w-5" />
                                        {kitchenNote}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {isOfferOpen && (
                        <div
                            className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
                            onClick={closeOfferModal}
                        >
                            <div
                                className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl sm:p-7"
                                onClick={(event) => event.stopPropagation()}
                            >
                                <h3 className="text-[28px] font-semibold text-neutral-950">Make Offer</h3>
                                <p className="mt-2 text-[16px] text-neutral-600">Enter your offer amount.</p>

                                <label className="mt-6 block">
                                    <span className="mb-2 block text-[15px] font-medium text-neutral-700">Offer amount</span>
                                    <input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={offerAmount}
                                        onChange={(event) => {
                                            const nextValue = event.target.value;
                                            if (nextValue === "") {
                                                setOfferAmount("");
                                                return;
                                            }

                                            setOfferAmount(String(Math.max(0, Number(nextValue) || 0)));
                                        }}
                                        className="w-full rounded-[16px] border border-black/10 px-4 py-3 text-[18px] text-neutral-900 outline-none transition focus:border-[#f97316]"
                                        placeholder="0.00"
                                    />
                                </label>

                                <div className="mt-6 grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={handleConfirmOffer}
                                        disabled={messagingLoading}
                                        className="inline-flex min-h-[56px] items-center justify-center rounded-[16px] bg-[#f97316] px-4 text-[18px] font-semibold text-white transition hover:bg-[#ea6a12] disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                        Confirm
                                    </button>
                                    <button
                                        type="button"
                                        onClick={closeOfferModal}
                                        className="inline-flex min-h-[56px] items-center justify-center rounded-[16px] border border-black/10 bg-white px-4 text-[18px] font-semibold text-neutral-700 transition hover:bg-neutral-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
    );
}
