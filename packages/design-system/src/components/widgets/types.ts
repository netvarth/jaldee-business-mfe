export interface WidgetContent {
  id?: string;
  title?: string;
  subTitle?: string;
  description?: string;
  image?: string;
  image_mob?: string;
  video?: string;
  video_mob?: string;
  image_aspectRatio?: string;
  image_mob_aspectRatio?: string;
  buttonCaption?: string;
  link?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  titleFontSize?: string;
  titleFontWeight?: string;
  titleFontStyle?: string;
  titleTextAlign?: "left" | "center" | "right" | "justify";
  subTitleFontSize?: string;
  subTitleFontWeight?: string;
  subTitleFontStyle?: string;
  subTitleTextAlign?: "left" | "center" | "right" | "justify";
  descriptionFontSize?: string;
  descriptionFontWeight?: string;
  descriptionFontStyle?: string;
  descriptionTextAlign?: "left" | "center" | "right" | "justify";
  author?: string;
  date?: string;
  rating?: number;
  badge?: string;
  tokenNo?: string;
  status?: string;
}

export interface WidgetCardProps {
  content: WidgetContent;
  className?: string;
  onClick?: (content: WidgetContent) => void;
}
