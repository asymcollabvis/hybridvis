import * as React from "react";
import { Object3DNode, extend, createPortal } from "@react-three/fiber";
import { OculusHandModel } from "three-stdlib";
import { Ray, useXR, XRController } from "@react-three/xr";
import { useIsomorphicLayoutEffect } from "@react-three/xr/src/utils";
import { Sphere } from "@react-three/drei";
import { useXRHandManager } from "./Grab";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      oculusHandModel: Object3DNode<OculusHandModel, typeof OculusHandModel>;
    }
  }
}

export interface HandsProps {
  modelLeft?: string;
  modelRight?: string;
  hideRaysOnBlur?: boolean;
  rayMaterial?: {};
}
export function Hands({
  modelLeft,
  modelRight,
  hideRaysOnBlur = false,
  rayMaterial = {},
}: HandsProps) {
  const controllers = useXR((state) => state.controllers);
  const [handReady, setHandReady] = React.useState({});
  React.useMemo(() => extend({ OculusHandModel }), []);
  const rayMaterialProps = React.useMemo(
    () =>
      Object.entries(rayMaterial).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [`material-${key}`]: value,
        }),
        {}
      ),
    [JSON.stringify(rayMaterial)] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Send fake connected event (no-op) so models start loading
  useIsomorphicLayoutEffect(() => {
    for (const target of controllers) {
      target.hand.dispatchEvent({
        type: "connected",
        data: target.inputSource,
        fake: true,
      });
    }
  }, [controllers, modelLeft, modelRight]);

  const onConnected = React.useCallback(
    (e) => {
      console.log("index finger tip connected", e.target);

      if (e.target.joints["index-finger-tip"] && !handReady[e.target.uuid]) {
        console.log(
          "found index finger tip",
          e.target.joints["index-finger-tip"],
          e.target.joints["index-finger-tip"].uuid
        );
        setHandReady({
          ...handReady,
          [e.target.uuid]: true,
        });
      }
    },
    [handReady, controllers]
  );

  React.useEffect(() => {
    for (const target of controllers) {
      console.log("index finger tip add listener", target.hand);
      if (target.hand) {
        onConnected({
          target: target.hand,
        });
      }

      target.hand.addEventListener("connected", onConnected);
    }
    return () => {
      for (const target of controllers) {
        target.hand.removeEventListener("connected", onConnected);
      }
    };
  }, [controllers, onConnected]);

  // TODO: hide grab area when hand is not visible

  return (
    <>
      {controllers.map((target, i) => (
        <React.Fragment key={i}>
          {createPortal(
            <oculusHandModel args={[target.hand, modelLeft, modelRight]} />,
            target.hand
          )}
          {createPortal(
            <Visualizer
              target={target}
              hideRaysOnBlur={hideRaysOnBlur}
              rayMaterialProps={rayMaterialProps}
            ></Visualizer>,
            target.controller
          )}

          {handReady[target.hand.uuid] &&
            createPortal(
              <pointLight
                args={[0xffffff, 1, 0.05]}
                ref={(el) => (target.hand.indexFingerTipObj = el)}
              />,
              target.hand.joints["index-finger-tip"]
            )}
        </React.Fragment>
      ))}
    </>
  );
}

const Visualizer = ({
  target,
  hideRaysOnBlur,
  rayMaterialProps,
}: {
  target: XRController;
  hideRaysOnBlur: boolean;
  rayMaterialProps: {};
}) => {
  const isReadyToGrab = useXRHandManager((state) => state.isReadyToGrab);

  function getHandedness() {
    return target.inputSource.handedness;
  }

  // React.useEffect(() => {
  //   console.log(
  //     "isReadyToGrab",
  //     getHandedness(),
  //     isReadyToGrab[getHandedness()]?.name
  //   );
  // }, [isReadyToGrab]);

  return (
    <>
      <Ray
        hideOnBlur={hideRaysOnBlur}
        target={target}
        {...rayMaterialProps}
        // visible={isReadyToGrab[getHandedness()] == undefined}
      />
      <Sphere
        position={[0, 0, 0]}
        scale={0.05}
        ref={(el) => (target.hand.grabArea = el)}
        // visible={isReadyToGrab[getHandedness()] != undefined}
      >
        <meshBasicMaterial
          color="red"
          transparent
          opacity={0.1}
          depthWrite={false}
        />
      </Sphere>
    </>
  );
};
