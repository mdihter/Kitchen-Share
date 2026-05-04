import { useState, useEffect, useCallback } from 'react';
import type { RecordModel } from 'pocketbase';
import pb from '../lib/pb';

export function useConversations(currentUserId: string | null, archived = false) {
    const [conversations, setConversations] = useState<RecordModel[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // initial full fetch — only runs on mount / user change
    const fetchConversations = useCallback(async (abortController?: AbortController) => {
        if (!currentUserId) {
            setConversations([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await pb.collection('conversations').getFullList({
                filter: `(buyer="${currentUserId}" && buyer_deleted=false && buyer_archived=${archived}) || (seller="${currentUserId}" && seller_deleted=false && seller_archived=${archived})`,
                requestKey: null,
                expand: 'buyer,seller,listing',
                sort: '-updated',
                signal: abortController?.signal,
            });
            setConversations(result);
        } catch (err: any) {
            if (!err.isAbort) setError('Failed to load conversations.');
        } finally {
            setLoading(false);
        }
    }, [currentUserId, archived]);

    // fetches a single conversation by ID and patches it into local state.

    const fetchAndPatchOne = useCallback(async (conversationId: string) => {
        try {
            const updated = await pb.collection('conversations').getOne(conversationId, {
                expand: 'buyer,seller,listing',
                requestKey: conversationId,
            });
            const isVisible = updated.buyer === currentUserId
                ? !updated.buyer_deleted && updated.buyer_archived === archived
                : !updated.seller_deleted && updated.seller_archived === archived;

            if (!isVisible) {
                setConversations(prev => prev.filter(c => c.id !== conversationId));
                return;
            }

            setConversations(prev => {
                const exists = prev.some(c => c.id === conversationId);
                const next = exists
                    ? prev.map(c => c.id === conversationId ? updated : c)
                    : [updated, ...prev];

                return next.sort(
                    (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime()
                );
            });
        } catch (err: any) {

            if (err.status === 404 || err.status === 403) {
                setConversations(prev => prev.filter(c => c.id !== conversationId));
            }
        }
    }, [currentUserId, archived]);

    useEffect(() => {
        const abortController = new AbortController();
        fetchConversations(abortController);
        return () => abortController.abort();
    }, [fetchConversations]);

    // only subscribe to realtime updates for the inbox (non-archived) tab.
    useEffect(() => {
        if (!currentUserId || archived) return;

        let unsubscribe: (() => void) | null = null;
        let isCancelled = false;

        const handleRealtimeEvent = (e: any) => {
            const r = e.record;

            // handle deletes first — on delete events field expansion may be absent
            if (e.action === 'delete') {
                setConversations(prev => prev.filter(c => c.id !== r.id));
                return;
            }

            if (r.buyer !== currentUserId && r.seller !== currentUserId) return;

            fetchAndPatchOne(r.id);
        };

        const initSubscription = async () => {
            try {
                const unsubFunc = await pb.collection('conversations').subscribe('*', handleRealtimeEvent);
                if (isCancelled) {
                    unsubFunc();
                } else {
                    unsubscribe = unsubFunc;
                }
            } catch (err) {
                console.error('Failed to subscribe to conversations:', err);
            }
        };

        initSubscription();

        return () => {
            isCancelled = true;
            if (unsubscribe) unsubscribe();
        };
        // archived is covered transitively — fetchAndPatchOne captures it in its own deps
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUserId, fetchAndPatchOne]);

    const refetch = useCallback(() => fetchConversations(), [fetchConversations]);

    const removeConversation = useCallback((id: string) => {
        setConversations(prev => prev.filter(c => c.id !== id));
    }, []);

    return { conversations, loading, error, refetch, removeConversation };
}
