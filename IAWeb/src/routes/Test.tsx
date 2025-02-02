import { Sky } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { XR, XRButton, XREvent, XRManagerEvent } from "@react-three/xr";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function Test() {
  return (
    <div>
      <XRButton
        mode="VR"
        sessionInit={{
          optionalFeatures: [
            "local-floor",
            "bounded-floor",
            "hand-tracking",
            "layers",
            "hit-test",
            "dom-overlay",
          ],
        }}
      />
      <Canvas
        style={{
          width: "100vw",
          height: "100vh",
        }}
      >
        <XRComponent />
      </Canvas>
    </div>
  );
}

const snellenConfig = {
  // The texture is a power of two so that mipmaps can be generated.
  textureSizePx: 512,
  // This is the valid part of the image.
  widthPx: 320,
  heightPx: 450,

  x: 0,
  y: 1.5,
  z: -6.1, // 20/20 vision @ 20ft = 6.1m

  // This is the size of mesh and the visible part of the quad layer.
  widthMeters: 0.268, // 320px image * (142mm/160px scale factor)
  heightMeters: 0.382, // 450px image * (142mm/160px scale factor)
};

snellenConfig.cropX = snellenConfig.widthPx / snellenConfig.textureSizePx;
snellenConfig.cropY = snellenConfig.heightPx / snellenConfig.textureSizePx;

// The quad layer is a [-1, 1] quad but only a part of it has image data. Scale the layer so
// that the part with image data is the same size as the mesh.
snellenConfig.quadWidth =
  (0.5 * snellenConfig.widthMeters) / snellenConfig.cropX;
snellenConfig.quadHeight =
  (0.5 * snellenConfig.heightMeters) / snellenConfig.cropY;

function XRComponent() {
  let video = useRef<HTMLVideoElement>(null!);
  let { gl } = useThree();
  let snellenTexture = useRef<THREE.Texture>(null!);
  let quadLayerPlainRef = useRef<XRQuadLayer>(null!);

  useEffect(() => {
    let v = document.createElement("video");
    v.src =
      "https://oculus-mp4.s3.amazonaws.com/immersive+video+8K+for+Oculus+Browser/everestvr_4.3k_30s_360_h264_crf23_binaural_CREDIT_JON_GRIFFITH_injected.mp4";
    v.loop = false;
    v.crossOrigin = "anonymous";
    v.preload = "auto";
    v.autoload = true;
    video.current = v;

    let texture = new THREE.TextureLoader().load("/textures/snellen.png");
    texture.repeat.x = snellenConfig.cropX;
    texture.repeat.y = snellenConfig.cropY;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;

    snellenTexture.current = texture;
  }, []);

  function onSessionStart(evt: XREvent<XRManagerEvent>) {}

  useFrame((state, delta, xrFrame) => {
    let session = state.gl.xr.getSession();
    const glBinding = gl.xr.getBinding();
    let ctx = gl.getContext();
    if (!session) return;
    if (session && session.hasMediaLayer === undefined) {
      session.hasMediaLayer = true;
      session.requestReferenceSpace("local-floor").then((refSpace) => {
        const quadLayerConfig = {
          width: snellenConfig.quadWidth,
          height: snellenConfig.quadHeight,
          viewPixelWidth: snellenConfig.textureSizePx,
          viewPixelHeight: snellenConfig.textureSizePx,
          isStatic: true,
          space: refSpace,
          layout: "mono",
          transform: new XRRigidTransform({
            x: snellenConfig.x - snellenConfig.widthMeters,
            y: snellenConfig.y + snellenConfig.heightMeters,
            z: snellenConfig.z,
          }),
        };
        let quadLayerPlain = glBinding.createQuadLayer(quadLayerConfig);

        session.updateRenderState({
          layers: [session.renderState.layers[0], quadLayerPlain],
        });

        quadLayerPlainRef.current = quadLayerPlain;
      });
    }

    if (
      session &&
      quadLayerPlainRef.current &&
      quadLayerPlainRef.current.needsRedraw
    ) {
      const glayer = gl.xr
        .getBinding()
        .getSubImage(quadLayerPlainRef.current, xrFrame);
      gl.state.bindTexture(ctx.TEXTURE_2D, glayer.colorTexture);
      ctx.pixelStorei(ctx.UNPACK_FLIP_Y_WEBGL, true);
      ctx.texSubImage2D(
        ctx.TEXTURE_2D,
        0,
        (snellenConfig.textureSizePx - snellenConfig.widthPx) / 2,
        (snellenConfig.textureSizePx - snellenConfig.heightPx) / 2,
        snellenConfig.widthPx,
        snellenConfig.heightPx,
        ctx.RGBA,
        ctx.UNSIGNED_BYTE,
        snellenTexture.current.image
      );
    }
  });

  return (
    <XR onSessionStart={onSessionStart}>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Sky />
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="hotpink" />
      </mesh>
    </XR>
  );
}
