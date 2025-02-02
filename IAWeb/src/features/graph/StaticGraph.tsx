import * as THREE from "three";
import React, { forwardRef } from "react";
import {
  InitialRequest,
  InitialRequest_ClientViewType
} from "../../common/message";
import NodeInstances from "./StaticNodesInstance";
import LinksInstance from "./LinksInstance";
import Cursors from "../../common/Cursors";
import config from "../../config";

let temp = new THREE.Object3D();
export default forwardRef<THREE.Group, {
  dim: InitialRequest_ClientViewType;
  scale?: number[];
  position?: number[]
  showLabels?: boolean;
}>(({
  scale = [1, 1, 1],
  position = [0, 0, 0],
  showLabels = true,
}, ref) => {
  console.log("rendering static graph");

  return (
    <group scale={scale} position={position} ref={ref}>
      <NodeInstances temp={temp}></NodeInstances>
      <LinksInstance></LinksInstance>
      {config.isCollaborative && <Cursors />}
    </group>
  );
})
