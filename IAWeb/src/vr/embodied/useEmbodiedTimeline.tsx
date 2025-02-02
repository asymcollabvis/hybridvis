import { useFrame, useThree } from "@react-three/fiber";
import { useDeviceCamera } from "../../common/helper";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useTimelineStore } from "../../stores/store";
import { selectMultipleNodes, sendAction } from "../../common/graph";
import { useAppSelector } from "../../hooks";
import { selectUser } from "../../features/user/userSlice";
import store from "../../store";
import { getNodeIndex } from "../../features/graph/LinksInstance";

export enum Layer {
  Default = 0,
  Timeline = 1,
}

export default function useEmbodiedTimeline(temp = new THREE.Vector3()) {
  const camera = useDeviceCamera();
  const { scene } = useThree();
  const selector = useAppSelector;
  const user = selector(selectUser);
  const raycaster = useMemo(() => {
    let ray = new THREE.Raycaster();
    // ray.layers.set(Layer.Timeline);
    return ray;
  }, [camera]);

  // const prevNodeIndex = useRef<number | null>(null);
  const prevNode = useRef<THREE.Object3D | null>(null);

  useFrame(() => {
    if (!user) return;
    // const userId = user.id;
    // const roomId = user.roomId;
    // console.log(user.id);

    const nodeIdIndexMap = store.getState().graph.nodeIdIndexMap;

    // raycast down to the ground from the camera's position
    raycaster.set(camera.position, new THREE.Vector3(0, -1, 0));
    const intersect = raycaster.intersectObjects(
      useTimelineStore.getState().nodes
    );

    if (intersect.length === 0) {
      // reset if any
      if (prevNode.current !== null) {
        console.log("reset", prevNode.current.userData);
        const prevNodeData = prevNode.current.userData as {
          type: string;
          nodeId: string;
          nodeIds: string[];
        };

        if (prevNodeData.type == "entityNode") {
          let currIndex = getNodeIndex(prevNodeData.nodeId, nodeIdIndexMap);
          sendAction(user, currIndex, "timeline");
        } else if (prevNodeData.type == "timeNode") {
          let indices = prevNodeData.nodeIds.map((id) => {
            return getNodeIndex(id, nodeIdIndexMap);
          });

          selectMultipleNodes(user, indices, "timeline");
        }
        prevNode.current = null;
      }
      return;
    }
    // console.log(intersect[0].object.userData.nodeId);

    let closestNode = intersect.sort((a, b) => {
      let distA = temp.copy(a.object.position).sub(camera.position).length();
      let distB = temp.copy(b.object.position).sub(camera.position).length();
      return distA - distB;
    })[0].object;

    // console.log(intersect);

    if (prevNode.current !== closestNode) {
      console.log("new node", closestNode, prevNode.current);

      if (prevNode.current !== null) {
        console.log("reset", prevNode.current.userData);
        const prevNodeData = prevNode.current.userData as {
          type: string;
          nodeId: string;
          nodeIds: string[];
        };

        if (prevNodeData.type == "entityNode") {
          let currIndex = getNodeIndex(prevNodeData.nodeId, nodeIdIndexMap);
          sendAction(user, currIndex, "timeline");
        } else if (prevNodeData.type == "timeNode") {
          let indices = prevNodeData.nodeIds.map((id) => {
            return getNodeIndex(id, nodeIdIndexMap);
          });

          selectMultipleNodes(user, indices, "timeline");
        }
        prevNode.current = null;
      }

      prevNode.current = closestNode;
      const prevNodeData = prevNode.current.userData as {
        type: string;
        nodeId: string;
        nodeIds: string[];
      };

      if (prevNodeData.type == "entityNode") {
        let currIndex = getNodeIndex(prevNodeData.nodeId, nodeIdIndexMap);
        sendAction(user, currIndex, "timeline");
      } else if (prevNodeData.type == "timeNode") {
        let indices = prevNodeData.nodeIds.map((id) => {
          return getNodeIndex(id, nodeIdIndexMap);
        });

        selectMultipleNodes(user, indices, "timeline");
      }
    }
  });
}
