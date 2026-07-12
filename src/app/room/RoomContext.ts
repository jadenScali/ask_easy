import { createContext, useContext } from "react";
import type { MutableRefObject } from "react";
import type { Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@/socket/types";
import type { Role } from "@/utils/types";

export interface SlideContextSnapshot {
  slidePageIndex: number | null;
  slideSetId: string | null;
}

export interface RoomContextValue {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  sessionId: string;
  userId: string;
  role: Role;
  sessionTitle: string;
  slideContextRef: MutableRefObject<SlideContextSnapshot>;
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
});

export function useRoom() {
  return useContext(RoomContext);
}
