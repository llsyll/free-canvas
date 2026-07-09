export type ExportBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ExportDimensions = {
  width: number;
  height: number;
};

export const EXPORT_EXCLUDE_CLASS = 'image-export-exclude';

export function hasExcludedExportClass(className: string): boolean {
  return className.split(/\s+/).includes(EXPORT_EXCLUDE_CLASS);
}

export function expandExportBounds(bounds: ExportBounds, padding: number): ExportBounds {
  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}

export function getExportScale(width: number, height: number, maxSide: number): number {
  const longestSide = Math.max(width, height);
  if (longestSide <= maxSide) return 1;
  return maxSide / longestSide;
}

export function clampExportDimensions(
  dimensions: ExportDimensions,
  maxSide: number,
): ExportDimensions & { scale: number } {
  const scale = getExportScale(dimensions.width, dimensions.height, maxSide);
  return {
    width: Math.max(1, Math.round(dimensions.width * scale)),
    height: Math.max(1, Math.round(dimensions.height * scale)),
    scale,
  };
}

export function makeExportFileName(canvasTitle: string, mode: string): string {
  const safeTitle = canvasTitle
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${safeTitle || 'canvas'}-${mode}.png`;
}
