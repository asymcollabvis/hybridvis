import { create } from "zustand";
import { Link, Node } from "../common/message";
import { GLink } from "../features/graph/graphSlice";
import { DocInfo } from "../features/document/documentSlice";

interface GraphState {
  nodes: Node[];
  links: GLink[];
  selectedNodeIds: number[];
  setNodes: (nodes: Node[]) => void;
  setLinks: (links: GLink[]) => void;
  setSelectedNodeIds: (selectedNodeIds: number[]) => void;
}

const useGraphStore = create<GraphState>((set) => ({
  nodes: [],
  links: [],
  selectedNodeIds: [],
  setNodes: (nodes) => set({ nodes }),
  setLinks: (links) => set({ links }),
  setSelectedNodeIds: (selectedNodeIds) => set({ selectedNodeIds }),
}));

interface GraphContextMenuState {
  isOpen: boolean;
  menuId?: number;
  open: (isOpen: boolean) => void;
  setContextMenu: (isOpen: boolean, menuId?: number) => void;
}

const useGraphContextMenuStore = create<GraphContextMenuState>((set) => ({
  isOpen: false,
  menuId: undefined,
  open: (isOpen) => set({ isOpen }),
  setContextMenu: (isOpen, menuId) => {
    set({ isOpen, menuId });
  },
}));

interface NodeCreateVisualizerState {
  isOpen: boolean;
  nodeId?: string;
  open: (isOpen: boolean) => void;
  setNodeId: (nodeId?: string) => void;
}

const useNodeCreateVisualizerStore = create<NodeCreateVisualizerState>(
  (set) => ({
    isOpen: false,
    nodeId: undefined,
    open: (isOpen) => set({ isOpen }),
    setNodeId: (nodeId) => set({ nodeId }),
  })
);

interface TimelineState {
  data: { [key: string]: string[] };
  nodes: THREE.Object3D[];
  addData: (datum: { date: string; values: string[] }) => void;
  removeData: (datum: { date: string; values: string[] }) => void;
  setData: (data: { [key: string]: string[] }) => void;
  setNodes: (nodes: THREE.Object3D[]) => void;
}

const useTimelineStore = create<TimelineState>((set) => ({
  data: {},
  nodes: [],
  addData: (data) =>
    set((state) => ({
      data: {
        ...state.data,
        [data.date]: state.data[data.date]
          ? [...state.data[data.date], ...data.values]
          : [...data.values],
      },
    })),
  removeData: (data) =>
    set((state) => ({
      data: {
        ...state.data,
        [data.date]: state.data[data.date].filter(
          (d) => !data.values.includes(d)
        ),
      },
    })),
  setData: (data) => set({ data }),
  setNodes: (nodes) => set({ nodes }),
}));

interface DocumentState {
  selectedText: string;
  from: number;
  setSelectedText: ({ text, from }: { text: string; from: number }) => void;
  setSelectedTextFrom: (from: number) => void;
}

const useDocumentStore = create<DocumentState>((set) => ({
  selectedText: "",
  from: -1,
  setSelectedText: ({ text, from }) => set({ selectedText: text, from }),
  setSelectedTextFrom: (from) => set({ from }),
}));

interface DocumentsState {
  documentId: { id: number; local: boolean };
  documentState?: DocumentState;
  documents: DocInfo[];
  documentContentList: {
    [key: number]: string;
  };
  setDocumentId: (documentId: number, local?: boolean) => void;
}

export const useDocumentsStore = create<DocumentsState>((set, get) => ({
  documentId: {
    id: 0,
    local: true,
  },
  documentState: undefined,
  documents: [],
  documentContentList: {},
  setDocumentId: (documentId, local = true) => {
    // update only if documentId is different
    if (documentId == get().documentId.id) return;
    // console.log("updateDoucmentState store documentId", documentId, get().documentId, documentId == get().documentId);
    set({
      documentId: {
        id: documentId,
        local: local,
      },
    });
  },
}));

interface SimulatedPCState {
  object: THREE.Object3D | null;
  setObject: (object: THREE.Object3D | null) => void;
}

const useSimulatedPCStore = create<SimulatedPCState>((set) => ({
  object: null,
  setObject: (object) => set({ object }),
}));

interface CloseDocumentState {
  mesh: THREE.Mesh | null;
  setCloseDocumentMesh: (mesh: THREE.Mesh | null) => void;
}

const useCloseDocumentStore = create<CloseDocumentState>((set) => ({
  mesh: null,
  setCloseDocumentMesh: (mesh) => set({ mesh }),
}));

export {
  useGraphStore,
  useGraphContextMenuStore,
  useNodeCreateVisualizerStore,
  useDocumentStore,
  useTimelineStore,
  useSimulatedPCStore,
  useCloseDocumentStore,
};
