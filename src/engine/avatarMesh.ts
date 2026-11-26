import * as THREE from 'three';

const HEIGHT = 2.45;
const RESOLUTION = 168;

export function createAvatarMesh(image: HTMLImageElement) {
  const height = RESOLUTION;
  const width = Math.max(8, Math.round(height * image.naturalWidth / image.naturalHeight));
  const map = document.createElement('canvas');
  map.width = width;
  map.height = height;
  const context = map.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas unavailable');
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;

  // Distance to the silhouette edge gives wide body areas more depth than limbs.
  const stride = width + 2;
  const distances = new Float32Array(stride * (height + 2));
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (pixels[(row * width + col) * 4 + 3] > 124) {
        distances[(row + 1) * stride + col + 1] = Infinity;
      }
    }
  }
  const diagonal = Math.SQRT2;
  for (let row = 1; row <= height; row++) {
    for (let col = 1; col <= width; col++) {
      const k = row * stride + col;
      distances[k] = Math.min(distances[k], distances[k - 1] + 1, distances[k - stride] + 1,
        distances[k - stride - 1] + diagonal, distances[k - stride + 1] + diagonal);
    }
  }
  for (let row = height; row >= 1; row--) {
    for (let col = width; col >= 1; col--) {
      const k = row * stride + col;
      distances[k] = Math.min(distances[k], distances[k + 1] + 1, distances[k + stride] + 1,
        distances[k + stride - 1] + diagonal, distances[k + stride + 1] + diagonal);
    }
  }

  const vertexStride = width + 1;
  const sheetSize = vertexStride * (height + 1);
  const positions = new Float32Array(sheetSize * 2 * 3);
  const uvs = new Float32Array(sheetSize * 2 * 2);
  const colors = new Float32Array(sheetSize * 2 * 3);
  const pixelSize = HEIGHT / height;
  const edgeColor = new THREE.Color();

  for (let row = 0; row <= height; row++) {
    for (let col = 0; col <= width; col++) {
      const vertex = row * vertexStride + col;
      const k = row * stride + col;
      const distance = (distances[k] + distances[k + 1] + distances[k + stride] + distances[k + stride + 1]) / 4;
      const depth = Math.min(0.28, 0.008 + distance * pixelSize * 0.78);

      // Sample a local palette across several columns to avoid copying facial detail to the back.
      const sampleY = Math.min(height - 1, row);
      let red = 0, green = 0, blue = 0, samples = 0;
      for (let sampleX = Math.max(0, col - 12); sampleX <= Math.min(width - 1, col + 12); sampleX += 2) {
        const offset = (sampleY * width + sampleX) * 4;
        if (pixels[offset + 3] <= 124) continue;
        red += pixels[offset];
        green += pixels[offset + 1];
        blue += pixels[offset + 2];
        samples++;
      }
      if (samples) {
        edgeColor.setRGB(red / (255 * samples), green / (255 * samples), blue / (255 * samples), THREE.SRGBColorSpace);
      } else {
        edgeColor.setHex(0x60758f);
      }

      for (const index of [vertex, vertex + sheetSize]) {
        const z = index === vertex ? depth : -depth * 0.84;
        positions.set([(col - width / 2) * pixelSize, HEIGHT - row * pixelSize, z], index * 3);
        uvs.set([col / width, 1 - row / height], index * 2);
        colors.set([edgeColor.r, edgeColor.g, edgeColor.b], index * 3);
      }
    }
  }

  const front: number[] = [];
  const shell: number[] = [];
  const isFilled = (col: number, row: number) => distances[(row + 1) * stride + col + 1] > 0;
  const addSide = (a: number, b: number) => {
    shell.push(a, b, a + sheetSize, b, b + sheetSize, a + sheetSize);
  };
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (!isFilled(col, row)) continue;
      const tl = row * vertexStride + col;
      const tr = tl + 1;
      const bl = tl + vertexStride;
      const br = bl + 1;
      front.push(tl, bl, tr, tr, bl, br);
      shell.push(tl + sheetSize, tr + sheetSize, bl + sheetSize, tr + sheetSize, br + sheetSize, bl + sheetSize);
      if (!isFilled(col - 1, row)) addSide(bl, tl);
      if (!isFilled(col + 1, row)) addSide(tr, br);
      if (!isFilled(col, row - 1)) addSide(tl, tr);
      if (!isFilled(col, row + 1)) addSide(br, bl);
    }
  }
  if (!front.length) throw new Error('Empty avatar silhouette');

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(front.concat(shell));
  geometry.addGroup(0, front.length, 0);
  geometry.addGroup(front.length, shell.length, 1);
  geometry.computeVertexNormals();

  const texture = new THREE.Texture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  const portrait = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.84, alphaTest: 0.18 });
  const inferred = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.84 });
  const solid = new THREE.MeshStandardMaterial({ color: 0x47829b, roughness: 0.76 });
  const mesh = new THREE.Mesh(geometry, [portrait, inferred]);

  return {
    mesh,
    setSolid(enabled: boolean) {
      mesh.material = enabled ? [solid, solid] : [portrait, inferred];
    },
    dispose() {
      geometry.dispose();
      texture.dispose();
      portrait.dispose();
      inferred.dispose();
      solid.dispose();
    },
  };
}
