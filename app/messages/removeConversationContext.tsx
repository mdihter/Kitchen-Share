import {createContext} from "react";

export const RemoveConversationContext = createContext<(id: string) => void>(() => {});
export const RemoveArchivedConversationContext = createContext<(id: string) => void>(() => {});
/** Returns the ID of the next archived conversation after `currentId`, or null if none. */
export const NextArchivedContext = createContext<(currentId: string) => string | null>(() => null);
