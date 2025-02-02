import { Box, Text, Sphere } from "@react-three/drei";
import { Interactive } from "@react-three/xr";
import React, { forwardRef } from "react";
import { updateTargetNode, updateTargetLink } from "../../common/graph";
import { Link, Node } from "../../common/message";
import store from "../../store";
import useSystemKeyboard from "../../vr/useSystemKeyboard";
import LinkText from "../../vr/UI/Text";
import { GLink } from "./graphSlice";
import * as THREE from "three";

// Current limitation: Each time the keyboard is shown represents a new underlying editing session. Any key press first overwrites the entire existing value in the text element.
// More detials see: https://developer.oculus.com/documentation/web/webxr-keyboard/
export default forwardRef<
  THREE.Group,
  {
    showedText: string;
    node?: Node;
    link?: GLink;
  }
>(({ showedText, node = undefined, link = undefined }, ref) => {
  const { myTextField } = useSystemKeyboard();
  const [text, setText] = React.useState("");
  const getOffset = () => {
    if (node) {
      const data = node.data;
      let size = 5;
      if (data === "document") {
        return size * 1.5 + 1;
      } else {
        return size + 0.05;
      }
    }
    return 0;
  };
  return (
    <group ref={ref}>
      {node && (
        <Text
          font="/NotoSansSC-Regular.woff"
          overflowWrap="break-word" // added for chinese characters
          color="black"
          position={[getOffset(), 0, 0]}
          scale={10}
          anchorX={"left"}
          anchorY={"middle"}
          maxWidth={12}
        >
          {text != "" ? text : showedText}
        </Text>
      )}
      {link && (
        <LinkText maxWidth={12} backgroundColor={"white"} scale={10}>
          {text != "" ? text : showedText}
        </LinkText>
      )}
      <Interactive
        onSelect={() => {
          myTextField.focus();
          myTextField.oninput = (e) => {
            setText(myTextField.value);
          };
        }}
      >
        <Box
          scale={5}
          position={[13 * 10, 0, 0]}
          visible={node?.data != "document"}
        >
          <meshBasicMaterial attach="material" color="purple" />
        </Box>
      </Interactive>

      <Interactive
        onSelect={() => {
          let _user = store.getState().user.userInfo;
          if (!_user) return;

          if (node) {
            updateTargetNode(_user, node, text);
          } else if (link) {
            updateTargetLink(_user, link, text);
          }
          setText("");
        }}
      >
        <Sphere scale={5} position={[15 * 10, 0, 0]} visible={text != ""}>
          <meshBasicMaterial attach="material" color="green" />
        </Sphere>
      </Interactive>

      <Interactive
        onSelect={() => {
          setText("");
        }}
      >
        <Sphere scale={5} position={[17 * 10, 0, 0]} visible={text != ""}>
          <meshBasicMaterial attach="material" color="red" />
        </Sphere>
      </Interactive>
    </group>
  );
});
