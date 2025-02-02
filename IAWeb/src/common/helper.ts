import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  InitialRequest_ClientViewType,
  UserInfo,
  UserInfo_ClientType,
  UserKey,
} from "./message";

export function lookRotation(
  forward: THREE.Vector3,
  up: THREE.Vector3
): THREE.Quaternion {
  let right = new THREE.Vector3().crossVectors(up, forward).normalize();
  up = new THREE.Vector3().crossVectors(forward, right).normalize();

  let m = new THREE.Matrix4();
  m.makeBasis(right, up, forward);
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

export function isPosArrayZero(arr: number[]) {
  return arr[0] == 0 && arr[1] == 0 && arr[2] == 0;
}

export function arrayEquals(a: any[], b: any[]) {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((val, index) => val === b[index])
  );
}

/**
 * Return the camera based on the devices
 * @returns Camera
 */
export function useDeviceCamera() {
  const { camera, gl } = useThree();
  return gl.xr.isPresenting ? gl.xr.getCamera() : camera;
}

export function constructUserKey(
  userId: string,
  roomId: string,
  type = UserInfo_ClientType.DESKTOP,
  viewType = InitialRequest_ClientViewType.VIEW_2D
): UserKey {
  return {
    userId: userId,
    roomId: roomId,
    type: type,
    viewType: viewType,
  };
}

export function constructUserKeyFromUser(
  user: UserInfo,
  userKey: UserKey = {
    userId: "",
    roomId: "",
    type: UserInfo_ClientType.DESKTOP,
    viewType: InitialRequest_ClientViewType.VIEW_2D,
  }
) {
  userKey.userId = user.id;
  userKey.roomId = user.roomId;
  userKey.type = user.type;
  return userKey;
}

const lineCache: { [key: string]: number[] } = {};

export function findClickedWord(id: string, parentElt: Node, x, y, padding = 0) {
  if (parentElt.nodeName !== "#text") {
    // console.log("didn't click on text node");
    return null;
  }
  var range = document.createRange();
  // var words = parentElt.textContent.split(" "); // english
  var words = parentElt.textContent?.split("") ?? []; // chinese or want to select character by character
  var start = 0;
  var end = 0;
  let line = 1;
  if (lineCache[id] === undefined) {
    lineCache[id] = [];
    range.setStart(parentElt, 0);
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      range.setEnd(parentElt, i + 1);
      const rects = range.getClientRects();
      if (rects.length > line) {
        lineCache[id].push(i - 1);
        line++;
      } else if (i === words.length - 1) {
        lineCache[id].push(i);
      }
    }
    console.log("findClickedWord", lineCache[id], words);
  }

  const lineEndIndice = lineCache[id];
  const lineStartIndice = [0, ...lineEndIndice.slice(0, -1).map((i) => i + 1)];
  const firstLine = lineEndIndice[0];
  const lastLine = lineStartIndice[lineStartIndice.length - 1];
  
  for (var i = 0; i < words.length; i++) {
    var word = words[i];
    end = start + word.length;
    range.setStart(parentElt, start);
    range.setEnd(parentElt, end);
    // not getBoundingClientRect as word could wrap
    var rects = range.getClientRects();
    var clickedRect = isClickInRects(rects, {
      top: i < firstLine ? padding : 3,
      bottom: i > lastLine ? padding : 3,
      left: lineStartIndice.includes(i) ? padding : 0,
      right: lineEndIndice.includes(i) ? padding : 0,
    });
    // console.log("findClickedWord", word, i, {
    //   top: i < firstLine ? padding : 3,
    //   bottom: i > lastLine ? padding : 3,
    //   left: lineStartIndice.includes(i) ? padding : 0,
    //   right: lineEndIndice.includes(i) ? padding : 0,
    // });

    if (clickedRect) {
      return [word, i, start, clickedRect];
    }
    // start = end + 1; // space
    start = end; // no space
  }

  function isClickInRects(
    rects: DOMRectList,
    padding: {
      top?: number;
      bottom?: number;
      left?: number;
      right?: number;
    }
  ) {
    for (var i = 0; i < rects.length; ++i) {
      var r = rects[i];
      if (
        r.left - (padding.left ?? 0) < x &&
        r.right + (padding.right ?? 0) > x &&
        r.top - (padding.top ?? 0) < y &&
        r.bottom + (padding.bottom ?? 0) > y
      ) {
        return r;
      }
    }
    return false;
  }
  return null;
}
