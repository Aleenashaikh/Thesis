import { useState } from "react";

export default function BoxedImage({
  src,
  width,
  height,
  boxes = [],
  showBoxes = true,
  showConfidence = true,
  activeBoxIndex = null,
  onHoverBox = () => {},
  alt = "Medical radiograph scan",
  className = "",
  onClick = null,
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // If width and height are available, compute aspect ratio to avoid layout shift
  const aspectRatio = width && height ? `${width} / ${height}` : "auto";

  return (
    <div
      className={`boxed-image-wrapper ${className}`}
      style={{ aspectRatio }}
      onClick={onClick}
    >
      <img
        src={src}
        alt={alt}
        className="boxed-image-element"
        loading="lazy"
      />
      {showBoxes &&
        boxes.map((b, i) => {
          const isHighlight = activeBoxIndex === i || hoveredIndex === i;
          const leftPct = (b.x1 / width) * 100;
          const topPct = (b.y1 / height) * 100;
          const widthPct = ((b.x2 - b.x1) / width) * 100;
          const heightPct = ((b.y2 - b.y1) / height) * 100;

          return (
            <div
              key={i}
              className={`detection-box ${isHighlight ? "is-highlighted" : ""}`}
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${widthPct}%`,
                height: `${heightPct}%`,
              }}
              onMouseEnter={() => {
                setHoveredIndex(i);
                onHoverBox(i);
              }}
              onMouseLeave={() => {
                setHoveredIndex(null);
                onHoverBox(null);
              }}
            >
              {showConfidence && (
                <div className="detection-box-badge">
                  <span className="detection-box-tag">Calculus #{i + 1}</span>
                  <span className="detection-box-conf">{(b.conf * 100).toFixed(0)}%</span>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
