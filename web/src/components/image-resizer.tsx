"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Download } from "lucide-react";
import JSZip from "jszip";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

type Status = "idle" | "processing" | "done";
type SizeMode = "dimensions" | "percentage";
type TimelineFrame = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  seamIndex: number;
};

export default function ImageResizer() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [originalWidth, setOriginalWidth] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);
  const [targetWidth, setTargetWidth] = useState(0);
  const [targetHeight, setTargetHeight] = useState(0);
  const [lockAspect, setLockAspect] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [seamsRemoved, setSeamsRemoved] = useState(0);
  const [totalSeams, setTotalSeams] = useState(0);
  const [currentWidth, setCurrentWidth] = useState(0);
  const [currentHeight, setCurrentHeight] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [estimatedRemaining, setEstimatedRemaining] = useState<string>("");
  const [resultData, setResultData] = useState<{
    data: Uint8ClampedArray;
    width: number;
    height: number;
  } | null>(null);

  // Percentage mode
  const [sizeMode, setSizeMode] = useState<SizeMode>("dimensions");
  const [percentage, setPercentage] = useState(100);

  // Timeline / rewind
  const [timelineFrames, setTimelineFrames] = useState<TimelineFrame[]>([]);
  const [timelineIndex, setTimelineIndex] = useState(-1); // -1 = final result

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef(0);
  const sampleIntervalRef = useRef(1);
  const frameAccRef = useRef<TimelineFrame[]>([]);

  const drawToCanvas = useCallback(
    (data: Uint8ClampedArray, w: number, h: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const imageData = new ImageData(new Uint8ClampedArray(data), w, h);
      ctx.putImageData(imageData, 0, 0);
    },
    []
  );

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../lib/seam-carving.worker.ts", import.meta.url)
    );

    workerRef.current.onmessage = (e: MessageEvent) => {
      const msg = e.data;

      if (msg.type === "progress") {
        setSeamsRemoved(msg.seamsRemoved);
        setTotalSeams(msg.totalSeams);
        setCurrentWidth(msg.width);
        setCurrentHeight(msg.height);
        drawToCanvas(msg.data, msg.width, msg.height);

        // Sample frames for timeline
        const interval = sampleIntervalRef.current;
        if (msg.seamsRemoved % interval === 0) {
          frameAccRef.current.push({
            data: new Uint8ClampedArray(msg.data),
            width: msg.width,
            height: msg.height,
            seamIndex: msg.seamsRemoved,
          });
        }

        // Estimate remaining time
        const elapsed = Date.now() - startTimeRef.current;
        const seamsPerMs = msg.seamsRemoved / elapsed;
        const remaining = (msg.totalSeams - msg.seamsRemoved) / seamsPerMs;
        if (remaining > 0 && isFinite(remaining)) {
          const secs = Math.ceil(remaining / 1000);
          if (secs >= 60) {
            setEstimatedRemaining(
              `~${Math.floor(secs / 60)}m ${secs % 60}s remaining`
            );
          } else {
            setEstimatedRemaining(`~${secs}s remaining`);
          }
        }
      } else if (msg.type === "complete") {
        // Store final frame
        frameAccRef.current.push({
          data: new Uint8ClampedArray(msg.data),
          width: msg.width,
          height: msg.height,
          seamIndex: -1,
        });
        setTimelineFrames([...frameAccRef.current]);
        setTimelineIndex(-1);

        setStatus("done");
        setCurrentWidth(msg.width);
        setCurrentHeight(msg.height);
        setResultData({ data: msg.data, width: msg.width, height: msg.height });
        drawToCanvas(msg.data, msg.width, msg.height);
        setEstimatedRemaining("");
      } else if (msg.type === "error") {
        setStatus("idle");
        alert("Error: " + msg.message);
        setEstimatedRemaining("");
      }
    };

    return () => workerRef.current?.terminate();
  }, [drawToCanvas]);

  const pendingImageRef = useRef<HTMLImageElement | null>(null);

  const loadImage = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        pendingImageRef.current = img;
        setImage(img);
        setOriginalWidth(img.width);
        setOriginalHeight(img.height);
        setTargetWidth(img.width);
        setTargetHeight(img.height);
        setCurrentWidth(img.width);
        setCurrentHeight(img.height);
        setStatus("idle");
        setResultData(null);
        setPercentage(100);
        setTimelineFrames([]);
        setTimelineIndex(-1);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  // Draw original image after canvas mounts
  useEffect(() => {
    const img = pendingImageRef.current;
    if (image && img && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(img, 0, 0);
      pendingImageRef.current = null;
    }
  }, [image]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) loadImage(file);
    },
    [loadImage]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadImage(file);
    },
    [loadImage]
  );

  const handleWidthChange = useCallback(
    (val: number) => {
      const clamped = Math.max(1, Math.min(val, originalWidth));
      setTargetWidth(clamped);
      if (lockAspect) {
        setTargetHeight(
          Math.max(
            1,
            Math.round((clamped / originalWidth) * originalHeight)
          )
        );
      }
    },
    [originalWidth, originalHeight, lockAspect]
  );

  const handleHeightChange = useCallback(
    (val: number) => {
      const clamped = Math.max(1, Math.min(val, originalHeight));
      setTargetHeight(clamped);
      if (lockAspect) {
        setTargetWidth(
          Math.max(
            1,
            Math.round((clamped / originalHeight) * originalWidth)
          )
        );
      }
    },
    [originalWidth, originalHeight, lockAspect]
  );

  const handlePercentageChange = useCallback(
    (val: number) => {
      const clamped = Math.max(1, Math.min(val, 100));
      setPercentage(clamped);
      setTargetWidth(Math.max(1, Math.round((clamped / 100) * originalWidth)));
      setTargetHeight(Math.max(1, Math.round((clamped / 100) * originalHeight)));
    },
    [originalWidth, originalHeight]
  );

  const handleSizeModeChange = useCallback(
    (mode: SizeMode) => {
      setSizeMode(mode);
      if (mode === "percentage") {
        // Sync percentage from current target (use width ratio)
        const pct = originalWidth > 0
          ? Math.round((targetWidth / originalWidth) * 100)
          : 100;
        setPercentage(pct);
      }
    },
    [originalWidth, targetWidth]
  );

  const startResize = useCallback(() => {
    if (!image || !workerRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, image.width, image.height);

    // Calculate sample interval for timeline
    const hSeams = image.width - targetWidth;
    const vSeams = image.height - targetHeight;
    const totalSeamsEst = Math.max(1, hSeams + vSeams);
    const frameSize = image.width * image.height * 4; // bytes per frame (upper bound)
    const maxFramesByMemory = Math.floor((200 * 1024 * 1024) / frameSize);
    const maxFrames = Math.min(50, maxFramesByMemory);
    sampleIntervalRef.current = Math.max(1, Math.ceil(totalSeamsEst / maxFrames));

    // Store initial frame
    frameAccRef.current = [{
      data: new Uint8ClampedArray(imageData.data),
      width: image.width,
      height: image.height,
      seamIndex: 0,
    }];

    setStatus("processing");
    setSeamsRemoved(0);
    setTotalSeams(0);
    setResultData(null);
    setEstimatedRemaining("");
    setTimelineFrames([]);
    setTimelineIndex(-1);
    startTimeRef.current = Date.now();

    workerRef.current.postMessage({
      type: "start",
      data: imageData.data,
      width: image.width,
      height: image.height,
      targetWidth,
      targetHeight,
    });
  }, [image, targetWidth, targetHeight]);

  const cancelResize = useCallback(() => {
    workerRef.current?.postMessage({ type: "cancel" });
    setStatus("idle");
    setEstimatedRemaining("");
    setTimelineFrames([]);
    setTimelineIndex(-1);
    frameAccRef.current = [];

    // Redraw original
    if (image && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(image, 0, 0);
    }
  }, [image]);

  const getDisplayedFrame = useCallback(() => {
    if (timelineIndex === -1) return resultData;
    const frame = timelineFrames[timelineIndex];
    if (!frame) return resultData;
    return { data: frame.data, width: frame.width, height: frame.height };
  }, [timelineIndex, timelineFrames, resultData]);

  const downloadResult = useCallback(() => {
    const frame = getDisplayedFrame();
    if (!frame) return;
    const canvas = document.createElement("canvas");
    canvas.width = frame.width;
    canvas.height = frame.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imgData = new ImageData(
      new Uint8ClampedArray(frame.data),
      frame.width,
      frame.height
    );
    ctx.putImageData(imgData, 0, 0);
    const link = document.createElement("a");
    link.download = "seam-carved.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [getDisplayedFrame]);

  const [downloadingAll, setDownloadingAll] = useState(false);

  const frameToPngBlob = useCallback(
    (frame: { data: Uint8ClampedArray; width: number; height: number }): Promise<Blob> => {
      return new Promise((resolve) => {
        const canvas = document.createElement("canvas");
        canvas.width = frame.width;
        canvas.height = frame.height;
        const ctx = canvas.getContext("2d")!;
        const imgData = new ImageData(
          new Uint8ClampedArray(frame.data),
          frame.width,
          frame.height
        );
        ctx.putImageData(imgData, 0, 0);
        canvas.toBlob((blob) => resolve(blob!), "image/png");
      });
    },
    []
  );

  const downloadAllFrames = useCallback(async () => {
    if (timelineFrames.length === 0) return;
    setDownloadingAll(true);
    try {
      const zip = new JSZip();
      const padLen = String(timelineFrames.length - 1).length;
      for (let i = 0; i < timelineFrames.length; i++) {
        const frame = timelineFrames[i];
        const blob = await frameToPngBlob(frame);
        const name = `frame-${String(i).padStart(padLen, "0")}.png`;
        zip.file(name, blob);
      }
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.download = "seam-carved-frames.zip";
      link.href = URL.createObjectURL(content);
      link.click();
      URL.revokeObjectURL(link.href);
    } finally {
      setDownloadingAll(false);
    }
  }, [timelineFrames, frameToPngBlob]);

  const handleTimelineScrub = useCallback(
    (val: number) => {
      if (timelineFrames.length === 0) return;
      // Last position = -1 (final result)
      if (val >= timelineFrames.length - 1) {
        setTimelineIndex(-1);
        if (resultData) {
          drawToCanvas(resultData.data, resultData.width, resultData.height);
          setCurrentWidth(resultData.width);
          setCurrentHeight(resultData.height);
        }
      } else {
        setTimelineIndex(val);
        const frame = timelineFrames[val];
        drawToCanvas(frame.data, frame.width, frame.height);
        setCurrentWidth(frame.width);
        setCurrentHeight(frame.height);
      }
    },
    [timelineFrames, resultData, drawToCanvas]
  );

  const resetAll = useCallback(() => {
    setImage(null);
    setOriginalWidth(0);
    setOriginalHeight(0);
    setTargetWidth(0);
    setTargetHeight(0);
    setStatus("idle");
    setSeamsRemoved(0);
    setTotalSeams(0);
    setResultData(null);
    setEstimatedRemaining("");
    setPercentage(100);
    setSizeMode("dimensions");
    setTimelineFrames([]);
    setTimelineIndex(-1);
    frameAccRef.current = [];
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx)
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const progressPercent =
    totalSeams > 0 ? Math.round((seamsRemoved / totalSeams) * 100) : 0;

  const isLargeImage = originalWidth > 1500 || originalHeight > 1500;

  const noChange =
    targetWidth === originalWidth && targetHeight === originalHeight;

  // Display dimensions (updates during timeline scrub)
  const displayWidth =
    status === "processing"
      ? currentWidth
      : status === "done"
        ? (timelineIndex === -1 ? resultData?.width : timelineFrames[timelineIndex]?.width) ?? currentWidth
        : originalWidth;
  const displayHeight =
    status === "processing"
      ? currentHeight
      : status === "done"
        ? (timelineIndex === -1 ? resultData?.height : timelineFrames[timelineIndex]?.height) ?? currentHeight
        : originalHeight;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {/* Upload Area */}
      {!image && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors ${
            dragOver
              ? "border-amber-500 bg-amber-500/10"
              : "border-zinc-300 hover:border-amber-500/50 dark:border-zinc-700 dark:hover:border-amber-500/50"
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <svg
            className="mb-4 h-12 w-12 text-zinc-400 dark:text-zinc-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Drop an image here or click to upload
          </p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-600">
            PNG, JPG, WebP
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Image Preview + Controls */}
      {image && (
        <>
          {/* Canvas Preview */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {displayWidth} x {displayHeight}
              </span>
              {status === "idle" && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  Original
                </span>
              )}
              {status === "processing" && (
                <span className="text-xs text-amber-600">Processing...</span>
              )}
              {status === "done" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
                  <Check className="h-3 w-3" />
                  Done
                </span>
              )}
            </div>
            <div className="flex items-center justify-center p-4">
              <canvas
                ref={canvasRef}
                className="max-h-[400px] max-w-full object-contain"
              />
            </div>
          </div>

          {/* Large image warning */}
          {isLargeImage && status === "idle" && (
            <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
              This image is large ({originalWidth}x{originalHeight}). Processing
              may take a while.
            </div>
          )}

          {/* Progress */}
          {status === "processing" && totalSeams > 0 && (
            <div className="space-y-2">
              <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-150"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>
                  Removing seam {seamsRemoved} of {totalSeams} (
                  {progressPercent}%)
                </span>
                {estimatedRemaining && <span>{estimatedRemaining}</span>}
              </div>
            </div>
          )}

          {/* Timeline scrubber (after completion) */}
          {status === "done" && timelineFrames.length > 1 && (
            <div className="space-y-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Timeline
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {timelineIndex === -1
                    ? `Final (${timelineFrames.length - 1} of ${timelineFrames.length - 1})`
                    : timelineIndex === 0
                      ? `Original (0 of ${timelineFrames.length - 1})`
                      : `Frame ${timelineIndex} of ${timelineFrames.length - 1}`}
                </span>
              </div>
              <Slider
                min={0}
                max={timelineFrames.length - 1}
                step={1}
                value={[timelineIndex === -1 ? timelineFrames.length - 1 : timelineIndex]}
                onValueChange={([val]) => handleTimelineScrub(val)}
              />
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Scrub to see intermediate frames during seam removal
              </p>
            </div>
          )}

          {/* Controls */}
          {status !== "processing" && (
            <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              {/* Size mode toggle */}
              {status === "idle" && (
                <div className="flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-700">
                  <button
                    onClick={() => handleSizeModeChange("dimensions")}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      sizeMode === "dimensions"
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                  >
                    Dimensions
                  </button>
                  <button
                    onClick={() => handleSizeModeChange("percentage")}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      sizeMode === "percentage"
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                  >
                    Percentage
                  </button>
                </div>
              )}

              {/* Percentage mode */}
              {sizeMode === "percentage" && status === "idle" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Scale
                    </label>
                    <span className="text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
                      {percentage}%
                    </span>
                  </div>
                  <Slider
                    min={1}
                    max={100}
                    step={1}
                    value={[percentage]}
                    onValueChange={([val]) => handlePercentageChange(val)}
                  />
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    {targetWidth} x {targetHeight} px
                  </p>
                </div>
              )}

              {/* Dimensions mode */}
              {sizeMode === "dimensions" && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Width */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Width
                      </label>
                      <div className="flex items-center gap-3">
                        <Slider
                          min={1}
                          max={originalWidth}
                          step={1}
                          value={[targetWidth]}
                          onValueChange={([val]) => handleWidthChange(val)}
                          disabled={status === "done"}
                          className="flex-1"
                        />
                        <input
                          type="number"
                          min={1}
                          max={originalWidth}
                          value={targetWidth}
                          onChange={(e) =>
                            handleWidthChange(parseInt(e.target.value) || 1)
                          }
                          disabled={status === "done"}
                          className="w-20 rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-sm tabular-nums dark:border-zinc-700"
                        />
                      </div>
                    </div>
                    {/* Height */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Height
                      </label>
                      <div className="flex items-center gap-3">
                        <Slider
                          min={1}
                          max={originalHeight}
                          step={1}
                          value={[targetHeight]}
                          onValueChange={([val]) => handleHeightChange(val)}
                          disabled={status === "done"}
                          className="flex-1"
                        />
                        <input
                          type="number"
                          min={1}
                          max={originalHeight}
                          value={targetHeight}
                          onChange={(e) =>
                            handleHeightChange(parseInt(e.target.value) || 1)
                          }
                          disabled={status === "done"}
                          className="w-20 rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-sm tabular-nums dark:border-zinc-700"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Lock Aspect Ratio */}
                  {status === "idle" && (
                    <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <Switch
                        checked={lockAspect}
                        onCheckedChange={setLockAspect}
                      />
                      Lock aspect ratio
                    </label>
                  )}
                </>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {status === "idle" && (
                  <>
                    <Button
                      onClick={startResize}
                      disabled={noChange}
                      className="bg-amber-600 text-white hover:bg-amber-700"
                    >
                      Resize
                    </Button>
                    <Button variant="outline" onClick={resetAll}>
                      Start Over
                    </Button>
                  </>
                )}
                {status === "done" && (
                  <>
                    <Button
                      onClick={downloadResult}
                      className="bg-amber-600 text-white hover:bg-amber-700"
                    >
                      <Download className="h-4 w-4" />
                      Download Frame
                    </Button>
                    {timelineFrames.length > 1 && (
                      <Button
                        variant="outline"
                        onClick={downloadAllFrames}
                        disabled={downloadingAll}
                      >
                        <Download className="h-4 w-4" />
                        {downloadingAll ? "Zipping..." : "Download All Frames"}
                      </Button>
                    )}
                    <Button variant="outline" onClick={resetAll}>
                      Start Over
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Cancel button during processing */}
          {status === "processing" && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={cancelResize}>
                Cancel
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
