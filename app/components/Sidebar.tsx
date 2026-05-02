"use client"

import React, {useEffect, useState} from "react";
import {
    Home,
    Map,
    Heart,
    Tag,
    MessageCircle,
    Plus,
    ChevronRight,
    MapPin, CircleQuestionMark, ChevronLeft, ChevronsLeft, ChevronsRight,
} from "lucide-react";
import {useIsMobile} from "@/app/hooks/useIsMobile";
import Link from "next/link";
import {useCurrentUser} from "@/app/hooks";
import {usePathname} from "next/navigation";
import {useIsLogin} from "@/app/providers/LoginProvider";
import {useGSAP} from "@gsap/react";
import gsap from "gsap";

const navItems = [
    { label: "Browse Food", Icon: Home, url: "/home" },
    { label: "Favorites", Icon: Heart, url: "/favorites", loginRequired: true },
    { label: "My Listings", Icon: Tag, url: "/mylistings", loginRequired: true },
    { label: "Inbox", Icon: MessageCircle, url: "/messages", loginRequired: true },
];

function NavItem({ Icon = CircleQuestionMark, label = "", url = "", loginRequired = false, badge = 0 }) {
    const currentUserId = useCurrentUser();
    const pathName = usePathname();
    const isActive = url === pathName;
    const {setIsOnLogin} = useIsLogin();

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (!loginRequired || currentUserId) return;

        e.preventDefault();
        setIsOnLogin(true);
    };

    return (
        <Link href={url} onClick={handleClick}
            className={[
                "navItem group flex w-full items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                isActive
                    ? "bg-white/8 text-orange-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                    : "text-white/80 hover:bg-white/6 hover:text-white",
            ].join(" ")}
        >
            <div
                className={[
                    "flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
                    isActive ? "bg-black/20 text-orange-400" : "text-white/80 group-hover:text-white",
                ].join(" ")}
            >
                <Icon size={18} strokeWidth={2.2} />
            </div>

            <span className="flex-1 text-left">{label}</span>

            {badge ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] font-semibold text-white">
          {badge}
        </span>
            ) : null}
        </Link>
    );
}

type SidebarProps = {
    isOpen: boolean;
    setIsOpenAction: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function Sidebar({ isOpen, setIsOpenAction }: SidebarProps) {
    const isMobile = useIsMobile();
    const {setIsOnLogin} = useIsLogin();
    const currentUserId = useCurrentUser();

    useGSAP(() => {
        if (isOpen)
            gsap.fromTo(".navItem",{translateX:-80, autoAlpha:0}, {translateX:0, autoAlpha:1, duration: 0.3, stagger: 0.1, ease: "power2.out"});
    }, [isOpen])


    if (isMobile || !isOpen) return null;

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (currentUserId) return;

        e.preventDefault();
        setIsOnLogin(true);
    };

    return (
        <div className="relative inline-block z-50">
            <aside className={`max-w-1/6 min-w-60 px-3 sticky top-0 h-screen flex flex-col justify-between py-4 bg-[radial-gradient(circle_at_top,#092a24_0%,#082720_42%,#041612_100%)] text-white`}>
                    <>
                        <div>
                            <Link
                                href="/"
                                className="shrink-0 transition-opacity hover:opacity-80"
                            >
                            <div className="px-2 pb-6">
                                <div className="flex items-center gap-2 py-5">
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
                            </div>
                            </Link>
                            <nav className="space-y-1">
                                {navItems.map((item) => (
                                    <NavItem key={item.label} {...item} />
                                ))}
                            </nav>

                            <div className="navItem px-1 pt-8">
                                <Link href={"/createlisting"} onClick={handleClick} className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-400">
                                    <Plus size={16} strokeWidth={2.4} />
                                    <span>Sell Food</span>
                                </Link>
                            </div>
                        </div>
                        <div className="px-2 text-[10px] text-white/45">© 2024 Neighborhood Eats</div>
                    </>
            </aside>
        </div>
    );
}