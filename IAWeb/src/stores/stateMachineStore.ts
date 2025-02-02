import { create } from "zustand";

export enum State {
  General,
  DocumentHovered,
  DocumentCloseInteraction,
}

interface StateMachineState {
  state: State;
  setState: (state: State) => void;
}

export const useStateMachineStore = create<StateMachineState>((set) => ({
  state: State.General,
  setState: (state) => set({ state }),
}));
