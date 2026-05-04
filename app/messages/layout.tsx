'use client';

import type {RecordModel} from 'pocketbase';
import {useConversations, useCurrentUser} from '../hooks';
import pb from '../lib/pb';
import {formatRelativeTime} from '../lib/formatTime';
import {getBlockedByUserIds, getBlockedUserIds} from '../lib/blockUtils';
import Link from 'next/link';
import {Suspense, useEffect, useRef, useState} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import {Search} from 'lucide-react';
import {RemoveConversationContext as RemoveConversationContext1, RemoveArchivedConversationContext} from "@/app/messages/removeConversationContext";

type Tab = 'inbox' | 'dm' | 'archived';

function MessagesShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [activeTab, setActiveTab] = useState<Tab>('inbox');
    const [archivedEverOpened, setArchivedEverOpened] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 7;

    const currentUserId = useCurrentUser();
    const { conversations, loading, removeConversation } = useConversations(currentUserId);
    const { conversations: archivedConversations, loading: archivedLoading, removeConversation: removeArchivedConversation } = useConversations(
        archivedEverOpened ? currentUserId : null,
        true
    );
    const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
    const [blockedByUserIds, setBlockedByUserIds] = useState<string[]>([]);

    // Extract active conversation ID from path
    const activeConvoId = pathname.startsWith('/messages/')
        ? pathname.split('/messages/')[1]?.split('/')[0]
        : null;

    const router = useRouter();

    const handleTabChange = (tab: Tab) => {
        if (tab === 'archived') setArchivedEverOpened(true);
        setActiveTab(tab);

        // Pick the list for the target tab and navigate to its first item, or /messages if empty
        const targetList =
            tab === 'archived' ? visibleArchived
            : tab === 'dm'    ? visibleConversations.filter(c => !c.listing)
            :                    visibleConversations.filter(c => !!c.listing);

        const first = targetList[0];
        router.push(first ? `/messages/${first.id}` : `/messages?tab=${tab}`);
    };

    // Auto-switch to archived tab when the active conversation becomes archived mid-session.
    const wasInActiveListRef = useRef(false);
    useEffect(() => {
        if (!activeConvoId || loading) return;
        const inActive = conversations.some(c => c.id === activeConvoId);
        if (inActive) {
            wasInActiveListRef.current = true;
        } else if (wasInActiveListRef.current && activeTab !== 'archived') {
            // Was active, now gone — it got archived. Defer to avoid setState-in-effect warning.
            wasInActiveListRef.current = false;
            setTimeout(() => {
                setArchivedEverOpened(true);
                setActiveTab('archived');
            }, 0);
        }
    }, [activeConvoId, conversations, loading, activeTab]);

    // Reset the tracking ref when navigating to a different conversation
    const prevConvoIdRef = useRef<string | null>(null);
    useEffect(() => {
        if (activeConvoId !== prevConvoIdRef.current) {
            prevConvoIdRef.current = activeConvoId;
            wasInActiveListRef.current = false;
        }
    }, [activeConvoId]);

    // Lock body scroll while messages page is open
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, []);

    useEffect(() => {
        if (!currentUserId) return;
        Promise.all([
            getBlockedUserIds(currentUserId),
            getBlockedByUserIds(currentUserId),
        ]).then(([blocked, blockedBy]) => {
            setBlockedUserIds(blocked);
            setBlockedByUserIds(blockedBy);
        });
    }, [currentUserId]);

    const filterBlocked = (list: RecordModel[]) =>
        list.filter((convo) => {
            const otherUserId = convo.buyer === currentUserId ? convo.seller : convo.buyer;
            return !blockedUserIds.includes(otherUserId) && !blockedByUserIds.includes(otherUserId);
        });

    const visibleConversations = filterBlocked(conversations);
    const visibleArchived = filterBlocked(archivedConversations);

    const isLoading = activeTab === 'archived' ? archivedLoading : loading;
    const displayList =
        activeTab === 'archived' ? visibleArchived
        : activeTab === 'dm'    ? visibleConversations.filter(c => !c.listing)
        :                          visibleConversations.filter(c => !!c.listing);

    const getOtherUser = (convo: RecordModel) =>
        convo.buyer === currentUserId ? convo.expand?.seller : convo.expand?.buyer;

    const filteredList = searchQuery.trim()
        ? displayList.filter((convo) => {
              const otherUser = getOtherUser(convo);
              const listing = convo.expand?.listing;
              const q = searchQuery.toLowerCase();
              return (
                  (otherUser?.displayName?.toLowerCase() || '').includes(q) ||
                  (listing?.title?.toLowerCase() || '').includes(q) ||
                  (convo.last_message || '').toLowerCase().includes(q)
              );
          })
        : displayList;

    const totalPages = Math.max(1, Math.ceil(filteredList.length / ITEMS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const pagedList = filteredList.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

    // Reset to page 1 when tab or search changes (render-time state update per React docs)
    const [prevTab, setPrevTab] = useState(activeTab);
    const [prevQuery, setPrevQuery] = useState(searchQuery);
    if (prevTab !== activeTab || prevQuery !== searchQuery) {
        setPrevTab(activeTab);
        setPrevQuery(searchQuery);
        setCurrentPage(1);
    }

    if (!currentUserId) {
        return (
            <div className="flex overflow-hidden bg-gray-50" style={{ height: 'calc(100vh - 73px)' }}>
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-gray-500 text-sm">
                        Please{' '}
                        <a href="/auth" className="text-orange-500 hover:underline">
                            log in
                        </a>{' '}
                        to view your messages.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <RemoveConversationContext1 value={removeConversation}>
        <RemoveArchivedConversationContext value={removeArchivedConversation}>
        <div className="flex overflow-hidden bg-gray-50" style={{ height: 'calc(100vh - 73px)' }}>
            {/* ── Conversation list panel ── */}
            <div className="w-105 shrink-0 flex flex-col border-r border-gray-200 bg-white">
                {/* Unified header: title + tabs + search */}
                <div className="shrink-0">
                    <div className="px-6 pt-6 pb-4">
                        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Inbox</h1>
                    </div>

                    {/* Tabs */}
                    <div className="flex px-6 border-b border-gray-200">
                        <button
                            onClick={() => handleTabChange('inbox')}
                            className={`pb-3 pr-6 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                                activeTab === 'inbox'
                                    ? 'border-orange-500 text-orange-600'
                                    : 'border-transparent text-gray-400 hover:text-gray-700'
                            }`}
                        >
                            Offers
                        </button>
                        <button
                            onClick={() => handleTabChange('dm')}
                            className={`pb-3 pr-6 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                                activeTab === 'dm'
                                    ? 'border-orange-500 text-orange-600'
                                    : 'border-transparent text-gray-400 hover:text-gray-700'
                            }`}
                        >
                            DMs
                        </button>
                        <button
                            onClick={() => handleTabChange('archived')}
                            className={`pb-3 pr-6 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                                activeTab === 'archived'
                                    ? 'border-orange-500 text-orange-600'
                                    : 'border-transparent text-gray-400 hover:text-gray-700'
                            }`}
                        >
                            Archived
                        </button>
                    </div>

                    {/* Search */}
                    <div className="px-5 py-3">
                        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 focus-within:border-orange-300 transition-colors">
                            <Search size={14} className="text-gray-400 shrink-0" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search conversations…"
                                className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Conversation rows */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {isLoading ? (
                        <div className="flex items-center justify-center flex-1">
                            <p className="text-sm text-gray-400">Loading…</p>
                        </div>
                    ) : filteredList.length === 0 ? (
                        <div className="flex items-center justify-center flex-1 px-6 text-center">
                            <p className="text-sm text-gray-400">
                                {searchQuery
                                    ? 'No matches found.'
                                    : activeTab === 'archived'
                                    ? 'No archived conversations.'
                                    : activeTab === 'dm'
                                    ? 'No direct messages.'
                                    : 'No offers found.'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 divide-y divide-gray-100/80">
                                {pagedList.map((convo) => {
                            const otherUser = getOtherUser(convo);
                            const listing = convo.expand?.listing;
                            const listingImageUrl = listing?.main_image
                                ? pb.files.getURL(listing, listing.main_image)
                                : (convo.cached_listing_image_url as string | undefined) ?? '';
                            const avatarUrl = !listingImageUrl && otherUser?.avatar
                                ? pb.files.getURL(otherUser, otherUser.avatar, { thumb: '100x100' })
                                : '';
                            const saleStatus = convo.saleConfirmed
                                ? 'confirmed'
                                : convo.saleCancelled
                                ? 'cancelled'
                                : null;
                            const isActive = convo.id === activeConvoId;

                            return (
                                <Link
                                    key={convo.id}
                                    href={`/messages/${convo.id}`}
                                    className={`group flex items-center gap-3.5 px-3 py-3.5 mx-2 my-0.5 rounded-xl transition-all ${
                                        isActive
                                            ? 'bg-orange-50 shadow-sm ring-1 ring-orange-100'
                                            : 'hover:bg-gray-50'
                                    }`}
                                >
                                    {/* Listing image thumbnail */}
                                    <div className={`shrink-0 w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center transition-all ${
                                        isActive
                                            ? 'ring-2 ring-orange-200 shadow-sm'
                                            : 'ring-1 ring-gray-200 group-hover:ring-gray-300'
                                    }`}>
                                        {listingImageUrl ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img
                                                src={listingImageUrl}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        ) : avatarUrl ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img
                                                src={avatarUrl}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-2xl">🍽️</span>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        {/* Listing title + time */}
                                        <div className="flex justify-between items-baseline gap-2 mb-0.5">
                                            <p className={`text-[13.5px] truncate flex-1 leading-snug ${
                                                isActive ? 'font-bold text-orange-700' : 'font-semibold text-gray-900'
                                            }`}>
                                                {listing?.title || convo.cached_listing_title || 'Direct message'}
                                            </p>
                                            <span className="text-[11px] text-gray-400 shrink-0 tabular-nums">
                                                {formatRelativeTime(convo.updated)}
                                            </span>
                                        </div>
                                        {/* Person name with dot */}
                                        <p className="text-xs text-gray-500 truncate mb-1 flex items-center gap-1">
                                            <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                                                isActive ? 'bg-orange-400' : 'bg-gray-300'
                                            }`} />
                                            {otherUser?.displayName || 'Unknown'}
                                        </p>
                                        {/* Last message + badge */}
                                        <div className="flex items-center justify-between gap-1">
                                            <p className={`text-[11.5px] truncate flex-1 ${
                                                convo.last_message ? 'text-gray-400' : 'text-gray-300 italic'
                                            }`}>
                                                {convo.last_message || 'No messages yet'}
                                            </p>
                                            {saleStatus && (
                                                <span className={`inline-flex shrink-0 items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                                    saleStatus === 'confirmed'
                                                        ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100'
                                                        : 'bg-red-50 text-red-600 ring-1 ring-red-100'
                                                }`}>
                                                    {saleStatus === 'confirmed' ? 'Sold' : 'Cancelled'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            );})}
                            </div>

                            {/* Pagination navigator */}
                            <div className="shrink-0 flex items-center justify-center gap-1.5 px-5 py-3 border-t border-gray-100">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={safePage === 1}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        aria-label="Previous page"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>

                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                                        .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                                            if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                                            acc.push(p);
                                            return acc;
                                        }, [])
                                        .map((item, idx) =>
                                            item === 'ellipsis' ? (
                                                <span key={`e-${idx}`} className="w-8 text-center text-xs text-gray-400">…</span>
                                            ) : (
                                                <button
                                                    key={item}
                                                    onClick={() => setCurrentPage(item as number)}
                                                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                                        safePage === item
                                                            ? 'bg-orange-500 text-white'
                                                            : 'text-gray-600 hover:bg-gray-100'
                                                    }`}
                                                >
                                                    {item}
                                                </button>
                                            )
                                        )
                                    }

                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={safePage === totalPages}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        aria-label="Next page"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                        </>
                    )}
                </div>
            </div>

            {/* ── Right panel (page content) ── */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">{children}</div>
        </div>
        </RemoveArchivedConversationContext>
        </RemoveConversationContext1>
    );
}

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense
            fallback={
                <div className="flex overflow-hidden bg-gray-50" style={{ height: 'calc(100vh - 73px)' }}>
                    <div className="w-105 shrink-0 border-r border-gray-200 bg-white flex items-center justify-center">
                        <p className="text-sm text-gray-400">Loading…</p>
                    </div>
                    <div className="flex-1" />
                </div>
            }
        >
            <MessagesShell>{children}</MessagesShell>
        </Suspense>
    );
}
