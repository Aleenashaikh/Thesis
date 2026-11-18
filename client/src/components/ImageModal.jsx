import { useState, useEffect } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw, Eye, EyeOff } from "lucide-react";
import BoxedImage from "./BoxedImage";

export default function ImageModal({
  isOpen,
  onClose,
  src,
  width,
  height,
  boxes = [],
  title = "Radiograph Inspection",
  modality = "XRAY",
}) {
  const [zoom, setZoom] = useState(1);
  const [showBoxes, setShowBoxes] = useState(true);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", onKeyDown);
      setZoom(1);
    }
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const zoomIn = () => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(0.75, +(z - 0.25).toFixed(2)));
  const resetZoom = () => setZoom(1);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-title">{title}</span>
            <span className="modal-badge">{modality}</span>
            {boxes.length > 0 && (
              <span className="modal-badge count">
                {boxes.length} {boxes.length === 1 ? "box" : "boxes"}
              </span>
            )}
          </div>
          <div className="modal-controls">
            <button
              className={`icon-btn ${showBoxes ? "active" : ""}`}
              onClick={() => setShowBoxes(!showBoxes)}
              title={showBoxes ? "Hide detections" : "Show detections"}
            >
              {showBoxes ? <Eye size={16} /> : <EyeOff size={16} />}
              <span>{showBoxes ? "Detections On" : "Detections Off"}</span>
            </button>
            <div className="zoom-btn-group">
              <button className="icon-btn" onClick={zoomOut} title="Zoom out">
                <ZoomOut size={16} />
              </button>
              <span className="zoom-display">{Math.round(zoom * 100)}%</span>
              <button className="icon-btn" onClick={zoomIn} title="Zoom in">
                <ZoomIn size={16} />
              </button>
              {zoom !== 1 && (
                <button className="icon-btn" onClick={resetZoom} title="Reset zoom">
                  <RotateCcw size={16} />
                </button>
              )}
            </div>
            <button className="icon-btn close-btn" onClick={onClose} title="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="modal-viewport">
          <div
            className="modal-stage"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
              transition: "transform 0.15s ease-out",
            }}
          >
            <BoxedImage
              src={src}
              width={width}
              height={height}
              boxes={boxes}
              showBoxes={showBoxes}
              showConfidence={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
