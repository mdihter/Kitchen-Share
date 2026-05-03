"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { MapPin, X } from "lucide-react";
import pb from "@/app/lib/pb";
import GeoLocationModal from "@/app/components/GeoLocationModal";

const _isMountedSub = () => () => {};
function useIsMounted() {
    return useSyncExternalStore(_isMountedSub, () => true, () => false);
}


const GEO_CACHE_KEY = "ks_geo_cache";
const GEO_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type GeoCache = { city: string; state: string; ts: number };

function readGeoCache(): { city: string; state: string } | null {
    try {
        const raw = sessionStorage.getItem(GEO_CACHE_KEY);
        if (!raw) return null;
        const parsed: GeoCache = JSON.parse(raw);
        if (Date.now() - parsed.ts > GEO_CACHE_TTL_MS) return null;
        return { city: parsed.city, state: parsed.state };
    } catch {
        return null;
    }
}

function writeGeoCache(city: string, state: string) {
    try {
        sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ city, state, ts: Date.now() }));
    } catch { /* sessionStorage unavailable */ }
}

// Resets to false on every hard refresh (module re-evaluation).
let hasPromptedThisLoad = false;

async function fetchBrowserLocation(): Promise<{ city: string; state: string; fromCache: boolean } | null> {
    const cached = readGeoCache();
    if (cached) return { ...cached, fromCache: true };

    if (typeof navigator === "undefined" || !navigator.geolocation) return null;

    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
                        { headers: { "Accept-Language": "en-US,en" } }
                    );
                    if (!res.ok) { resolve(null); return; }
                    const data: { address?: Record<string, string> } = await res.json();
                    const city = data.address?.city ?? null;
                    // ISO3166-2-lvl4 is "US-CA" style; grab the abbreviation after the dash
                    const stateCode = data.address?.["ISO3166-2-lvl4"]?.split("-")[1] ?? null;
                    if (city && stateCode) {
                        writeGeoCache(city, stateCode);
                        resolve({ city, state: stateCode, fromCache: false });
                    } else {
                        resolve(null);
                    }
                } catch {
                    resolve(null);
                }
            },
            () => resolve(null),
            { timeout: 8000, maximumAge: 300_000 } // accept cached browser position up to 5 min old
        );
    });
}


type LocationContextType = {
    city: string;
    state: string;
    locationReady: boolean;
    setCity: (city: string) => void;
    setState: (state: string) => void;
    setLocation: (city: string, state: string) => void;
};

const LocationContext = createContext<LocationContextType | undefined>(undefined);


interface LocationToastProps {
    message: string;
    visible: boolean;
    onDismiss: () => void;
}

function LocationToast({ message, visible, onDismiss }: LocationToastProps) {
    const mounted = useIsMounted();
    if (!mounted) return null;
    return createPortal(
        <div
            className={`fixed bottom-6 left-1/2 z-9998 -translate-x-1/2 transition-all duration-300 ${
                visible
                    ? "opacity-100 scale-100 pointer-events-auto"
                    : "opacity-0 scale-95 pointer-events-none"
            }`}
        >
            <div className="flex items-center gap-2.5 rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white shadow-2xl ring-1 ring-white/10">
                <MapPin className="h-4 w-4 shrink-0 text-orange-400" strokeWidth={2.5} />
                <span>{message}</span>
                <button
                    type="button"
                    onClick={onDismiss}
                    className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-stone-400 transition hover:text-white"
                    aria-label="Dismiss"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>,
        document.body
    );
}


