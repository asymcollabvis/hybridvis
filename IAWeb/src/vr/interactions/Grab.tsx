// referring to https://gist.github.com/micmania1/6a189a51691b8239826a0a3ecad7f0d5

import { useHelper } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useXR, useXREvent, XRController } from "@react-three/xr";
import React, { useCallback, useEffect } from "react";
import { forwardRef, ReactNode, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { BoxHelper, Object3D, XRHandSpace, XRTargetRaySpace } from "three";
import { create } from "zustand";
import { intersects } from "./utils";

/*-------------------------------------------------------------------------------------
 * XR Interaction Manager / State store
 *------------------------------------------------------------------------------------*/
export type GrabEvent = {
  type: "grabstart" | "grabend";
  target: Object3D;
  controller: XRController;
};

type XRInteractionManager = {
  grabbing: Partial<
    Record<XRInputSource["handedness"], THREE.Object3D | undefined>
  >;
  startGrab(object: THREE.Object3D, controller: XRController): void;
  endGrab(object: THREE.Object3D, controller: XRController): void;
};

const useXRInteractionManager = create<XRInteractionManager>((set, get) => ({
  grabbing: {},
  startGrab(object: THREE.Object3D, controller: XRController) {
    const grabbing = get().grabbing;
    const handedness = controller.inputSource.handedness;
    set({
      grabbing: {
        ...grabbing,
        [handedness]: object,
      },
    });
    object.dispatchEvent({ type: "grabstart", controller });
  },
  endGrab(object: THREE.Object3D, controller: XRController) {
    const grabbing = get().grabbing;
    const handedness = controller.inputSource.handedness;
    if (object.id === grabbing[handedness]?.id) {
      grabbing[handedness]?.dispatchEvent({
        type: "grabend",
        controller,
      });

      set({
        grabbing: {
          ...grabbing,
          [handedness]: undefined,
        },
      });
    }
  },
}));

type XRHandProps = {
  grabbing: Partial<
    Record<XRInputSource["handedness"], THREE.Object3D | undefined>
  >;
  isReadyToGrab: Partial<
    Record<XRInputSource["handedness"], THREE.Object3D | undefined>
  >;
  startGrab(object: THREE.Object3D, hand: XRHandSpace): void;
  endGrab(object: THREE.Object3D, hand: XRHandSpace): void;
  setIsReadyToGrab(
    object: THREE.Object3D,
    isReady: boolean,
    hand: XRHandSpace
  ): void;
};

export const useXRHandManager = create<XRHandProps>((set, get) => ({
  grabbing: {},
  isReadyToGrab: {},
  startGrab(object: THREE.Object3D, hand: XRHandSpace) {
    const grabbing = get().grabbing;
    console.log("startGrab", hand);

    const handedness = hand.handedness;
    set({
      grabbing: {
        ...grabbing,
        [handedness]: object,
      },
    });
    object.dispatchEvent({ type: "grabstart", hand });
  },
  endGrab(object: THREE.Object3D, hand: XRHandSpace) {
    const grabbing = get().grabbing;
    const handedness = hand.handedness;
    if (object.id === grabbing[handedness]?.id) {
      grabbing[handedness]?.dispatchEvent({
        type: "grabend",
        hand,
      });

      set({
        grabbing: {
          ...grabbing,
          [handedness]: undefined,
        },
      });
    }
  },
  setIsReadyToGrab(
    object: THREE.Object3D,
    isReady: boolean,
    hand: XRHandSpace
  ) {
    const isReadyToGrab = get().isReadyToGrab;
    const handedness = hand.handedness;
    const originalObject = isReadyToGrab[handedness];
    let newObject = originalObject;

    if (isReady && !originalObject) {
      newObject = object;
    } else if (!isReady && originalObject && originalObject.id === object.id) {
      newObject = undefined;
    }

    set({
      isReadyToGrab: {
        ...isReadyToGrab,
        [handedness]: newObject,
      },
    });
    // console.log("setIsReadyToGrab", handedness, isReady, newObject);
  },
}));

/*-------------------------------------------------------------------------------------
 * Interactive Component
 *------------------------------------------------------------------------------------*/
// eslint-disable-next-line @typescript-eslint/ban-types
type XRInteractionEvent = {
  handedness: XRInputSource["handedness"];
  input: THREE.XRTargetRaySpace | THREE.XRHandSpace;
};

type XRInteractionProps = {
  name?: string;
  children: ReactNode;
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  scale?: THREE.Vector3;
  userData?: Record<string, unknown>;
  onGrabStart?: (event: XRInteractionEvent) => void;
  onGrabEnd?: (event: XRInteractionEvent) => void;
};

export const XRInteraction = forwardRef<unknown, XRInteractionProps>(
  (
    {
      children,
      onGrabStart,
      onGrabEnd,
      position,
      scale,
      rotation,
      userData,
      name,
    },
    ref
  ) => {
    console.log("XRInteraction");

    const groupRef = useRef<THREE.Group>(null);
    const excludedName = ["graph"];
    // useHelper(groupRef, BoxHelper, "cyan");

    useImperativeHandle(ref, () => groupRef.current);

    const { controllers } = useXR();
    const hand0 = useThree((state) => state.gl).xr.getHand(0);
    const hand1 = useThree((state) => state.gl).xr.getHand(1);

    const startGrab = useXRInteractionManager((im) => im.startGrab);
    const endGrab = useXRInteractionManager((im) => im.endGrab);
    const startHandGrab = useXRHandManager((im) => im.startGrab);
    const endHandGrab = useXRHandManager((im) => im.endGrab);
    const setIsReadyToGrab = useXRHandManager((im) => im.setIsReadyToGrab);

    const grabbingController = useRef<XRController | null>(null);
    const grabbingHand = useRef<XRHand | null>(null);

    useXREvent("squeezestart", (e) => {
      if (e.target.userData.captured) return;
      // console.log("squeezestart", e.target.inputSource.handedness);

      if (groupRef.current) {
        const controller = controllers.find(
          (controller) =>
            controller.inputSource.handedness ===
            e.target.inputSource.handedness
        );

        if (controller) {
          const controllerBoundingBox = new THREE.Box3();
          controllerBoundingBox.setFromObject(controller.grip);

          if (
            controllerBoundingBox &&
            intersects(controllerBoundingBox, groupRef.current)
          ) {
            console.log("select start");

            startGrab(groupRef.current, e.target);
            controller.userData.grabbing = true;
            onGrabStart?.({
              handedness: controller.inputSource.handedness,
              input: controller.controller,
            });
            grabbingController.current = controller;
          }
        }
      }
    });

    useXREvent("squeezeend", (e) => {
      const controller = e.target;
      if (groupRef.current) {
        endGrab(groupRef.current, e.target);
        controller.userData.grabbing = false;
        onGrabEnd?.({
          handedness: controller.inputSource.handedness,
          input: controller.controller,
        });
        grabbingController.current = null;
      }
    });

    useFrame(() => {
      if (!groupRef.current) return;

      if (
        grabbingController.current &&
        grabbingController.current.userData.captured
      ) {
        endGrab(groupRef.current, grabbingController.current);
        grabbingController.current.userData.grabbing = false;
        onGrabEnd?.({
          handedness: grabbingController.current.inputSource.handedness,
          input: grabbingController.current.controller,
        });
        grabbingController.current = null;
      }

      if (grabbingHand.current && grabbingHand.current.userData.captured) {
        endHandGrab(groupRef.current, grabbingHand.current);
        grabbingHand.current.userData.grabbing = false;
        onGrabEnd?.({
          handedness: grabbingHand.current.handedness,
          input: grabbingHand.current,
        });
        grabbingHand.current = null;
      }

      // check if any controller is ready to grab
      // TODO: it is not working now
      // [hand0, hand1].forEach((hand) => {
      //   checkHand(hand);
      // });
    });

    const checkHand = useCallback(
      (hand) => {
        if (
          !hand.grabArea ||
          !groupRef.current ||
          excludedName.includes(groupRef.current.name)
        )
          return;

        const controllerBoundingBox = new THREE.Box3();
        controllerBoundingBox.setFromObject(hand);
        // console.log("hand", controllerBoundingBox.max, groupRef.current.position);

        if (intersects(controllerBoundingBox, groupRef.current)) {
          console.log(
            "controllerBoundingBox",
            intersects(controllerBoundingBox, groupRef.current),
            hand,
            hand.handedness
          );
        }

        if (
          controllerBoundingBox &&
          intersects(controllerBoundingBox, groupRef.current)
        ) {
          console.log("ready to grab", groupRef.current);

          setIsReadyToGrab(groupRef.current, true, hand);
        } else {
          // console.log("not ready to grab", groupRef.current);

          setIsReadyToGrab(groupRef.current, false, hand);
        }
      },
      [hand0, hand1]
    );

    const onPinchStart = useCallback(
      (e) => {
        if (e.target.userData.captured) return;

        if (groupRef.current) {
          const hand = e.target;
          // console.log("hand", hand);

          if (hand) {
            const handBoundingBox = new THREE.Box3();
            handBoundingBox.setFromObject(hand);

            if (
              handBoundingBox &&
              intersects(handBoundingBox, groupRef.current)
            ) {
              console.log(
                "hand",
                handBoundingBox.max,
                groupRef.current.position
              );

              startHandGrab(groupRef.current, e.target);
              hand.userData.grabbing = true;
              onGrabStart?.({
                handedness: hand.handedness,
                input: hand,
              });
              grabbingHand.current = hand;
            }
          }
        }
      },
      [hand0, hand1]
    );

    const onPinchEnd = useCallback(
      (e) => {
        if (!grabbingHand.current) return;

        endHandGrab(groupRef.current, grabbingHand.current);
        grabbingHand.current.userData.grabbing = false;
        onGrabEnd?.({
          handedness: grabbingHand.current.handedness,
          input: grabbingHand.current,
        });
        grabbingHand.current = null;
      },
      [hand0, hand1]
    );

    useEffect(() => {
      [hand0, hand1].forEach((hand) => {
        // hand.addEventListener("pinchstart", onPinchStart);
        // hand.addEventListener("pinchend", onPinchEnd);
        hand.addEventListener("handgrab", onPinchStart);
        hand.addEventListener("handrelease", onPinchEnd);
      });

      return () => {
        [hand0, hand1].forEach((hand) => {
          // hand.removeEventListener("pinchstart", onPinchStart);
          // hand.removeEventListener("pinchend", onPinchEnd);
          hand.removeEventListener("handgrab", onPinchStart);
          hand.removeEventListener("handrelease", onPinchEnd);
        });
      };
    }, [hand0, hand1]);

    return (
      <group
        userData={userData}
        name={name ?? "XRInteraction"}
        ref={groupRef}
        position={position}
        rotation={rotation}
        scale={scale}
      >
        {children}
      </group>
    );
  }
);
