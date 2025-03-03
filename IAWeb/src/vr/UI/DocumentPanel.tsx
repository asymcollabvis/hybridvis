import React, { useCallback, useEffect, useRef, useState } from "react";
import Panel from "./Panel";
import { Edges, Plane, Text } from "@react-three/drei";
import useDocument from "../../features/document/useDocument";
import { getSelectionRects, getCaretAtPoint } from "troika-three-text";
import { useFrame, useThree } from "@react-three/fiber";
import { useAppDispatch, useAppSelector } from "../../hooks";
import {
  selectDocumentContentList,
  selectDocumentId,
} from "../../features/document/documentSlice";
import {
  Interactive,
  useXREvent,
  XRControllerEvent,
  XREvent,
  XRInteractionEvent,
} from "@react-three/xr";
import * as THREE from "three";
import { boxGeometry } from "../shared";
import { RequestById, Document } from "../../common/message_pb";
import store from "../../store";
import { useClient } from "../../common/client";
import { useDocumentStore, useDocumentsStore } from "../../stores/store";
import { DocumentLayer } from "./WebXRLayer/DocumentLayer";
import DocumentDomLayer from "./WebXRLayer/DocumentDomLayer";

type AnchorType = "top" | "bottom";

export default function DocumentPanel({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 0.5,
  height = 0.5,
  fontSize = 0.01,
  showTopBar = true,
  draggable = true,
  index = null,
  temp = new THREE.Vector3(),
  autoHeight = false,
  anchor = "top",
  parentPosition = new THREE.Vector3(),
  parentRotation = new THREE.Quaternion(),
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  height?: number;
  fontSize?: number;
  showTopBar?: boolean;
  draggable?: boolean;
  index?: number | null;
  temp?: THREE.Vector3;
  autoHeight?: boolean;
  anchor?: AnchorType;
  parentPosition?: THREE.Vector3;
  parentRotation?: THREE.Quaternion;
}) {
  console.log("DocumentPanel");

  const ref = useRef<THREE.Object3D>();
  let start = useRef();
  let end = useRef();
  const [numOfSelection, setNumOfSelection] = useState(0);
  const selectionRefs = useRef([]);
  const isSelecting = useRef(false);
  const [canBeInteracted, setCanBeInteracted] = useState(false);
  const { controls } = useThree();
  const dispatch = useAppDispatch();
  const selector = useAppSelector;
  const selectedTextFrom = useDocumentStore((state) => state.from);
  const setSelectedText = useDocumentStore((state) => state.setSelectedText);
  const client = useClient();

  const [adjustedHeight, setAdjustedHeight] = useState(0);

  const documentId: number =
    index == null ? useDocumentsStore((state) => state.documentId).id : index;

  const [document, setDocument] = useState("");
  const documentContentList = selector(selectDocumentContentList);
  // const document = useDocument(documentId);

  const startTime = useRef(0);

  const _document = useRef("");
  useEffect(() => {
    // HACK: fix document state not updating in the callback of Interactive (e.g., onSelectend)
    if (documentId === null || documentId === undefined) return;

    // const user = store.getState().user.userInfo;
    // if (!user) return;

    // const request = new RequestById();
    // request.setId(`${documentId}`);
    // request.setUserid(user.getId());
    // request.setRoomid(user.getRoomid());
    // client.getDoument(request, {}, (err, res: Document) => {
    //   _document.current = res.getContent().replace(/\r/g, " ");

    //   setSelectedText({ text: "", from: -1 });
    //   selectionRefs.current = [];
    //   setNumOfSelection(0);

    //   setDocument(_document.current);
    // });
    if (!documentContentList[documentId]) return;

    _document.current = documentContentList[documentId];
    setDocument(_document.current);
  }, [documentId, documentContentList]);

  // useEffect(() => {
  //   if (ref.current) ref.current.userData["doc"] = index;
  // }, [index]);

  useEffect(() => {
    // clear text if other document is selected
    if (selectedTextFrom != documentId) {
      setNumOfSelection(0);
    }
  }, [selectedTextFrom]);

  const selectedBoxDepth = 0.001;

  function getClosestStart(index: number) {
    let left = _document.current.slice(0, index + 1).search(/\S+$/);
    // console.log(index, left, _document.current.slice(left, index));
    return left;
  }

  function getClosestEnd(index: number) {
    let right = _document.current.slice(index).search(/\s/);

    if (right === -1) right = _document.current.length - index;
    // console.log(index, right, _document.current.slice(index, index + right));
    return index + right;
  }

  function handleTextSelectStart(e) {
    let local = e.object.worldToLocal(e.point);
    if (controls) controls.enabled = false;
    start.current = getCaretAtPoint(
      ref.current.textRenderInfo,
      local.x,
      local.y
    );
    end.current = undefined;
    isSelecting.current = true;
    setNumOfSelection(0);
    setCanBeInteracted(false);

    startTime.current = Date.now();
  }

  function handleTextSelectEnd(e: XRInteractionEvent) {
    // this one seems not detected because we are now actively updating the selection box, the raycaster is not picking it
    // console.log("handleTextSelectEnd", numOfSelection);

    if (!start.current) {
      if (controls) controls.enabled = true;
      isSelecting.current = false;
      return;
    }
    // handleTextMove(e);
    if (controls) controls.enabled = true;
    isSelecting.current = false;
    setCanBeInteracted(true);

    updateSelectedText();

    // const selectionRects = getSelectionRects(
    //   ref.current.textRenderInfo,
    //   getClosestStart(start.current.charIndex),
    //   getClosestEnd(end.current.charIndex)
    // );
    // setNumOfSelection(selectionRects.length);
  }

  function handleTextMove(e) {
    // if time is less than 0.2s, we don't update the selection
    if (Date.now() - startTime.current < 200) {
      return;
    }

    if (!isSelecting.current) {
      return;
    }
    let local = e.object.worldToLocal(e.point);
    end.current = getCaretAtPoint(ref.current.textRenderInfo, local.x, local.y);

    let _start = getClosestStart(start.current.charIndex);
    let _end = getClosestEnd(end.current.charIndex);
    // console.log(_start, _end);

    if (_start < _end && _start >= 0 && _end >= 0) {
      setNumOfSelection(
        getSelectionRects(ref.current.textRenderInfo, _start, _end).length
      );
    }
  }

  function updateSelectedText() {
    // console.log(_document.current);

    if (start.current && end.current) {
      let _start = getClosestStart(start.current.charIndex);
      let _end = getClosestEnd(end.current.charIndex);

      if (_start < 0 || _end < 0) {
        return;
      }

      console.log(
        _document.current
          // .replace(/\r\n/g, "\n")
          .substring(getClosestStart(_start), getClosestEnd(_end))
      );

      setSelectedText(
        // fix index error because of \r\n
        {
          text: _document.current
            // .replace(/\r\n/g, "\n")
            .substring(
              getClosestStart(start.current.charIndex),
              getClosestEnd(end.current.charIndex)
            ),
          from: documentId,
        }
      );
    } else {
      setSelectedText({ text: "", from: -1 });
    }
  }

  function updateSelectionBox() {
    // console.log("updateSelectionBox", selectionRefs.current, numOfSelection);

    if (end.current && start.current && ref.current) {
      const selectionRects = getSelectionRects(
        ref.current.textRenderInfo,
        getClosestStart(start.current.charIndex),
        getClosestEnd(end.current.charIndex)
      );

      selectionRefs.current.forEach((ref, i) => {
        if (!ref) {
          return;
        }
        let sel = selectionRects[i];
        if (!sel) {
          return;
        }

        ref.position.set(
          (sel.left + sel.right) / 2,
          (sel.top + sel.bottom) / 2,
          -0.0003
        );
        ref.scale.set(
          sel.right - sel.left,
          sel.bottom - sel.top,
          selectedBoxDepth
        );
      });
    }
  }

  useFrame(() => {
    if (isSelecting.current) {
      updateSelectionBox();
    }

    if (!ref.current) return;
    const bbox = ref.current.geometry.boundingBox;
    bbox?.getSize(temp);
    // bgPlaneRef.current.scale.set(temp.x, temp.y, 1);
    setAdjustedHeight(temp.y);
  });

  // useEffect(() => {
  //   const bbox = ref.current.geometry.boundingBox;
  //   bbox?.getSize(temp);
  //   // bgPlaneRef.current.scale.set(temp.x, temp.y, 1);
  //   setAdjustedHeight(temp.y);
  // }, [document]);

  return (
    <>
      {/* <Panel
        position={[
          position[0],
          anchor == "bottom"
            ? position[1] + (autoHeight ? adjustedHeight + 0.01 + 0.1 : height)
            : height,
          position[2],
        ]}
        rotation={rotation}
        width={width}
        height={autoHeight ? adjustedHeight + 0.01 : height}
        showTopBar={showTopBar}
        draggable={draggable}
        title={`Document ID: ${documentId}`}
      >
        <group>
          <group position={[0.008, -0.008, 0]}>
            <Interactive
              onSelectStart={(e) => handleTextSelectStart(e.intersection)}
              onSelectEnd={(e) => handleTextSelectEnd(e)}
              onMove={(e) => handleTextMove(e.intersection)}
            >
              <Text
                fontSize={fontSize}
                color="black"
                anchorX="left"
                anchorY="top"
                maxWidth={width - 0.008 * 2}
                ref={ref}
                onPointerDown={handleTextSelectStart}
                onPointerUp={handleTextSelectEnd}
                onPointerMove={handleTextMove}
              >
                {document.replace(/\r/g, " ")}
              </Text>
            </Interactive>

            {[...new Array(numOfSelection)].map((sel, i) => {
              return (
                <Plane
                  key={i}
                  scale={[0, 0, 0]}
                  ref={(el) => (selectionRefs.current[i] = el)}
                >
                  <meshBasicMaterial color={"#ACCEF7"} />

                  {canBeInteracted && (
                    <mesh position={[0, 0, 0.5]}>
                      <lineSegments raycast={() => null}>
                        <edgesGeometry args={[boxGeometry]} />
                        <meshBasicMaterial color="black" />
                      </lineSegments>
                    </mesh>
                  )}
                </Plane>
              );
            })}
          </group>
        </group>
      </Panel> */}
      {/* <DocumentLayer
        position={parentPosition}
        rotation={parentRotation}
        document={document}
      /> */}
      <DocumentDomLayer
        ref={ref}
        position={parentPosition}
        rotation={parentRotation}
        text={document}
        documentId={documentId}
      />
    </>
  );
}
