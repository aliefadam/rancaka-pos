const COMPRESSIBLE_IMAGE_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
]);

export async function optimizeImageFile(
    file,
    { maxWidth = 1920, maxHeight = 1920, quality = 0.78 } = {},
) {
    if (!file || !COMPRESSIBLE_IMAGE_TYPES.has(file.type)) return file;

    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

    try {
        const scale = Math.min(
            1,
            maxWidth / bitmap.width,
            maxHeight / bitmap.height,
        );
        const width = Math.max(1, Math.round(bitmap.width * scale));
        const height = Math.max(1, Math.round(bitmap.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);

        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob(
                (result) =>
                    result
                        ? resolve(result)
                        : reject(new Error('Gambar gagal dikompresi.')),
                'image/webp',
                quality,
            );
        });
        const basename = file.name.replace(/\.[^.]+$/, '') || 'gambar';

        return new File([blob], `${basename}.webp`, {
            type: 'image/webp',
            lastModified: Date.now(),
        });
    } finally {
        bitmap.close();
    }
}
