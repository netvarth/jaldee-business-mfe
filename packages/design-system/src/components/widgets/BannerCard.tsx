import React, { useState } from "react";
import { WidgetCardProps } from "./types";

export function BannerCard({ content, className = "", onClick }: WidgetCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  if (!content) return null;

  const btnBg = isHovered
    ? content.backgroundColor || "#FFFFFF"
    : content.foregroundColor || "var(--color-primary, #4F46E5)";
  const btnColor = isHovered
    ? content.foregroundColor || "var(--color-primary, #4F46E5)"
    : content.backgroundColor || "#FFFFFF";

  return (
    <div className={`widget-banner-card ${className}`}>
      {content.video ? (
        <video
          src={content.video}
          autoPlay
          muted
          loop
          playsInline
          className="widget-banner-card__video"
        />
      ) : content.image ? (
        <img
          src={content.image}
          alt={content.title || "Banner cover"}
          className="widget-banner-card__img"
        />
      ) : null}

      <div
        className="widget-banner-card__overlay"
        style={{
          color: content.foregroundColor,
          backgroundColor: content.backgroundColor ? content.backgroundColor : undefined,
        }}
      >
        <div className="widget-banner-card__content">
          {content.subTitle && (
            <h4
              className="widget-banner-card__subtitle"
              style={{
                fontSize: content.subTitleFontSize,
                fontWeight: content.subTitleFontWeight,
                textAlign: content.subTitleTextAlign,
              }}
            >
              {content.subTitle}
            </h4>
          )}
          {content.title && (
            <h1
              className="widget-banner-card__title"
              style={{
                fontSize: content.titleFontSize,
                fontWeight: content.titleFontWeight,
                textAlign: content.titleTextAlign,
              }}
            >
              {content.title}
            </h1>
          )}
          {content.description && (
            <p
              className="widget-banner-card__desc"
              style={{
                fontSize: content.descriptionFontSize,
                fontWeight: content.descriptionFontWeight,
                textAlign: content.descriptionTextAlign,
              }}
              dangerouslySetInnerHTML={{ __html: content.description }}
            />
          )}
          {content.buttonCaption && (
            <button
              type="button"
              className="widget-banner-card__btn"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onClick={() => onClick?.(content)}
              style={{
                backgroundColor: btnBg,
                color: btnColor,
                borderColor: content.foregroundColor || "#FFFFFF",
              }}
            >
              {content.buttonCaption}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
