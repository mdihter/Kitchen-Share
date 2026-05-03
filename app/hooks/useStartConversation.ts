import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import pb from '../lib/pb';
import { ClientResponseError } from 'pocketbase';
import { useCurrentUser } from './useCurrentUser';

/**
 * Usage — DM (no listing):
 *   const { startConversation, loading, error } = useStartConversation(recipientId);
 *   <button onClick={() => startConversation()}>Message</button>
 *
 * Usage — listing-attached message / offer:
 *   const { startConversation, loading, error } = useStartConversation(sellerId);
 *   <button onClick={() => startConversation(listingId, listingPrice, 'buy')}>Buy</button>
 *   <button onClick={() => startConversation(listingId, offerAmount, 'offer')}>Make Offer</button>
 */

type MessageType = 'buy' | 'offer';

export function useStartConversation(userId: string) {
    const router = useRouter();
    const currentUserId = useCurrentUser();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const getInitialMessage = (messageType?: MessageType, amount?: number): string => {
        if (!messageType || amount === undefined) return '';
        
        const formattedAmount = amount.toFixed(2);
        if (messageType === 'buy') {
            return `Hi, I would like to buy your food for $${formattedAmount}`;
        } else if (messageType === 'offer') {
            return `Hi, I would like to offer $${formattedAmount} for your food`;
        }
        return '';
    };

    const startConversation = useCallback(async (listingId?: string, initialOffer?: number, messageType?: MessageType) => {
        if (!currentUserId) {
            router.push('/auth');
            return;
        }

        setError('');
        setLoading(true);

        const listingFilter = listingId
            ? `listing="${listingId}"`
            : 'listing=""';

        const messageText = getInitialMessage(messageType, initialOffer);

        try {
            const existing = await pb.collection('conversations').getFirstListItem(
                `((buyer="${currentUserId}" && seller="${userId}" && buyer_archived=false) || (buyer="${userId}" && seller="${currentUserId}" && seller_archived=false)) && ${listingFilter}`
            );
            router.push('/messages/' + existing.id);
        } catch (err) {
            if (err instanceof ClientResponseError && err.status === 404) {
                try {
                    const convo = await pb.collection('conversations').create({
                        buyer: currentUserId,
                        seller: userId,
                        listing: listingId ?? '',
                        offerPrice: initialOffer ?? 0, //Changed to offerPrice to match the catergory in pocketbase
                        last_message: messageText,
                        buyer_deleted: false,
                        seller_deleted: false,
                    });

                    // Create initial message if messageText exists
                    if (messageText) {
                        await pb.collection('messages').create({
                            conversation: convo.id,
                            sender: currentUserId,
                            body: messageText,
                            read: false,
                        });
                    }

                    router.push('/messages/' + convo.id);
                } catch (createErr) {
                    setError(createErr instanceof Error ? createErr.message : 'Could not start conversation.');
                }
            } else {
                setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    }, [currentUserId, userId, router]);

    return { startConversation, loading, error, setError };
}