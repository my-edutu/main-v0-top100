/**
 * Image validation and compression utilities
 */

interface ImageValidationOptions {
  maxSizeInMB?: number;        // Maximum file size in MB
  maxWidth?: number;           // Maximum width in pixels
  maxHeight?: number;          // Maximum height in pixels
  allowedTypes?: string[];     // Allowed MIME types (e.g., ['image/jpeg', 'image/png'])
  minDimension?: number;       // Minimum dimension for either width or height
}

const DEFAULT_OPTIONS: Required<ImageValidationOptions> = {
  maxSizeInMB: 5,                    // 5MB max
  maxWidth: 1920,                    // 1920px max width
  maxHeight: 1080,                   // 1080px max height
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'], // Common image formats
  minDimension: 300,                 // Minimum 300px for either dimension
};

/**
 * Validates an image file based on provided criteria
 */
export async function validateImage(
  file: File,
  options: ImageValidationOptions = {}
): Promise<{ isValid: boolean; errors: string[] }> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const errors: string[] = [];

  // Check file type
  if (!config.allowedTypes.includes(file.type)) {
    errors.push(
      `File type not allowed. Allowed types: ${config.allowedTypes.join(', ')}`
    );
  }

  // Check file size
  const maxSizeInBytes = config.maxSizeInMB * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    errors.push(
      `File size too large. Maximum allowed: ${config.maxSizeInMB}MB. Current: ${(file.size / (1024 * 1024)).toFixed(2)}MB`
    );
  }

  // Check dimensions
  if (file.type.startsWith('image/')) {
    const dimensions = await getImageDimensions(file);
    
    if (dimensions.width > config.maxWidth) {
      errors.push(`Image width too large. Maximum allowed: ${config.maxWidth}px. Current: ${dimensions.width}px`);
    }
    
    if (dimensions.height > config.maxHeight) {
      errors.push(`Image height too large. Maximum allowed: ${config.maxHeight}px. Current: ${dimensions.height}px`);
    }
    
    if (dimensions.width < config.minDimension || dimensions.height < config.minDimension) {
      errors.push(`Image dimensions too small. Minimum required: ${config.minDimension}px for either dimension. Current: ${dimensions.width}x${dimensions.height}px`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Gets the dimensions of an image file
 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(img.src); // Clean up the object URL
      resolve({ width: img.width, height: img.height });
    };
    
    img.onerror = (error) => {
      URL.revokeObjectURL(img.src); // Clean up the object URL
      reject(error);
    };
  });
}

/**
 * Compresses an image file to reduce its size
 */
