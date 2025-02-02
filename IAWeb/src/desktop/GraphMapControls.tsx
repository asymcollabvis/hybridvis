import { MapControls } from "@react-three/drei";
import React from "react";
import { useNodeCreateVisualizerStore } from "../stores/store";

export default function GraphMapControls() {
  console.log("rendering map controls");

  const isMoveNode = useNodeCreateVisualizerStore((state) => state.nodeId);

  return (
    <MapControls
      makeDefault
      screenSpacePanning={true}
      enableRotate={false}
      enabled={!isMoveNode}
    />
  );
}
