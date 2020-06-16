export function bboxToRect(bbox) {
  return {
      minX: bbox.x,
      minY: bbox.y,
      maxX: bbox.x + bbox.width,
      maxY: bbox.y + bbox.height
  };
}

export function circumscribingCircle(rect) {
  let width = rect.maxX - rect.minX;
  let height = rect.maxY - rect.minY;

  // compute the circle diameter
  let diameter = Math.sqrt(
    Math.pow(rect.maxX - rect.minX, 2) +
    Math.pow(rect.maxY - rect.minY, 2)
  );

  let radius = diameter / 2;

  let center = {
    x: rect.minX + width / 2,
    y: rect.minY + height / 2
  }

  let minX = center.x - radius;
  let minY = center.y - radius;

  return {
    minX: minX,
    minY: minY,
    maxX: minX + diameter,
    maxY: minY + diameter,
    diameter: diameter,
    radius: radius,
    center: center
  };
}