export const LocationProvider = ({ children }: { children: React.ReactNode }) => {
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [locationReady, setLocationReady] = useState(false);
    const userOverrideRef = useRef(false);
    const loadedForRef = useRef<string | null>(null);
    const geoRef = useRef<{ city: string; state: string } | null>(null);
    const profileLocationRef = useRef<{ city: string; state: string } | null>(null);
    const [profileLocationForModal, setProfileLocationForModal] = useState<{ city: string; state: string } | null>(null);

    // Modal state
    const [geoModalOpen, setGeoModalOpen] = useState(false);
    const [pendingGeo, setPendingGeo] = useState<{ city: string; state: string } | null>(null);

    // Toast state
    const [toastMsg, setToastMsg] = useState("");
    const [toastVisible, setToastVisible] = useState(false);
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToast = React.useCallback((msg: string) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToastMsg(msg);
        setToastVisible(true);
        toastTimerRef.current = setTimeout(() => setToastVisible(false), 4000);
    }, []);

    const dismissToast = React.useCallback(() => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToastVisible(false);
    }, []);

    const loadFromProfile = React.useCallback(async (userId: string) => {
        if (loadedForRef.current === userId) return;
        try {
            const user = await pb.collection("users").getOne(userId);
            loadedForRef.current = userId;
            if (user.city && user.state) {
                profileLocationRef.current = { city: user.city, state: user.state };
                setProfileLocationForModal({ city: user.city, state: user.state });
                // Only apply profile if geo hasn't set a location yet and user hasn't overridden
                if (!userOverrideRef.current && !geoRef.current) {
                    setCity(user.city);
                    setState(user.state);
                }
            }
        } catch {
            // fetch failed — leave loadedForRef unset so a retry is possible
        }
        setLocationReady(true);
    }, []);

    useEffect(() => {
        void (async () => {
            const geoPromise = fetchBrowserLocation();

            const initial = pb.authStore.record;
            if (initial?.id) {
                await loadFromProfile(initial.id);
            } else {
                setLocationReady(true);
            }

            const geo = await geoPromise;
            if (!geo || userOverrideRef.current) return;
            if (hasPromptedThisLoad) return;
            hasPromptedThisLoad = true;

            geoRef.current = { city: geo.city, state: geo.state };
            const profile = profileLocationRef.current;
            const differFromProfile =
                profile &&
                (profile.city.toLowerCase() !== geo.city.toLowerCase() ||
                    profile.state.toLowerCase() !== geo.state.toLowerCase());

            if (differFromProfile) {
                setPendingGeo({ city: geo.city, state: geo.state });
                setGeoModalOpen(true);
            } else {
                setCity(geo.city);
                setState(geo.state);
                showToast(`Location set to ${geo.city}, ${geo.state}`);
            }
        })();

        const unsub = pb.authStore.onChange(() => {
            const record = pb.authStore.record;
            const newId = record?.id ?? null;
            const prevId = loadedForRef.current;

            if (newId === prevId) return; // token refresh, same user — ignore

            if (!newId) {
                loadedForRef.current = null;
                userOverrideRef.current = false;
                profileLocationRef.current = null;
                setProfileLocationForModal(null);
                if (geoRef.current) {
                    setCity(geoRef.current.city);
                    setState(geoRef.current.state);
                } else {
                    setCity("");
                    setState("");
                }
                setLocationReady(true);
            } else {
                userOverrideRef.current = false;
                loadFromProfile(newId);
            }
        });

        return () => {
            unsub();
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        };
    }, [loadFromProfile, showToast]);

    const setLocation = (newCity: string, newState: string) => {
        userOverrideRef.current = true;
        setCity(newCity);
        setState(newState);
    };

    const handleUseGeo = React.useCallback(() => {
        if (!pendingGeo) return;
        const { city: geoCity, state: geoState } = pendingGeo;
        setCity(geoCity);
        setState(geoState);
        setGeoModalOpen(false);
        setTimeout(() => setPendingGeo(null), 300);
        showToast(`Location set to ${geoCity}, ${geoState}`);
    }, [pendingGeo, showToast]);

    const handleUseProfile = React.useCallback(() => {
        const profile = profileLocationRef.current;
        setGeoModalOpen(false);
        setTimeout(() => setPendingGeo(null), 300);
        if (profile) {
            setCity(profile.city);
            setState(profile.state);
            showToast(`Location set to ${profile.city}, ${profile.state}`);
        }
    }, [showToast]);

    const handleDismissModal = React.useCallback(() => {
        setGeoModalOpen(false);
        setTimeout(() => setPendingGeo(null), 300);
    }, []);

    return (
        <LocationContext.Provider value={{ city, state, locationReady, setCity, setState, setLocation }}>
            {children}
            <LocationToast message={toastMsg} visible={toastVisible} onDismiss={dismissToast} />
            {pendingGeo && (
                <GeoLocationModal
                    open={geoModalOpen}
                    detectedCity={pendingGeo.city}
                    detectedState={pendingGeo.state}
                    profileCity={profileLocationForModal?.city ?? ""}
                    profileState={profileLocationForModal?.state ?? ""}
                    onUseGeo={handleUseGeo}
                    onUseProfile={handleUseProfile}
                    onDismiss={handleDismissModal}
                />
            )}
        </LocationContext.Provider>
    );
};

export const useLocation = () => {
    const context = useContext(LocationContext);
    if (!context) {
        throw new Error("useLocation must be used within a LocationProvider");
    }
    return context;
};
