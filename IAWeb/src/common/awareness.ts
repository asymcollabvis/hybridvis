import { Camera } from "@mui/icons-material";
import { Frustum, Position, Rotation, Scale, SpatialInfo } from "./message";
import * as THREE from "three";

function cameraToWorld(
  camera: THREE.Camera,
  x: number,
  y: number,
  z: number,
  tempVector = new THREE.Vector3()
) {
  return tempVector.set(x, y, z).unproject(camera).clone();
}

function calculateFrustum(
  camera: THREE.Camera,
  tempVector = new THREE.Vector3()
) {
  const n1 = cameraToWorld(camera, -1, -1, -1, tempVector);
  const n2 = cameraToWorld(camera, 1, -1, -1, tempVector);
  const n3 = cameraToWorld(camera, 1, 1, -1, tempVector);
  const n4 = cameraToWorld(camera, -1, 1, -1, tempVector);
  const f1 = cameraToWorld(camera, -1, -1, 1, tempVector);
  const f2 = cameraToWorld(camera, 1, -1, 1, tempVector);
  const f3 = cameraToWorld(camera, 1, 1, 1, tempVector);
  const f4 = cameraToWorld(camera, -1, 1, 1, tempVector);
  return [n1, n2, n3, n4, f1, f2, f3, f4];
}

// const tempVector = new THREE.Vector3();
// const tempQuaternion = new THREE.Quaternion();
export function computeUserSpatialInfo(
  camera: THREE.Camera,
  graph?: THREE.Object3D,
  tempVector = new THREE.Vector3(),
  tempQuaternion = new THREE.Quaternion()
) {
  let spatialInfo: SpatialInfo = {};
  let pos: Position = {
    x: 0,
    y: 0,
    z: 0
  };
  camera.getWorldPosition(tempVector);
  camera.getWorldQuaternion(tempQuaternion);

  // make pos relative to graph
  // if (graph) {
  //   graph.worldToLocal(tempVector);
  //   tempVector.multiplyScalar(0.005); // scale down the position

  //   // refer to https://github.com/mrdoob/three.js/pull/20243/commits/5b320ad88c2f8683c9d5069d7e32296b914e29b0
  //   tempQuaternion.copy(
  //     camera
  //       .getWorldQuaternion(tempQuaternion)
  //       .clone()
  //       .premultiply(graph.getWorldQuaternion(tempQuaternion).invert())
  //   );
  //   // console.log(tempQuaternion);

  //   // tempQuaternion.multiplyQuaternions(
  //   //     camera.quaternion.clone().invert(),
  //   //   graph.quaternion,
  //   // );
  // }
  pos.x = tempVector.x;
  pos.y = tempVector.y;
  pos.z = tempVector.z;
  spatialInfo.position = pos;
  let rot: Rotation = {
    x: tempQuaternion.x,
    y: tempQuaternion.y,
    z: tempQuaternion.z,
    w: tempQuaternion.w
  };
  spatialInfo.rotation = rot;

  return spatialInfo;
}

export function computeGraphSpatialInfo(graph?: THREE.Object3D) {
  if (!graph) return undefined;

  let spatialInfo: SpatialInfo = {
    position: {
      x: graph.position.x,
      y: graph.position.y,
      z: graph.position.z
    },
    rotation: {
      x: graph.quaternion.x,
      y: graph.quaternion.y,
      z: graph.quaternion.z,
      w: graph.quaternion.w
    },
    scale: {
      x: graph.scale.x,
      y: graph.scale.y,
      z: graph.scale.z
    }
  };

  return spatialInfo;
}

export function computeUserFrustum(
  camera: THREE.Camera,
  graph?: THREE.Object3D,
  tempVector = new THREE.Vector3()
) {
  const [n1, n2, n3, n4, f1, f2, f3, f4] = calculateFrustum(
    camera,
    tempVector
  ).map((pts) => {
    // make pts relative to graph
    // if (graph) {
    //   graph.worldToLocal(pts);
    //   // console.log("graphx",graph.scale.x);

    //   pts.multiplyScalar(0.005); // scale down the position
    // }
    let pos: Position = {
      x: pts.x,
      y: pts.y,
      z: pts.z
    };
    return pos;
  });
  let frustum: Frustum = {
    n1: n1,
    n2: n2,
    n3: n3,
    n4: n4,
    f1: f1,
    f2: f2,
    f3: f3,
    f4: f4
  };

  return frustum;
}