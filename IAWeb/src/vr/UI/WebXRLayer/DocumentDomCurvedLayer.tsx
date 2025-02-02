import { useEffect, useRef, useState } from "react";
import { useDocumentLayersStore } from "../../../stores/documentLayersStore";
import { HTMLMesh } from "../../../hybrid/HTMLMesh";
import { useAppSelector } from "../../../hooks";
import { selectDocumentContentList } from "../../../features/document/documentSlice";
import * as THREE from "three";
import HTMLInteractiveGroup from "../../../hybrid/HTMLInteractiveGroup";
import { findClickedWord } from "../../../common/helper";

export default function DocumentDomCurvedLayer({
  position,
  rotation,
  centralAngle,
}: {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  centralAngle: number;
}) {
  const { addLayer } = useDocumentLayersStore();
  const groupRef = useRef<THREE.Group>(null!);
  const selector = useAppSelector;

  const documentContentList = selector(selectDocumentContentList);

  const gap = 50; // @HACK: hardcode

  const [htmlMesh, setHtmlMesh] = useState<THREE.Mesh | null>(null);

  useEffect(() => {
    console.log("documentContentList", documentContentList);

    const documents = document.createElement("div");
    // documents.style.position = "absolute";
    // documents.style.top = "0px";
    documents.style.display = "grid";
    documents.style.gridTemplateColumns = "repeat(4, 1fr)";
    documents.style.width = `${centralAngle * 1024}px`;
    documents.style.height = "1024px";
    documents.style.gap = `${gap}px`;

    documents.onclick = (e) => {
      console.log("clicked", e.target, e.clientX, e.clientY);
      e.target?.childNodes.forEach((node) => {
        var clicked = findClickedWord(node, e.clientX, e.clientY);
        if (clicked) {
          console.log("clicked", clicked);
          return;
        }
      });
    };

    Object.entries(documentContentList).forEach(([key, value]) => {
      const layer = document.createElement("div");
      layer.innerText = value;
      // layer.style.position = "absolute";
      // layer.style.top = "0px";
      layer.style.padding = "8px";
      layer.style.backgroundColor = "white";
      layer.style.fontSize = "10px";

      //   layer.style.width = `512px`;
      //   layer.style.height = "512px";
      documents.appendChild(layer);
    });
    document.body.appendChild(documents);
    let geometry = new THREE.CylinderGeometry(
      2,
      2,
      2,
      32,
      1,
      true,
      Math.PI - centralAngle / 2,
      centralAngle
    );
    let material = new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      transparent: true,
      toneMapped: false,
    });
    const mesh = new HTMLMesh(documents, geometry, material);
    mesh.renderOrder = -10;
    mesh.scale.set(-1, 1, 1);
    // mesh.position.copy(position);
    setHtmlMesh(mesh);

    // let s = new Stats();
    // s.dom.style.width = '80px';
    // s.dom.style.height = '48px';
    // document.body.appendChild(s.dom);

    // //
    // const mesh = new HTMLMesh(s.dom);
    // // mesh.position.x = - 0.75;
    // // mesh.position.y = 2;
    // // mesh.position.z = - 0.6;
    // // mesh.rotation.y = Math.PI / 4;
    // mesh.scale.setScalar(1);
    addLayer({
      layerType: "cylinder",
      config: {
        radius: 2,
        centralAngle: centralAngle,
        aspectRatio: centralAngle,
        viewPixelWidth: centralAngle * 1024,
        viewPixelHeight: 1024,
        layout: "mono",
      },
      mesh: mesh,
      position: position,
      rotation: rotation,
    });
    groupRef.current.add(mesh);
    // console.log("htmlmesh", mesh.material.map);

    // console.log("adding dom layer", layer, groupRef.current);
    return () => {
      document.body.removeChild(documents);
    };
  }, [documentContentList]);

  return (
    <HTMLInteractiveGroup
      ref={groupRef}
      position={position}
    ></HTMLInteractiveGroup>
  );
}
