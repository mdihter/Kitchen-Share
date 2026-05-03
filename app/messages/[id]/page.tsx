'use client';

import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback, KeyboardEvent, useContext } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCurrentUser, useConversation } from '../../hooks';
import pb from '../../lib/pb';
import { getDateKey, formatTime, formatDateSeparator } from '../../lib/formatTime';
import { hasBlocked, isBlockedBy } from '@/app/lib/blockUtils';
import { useIsListing } from '@/app/providers/ListingProvider';

import {RemoveConversationContext} from "@/app/messages/removeConversationContext";
import {useIsLogin} from "@/app/providers/LoginProvider";
import BuyerRatingModal from "@/app/messages/[id]/BuyerRatingModal";

export default function ConversationPage() {
    const router = useRouter();
    const params = useParams();
    const conversationId = params.id as string;
    const currentUserId = useCurrentUser();
    const {
        conversation,
        messages,
        loading,
        loadingMore,
        hasMore,
        sending,
        error,
        sendMessage,
        loadMore
    } = useConversation(conversationId, currentUserId);

    const { setIsOnLogin } = useIsLogin();
    const { openListing } = useIsListing();
    const removeConversation = useContext(RemoveConversationContext);
    const [finalizationError, setFinalizationError] = useState('');
    const [isBlocked, setIsBlocked] = useState(false);
    const [showCancel, setShowCancel] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Rating state
    const [selectedRating, setSelectedRating] = useState(0);
    const [submittingRating, setSubmittingRating] = useState(false);
    const [ratingError, setRatingError] = useState('');
    const [hasReviewed, setHasReviewed] = useState(false);
    const [showModalRating, setShowModalRating] = useState(true
    );

    // Show "unavailable" page if the other user is blocked OR has blocked current user
    useEffect(() => {
        if (!currentUserId || !conversation) return;

        const otherUserId = conversation.buyer === currentUserId
            ? conversation.seller
            : conversation.buyer;

        let cancelled = false;

        const checkBlocked = async () => {
            if (!cancelled) setIsBlocked(false);
            const [blocked, blockedBy] = await Promise.all([
                hasBlocked(currentUserId, otherUserId),
                isBlockedBy(currentUserId, otherUserId),
            ]);
            if (!cancelled && (blocked || blockedBy)) {
                setIsBlocked(true);
            }
        };
        checkBlocked();
        return () => { cancelled = true; };
    }, [currentUserId, conversation]);

    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [newMessage]);

    // scroll to bottom on initial load / new message
    const prevMessageCountRef = useRef(0);
    useLayoutEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const prevCount = prevMessageCountRef.current;
        const newCount = messages.length;
        prevMessageCountRef.current = newCount;

        if (prevCount === 0) {
            // initial load — jump straight to bottom
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        } else if (newCount > prevCount) {
            const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
            if (isAtBottom) {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [messages]);

    // preserve scroll position when older messages are prepended
    const prevScrollHeightRef = useRef(0);
    const handleScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        if (container.scrollTop <= 4 && hasMore && !loadingMore) {
            // save scroll height
            prevScrollHeightRef.current = container.scrollHeight;
            loadMore();
        }
    }, [hasMore, loadingMore, loadMore]);


    useLayoutEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || !prevScrollHeightRef.current) return;

        const newScrollHeight = container.scrollHeight;
        const delta = newScrollHeight - prevScrollHeightRef.current;
        if (delta > 0) {
            container.scrollTop = delta;
            prevScrollHeightRef.current = 0;
        }
    }, [messages]);

    const messagesWithDates = useMemo(() =>
            messages.map((msg, i) => ({
                msg,
                showDateSep: i === 0 || getDateKey(msg['created']) !== getDateKey(messages[i - 1]['created']),
            })),
        [messages]);

    const lastSentId = useMemo(() => {
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i]['sender'] === currentUserId) return messages[i].id;
        }
        return null;
    }, [messages, currentUserId]);


    const isBuyer = conversation?.buyer === currentUserId;
    const hasConfirmed = isBuyer ? conversation?.buyer_confirmed : conversation?.seller_confirmed;
    const otherUser = isBuyer ? conversation?.expand?.seller : conversation?.expand?.buyer;
    const listing = conversation?.expand?.listing;
    const isArchived = isBuyer ? !!conversation?.buyer_archived : !!conversation?.seller_archived;
    const cachedListingTitle = conversation?.cached_listing_title as string | undefined;
    const cachedListingPrice = conversation?.cached_listing_price as number | undefined;
    const cachedListingImageUrl = conversation?.cached_listing_image_url as string | undefined;
    const hasListingInfo = !!(listing || cachedListingTitle);
    const otherAvatarUrl = otherUser?.avatar ? pb.files.getURL(otherUser, otherUser.avatar) : '/placeholder-avatar.png';
    const listingImageUrl = listing?.main_image
        ? pb.files.getURL(listing, listing.main_image)
        : cachedListingImageUrl ?? '';
    const listingPrice = listing?.price ?? cachedListingPrice ?? -1;
    const listingTitle = listing?.title ?? cachedListingTitle;
    const offerPrice = conversation?.offerPrice ?? conversation?.initial_offer ?? null;
    const saleStatus = conversation?.saleConfirmed ? 'confirmed' : conversation?.saleCancelled ? 'cancelled' : null;

    //check if confimred convo was already rated by buyer, if so hide rating component
   useEffect(() => {
       if (!conversation || !currentUserId || !isBuyer || saleStatus !== 'confirmed'){
           setHasReviewed(false);
           return;


       }
       setHasReviewed(Boolean(conversation?.buyerRated));
   }, [conversation, currentUserId, isBuyer, saleStatus]);


    // buyer submits a rating after sale is confirmed
    const handleSubmitRating = useCallback(async () => {
        if (!conversation || !currentUserId || !isBuyer || selectedRating === 0) return;

        try {
            setSubmittingRating(true);
            setRatingError('');

            const sellerId = conversation.seller;
            const listingId = conversation.expand?.listing?.id;

            if (!sellerId || !listingId) {
                setRatingError('Seller or listing information is missing.');
                return;
            }

            if(conversation.buyerRated){
                 setHasReviewed(true);
                 return;
            }

            const cachedListing = conversation.expand?.listing;
            const builtImageUrl = cachedListing?.main_image
                ? pb.files.getURL(cachedListing, cachedListing.main_image)
                : null;

            //create rating record in database
            await pb.collection('ratings').create({
                buyer: currentUserId,
                seller: sellerId,
                listing: listingId,
                rating: selectedRating,
            });

            //archive conversation, lock typing
            await pb.collection('conversations').update(conversation.id, {
                buyerRated: true,
                buyer_archived: true,
                seller_archived: true,
                cached_listing_title: cachedListing?.title ?? null,
                cached_listing_price: cachedListing?.price ?? null,
                cached_listing_image_url: builtImageUrl,
            });
            return;
        } catch (err: unknown) {
            console.error("Submit rating error:", err);
            console.error("Submit rating error data:", (err as { response?: { data?: unknown } })?.response?.data);
            setRatingError((err as Error)?.message || 'Failed to submit rating.');
        } finally {
            setSubmittingRating(false);
        }
    }, [conversation, currentUserId, isBuyer, selectedRating, router]);

    const handleEndConversation = useCallback(async (): Promise<boolean> => {
       if(!conversationId) return false;
       setFinalizationError('');

       try{
           const conversationOnline = await pb.collection('conversations').getOne(conversation?.id ? conversation.id : conversationId);
           // Archive convo
           await pb.collection('conversations').update(conversationId, {
               buyer_archived: (conversationOnline?.buyer_archived || isBuyer),
               seller_archived: (conversationOnline?.seller_archived || !isBuyer),
               buyer_deleted: (conversationOnline?.buyer_deleted || isBuyer),
               seller_deleted: (conversationOnline?.seller_deleted || !isBuyer),
               cached_listing_title: conversation?.title ?? null,
               cached_listing_price: conversation?.price ?? null,
               cached_listing_image_url: conversation?.main_image ? pb.files.getURL(conversation, conversation.main_image) : null
           });
           //redirect back to messages list
           router.push('/messages');
           return true;
       }catch(err: unknown){
           console.error("Error ending conversation:", err);
            setFinalizationError((err as Error)?.message || 'Failed to end conversation. Please try again.');
           return false;
       }
   }, [conversationId, router, removeConversation]);

    const handleTwoWayConfirm = useCallback(async (): Promise<boolean> => {
        if(!conversationId) return false;
        setFinalizationError('');

        try{
            const conversationOnline = await pb.collection('conversations').getOne(conversation?.id ? conversation.id : conversationId);

            const buyerConfirmed = conversationOnline?.buyer_confirmed || isBuyer;
            const sellerConfirmed = conversationOnline?.seller_confirmed || !isBuyer;
            const saleConfirmed = buyerConfirmed && sellerConfirmed;
            await pb.collection('conversations').update(conversationId, {
                buyer_confirmed: buyerConfirmed,
                seller_confirmed: sellerConfirmed,
                saleConfirmed: saleConfirmed,
                buyer_archived: false,
                seller_archived: saleConfirmed,
            });
            return true;
        } catch(err: unknown){
            console.error("Error confirming sale:", err);
            setFinalizationError((err as Error)?.message || 'Failed to confirm sale. Please try again.');
            return false;
        }
    },[conversationId, isBuyer, router])

    const handleConfirm = useCallback(async (): Promise<boolean> => {
        if(!conversationId) return false;
        setFinalizationError('');

        try{
            await pb.collection('conversations').update(conversationId, {
                buyer_confirmed: false,
                seller_confirmed: true,
                saleConfirmed: true,
                buyer_archived: false,
                seller_archived: true,
            });
            return true;
        } catch(err: unknown){
            console.error("Error confirming sale:", err);
            setFinalizationError((err as Error)?.message || 'Failed to confirm sale. Please try again.');
            return false;
        }
    },[conversationId, isBuyer, router])

    if (!currentUserId) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
                <p className="text-gray-500 text-sm">
                    Please{' '}
                    <a onClick={() => setIsOnLogin(true)} className="text-orange-500 hover:underline">log in</a>{' '}
                    to view messages.
                </p>
            </div>
        );
    }

    if (isBlocked) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h1 className="text-lg font-bold text-gray-800 mb-2">Conversation Unavailable</h1>
                    <p className="text-sm text-gray-500">This conversation is not available.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
                <p className="text-gray-400 text-sm">Loading…</p>
            </div>
        );
    }

    if (error && !conversation) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
                <p className="text-red-500 text-sm">{error}</p>
            </div>
        );
    }

    const handleSend = async () => {
        if (!newMessage.trim()) return;
        const msg = newMessage;
        setNewMessage('');
        try {
            await sendMessage(msg);
        } catch {
            setNewMessage(msg);
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-white min-w-0">
            {/* ── Top bar ── */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-4 shrink-0 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
                <button
                    onClick={() => otherUser?.id && router.push(`/profile/${otherUser.id}`)}
                    className="flex items-center gap-4 min-w-0 flex-1 text-left cursor-pointer"
                >
                    <div className="relative shrink-0">
                        <div className="w-13 h-13 rounded-full bg-gray-200 overflow-hidden border border-gray-100 flex items-center justify-center">
                            {otherAvatarUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={otherAvatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-xl text-gray-400">👤</span>
                            )}
                        </div>
                        {hasListingInfo && listingImageUrl !== '/placeholder.png' && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-md overflow-hidden border-2 border-white shadow-sm bg-gray-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={listingImageUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-base font-bold text-gray-900 truncate leading-snug">
                            {otherUser?.displayName || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-500 truncate mt-0.5">
                            {hasListingInfo ? (
                                <>
                                    {listingTitle && (listingTitle.length > 40 ? listingTitle.slice(0, 40) + '…' : listingTitle)}
                                    {listingPrice !== -1 && <span className="text-gray-400"> · ${listingPrice.toFixed(2)}</span>}
                                </>
                            ) : 'Direct message'}
                        </p>
                    </div>
                </button>

                <div className="flex items-center gap-2 shrink-0">
                    {listing && (
                        <button
                            type="button"
                            onClick={() => openListing(listing.id)}
                            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                        >
                            View Listing
                        </button>
                    )}
                    {(!listing ? !isArchived : !saleStatus && !isArchived) && (
                        <div className="flex items-center gap-1.5">
                            {showConfirm ? (
                                    <>
                                        <span className="text-xs text-gray-400 mr-1">{listing ? 'Confirm Sale?' : 'Delete DM?'}</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowConfirm(false);
                                            }}
                                            className="px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const ok = await handleConfirm();
                                                if (ok) setShowConfirm(false);
                                            }}
                                            className="px-3 py-1.5 rounded-lg text-sm font-medium text-emerald-600 border border-green-300 hover:bg-emerald-50 transition-colors"
                                        >
                                            Confirm
                                        </button>
                                    </>
                                )
                                :
                                showCancel ? (
                                <>
                                    <span className="text-xs text-gray-400 mr-1">{listing ? 'Cancel request?' : 'Delete DM?'}</span>
                                    <button
                                        type="button"
                                        onClick={() => setShowCancel(false)}
                                        className="px-3 py-1.5 rounded-lg text-sm font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
                                    >
                                        Keep
                                    </button>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            const ok = await handleEndConversation();
                                            if (ok) setShowCancel(false);
                                        }}
                                        className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors"
                                    >
                                        Confirm
                                    </button>
                                </>
                            ) : (
                                <>
                                    {!isBuyer &&
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm(true)}
                                            className="px-4 py-2 rounded-xl border border-green-200 text-sm font-semibold text-green-600 hover:bg-green-50 hover:border-green-300 transition-colors"
                                        >
                                            Confirm Sale
                                        </button>
                                    }
                                    <button
                                        type="button"
                                        onClick={() => setShowCancel(true)}
                                        className="px-4 py-2 rounded-xl border border-red-200 text-sm font-semibold text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors"
                                    >
                                        {listing ? (isBuyer ? 'Cancel Request' : 'Decline Request') : 'Delete DM'}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                    <button
                        type="button"
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        aria-label="More options"
                    >
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                            <circle cx="12" cy="5" r="1.8" />
                            <circle cx="12" cy="12" r="1.8" />
                            <circle cx="12" cy="19" r="1.8" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* ── Deletion error ── */}
            {finalizationError && !saleStatus && (
                <div className="shrink-0 px-6 py-2.5 bg-red-50 border-b border-red-100">
                    <p className="text-sm text-red-600">{finalizationError}</p>
                </div>
            )}

            {/* ── Sale status banner ── */}
            {saleStatus && (
                <div className={`px-6 py-3.5 border-b shrink-0 flex items-center justify-between gap-3 ${
                    saleStatus === 'confirmed'
                        ? 'bg-emerald-50 border-emerald-100'
                        : 'bg-red-50 border-red-100'
                }`}>
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
                            saleStatus === 'confirmed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                        }`}>
                            {saleStatus === 'confirmed' ? '✓ Sale confirmed' : '✕ Sale cancelled'}
                        </span>
                        <p className="text-sm text-gray-500">
                            {saleStatus === 'confirmed'
                                ? 'The listing has been marked unavailable.'
                                : 'This sale has been cancelled by the seller.'}
                        </p>
                    </div>
                    {saleStatus === 'cancelled' && (
                        <button
                            type="button"
                            onClick={handleEndConversation}
                            className="shrink-0 text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
                        >
                            End Conversation
                        </button>
                    )}
                    {finalizationError && (
                        <p className="text-red-500 text-sm">{finalizationError}</p>
                    )}
                </div>
            )}

            {/* ── Buyer rating area ── */}
            {isBuyer && saleStatus === 'confirmed' && (
                <div className="px-6 py-4 border-b border-orange-100 bg-orange-50 shrink-0">
                    {hasReviewed ? (
                        <p className="text-sm text-emerald-600 font-medium">
                            Thank you! Your rating has been submitted.
                        </p>
                    ) : (
                        <div>
                            <BuyerRatingModal isOpen={showModalRating} selectedRating={selectedRating} submittingRating={submittingRating}
                                              onSelectRating={setSelectedRating} onSubmit={handleSubmitRating}
                                              onClose={() => {setShowModalRating(false)}} ratingError={ratingError}/>
                            <div className={"flex flex-row gap-4 items-center"}>
                                <p className="text-sm font-semibold text-gray-700">Give Feedback:</p>
                                <button
                                    type="button"
                                    onClick={() => setShowModalRating(true)}
                                    className="px-5 py-2 rounded-full bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                >
                                    Rate this seller
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Messages area ── */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-8 py-6 bg-gray-50"
            >
                <div className="space-y-3">
                    {loadingMore && (
                        <p className="text-center text-gray-400 text-sm py-3">Loading…</p>
                    )}
                    {!hasMore && messages.length > 0 && (
                        <p className="text-center text-gray-400 text-sm py-3">Beginning of conversation</p>
                    )}
                    {messages.length === 0 && (
                        <p className="text-center text-gray-400 text-base py-10">
                            No messages yet. Start the conversation!
                        </p>
                    )}

                    {messagesWithDates.map(({ msg, showDateSep }) => {
                        const isMine = msg['sender'] === currentUserId;

                        return (
                            <div key={msg.id}>
                                {showDateSep && (
                                    <div className="flex items-center gap-3 my-5">
                                        <div className="flex-1 h-px bg-gray-200" />
                                        <span className="text-xs text-gray-400 font-medium">
                                            {formatDateSeparator(msg['created'])}
                                        </span>
                                        <div className="flex-1 h-px bg-gray-200" />
                                    </div>
                                )}

                                <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2.5`}>
                                    <div
                                        className={`max-w-105 px-5 py-3 rounded-2xl text-[15px] leading-relaxed ${
                                            isMine
                                                ? 'bg-orange-100 text-gray-900 rounded-br-sm border border-orange-200'
                                                : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                                        }`}
                                    >
                                        <p className="whitespace-pre-wrap wrap-break-word">
                                            {msg['body']}
                                        </p>
                                        <p className={`text-xs mt-1.5 ${isMine ? 'text-orange-500' : 'text-gray-400'}`}>
                                            {formatTime(msg['created'])}
                                            {isMine && msg.id === lastSentId && (
                                                <span className="ml-1.5 italic">
                                                    {msg['read'] ? 'Read' : 'Sent'}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* ── Input / archived notice ── */}
            {!!conversation?.buyer_archived || !!conversation?.seller_archived || saleStatus === 'confirmed' ? (
                <div className="px-6 py-5 border-t border-gray-100 bg-gray-50 shrink-0">
                    <div className="flex items-center gap-3 rounded-2xl bg-gray-100 px-5 py-4">
                        <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <p className="text-sm text-gray-400">
                            {saleStatus === 'confirmed' && !isArchived
                                ? 'Sale confirmed — rate the seller above to close this conversation.'
                                :
                                ((conversation != null && !isBuyer && !!conversation.buyer_archived || isBuyer && !!conversation.seller_archived) ?
                                    'This conversation was archived by the other party. You cannot send new messages.'
                                    :
                                    'This conversation is archived. You cannot send new messages.')
                            }
                        </p>
                    </div>
                </div>
            ) : (
                <div className="px-6 py-4 border-t border-gray-100 bg-white shrink-0">
                    <div className="flex gap-3 items-end bg-gray-50 rounded-2xl border border-gray-200 px-4 py-3 focus-within:border-orange-300 transition-colors">
                        <button
                            type="button"
                            className="shrink-0 self-center text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label="Attach file"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                        </button>
                        <textarea
                            ref={textareaRef}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message…"
                            rows={1}
                            className="flex-1 bg-transparent py-1 text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none resize-none leading-6 max-h-36 overflow-y-auto"
                        />
                        <button
                            type="button"
                            onClick={handleSend}
                            disabled={sending || !newMessage.trim()}
                            className="shrink-0 self-end w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                            aria-label="Send"
                        >
                            <svg className="w-5 h-5 rotate-90" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                            </svg>
                        </button>
                    </div>
                    {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
                </div>
            )}
        </div>
    );
}
