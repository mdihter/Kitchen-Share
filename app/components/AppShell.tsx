"use client";

import { useState } from "react";
import Navbar from "@/app/components/Navbar";
import Sidebar from "@/app/components/Sidebar";
import ModalLogin from "@/app/components/ModalLogin";
import ModalListing from "@/app/components/ModalListing";
import {LoginProvider} from "@/app/providers/LoginProvider";
import {ListingProvider} from "@/app/providers/ListingProvider";

export default function AppShell({
                                     children,
                                 }: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <LoginProvider>
            <ListingProvider>
                <div className="flex flex-row">
                    <Sidebar isOpen={sidebarOpen} setIsOpenAction={setSidebarOpen} />

                    <div className="relative mx-auto w-full">
                        <Navbar sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
                        <ModalLogin />
                        <ModalListing />
                        {children}
                    </div>
                </div>
            </ListingProvider>
        </LoginProvider>
    );
}