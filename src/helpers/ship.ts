import { Vector2 } from "src/types";

export const getVector2FromTileNumber = (tileNumber: number): Vector2 => {
  const x = tileNumber % 10;
  const y = Math.floor(tileNumber / 10);
  return { x, y };
};

export const getTileNumberFromVector2 = (vector2: Vector2): number => {
  return vector2.y * 10 + vector2.x;
};