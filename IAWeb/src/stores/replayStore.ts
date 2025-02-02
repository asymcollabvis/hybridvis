import { create } from "zustand";
import { EventType } from "../../server/common";

interface LogData {
  timestamp: string;
  event: EventType;
  data: {};
}

interface ReplayItem {
  data: LogData[];
  roomId: string;
  userId: string;
}

interface ReplayState {
  data: {
    [key: string]: ReplayItem;
  };
  setData: (data: { [key: string]: ReplayItem }) => void;
}

export const useReplayStore = create<ReplayState>((set) => ({
  data: {},
  setData: (data) => set({ data }),
}));
