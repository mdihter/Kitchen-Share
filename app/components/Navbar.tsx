"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import pb from "../lib/pb";
import { useCurrentUser } from "../hooks";
import SearchBar from "@/app/components/SearchBar";
import LocationPicker from "@/app/components/LocationPicker";
import {ChevronDown, User, LogOut, Heart, Info, Plus, MessageCircle, LayoutList, Ban} from "lucide-react";
import PillButton from "@/app/components/PillButton";
import IconButton from "@/app/components/IconButton";
import {useIsMobile} from "@/app/hooks/useIsMobile";
import {useIsLogin} from "@/app/providers/LoginProvider";
import {useLocation} from "@/app/providers/LocationProvider";
import {useGSAP} from "@gsap/react";
import gsap from "gsap";
import ModalBlocked from "./ModalBlocked";

type UserRecord = {
    id: string;
    displayName?: string;
    avatar?: string;
    email?: string;
};

type NavbarProps = {
    sidebarOpen?: boolean;
    onToggleSidebar?: () => void;
};

export default function Navbar({ sidebarOpen, onToggleSidebar }: NavbarProps) {
    const currentUserId = useCurrentUser();
    const isMobile = useIsMobile();
    const {setIsOnLogin} = useIsLogin();
    const { city, state, setLocation } = useLocation();

    const [user, setUser] = useState<UserRecord | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [blockedModalOpen, setBlockedModalOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleLoginRequired = (e: any) => {
        if (currentUserId) return;
        e.preventDefault();
        setIsOnLogin(true);
    }

    const handleLogout = () => {
        try {
            pb.cancelAllRequests();
            pb.realtime.unsubscribe();
        } finally {
            pb.authStore.clear();
            setMenuOpen(false);
            window.location.href = '/';
        }
    };

    const handleBlockedUsers = () => {
        setBlockedModalOpen(true);
    };


    useEffect(() => {
        const fetchUser = async () => {
            if (!currentUserId) {
                setUser(null);
                return;
            }


            const cached = pb.authStore.record;
            if (cached?.id === currentUserId) {
                setUser(cached as UserRecord);
            }

            try {
                const record = await pb.collection("users").getOne<UserRecord>(currentUserId);
                setUser(record);
            } catch (error) {
                console.error("Failed to fetch user:", error);
                if (!pb.authStore.record) setUser(null);
            }
        };

        fetchUser();
    }, [currentUserId]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    useGSAP(()=>{
        if(!sidebarOpen)
            gsap.to(".logoFade",{autoAlpha:1, duration: 0.6});
        else
            gsap.to(".logoFade",{autoAlpha:0, duration: 0.2});
    },[sidebarOpen])

    const avatarUrl =
        user?.avatar
            ? pb.files.getURL(user as any, user.avatar)
            : null;

    const logo = (
        !isMobile ?
                <div className={`logoFade flex items-center gap-2.5 ${sidebarOpen && "pointer-events-none absolute top-1/4"}`}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 shadow-lg shadow-orange-500/25">
                        <span className="text-lg">🍴</span>
                    </div>
                    <div className="leading-tight">
                        <div className="text-base font-bold tracking-tight">Neighborhood</div>
                        <div className="text-base font-bold tracking-tight text-orange-400">
                            Eats
                        </div>
                    </div>
                </div>
        :
        <div className="text-2xl font-bold text-orange-500">
            N
        </div>);

    const initials = user?.displayName
        ? user.displayName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
        : null;

    const AvatarInner = () =>
        avatarUrl ? (
            <img
                src={avatarUrl}
                alt={user?.displayName || "User avatar"}
                className="h-full w-full object-cover"
            />
        ) : initials ? (
            <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-orange-400 to-orange-600 text-white text-sm font-bold">
                {initials}
            </div>
        ) : (
            <div className="flex h-full w-full items-center justify-center bg-stone-100 text-stone-400">
                <User className="h-4 w-4" />
            </div>
        );

    const DropdownMenu = ({ bottomAlign }: { bottomAlign?: boolean }) => (
        <div
            className={`absolute right-0 ${bottomAlign ? "bottom-16" : "mt-2"} w-64 overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-2xl shadow-stone-200/80 ring-1 ring-black/5`}
        >
            {/* Header */}
            <div className="relative overflow-hidden px-4 py-4 bg-linear-to-br from-orange-50 to-amber-50 border-b border-orange-100/60">
                <div className="flex items-center gap-3">
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full ring-2 ring-orange-300/60">
                        <AvatarInner />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-stone-900 leading-tight">
                            {user?.displayName || "My Account"}
                        </p>
                        {user?.email && (
                            <p className="truncate text-xs text-stone-500 mt-0.5">
                                {user.email}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Menu items */}
            <div className="p-1.5">
                <Link
                    href={`/profile/${currentUserId}`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-stone-700 transition-all hover:bg-orange-50 hover:text-orange-700 group"
                >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-600 group-hover:bg-orange-200 transition-colors">
                        <User className="h-3.5 w-3.5" />
                    </span>
                    <span className="font-medium">My Profile</span>
                </Link>

                <button
                    type="button"
                    onClick={() => { handleBlockedUsers(); setMenuOpen(false); }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-stone-700 transition-all hover:bg-red-50 hover:text-red-700 group"
                >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-stone-500 group-hover:bg-red-100 group-hover:text-red-500 transition-colors">
                        <Ban className="h-3.5 w-3.5" />
                    </span>
                    <span className="font-medium">Blocked Users</span>
                </button>

                <div className="my-1 border-t border-stone-100" />

                <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-stone-500 transition-all hover:bg-stone-50 hover:text-stone-800 group"
                >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-stone-400 group-hover:bg-stone-200 transition-colors">
                        <LogOut className="h-3.5 w-3.5" />
                    </span>
                    <span className="font-medium">Sign out</span>
                </button>
            </div>
        </div>
    );

    return (
        <header className={`${isMobile ? "fixed w-full bottom-0" : "sticky top-0"} z-50 border-b border-stone-200/80 bg-white/95 backdrop-blur-lg shadow-sm shadow-stone-200/40`}>
            {!isMobile && <div className="h-px w-full bg-linear-to-r from-transparent via-orange-400/50 to-transparent" />}
            {!isMobile ?
                <nav className={`mx-auto ${!sidebarOpen && "xl:max-w-5/6"} flex flex-wrap items-center justify-between w-full gap-4 px-5 py-4 md:px-8`}>
                    <button
                        onClick={onToggleSidebar}
                        className={`flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-xl border shadow-sm transition-all duration-200 ${
                            sidebarOpen
                                ? "border-orange-200 bg-orange-50"
                                : "border-stone-200 bg-white hover:border-orange-200 hover:bg-orange-50/60 hover:shadow-md"
                        }`}
                    >
                        <span className={`block h-0.5 w-5 rounded-full transition-all duration-200 ${sidebarOpen ? "translate-y-2 rotate-45 bg-orange-500" : "bg-stone-600"}`} />
                        <span className={`block h-0.5 w-5 rounded-full transition-all duration-200 ${sidebarOpen ? "opacity-0 scale-x-0" : "bg-stone-600"}`} />
                        <span className={`block h-0.5 w-5 rounded-full transition-all duration-200 ${sidebarOpen ? "-translate-y-2 -rotate-45 bg-orange-500" : "bg-stone-600"}`} />
                    </button>
                    <Link
                        href="/"
                        className="shrink-0 transition-opacity hover:opacity-80">
                        {logo}
                    </Link>
                    <div className="order-3 w-full sm:order-2 sm:w-auto sm:flex-1 sm:flex sm:justify-center sm:items-center sm:gap-3">
                        <SearchBar />
                        <div className="hidden sm:block shrink-0">
                            <LocationPicker city={city} state={state} onLocationChange={setLocation} />
                        </div>
                    </div>
                    <div className="ml-auto flex shrink-0 items-center gap-4 px-2 text-xs order-last font-medium text-stone-600 sm:order-3">
                        <Link href="/about" className="text-base font-medium text-stone-500 transition-colors hover:text-orange-500">
                            About
                        </Link>
                        {currentUserId ? (
                            <div className="relative" ref={menuRef}>
                                {/* Profile trigger button */}
                                <button
                                    type="button"
                                    onClick={() => setMenuOpen((prev) => !prev)}
                                    className={`flex items-center gap-2.5 rounded-2xl border px-2 py-1.5 pr-4 transition-all duration-200 shadow-sm
                                        ${menuOpen
                                            ? "border-orange-300 bg-orange-50 shadow-orange-100"
                                            : "border-stone-200 bg-white hover:border-orange-200 hover:bg-orange-50/50 hover:shadow-md"
                                        }`}
                                >
                                    {/* Avatar with ring */}
                                    <div className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-xl ring-2 transition-all duration-200 ${menuOpen ? "ring-orange-400" : "ring-stone-200 group-hover:ring-orange-300"}`}>
                                        <AvatarInner />
                                    </div>
                                    {/* Name */}
                                    <span className="max-w-28 truncate text-base font-semibold text-stone-800">
                                        {user?.displayName?.split(" ")[0] || "Account"}
                                    </span>
                                    {/* Chevron */}
                                    <ChevronDown className={`h-4 w-4 text-stone-400 transition-transform duration-200 ${menuOpen ? "rotate-180 text-orange-400" : ""}`} />
                                </button>

                                {menuOpen && <DropdownMenu />}
                            </div>
                        ) : (
                            <PillButton onClick={() => setIsOnLogin(true)}>
                                Log in
                            </PillButton>
                        )}
                    </div>

                </nav>
                :
                <nav className="mx-auto flex flex-wrap">
                    <div className="w-full flex justify-center py-3 mx-4">
                        <SearchBar/>
                    </div>
                    <div className="w-full flex flex-wrap items-center justify-between border-t border-stone-200 gap-4 px-5 py-3 md:px-8">
                        <Link
                            href="/"
                            className="shrink-0 transition-opacity hover:opacity-80"
                        >
                            {logo}
                        </Link>
                        <IconButton href="/about" label={"About"}>
                            <Info className={"text-stone-600"} />
                        </IconButton>
                        <IconButton href="/mylistings" label={"My Listings"} onClick={e => handleLoginRequired(e)}>
                            <LayoutList className={"text-stone-600"}/>
                        </IconButton>
                        <IconButton href={`/createlisting`} label={"Create Listing"} onClick={e => handleLoginRequired(e)}>
                            <Plus className={"text-stone-600"} />
                        </IconButton>
                        <IconButton href="/favorites" label={"Favorites"} onClick={e => handleLoginRequired(e)}>
                            <Heart className={"text-red-400"} />
                        </IconButton>
                        <IconButton href={`/messages`} label={"Messages"} onClick={e => handleLoginRequired(e)}>
                            <MessageCircle className={"text-stone-600"} />
                        </IconButton>
                        {currentUserId ? (
                            <>
                                <div className="relative" ref={menuRef}>
                                    {menuOpen && <DropdownMenu bottomAlign />}
                                    <button
                                        type="button"
                                        onClick={() => setMenuOpen((prev) => !prev)}
                                        className={`relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl ring-2 transition-all duration-200
                                            ${menuOpen ? "ring-orange-400 shadow-lg shadow-orange-200" : "ring-stone-200 hover:ring-orange-300 shadow-sm hover:shadow-md"}`}
                                    >
                                        <AvatarInner />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <PillButton onClick={() => setIsOnLogin(true)}>
                                Log in
                            </PillButton>
                        )}
                    </div>
                </nav>
            }
            <ModalBlocked open={blockedModalOpen} onClose={() => setBlockedModalOpen(false)} currentUserId={currentUserId} />
        </header>
    );
}