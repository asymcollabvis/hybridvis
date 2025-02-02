import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Handy } from "handy.js";

export default function useHandy() {
  const { gl, camera } = useThree();
  const handLeft = useRef<any>(null);
  const handRight = useRef<any>(null);

  const initialized = useRef(false);

  const isGrabbing = useRef({
    left: false,
    right: false,
  });

  useEffect(() => {
    //  Use Three.js to hookup hand inputs:

    let hand0 = gl.xr.getHand(0);
    let hand1 = gl.xr.getHand(1);

    //  Now use Handy to “Handify” them:

    Handy.makeHandy(hand0);
    Handy.makeHandy(hand1);

    // HACK: need to add the camera in order for Handy to work
    hand0.camera = gl.xr.getCamera();
    hand1.camera = gl.xr.getCamera();

    console.log("hand0", hand0);
  }, [gl, camera]);

  useFrame(() => {
    Handy.update();
    handLeft.current = Handy.hands.getLeft();
    handRight.current = Handy.hands.getRight();

    if (!handLeft.current) return;

    if (!initialized.current) {
      // initalize

      [handLeft.current, handRight.current].forEach((hand) => {
        hand.addEventListener("pose changed", function (event) {
          // console.log("pose", event.resultIs.pose.names, event.message);
          if (
            (event.resultIs.pose.names.includes("asl a") ||
              event.resultIs.pose.names.includes("fist") ||
              event.resultIs.pose.names.includes("grap")) &&
            !isGrabbing.current[hand.handedness]
          ) {
            // begin grabbing
            hand.dispatchEvent({
              type: "handgrab",
              target: hand,
            });
            isGrabbing.current[hand.handedness] = true;
          }
          // console.log("isGrabbing.current", isGrabbing.current);

          if (
            (event.resultIs.pose.names.includes("flat") ||
              event.resultIs.pose.names.includes("rest") ||
              event.resultIs.pose.names.includes("flare") ||
              event.resultIs.pose.names.includes("crook only thumb") ||
              event.resultIs.pose.names.includes("vulcan inverse") ||
              event.resultIs.pose.names.includes("asl 5")) &&
            isGrabbing.current[hand.handedness]
          ) {
            // end grabbing
            hand.dispatchEvent({
              type: "handrelease",
              target: hand,
            });
            isGrabbing.current[hand.handedness] = false;
          }
        });
        initialized.current = true;
      });
    }
  });
}
