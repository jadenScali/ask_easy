"use client";

import {
  ChevronLeft,
  ChevronRight,
  Radio,
  Navigation,
  Users,
  Square,
  SquareMousePointer,
  Upload,
  LogOut,
  Unlink,
  Undo2,
} from "lucide-react";
import { createPluginRegistration } from "@embedpdf/core";
import { EmbedPDF } from "@embedpdf/core/react";
import { usePdfiumEngine } from "@embedpdf/engines/react";
import {
  DocumentContent,
  DocumentManagerPluginPackage,
  useDocumentManagerCapability,
} from "@embedpdf/plugin-document-manager/react";
import { RenderLayer, RenderPluginPackage } from "@embedpdf/plugin-render/react";
import { ViewportPluginPackage } from "@embedpdf/plugin-viewport/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useRoom } from "./RoomContext";
import type { SlideContextSnapshot } from "./RoomContext";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SlideViewerProps {
  isProfessor: boolean;
  onEndLecture?: () => void;
  onSlideContextChange?: (ctx: SlideContextSnapshot) => void;
  slideNavTarget?: SlideContextSnapshot | null;
}

// ---------------------------------------------------------------------------
// Inner UI — needs to be inside EmbedPDF to access document capabilities
// ---------------------------------------------------------------------------

interface SlideUIProps {
  activeDocumentId: string | null;
  isProfessor: boolean;
  slideSetId: string | null;
  slideNavTarget?: SlideContextSnapshot | null;
  onSlideContextChange?: (ctx: SlideContextSnapshot) => void;
  onReplaceSlides?: (file: File) => void;
  onEndLecture?: () => void;
}

