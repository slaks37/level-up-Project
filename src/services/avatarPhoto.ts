const VISION_FILES = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm';
const POSE_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const MAX_PHOTO_BYTES = 20 * 1024 * 1024;
const MAX_PHOTO_EDGE = 960;
const FULL_BODY_POINTS = [0, 11, 12, 15, 16, 23, 24, 27, 28, 31, 32];

export type AvatarPhotoIssue = 'size' | 'format' | 'fullBody' | 'multiple' | 'processing';

export class AvatarPhotoError extends Error {
  constructor(readonly issue: AvatarPhotoIssue) {
    super(issue);
  }
}

export async function decodeAvatarImage(photo: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(photo);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function createAvatarPhoto(file: File): Promise<Blob> {
  if (file.size > MAX_PHOTO_BYTES) throw new AvatarPhotoError('size');
  if (file.type && !/^image\/(jpeg|png|webp|avif|hei[cf](?:-sequence)?)$/i.test(file.type)) {
    throw new AvatarPhotoError('format');
  }

  const image = await decodeAvatarImage(file).catch(() => {
    throw new AvatarPhotoError('format');
  });
  const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  const photo = document.createElement('canvas');
  const width = photo.width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = photo.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = photo.getContext('2d', { willReadFrequently: true });
  if (!context) throw new AvatarPhotoError('processing');
  context.drawImage(image, 0, 0, width, height);

  // Only the vision runtime and model are fetched. The input stays in the browser.
  const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
  const vision = await FilesetResolver.forVisionTasks(VISION_FILES);
  const engine = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: POSE_MODEL, delegate: 'CPU' },
    runningMode: 'IMAGE',
    numPoses: 2,
    outputSegmentationMasks: true,
  });

  try {
    const result = engine.detect(photo);
    try {
      if (result.landmarks.length > 1) throw new AvatarPhotoError('multiple');
      const pose = result.landmarks[0];
      const mask = result.segmentationMasks?.[0];
      const fullBody = pose && FULL_BODY_POINTS.every((index) => {
        const point = pose[index];
        return point && point.visibility >= 0.45 &&
          point.x > 0.005 && point.x < 0.995 && point.y > 0.005 && point.y < 0.995;
      });
      if (!mask || !fullBody) throw new AvatarPhotoError('fullBody');

      const pixels = context.getImageData(0, 0, width, height);
      const confidence = mask.getAsFloat32Array();
      let left = width, right = -1, top = height, bottom = -1;
      for (let y = 0; y < height; y++) {
        const maskRow = Math.floor(y * mask.height / height) * mask.width;
        for (let x = 0; x < width; x++) {
          const opacity = confidence[maskRow + Math.floor(x * mask.width / width)] ?? 0;
          pixels.data[(y * width + x) * 4 + 3] = 255 * Math.max(0, Math.min(1, (opacity - 0.45) / 0.35));
          if (opacity < 0.7) continue;
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
      }
      if (right - left < 30 || bottom - top < 80 || top < 2 || bottom > height - 3) {
        throw new AvatarPhotoError('fullBody');
      }
      context.putImageData(pixels, 0, 0);

      const cropped = document.createElement('canvas');
      const margin = 2;
      const cropWidth = right - left + 1 + margin * 2;
      const cropHeight = bottom - top + 1 + margin * 2;
      const cropScale = Math.min(1, 512 / Math.max(cropWidth, cropHeight));
      cropped.width = Math.round(cropWidth * cropScale);
      cropped.height = Math.round(cropHeight * cropScale);
      const cropContext = cropped.getContext('2d');
      if (!cropContext) throw new AvatarPhotoError('processing');
      cropContext.drawImage(photo, left - margin, top - margin, cropWidth, cropHeight, 0, 0, cropped.width, cropped.height);
      return await new Promise<Blob>((resolve, reject) => {
        cropped.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new AvatarPhotoError('processing'));
        }, 'image/png');
      });
    } finally {
      result.close();
    }
  } finally {
    engine.close();
  }
}
