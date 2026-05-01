import Link from 'next/link';
import React, {JSX, MouseEventHandler, ReactNode} from 'react';
import {Heart} from "lucide-react";

interface NavItemProps {
    href: string;
    children: JSX.Element;
    label: string;
    onClick?:  MouseEventHandler<HTMLAnchorElement> | undefined;
}

export default function IconButton({ href, children, label, onClick }: NavItemProps) {
    return (
        <Link href={href} className={"group flex flex-col justify-center items-center"} onClick={onClick}>
            <div className="h-6 w-6">
                {children}
            </div>
            <span className="absolute mt-12 opacity-0 transition-opacity group-hover:opacity-100">{label}</span>
        </Link>
    )
}