import React from "react";
import { WidgetCardProps } from "./types";

export function TestimonialCard({ content, className = "", onClick }: WidgetCardProps) {
  if (!content) return null;

  return (
    <div className={`widget-testimonial-card ${className}`} onClick={() => onClick?.(content)}>
      <div className="widget-testimonial-card__quote">“</div>
      {content.description && (
        <p
          className="widget-testimonial-card__desc"
          dangerouslySetInnerHTML={{ __html: content.description }}
        />
      )}
      <div className="widget-testimonial-card__author-row">
        {content.image && (
          <img
            src={content.image}
            alt={content.title || "Author"}
            className="widget-testimonial-card__avatar"
          />
        )}
        <div>
          {content.title && <h5 className="widget-testimonial-card__name">{content.title}</h5>}
          {content.subTitle && <span className="widget-testimonial-card__role">{content.subTitle}</span>}
        </div>
      </div>
    </div>
  );
}

export function BlogCard({ content, className = "", onClick }: WidgetCardProps) {
  if (!content) return null;

  return (
    <div className={`widget-blog-card ${className}`} onClick={() => onClick?.(content)}>
      {content.image && (
        <div className="widget-blog-card__media">
          <img src={content.image} alt={content.title || "Blog cover"} className="widget-blog-card__img" />
          {content.badge && <span className="widget-blog-card__badge">{content.badge}</span>}
        </div>
      )}
      <div className="widget-blog-card__body">
        {content.date && <span className="widget-blog-card__date">{content.date}</span>}
        {content.title && <h4 className="widget-blog-card__title">{content.title}</h4>}
        {content.description && (
          <p
            className="widget-blog-card__desc"
            dangerouslySetInnerHTML={{ __html: content.description }}
          />
        )}
        {content.buttonCaption && (
          <span className="widget-blog-card__readmore">{content.buttonCaption} →</span>
        )}
      </div>
    </div>
  );
}
