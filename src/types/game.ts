export type Orientation = 'left' | 'right' | 'up' | 'down'

export interface Ship {
  id: number
  orientation: Orientation
  position: Vector2 | null
}

export type TileType =
  | 'water'
  | 'ship'
  | 'shipPart'

export interface Tile {
  position: Vector2,
  type: TileType,
  hit: boolean,
  ship: Ship | null,
}

export interface Vector2 {
  x: number
  y: number
}

export type GameState =
  | 'start'
  | 'player1'
  | 'player2'
  | 'player1Wins'
  | 'player2Wins'

export type ShotResult =
  | 'hit'
  | 'miss'

export interface Turn {
  id: string
  player: string
  position: Vector2
  result: ShotResult
  ship?: Ship
}

export interface Turns {
  [key: string]: Turn
}