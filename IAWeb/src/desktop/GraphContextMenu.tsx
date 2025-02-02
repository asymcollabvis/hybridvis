import { Button, ButtonGroup, styled } from "@mui/material";
import Box from "@mui/material/Box";
import { Html } from "@react-three/drei";
import VRButton from "../vr/UI/Button";
import React, { useEffect, useRef, useState } from "react";
import { sendMessage } from "../common/client";
import {
  deleteNode,
  deleteLink,
  mergeNodes,
  clearNodeSelection,
} from "../common/graph";
import {
  BoardcastMessage,
  BoardcastMessage_Action,
  UserInfo,
  UserInfo_ClientType,
} from "../common/message";
import {
  selectNodesRaw,
} from "../features/graph/graphSlice";
import { computeMenuPosition } from "../features/graph/NodesInstance";
import { selectUser, selectUserEnv } from "../features/user/userSlice";
import { useAppDispatch, useAppSelector } from "../hooks";
import store from "../store";
import Panel from "../vr/UI/Panel";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  useDocumentsStore,
  useGraphContextMenuStore,
  useGraphStore,
  useNodeCreateVisualizerStore,
} from "../stores/store";

const BootstrapButton = styled(Button)({
  textTransform: "none",
});

export function GraphContextMenu({ container, temp = new THREE.Vector3() }) {
  console.log("GraphContextMenu");

  const selector = useAppSelector;
  const dispatch = useAppDispatch();
  const { setDocumentId } = useDocumentsStore();
  const env = selector(selectUserEnv);
  const user = selector(selectUser);
  const isNodeMenuOpen = useGraphContextMenuStore((state) => state.isOpen);
  const nodeMenuId = useGraphContextMenuStore((state) => state.menuId);
  const setIsNodeMenuOpen = useGraphContextMenuStore((state) => state.open);
  const setIsMoveNode = useNodeCreateVisualizerStore(
    (state) => state.setNodeId
  );
  const nodesRaw = selector(selectNodesRaw);
  const selectedNodeIds = useGraphStore(state => state.selectedNodeIds).map((id) => {
    return nodesRaw.findIndex((node) => id === +node.id);
  });
  const vrMenuRef = useRef<any>();

  function sendDeleteNode(id: number) {
    // if (user?.id === nodesRaw[id].getCreatedby()) {
    if (user === null) return;

    deleteNode(user, +nodesRaw[id].id);
    // }
  }

  // functions used in the menu
  function menuDeleteNode() {
    setIsNodeMenuOpen(false);

    if (nodeMenuId === undefined) return;
    sendDeleteNode(nodeMenuId);
  }

  function menuDeleteLink() {
    const [n1, n2] = selectedNodeIds.map((id) => nodesRaw[id].id);
    const targetLink = store.getState().graph.links.find((link) => {
      return (
        (link.source === +n1 && link.target === +n2) ||
        (link.source === +n2 && link.target === +n1)
      );
    });
    if (targetLink?.id !== undefined && user !== null) {
      // console.log(targetLinkId);
      deleteLink(user, parseInt(targetLink?.id));
    } else {
      console.error("no link found between", n1, n2);
    }

    setIsNodeMenuOpen(false);
  }

  function menuReferToDoc() {
    setIsNodeMenuOpen(false);

    if (nodeMenuId === undefined) return;
    let target = store.getState().graph.nodesRaw[nodeMenuId].createdFrom;

    setDocumentId(
      store
        .getState()
        .document.documents.findIndex((d) => d.fileName === target)
    );
  }

  function menuMergeNodes() {
    if (user === null) return;

    mergeNodes(user);

    // clear selection
    clearNodeSelection(user);
  }

  function menuNodeHighlight() {
    setIsNodeMenuOpen(false);
    if (user === null) return;
    if (nodeMenuId === undefined) return;

    console.log("highlight");

    sendMessage(
      user,
      store.getState().graph.nodesRaw[nodeMenuId].id,
      BoardcastMessage_Action.HIGHLIGHT
    );
  }

  function menuNodeMove() {
    let id = nodeMenuId;

    if (id === undefined) return;
    console.log("move", store.getState().graph.nodesRaw[id].id);

    // display visual cues
    setIsMoveNode(store.getState().graph.nodesRaw[id].id);

    setIsNodeMenuOpen(false);
  }

  function drawVRMenu() {
    return (
      <Panel
        position={computeMenuPosition(nodeMenuId, [0, -6, 0])}
        showTopBar={false}
        draggable={false}
        height={0.08}
        width={0.12}
        offset={0.022}
        ref={vrMenuRef}
      >
        <VRButton width={0.09} onClick={() => menuReferToDoc()}>
          Go to Document
        </VRButton>
        <VRButton
          onClick={() => {
            menuNodeHighlight();
          }}
        >
          Highlight
        </VRButton>
        <VRButton onClick={menuNodeMove}>Move</VRButton>
        <VRButton onClick={() => menuDeleteNode()}>Delete</VRButton>
        {selectedNodeIds.length > 1 && selectedNodeIds.includes(nodeMenuId) && (
          <VRButton width={0.09} onClick={() => menuDeleteLink()}>
            Delete Link
          </VRButton>
        )}
        {selectedNodeIds.length > 1 && selectedNodeIds.includes(nodeMenuId) && (
          <VRButton
            onClick={() => {
              menuMergeNodes();
            }}
          >
            Merge
          </VRButton>
        )}
      </Panel>
    );
  }

  useFrame(() => {
    // update menu's scale
    if (vrMenuRef.current) {
      container.getWorldScale(temp);
      vrMenuRef.current.scale.set(
        (1 / temp.x) * 2,
        (1 / temp.y) * 2,
        (1 / temp.z) * 2
      );
    }
  });

  return (
    <>
      <group></group>
      {isNodeMenuOpen && env == UserInfo_ClientType.DESKTOP && (
        <Html
          position={computeMenuPosition(nodeMenuId)}
          // distanceFactor={0.002}
          zIndexRange={[16777272, 16777272]}
          onPointerMissed={() => setIsNodeMenuOpen(false)}
        >
          <Box
            component={"div"}
            sx={{
              width: "150px",
            }}
          >
            <ButtonGroup
              orientation="vertical"
              variant="contained"
              aria-label="vertical outlined button group"
            >
              <BootstrapButton
                onClick={() => {
                  menuReferToDoc();
                }}
              >
                Go to document
              </BootstrapButton>
              <BootstrapButton
                onClick={() => {
                  menuDeleteNode();
                }}
              >
                Delete
              </BootstrapButton>

              {selectedNodeIds.length > 1 &&
                selectedNodeIds.includes(nodeMenuId ?? -1) && (
                  <BootstrapButton
                    onClick={() => {
                      menuDeleteLink();
                    }}
                  >
                    Delete Link
                  </BootstrapButton>
                )}
              {selectedNodeIds.length > 1 &&
                selectedNodeIds.includes(nodeMenuId ?? -1) && (
                  <BootstrapButton
                    onClick={() => {
                      menuMergeNodes();
                    }}
                  >
                    Merge
                  </BootstrapButton>
                )}
            </ButtonGroup>
          </Box>
        </Html>
      )}

      {isNodeMenuOpen && env == UserInfo_ClientType.VR && drawVRMenu()}
    </>
  );
}
