export const COLORS = {
  statusIdle: 0xbbbbdd,
  statusWorking: 0x60b0ff,
  statusDone: 0x70ff90,
  statusCheckpoint: 0xffcc33,
  nameCardBg: 0x14141c,
  nameCardText: 0xffffff,
  background: 0x1a1420,
  floor: 0xc8ac86,
  floorAlt: 0xbca07a,
  wall: 0xe6dace,
  wallTrim: 0xa89888,
} as const

export const TILE = 32
export const CELL_W = 3 * TILE
export const CELL_H = 3 * TILE
export const MARGIN = 3 * TILE
export const WALL_H = 3 * TILE
