import { Box, OrthographicCamera, Text } from "@react-three/drei";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useWebXRLayer } from "../../common/useWebXRLayer";
import { useDocumentLayersStore } from "../../../stores/documentLayersStore";
import { random } from "lodash";
import { DocInfo } from "../../features/document/documentSlice";

const debug = true;

export function DocumentLayer({
  position,
  rotation,
  document,
}: {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  document: string;
}) {
  const { addLayer, cam } = useDocumentLayersStore();

  const [scene, target] = useMemo(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("red");
    const target = new THREE.WebGLRenderTarget(512, 512, {
      stencilBuffer: false,
    });
    // target.texture.generateMipmaps = false;
    // target.samples = 8;

    // add a box
    // const geometry = new THREE.BoxGeometry(1, 1, 1);
    // const material = new THREE.MeshBasicMaterial({ color: "red" });
    // const cube = new THREE.Mesh(geometry, material);
    // cube.position.set(0, 0, 0);
    // cube.scale.set(10, 10, 0.1);
    // scene.add(cube);

    // add abmient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    // console.log("adding layer", target);

    // // add a light
    // const light = new THREE.PointLight(0xffffff, 1, 100);
    // light.position.set(0, 0, 0);
    // scene.add(light);

    addLayer({
      //   texture: target.texture,
      layerType: "quad",
      renderTarget: target,
      position: position,
      rotation: rotation,
    });
    return [scene, target];
  }, []);

  let texture = useMemo(() => {
    let texture = new THREE.TextureLoader().load("/textures/snellen.png");
    // texture.repeat.x = snellenConfig.cropX;
    // texture.repeat.y = snellenConfig.cropY;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;

    addLayer({
      layerType: "quad",
      texture: texture,
      position: position,
      rotation: rotation,
    });
    return texture;
  }, []);

  const { gl, camera } = useThree();
  const dataRef = useRef(new Uint8Array(512 * 512 * 4));
  const glTexture = useMemo(() => {
    if (!gl) return;

    const texture = new THREE.DataTexture(dataRef.current, 512, 512);
    texture.flipY = true;
    texture.needsUpdate = true;
    // texture.generateMipmaps = false;
    // texture.minFilter = THREE.LinearFilter;
    // texture.magFilter = THREE.LinearFilter;
    // texture.wrapS = THREE.ClampToEdgeWrapping;
    // texture.wrapT = THREE.ClampToEdgeWrapping;

    return texture;
  }, [gl]);

  const [fb, glTex] = useMemo(() => {
    if (!gl) return;
    const ctx = gl.getContext();
    const fb = ctx.createFramebuffer();
    const glTex = ctx.createTexture();
    return [fb, glTex];
  }, [gl]);

  useFrame(({ gl }) => {
    if (!cam) return;
    // console.log("rendering", cam.position, gl.xr.getCamera(), camera);
    if (gl.xr.isPresenting) return;

    gl.xr.enabled = false;
    // cam.position.set(0, 0, 10);
    let oldRenderTarget = gl.getRenderTarget();
    gl.setRenderTarget(target);
    gl.render(scene, cam);
    gl.setRenderTarget(oldRenderTarget);
    gl.xr.enabled = true;
    // console.log(cam, scene);

    // create a gl texture and load the render target's image into it

    //#region debug
    if (debug) {
      const ctx = gl.getContext();

      const buffer = new Uint8Array(target.width * target.height * 4);
      // console.log(
      //   "reading pixels",
      //   target.width,
      //   target.height,
      //   target.texture.image,
      //   texture.image
      // );

      gl.readRenderTargetPixels(
        target,
        0,
        0,
        target.width,
        target.height,
        buffer
      );

      // console.log(glTex);
      // Create a framebuffer backed by the texture
      if (
        fb &&
        ctx.checkFramebufferStatus(ctx.FRAMEBUFFER) == ctx.FRAMEBUFFER_COMPLETE
      ) {
        ctx.bindFramebuffer(ctx.FRAMEBUFFER, fb);
        ctx.bindTexture(ctx.TEXTURE_2D, glTex);
        ctx.pixelStorei(ctx.UNPACK_FLIP_Y_WEBGL, true);
        ctx.texImage2D(
          ctx.TEXTURE_2D,
          0,
          ctx.RGBA,
          512,
          512,
          0,
          ctx.RGBA,
          ctx.UNSIGNED_BYTE,
          buffer
        );
        // console.log(buffer);

        ctx.framebufferTexture2D(
          ctx.FRAMEBUFFER,
          ctx.COLOR_ATTACHMENT0,
          ctx.TEXTURE_2D,
          glTex,
          0
        );

        ctx.readPixels(
          0,
          0,
          512,
          512,
          ctx.RGBA,
          ctx.UNSIGNED_BYTE,
          dataRef.current
        );
        //   console.log(dataRef.current);
        ctx.bindFramebuffer(ctx.FRAMEBUFFER, null);
        ctx.bindTexture(ctx.TEXTURE_2D, null);
      }
    }
    //#endregion
  });

  return (
    <>
      {/* <OrthographicCamera ref={cam} position={[0, 0, 0]} /> */}
      {createPortal(
        <group>
          <Text
            position={[0, 0, 0]}
            fontSize={1.5}
            color="black"
            anchorX="left"
            anchorY="top"
            maxWidth={70 - 0.8 * 2}
          >
            {document}
          </Text>
        </group>,
        scene
      )}
      {/* <mesh position={[0,0,0]}>
        <planeGeometry attach="geometry" args={[1, 1]} />
        <meshStandardMaterial attach="material" map={glTexture} />
      </mesh> */}
    </>
  );
}
