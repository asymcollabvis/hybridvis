import { useThree } from "@react-three/fiber";
import { Interactive, InteractiveProps } from "@react-three/xr";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { HTMLMesh } from "./HTMLMesh";

const _pointer = new THREE.Vector2();
const _event = {
  type: "",
  data: _pointer,
  pointerId: undefined,
  deltaX: undefined,
  deltaY: undefined,
  deltaZ: undefined,
  deltaMode: undefined,
} as {
  type: string;
  data: THREE.Vector2;
  pointerId?: number;
  deltaX?: number;
  deltaY?: number;
  deltaZ?: number;
  deltaMode?: number;
};

type HTMLInteractiveGroup = InteractiveProps;

export default React.forwardRef(
  ({ children, ...props }: HTMLInteractiveGroup, ref) => {
    const raycasterRef = useRef(new THREE.Raycaster());
    const { gl, camera } = useThree();
    const groupRef = useRef<THREE.Group>(null!);
    const element = gl.domElement;
    const {
      onSelect,
      onSelectStart,
      onSelectEnd,
      onMove,
      onBlur,
      ...otherProps
    } = props;

    // bind ref and groupRef
    React.useImperativeHandle(ref, () => groupRef.current);

    function onPointerEvent(event: PointerEvent | MouseEvent | WheelEvent) {
      event.preventDefault();
      const rect = gl.domElement.getBoundingClientRect();

      _pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = (-(event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(_pointer, camera);

      if (!groupRef.current) return;
      const intersects = raycasterRef.current.intersectObjects(
        groupRef.current.children,
        false
      );

      if (intersects.length > 0) {
        event.stopPropagation();

        const intersection = intersects[0];

        const object = intersection.object;
        const uv = intersection.uv;

        if (uv) {
          _event.type = event.type;
          _event.data.set(uv.x, 1 - uv.y);
          _event.pointerId = event.pointerId;
          _event.deltaX = event.deltaX;
          _event.deltaY = event.deltaY;
          _event.deltaZ = event.deltaZ;
          _event.deltaMode = event.deltaMode;

          object.dispatchEvent(_event);
        }
      }
    }

    useEffect(() => {
      element.addEventListener("pointerdown", onPointerEvent);
      element.addEventListener("pointerup", onPointerEvent);
      element.addEventListener("pointermove", onPointerEvent);
      element.addEventListener("mousedown", onPointerEvent);
      element.addEventListener("mouseup", onPointerEvent);
      element.addEventListener("mousemove", onPointerEvent);
      element.addEventListener("wheel", onPointerEvent);
      element.addEventListener("click", onPointerEvent);
      element.addEventListener("contextmenu", onPointerEvent);

      return () => {
        element.removeEventListener("pointerdown", onPointerEvent);
        element.removeEventListener("pointerup", onPointerEvent);
        element.removeEventListener("pointermove", onPointerEvent);
        element.removeEventListener("mousedown", onPointerEvent);
        element.removeEventListener("mouseup", onPointerEvent);
        element.removeEventListener("mousemove", onPointerEvent);
        element.removeEventListener("wheel", onPointerEvent);
        element.removeEventListener("click", onPointerEvent);
        element.removeEventListener("contextmenu", onPointerEvent);
      };
    }, []);

    return (
      <Interactive
        ref={groupRef}
        {...otherProps}
        onSelect={(e) => {
          onSelect && onSelect(e);

          if (e.blockDefault) return;

          const intersection = e.intersection;

          if (!intersection) return;

          const object = intersection.object;
          const uv = intersection.uv;

          if (uv) {
            _event.type = "click";
            _event.data.set(uv.x, 1 - uv.y);
            _event.pointerId = 0;

            object.dispatchEvent(_event);
          }
        }}
        onSelectStart={(e) => {
          onSelectStart && onSelectStart(e);

          if (e.blockDefault) return;

          const intersection = e.intersection;

          if (!intersection) return;

          const object = intersection.object;
          const uv = intersection.uv;

          if (uv) {
            console.log("pointerDown!!!", uv);

            _event.type = "pointerdown";
            _event.data.set(uv.x, 1 - uv.y);
            _event.pointerId = 0;

            object.dispatchEvent(_event);
          }
        }}
        onSelectEnd={(e) => {
          onSelectEnd && onSelectEnd(e);

          if (e.blockDefault) return;

          const intersection = e.intersection;

          if (!intersection) return;

          const object = intersection.object;
          const uv = intersection.uv;

          if (uv) {
            _event.type = "pointerup";
            _event.data.set(uv.x, 1 - uv.y);
            _event.pointerId = 0;

            object.dispatchEvent(_event);
          }
        }}
        onMove={(e) => {
          onMove && onMove(e);

          if (e.blockDefault) return;

          const intersection = e.intersection;

          if (!intersection) return;

          const object = intersection.object;
          const uv = intersection.uv;

          if (uv) {
            _event.type = "pointermove";
            _event.data.set(uv.x, 1 - uv.y);
            _event.pointerId = 0;

            object.dispatchEvent(_event);
          }
        }}
        onBlur={(e) => {
          onBlur && onBlur(e);

          if (e.blockDefault) return;

          // console.log("onBlur:", e);

          // find HTMLMesh type
          let object = groupRef.current.children.find(
            (c) => c instanceof HTMLMesh
          );
          // console.log("blurObject:", object);

          _event.type = "blur";
          object?.dispatchEvent(_event);
        }}
      >
        {children}
      </Interactive>
    );
  }
);