export async function compressImage(
  file: File,
  options: {
    quality?: number;           // Compression quality (0-1, where 1 is best quality)
    maxWidth?: number;          // Maximum width after compression
    maxHeight?: number;         // Maximum height after compression
    mimeType?: string;          // Output MIME type (defaults to input type)
    cropFromTop?: boolean;      // Whether to crop from top when aspect ratio doesn't match
  } = {}
): Promise<Blob> {
  // Default options
  const quality = options.quality ?? 0.8;
  const maxWidth = options.maxWidth ?? 1920;
  const maxHeight = options.maxHeight ?? 1080;
  const mimeType = options.mimeType ?? file.type;
  const cropFromTop = options.cropFromTop ?? true; // Default to cropping from top

  // If the file is not an image, return as is
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // If the image is already smaller than max dimensions, return as is
  const dimensions = await getImageDimensions(file);

  if (dimensions.width <= maxWidth && dimensions.height <= maxHeight) {
    // If quality is 1 and dimensions already fit, return original
    if (quality >= 1) {
      return file;
    }
  }

  return new Promise((resolve, reject) => {
    // Create canvas only on the client side
    if (typeof document === 'undefined') {
      reject(new Error('Document API not available (likely running on server)'));
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = dimensions;
      const aspectRatio = width / height;
      const targetAspectRatio = maxWidth / maxHeight;

      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = width;
      let sourceHeight = height;
      let targetWidth = maxWidth;
      let targetHeight = maxHeight;

      // Determine how to crop based on aspect ratios
      if (aspectRatio > targetAspectRatio) {
        // Image is wider than target, crop width
        sourceWidth = height * targetAspectRatio;
        if (cropFromTop) {
          sourceX = (width - sourceWidth) / 2; // Center horizontally
        } else {
          // Crop from center
          sourceX = (width - sourceWidth) / 2;
        }
      } else if (aspectRatio < targetAspectRatio) {
        // Image is taller than target, crop height
        sourceHeight = width / targetAspectRatio;
        if (cropFromTop) {
          sourceY = 0; // Start from top
        } else {
          // Crop from center
          sourceY = (height - sourceHeight) / 2;
        }
      } else {
        // Same aspect ratio, no cropping needed
        targetWidth = width > maxWidth ? maxWidth : width;
        targetHeight = height > maxHeight ? maxHeight : height;
      }

      // Adjust target dimensions if the source is smaller than target
      if (sourceWidth < targetWidth) {
        targetWidth = sourceWidth;
      }
      if (sourceHeight < targetHeight) {
        targetHeight = sourceHeight;
      }

      // Set canvas dimensions to target dimensions
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Draw the cropped image on the canvas
      ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight,  // Source rectangle
        0, 0, targetWidth, targetHeight               // Destination rectangle
      );

      // Get the compressed image as a blob
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(img.src); // Clean up the object URL
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Could not create compressed image blob'));
          }
        },
        mimeType,
        quality
      );
    };

    img.onerror = (error) => {
      URL.revokeObjectURL(img.src); // Clean up the object URL
      reject(error);
    };
  });
}

/**
 * Processes an image file by validating and compressing it
 */
export async function processImageForUpload(
  file: File,
  validationOptions: ImageValidationOptions = {},
  compressionOptions: {
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
    cropFromTop?: boolean;
  } = {}
): Promise<{ processedFile: File; validationErrors: string[] }> {
  // First, validate the original file
  const validation = await validateImage(file, validationOptions);

  // If the image passes validation as is, we might still want to compress it
  if (validation.isValid && compressionOptions.quality !== undefined) {
    const compressedBlob = await compressImage(file, compressionOptions);
    const processedFile = new File([compressedBlob], file.name, {
      type: compressedBlob.type,
      lastModified: file.lastModified
    });

    // Re-validate the compressed file to ensure it still meets requirements
    const finalValidation = await validateImage(processedFile, validationOptions);

    return {
      processedFile,
      validationErrors: finalValidation.errors
    };
  }

  // If the original image doesn't validate, try to compress it and re-validate
  if (!validation.isValid) {
    const compressedBlob = await compressImage(file, compressionOptions);
    const processedFile = new File([compressedBlob], file.name, {
      type: compressedBlob.type,
      lastModified: file.lastModified
    });

    const finalValidation = await validateImage(processedFile, validationOptions);

    return {
      processedFile,
      validationErrors: finalValidation.errors
    };
  }

  // If it passed validation but no compression was requested, return as is
  return {
    processedFile: file,
    validationErrors: []
  };
}

/**
 * Specifically processes cover images for blog posts with standard dimensions
 */
export async function processCoverImage(
  file: File,
  options: {
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
    cropFromTop?: boolean;
  } = {}
): Promise<{ processedFile: File; validationErrors: string[] }> {
  // Default options for cover images
  const validationOptions = {
    maxSizeInMB: 5,
    maxWidth: 1920,
    maxHeight: 1080,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    minDimension: 300,
  };

  const compressionOptions = {
    quality: options.quality ?? 0.8,
    maxWidth: options.maxWidth ?? 1920,
    maxHeight: options.maxHeight ?? 1080,
    cropFromTop: options.cropFromTop ?? true,  // Default to cropping from top for cover images
  };

  return processImageForUpload(file, validationOptions, compressionOptions);
}