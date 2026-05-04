import {createContext} from "react";

export const RemoveConversationContext = createContext<(id: string) => void>(() => {});
export const RemoveArchivedConversationContext = createContext<(id: string) => void>(() => {});
