import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useDocumentLayersStore } from "../../../stores/documentLayersStore";
import { HTMLMesh } from "../../../hybrid/HTMLMesh";
import { Plane, Sphere } from "@react-three/drei";
import HTMLInteractiveGroup from "../../../hybrid/HTMLInteractiveGroup";
import { findClickedWord } from "../../../common/helper";
import { useCloseDocumentStore, useDocumentStore } from "../../../stores/store";
import { State, useStateMachineStore } from "../../../stores/stateMachineStore";
import { useXREvent } from "@react-three/xr";

interface DocumentDomLayerProps {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  text: string;
  documentId: number;
}

export default forwardRef<any, DocumentDomLayerProps>(
  ({ position, rotation, text, documentId }, ref) => {
    const { addLayer } = useDocumentLayersStore();
    const groupRef = useRef<THREE.Group>(null!);
    const domTextRef = useRef<HTMLDivElement>(null!);
    const [mesh, setMesh] = useState<THREE.Mesh | null>(null);

    const selectedNodeRef = useRef<Node | null>(null);
    const firstClickedRef = useRef(null);
    const firstNodeIndexRef = useRef<number | null>(null);
    const onHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const visualCuePlaneRef = useRef<THREE.Mesh>(null!);
    // const meshRef = useRef<THREE.Mesh>(null!);

    // useImperativeHandle(ref, () => groupRef.current);

    const currentText = useRef(text);
    const { setSelectedText } = useDocumentStore();
    const { state, setState } = useStateMachineStore();
    const { setCloseDocumentMesh } = useCloseDocumentStore();

    const width = 800;
    const height = 1000;

    const ratio = 1 / 1024;
    const padding = 30;

    useEffect(() => {
      const layer = document.createElement("div");
      layer.innerText = text;
      // layer.style.position = "absolute";
      // layer.style.top = "0px";
      layer.style.padding = "8px";
      layer.style.backgroundColor = "white";
      layer.style.fontSize = "20px";

      layer.style.width = `${width}px`;
      layer.style.height = `${height}px`;
      document.body.appendChild(layer);
      const mesh = new HTMLMesh(layer);
      domTextRef.current = layer;

      layer.addEventListener("pointerdown", (e) => {
        console.log("mousedown", e.target);

        domTextRef.current.innerText = currentText.current;
        // unhighlight the previous word
        // if (selectedNodeRef.current) {
        //   console.log("unhighlight", selectedNodeRef.current);

        //   selectedNodeRef.current.outerHTML = selectedNodeRef.current.textContent;
        //   selectedNodeRef.current = null;
        // }

        firstClickedRef.current = null;
        firstNodeIndexRef.current = null;
        console.log("e.target", e);

        for (let i = 0; i < e.target?.childNodes.length; i++) {
          let n = e.target?.childNodes[i];
          // console.log("n", n, e.clientX, e.clientY);
          firstClickedRef.current = findClickedWord(
            `${documentId} ${i}`,
            n,
            e.clientX,
            e.clientY,
            padding
          );
          if (firstClickedRef.current) {
            firstNodeIndexRef.current = i;
            break;
          }
        }
      });

      layer.addEventListener("pointermove", (e) => {
        if (!firstClickedRef.current) return;

        // reset
        // console.log("reset", currentText.current);

        domTextRef.current.innerText = currentText.current;

        let lastNodeIndex = null;
        let lastClicked = null;
        // console.log("mousemove", e.target, e.clientX, e.clientY);
        for (let i = 0; i < e.target?.childNodes.length; i++) {
          let n = e.target?.childNodes[i];
          let clicked = findClickedWord(
            `${documentId} ${i}`,
            n,
            e.clientX,
            e.clientY,
            padding
          );
          if (clicked) {
            lastClicked = clicked;
            lastNodeIndex = i;
            break;
          }
        }
        if (lastClicked && lastNodeIndex != null) {
          let start = null;
          let startNodeIndex = null;
          let end = null;
          let endNodeIndex = null;

          // compare the index
          // console.log("lastNodeIndex", lastNodeIndex, firstNodeIndexRef.current);

          if (lastNodeIndex < firstNodeIndexRef.current) {
            start = lastClicked[1];
            startNodeIndex = lastNodeIndex;
            end = firstClickedRef.current[1];
            endNodeIndex = firstNodeIndexRef.current;
          } else if (lastNodeIndex > firstNodeIndexRef.current) {
            start = firstClickedRef.current[1];
            startNodeIndex = firstNodeIndexRef.current;
            end = lastClicked[1];
            endNodeIndex = lastNodeIndex;
          } else {
            // handle the same node, compare the index
            if (lastClicked[1] < firstClickedRef.current[1]) {
              start = lastClicked[1];
              startNodeIndex = lastNodeIndex;
              end = firstClickedRef.current[1];
              endNodeIndex = firstNodeIndexRef.current;
            } else {
              start = firstClickedRef.current[1];
              startNodeIndex = firstNodeIndexRef.current;
              end = lastClicked[1];
              endNodeIndex = lastNodeIndex;
            }
          }

          // highlight the word

          // if same node
          if (startNodeIndex == endNodeIndex) {
            let words =
              e.target?.childNodes[startNodeIndex].textContent.split("");
            words[
              start
            ] = `<span style="background-color: yellow; pointer-events: none;">${words[start]}`;
            if (words[end] == undefined)
              console.warn("words[end] is undefined", words, end);

            words[end] = `${words[end]}</span>`;
            e.target?.childNodes[startNodeIndex].replaceWith(words.join(""));
          } else {
            let wordsStart =
              e.target?.childNodes[startNodeIndex].textContent.split("");
            wordsStart[
              start
            ] = `<span style="background-color: yellow; pointer-events: none;">${wordsStart[start]}`;

            let wordsEnd =
              e.target?.childNodes[endNodeIndex].textContent.split("");
            if (wordsEnd[end] == undefined)
              console.warn("words[end] is undefined 2", wordsEnd, end);
            wordsEnd[end] = `${wordsEnd[end]}</span>`;
            e.target?.childNodes[startNodeIndex].replaceWith(
              wordsStart.join("")
            );
            e.target?.childNodes[endNodeIndex].replaceWith(wordsEnd.join(""));
          }

          // convert childNodes to html string and set it to the layer
          let html = "";
          for (let i = 0; i < e.target?.childNodes.length; i++) {
            // child node is a text node
            if (e.target?.childNodes[i].nodeName == "#text")
              html += e.target?.childNodes[i].textContent;
            else html += e.target?.childNodes[i].outerHTML;
          }
          // console.log("html", html);

          domTextRef.current.innerHTML = html;
        }
      });

      layer.addEventListener("pointerup", (e) => {
        firstClickedRef.current = null;
        firstNodeIndexRef.current = null;

        // find the clicked words by looking for the span
        let spanElement = e.target?.querySelector("span");
        console.log("spanElement", spanElement);

        if (spanElement) {
          setSelectedText({
            text: spanElement.textContent,
            from: documentId,
          });
        } else {
          setSelectedText({
            text: "",
            from: -1,
          });
        }
      });

      layer.addEventListener("blur", (e) => {
        // console.log("blurEvent", e);
        firstClickedRef.current = null;
        firstNodeIndexRef.current = null;
      });

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
      setMesh(mesh);
      addLayer({
        layerType: "quad",
        mesh: mesh,
        position: position,
        rotation: rotation,
        config: {
          width: (width * ratio) / 2,
          height: (height * ratio) / 2,
          viewPixelWidth: width,
          viewPixelHeight: height,
          layout: "mono",
        },
      });
      // groupRef.current.add(mesh);
      console.log("adding dom layer", layer, groupRef.current);

      // checkParentScale(groupRef.current);
    }, []);

    useEffect(() => {
      if (mesh && documentId != null) {
        console.log(`${documentId} doc setup completed`);
        mesh.userData["doc"] = documentId;
      }
    }, [mesh, documentId]);

    function checkParentScale(obj: THREE.Object3D) {
      if (obj.parent) {
        console.log("parent", obj.parent, obj.parent.scale);
        checkParentScale(obj.parent);
      }
    }

    function getVisualCueColor(state: State) {
      switch (state) {
        case State.DocumentHovered:
          return "green";
        case State.DocumentCloseInteraction:
          return "blue";
        default:
          return "red";
      }
    }

    useEffect(() => {
      // console.log("update text", text);

      domTextRef.current.innerText = text;
      currentText.current = text;
    }, [text]);

    useXREvent(
      "selectend",
      (e) => {
        if (state == State.DocumentCloseInteraction) {
          setState(State.General);
        }
      },
      { handedness: "left" }
    );

    return (
      <HTMLInteractiveGroup
        ref={groupRef}
        onHover={(e) => {
          if (e.target.inputSource.handedness != "left") return;

          if (state === State.DocumentCloseInteraction) {
            e.blockDefault = true;
            return;
          }
          // console.log("hover", e);
          visualCuePlaneRef.current.visible = true;

          onHoverTimeoutRef.current = setTimeout(() => {
            if (state == State.General) setState(State.DocumentHovered);
          }, 1000);
        }}
        onBlur={(e) => {
          if (e.target.inputSource.handedness != "left") return;

          if (onHoverTimeoutRef.current)
            clearTimeout(onHoverTimeoutRef.current);

          visualCuePlaneRef.current.visible = false;
          if (state == State.DocumentHovered) setState(State.General);
          onHoverTimeoutRef.current = null;
        }}
        onSelectStart={(e) => {
          if (e.target.inputSource.handedness != "left") return;

          if (state == State.DocumentHovered) {
            setCloseDocumentMesh(mesh);
            setState(State.DocumentCloseInteraction);
            e.blockDefault = true;
          }
        }}
        onSelectEnd={(e) => {
          if (state === State.DocumentCloseInteraction) {
            e.blockDefault = true;
            return;
          }
        }}
        onSelect={(e) => {
          if (state === State.DocumentCloseInteraction) {
            e.blockDefault = true;
            return;
          }
        }}
        onMove={(e) => {
          if (state === State.DocumentCloseInteraction) {
            e.blockDefault = true;
            return;
          }
        }}
      >
        {/* <Sphere scale={0.1}></Sphere> */}
        {/* <Plane args={[1, 1]}></Plane> */}
        {mesh && (
          <primitive object={mesh} renderOrder={-10} position={[0, 0.5, 0]}>
            <planeGeometry args={[width * ratio, height * ratio]} />
            <meshBasicMaterial colorWrite={false} map={mesh.material.map} />
          </primitive>
        )}

        <Plane
          ref={visualCuePlaneRef}
          visible={false}
          position={[0, 0.5, -0.01]}
          args={[(width + 50) * ratio, (height + 50) * ratio]}
        >
          <meshBasicMaterial color={getVisualCueColor(state)} />
        </Plane>
      </HTMLInteractiveGroup>
    );
  }
);
