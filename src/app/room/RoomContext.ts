import { createContext, useContext, useSyncExternalStore } from "react";
import type { MutableRefObject } from "react";
import type { Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@/socket/types";
import type { Role } from "@/utils/types";

export interface SlideContextSnapshot {
  slidePageIndex: number | null;
  slideSetId: string | null;
}

export interface SlideNavigationTarget {
  slidePageIndex: number;
  slideSetId: string;
}

export interface RoomContextValue {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  sessionId: string;
  userId: string;
  role: Role;
  sessionTitle: string;
  /** Latest viewer slide position — read `.current` in handlers (does not re-render). */
  slideContextRef: MutableRefObject<SlideContextSnapshot>;
  /** Slide the user was on before jumping via a question badge, if any. */
  slideReturnTarget: SlideContextSnapshot | null;
  /** Navigate the slide viewer to a question's slide context. */
  navigateToQuestionSlide: (target: SlideNavigationTarget) => void;
  /** Return to the slide position saved before the last question-badge jump. */
  goBackToPreviousSlide: () => void;
}

const defaultSlideContextRef: MutableRefObject<SlideContextSnapshot> = {
  current: { slidePageIndex: null, slideSetId: null },
};

export const RoomContext = createContext<RoomContextValue>({
  socket: null,
  sessionId: "",
  userId: "",
  role: "STUDENT",
  sessionTitle: "",
  slideContextRef: defaultSlideContextRef,
  slideReturnTarget: null,
  navigateToQuestionSlide: () => {},
  goBackToPreviousSlide: () => {},
});

export function useRoom() {
  return useContext(RoomContext);
}

/** Slide label for ChatInput only — avoids re-rendering the chat list on page flips. */
let slideUiSnapshot: SlideContextSnapshot = { slidePageIndex: null, slideSetId: null };
const slideUiListeners = new Set<() => void>();

export function publishSlideContext(ctx: SlideContextSnapshot) {
  slideUiSnapshot = ctx;
  slideUiListeners.forEach((l) => l());
}

export function useSlideContext() {
  return useSyncExternalStore(
    (onStoreChange) => {
      slideUiListeners.add(onStoreChange);
      return () => {
        slideUiListeners.delete(onStoreChange);
      };
    },
    () => slideUiSnapshot,
    () => slideUiSnapshot
  );
}
