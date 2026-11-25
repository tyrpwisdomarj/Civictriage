export interface PreparedImagePayload {
  base64: string;
  mimeType: string;
  previewUrl: string;
  fileName: string;
  sizeBytes: number;
}

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB

export async function fileToImagePayload(file: File): Promise<PreparedImagePayload> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please upload an image file (JPEG, PNG, or WebP).');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('Image exceeds the 8 MB upload limit. Please select a smaller photograph.');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read the selected image file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read image file from disk.'));
    reader.readAsDataURL(file);
  });

  const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
  return {
    base64,
    mimeType: file.type || 'image/jpeg',
    previewUrl: dataUrl,
    fileName: file.name,
    sizeBytes: file.size,
  };
}

export async function urlToImagePayload(
  imageUrl: string,
  fileName: string
): Promise<PreparedImagePayload> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Unable to load sample image (${response.status}).`);
  }
  const blob = await response.blob();
  const mimeType = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not encode sample photograph.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to encode sample photograph.'));
    reader.readAsDataURL(blob);
  });

  return {
    base64: dataUrl.replace(/^data:[^;]+;base64,/, ''),
    mimeType,
    previewUrl: imageUrl,
    fileName,
    sizeBytes: blob.size,
  };
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
