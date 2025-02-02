import * as THREE from "three";
import React, { forwardRef } from "react";
import {
  InitialRequest,
  InitialRequest_ClientViewType,
} from "../../common/message";
import NodeInstances from "./NodesInstance";
import LinksInstance from "./LinksInstance";
import Labels from "./Labels";
import LinkLabels from "./LinkLabels";
import Cursors from "../../common/Cursors";
import config from "../../config";

export default forwardRef<
  THREE.Group,
  {
    dim: InitialRequest_ClientViewType;
    scale?: number[];
    position?: [number, number, number];
    showLabels?: boolean;
  }
>(({ scale = [1, 1, 1], position = [0, 0, 0], showLabels = true }, ref) => {
  console.log("rendering graph");

  return (
    <group scale={scale} ref={ref} position={position}>
      <NodeInstances />
      {showLabels && <Labels />}
      <LinksInstance></LinksInstance>
      {showLabels && <LinkLabels />}
      {config.isCollaborative && <Cursors />}
    </group>
  );
});
