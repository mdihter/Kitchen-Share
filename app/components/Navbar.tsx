"use client";

import React, { useEffect, useRef, useState } from "react";
import {usePathname} from "next/navigation";
import Link from "next/link";
import pb from "../lib/pb";
import { useCurrentUser } from "../hooks";
import SearchBar from "@/app/components/SearchBar";
import {ChevronDown, User, LogOut, Heart, Map, Info, Plus, MessageCircle, LayoutList, Menu} from "lucide-react";
import PillButton from "@/app/components/PillButton";
import {setAuthRedirect} from "@/app/api/authRedirect";
import IconButton from "@/app/components/IconButton";
import {useIsMobile} from "@/app/hooks/useIsMobile";
import {useIsLogin} from "@/app/providers/LoginProvider";
import {useGSAP} from "@gsap/react";
import gsap from "gsap";

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

    const [user, setUser] = useState<UserRecord | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [searchOpen, setSearchOpen] = useState(false);

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
                <div className={`logoFade flex items-center gap-2 scale-110 ${sidebarOpen && "pointer-events-none absolute top-1/4"}`}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 shadow-lg shadow-orange-500/25">
                        <span className="text-base">🍴</span>
                    </div>
                    <div className="leading-tight">
                        <div className="text-md font-semibold tracking-tight">Neighborhood</div>
                        <div className="text-md font-semibold tracking-tight text-orange-400">
                            Eats
                        </div>
                    </div>
                </div>
        :
        <div className="text-2xl font-bold text-orange-500">
            N
        </div>);

    return (
        <header className={`${isMobile ? "fixed w-full bottom-0" : "sticky top-0"} z-50 border-b border-t border-stone-300 bg-white/90 backdrop-blur-md`}>
            {!isMobile ?
                <nav className={`mx-auto ${!sidebarOpen && "xl:max-w-5/6"} flex flex-wrap items-center justify-between w-full gap-4 px-5 py-4 md:px-8`}>
                    <button onClick={onToggleSidebar} className={"border border-foreground/20 shadow-sm shadow-foreground/10 rounded-2xl px-2 py-2.5 mr-4"}>
                        <Menu className="h-6 w-7 text-stone-800 transition-colors hover:text-stone-900"/>
                    </button>
                    <Link
                        href="/"
                        className="shrink-0 transition-opacity hover:opacity-80">
                        {logo}
                    </Link>
                    <div className="order-3 w-full sm:order-2 sm:w-auto sm:flex-1 sm:flex sm:justify-center">
                        <SearchBar />
                    </div>
                    <div className="ml-auto flex shrink-0 items-center gap-6 px-4 text-xs order-last font-medium text-stone-600 sm:order-3">
                        <IconButton href="/about" label={"About"}>
                            <Info className={"text-stone-600"} />
                        </IconButton>
                        {currentUserId ? (
                            <>
                                <div className="relative" ref={menuRef}>
                                    <button
                                        type="button"
                                        onClick={() => setMenuOpen((prev) => !prev)}
                                        className="rounded-full border border-stone-300 bg-white font-medium text-stone-800 shadow-sm transition-all hover:border-stone-400 hover:bg-stone-50"
                                    >
                                        <div className="h-10 w-10 overflow-hidden rounded-full bg-stone-100">
                                            {avatarUrl ? (
                                                <img
                                                    src={avatarUrl}
                                                    alt={user?.displayName || "User avatar"}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-stone-500">
                                                    <User className="h-4 w-4" />
                                                </div>
                                            )}
                                        </div>
                                    </button>

                                    {menuOpen && (
                                        <div className="absolute right-0 mt-3 w-56 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
                                            <div className="border-b border-stone-100 px-4 py-3">
                                                <p className="truncate text-sm font-semibold text-stone-900">
                                                    {user?.displayName || "My Account"}
                                                </p>
                                                {user?.email && (
                                                    <p className="truncate text-xs text-stone-500">
                                                        {user.email}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="p-2">
                                                <Link
                                                    href={`/profile/${currentUserId}`}
                                                    onClick={() => setMenuOpen(false)}
                                                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50 hover:text-stone-900"
                                                >
                                                    <User className="h-4 w-4" />
                                                    <span>Profile</span>
                                                </Link>

                                                <button
                                                    type="button"
                                                    onClick={handleLogout}
                                                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-stone-700 transition-colors hover:bg-stone-50 hover:text-stone-900"
                                                >
                                                    <LogOut className="h-4 w-4" />
                                                    <span>Logout</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <PillButton onClick={()=> setIsOnLogin(true)}>
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
                    <div className="w-full flex flex-wrap items-center justify-between border-t border-stone-300 gap-4 px-5 py-4 md:px-8">
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
                                    {menuOpen && (
                                    <div className="absolute right-0 bottom-18 w-56 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
                                        <div className="border-b border-stone-100 px-4 py-3">
                                            <p className="truncate text-sm font-semibold text-stone-900">
                                                {user?.displayName || "My Account"}
                                            </p>
                                            {user?.email && (
                                                <p className="truncate text-xs text-stone-500">
                                                    {user.email}
                                                </p>
                                            )}
                                        </div>

                                        <div className="p-2">
                                            <Link
                                                href={`/profile/${currentUserId}`}
                                                onClick={() => setMenuOpen(false)}
                                                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50 hover:text-stone-900"
                                            >
                                                <User className="h-4 w-4" />
                                                <span>Profile</span>
                                            </Link>

                                            <button
                                                type="button"
                                                onClick={handleLogout}
                                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-stone-700 transition-colors hover:bg-stone-50 hover:text-stone-900"
                                            >
                                                <LogOut className="h-4 w-4" />
                                                <span>Logout</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                                    <button
                                        type="button"
                                        onClick={() => setMenuOpen((prev) => !prev)}
                                        className="rounded-full border border-stone-300 bg-white font-medium text-stone-800 shadow-sm transition-all hover:border-stone-400 hover:bg-stone-50"
                                    >
                                        <div className="h-10 w-10 overflow-hidden rounded-full bg-stone-100">
                                            {avatarUrl ? (
                                                <img
                                                    src={avatarUrl}
                                                    alt={user?.displayName || "User avatar"}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-stone-500">
                                                    <User className="h-4 w-4" />
                                                </div>
                                            )}
                                        </div>
                                    </button>


                                </div>
                            </>
                        ) : (
                            <PillButton onClick={()=> setIsOnLogin(true)}>
                                Log in
                            </PillButton>
                        )}
                    </div>
                </nav>
            }

        </header>
    );
}