import { createContext, useContext } from "react";
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
