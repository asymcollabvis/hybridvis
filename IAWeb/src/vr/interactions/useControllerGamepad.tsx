import { useFrame } from "@react-three/fiber";
import { useController } from "@react-three/xr";
import React, { useEffect, useState } from "react";

export function useControllerGamepad(handedness: XRHandedness) {
  const controller = useController(handedness);

  const [xClicked, setXClicked] = React.useState(false);
  const [yClicked, setYClicked] = React.useState(false);

  const prevXPressed = React.useRef(false);
  const prevYPressed = React.useRef(false);

  const [gamepad, setGamepad] = useState<Gamepad | null>(null);

  useEffect(() => {
    if (controller) {
      const _gamepad = controller.inputSource.gamepad;
      if (_gamepad) {
        setGamepad(_gamepad);
      }
    }
  }, [controller]);

  useFrame(() => {
    if (gamepad) {
      const buttons = gamepad.buttons;
      // console.log(buttons[5].pressed);

      if (buttons[4]) {
        if (prevXPressed.current && !buttons[4].pressed) {
          setXClicked(!xClicked);
          // gamepad.dispatchEvent({
          //   type: "buttonxclicked",
          //   target: gamepad,
          //   isClicked: xClicked,
          // });
        }
        prevXPressed.current = buttons[4].pressed;
      }
      if (buttons[5]) {
        if (prevYPressed.current && !buttons[5].pressed) {
          setYClicked(!yClicked);
          // gamepad.dispatchEvent({
          //   type: "buttonyclicked",
          //   target: gamepad,
          //   isClicked: yClicked,
          // });
        }
        prevYPressed.current = buttons[5].pressed;
      }
    }
  });
  return { xClicked, yClicked, gamepad };
}