function SlideUI({
  activeDocumentId,
  isProfessor,
  slideSetId,
  slideNavTarget,
  onSlideContextChange,
  onReplaceSlides,
  onEndLecture,
}: SlideUIProps) {
  const { socket, sessionId, slideReturnTarget, goBackToPreviousSlide } = useRoom();
  const router = useRouter();

  const [pageIndex, setPageIndex] = useState(0);
  const [inputValue, setInputValue] = useState("1");
  const [isSynced, setIsSynced] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const professorPageRef = useRef(0);
  // Each navigateToQuestionSlide call creates a new target object; apply once per object
  // so re-runs (e.g. isSynced → navigateToLocal identity) don't re-detach from live.
  const appliedNavTargetRef = useRef<SlideContextSnapshot | null>(null);

  const { provides: docManager } = useDocumentManagerCapability();
  const activeDocument = docManager?.getActiveDocument();
  const pageCount = activeDocument?.pageCount || 0;

  // Report the viewer's local page to the room container for question context
  useEffect(() => {
    if (!onSlideContextChange) return;
    if (!slideSetId) {
      onSlideContextChange({ slidePageIndex: null, slideSetId: null });
      return;
    }
    onSlideContextChange({ slidePageIndex: pageIndex, slideSetId });
  }, [pageIndex, slideSetId, onSlideContextChange]);

  // -------------------------------------------------------------------------
  // Socket — slide sync + live updates
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!socket) return;

    const requestSync = () => {
      socket.emit("slide:sync", { sessionId });
    };

    if (socket.connected) requestSync();
    socket.on("connect", requestSync);

    const onSyncResponse = ({ pageIndex: idx }: { pageIndex: number }) => {
      professorPageRef.current = idx;
      setPageIndex(idx);
      setInputValue(String(idx + 1));
    };

    socket.on("slide:sync", onSyncResponse);

    const onViewerCount = ({ count }: { count: number }) => {
      setViewerCount(count);
    };

    socket.on("viewer:count", onViewerCount);

    const requestViewerSync = () => {
      socket.emit("viewer:sync", { sessionId });
    };

    if (socket.connected) requestViewerSync();
    socket.on("connect", requestViewerSync);

    return () => {
      socket.off("connect", requestSync);
      socket.off("connect", requestViewerSync);
      socket.off("slide:sync", onSyncResponse);
      socket.off("viewer:count", onViewerCount);
    };
  }, [socket, sessionId]);

  useEffect(() => {
    if (!socket) return;

    const handler = ({ pageIndex: newIndex }: { pageIndex: number }) => {
      professorPageRef.current = newIndex;
      if (isSynced || isProfessor) {
        setPageIndex(newIndex);
        setInputValue(String(newIndex + 1));
      }
    };

    socket.off("slide:changed");
    socket.on("slide:changed", handler);

    return () => {
      socket.off("slide:changed", handler);
    };
  }, [socket, isSynced, isProfessor]);

  // -------------------------------------------------------------------------
  // Navigation helpers
  // -------------------------------------------------------------------------

  const navigateToLocal = useCallback(
    (newIndex: number, options?: { detachFromProfessor?: boolean }) => {
      if (pageCount === 0) return;
      const clamped = Math.max(0, Math.min(newIndex, pageCount - 1));
      if (options?.detachFromProfessor && !isProfessor && isSynced) {
        setIsSynced(false);
      }
      setPageIndex(clamped);
      setInputValue(String(clamped + 1));
    },
    [pageCount, isProfessor, isSynced]
  );

  const navigateTo = useCallback(
    (newIndex: number) => {
      if (pageCount === 0) return;
      const clamped = Math.max(0, Math.min(newIndex, pageCount - 1));
      navigateToLocal(clamped);

      if (isProfessor && socket) {
        socket.emit("slide:change", { sessionId, pageIndex: clamped });
      }
    },
    [pageCount, navigateToLocal, isProfessor, socket, sessionId]
  );

  // Question-badge jump: professor broadcasts; students detach from follow mode
  useEffect(() => {
    if (slideNavTarget?.slidePageIndex == null || !slideNavTarget.slideSetId) return;
    if (slideNavTarget.slideSetId !== slideSetId) return;
    if (pageCount === 0) return;
    if (appliedNavTargetRef.current === slideNavTarget) return;

    appliedNavTargetRef.current = slideNavTarget;
    const targetPage = slideNavTarget.slidePageIndex;
    queueMicrotask(() => {
      if (isProfessor) {
        navigateTo(targetPage);
      } else {
        navigateToLocal(targetPage, { detachFromProfessor: true });
      }
    });
  }, [slideNavTarget, slideSetId, pageCount, navigateToLocal, navigateTo, isProfessor]);

  const handleInputCommit = (value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) {
      navigateTo(0);
    } else {
      navigateTo(num - 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleInputCommit(inputValue);
      e.currentTarget.blur();
    }
  };

  // -------------------------------------------------------------------------
  // Student sync toggle
  // -------------------------------------------------------------------------

  const handleToggleSync = () => {
    if (!isSynced) {
      const target = professorPageRef.current;
      setPageIndex(target);
      setInputValue(String(target + 1));
    }
    setIsSynced((prev) => !prev);
  };

  // -------------------------------------------------------------------------
  // End lecture
  // -------------------------------------------------------------------------

  const handleEndLecture = async () => {
    if (onEndLecture) {
      // Delegate to parent — it will show the download modal, then call PATCH.
      onEndLecture();
      return;
    }
    // Fallback: end session inline (when no parent callback is provided)
    try {
      await fetch(`/api/sessions/${sessionId}`, { method: "PATCH" });
      router.push("/");
    } catch {
      // stay on page if end fails
    }
  };

  // -------------------------------------------------------------------------
  // Replace slides (professor only — hidden file input)
  // -------------------------------------------------------------------------

  const replaceInputRef = useRef<HTMLInputElement>(null);

  const handleReplaceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onReplaceSlides) {
      onReplaceSlides(file);
    }
    e.target.value = "";
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col flex-1 w-full min-h-0">
      {/* Slide canvas */}
      {activeDocumentId ? (
        <DocumentContent documentId={activeDocumentId}>
          {({ isLoaded }) =>
            isLoaded ? (
              <div className="relative flex-1 w-full flex items-center justify-center min-h-0">
                <RenderLayer
                  documentId={activeDocumentId}
                  pageIndex={pageIndex}
                  scale={3}
                  className="max-w-full max-h-full object-contain block [&_canvas]:!max-w-full [&_canvas]:!max-h-full [&_canvas]:!object-contain"
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-foreground">
                Loading slides, please wait...
              </div>
            )
          }
        </DocumentContent>
      ) : (
        <div className="flex-1 flex items-center justify-center text-foreground">
          Loading slides, please wait...
        </div>
      )}

      {/* Controls bar — always rendered */}
      <div className="shrink-0 w-full overflow-x-auto overscroll-x-contain">
        <div className="flex w-max min-w-full items-center justify-center gap-3 px-4 py-4 whitespace-nowrap">
          {slideReturnTarget?.slidePageIndex != null && (
            <>
              <button
                onClick={goBackToPreviousSlide}
                className="flex shrink-0 items-center gap-1.5 h-9 px-3 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-md text-sm font-medium transition-colors cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Back to slide {slideReturnTarget.slidePageIndex + 1}
              </button>
              <div className="w-px h-6 bg-stone-200 mx-1 shrink-0" />
            </>
          )}

          {/* Professor: live indicator + nav */}
          {isProfessor && (
            <>
              <div className="flex items-center gap-1.5 h-9 px-3 bg-green-100 text-green-700 rounded-md text-sm font-medium">
                <Radio className="w-4 h-4" />
                Live
              </div>
              <div className="flex items-center gap-1.5 h-9 px-3 bg-stone-100 text-stone-700 rounded-md text-sm font-medium">
                <Users className="w-4 h-4" />
                {viewerCount}
              </div>
              {onReplaceSlides && (
                <>
                  <input
                    ref={replaceInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={handleReplaceFile}
                  />
                  <button
                    onClick={() => replaceInputRef.current?.click()}
                    className="flex items-center gap-1.5 h-9 px-3 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-md text-sm font-medium transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Replace
                  </button>
                </>
              )}
              <button
                onClick={handleEndLecture}
                className="flex items-center gap-1.5 h-9 px-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm font-medium transition-colors cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                End Lecture
              </button>
              <div className="w-px h-6 bg-stone-200 mx-1" />
              <button
                className="w-9 h-9 flex items-center justify-center bg-stone-900 hover:bg-stone-700 text-stone-50 rounded-md transition-colors cursor-pointer"
                onClick={() => navigateTo(pageIndex === 0 ? pageCount - 1 : pageIndex - 1)}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onBlur={() => handleInputCommit(inputValue)}
                  onKeyDown={handleKeyDown}
                  className="w-10 h-9 px-1 text-center bg-white border border-stone-300 rounded focus-visible:ring-1 focus-visible:ring-stone-400 focus-visible:outline-none"
                />
                {pageCount > 0 && <span className="text-stone-500">/ {pageCount}</span>}
              </div>
              <button
                className="w-9 h-9 flex items-center justify-center bg-stone-900 hover:bg-stone-700 text-stone-50 rounded-md transition-colors cursor-pointer"
                onClick={() => navigateTo((pageIndex + 1) % pageCount)}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Student: following mode */}
          {!isProfessor && isSynced && (
            <>
              <div className="flex items-center gap-1.5 h-9 px-3 bg-green-100 text-green-700 rounded-md text-sm font-medium">
                <Navigation className="w-4 h-4" />
                Following Professor
              </div>
              <button
                onClick={handleToggleSync}
                className="flex items-center gap-1.5 h-9 px-3 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-md text-sm font-medium transition-colors cursor-pointer"
              >
                <Unlink className="w-3.5 h-3.5" />
                Browse Freely
              </button>
              <div className="w-px h-6 bg-stone-200 mx-1" />
              <button
                onClick={() => router.push("/")}
                className="flex items-center gap-1.5 h-9 px-3 bg-stone-200 hover:bg-red-100 hover:text-red-700 text-stone-700 rounded-md text-sm font-medium transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Exit
              </button>
            </>
          )}

          {/* Student: free navigation mode */}
          {!isProfessor && !isSynced && (
            <>
              <button
                className="w-9 h-9 flex items-center justify-center bg-stone-900 hover:bg-stone-700 text-stone-50 rounded-md transition-colors cursor-pointer"
                onClick={() => navigateTo(pageIndex === 0 ? pageCount - 1 : pageIndex - 1)}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onBlur={() => handleInputCommit(inputValue)}
                  onKeyDown={handleKeyDown}
                  className="w-10 h-9 px-1 text-center bg-white border border-stone-300 rounded focus-visible:ring-1 focus-visible:ring-stone-400 focus-visible:outline-none"
                />
                {pageCount > 0 && <span className="text-stone-500">/ {pageCount}</span>}
              </div>
              <button
                className="w-9 h-9 flex items-center justify-center bg-stone-900 hover:bg-stone-700 text-stone-50 rounded-md transition-colors cursor-pointer"
                onClick={() => navigateTo((pageIndex + 1) % pageCount)}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={handleToggleSync}
                className="flex items-center gap-1.5 h-9 px-3 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-md text-sm font-medium transition-colors cursor-pointer"
              >
                <Radio className="w-4 h-4" />
                Back to Live
              </button>
              <div className="w-px h-6 bg-stone-200 mx-1" />
              <button
                onClick={() => router.push("/")}
                className="flex items-center gap-1.5 h-9 px-3 bg-stone-200 hover:bg-red-100 hover:text-red-700 text-stone-700 rounded-md text-sm font-medium transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Exit
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upload zone — shown to professors when no slides exist yet
// ---------------------------------------------------------------------------

interface UploadZoneProps {
  onUpload: (file: File) => void;
  isUploading: boolean;
  uploadError: string | null;
  onEndLecture?: () => void;
}

function UploadZone({ onUpload, isUploading, uploadError, onEndLecture }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) return;
    onUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col flex-1 w-full items-center justify-center p-8">
      <div
        className={`flex flex-col items-center justify-center w-full max-w-md border-2 border-dashed rounded-md p-10 gap-4 cursor-pointer transition-colors ${
          isDragging
            ? "border-stone-500 bg-stone-100"
            : "border-stone-300 bg-stone-50 hover:border-stone-400 hover:bg-stone-100"
        } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
        onClick={() => !isUploading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="flex items-center justify-center w-14 h-14 rounded-md bg-stone-200">
          <Upload className="w-6 h-6 text-stone-600" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-stone-800">
            {isUploading ? "Uploading…" : "Upload Slides"}
          </p>
          <p className="text-sm text-stone-500 mt-1">
            {isUploading
              ? "Please wait while your PDF is being processed"
              : "Drag & drop a PDF here, or click to browse"}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleChange}
          disabled={isUploading}
        />
      </div>
      {uploadError && (
        <p className="mt-4 text-sm text-red-600 max-w-md text-center">{uploadError}</p>
      )}
      {onEndLecture && (
        <div className="mt-6 flex flex-col items-center">
          <p className="text-sm text-stone-500 mb-3">
            Or end the lecture without uploading slides.
          </p>
          <button
            onClick={onEndLecture}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm font-medium transition-colors"
          >
            <Square className="w-4 h-4 fill-current" />
            End Lecture
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export default function SlideViewer({
  isProfessor,
  onEndLecture,
  onSlideContextChange,
  slideNavTarget,
}: SlideViewerProps) {
  const { engine, isLoading: engineLoading } = usePdfiumEngine();
  const { sessionId, socket } = useRoom();

  const [slideUrl, setSlideUrl] = useState<string | null>(null);
  const [activeSlideSetId, setActiveSlideSetId] = useState<string | null>(null);
  const [isLoadingSlides, setIsLoadingSlides] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Fetch existing slide set on mount
  // -------------------------------------------------------------------------

  const loadSlides = useCallback(
    async (slideSetId?: string) => {
      if (slideSetId) {
        setActiveSlideSetId(slideSetId);
        setSlideUrl(`/api/sessions/${sessionId}/slides/${slideSetId}/file`);
        setIsLoadingSlides(false);
        return;
      }
      try {
        const res = await fetch(`/api/sessions/${sessionId}/slides`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.slideSets?.length > 0) {
          const latest = data.slideSets[0];
          setActiveSlideSetId(latest.id);
          setSlideUrl(`/api/sessions/${sessionId}/slides/${latest.id}/file`);
        } else {
          setActiveSlideSetId(null);
        }
      } finally {
        setIsLoadingSlides(false);
      }
    },
    [sessionId]
  );

  useEffect(() => {
    if (sessionId) {
      loadSlides().finally(() => setIsLoadingSlides(false));
    }
  }, [sessionId, loadSlides]);

  // -------------------------------------------------------------------------
  // Socket — listen for slides:available (students get notified after upload)
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!socket) return;

    const onSlidesAvailable = ({ slideSetId }: { slideSetId: string }) => {
      setActiveSlideSetId(slideSetId);
      setSlideUrl(`/api/sessions/${sessionId}/slides/${slideSetId}/file`);
    };

    socket.on("slides:available", onSlidesAvailable);
    return () => {
      socket.off("slides:available", onSlidesAvailable);
    };
  }, [socket, sessionId]);

  // Clear slide context when no deck is loaded
  useEffect(() => {
    if (!slideUrl) {
      onSlideContextChange?.({ slidePageIndex: null, slideSetId: null });
    }
  }, [slideUrl, onSlideContextChange]);

  // Navigate to a question's slide — switch decks when needed
  useEffect(() => {
    if (slideNavTarget?.slidePageIndex == null || !slideNavTarget.slideSetId) return;

    if (slideNavTarget.slideSetId !== activeSlideSetId) {
      loadSlides(slideNavTarget.slideSetId);
    }
  }, [slideNavTarget, activeSlideSetId, loadSlides]);

  // -------------------------------------------------------------------------
  // Upload handler
  // -------------------------------------------------------------------------

  const handleUpload = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setUploadError(null);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(`/api/sessions/${sessionId}/slides`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (!res.ok) {
          setUploadError(data.error ?? "Upload failed. Please try again.");
          return;
        }

        const newUrl = `/api/sessions/${sessionId}/slides/${data.slideSetId}/file`;
        setActiveSlideSetId(data.slideSetId);
        setSlideUrl(newUrl);

        if (socket?.connected) {
          socket.emit("slides:uploaded", { sessionId, slideSetId: data.slideSetId });
          socket.emit("slide:change", { sessionId, pageIndex: 0 });
        }
      } catch {
        setUploadError("Upload failed. Please check your connection and try again.");
      } finally {
        setIsUploading(false);
      }
    },
    [sessionId, socket]
  );

  // -------------------------------------------------------------------------
  // Build plugins dynamically so EmbedPDF loads the real URL
  // -------------------------------------------------------------------------

  const plugins = useMemo(() => {
    if (!slideUrl) return null;
    return [
      createPluginRegistration(DocumentManagerPluginPackage, {
        initialDocuments: [{ url: slideUrl }],
      }),
      createPluginRegistration(ViewportPluginPackage),
      createPluginRegistration(RenderPluginPackage),
    ];
  }, [slideUrl]);

  // -------------------------------------------------------------------------
  // Render states
  // -------------------------------------------------------------------------

  if (engineLoading || !engine) {
    return (
      <div className="flex flex-col bg-stone-50 flex-1 w-full h-full items-center justify-center">
        <p className="text-stone-500 text-sm">Loading PDF engine…</p>
      </div>
    );
  }

  if (isLoadingSlides) {
    return (
      <div className="flex flex-col bg-stone-50 flex-1 w-full h-full items-center justify-center">
        <p className="text-stone-500 text-sm">Loading slides, please wait…</p>
      </div>
    );
  }

  // No slides yet
  if (!slideUrl) {
    if (isProfessor) {
      return (
        <div className="flex flex-col bg-stone-50 flex-1 w-full h-full overflow-hidden">
          <UploadZone
            onUpload={handleUpload}
            isUploading={isUploading}
            uploadError={uploadError}
            onEndLecture={onEndLecture}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col bg-stone-50 flex-1 w-full h-full items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-md bg-stone-200 flex items-center justify-center">
          <SquareMousePointer className="w-5 h-5 text-stone-400" />
        </div>
        <p className="text-stone-500 text-sm">Waiting for professor to upload slides…</p>
      </div>
    );
  }

  // Slides available — render the viewer
  return (
    <div className="flex flex-col bg-stone-50 flex-1 w-full h-full items-center justify-center overflow-hidden">
      {isUploading && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
          <p className="text-stone-600 text-sm font-medium">Uploading new slides…</p>
        </div>
      )}
      <EmbedPDF key={slideUrl} engine={engine} plugins={plugins!}>
        {({ activeDocumentId }) => (
          <SlideUI
            activeDocumentId={activeDocumentId}
            isProfessor={isProfessor}
            slideSetId={activeSlideSetId}
            slideNavTarget={slideNavTarget}
            onSlideContextChange={onSlideContextChange}
            onReplaceSlides={isProfessor ? handleUpload : undefined}
            onEndLecture={isProfessor ? onEndLecture : undefined}
          />
        )}
      </EmbedPDF>
    </div>
  );
}
