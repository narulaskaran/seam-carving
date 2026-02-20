import { resize } from "./seam-carving";

let cancelled = false;

self.onmessage = (e: MessageEvent) => {
  const msg = e.data;

  if (msg.type === "cancel") {
    cancelled = true;
    return;
  }

  if (msg.type === "start") {
    cancelled = false;
    const { data, width, height, targetWidth, targetHeight } = msg;

    try {
      const result = resize(
        data,
        width,
        height,
        targetWidth,
        targetHeight,
        (current) => {
          if (cancelled) return false;
          self.postMessage({
            type: "progress",
            data: current.data,
            width: current.width,
            height: current.height,
            seamsRemoved: current.seamsRemoved,
            totalSeams: current.totalSeams,
          });
          return true;
        }
      );

      if (!cancelled) {
        self.postMessage({
          type: "complete",
          data: result.data,
          width: result.width,
          height: result.height,
        });
      }
    } catch (err) {
      if (!cancelled) {
        self.postMessage({
          type: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
  }
};
