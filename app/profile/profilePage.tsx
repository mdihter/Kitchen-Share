'use client';

import { ChangeEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import type { RecordModel } from 'pocketbase';
import {Ban, ChevronLeft, ChevronRight, MapPin, MessageCircle, ShoppingBag, Star, UserRound} from 'lucide-react';

import { ListingCard } from '@/app/components/NewListingCard';
import usLocations from '@/app/lib/us-locations.json';
import type { pbuser } from '@/app/types/pbuser';
import {getUserRatings} from "@/app/api/getStats";

export const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const LISTINGS_PER_PAGE = 12;

export type ProfileFormData = {
    displayName: string;
    phoneNumber: string;
    bio: string;
    zipcode: string;
    city: string;
    state: string;
};

type CityOption = { name: string };

type FormControlProps<T extends HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> = {
    label: string;
    value: string;
    onChange: (event: ChangeEvent<T>) => void;
};

function FormInput({ label, type = 'text', value, onChange, placeholder = '' }: FormControlProps<HTMLInputElement> & { type?: string; placeholder?: string }) {
    return (
        <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700">{label}</label>
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
        </div>
    );
}

function FormTextarea({ label, value, onChange, placeholder = '' }: FormControlProps<HTMLTextAreaElement> & { placeholder?: string }) {
    return (
        <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700">{label}</label>
            <textarea
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                rows={3}
                className="w-full resize-none rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
        </div>
    );
}

function FormSelect({ label, value, onChange, children }: FormControlProps<HTMLSelectElement> & { children: ReactNode }) {
    return (
        <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700">{label}</label>
            <select
                value={value}
                onChange={onChange}
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            >
                {children}
            </select>
        </div>
    );
}

function CityCombobox({ cities, value, onChange, disabled }: {
    cities: CityOption[];
    value: string;
    onChange: (city: string) => void;
    disabled?: boolean;
}) {
    const [input, setInput] = useState(value);
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef(input);

    useEffect(() => {
        inputRef.current = input;
    }, [input]);

    useEffect(() => {
        setInput(value);
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setOpen(false);

                const matchingCity = cities.find(city => city.name.toLowerCase() === inputRef.current.trim().toLowerCase());
                if (!matchingCity) {
                    setInput('');
                    onChange('');
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [cities, onChange]);

    const filteredCities = useMemo(() => {
        const query = input.trim().toLowerCase();
        if (!query) return cities.slice(0, 50);
        return cities.filter(city => city.name.toLowerCase().startsWith(query)).slice(0, 50);
    }, [cities, input]);

    const selectCity = (name: string) => {
        setInput(name);
        onChange(name);
        setOpen(false);
    };

    return (
        <div ref={containerRef} className="relative">
            <label className="mb-1 block text-sm font-semibold text-stone-700">City</label>
            <input
                type="text"
                value={input}
                disabled={disabled}
                placeholder={disabled ? 'Select state first' : 'Type a city...'}
                onChange={event => {
                    setInput(event.target.value);
                    setOpen(true);
                }}
                onFocus={() => {
                    if (!disabled) setOpen(true);
                }}
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:bg-stone-100 disabled:text-stone-400"
            />

            {open && !disabled && filteredCities.length > 0 && (
                <ul className="absolute z-20 mt-2 max-h-48 w-full overflow-y-auto rounded-2xl border border-stone-200 bg-white p-1 text-sm shadow-xl">
                    {filteredCities.map(city => (
                        <li key={city.name} onMouseDown={() => selectCity(city.name)} className="cursor-pointer rounded-xl px-3 py-2 text-stone-800 hover:bg-orange-50">
                            {city.name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export function Avatar({ avatarPreview }: { avatarPreview: string }) {
    return (
        <div className={`aspect-square min-h-75 min-w-75 max-h-90 flex items-center justify-center overflow-hidden rounded-full bg-stone-100 shadow-sm ring-1 ring-stone-200`}>
            {avatarPreview ? <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" /> : <UserRound className="text-orange-500 h-70 w-70"></UserRound>}
        </div>
    );
}

function DecorativeMarketScene() {
    return (
        <div className="pointer-events-none relative hidden h-full min-h-[190px] flex-1 items-center justify-center overflow-hidden opacity-80 lg:flex">
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/75 to-white/30" />
            <div className="relative h-40 w-[430px]">
                <div className="absolute bottom-7 left-6 h-16 w-12 rounded-t-full bg-[#dcebd8]" />
                <div className="absolute bottom-7 left-0 h-10 w-10 rounded-t-full bg-[#eaf3e8]" />
                <div className="absolute bottom-6 right-14 h-14 w-12 rounded-t-full bg-[#dcebd8]" />
                <div className="absolute bottom-6 right-4 h-10 w-10 rounded-t-full bg-[#eaf3e8]" />
                <div className="absolute bottom-3 left-28 h-24 w-44 rounded-t-md bg-[#fff3df] shadow-sm" />
                <div className="absolute left-[100px] top-5 h-7 w-52 rounded-t-lg bg-[#9fbfae]" />
                <div className="absolute left-[100px] top-5 flex h-7 w-52 overflow-hidden rounded-t-lg">
                    {Array.from({ length: 6 }).map((_, index) => <span key={index} className="h-full flex-1 border-r border-white/45 last:border-0" />)}
                </div>
                <div className="absolute bottom-3 left-24 h-3 w-56 rounded-full bg-[#dfc9aa]" />
                <div className="absolute bottom-14 left-[172px] h-10 w-9 rounded-full bg-[#f3c5ae]" />
                <div className="absolute bottom-13 left-[160px] h-14 w-12 rounded-b-full bg-[#88b7a8]" />
                <div className="absolute bottom-10 left-[224px] h-14 w-10 rounded-full bg-[#9fc7d2]" />
                <div className="absolute bottom-14 left-[216px] h-9 w-9 rounded-full bg-[#f2c3ad]" />
                <div className="absolute bottom-8 left-[268px] h-7 w-9 rounded bg-[#efb77c]" />
                <div className="absolute left-80 top-0 text-6xl text-[#f5b08f]">⌖</div>
                <div className="absolute bottom-3 right-5 h-14 w-20 rounded-t-3xl border-8 border-[#e7efdf] border-b-0" />
            </div>
        </div>
    );
}

export function PageTitle({ isSetupMode, isOwnProfile, displayName }: { isSetupMode: boolean; isOwnProfile: boolean; displayName: string }) {
    if (!isSetupMode) return null;

    return (
        <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-400">Neighborhood Food</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-950">{isOwnProfile ? 'Set up your profile' : displayName}</h1>
            <p className="mt-1 text-sm text-stone-500">Let buyers and sellers know a bit about you before listing or messaging.</p>
        </div>
    );
}

export function ProfileView({ profileUser, formData }: { profileUser: pbuser | null | undefined; formData: ProfileFormData }) {
    const location = [formData.city, formData.state].filter(Boolean).join(', ');

    return (
        <div className="flex flex-col items-center gap-6 text-center lg:flex-row lg:text-left">
            <div className="min-w-0 flex-1">
                <h1 className="text-4xl font-bold tracking-[-0.04em] text-stone-950 md:text-5xl">{formData.displayName || 'Local Seller'}</h1>
                {location && (
                    <p className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-stone-600 lg:justify-start">
                        <MapPin className="h-5 w-5 text-stone-500" />
                        {location}
                    </p>
                )}
                <ProfileStats profileUser={profileUser}/>
                {formData.bio && <p className="mt-5 max-w-3xl text-base leading-relaxed text-stone-500">{formData.bio}</p>}
            </div>
        </div>
    );
}

export function ProfileStats({ profileUser }: { profileUser: pbuser | null | undefined }) {
    const [stats, setStats] = useState({averageRating: 0, totalRatings: 0, totalSold: 0});
    
    useEffect(() => {
        const ratings = async () => {
            setStats(await getUserRatings(profileUser?.id));
        }
        ratings();
    }, []);

    return (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-stone-500 lg:justify-start">
            <span className="inline-flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-stone-500" />
                <span className="font-semibold text-stone-700">{stats.totalSold ?? 0} sold</span>
            </span>
            <span className="hidden h-7 w-px bg-stone-200 sm:block" />
            <span className="inline-flex items-center gap-2">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold text-stone-800">{stats.averageRating ?? 0}</span>
                <span className="text-stone-400">({stats.totalRatings ?? 0} review{stats.totalRatings != 1 && "s"})</span>
            </span>
        </div>
    );
}

export function ProfileEditor({
                                  avatarPreview,
                                  formData,
                                  availableCities,
                                  onAvatarChange,
                                  onCityChange,
                                  onFormChange,
                                  onStateChange,
                              }: {
    avatarPreview: string;
    formData: ProfileFormData;
    availableCities: CityOption[];
    onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onCityChange: (city: string) => void;
    onFormChange: (field: keyof ProfileFormData) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onStateChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}) {
    return (
        <div className="grid gap-8 lg:grid-cols-[auto_1fr] lg:items-start">
            <div className="flex flex-col items-center gap-3">
                <Avatar avatarPreview={avatarPreview} />
                <label className="cursor-pointer rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50">
                    {avatarPreview ? 'Change photo' : 'Upload photo'}
                    <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
                </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                    <FormInput label="Display Name" value={formData.displayName} onChange={onFormChange('displayName')} placeholder="e.g. Jane's Kitchen" />
                </div>
                <FormInput label="Phone Number" type="tel" value={formData.phoneNumber} onChange={onFormChange('phoneNumber')} placeholder="(555) 000-0000" />
                <FormInput label="Zipcode" value={formData.zipcode} onChange={onFormChange('zipcode')} placeholder="90210" />
                <FormSelect label="State" value={formData.state} onChange={onStateChange}>
                    <option value="">Select state...</option>
                    {usLocations.states.map(state => <option key={state.isoCode} value={state.isoCode}>{state.name}</option>)}
                </FormSelect>
                <CityCombobox cities={availableCities} value={formData.city} onChange={onCityChange} disabled={!formData.state} />
                <div className="md:col-span-2">
                    <FormTextarea label="Bio" value={formData.bio} onChange={onFormChange('bio')} placeholder="Tell people a bit about yourself..." />
                </div>
            </div>
        </div>
    );
}

export function ProfileActions({
                                   isSetupMode,
                                   isOwnProfile,
                                   isEditing,
                                   isBlocked,
                                   saving,
                                   messagingLoading,
                                   blockLoading,
                                   toggling,
                                   onSave,
                                   onCancel,
                                   onEdit,
                                   onMessage,
                                   onToggleBlock,
                               }: {
    isSetupMode: boolean;
    isOwnProfile: boolean;
    isEditing: boolean;
    isBlocked: boolean;
    saving: boolean;
    messagingLoading: boolean;
    blockLoading: boolean;
    toggling: boolean;
    onSave: () => void;
    onCancel: () => void;
    onEdit: () => void;
    onMessage: () => void;
    onToggleBlock: () => void;
}) {
    const primaryClass = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-orange-500 px-8 text-sm font-bold text-white shadow-[0_8px_18px_rgba(249,115,22,0.25)] transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60';
    const secondaryClass = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-8 text-sm font-bold text-stone-700 shadow-sm transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60';

    if (isSetupMode) {
        return <button type="button" onClick={onSave} disabled={saving} className={`${primaryClass} w-full md:w-auto`}>{saving ? 'Saving...' : 'Complete Setup'}</button>;
    }

    if (isOwnProfile && isEditing) {
        return (
            <div className={"flex gap-6"}>
                <button type="button" onClick={onCancel} className={`${secondaryClass} flex-1 md:flex-none`}>Cancel</button>
                <button type="button" onClick={onSave} disabled={saving} className={`${primaryClass} flex-1 md:flex-none`}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
        );
    }

    if (isOwnProfile) {
        return <button type="button" onClick={onEdit} className={`${primaryClass} w-full md:w-auto`}>Edit Profile</button>;
    }

    return (
        <>
            {!isBlocked && (
                <button type="button" onClick={onMessage} disabled={messagingLoading} className={`${primaryClass} flex-1 md:flex-none`}>
                    <MessageCircle className="h-5 w-5" />
                    {messagingLoading ? 'Opening...' : 'Message'}
                </button>
            )}
            <button type="button" onClick={onToggleBlock} disabled={blockLoading || toggling} className={`${secondaryClass} ${isBlocked ? 'w-full md:w-auto' : 'flex-1 md:flex-none'}`}>
                <Ban className="h-5 w-5" />
                {toggling ? (isBlocked ? 'Unblocking...' : 'Blocking...') : (isBlocked ? 'Unblock User' : 'Block')}
            </button>
        </>
    );
}

export function ProfileHero({
                                children,
                                error,
                            }: {
    children: ReactNode;
    error?: string;
}) {
    return (
        <section className="overflow-hidden rounded-[26px] border border-stone-100 bg-white px-6 py-7 shadow-[0_8px_28px_rgba(28,25,23,0.10)] md:rounded-[34px] md:px-10 md:py-8 xl:px-12">
            <div className="flex gap-10">
                <div className="min-w-0 flex-[1.4]">{children}</div>
                <DecorativeMarketScene />
            </div>
            {error && <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>}
        </section>
    );
}

function PaginationButton({ children, disabled, label, onClick }: { children: ReactNode; disabled?: boolean; label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-35"
        >
            {children}
        </button>
    );
}

function ListingsHeader({ count }: { count?: number }) {
    return (
        <div className="flex items-baseline gap-4">
            <h2 className="text-2xl font-bold tracking-[-0.03em] text-stone-950">Food Listings</h2>
            {count !== undefined && <span className="text-sm font-medium text-stone-400">{count} items</span>}
        </div>
    );
}

export function ListingsSection({ listings, listingsLoading, isMobile }: { listings: RecordModel[]; listingsLoading: boolean; isMobile: boolean }) {
    const [page, setPage] = useState(0);

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(listings.length / LISTINGS_PER_PAGE));
        if (page > totalPages - 1) setPage(0);
    }, [listings.length, page]);

    if (listingsLoading) {
        return (
            <section className="mt-9">
                <ListingsHeader />
                <div className="mt-6 rounded-[24px] border border-stone-200 bg-white py-16 text-center text-sm text-stone-400 shadow-sm">Loading listings...</div>
            </section>
        );
    }

    if (listings.length === 0) {
        return (
            <section className="mt-9">
                <ListingsHeader count={0} />
                <div className="mt-6 rounded-[24px] border border-stone-200 bg-white py-16 text-center text-sm text-stone-400 shadow-sm">No listings yet.</div>
            </section>
        );
    }

    const totalPages = Math.ceil(listings.length / LISTINGS_PER_PAGE);
    const pagedListings = listings.slice(page * LISTINGS_PER_PAGE, (page + 1) * LISTINGS_PER_PAGE);

    return (
        <section className="mt-9">
            <ListingsHeader count={listings.length} />
            <ul className={`mt-6 grid gap-5 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'}`}>
                {pagedListings.map(listing => <ListingCard key={listing.id} listing={listing as any} />)}
            </ul>

            {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                    <PaginationButton label="Previous page" onClick={() => setPage(current => current - 1)} disabled={page === 0}>
                        <ChevronLeft className="h-4 w-4" />
                    </PaginationButton>

                    {Array.from({ length: totalPages }, (_, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => setPage(index)}
                            aria-label={`Go to page ${index + 1}`}
                            className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-semibold transition ${index === page ? 'bg-orange-500 text-white shadow-sm' : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50'}`}
                        >
                            {index + 1}
                        </button>
                    ))}

                    <PaginationButton label="Next page" onClick={() => setPage(current => current + 1)} disabled={page === totalPages - 1}>
                        <ChevronRight className="h-4 w-4" />
                    </PaginationButton>
                </div>
            )}
        </section>
    );
}

export function LoadingState() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[#fbfaf8]">
            <p className="text-sm tracking-wide text-stone-400">Loading...</p>
        </div>
    );
}

export function UnavailableState() {
    return (
        <div className="min-h-screen bg-[#fbfaf8] p-4">
            <div className="mx-auto max-w-lg pt-20">
                <div className="rounded-[28px] bg-white px-7 py-12 text-center shadow-[0_8px_28px_rgba(28,25,23,0.10)]">
                    <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Page unavailable</h1>
                    <p className="mt-2 text-sm text-stone-400">This profile is unavailable.</p>
                </div>
            </div>
        </div>
    );
}
