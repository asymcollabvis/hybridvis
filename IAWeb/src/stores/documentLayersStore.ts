import { create } from "zustand";

interface LayerState {
  layerType: "quad" | "cylinder";
  config: Partial<XRQuadLayerInit | XRCylinderLayerInit>;
  layer?: XRQuadLayer | XRCylinderLayer;
  texture?: THREE.Texture;
  renderTarget?: THREE.WebGLRenderTarget;
  mesh?: THREE.Mesh;
  video?: HTMLVideoElement;
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
}

interface DocumenLayersState {
  cam: THREE.Camera | null;
  layers: LayerState[];
  setLayers: (layers: LayerState[]) => void;
  addLayer: (layer: LayerState) => void;
  clearLayers: () => void;
  setCam: (cam: THREE.Camera) => void;
}

export const useDocumentLayersStore = create<DocumenLayersState>((set) => ({
  cam: null,
  layers: [],
  setLayers: (layers) => set({ layers }),
  addLayer: (layer) => set((state) => ({ layers: [...state.layers, layer] })),
  clearLayers: () => set({ layers: [] }),
  setCam: (cam) => set({ cam }),
}));
