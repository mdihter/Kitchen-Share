"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Leaf,
  MapPin,
  MessageCircleMore,
  Share2,
  ShoppingBag,
  Star,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";

type PreviewListingInfo = {
  id?: string;
  title: string;
  description: string;
  price: number;
  location: string;
  mainImage?: string;
  images?: string[];
  badgeLabel?: string;
  kitchenNote?: string;
};

type PreviewSellerInfo = {
  id?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  averageRating?: number;
  totalRatings?: number;
  totalSold?: number;
};

type PreviewListingProps = {
  open: boolean;
  listing: PreviewListingInfo;
  seller?: PreviewSellerInfo;
  loading?: boolean;
  error?: string | null;
  hideBuyButtons?: boolean;
  profileHref?: string;
  onClose: () => void;
  onBuy?: (listing: PreviewListingInfo) => void;
  onOffer?: (amount: number, listing: PreviewListingInfo) => void;
  onShare?: (listing: PreviewListingInfo) => void | Promise<void>;
};

const fallbackSeller: PreviewSellerInfo = {
  displayName: "Seller",
  averageRating: 0,
  totalRatings: 0,
  totalSold: 0,
};

function getSellerName(seller: PreviewSellerInfo) {
  const fullName = `${seller.firstName ?? ""} ${seller.lastName ?? ""}`.trim();
  return seller.displayName?.trim() || fullName || "Seller";
}

function getListingImages(listing: PreviewListingInfo) {
  return [listing.mainImage, ...(listing.images ?? [])].filter(Boolean) as string[];
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value || 0);
}

function splitDescription(description: string) {
  return description
    .split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z])/) 
    .map((part) => part.trim())
    .filter(Boolean);
}

export default function PreviewModalListing({
  open,
  listing,
  seller = fallbackSeller,
  loading = false,
  error = null,
  hideBuyButtons = false,
  profileHref,
  onClose,
  onBuy,
  onOffer,
  onShare,
}: PreviewListingProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("0");

  const images = useMemo(() => getListingImages(listing), [listing]);
  const activeImage = images[activeIndex] ?? images[0] ?? "/placeholder.jpg";
  const sellerName = getSellerName(seller);
  const descriptionParts = splitDescription(listing.description);
  const kitchenNote = listing.kitchenNote ?? "Made with love by a neighbor.";
  const sellerProfileHref = profileHref ?? (seller.id ? `/profile/${seller.id}` : undefined);

  useEffect(() => {
    setActiveIndex(0);
  }, [listing.mainImage, listing.images]);

  const previousImage = () => {
    if (!images.length) return;
    setActiveIndex((current) => (current - 1 + images.length) % images.length);
  };

  const nextImage = () => {
    if (!images.length) return;
    setActiveIndex((current) => (current + 1) % images.length);
  };

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") previousImage();
      if (event.key === "ArrowRight") nextImage();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, activeIndex, images.length]);

  const SellerBlock = (
    <div className="mt-5 flex items-center gap-4">
      <div className="relative h-17 w-17 overflow-hidden rounded-full bg-neutral-100 ring-1 ring-black/5">
        {seller.avatar ? (
          <img
            src={seller.avatar}
            alt={sellerName}
            className="h-full w-full object-cover"
            sizes="68px"
          />
        ) : (
          <UserRound className="h-full w-full text-orange-500" />
        )}
      </div>

      <div>
        <div className="text-[22px] font-semibold leading-tight text-neutral-900">
          {sellerName}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[16px] text-neutral-500">
          <span className="inline-flex items-center gap-1.5 font-medium text-[#2f7d32]">
            <Star className="h-4 w-4 fill-current" />
            {(seller.averageRating ?? 0).toFixed(1)} ({seller.totalRatings ?? 0})
          </span>
          <span aria-hidden="true">•</span>
          <span>{seller.totalSold ?? 0} meals sold</span>
        </div>
      </div>
    </div>
  );

  if (!open) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
        <div className="w-full max-w-[560px] rounded-[32px] bg-white p-10 text-center shadow-2xl">
          <div className="text-lg font-medium text-neutral-500">Loading listing...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
        <div className="w-full max-w-[560px] rounded-[32px] bg-white p-10 text-center shadow-2xl">
          <div className="text-lg font-medium text-neutral-500">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed top-0 z-40 flex h-screen w-full items-center justify-center bg-black/35 px-3 py-4 sm:px-5"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="listing-modal-title"
    >
      <div
        className="relative max-h-[96vh] max-w-[1450px] scale-70 overflow-hidden rounded-[30px] bg-[#fbfbfb] object-scale-down shadow-[0_30px_80px_rgba(0,0,0,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-6 top-6 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-neutral-800 shadow-sm ring-1 ring-black/10 transition hover:bg-neutral-50"
        >
          <X className="h-7 w-7" strokeWidth={2.25} />
        </button>

        <div className="grid max-h-[96vh] grid-cols-1 overflow-y-auto xl:grid-cols-[1.18fr_1fr]">
          <div className="p-5 sm:p-7 xl:p-8">
            <div className="relative overflow-hidden rounded-[26px] border border-black/10 bg-black shadow-inner">
              <div className="relative flex aspect-square w-full items-center justify-center">
                <img
                  src={activeImage}
                  alt={listing.title}
                  className="z-50 h-full w-full object-contain"
                  sizes="(max-width: 1280px) 100vw, 58vw"
                />
                <img
                  src={activeImage}
                  alt=""
                  aria-hidden="true"
                  className="absolute left-0 top-0 h-full w-full object-cover opacity-40 blur"
                  sizes="(max-width: 1280px) 100vw, 58vw"
                />
              </div>
            </div>

            {images.length > 1 && (
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
                          src={image}
                          alt={`${listing.title} image ${index + 1}`}
                          className="h-full w-full object-cover"
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
            )}
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
                  <div className="text-[20px] font-medium leading-tight text-neutral-800">
                    {listing.location}
                  </div>
                </div>
              </div>

              <div className="border-t border-black/10 pt-8">
                <div className="text-[16px] font-medium text-neutral-500">Sold by</div>
                {sellerProfileHref ? <Link href={sellerProfileHref}>{SellerBlock}</Link> : SellerBlock}
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
      </div>
    </div>
  );
}
