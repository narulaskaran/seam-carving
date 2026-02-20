// Seam carving algorithm ported from ImageResizer.java
// Operates on raw Uint8ClampedArray pixel data (4 bytes per pixel: R, G, B, A)

function pixelEnergy(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  row: number,
  col: number
): number {
  // Vertical gradient (energyX)
  let r1: number, g1: number, b1: number, r2: number, g2: number, b2: number;
  let idx: number;

  if (row === 0) {
    idx = (row * width + col) * 4;
    r1 = data[idx]; g1 = data[idx + 1]; b1 = data[idx + 2];
    idx = ((row + 1) * width + col) * 4;
    r2 = data[idx]; g2 = data[idx + 1]; b2 = data[idx + 2];
  } else if (row === height - 1) {
    idx = (row * width + col) * 4;
    r1 = data[idx]; g1 = data[idx + 1]; b1 = data[idx + 2];
    idx = ((row - 1) * width + col) * 4;
    r2 = data[idx]; g2 = data[idx + 1]; b2 = data[idx + 2];
  } else {
    idx = ((row - 1) * width + col) * 4;
    r1 = data[idx]; g1 = data[idx + 1]; b1 = data[idx + 2];
    idx = ((row + 1) * width + col) * 4;
    r2 = data[idx]; g2 = data[idx + 1]; b2 = data[idx + 2];
  }
  const energyX = (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2;

  // Horizontal gradient (energyY)
  if (col === 0) {
    idx = (row * width + col) * 4;
    r1 = data[idx]; g1 = data[idx + 1]; b1 = data[idx + 2];
    idx = (row * width + col + 1) * 4;
    r2 = data[idx]; g2 = data[idx + 1]; b2 = data[idx + 2];
  } else if (col === width - 1) {
    idx = (row * width + col) * 4;
    r1 = data[idx]; g1 = data[idx + 1]; b1 = data[idx + 2];
    idx = (row * width + col - 1) * 4;
    r2 = data[idx]; g2 = data[idx + 1]; b2 = data[idx + 2];
  } else {
    idx = (row * width + col - 1) * 4;
    r1 = data[idx]; g1 = data[idx + 1]; b1 = data[idx + 2];
    idx = (row * width + col + 1) * 4;
    r2 = data[idx]; g2 = data[idx + 1]; b2 = data[idx + 2];
  }
  const energyY = (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2;

  return energyX + energyY;
}

function mindex(arr: Float64Array, length: number): number {
  let min = arr[0];
  let minIdx = 0;
  for (let i = 1; i < length; i++) {
    if (arr[i] < min) {
      min = arr[i];
      minIdx = i;
    }
  }
  return minIdx;
}

export function calcEnergy(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Float64Array {
  const energy = new Float64Array(height * width);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      energy[row * width + col] = pixelEnergy(data, width, height, row, col);
    }
  }
  return energy;
}

export function carveVerticalSeam(
  data: Uint8ClampedArray,
  width: number,
  height: number
): { data: Uint8ClampedArray; width: number } {
  const energy = new Float64Array(height * width);
  const ptr = new Int32Array(height * width);

  // Calculate initial energy levels
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      energy[row * width + col] = pixelEnergy(data, width, height, row, col);
    }
  }

  // Dynamic programming: accumulate minimum energy paths top-to-bottom
  for (let row = 1; row < height; row++) {
    for (let col = 0; col < width; col++) {
      let min = energy[(row - 1) * width + col];
      let parent = col;
      if (col - 1 >= 0 && energy[(row - 1) * width + col - 1] < min) {
        min = energy[(row - 1) * width + col - 1];
        parent = col - 1;
      }
      if (col + 1 < width && energy[(row - 1) * width + col + 1] < min) {
        min = energy[(row - 1) * width + col + 1];
        parent = col + 1;
      }
      energy[row * width + col] += min;
      ptr[row * width + col] = parent;
    }
  }

  // Find minimum energy pixel in bottom row
  const newWidth = width - 1;
  const lastRowOffset = (height - 1) * width;
  const lastRow = new Float64Array(energy.buffer, lastRowOffset * 8, width);
  let tail = mindex(lastRow, width);

  // Build output image, skipping the seam pixel in each row
  const output = new Uint8ClampedArray(newWidth * height * 4);
  for (let row = height - 1; row >= 0; row--) {
    let imagePtr = 0;
    for (let col = 0; col < newWidth; col++) {
      if (imagePtr === tail) imagePtr++;
      const srcIdx = (row * width + imagePtr) * 4;
      const dstIdx = (row * newWidth + col) * 4;
      output[dstIdx] = data[srcIdx];
      output[dstIdx + 1] = data[srcIdx + 1];
      output[dstIdx + 2] = data[srcIdx + 2];
      output[dstIdx + 3] = data[srcIdx + 3];
      imagePtr++;
    }
    tail = ptr[row * width + tail];
  }

  return { data: output, width: newWidth };
}

