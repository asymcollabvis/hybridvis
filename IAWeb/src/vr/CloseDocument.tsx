import { useFrame } from "@react-three/fiber";
import { State, useStateMachineStore } from "../stores/stateMachineStore";
import { useCloseDocumentStore } from "../stores/store";
import { useEffect, useMemo, useRef } from "react";
import { Interactive, useController } from "@react-three/xr";
import { Box } from "@react-three/drei";
import HTMLInteractiveGroup from "../hybrid/HTMLInteractiveGroup";
import { HTMLMesh } from "../hybrid/HTMLMesh";
import * as THREE from "three";

type FakeEvent = {
  type: string;
  data: THREE.Vector2;
  pointerId?: number;
  deltaX?: number;
  deltaY?: number;
  deltaZ?: number;
  deltaMode?: number;
};

export default function CloseDocument({
  tempVec = new THREE.Vector3(),
  tempQuat = new THREE.Quaternion(),
}) {
  const { mesh } = useCloseDocumentStore();
  const { state } = useStateMachineStore();
  const objRef = useRef<THREE.Mesh>();
  const leftController = useController("left");
  const rightController = useController("right");
  const touchDownRef = useRef(false);
  const lastEvent = useRef<FakeEvent | null>(null);
  // const debugObj = useRef<THREE.Object3D | null>(null);

  const [width, height] = useMemo(() => {
    if (!mesh) return [0, 0];
    return [
      mesh.material.map.image.width / 1000 / 2,
      mesh.material.map.image.height / 1000 / 2,
    ];
  }, [mesh]);

  useEffect(() => {
    if (!mesh) return;

    const meshClone: THREE.Object3D = new HTMLMesh(
      null,
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshStandardMaterial({
        transparent: true,
      }),
      mesh.material.map
    );
    meshClone.rotation.set(0, 0, -Math.PI / 2);
    meshClone.position.set(width / 2, -height / 2, 0);

    // meshClone.add(new THREE.AxesHelper(1));
    // let topleft = new THREE.AxesHelper(1);
    // topleft.position.set(width / 2, height / 2, 0);
    // meshClone.add(topleft);
    // debugObj.current = topleft;

    objRef.current?.clear();
    objRef.current?.add(meshClone);
  }, [mesh]);

  useFrame(() => {
    if (!objRef.current) return;

    if (state == State.DocumentCloseInteraction) {
      objRef.current.visible = true;

      if (leftController) {
        // console.log("leftController", leftController);
        objRef.current.position.copy(leftController.controller.position);
        objRef.current.rotation.copy(
          new THREE.Euler(-Math.PI / 6, 0, Math.PI / 2)
        );

        if (rightController && rightController.hand.indexFingerTipObj) {
          // console.log(objRef.current);

          // check distance between right hand index tip and the document
          var plane = new THREE.Plane();
          var normal = new THREE.Vector3();
          var point = new THREE.Vector3();

          const object = objRef.current.children[0];
          object.getWorldQuaternion(tempQuat);
          normal.set(0, 0, 1).applyQuaternion(tempQuat);
          object.getWorldPosition(tempVec);
          point.copy(tempVec);

          plane.setFromNormalAndCoplanarPoint(normal, point);

          rightController.hand.indexFingerTipObj.getWorldPosition(tempVec);
          let distance = plane.distanceToPoint(tempVec);
          // console.log(distance);

          // emit event if distance is less than a threshold
          if (Math.abs(distance) < 0.025) {
            // get projection
            plane.projectPoint(tempVec, point);
            // get plane local coordinate
            object.worldToLocal(point);
            // console.log(point);

            // console.log(touchDownRef.current);

            const uv = {
              x: point.x / width + 0.5,
              y: point.y / height + 0.5,
            };

            // out of bound
            if (uv.x < 0 || uv.x > 1 || uv.y < 0 || uv.y > 1) {
              // emit pointerup event
              if (lastEvent.current) {
                // console.log("blur");
                
                lastEvent.current.type = "blur";
                object.dispatchEvent(lastEvent.current);
                // if (debugObj.current) {
                //   debugObj.current.position.set(
                //     (lastEvent.current.data.x - 0.5) * width,
                //     (1 - lastEvent.current.data.y - 0.5) * height,
                //     0
                //   );
                // }
                lastEvent.current = null;
              }
              if (touchDownRef.current) touchDownRef.current = false;
            } else {
              const _event: FakeEvent = {
                type: "",
                data: new THREE.Vector2(),
                pointerId: undefined,
                deltaX: undefined,
                deltaY: undefined,
                deltaZ: undefined,
                deltaMode: undefined,
              };
              _event.data.set(uv.x, 1 - uv.y);
              _event.pointerId = 0;
              if (!touchDownRef.current) {
                // emit pointerdown event

                // console.log("pointerDown!!!", uv);

                _event.type = "pointerdown";
                touchDownRef.current = true;
              } else {
                // console.log("pointerMove!!!", uv);

                _event.type = "pointermove";
              }

              lastEvent.current = _event;
              object.dispatchEvent(_event);
            }

            // if (debugObj.current) {
            //   debugObj.current.position.set(point.x, point.y, 0);
            // }
          } else {
            if (touchDownRef.current) {
              // emit pointerup event
              if (lastEvent.current) {
                lastEvent.current.type = "pointerup";

                object.dispatchEvent(lastEvent.current);
                // if (debugObj.current) {
                //   debugObj.current.position.set(
                //     (lastEvent.current.data.x - 0.5) * width,
                //     (1 - lastEvent.current.data.y - 0.5) * height,
                //     0
                //   );
                // }
                lastEvent.current = null;
              }
              touchDownRef.current = false;
            }
          }
        }
      }
    } else {
      objRef.current.visible = false;
      objRef.current.position.set(99, 99, 99);
    }
  });

  return (
    mesh && (
      <Interactive
        ref={objRef}
        visible={false}
        onSelect={(e) => {
          /* make it block the ray casting behind */
        }}
      >
        {/* <mesh
          rotation={[0, 0, -Math.PI / 2]}
          position={[width / 2, -height / 2, 0]}
        >
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial map={mesh.material.map} />
        </mesh> */}
      </Interactive>
    )
  );
  //   return (
  //     <group ref={objRef} visible={false}>
  //       <Box args={[1, 1, 1]} />
  //     </group>
  //   );
}
