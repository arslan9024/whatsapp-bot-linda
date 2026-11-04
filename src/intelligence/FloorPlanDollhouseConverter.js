/**
 * @file FloorPlanDollhouseConverter.js
 * @description Translates 2D floor plan room polygons and dimensions into 3D isometric
 * dollhouse meshes and WebGL viewport camera definitions for Web UI rendering.
 * Category: Intelligence
 */

export class FloorPlanDollhouseConverter {
  /**
   * Converts a collection of 2D rooms into a 3D isometric layout definition
   * @param {Array<{ name: string, widthMeters: number, lengthMeters: number, ceilingHeightMeters?: number }>} rooms
   * @returns {Object} 3D scene descriptor
   */
  generateDollhouseScene(rooms = []) {
    let totalAreaSqM = 0;
    const roomEntities = rooms.map((r, i) => {
      const area = (r.widthMeters || 4) * (r.lengthMeters || 4);
      totalAreaSqM += area;
      return {
        id: `room_${i + 1}`,
        name: r.name || 'Room',
        dimensions: {
          width: r.widthMeters || 4,
          length: r.lengthMeters || 4,
          height: r.ceilingHeightMeters || 3.2
        },
        areaSqM: Math.round(area * 10) / 10,
        position: { x: i * 5, y: 0, z: 0 }
      };
    });

    return {
      totalAreaSqFt: Math.round(totalAreaSqM * 10.764),
      cameraAngle: 'isometric_45_deg',
      ceilingVisible: false,
      wallThicknessMeters: 0.2,
      rooms: roomEntities
    };
  }
}

export default new FloorPlanDollhouseConverter();
