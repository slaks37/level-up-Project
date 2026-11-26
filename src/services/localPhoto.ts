export async function imageForLocalJournal(file: File): Promise<Blob> {
  if (file.size > 20 * 1024 * 1024 || (file.type && !/^image\/(jpeg|png|webp|avif|hei[cf])$/i.test(file.type))) {
    throw new Error('Photo format');
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const factor = Math.min(1, 900 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * factor));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * factor));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Photo canvas');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Photo encoding')), 'image/jpeg', 0.88));
  } finally {
    URL.revokeObjectURL(url);
  }
}
