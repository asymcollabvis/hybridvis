import { Sphere } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import React, { useEffect, useMemo, useRef } from "react";
import useDocumentList from "../../features/document/useDocumentList";
import DocumentPanel from "./DocumentPanel";
import * as THREE from "three";
import { constructUserKeyFromUser, useDeviceCamera } from "../../common/helper";
import {
  selectDocumentId,
  selectDocuments,
} from "../../features/document/documentSlice";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { getUserColor, useClient } from "../../common/client";
import { RequestById } from "../../common/message";
import { selectUser } from "../../features/user/userSlice";
import { useDocumentsStore, useSimulatedPCStore } from "../../stores/store";
import { useWebXRLayer } from "../../common/useWebXRLayer";
import DocumentDomCurvedLayer from "./WebXRLayer/DocumentDomCurvedLayer";

export type DocLayoutMode =
  | "horizontal"
  | "curve"
  | "square"
  | "time"
  | "space";

export default function Documents({
  mode = "horizontal",
  offset = 0.1,
  temp = new THREE.Vector3(),
  temp2 = new THREE.Vector3(),
}: {
  mode?: DocLayoutMode;
  offset?: number;
  temp?: THREE.Vector3;
  temp2?: THREE.Vector3;
}) {
  // TODO: useDocumentList too much time deal to changing the currDocId
  // const documents = useDocumentList();
  const dispatch = useAppDispatch();
  const selector = useAppSelector;

  // const user = selector(selectUser);
  const documents = selector(selectDocuments);
  // console.log("documents", documents);
  const { setDocumentId } = useDocumentsStore();

  const width = useMemo(() => 0.7, []);
  const height = useMemo(() => 1, []);
  const radius = useMemo(() => 2, []);
  const numDocPerCol = useMemo(() => documents.length / 2, [documents]);
  const getAngle = function () {
    return (Math.PI / 10) * numDocPerCol;
  };

  const positions = React.useMemo(() => {
    const positions: { [key: string]: [number, number, number] } = {};
    if (mode === "horizontal") {
      for (let i = 0; i < documents.length; i++) {
        positions[documents[i].id] = [
          (i - (documents.length - 1) / 2) * (width + offset),
          0,
          0,
        ];
      }
    } else if (mode === "curve") {
      for (let i = 0; i < documents.length; i++) {
        positions[documents[i].id] = [
          Math.cos(
            ((i % numDocPerCol) / (numDocPerCol - 1)) * getAngle() -
              (getAngle() - Math.PI) / 2
          ) * radius,
          Math.floor(i / numDocPerCol) * height + 0.05,
          -Math.sin(
            ((i % numDocPerCol) / (numDocPerCol - 1)) * getAngle() -
              (getAngle() - Math.PI) / 2
          ) * radius,
        ];
      }
    }
    return positions;
  }, [documents, mode]);

  const rotations = React.useMemo(() => {
    const rotations: { [key: string]: [number, number, number] } = {};
    if (mode === "horizontal") {
      for (let i = 0; i < documents.length; i++) {
        rotations[documents[i].id] = [0, 0, 0];
      }
    } else if (mode === "curve") {
      for (let i = 0; i < documents.length; i++) {
        rotations[documents[i].id] = [
          0,
          (((i % numDocPerCol) - numDocPerCol / 2 + 10 / 2) / (10 - 1)) *
            Math.PI -
            Math.PI / 2,
          0,
        ];
      }
    }
    return rotations;
  }, [documents, mode]);

  const camera = useDeviceCamera();
  const raycaster = useRef(new THREE.Raycaster());
  const docsGroup = useRef<THREE.Group>(null!);
  const prevDocId = useRef<string | undefined>(undefined);

  useWebXRLayer();

  useFrame(() => {
    // shoot a ray from head and check if it hits document
    camera.getWorldPosition(temp);
    camera.getWorldDirection(temp2);
    raycaster.current.set(temp, temp2);

    let intersects;
    let obj = useSimulatedPCStore.getState().object;
    if (obj) {
      intersects = raycaster.current.intersectObjects(
        [docsGroup.current, obj],
        true
      );
    } else {
      intersects = raycaster.current.intersectObjects(
        [docsGroup.current],
        true
      );
    }

    // console.log(intersects[0]?.object);

    if (intersects.length > 0) {
      const doc = intersects[0].object.userData.doc;
      // console.log("intersects", intersects[0], doc, prevDocId.current);
      if (doc != undefined && doc != prevDocId.current) {
        console.log("hit", doc);
        setDocumentId(doc);
        prevDocId.current = doc;
      }
    }
  });

  return (
    <group ref={docsGroup}>
      {/* <DocumentsManager /> */}
      <CurrentDocumentManger />
      {documents.map((document, i) => (
        <group position={positions[i]} rotation={rotations[i]} key={i}>
          {/* <axesHelper args={[0.5]} /> */}
          {/* {document.using.map((userId, i) => (
            <Sphere position={[i * 0.1, height + 1.1, -1]} scale={0.05}>
              <meshBasicMaterial color={store.getState().room.color(userId)} />
            </Sphere>
          ))} */}
          <DocumentAwarenessVisual
            index={i}
            height={height}
          ></DocumentAwarenessVisual>

          <DocumentPanel
            index={i}
            position={[-(width + offset / 2) / 2, height, 0]}
            width={width}
            height={height}
            fontSize={0.02}
            draggable={false}
            autoHeight={true}
            // anchor="bottom"
            // showTopBar={false}
            parentPosition={
              new THREE.Vector3(
                positions[i][0],
                positions[i][1] + height / 2,
                positions[i][2]
              )
            }
            parentRotation={new THREE.Quaternion().setFromEuler(
              new THREE.Euler(...rotations[i])
            )}
          />
          {/* <DocumentLayer
            position={new THREE.Vector3(...positions[i])}
            rotation={new THREE.Quaternion().setFromEuler(
              new THREE.Euler(...rotations[i])
            )}
            document={document}
          /> */}
        </group>
      ))}
      {/* <DocumentDomCurvedLayer
        position={new THREE.Vector3(0, 1, 0)}
        rotation={new THREE.Quaternion(0, 0, 0, 1)}
        centralAngle={getAngle() + 2 * Math.tanh(width / 2 / radius)}
      /> */}
    </group>
  );
}

function DocumentAwarenessVisual({ index, height }) {
  const document = useDocumentList()[index];

  return (
    <group>
      {document &&
        document.using &&
        document.using.map((userId, i) => (
          <Sphere key={i} position={[i * 0.1, height + 0.04, 0]} scale={0.04}>
            <meshBasicMaterial color={getUserColor(userId)} />
          </Sphere>
        ))}
    </group>
  );
}

// function DocumentsManager() {
//   const documents = useDocumentList();
//   return <group></group>;
// }

function CurrentDocumentManger() {
  const selector = useAppSelector;
  // const currDocId = selector(selectDocumentId);
  const { documentId } = useDocumentsStore();
  const user = selector(selectUser);
  useEffect(() => {
    console.log("updateDoucmentState", documentId);
    if (!user) return;

    const client = useClient();
    // push to server if the document change is local
    if (documentId.local) {
      const request: RequestById = {
        id: `${documentId.id}`,
        userKey: constructUserKeyFromUser(user),
      };
      client.updateDocumentState(request).then(() => {
        console.log("updateDoucmentState done", documentId);
      });
    }
  }, [documentId]);

  return <group></group>;
}
