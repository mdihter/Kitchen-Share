"use client";

import Form from "next/form";
import { useEffect, useMemo, useRef, useState } from "react";
import throttle from "lodash.throttle";
import pb from "@/app/lib/pb";
import { Listing } from "@/app/types/listing";
import { Result } from "@/app/search/page";
import { useRouter } from "next/navigation";
import { Search, UserRoundSearch, MapPinSearch } from "lucide-react";
import {useSearch} from "@/app/hooks/useSearch";
import Link from "next/link";
import {sortListings} from "@/app/api/search";
import {useIsMobile} from "@/app/hooks/useIsMobile";

export default function SearchBar() {
    const [query, setQuery] = useState("");
    const [liveInput, setLiveInput] = useState("");
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isFocused, setIsFocused] = useState(false);

    const isMobile = useIsMobile();

    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    const throttledSetQuery = useMemo(
        () => throttle((q: string) => {setQuery(q);}, 750),
        []
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setLiveInput(value);
        if (value.trim().length === 0) {
            setQuery("");
            throttledSetQuery.cancel();
        }
        else throttledSetQuery(value);
    };

    const selectSuggestion = (item: string) => {
        setLiveInput(item);
        setQuery(item);
        router.push(`/search?query=${encodeURIComponent(item)}`);
    };

    const {listings, users, neighborhoods, loading, error} = useSearch(query, 1, true, false, true);

    // Used to live update the search results as the user types
    useEffect(() => {

        const suggestResults = async() => {
            // Sort food by relevancy
            const filteredListings = sortListings(query, listings);

            const suggestionsSet: Set<string> = new Set();
            filteredListings.map(r => suggestionsSet.add(r.title));
            setSuggestions(Array.from(suggestionsSet));
        }

        suggestResults();

    }, [query, listings]);

    return (
        <div className="relative w-full max-w-xl">
            <Form action="/search" className="w-full">
                <div
                    className={`flex items-center rounded-2xl border border-foreground/20 bg-background/95 px-4 py-3 shadow-sm shadow-foreground/10 transition-all duration-200 ${
                        isFocused
                            ? "border-amber-500 ring-4 ring-amber-100 shadow-md"
                            : "border-stone-200 hover:border-stone-300"
                    }`}
                >
                    <Search className="mr-3 h-7 w-7 text-stone-800" />

                    <input
                        ref={inputRef}
                        name="query"
                        type="text"
                        value={liveInput}
                        placeholder="Search food, neighbors, or neighborhoods"
                        onChange={handleChange}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                        className="w-full bg-transparent text-sm text-stone-800 placeholder:text-stone-500 outline-none md:text-[15px]"
                    />
                </div>
            </Form>

            {isFocused && liveInput && (
                <ul className={`absolute left-0 right-0 z-30 ${isMobile ? "bottom-full mb-2" : "top-full mt-2"} overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl`}>

                    { /* Search Suggestions */}
                    { /* Food */}
                    {suggestions.map((item, idx) => (
                        <Link href={`/search?query=${item}`} key={idx} onMouseDown={() => selectSuggestion(item)}>
                            <li
                                className="cursor-pointer border-b border-stone-100 px-4 py-3 text-sm text-stone-700 transition-colors last:border-b-0 hover:bg-stone-50 hover:text-stone-900"
                            >
                                <div className="flex items-center gap-3">
                                    <Search className="h-4 w-4 text-stone-300" />
                                    <span>{item}</span>
                                </div>
                            </li>
                        </Link>
                    ))}

                    { /* If no suggestions are found */}
                    {suggestions.length == 0 ? <li
                        className="cursor-pointer border-b border-stone-100 px-4 py-3 text-sm text-stone-700 last:border-b-0"
                    >
                        <div className="flex items-center gap-3">
                            <Search className="h-4 w-4 text-stone-300" />
                            <span>No dishes named &quot;{liveInput}&quot;</span>
                        </div>
                    </li> : null}

                    { /* Search for people */ }
                    <Link href={`/search?query=${liveInput}`} onMouseDown={() => selectSuggestion(`@${liveInput}`)}>
                        <li
                            className="cursor-pointer border-b border-stone-100 px-4 py-3 text-sm text-stone-700 transition-colors last:border-b-0 hover:bg-stone-50 hover:text-stone-900"
                        >
                            <div className="flex items-center gap-3">
                                <UserRoundSearch className="h-4 w-4 text-stone-300" />
                                <span>Search People named &quot;{liveInput}&quot;</span>
                            </div>
                        </li>
                    </Link>

                    { /* Search for people */ }
                    <Link href={`/search?query=${liveInput}`} onMouseDown={() => selectSuggestion(`!${liveInput}`)}>
                        <li
                            className="cursor-pointer border-b border-stone-100 px-4 py-3 text-sm text-stone-700 transition-colors last:border-b-0 hover:bg-stone-50 hover:text-stone-900"
                        >
                            <div className="flex items-center gap-3">
                                <UserRoundSearch className="h-4 w-4 text-stone-300" />
                                <span>Search neighborhoods named &quot;{liveInput}&quot;</span>
                            </div>
                        </li>
                    </Link>
                </ul>
            )}
        </div>
    );
}