export function carveHorizontalSeam(
  data: Uint8ClampedArray,
  width: number,
  height: number
): { data: Uint8ClampedArray; height: number } {
  const energy = new Float64Array(height * width);
  const ptr = new Int32Array(height * width);

  // Calculate initial energy levels
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      energy[row * width + col] = pixelEnergy(data, width, height, row, col);
    }
  }

  // Dynamic programming: accumulate minimum energy paths left-to-right
  for (let col = 1; col < width; col++) {
    for (let row = 0; row < height; row++) {
      let min = energy[row * width + col - 1];
      let parent = row;
      if (row - 1 >= 0 && energy[(row - 1) * width + col - 1] < min) {
        min = energy[(row - 1) * width + col - 1];
        parent = row - 1;
      }
      if (row + 1 < height && energy[(row + 1) * width + col - 1] < min) {
        min = energy[(row + 1) * width + col - 1];
        parent = row + 1;
      }
      energy[row * width + col] += min;
      ptr[row * width + col] = parent;
    }
  }

  // Find minimum energy pixel in rightmost column
  const newHeight = height - 1;
  const lastCol = width - 1;
  const endCol = new Float64Array(height);
  for (let r = 0; r < height; r++) {
    endCol[r] = energy[r * width + lastCol];
  }
  let tail = mindex(endCol, height);

  // Build output image, skipping the seam pixel in each column
  const output = new Uint8ClampedArray(width * newHeight * 4);
  for (let col = lastCol; col >= 0; col--) {
    let imagePtr = 0;
    for (let r = 0; r < newHeight; r++) {
      if (imagePtr === tail) imagePtr++;
      const srcIdx = (imagePtr * width + col) * 4;
      const dstIdx = (r * width + col) * 4;
      output[dstIdx] = data[srcIdx];
      output[dstIdx + 1] = data[srcIdx + 1];
      output[dstIdx + 2] = data[srcIdx + 2];
      output[dstIdx + 3] = data[srcIdx + 3];
      imagePtr++;
    }
    tail = ptr[tail * width + col];
  }

  return { data: output, height: newHeight };
}

export function resize(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  targetWidth: number,
  targetHeight: number,
  onProgress?: (current: {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    seamsRemoved: number;
    totalSeams: number;
  }) => boolean
): { data: Uint8ClampedArray; width: number; height: number } {
  let currentData = data;
  let currentWidth = width;
  let currentHeight = height;

  let vertSeams = width - targetWidth;
  let horSeams = height - targetHeight;
  const totalSeams = vertSeams + horSeams;
  let seamsRemoved = 0;

  // Alternate between vertical and horizontal seams (matching Java behavior)
  while (vertSeams > 0 && horSeams > 0) {
    const vResult = carveVerticalSeam(currentData, currentWidth, currentHeight);
    currentData = vResult.data;
    currentWidth = vResult.width;
    vertSeams--;
    seamsRemoved++;

    if (onProgress) {
      const cont = onProgress({
        data: currentData,
        width: currentWidth,
        height: currentHeight,
        seamsRemoved,
        totalSeams,
      });
      if (cont === false) return { data: currentData, width: currentWidth, height: currentHeight };
    }

    const hResult = carveHorizontalSeam(currentData, currentWidth, currentHeight);
    currentData = hResult.data;
    currentHeight = hResult.height;
    horSeams--;
    seamsRemoved++;

    if (onProgress) {
      const cont = onProgress({
        data: currentData,
        width: currentWidth,
        height: currentHeight,
        seamsRemoved,
        totalSeams,
      });
      if (cont === false) return { data: currentData, width: currentWidth, height: currentHeight };
    }
  }

  // Remove remaining seams in whichever direction is left
  const remainingVertical = vertSeams > 0;
  const remaining = Math.max(vertSeams, horSeams);
  for (let i = 0; i < remaining; i++) {
    if (remainingVertical) {
      const result = carveVerticalSeam(currentData, currentWidth, currentHeight);
      currentData = result.data;
      currentWidth = result.width;
    } else {
      const result = carveHorizontalSeam(currentData, currentWidth, currentHeight);
      currentData = result.data;
      currentHeight = result.height;
    }
    seamsRemoved++;

    if (onProgress) {
      const cont = onProgress({
        data: currentData,
        width: currentWidth,
        height: currentHeight,
        seamsRemoved,
        totalSeams,
      });
      if (cont === false) return { data: currentData, width: currentWidth, height: currentHeight };
    }
  }

  return { data: currentData, width: currentWidth, height: currentHeight };
}
