import { useState, useEffect, useCallback, useRef } from 'react';
import type { RecordModel } from 'pocketbase';
import pb from '../lib/pb';

const PAGE_SIZE = 30;

export function useConversation(conversationId: string, currentUserId: string | null) {
    const [conversation, setConversation] = useState<RecordModel | null>(null);
    const [messages, setMessages] = useState<RecordModel[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    // tracks the oldest page we've fetched so we can request the next one
    const currentPageRef = useRef(1);

    const visibilityFilter = useCallback((record: RecordModel) => {
        if (!currentUserId) return false;
        return record.sender === currentUserId
            ? !record.deleted_by_sender
            : !record.deleted_by_receiver;
    }, [currentUserId]);

    const fetchConversation = useCallback(async () => {
        if (!conversationId || !currentUserId) return;
        try {
            const convo = await pb.collection('conversations').getOne(conversationId, {
                expand: 'buyer,seller,listing',
            });
            setConversation(convo);
        } catch {
            setError('Conversation not found.');
        }
    }, [conversationId, currentUserId]);

    // fetches a specific page of messages, oldest-first within the page.
    // pages are requested in reverse (page 1 = most recent) then reversed
    const fetchPage = useCallback(async (page: number): Promise<RecordModel[]> => {
        if (!conversationId || !currentUserId) return [];

        const filterString = `conversation="${conversationId}" && ((sender="${currentUserId}" && deleted_by_sender=false) || (sender!="${currentUserId}" && deleted_by_receiver=false))`;

        const result = await pb.collection('messages').getList(page, PAGE_SIZE, {
            filter: filterString,
            sort: '-created', // newest first so page 1 = latest messages
            requestKey: `messages-${conversationId}-${page}`,
        });

        // flip to chronological order for rendering
        return result.items.reverse();
    }, [conversationId, currentUserId]);

    const markAsRead = useCallback(async () => {
        if (!conversationId || !currentUserId) return;
        try {
            const unread = await pb.collection('messages').getFullList({
                filter: `conversation="${conversationId}" && sender!="${currentUserId}" && read=false`,
            });
            await Promise.all(
                unread.map(msg => pb.collection('messages').update(msg.id, { read: true }))
            );
        } catch (err: any) {
            if (!err.isAbort) console.error('Failed to mark messages as read:', err);
        }
    }, [conversationId, currentUserId]);

    // initial load — fetch conversation metadata + first (most recent) page
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            currentPageRef.current = 1;

            try {
                const [, firstPage] = await Promise.all([
                    fetchConversation(),
                    fetchPage(1),
                ]);

                setMessages(firstPage);
                setHasMore(firstPage.length === PAGE_SIZE);
            } finally {
                setLoading(false);
            }

            markAsRead();
        };

        load();
    }, [fetchConversation, fetchPage, markAsRead]);

    // called when the user scrolls to the top — loads the next older page
    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return;

        setLoadingMore(true);
        try {
            const nextPage = currentPageRef.current + 1;
            const olderMessages = await fetchPage(nextPage);

            if (olderMessages.length === 0) {
                setHasMore(false);
                return;
            }

            // prepend older messages, deduplicate by id
            setMessages(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                const fresh = olderMessages.filter(m => !existingIds.has(m.id));
                return [...fresh, ...prev];
            });

            setHasMore(olderMessages.length === PAGE_SIZE);
            currentPageRef.current = nextPage;
        } catch (err) {
            console.error('Failed to load more messages:', err);
        } finally {
            setLoadingMore(false);
        }
    }, [fetchPage, loadingMore, hasMore]);

    // realtime subscription
    useEffect(() => {
        if (!conversationId || !currentUserId) return;

        const handleRealtimeEvent = (e: any) => {
            if (e.record.conversation !== conversationId) return;

            setMessages(prev => {
                if (e.action === 'create') {
                    if (!visibilityFilter(e.record)) return prev;
                    if (prev.some(m => m.id === e.record.id)) return prev;
                    return [...prev, e.record];
                }

                if (e.action === 'update') {
                    if (!visibilityFilter(e.record)) {
                        return prev.filter(m => m.id !== e.record.id);
                    }
                    return prev.map(m => m.id === e.record.id ? e.record : m);
                }

                if (e.action === 'delete') {
                    return prev.filter(m => m.id !== e.record.id);
                }

                return prev;
            });

            // mark incoming messages as read immediately
            if (e.action === 'create' && e.record.sender !== currentUserId) {
                pb.collection('messages').update(e.record.id, { read: true }).catch(() => {});
            }
        };

        let unsubscribe: (() => void) | null = null;
        let isCancelled = false;

        pb.collection('messages')
            .subscribe('*', handleRealtimeEvent, { filter: `conversation="${conversationId}"` })
            .then(unsub => {
                if (isCancelled) unsub();
                else unsubscribe = unsub;
            })
            .catch(console.error);

        return () => {
            isCancelled = true;
            if (unsubscribe) unsubscribe();
        };
    }, [conversationId, currentUserId, visibilityFilter]);

    // realtime subscription for conversation record (sale status, archive flags, etc.)
    useEffect(() => {
        if (!conversationId || !currentUserId) return;

        let unsubscribe: (() => void) | null = null;
        let isCancelled = false;

        pb.collection('conversations')
            .subscribe(conversationId, (e) => {
                if (e.action === 'update' || e.action === 'create') {
                    pb.collection('conversations').getOne(conversationId, {
                        expand: 'buyer,seller,listing',
                    }).then(convo => {
                        if (!isCancelled) setConversation(convo);
                    }).catch(() => {});
                }
            })
            .then(unsub => {
                if (isCancelled) unsub();
                else unsubscribe = unsub;
            })
            .catch(console.error);

        return () => {
            isCancelled = true;
            if (unsubscribe) unsubscribe();
        };
    }, [conversationId, currentUserId]);

    const sendMessage = useCallback(async (body: string) => {
        if (!body.trim() || !currentUserId || !conversationId) return;

        setSending(true);
        setError('');

        try {
            await pb.collection('messages').create({
                conversation: conversationId,
                sender: currentUserId,
                body: body.trim(),
                read: false,
            });

            await pb.collection('conversations').update(conversationId, {
                last_message: body.trim(),
            });
        } catch (err) {
            setError('Failed to send message.');
            throw err;
        } finally {
            setSending(false);
        }
    }, [currentUserId, conversationId]);

    const refreshConversation = useCallback(async () => {
        if (!conversationId || !currentUserId) return;
        try {
            const convo = await pb.collection('conversations').getOne(conversationId, {
                expand: 'buyer,seller,listing',
            });
            setConversation(convo);
        } catch {
            setError('Failed to refresh conversation.');
        }
    }, [conversationId, currentUserId]);

    return {
        conversation,
        messages,
        loading,
        loadingMore,
        hasMore,
        sending,
        error,
        sendMessage,
        loadMore,
        refreshConversation,
    };
}
