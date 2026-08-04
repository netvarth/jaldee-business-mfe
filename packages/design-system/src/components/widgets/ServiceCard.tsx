import React, { useState } from "react";
import { WidgetCardProps } from "./types";
import "./widgets.css";

export function ServiceCard({ content, className = "", onClick }: WidgetCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  if (!content) return null;

  const btnBg = isHovered
    ? content.backgroundColor || "var(--color-primary, #4F46E5)"
    : content.foregroundColor || "#FFFFFF";
  const btnColor = isHovered
    ? content.foregroundColor || "#FFFFFF"
    : content.backgroundColor || "var(--color-primary, #4F46E5)";

  return (
    <div className={`widget-card widget-service-card ${className}`}>
      {(content.video || content.image) && (
        <div className="widget-card__media">
          {content.video ? (
            <video
              src={content.video}
              controls
              muted
              playsInline
              className="widget-card__video"
              style={{ aspectRatio: content.image_aspectRatio || "16/9" }}
            />
          ) : (
            <img
              src={content.image}
              alt={content.title || "Service image"}
              loading="lazy"
              className="widget-card__img"
            />
          )}
        </div>
      )}

      {(content.title || content.subTitle || content.description) && (
        <div className="widget-card__body">
          {content.title && (
            <h4
              className="widget-card__title"
              style={{
                fontSize: content.titleFontSize,
                fontWeight: content.titleFontWeight,
                fontStyle: content.titleFontStyle,
                textAlign: content.titleTextAlign,
              }}
            >
              {content.title}
            </h4>
          )}
          {content.subTitle && (
            <h5
              className="widget-card__subtitle"
              style={{
                fontSize: content.subTitleFontSize,
                fontWeight: content.subTitleFontWeight,
                fontStyle: content.subTitleFontStyle,
                textAlign: content.subTitleTextAlign,
              }}
            >
              {content.subTitle}
            </h5>
          )}
          {content.description && (
            <p
              className="widget-card__desc"
              style={{
                fontSize: content.descriptionFontSize,
                fontWeight: content.descriptionFontWeight,
                fontStyle: content.descriptionFontStyle,
                textAlign: content.descriptionTextAlign,
              }}
              dangerouslySetInnerHTML={{ __html: content.description }}
            />
          )}
        </div>
      )}

      {content.buttonCaption && (
        <div className="widget-card__action">
          <button
            type="button"
            className="widget-card__btn"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => onClick?.(content)}
            style={{
              backgroundColor: btnBg,
              color: btnColor,
              borderColor: content.backgroundColor || "var(--color-primary, #4F46E5)",
            }}
          >
            {content.buttonCaption}
          </button>
        </div>
      )}
    </div>
  );
}
