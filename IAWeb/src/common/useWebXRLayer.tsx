import { useFrame } from "@react-three/fiber";
import { random } from "lodash";
import { useRef } from "react";
import { useDocumentLayersStore } from "../stores/documentLayersStore";

const snellenConfig = {
  // The texture is a power of two so that mipmaps can be generated.
  textureSizePx: 512,
  // This is the valid part of the image.
  widthPx: 320,
  heightPx: 450,

  x: 0,
  y: 1.5,
  z: -1.1, // 20/20 vision @ 20ft = 6.1m

  // This is the size of mesh and the visible part of the quad layer.
  widthMeters: 1, // 320px image * (142mm/160px scale factor)
  heightMeters: 1, // 450px image * (142mm/160px scale factor)
};

snellenConfig.cropX = snellenConfig.widthPx / snellenConfig.textureSizePx;
snellenConfig.cropY = snellenConfig.heightPx / snellenConfig.textureSizePx;

// The quad layer is a [-1, 1] quad but only a part of it has image data. Scale the layer so
// that the part with image data is the same size as the mesh.
snellenConfig.quadWidth =
  (0.5 * snellenConfig.widthMeters) / snellenConfig.cropX;
snellenConfig.quadHeight =
  (0.5 * snellenConfig.heightMeters) / snellenConfig.cropY;

export function useWebXRLayer() {
  const { layers, setLayers } = useDocumentLayersStore();

  useFrame(({ gl }, delta, xrFrame) => {
    let session = gl.xr.getSession();

    const glBinding = gl.xr.getBinding();
    let ctx = gl.getContext();
    if (!session) return;
    if (
      session &&
      session.hasMediaLayer === undefined
      //    &&
      //   video.readyState >= 2
    ) {
      session.hasMediaLayer = true;
      session.requestReferenceSpace("local-floor").then((refSpace) => {
        let quadLayers = layers.map((layer) => {
          let l: XRQuadLayer | XRCylinderLayer = null!;
          if (layer.video) {
            // media layer
            const mediaBinding = new XRMediaBinding(session);
            l = mediaBinding.createQuadLayer(layer.video, {
              ...(layer.config as XRQuadLayerInit),
              space: refSpace,
              transform: new XRRigidTransform(
                {
                  x: layer.position.x,
                  y: layer.position.y,
                  z: layer.position.z,
                },
                {
                  x: layer.rotation.x,
                  y: layer.rotation.y,
                  z: layer.rotation.z,
                  w: layer.rotation.w,
                }
              ),
            });
            layer.video.play();
          } else {
            // gl layer
            if (layer.layerType == "cylinder") {
              l = glBinding.createCylinderLayer({
                ...(layer.config as XRCylinderLayerInit),
                space: refSpace,
                transform: new XRRigidTransform(
                  {
                    x: layer.position.x,
                    y: layer.position.y,
                    z: layer.position.z,
                  },
                  {
                    x: layer.rotation.x,
                    y: layer.rotation.y,
                    z: layer.rotation.z,
                    w: layer.rotation.w,
                  }
                ),
              });
            } else if (layer.layerType == "quad") {
              l = glBinding.createQuadLayer({
                ...(layer.config as XRQuadLayerInit),
                space: refSpace,
                transform: new XRRigidTransform(
                  {
                    x: layer.position.x,
                    y: layer.position.y,
                    z: layer.position.z,
                  },
                  {
                    x: layer.rotation.x,
                    y: layer.rotation.y,
                    z: layer.rotation.z,
                    w: layer.rotation.w,
                  }
                ),
              });
            }
          }

          layer.layer = l;
          return l;
        });

        session.updateRenderState({
          layers: [...quadLayers, session.renderState.layers[0]],
        });

        // console.log("quadLayers", quadLayers);

        layers.forEach((layer, i) => (layer.layer = quadLayers[i]));
        setLayers(layers);
      });
    }

    if (session) {
      layers.forEach((layer, i) => {
        // console.log("layer", layer.layer?.needsRedraw);

        if (
          layer.layer &&
          (layer.layer.needsRedraw ||
            (layer.mesh && layer.mesh.material.map.requiresXRLayerUpdate))
        ) {
          const glayer = gl.xr.getBinding().getSubImage(layer.layer, xrFrame);
          ctx.bindTexture(ctx.TEXTURE_2D, glayer.colorTexture);
          ctx.pixelStorei(ctx.UNPACK_FLIP_Y_WEBGL, true);

          if (layer.mesh) {
            let canvas = layer.mesh.material.map.image;
            ctx.texSubImage2D(
              ctx.TEXTURE_2D,
              0,
              0,
              0,
              canvas.width,
              canvas.height,
              ctx.RGBA,
              ctx.UNSIGNED_BYTE,
              canvas
            );
            layer.mesh.material.map.requiresXRLayerUpdate = false;
          } else if (layer.renderTarget) {
            const buffer = new Uint8Array(
              layer.renderTarget.width * layer.renderTarget.height * 4
            );
            gl.readRenderTargetPixels(
              layer.renderTarget,
              0,
              0,
              layer.renderTarget.width,
              layer.renderTarget.height,
              buffer
            );
            //   console.log("buffer", buffer);

            //   console.log(
            //     "reading pixels",
            //     layer.renderTarget.width,
            //     layer.renderTarget.height
            //     // layer.renderTarget.texture.image,
            //     // layer.texture.image
            //   );

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
          } else if (layer.texture) {
            ctx.texSubImage2D(
              ctx.TEXTURE_2D,
              0,
              (snellenConfig.textureSizePx - snellenConfig.widthPx) / 2,
              (snellenConfig.textureSizePx - snellenConfig.heightPx) / 2,
              snellenConfig.widthPx,
              snellenConfig.heightPx,
              ctx.RGBA,
              ctx.UNSIGNED_BYTE,
              layer.texture.image
            );
          }
          //   ctx.generateMipmap( ctx.TEXTURE_2D );
          //   console.log("tex image", buffer);

          //   ctx.bindTexture(ctx.TEXTURE_2D, null);
        }
      });
    }
  });
}
