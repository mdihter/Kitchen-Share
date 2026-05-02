"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

interface props extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
}

export default function PillButton({ children, className = "", ...props }: props) {
    return (
        <button
            {...props}
            className={`px-6 py-2 border-2 bg-orange-500 text-white font-semibold text-base rounded-2xl transition-all duration-200 ease-in-out hover:bg-orange-300 ${className}`}
        >
            {children}
        </button>
    );
}
