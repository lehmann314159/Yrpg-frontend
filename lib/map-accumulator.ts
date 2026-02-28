import type { MapCell, RoomView } from './types';

export interface AccumulatedRoom {
  x: number;
  y: number;
  roomId: string;
  exits: string[];
  isExit: boolean;
}

const directionOffsets: Record<string, [number, number]> = {
  north: [0, 1],
  south: [0, -1],
  east: [1, 0],
  west: [-1, 0],
};

/** Idempotently add/update a room in the accumulated map. */
export function accumulateRoom(
  rooms: Map<string, AccumulatedRoom>,
  currentRoom: RoomView,
): void {
  const key = `${currentRoom.x},${currentRoom.y}`;
  rooms.set(key, {
    x: currentRoom.x,
    y: currentRoom.y,
    roomId: currentRoom.id,
    exits: currentRoom.exits,
    isExit: currentRoom.isExit,
  });
}

/** Convert accumulated rooms into the MapCell[][] grid DungeonMap expects. */
export function buildMapGrid(
  rooms: Map<string, AccumulatedRoom>,
  currentRoom: RoomView,
): MapCell[][] {
  if (rooms.size === 0) return [];

  // Find bounds — min is always 0,0 (entrance); max from visited + adjacent cells
  let maxX = 0;
  let maxY = 0;

  // Collect all coordinates we need to consider (visited rooms + their neighbors)
  const allCoords: [number, number][] = [];

  const roomList = Array.from(rooms.values());

  for (const room of roomList) {
    allCoords.push([room.x, room.y]);
    for (const exit of room.exits) {
      const offset = directionOffsets[exit];
      if (!offset) continue;
      const nx = room.x + offset[0];
      const ny = room.y + offset[1];
      if (nx >= 0 && ny >= 0) {
        allCoords.push([nx, ny]);
      }
    }
  }

  for (const [x, y] of allCoords) {
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  // Build grid filled with unknown cells
  const grid: MapCell[][] = [];
  for (let y = 0; y <= maxY; y++) {
    const row: MapCell[] = [];
    for (let x = 0; x <= maxX; x++) {
      row.push({ x, y, status: 'unknown', hasPlayer: false });
    }
    grid.push(row);
  }

  // Mark visited rooms
  for (const room of roomList) {
    const cell = grid[room.y]?.[room.x];
    if (!cell) continue;

    const isCurrent = room.x === currentRoom.x && room.y === currentRoom.y;
    cell.roomId = room.roomId;
    cell.exits = room.exits;
    cell.hasPlayer = isCurrent;
    cell.status = isCurrent ? 'current' : room.isExit ? 'exit' : 'visited';
  }

  // Mark unvisited neighbors of visited rooms as adjacent
  for (const room of roomList) {
    for (const exit of room.exits) {
      const offset = directionOffsets[exit];
      if (!offset) continue;
      const nx = room.x + offset[0];
      const ny = room.y + offset[1];
      if (nx < 0 || ny < 0) continue;
      const neighbor = grid[ny]?.[nx];
      if (neighbor && neighbor.status === 'unknown') {
        neighbor.status = 'adjacent';
      }
    }
  }

  return grid;
}
