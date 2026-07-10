export const toRgba = (color = "#9333ea", alpha = 0.2): string => {
  if (!color || !color.startsWith("#")) return `rgba(147, 51, 234, ${alpha})`;
  const hex = color.replace("#", "");
  const normalized = hex.length === 3 ? hex.split("").map((ch) => ch + ch).join("") : hex;
  const intValue = Number.parseInt(normalized, 16);
  if (Number.isNaN(intValue)) return `rgba(147, 51, 234, ${alpha})`;

  const red = (intValue >> 16) & 255;
  const green = (intValue >> 8) & 255;
  const blue = intValue & 255;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};
