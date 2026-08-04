import React from "react";
import { WidgetCardProps } from "./types";

export function AboutCard({ content, className = "", onClick }: WidgetCardProps) {
  if (!content) return null;

  return (
    <div className={`widget-about-card ${className}`} onClick={() => onClick?.(content)}>
      {content.image && (
        <div className="widget-about-card__media">
          <img src={content.image} alt={content.title || "About Us"} className="widget-about-card__img" />
        </div>
      )}
      <div className="widget-about-card__body">
        {content.subTitle && <h5 className="widget-about-card__subtitle">{content.subTitle}</h5>}
        {content.title && <h3 className="widget-about-card__title">{content.title}</h3>}
        {content.description && (
          <p
            className="widget-about-card__desc"
            dangerouslySetInnerHTML={{ __html: content.description }}
          />
        )}
        {content.buttonCaption && (
          <button type="button" className="widget-about-card__btn">
            {content.buttonCaption}
          </button>
        )}
      </div>
    </div>
  );
}

export function CategoryCard({ content, className = "", onClick }: WidgetCardProps) {
  if (!content) return null;

  return (
    <div className={`widget-category-card ${className}`} onClick={() => onClick?.(content)}>
      {content.image && (
        <div className="widget-category-card__icon-wrap">
          <img src={content.image} alt={content.title || "Category"} className="widget-category-card__icon" />
        </div>
      )}
      {content.title && <h4 className="widget-category-card__title">{content.title}</h4>}
      {content.subTitle && <span className="widget-category-card__count">{content.subTitle}</span>}
    </div>
  );
}
