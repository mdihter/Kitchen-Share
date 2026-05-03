'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ClientResponseError } from "pocketbase";
import {
    ChevronDown,
    DollarSign,
    FileText,
    Heart,
    Image as ImageIcon,
    Plus,
    Soup,
    X,
} from "lucide-react";
import pb from "@/app/lib/pb";
import { setAuthRedirect } from "@/app/api/authRedirect";
import { useCurrentUser } from "@/app/hooks";
import { useLocation } from "@/app/providers/LocationProvider";
import { CATEGORY_OPTIONS } from "@/app/types/categories";
import usLocations from "@/app/lib/us-locations.json";
import PreviewModalListing from "@/app/createlisting/PreviewModalListing";

const MAX_PHOTOS = 6;
const MAX_TITLE = 60;
const MAX_DESC = 500;

type Errors = {
    title?: string;
    price?: string;
    location?: string;
    images?: string;
    category?: string;
};

export default function CreateListing() {
    const router = useRouter();
    const { city: contextCity, state: contextState } = useLocation();
    const currentUserId = useCurrentUser();

    const [images, setImages] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [price, setPrice] = useState("");
    const [title, setTitle] = useState("");
    const [locationState, setLocationState] = useState("");
    const [locationCity, setLocationCity] = useState("");
    const [category, setCategory] = useState("");
    const [additionalTags, setAdditionalTags] = useState("");
    const [description, setDescription] = useState("");
    const [errors, setErrors] = useState<Errors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [priceNum, setPriceNum] = useState<number>(0);
    useEffect(() => {
        const priceNum = Number(price);
        if (!isNaN(priceNum)) {
            setPriceNum(priceNum);
        } else {
            setPriceNum(0);
        }
    }, [price]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const usStates = usLocations.states;
    const availableCities = useMemo(
        () =>
            locationState
                ? (usLocations.cities[locationState as keyof typeof usLocations.cities] ?? []).map(name => ({ name }))
                : [],
        [locationState]
    );

    const displayLocation = [locationCity, locationState].filter(Boolean).join(", ");

    const handleCityChange = useCallback((city: string) => {
        setLocationCity(city);
        setErrors(prev => ({ ...prev, location: undefined }));
    }, []);

    useEffect(() => {
        if (!pb.authStore.isValid) {
            setAuthRedirect();
            router.push("/auth");
        }
    }, [currentUserId, router]);

    useEffect(() => {
        if (contextState) setLocationState(contextState);
        if (contextCity) setLocationCity(contextCity);
    }, [contextCity, contextState]);

    if (!currentUserId) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
                <p className="text-sm text-[#6b7280]">Loading...</p>
            </div>
        );
    }

    function handleImages(e: ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        if (!files.length) return;

        const remaining = MAX_PHOTOS - images.length;
        const toAdd = files.slice(0, remaining);
        setImages(prev => [...prev, ...toAdd]);
        setPreviews(prev => [...prev, ...toAdd.map(file => URL.createObjectURL(file))]);
        setErrors(prev => ({ ...prev, images: undefined }));
        e.target.value = "";
    }

    function handleRemoveImage(index: number) {
        setImages(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => {
            const url = prev[index];
            if (url) URL.revokeObjectURL(url);
            return prev.filter((_, i) => i !== index);
        });
    }

    function validate(): boolean {
        const newErrors: Errors = {};
        if (!title.trim()) newErrors.title = "Title is required";
        if (!price || isNaN(Number(price)) || Number(price) < 0) newErrors.price = "Valid price is required";
        if (!locationCity.trim()) newErrors.location = "City is required";
        if (!category.trim()) newErrors.category = "Category is required";
        if (images.length === 0) newErrors.images = "Please upload at least one photo";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    async function handleSubmit() {
        if (!validate()) return;

        setSubmitting(true);
        setSubmitError(null);
        try {
            const data = new FormData();
            data.append("title", title.trim());
            data.append("price", price);
            data.append("location", `${locationCity.trim()}, ${locationState.trim()}`);
            data.append("category", category);
            data.append("tags", additionalTags.trim());
            data.append("description", description.trim());
            data.append("seller", pb.authStore.record?.id ?? "");
            data.append("is_available", "true");

            data.append("main_image", images[0]);
            for (let i = 1; i < images.length; i++) {
                data.append("images", images[i]);
            }

            await pb.collection("listings").create(data);
            router.push("/");
        } catch (err) {
            console.error(err);
            if (err instanceof ClientResponseError && err.response?.data) {
                const [field, value] = Object.entries(err.response.data)[0] as [string, { message?: string }];
                const message = value?.message ?? String(value);
                setSubmitError(`${field}: ${message}`);
            } else {
                setSubmitError("An unexpected error occurred. Please try again.");
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#fafafa] px-4 py-8 font-sans text-[#111827] sm:px-6 lg:px-8">
            <PreviewModalListing open={previewModalOpen} listing={{title, description, price: priceNum, location: `${locationCity}, ${locationState}`, mainImage: (previews.length >= 1 ? previews[0] : undefined), images: (previews.length>1 ? previews.slice(1,previews.length) : undefined)}} onClose={() => setPreviewModalOpen(false)} />
            <div className="mx-auto max-w-[1150px]">
                <header className="mb-4">
                    <h1 className="text-[24px] font-bold tracking-[-0.02em] text-[#111827]">Create your listing</h1>
                    <p className="mt-1 text-[14px] leading-6 text-[#6b7280]">
                        Share your homemade food with neighbors in your community.
                    </p>
                </header>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
                    <form className="rounded-xl border border-[#e5e7eb] bg-white p-6" onSubmit={e => e.preventDefault()}>
                        <section>
                            <SectionHeader number={1} title="Add Photos" helper="Show off your delicious food" />
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleImages}
                            />
                            <PhotoUploadGrid
                                previews={previews}
                                onAdd={() => fileInputRef.current?.click()}
                                onRemove={handleRemoveImage}
                            />
                            {errors.images && <ErrMsg>{errors.images}</ErrMsg>}
                        </section>

                        <section className="mt-7">
                            <SectionHeader number={2} title="Basic Information" />
                            <div className="mt-4 grid gap-x-7 gap-y-4 md:grid-cols-2">
                                <div>
                                    <FieldLabel required>Title</FieldLabel>
                                    <div className={inputWrapClass(!!errors.title)}>
                                        <input
                                            type="text"
                                            maxLength={MAX_TITLE}
                                            placeholder="e.g. Homemade Lasagna"
                                            value={title}
                                            onChange={e => {
                                                setTitle(e.target.value);
                                                setErrors(prev => ({ ...prev, title: undefined }));
                                            }}
                                            className={inputClass}
                                        />
                                        <span className="flex items-center pr-3 text-[12px] text-[#9ca3af]">
                                            {title.length}/{MAX_TITLE}
                                        </span>
                                    </div>
                                    {errors.title && <ErrMsg>{errors.title}</ErrMsg>}
                                </div>

                                <div>
                                    <FieldLabel required>Price</FieldLabel>
                                    <div className={inputWrapClass(!!errors.price, "overflow-hidden p-0")}>
                                        <span className="flex h-full w-11 items-center justify-center border-r border-[#e5e7eb] bg-[#fafafa] text-sm font-medium text-[#374151]">
                                            $
                                        </span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={price}
                                            onChange={e => {
                                                setPrice(e.target.value);
                                                setErrors(prev => ({ ...prev, price: undefined }));
                                            }}
                                            className={inputClass}
                                        />
                                    </div>
                                    {errors.price && <ErrMsg>{errors.price}</ErrMsg>}
                                </div>

                                <div>
                                    <FieldLabel required>Location</FieldLabel>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <div className={inputWrapClass(false, "relative p-0")}>
                                            <select
                                                value={locationState}
                                                onChange={e => {
                                                    setLocationState(e.target.value);
                                                    setLocationCity("");
                                                    setErrors(prev => ({ ...prev, location: undefined }));
                                                }}
                                                className={`${inputClass} appearance-none pr-9`}
                                            >
                                                <option value="">Select state</option>
                                                {usStates.map(state => (
                                                    <option key={state.isoCode} value={state.isoCode}>{state.name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
                                        </div>
                                        <CityCombobox
                                            cities={availableCities}
                                            value={locationCity}
                                            onChange={handleCityChange}
                                            disabled={!locationState}
                                            hasError={!!errors.location}
                                        />
                                    </div>
                                    <p className="mt-2 text-[12.5px] leading-4 text-[#6b7280]">
                                        Where is your food available for pickup?
                                    </p>
                                    {errors.location && <ErrMsg>{errors.location}</ErrMsg>}
                                </div>

                                <div>
                                    <FieldLabel required>Category</FieldLabel>
                                    <div className={inputWrapClass(!!errors.category, "relative p-0")}>
                                        <select
                                            value={category}
                                            onChange={e => {
                                                setCategory(e.target.value);
                                                setErrors(prev => ({ ...prev, category: undefined }));
                                            }}
                                            className={`${inputClass} appearance-none pr-10`}
                                        >
                                            <option value="">Select a category</option>
                                            {CATEGORY_OPTIONS.map(option => (
                                                <option
                                                    key={typeof option === "string" ? option : option.value}
                                                    value={typeof option === "string" ? option : option.value}
                                                >
                                                    {typeof option === "string" ? option : option.label}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
                                    </div>
                                    <p className="mt-2 text-[12.5px] leading-4 text-[#6b7280]">
                                        What type of food is this?
                                    </p>
                                    {errors.category && <ErrMsg>{errors.category}</ErrMsg>}
                                </div>
                            </div>
                        </section>

                        <section className="mt-7">
                            <SectionHeader number={3} title="Details" />
                            <div className="mt-4 grid gap-x-7 gap-y-4 md:grid-cols-2">
                                <div>
                                    <FieldLabel>Description</FieldLabel>
                                    <div className="relative">
                                        <textarea
                                            placeholder="Tell buyers about your food..."
                                            maxLength={MAX_DESC}
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            className="h-24 w-full resize-none rounded-lg border border-[#e5e7eb] bg-white px-3 py-3 text-[14px] text-[#111827] outline-none transition placeholder:text-[#9ca3af] focus:border-[#ff6a00] focus:ring-2 focus:ring-orange-100"
                                        />
                                        <span className="absolute bottom-2 right-3 text-[12px] text-[#9ca3af]">
                                            {description.length}/{MAX_DESC}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <FieldLabel>Tags <span className="font-normal text-[#9ca3af]">(optional)</span></FieldLabel>
                                    <div className={inputWrapClass(false)}>
                                        <input
                                            type="text"
                                            placeholder="Add tags..."
                                            value={additionalTags}
                                            onChange={e => setAdditionalTags(e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                    <p className="mt-2 text-[12.5px] leading-4 text-[#6b7280]">
                                        Add keywords to help buyers find your listing
                                    </p>
                                </div>
                            </div>
                        </section>

                        <ConfirmationFooter
                            confirmed={confirmed}
                            setConfirmed={setConfirmed}
                            submitError={submitError}
                            submitting={submitting}
                            onSubmit={handleSubmit}
                        />
                    </form>

                    <div className="space-y-4">
                        <ListingPreviewCard
                            title={title.trim()}
                            price={price && !isNaN(Number(price)) ? Number(price) : 0}
                            location={displayLocation}
                            imageUrl={previews[0] ?? null}
                            setShowModal={(e) => {setPreviewModalOpen(e);}}
                        />
                        <TipsCard />
                    </div>
                </div>
            </div>
        </main>
    );
}

function SectionHeader({ number, title, helper }: { number: number; title: string; helper?: string }) {
    return (
        <div className="flex flex-col items-start">
            <div className={"flex flex-row items-center gap-3"}>
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#075e36] text-xs font-bold text-white shadow-sm">
                    {number}
                </div>
                <h2 className="text-[15px] font-semibold leading-5 text-[#111827]">{title}</h2>
            </div>
            {helper ? <p className="ml-9 mt-1 text-[13px] leading-5 text-[#6b7280]">{helper}</p> : null}
        </div>
    );
}

function PhotoUploadGrid({ previews, onAdd, onRemove }: {
    previews: string[];
    onAdd: () => void;
    onRemove: (index: number) => void;
}) {
    const slots = Array.from({ length: MAX_PHOTOS });

    return (
        <div className="mt-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {slots.map((_, index) => {
                    const src = previews[index];
                    const isAddSlot = index === previews.length && previews.length < MAX_PHOTOS;

                    if (src) {
                        return (
                            <div key={src} className="relative h-[88px] overflow-hidden rounded-lg bg-[#f3f4f6] lg:h-[92px]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={src} alt={`Food photo ${index + 1}`} className="h-full w-full object-cover" />
                                {index === 0 && (
                                    <span className="absolute bottom-2 left-2 rounded-md bg-[#111827]/85 px-2 py-0.5 text-[10px] font-semibold text-white">
                                        Main
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => onRemove(index)}
                                    aria-label={`Remove photo ${index + 1}`}
                                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#111827]/75 text-white shadow-sm transition hover:bg-red-500"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        );
                    }

                    if (isAddSlot) {
                        return (
                            <button
                                key="add-photos"
                                type="button"
                                onClick={onAdd}
                                className="flex h-[88px] flex-col items-center justify-center rounded-lg border border-dashed border-[#d1d5db] bg-white text-center transition hover:border-[#ff6a00] hover:bg-orange-50/30 lg:h-[92px]"
                            >
                                <Plus size={20} className="mb-2 text-[#6b7280]" />
                                <span className="text-[13px] font-medium text-[#6b7280]">Add photos</span>
                                <span className="mt-1 text-[11.5px] text-[#9ca3af]">Upload up to 6 photos</span>
                            </button>
                        );
                    }

                    return (
                        <div key={`empty-${index}`} className="flex h-[88px] items-center justify-center rounded-lg bg-[#f3f4f6] lg:h-[92px]">
                            <ImageIcon size={18} className="text-[#9ca3af]" />
                        </div>
                    );
                })}
            </div>
            <p className="mt-3 text-center text-[12.5px] text-[#6b7280]">
                Good photos help your listing stand out!
            </p>
        </div>
    );
}

function ConfirmationFooter({ confirmed, setConfirmed, submitError, submitting, onSubmit }: {
    confirmed: boolean;
    setConfirmed: (confirmed: boolean) => void;
    submitError: string | null;
    submitting: boolean;
    onSubmit: () => void;
}) {
    return (
        <div className="mt-6 border-t border-[#e5e7eb] pt-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <label className="flex cursor-pointer items-start gap-3">
                    <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={e => setConfirmed(e.target.checked)}
                        className="peer sr-only"
                    />
                    <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border border-[#d1d5db] bg-white transition peer-checked:border-[#ff6a00] peer-checked:bg-[#ff6a00] peer-focus-visible:ring-2 peer-focus-visible:ring-orange-100">
                        {confirmed && <span className="h-2 w-2 rounded-sm bg-white" />}
                    </span>
                    <span>
                        <span className="block text-[13px] font-medium leading-5 text-[#374151]">
                            I confirm that this food is homemade and prepared in a home kitchen.
                        </span>
                        <span className="block text-[12.5px] leading-5 text-[#6b7280]">
                            Please follow all food safety guidelines.
                        </span>
                    </span>
                </label>

                <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                    {submitError && <p className="max-w-[260px] text-right text-sm text-red-600">{submitError}</p>}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onSubmit}
                            disabled={submitting || !confirmed}
                            className={`h-10 rounded-lg px-6 text-[13px] font-semibold text-white shadow-sm transition ${submitting || !confirmed ? "cursor-not-allowed bg-[#d1d5db]" : "bg-[#ff6a00] hover:bg-[#f06000]"}`}
                        >
                            {submitting ? "Publishing..." : "Publish Listing"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ListingPreviewCard({ title, price, location, imageUrl, setShowModal }: {
    title: string;
    price: number;
    location: string;
    imageUrl: string | null;
    setShowModal: (show: boolean) => void;
}) {
    return (
        <aside className="rounded-xl border border-[#e5e7eb] bg-white p-5">
            <h3 className="text-[15px] font-semibold text-[#111827]">Listing Preview</h3>
            <div className="mt-5 overflow-hidden rounded-lg border border-[#e5e7eb] bg-white">
                <div className="flex h-[150px] items-center justify-center bg-gradient-to-br from-[#f8fafc] to-[#eef0f3]">
                    {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imageUrl} alt="Listing preview" className="h-full w-full object-cover" />
                    ) : (
                        <div className="relative text-[#7b8794]">
                            <Soup size={46} strokeWidth={1.7} />
                        </div>
                    )}
                </div>

                <div className="p-4">
                    <p className="text-[11.5px] font-medium text-[#9ca3af]">Preview your listing</p>
                    {title ? (
                        <p className="mt-3 line-clamp-2 text-[14px] font-semibold text-[#111827]">{title}</p>
                    ) : (
                        <div className="mt-3 space-y-2">
                            <div className="h-3 w-full rounded-full bg-[#eef0f3]" />
                            <div className="h-3 w-4/5 rounded-full bg-[#eef0f3]" />
                            <div className="flex gap-2 pt-1">
                                <div className="h-3 w-12 rounded-full bg-[#eef0f3]" />
                                <div className="h-3 w-10 rounded-full bg-[#eef0f3]" />
                                <div className="h-3 w-9 rounded-full bg-[#eef0f3]" />
                                <div className="h-3 w-10 rounded-full bg-[#eef0f3]" />
                            </div>
                        </div>
                    )}

                    <div className="mt-5 flex items-center justify-between gap-3">
                        <p className="text-[18px] font-bold text-[#111827]">
                            ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="truncate text-[11.5px] font-medium text-[#9ca3af]">{location || "Your location"}</p>
                    </div>

                    <button
                        type="button"
                        disabled = {!title.length}
                        onClick={() => {setShowModal(true)}}
                        className="hover:pointer-events-auto mt-4 h-10 w-full rounded-lg disabled:bg-[#eef0f3] bg-orange-500 text-[13px] font-medium disabled:text-[#8b949e] text-white"
                    >
                        Sample Preview
                    </button>
                </div>
            </div>
        </aside>
    );
}

function TipsCard() {
    const tips = [
        { icon: ImageIcon, title: "Use bright, clear photos", body: "Good photos get more attention" },
        { icon: FileText, title: "Write a detailed description", body: "Tell buyers what makes your food special" },
        { icon: DollarSign, title: "Be accurate with pricing", body: "Fair prices sell faster" },
        { icon: Heart, title: "Include dietary information", body: "Help buyers make informed choices" },
    ];

    return (
        <aside className="rounded-xl border border-[#e5e7eb] bg-white p-5">
            <h3 className="text-[15px] font-semibold text-[#111827]">Tips for a Great Listing</h3>
            <div className="mt-5 space-y-5">
                {tips.map(tip => {
                    const Icon = tip.icon;
                    return (
                        <div key={tip.title} className="flex gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff3e6] text-[#a15c14]">
                                <Icon size={16} strokeWidth={2} />
                            </div>
                            <div>
                                <p className="text-[13px] font-semibold leading-4 text-[#374151]">{tip.title}</p>
                                <p className="mt-1 text-[12.5px] leading-4 text-[#6b7280]">{tip.body}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-8 text-[12.5px] leading-5 text-[#9ca3af]">
                <p>Need help? Check out our</p>
                <a href="#" className="font-semibold text-[#ff6a00] underline underline-offset-2">
                    Selling Guidelines
                </a>
            </div>
        </aside>
    );
}

function CityCombobox({ cities, value, onChange, disabled, hasError }: {
    cities: { name: string }[];
    value: string;
    onChange: (city: string) => void;
    disabled?: boolean;
    hasError?: boolean;
}) {
    const [input, setInput] = useState(value);
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef(input);

    useEffect(() => { inputRef.current = input; }, [input]);
    useEffect(() => { setInput(value); }, [value]);

    const filtered = useMemo(() => {
        const query = input.trim().toLowerCase();
        if (!query) return cities.slice(0, 50);
        return cities.filter(city => city.name.toLowerCase().startsWith(query)).slice(0, 50);
    }, [input, cities]);

    useEffect(() => {
        const handler = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
                const match = cities.find(city => city.name.toLowerCase() === inputRef.current.trim().toLowerCase());
                if (!match) {
                    setInput("");
                    onChange("");
                }
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [cities, onChange]);

    return (
        <div ref={containerRef} className="relative">
            <div className={inputWrapClass(!!hasError, disabled ? "bg-[#f9fafb]" : "")}>
                <input
                    type="text"
                    value={input}
                    disabled={disabled}
                    placeholder={disabled ? "Select state first" : "Type a city"}
                    className={`${inputClass} ${disabled ? "text-[#9ca3af]" : "text-[#111827]"}`}
                    onChange={e => {
                        setInput(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => {
                        if (!disabled) setOpen(true);
                    }}
                />
            </div>
            {open && !disabled && filtered.length > 0 && (
                <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-[#e5e7eb] bg-white py-1 text-sm shadow-lg">
                    {filtered.map(city => (
                        <li
                            key={city.name}
                            onMouseDown={() => {
                                setInput(city.name);
                                onChange(city.name);
                                setOpen(false);
                            }}
                            className="cursor-pointer px-3 py-2 text-[#374151] hover:bg-orange-50"
                        >
                            {city.name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
    return (
        <label className="mb-2 block text-[13px] font-medium text-[#374151]">
            {children}
            {required && <span className="ml-0.5 text-[#f97316]">*</span>}
        </label>
    );
}

function ErrMsg({ children }: { children: ReactNode }) {
    return <p className="mt-2 text-[12.5px] text-red-600">{children}</p>;
}

const inputClass = "h-full min-w-0 flex-1 bg-transparent px-3 text-[14px] outline-none placeholder:text-[#9ca3af] disabled:cursor-not-allowed";

function inputWrapClass(hasError: boolean, extra = "") {
    return `relative flex h-11 rounded-lg border bg-white transition focus-within:ring-2 focus-within:ring-orange-100 ${hasError ? "border-red-500 focus-within:border-red-500" : "border-[#e5e7eb] focus-within:border-[#ff6a00]"} ${extra}`;
}
