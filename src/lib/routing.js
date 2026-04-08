/**
 * Routing utilities untuk indoor wayfinding
 * Bekerja dengan koordinat lokal (CAD) dan GPS
 */

/**
 * Hitung centroid (titik tengah) dari polygon
 * Mendukung Polygon dan MultiPolygon
 */
export function getPolygonCentroid(feature) {
  if (!feature || !feature.geometry || !feature.geometry.coordinates) return null;

  const geomType = feature.geometry.type;
  let ring;

  if (geomType === 'Polygon') {
    ring = feature.geometry.coordinates[0];
  } else if (geomType === 'MultiPolygon') {
    // Ambil ring pertama dari polygon pertama
    ring = feature.geometry.coordinates[0][0];
  } else {
    return null;
  }

  if (!ring || ring.length === 0) return null;

  let sumX = 0, sumY = 0, count = 0;
  for (const coord of ring) {
    sumX += coord[0];
    sumY += coord[1];
    count++;
  }

  // Jangan hitung titik terakhir jika sama dengan titik pertama (closed ring)
  if (ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]) {
    sumX -= ring[ring.length - 1][0];
    sumY -= ring[ring.length - 1][1];
    count--;
  }

  return { x: sumX / count, y: sumY / count };
}

/**
 * Hitung jarak Euclidean antara 2 titik (untuk koordinat lokal)
 * @param {Object} a - { x, y }
 * @param {Object} b - { x, y }
 * @returns {number} jarak dalam unit koordinat
 */
export function euclideanDistance(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Konversi jarak koordinat lokal ke meter (estimasi)
 * Asumsi: 1 unit koordinat ≈ 1 mm dalam gambar CAD
 * Sesuaikan faktor ini berdasarkan skala GeoJSON sebenarnya
 */
export function localUnitsToMeters(distance) {
  // Dari data area: kantin utama ~935 x ~1207 unit
  // Jika kantin berukuran ~10m x 12m, maka 1 unit ≈ 0.01 meter
  // Sesuaikan scale factor ini sesuai skala CAD sebenarnya
  const SCALE_FACTOR = 0.01; // 1 unit = ~0.01 meter = 1 cm
  return distance * SCALE_FACTOR;
}

/**
 * Estimasi waktu jalan (menit) berdasarkan jarak
 * Kecepatan jalan rata-rata: ~1.2 m/s (72 m/min)
 */
export function estimateWalkingTime(distanceMeters) {
  const WALKING_SPEED_M_PER_MIN = 72;
  return distanceMeters / WALKING_SPEED_M_PER_MIN;
}

/**
 * Format jarak untuk tampilan
 */
export function formatDistance(meters) {
  if (meters < 1) return '< 1 m';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Format waktu untuk tampilan
 */
export function formatTime(minutes) {
  if (minutes < 1) return '< 1 mnt';
  if (minutes < 60) return `${Math.round(minutes)} mnt`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours} jam ${mins} mnt` : `${hours} jam`;
}

/**
 * Hitung bearing/arah dari titik A ke titik B (dalam derajat)
 * 0° = Utara, 90° = Timur, 180° = Selatan, 270° = Barat
 */
export function bearing(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(dx, dy) * (180 / Math.PI);
  return (angle + 360) % 360;
}

/**
 * Dapatkan arah kompas dari bearing
 */
export function getDirection(bearingDeg) {
  if (bearingDeg >= 337.5 || bearingDeg < 22.5) return 'utara';
  if (bearingDeg >= 22.5 && bearingDeg < 67.5) return 'timur laut';
  if (bearingDeg >= 67.5 && bearingDeg < 112.5) return 'timur';
  if (bearingDeg >= 112.5 && bearingDeg < 157.5) return 'tenggara';
  if (bearingDeg >= 157.5 && bearingDeg < 202.5) return 'selatan';
  if (bearingDeg >= 202.5 && bearingDeg < 247.5) return 'barat daya';
  if (bearingDeg >= 247.5 && bearingDeg < 292.5) return 'barat';
  return 'barat laut';
}

/**
 * Hasilkan instruksi navigasi sederhana (fallback tanpa graph)
 */
export function generateInstructions(from, to, fromName, toName, isLocal = true) {
  const dist = euclideanDistance(from, to);
  const distMeters = isLocal ? localUnitsToMeters(dist) : dist;
  const time = estimateWalkingTime(distMeters);
  const dir = getDirection(bearing(from, to));

  return {
    distance: distMeters,
    distanceFormatted: formatDistance(distMeters),
    time,
    timeFormatted: formatTime(time),
    direction: dir,
    steps: [
      { instruction: `Mulai dari ${fromName || 'posisi Anda'}`, type: 'start' },
      { instruction: `Jalan ke arah ${dir} menuju ${toName}`, type: 'walk', distance: formatDistance(distMeters) },
      { instruction: `Sampai di ${toName}`, type: 'arrive' },
    ],
  };
}

/**
 * Buat rute sederhana (garis lurus) antara 2 titik
 * Mengembalikan array waypoints [{ x, y }]
 */
export function createSimpleRoute(from, to) {
  return [from, to];
}

/**
 * ============================================================
 * GRAPH-BASED PATHFINDING (Dijkstra)
 * ============================================================
 */

/**
 * Build navigation graph dari paths GeoJSON
 * @param {Object} pathsGeoJSON - GeoJSON FeatureCollection dengan Point (nodes) dan LineString (edges)
 * @returns {Object} graph { nodes: {id: {x,y,type,name,room}}, adjacency: {id: [{to, weight}]} }
 */
export function buildGraph(pathsGeoJSON) {
  if (!pathsGeoJSON || !pathsGeoJSON.features) return null;

  const nodes = {};
  const adjacency = {};

  // Pass 1: Extract semua Point nodes
  for (const feature of pathsGeoJSON.features) {
    if (feature.geometry.type === 'Point') {
      const id = feature.properties.id;
      const [x, y] = feature.geometry.coordinates;
      nodes[id] = {
        x, y,
        type: feature.properties.type || 'unknown',
        name: feature.properties.name || '',
        room: feature.properties.room || '',
      };
      adjacency[id] = [];
    }
  }

  // Pass 2: Extract semua LineString edges
  for (const feature of pathsGeoJSON.features) {
    if (feature.geometry.type === 'LineString') {
      const fromId = feature.properties.from;
      const toId = feature.properties.to;

      if (!nodes[fromId] || !nodes[toId]) continue;

      const weight = euclideanDistance(nodes[fromId], nodes[toId]);

      // Bidirectional edge
      adjacency[fromId].push({ to: toId, weight });
      adjacency[toId].push({ to: fromId, weight });
    }
  }

  return { nodes, adjacency };
}

/**
 * Cari node terdekat dari posisi {x, y}
 * @param {Object} graph - dari buildGraph()
 * @param {Object} pos - { x, y }
 * @returns {string|null} node ID terdekat
 */
export function findNearestNode(graph, pos) {
  if (!graph || !graph.nodes) return null;

  let bestId = null;
  let bestDist = Infinity;

  for (const [id, node] of Object.entries(graph.nodes)) {
    const d = euclideanDistance(pos, node);
    if (d < bestDist) {
      bestDist = d;
      bestId = id;
    }
  }

  return bestId;
}

/**
 * Dijkstra shortest path
 * @param {Object} graph - dari buildGraph()
 * @param {string} startId - node ID awal
 * @param {string} endId - node ID tujuan
 * @returns {Object|null} { path: [nodeId, ...], distance: number, waypoints: [{x,y}, ...] }
 */
export function dijkstra(graph, startId, endId) {
  if (!graph || !graph.adjacency[startId] || !graph.adjacency[endId]) return null;

  const dist = {};
  const prev = {};
  const visited = new Set();

  // Simple priority queue (array-based, sufficient for small graphs)
  const queue = [];

  for (const id of Object.keys(graph.nodes)) {
    dist[id] = Infinity;
  }
  dist[startId] = 0;
  queue.push({ id: startId, dist: 0 });

  while (queue.length > 0) {
    // Pop node with smallest distance
    queue.sort((a, b) => a.dist - b.dist);
    const current = queue.shift();

    if (visited.has(current.id)) continue;
    visited.add(current.id);

    if (current.id === endId) break;

    for (const edge of graph.adjacency[current.id]) {
      if (visited.has(edge.to)) continue;

      const newDist = dist[current.id] + edge.weight;
      if (newDist < dist[edge.to]) {
        dist[edge.to] = newDist;
        prev[edge.to] = current.id;
        queue.push({ id: edge.to, dist: newDist });
      }
    }
  }

  // Reconstruct path
  if (dist[endId] === Infinity) return null;

  const path = [];
  let current = endId;
  while (current) {
    path.unshift(current);
    current = prev[current];
  }

  const waypoints = path.map(id => ({
    x: graph.nodes[id].x,
    y: graph.nodes[id].y,
  }));

  return {
    path,
    distance: dist[endId],
    waypoints,
  };
}

/**
 * Hitung rute lengkap dari posisi user ke tujuan menggunakan graph
 * @param {Object} from - { x, y } posisi awal
 * @param {Object} to - { x, y } posisi tujuan
 * @param {Object} graph - dari buildGraph()
 * @param {string} fromName - nama lokasi awal
 * @param {string} toName - nama lokasi tujuan
 * @param {boolean} isLocal - koordinat lokal?
 * @returns {Object} { waypoints, routeInfo }
 */
export function calculateRoute(from, to, graph, fromName, toName, isLocal = true) {
  // Jika tidak ada graph, fallback ke garis lurus
  if (!graph) {
    return {
      waypoints: [from, to],
      routeInfo: generateInstructions(from, to, fromName, toName, isLocal),
    };
  }

  // Cari node terdekat dari posisi awal dan tujuan
  const startNode = findNearestNode(graph, from);
  const endNode = findNearestNode(graph, to);

  if (!startNode || !endNode) {
    return {
      waypoints: [from, to],
      routeInfo: generateInstructions(from, to, fromName, toName, isLocal),
    };
  }

  // Jalankan Dijkstra
  const result = dijkstra(graph, startNode, endNode);

  if (!result) {
    return {
      waypoints: [from, to],
      routeInfo: generateInstructions(from, to, fromName, toName, isLocal),
    };
  }

  // Tambah posisi awal dan akhir yang sebenarnya (bukan node graph)
  const waypoints = [from, ...result.waypoints, to];

  // Hitung total jarak (termasuk segment awal & akhir)
  let totalDist = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    totalDist += euclideanDistance(waypoints[i], waypoints[i + 1]);
  }

  const distMeters = isLocal ? localUnitsToMeters(totalDist) : totalDist;
  const time = estimateWalkingTime(distMeters);

  // Generate langkah-langkah navigasi
  const steps = [
    { instruction: `Mulai dari ${fromName || 'posisi Anda'}`, type: 'start' },
  ];

  // Tambah step untuk setiap segment penting
  for (let i = 0; i < result.path.length; i++) {
    const nodeId = result.path[i];
    const node = graph.nodes[nodeId];

    if (node.type === 'door') {
      steps.push({
        instruction: `Lewati ${node.name || 'pintu'}`,
        type: 'door',
      });
    } else if (node.type === 'corridor' && i > 0 && i < result.path.length - 1) {
      // Hitung arah belokan
      const prev = graph.nodes[result.path[i - 1]];
      const next = graph.nodes[result.path[i + 1]];
      const bearingIn = bearing(prev, node);
      const bearingOut = bearing(node, next);
      let turn = bearingOut - bearingIn;
      if (turn < -180) turn += 360;
      if (turn > 180) turn -= 360;

      if (Math.abs(turn) > 30) {
        const turnDir = turn > 0 ? 'kanan' : 'kiri';
        steps.push({
          instruction: `Belok ${turnDir} di ${node.name || 'persimpangan'}`,
          type: 'turn',
        });
      } else {
        steps.push({
          instruction: `Lurus di ${node.name || 'koridor'}`,
          type: 'walk',
        });
      }
    }
  }

  steps.push({
    instruction: `Sampai di ${toName}`,
    type: 'arrive',
  });

  return {
    waypoints,
    routeInfo: {
      distance: distMeters,
      distanceFormatted: formatDistance(distMeters),
      time,
      timeFormatted: formatTime(time),
      direction: getDirection(bearing(from, waypoints[1])),
      steps,
    },
  };
}

/**
 * Ekstrak daftar ruangan dari areaData GeoJSON (Polygon areas)
 * @param {Object} areaData - GeoJSON FeatureCollection
 * @returns {Array} daftar ruangan dengan centroid
 */
export function extractRooms(areaData) {
  if (!areaData || !areaData.features) return [];

  return areaData.features
    .map((feature) => {
      const centroid = getPolygonCentroid(feature);
      if (!centroid) return null;

      return {
        id: feature.properties.id,
        name: feature.properties.RUANGAN || feature.properties.name || 'Unknown',
        type: feature.properties.type || 'unknown',
        roomnumber: feature.properties.roomnumber || '-',
        centroid,
        feature,
      };
    })
    .filter(Boolean);
}

/**
 * Ekstrak daftar ruangan dari pathsData GeoJSON (Point features with type "room")
 * Menggunakan data dari lantai-1-endpoint.geojson yang di-embed di paths graph
 * @param {Object} pathsData - GeoJSON FeatureCollection (navigation graph)
 * @returns {Array} daftar ruangan dengan centroid
 */
export function extractRoomsFromPaths(pathsData) {
  if (!pathsData || !pathsData.features) return [];

  // Tipe yang bukan ruangan (skip)
  const SKIP_NAMES = new Set([
    '', 'KORIDOR', 'SELAASR', 'LOBBY', 'LOBBY LIFT',
  ]);

  // Map nama ke tipe untuk styling
  const nameToType = {
    'KANTIN': 'kantin',
    'MUSHOLA': 'mushola',
    'IGD': 'igd',
    'IGD ANAK': 'igd',
    'IGM': 'igd',
    'FARMASI': 'farmasi',
    'APOTEK': 'farmasi',
    'LABOLATORIUM': 'lab',
    'RADIOLOGI': 'radiology',
    'R. RAWAT INAP': 'rawat_inap',
    'R. BERSALIN': 'rawat_inap',
    'RUANG BAYI': 'rawat_inap',
    'R. PISIOTERAPI': 'rawat_inap',
    'KAMAR ISOLASI': 'icu',
    'R. OPRASI': 'operasi',
    'R. DOKTER': 'office',
    'R. PERAWATAN': 'office',
    'R. KEUANGAN': 'office',
    'R. REKAM MEDIK': 'office',
    'R. K3 & KESLING': 'office',
    'RESEPSIONIS': 'office',
    'RUANG IT': 'office',
    'R. TRIASE': 'igd',
    'R.BANK DARAH': 'lab',
    'R. GIZI': 'kantin',
    'R. LAUNDRY': 'office',
    'R. CSSD': 'office',
    'R. GANTI': 'office',
    'R. CESMIX': 'office',
    'R. TUNGGU': 'ruang_tunggu',
    'RUANG TUNGGU': 'ruang_tunggu',
    'KM. MAYAT': 'office',
    'TPS': 'office',
    'LIFT': 'lift',
    'LOBBY': 'corridor',
    'LOBBY LIFT': 'lift',
  };

  const rooms = [];
  const seen = new Set(); // Avoid duplicates by coordinate

  for (const feature of pathsData.features) {
    // Only Point features with type "room"
    if (feature.geometry.type !== 'Point') continue;
    if (feature.properties.type !== 'room') continue;

    const name = feature.properties.name || '';
    if (SKIP_NAMES.has(name)) continue;

    const [x, y] = feature.geometry.coordinates;
    const key = `${Math.round(x)},${Math.round(y)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const type = nameToType[name] || 'office';

    rooms.push({
      id: feature.properties.id,
      name: name,
      type: type,
      roomnumber: feature.properties.id || '-',
      centroid: { x, y },
      feature,
    });
  }

  return rooms;
}

/**
 * ============================================================
 * A* PATHFINDING WITH OBSTACLE AVOIDANCE (Grid-based)
 * ============================================================
 */

/**
 * Point dalam polygon test menggunakan ray casting algorithm
 * @param {Object} point - { x, y }
 * @param {Array} polygon - [[x, y], [x, y], ...]
 * @returns {boolean} true jika point ada dalam polygon
 */
function pointInPolygon(point, polygon) {
  const x = point.x;
  const y = point.y;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = (yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Check apakah point berada dalam atau menyentuh dinding polygon
 * @param {Object} point - { x, y }
 * @param {Array} walls - array dari wall features
 * @returns {boolean} true jika point berada dalam obstacle
 */
function isPointInObstacle(point, walls) {
  if (!walls || walls.length === 0) return false;

  for (const wall of walls) {
    const geometry = wall.geometry;
    if (!geometry || !geometry.coordinates) continue;

    // Handle MultiPolygon dan Polygon
    const polygons = geometry.type === 'MultiPolygon'
      ? geometry.coordinates.flat(1) // Flatten ke array of rings
      : geometry.coordinates; // Already array of rings

    for (const ring of polygons) {
      if (pointInPolygon(point, ring)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check jika point berada dalam area yang WALKABLE (KORIDOR, TANGGA, LIFT)
 * @param {Object} point - { x, y }
 * @param {Array} walkableAreas - array dari walkable area features
 * @returns {boolean} true jika dalam walkable area
 */
function isPointInWalkableArea(point, walkableAreas) {
  if (!walkableAreas || walkableAreas.length === 0) return false;

  for (const area of walkableAreas) {
    const geometry = area.geometry;
    if (!geometry || !geometry.coordinates) continue;

    // Handle MultiPolygon dan Polygon
    const polygons = geometry.type === 'MultiPolygon'
      ? geometry.coordinates.flat(1)
      : geometry.coordinates;

    for (const ring of polygons) {
      if (pointInPolygon(point, ring)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Grid-based pathfinding menggunakan A* algorithm
 * Optimized untuk indoor pathfinding - HANYA walk melalui KORIDOR/TANGGA/LIFT
 * @param {Object} start - { x, y } starting point
 * @param {Object} goal - { x, y } goal point
 * @param {Array} walls - array dari wall features (obstacles)
 * @param {Array} walkableAreas - array dari walkable area features (KORIDOR, TANGGA, LIFT)
 * @param {number} gridSize - ukuran grid cell (default 50 units untuk presisi)
 * @returns {Array} array of waypoints atau null jika tidak ada path
 */
export function findPathWithObstacles(start, goal, walls, walkableAreas, gridSize = 50) {
  if (!start || !goal) return null;

  console.log(`🔍 A* Pathfinding: walls=${walls?.length || 0}, walkableAreas=${walkableAreas?.length || 0}, gridSize=${gridSize}`);

  // Check jika goal dapat dicapai langsung
  if (!isPointInObstacle(start, walls) && !isPointInObstacle(goal, walls)) {
    const directDist = euclideanDistance(start, goal);
    if (directDist < 2000) {
      console.log(`✅ Direct path (< 2000 units)`);
      return [start, goal];
    }
  }

  // A* implementation dengan KORIDOR constraint
  const openSet = new Set();
  const closedSet = new Set();
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();

  const key = (p) => `${Math.round(p.x / gridSize)},${Math.round(p.y / gridSize)}`;
  const heuristic = (a, b) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const startKey = key(start);
  const goalKey = key(goal);

  gScore.set(startKey, 0);
  fScore.set(startKey, heuristic(start, goal));
  openSet.add(startKey);

  const nodes = new Map();
  nodes.set(startKey, start);

  let iterations = 0;
  const maxIterations = 2000;

  while (openSet.size > 0 && iterations < maxIterations) {
    iterations++;

    let current = null;
    let currentKey = null;
    let lowestF = Infinity;

    for (const k of openSet) {
      const f = fScore.get(k) || Infinity;
      if (f < lowestF) {
        lowestF = f;
        currentKey = k;
        current = nodes.get(k);
      }
    }

    if (!current) break;

    // Check jika sampai goal
    if (heuristic(current, goal) < gridSize * 2) {
      const path = [goal];
      let curr = current;
      let currKey = currentKey;

      while (cameFrom.has(currKey)) {
        currKey = cameFrom.get(currKey);
        curr = nodes.get(currKey);
        path.unshift(curr);
      }

      console.log(`✅ A* Path found: ${path.length} waypoints (iterations=${iterations})`);
      return path;
    }

    openSet.delete(currentKey);
    closedSet.add(currentKey);

    // Generate neighbors (4 directions)
    const directions = [
      { x: gridSize, y: 0 },
      { x: -gridSize, y: 0 },
      { x: 0, y: gridSize },
      { x: 0, y: -gridSize },
    ];

    for (const dir of directions) {
      const neighbor = {
        x: current.x + dir.x,
        y: current.y + dir.y
      };

      const neighborKey = key(neighbor);

      // ✅ CONSTRAINT: Skip jika dalam wall ATAU tidak dalam walkable area (KORIDOR/TANGGA/LIFT)
      if (closedSet.has(neighborKey) || isPointInObstacle(neighbor, walls)) {
        continue;
      }

      // ✅ HANYA walk through KORIDOR/TANGGA/LIFT (walkable areas)
      if (walkableAreas && walkableAreas.length > 0) {
        if (!isPointInWalkableArea(neighbor, walkableAreas)) {
          continue; // Skip jika tidak dalam walkable area
        }
      }

      const tentativeG = (gScore.get(currentKey) || Infinity) + gridSize;
      const neighborG = gScore.get(neighborKey) || Infinity;

      if (tentativeG < neighborG) {
        cameFrom.set(neighborKey, currentKey);
        gScore.set(neighborKey, tentativeG);
        const h = heuristic(neighbor, goal);
        fScore.set(neighborKey, tentativeG + h);
        nodes.set(neighborKey, neighbor);

        if (!openSet.has(neighborKey)) {
          openSet.add(neighborKey);
        }
      }
    }
  }

  console.log(`❌ A* No path found (iterations=${iterations}, openSet=${openSet.size})`);
  return null; // No path found
}

/**
 * ============================================================
 * CENTROID-BASED PATHFINDING (Seperti Revit)
 * ============================================================
 */

/**
 * Extract semua PINTU (doors) dari GeoJSON
 * Doors akan menjadi waypoint intermediary untuk routing
 * @param {Object} areaData - GeoJSON FeatureCollection
 * @returns {Array} array of { id, centroid, feature }
 */
export function extractDoors(areaData) {
  if (!areaData || !areaData.features) return [];

  const doors = [];
  for (const feature of areaData.features) {
    const name = feature.properties.RUANGAN || feature.properties.name || '';
    if (name.toUpperCase().includes('PINTU') || name.toUpperCase().includes('DOOR')) {
      const centroid = getPolygonCentroid(feature);
      if (centroid) {
        doors.push({
          id: `door_${doors.length}`,
          centroid,
          feature,
          name: name
        });
      }
    }
  }
  return doors;
}

/**
 * Extract semua DINDING (walls) dari GeoJSON
 * Walls adalah barriers yang tidak boleh dilewati
 * @param {Object} areaData - GeoJSON FeatureCollection
 * @returns {Array} array of { id, feature, geometry }
 */
export function extractWalls(areaData) {
  if (!areaData || !areaData.features) return [];

  const walls = [];
  for (const feature of areaData.features) {
    const name = feature.properties.RUANGAN || feature.properties.name || '';
    if (name.toUpperCase().includes('DINDING') || name.toUpperCase().includes('WALL')) {
      walls.push({
        id: `wall_${walls.length}`,
        feature,
        geometry: feature.geometry
      });
    }
  }
  return walls;
}

/**
 * Extract semua area yang bisa dilalui (KORIDOR, TANGGA, LIFT)
 * Ini adalah walkable pathways untuk A* routing constraint
 * @param {Object} areaData - GeoJSON FeatureCollection
 * @returns {Array} array of walkable area features
 */
export function extractWalkableAreas(areaData) {
  if (!areaData || !areaData.features) return [];

  const walkableKeywords = ['KORIDOR', 'TANGGA', 'LIFT', 'LOBBY', 'JALAN', 'PASSAGE'];
  const nonWalkableKeywords = ['DINDING', 'WALL'];

  const walkable = [];
  for (const feature of areaData.features) {
    const name = feature.properties.RUANGAN || feature.properties.name || '';
    const nameUpper = name.toUpperCase();
    const walkableProp = feature.properties.walkable;

    // Skip jika DINDING atau walkable: false
    if (nonWalkableKeywords.some(k => nameUpper.includes(k)) || walkableProp === false) {
      continue;
    }

    // Include jika walkable: true OR nama adalah KORIDOR/TANGGA/LIFT
    if (walkableProp === true || walkableKeywords.some(k => nameUpper.includes(k))) {
      walkable.push(feature);
    }
  }

  return walkable;
}

/**
 * Check apakah line segment menembus dinding
 * Menggunakan simple bounding box intersection check
 * @param {Object} from - { x, y }
 * @param {Object} to - { x, y }
 * @param {Array} walls - array dari wall objects
 * @returns {boolean} true jika line menembus wall
 */
export function lineIntersectsWall(from, to, walls) {
  if (!walls || walls.length === 0) return false;

  // Get line bounding box
  const lineBBox = {
    minX: Math.min(from.x, to.x),
    maxX: Math.max(from.x, to.x),
    minY: Math.min(from.y, to.y),
    maxY: Math.max(from.y, to.y)
  };

  for (const wall of walls) {
    const geometry = wall.geometry;
    if (!geometry || !geometry.coordinates) continue;

    // Get wall bounding box
    const wallBBox = getBoundingBox(geometry.coordinates);
    if (!wallBBox) continue;

    // Quick check: do bounding boxes overlap?
    if (!(lineBBox.maxX < wallBBox.minX ||
      lineBBox.minX > wallBBox.maxX ||
      lineBBox.maxY < wallBBox.minY ||
      lineBBox.minY > wallBBox.maxY)) {
      // Bounding boxes overlap, but line might still not intersect polygon
      // For now, treat as potential intersection to be safe
      // (More precise polygon-line intersection would be complex)
      return true;
    }
  }

  return false;
}

/**
 * Get bounding box dari koordinat polygon/multipolygon
 * @param {Array} coords - koordinat dari geometry
 * @returns {Object} { minX, maxX, minY, maxY } atau null
 */
function getBoundingBox(coords) {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  function processRing(ring) {
    for (const point of ring) {
      minX = Math.min(minX, point[0]);
      maxX = Math.max(maxX, point[0]);
      minY = Math.min(minY, point[1]);
      maxY = Math.max(maxY, point[1]);
    }
  }

  // Handle Polygon (coords[0] is outer ring)
  if (Array.isArray(coords[0]) && Array.isArray(coords[0][0]) && typeof coords[0][0][0] === 'number') {
    // Could be Polygon or MultiPolygon
    if (Array.isArray(coords[0][0][0])) {
      // MultiPolygon: coords = [[[ring]], [[ring]]]
      for (const polygon of coords) {
        for (const ring of polygon) {
          processRing(ring);
        }
      }
    } else {
      // Polygon: coords = [[ring1, ring2...]]
      for (const ring of coords) {
        processRing(ring);
      }
    }
  }

  if (minX === Infinity) return null;
  return { minX, maxX, minY, maxY };
}

/**
 * Find nearest door untuk sebuah room
 * @param {Object} roomCentroid - { x, y }
 * @param {Array} doors - array dari door objects
 * @returns {Object} nearest door atau null
 */
function findNearestDoor(roomCentroid, doors) {
  if (!doors || doors.length === 0) return null;

  let nearest = null;
  let minDist = Infinity;

  for (const door of doors) {
    const dist = euclideanDistance(roomCentroid, door.centroid);
    if (dist < minDist) {
      minDist = dist;
      nearest = door;
    }
  }

  return nearest;
}

/**
 * Build door-aware navigation graph
 * Rooms dihubungkan melalui doors, bukan langsung
 * @param {Object} areaData - GeoJSON FeatureCollection
 * @param {number} maxDoorDistance - jarak max dari room ke door (default 1500 unit)
 * @param {number} maxDoorToDoor - jarak max antar doors (default 8000 unit)
 * @returns {Object} graph dengan doors sebagai intermediate nodes
 */
export function buildDoorAwareGraph(areaData, maxDoorDistance = 1500, maxDoorToDoor = 8000) {
  if (!areaData || !areaData.features) return null;

  const nodes = {};
  const adjacency = {};
  const pathWaypoints = {};
  const doors = extractDoors(areaData);
  const walls = extractWalls(areaData);
  const walkableAreas = extractWalkableAreas(areaData); // ✅ NEW: Extract KORIDOR, TANGGA, LIFT

  console.log(`🛣️ buildDoorAwareGraph: doors=${doors.length}, walls=${walls.length}, walkableAreas=${walkableAreas.length}`);

  const rooms = [];

  // Extract rooms (skip PINTU, DINDING, KORIDOR)
  for (const feature of areaData.features) {
    const centroid = getPolygonCentroid(feature);
    if (!centroid) continue;

    const name = feature.properties.RUANGAN || feature.properties.name || 'Unknown';
    const skipNames = ['DINDING', 'PINTU', 'DOOR', 'KORIDOR', 'TANGGA', 'STAIRS', 'LIFT', 'TOILET', 'BALKON'];
    if (skipNames.some(skip => name.toUpperCase().includes(skip))) continue;

    const id = `room_${feature.properties.id || Date.now()}`;
    nodes[id] = {
      x: centroid.x,
      y: centroid.y,
      type: 'room',
      name: name,
      feature: feature
    };
    adjacency[id] = [];
    rooms.push({ id, name, centroid });
  }

  // Add door nodes
  for (const door of doors) {
    const id = door.id;
    nodes[id] = {
      x: door.centroid.x,
      y: door.centroid.y,
      type: 'door',
      name: door.name,
      feature: door.feature
    };
    adjacency[id] = [];
  }

  // Connect rooms to nearest doors
  for (const room of rooms) {
    const nearest = findNearestDoor(room.centroid, doors);
    if (nearest && euclideanDistance(room.centroid, nearest.centroid) <= maxDoorDistance) {
      const dist = euclideanDistance(room.centroid, nearest.centroid);
      adjacency[room.id].push({ to: nearest.id, weight: dist });
      adjacency[nearest.id].push({ to: room.id, weight: dist });

      // Store direct waypoints for room-to-door
      const edgeKey = `${room.id}-${nearest.id}`;
      pathWaypoints[edgeKey] = [room.centroid, nearest.centroid];
    }
  }

  // Connect doors to nearby doors using A* pathfinding to avoid walls
  for (let i = 0; i < doors.length; i++) {
    for (let j = i + 1; j < doors.length; j++) {
      const dist = euclideanDistance(doors[i].centroid, doors[j].centroid);

      // Quick pre-check: distance threshold
      if (dist > maxDoorToDoor) continue;

      // Use A* to find path between doors that avoids walls and ONLY uses KORIDOR
      const path = findPathWithObstacles(doors[i].centroid, doors[j].centroid, walls, walkableAreas, 50);

      // If A* finds a valid path (through KORIDOR only)
      if (path && path.length > 0) {
        // Calculate actual path distance
        let pathDist = 0;
        for (let k = 0; k < path.length - 1; k++) {
          pathDist += euclideanDistance(path[k], path[k + 1]);
        }

        // ✅ NEW: Store A* waypoints!
        const edgeKey1 = `${doors[i].id}-${doors[j].id}`;
        const edgeKey2 = `${doors[j].id}-${doors[i].id}`;
        pathWaypoints[edgeKey1] = path;
        pathWaypoints[edgeKey2] = [...path].reverse();

        adjacency[doors[i].id].push({ to: doors[j].id, weight: pathDist });
        adjacency[doors[j].id].push({ to: doors[i].id, weight: pathDist });
      }
    }
  }

  return { nodes, adjacency, doors, walls, pathWaypoints }; // NEW: return pathWaypoints
}

/**
 * Build navigation graph dari area GeoJSON berdasarkan centroid
 * Menghubungkan ruangan yang berdekatan (proximity-based)
 * @param {Object} areaData - GeoJSON FeatureCollection (lantai-1-area.geojson)
 * @param {number} maxDistance - jarak maksimal untuk edge (default 5000 unit)
 * @returns {Object} graph { nodes, adjacency }
 */
export function buildGraphFromAreas(areaData, maxDistance = 5000) {
  if (!areaData || !areaData.features) return null;

  const nodes = {};
  const adjacency = {};
  const rooms = [];

  // Pass 1: Extract centroid setiap ruangan
  for (const feature of areaData.features) {
    const centroid = getPolygonCentroid(feature);
    if (!centroid) continue;

    const id = `room_${feature.properties.id || feature.properties.RUANGAN || Date.now()}`;
    const name = feature.properties.RUANGAN || feature.properties.name || 'Unknown';

    // Skip dinding, pintu, dan koridor (hanya ambil ruangan)
    const skipNames = ['DINDING', 'PINTU', 'DOOR', 'KORIDOR', '0'];
    if (skipNames.some(skip => name.toUpperCase().includes(skip))) continue;

    nodes[id] = {
      x: centroid.x,
      y: centroid.y,
      type: 'room',
      name: name,
      room: name,
      feature: feature,
    };

    adjacency[id] = [];
    rooms.push({ id, name, centroid });
  }

  // Pass 2: Hubungkan ruangan yang berdekatan
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const dist = euclideanDistance(rooms[i].centroid, rooms[j].centroid);

      if (dist <= maxDistance && dist > 0) {
        // Bidirectional edge
        adjacency[rooms[i].id].push({ to: rooms[j].id, weight: dist });
        adjacency[rooms[j].id].push({ to: rooms[i].id, weight: dist });
      }
    }
  }

  return { nodes, adjacency };
}

/**
 * Cari rute tercepat antara 2 ruangan (seperti Revit)
 * Menggunakan door-aware routing jika ada doors, fallback ke proximity-based
 * @param {string} fromRoom - nama ruangan awal (e.g., "kantin")
 * @param {string} toRoom - nama ruangan tujuan (e.g., "igm")
 * @param {Object} areaData - GeoJSON FeatureCollection (lantai-1-area.geojson)
 * @param {number} maxDistance - jarak maksimal untuk edge
 * @param {boolean} useDoorAwareRouting - gunakan door-aware graph (default: true)
 * @returns {Object|null} { waypoints, fromCentroid, toCentroid, routeInfo }
 */
export function findRouteBetweenRooms(fromRoom, toRoom, areaData, maxDistance = 5000, useDoorAwareRouting = true) {
  if (!areaData) return null;

  // Try door-aware routing first jika tersedia
  let graph = null;
  if (useDoorAwareRouting) {
    graph = buildDoorAwareGraph(areaData);
  }

  // Fallback to proximity-based jika door-aware tidak ada doors
  if (!graph) {
    graph = buildGraphFromAreas(areaData, maxDistance);
  }

  if (!graph) return null;

  // Normalize names untuk matching
  const normalize = (str) => {
    return str.toLowerCase().trim()
      .replace(/\s+/g, ' ')
      .replace(/[^a-z0-9\s]/g, '');
  };

  const fromNorm = normalize(fromRoom);
  const toNorm = normalize(toRoom);

  // Cari room IDs berdasarkan nama (exact match first, then fuzzy)
  let fromId = null, toId = null;
  let bestFromScore = -1, bestToScore = -1;

  for (const [id, node] of Object.entries(graph.nodes)) {
    const nodeName = node.name;
    const nodeNorm = normalize(nodeName);

    // Exact match (highest priority)
    if (nodeNorm === fromNorm) {
      fromId = id;
      bestFromScore = 100;
    } else if (bestFromScore < 100) {
      // Partial match scoring
      let score = 0;
      if (nodeNorm.includes(fromNorm)) score += 50;
      if (fromNorm.includes(nodeNorm)) score += 30;
      // Check if they share significant part (first N chars)
      const minLen = Math.min(nodeNorm.length, fromNorm.length);
      if (minLen >= 3) {
        let matchLen = 0;
        for (let i = 0; i < minLen; i++) {
          if (nodeNorm[i] === fromNorm[i]) matchLen++;
          else break;
        }
        if (matchLen >= 3) score += Math.min(20, matchLen);
      }

      if (score > bestFromScore) {
        fromId = id;
        bestFromScore = score;
      }
    }

    // Same logic for toRoom
    if (nodeNorm === toNorm) {
      toId = id;
      bestToScore = 100;
    } else if (bestToScore < 100) {
      let score = 0;
      if (nodeNorm.includes(toNorm)) score += 50;
      if (toNorm.includes(nodeNorm)) score += 30;
      const minLen = Math.min(nodeNorm.length, toNorm.length);
      if (minLen >= 3) {
        let matchLen = 0;
        for (let i = 0; i < minLen; i++) {
          if (nodeNorm[i] === toNorm[i]) matchLen++;
          else break;
        }
        if (matchLen >= 3) score += Math.min(20, matchLen);
      }

      if (score > bestToScore) {
        toId = id;
        bestToScore = score;
      }
    }
  }

  if (!fromId || !toId) {
    console.warn(`🔴 Room not found: fromRoom="${fromRoom}" (${fromId}), toRoom="${toRoom}" (${toId})`);
    console.warn(`   Available rooms:`, Object.values(graph.nodes).map(n => n.name).join(', '));
    return null;
  }

  console.log(`🟢 Found rooms: ${fromRoom} (${fromId}) → ${toRoom} (${toId})`);

  // Jalankan Dijkstra
  const result = dijkstra(graph, fromId, toId);
  if (!result) {
    console.warn(`⚠️  No route found between ${fromRoom} and ${toRoom}`);
    return null;
  }

  // Extract info
  const fromCentroid = graph.nodes[fromId];
  const toCentroid = graph.nodes[toId];

  const waypoints = result.waypoints;
  const distMeters = localUnitsToMeters(result.distance);
  const time = estimateWalkingTime(distMeters);

  // Generate steps berdasarkan room path
  const steps = [
    { instruction: `Mulai dari ${fromRoom}`, type: 'start' },
  ];

  for (let i = 1; i < result.path.length - 1; i++) {
    const node = graph.nodes[result.path[i]];

    // Special handling untuk doors
    if (node.type === 'door') {
      steps.push({
        instruction: `Lewati pintu di ${node.name}`,
        type: 'door',
      });
    } else {
      steps.push({
        instruction: `Lewati area ${node.name}`,
        type: 'waypoint',
      });
    }
  }

  steps.push({
    instruction: `Sampai di ${toRoom}`,
    type: 'arrive',
  });

  return {
    waypoints,
    fromCentroid,
    toCentroid,
    routeInfo: {
      distance: distMeters,
      distanceFormatted: formatDistance(distMeters),
      time,
      timeFormatted: formatTime(time),
      steps,
      path: result.path,
    },
  };
}

/**
 * ============================================================
 * PATHWAY-BASED ROUTING (LineString Paths)
 * ============================================================
 * 
 * Lebih akurat daripada A* on areas
 * Menggunakan explicit LineString paths (seperti jalan di Google Maps)
 */

/**
 * Build navigation graph dari LineString paths
 * @param {Object} pathsData - GeoJSON dengan LineString features (lantai-4-paths.geojson)
 * @param {Object} areaData - GeoJSON dengan area/room features (lantai-4-area.geojson)
 * @returns {Object} { nodes, adjacency, pathWaypoints }
 */
export function buildGraphFromPaths(pathsData, areaData) {
  if (!pathsData || !pathsData.features || !areaData) return null;

  const nodes = {};
  const adjacency = {};
  const pathWaypoints = {}; // Store full waypoint sequences for each edge

  // Step 1: Extract room centroids dari area data
  const roomMap = {}; // { "R. RAWAT INAP": { centroid, feature } }

  for (const feature of areaData.features) {
    const centroid = getPolygonCentroid(feature);
    if (!centroid) continue;

    const name = feature.properties.RUANGAN || feature.properties.name || 'Unknown';
    const skipNames = ['DINDING', 'PINTU', 'DOOR', 'KORIDOR', 'TANGGA', 'STAIRS', 'LIFT', '0'];
    if (skipNames.some(skip => name.toUpperCase().includes(skip))) continue;

    if (!roomMap[name]) {
      roomMap[name] = { centroid, feature };
    }
  }

  // Add room nodes ke graph
  for (const [roomName, roomData] of Object.entries(roomMap)) {
    const id = `room_${roomName.replace(/\s+/g, '_')}`;
    nodes[id] = {
      x: roomData.centroid.x,
      y: roomData.centroid.y,
      type: 'room',
      name: roomName,
    };
    adjacency[id] = [];
  }

  // Step 2: Extract waypoints dari LineString paths
  const pathWaypointMap = {}; // { pathId: [ [x,y], [x,y], ... ] }

  for (const feature of pathsData.features) {
    if (feature.geometry.type !== 'LineString') continue;

    const pathId = feature.properties.id || `path_${Date.now()}`;
    const coords = feature.geometry.coordinates;

    pathWaypointMap[pathId] = coords;
  }

  // Step 3: Build graph by connecting rooms to paths and paths to paths
  const roomNodeIds = Object.keys(nodes).filter(id => nodes[id].type === 'room');

  for (let i = 0; i < roomNodeIds.length; i++) {
    const room1Id = roomNodeIds[i];
    const room1 = nodes[room1Id];

    // Find nearest path point untuk room1
    let nearestPath1 = null;
    let nearestDist1 = Infinity;
    let nearestPathId1 = null;
    let nearestPathIdx1 = -1;

    for (const [pathId, pathCoords] of Object.entries(pathWaypointMap)) {
      for (let j = 0; j < pathCoords.length; j++) {
        const [x, y] = pathCoords[j];
        const dist = euclideanDistance(room1, { x, y });

        if (dist < nearestDist1) {
          nearestDist1 = dist;
          nearestPath1 = { x, y };
          nearestPathId1 = pathId;
          nearestPathIdx1 = j;
        }
      }
    }

    // Connect room1 to nearest path if close enough
    if (nearestPath1 && nearestDist1 < 500) { // 500 unit threshold
      const pathNodeId = `waypoint_${nearestPathId1}_${nearestPathIdx1}`;

      // Create intermediate waypoint node if it doesn't exist
      if (!nodes[pathNodeId]) {
        nodes[pathNodeId] = {
          x: nearestPath1.x,
          y: nearestPath1.y,
          type: 'waypoint',
          pathId: nearestPathId1,
          pathIndex: nearestPathIdx1,
        };
        adjacency[pathNodeId] = [];
      }

      // Connect room to waypoint
      adjacency[room1Id].push({ to: pathNodeId, weight: nearestDist1 });
      adjacency[pathNodeId].push({ to: room1Id, weight: nearestDist1 });

      const edgeKey = `${room1Id}-${pathNodeId}`;
      pathWaypoints[edgeKey] = [room1, nearestPath1];
    }

    // Connect to other rooms through paths
    for (let j = i + 1; j < roomNodeIds.length; j++) {
      const room2Id = roomNodeIds[j];
      const room2 = nodes[room2Id];

      // Find nearest path point untuk room2
      let nearestPath2 = null;
      let nearestDist2 = Infinity;
      let nearestPathId2 = null;
      let nearestPathIdx2 = -1;

      for (const [pathId, pathCoords] of Object.entries(pathWaypointMap)) {
        for (let k = 0; k < pathCoords.length; k++) {
          const [x, y] = pathCoords[k];
          const dist = euclideanDistance(room2, { x, y });

          if (dist < nearestDist2) {
            nearestDist2 = dist;
            nearestPath2 = { x, y };
            nearestPathId2 = pathId;
            nearestPathIdx2 = k;
          }
        }
      }

      // If both rooms connect to path network, create connection
      if (nearestPath1 && nearestPath2 && nearestPathId1 === nearestPathId2) {
        // Both on same path
        const pathCoords = pathWaypointMap[nearestPathId1];
        const idx1 = nearestPathIdx1;
        const idx2 = nearestPathIdx2;

        // Calculate distance along path
        let pathDist = 0;
        const minIdx = Math.min(idx1, idx2);
        const maxIdx = Math.max(idx1, idx2);

        for (let k = minIdx; k < maxIdx; k++) {
          pathDist += euclideanDistance(
            { x: pathCoords[k][0], y: pathCoords[k][1] },
            { x: pathCoords[k + 1][0], y: pathCoords[k + 1][1] }
          );
        }

        // Store waypoints along path
        const pathWayBetween = [];
        for (let k = minIdx; k <= maxIdx; k++) {
          pathWayBetween.push({ x: pathCoords[k][0], y: pathCoords[k][1] });
        }

        adjacency[room1Id].push({ to: room2Id, weight: pathDist });
        adjacency[room2Id].push({ to: room1Id, weight: pathDist });

        pathWaypoints[`${room1Id}-${room2Id}`] = [room1, ...pathWayBetween, room2];
        pathWaypoints[`${room2Id}-${room1Id}`] = [room2, ...pathWayBetween.reverse(), room1];
      }
    }
  }

  // Connect waypoints pada path yang sama
  for (const [pathId, coords] of Object.entries(pathWaypointMap)) {
    for (let i = 0; i < coords.length - 1; i++) {
      const node1Id = `waypoint_${pathId}_${i}`;
      const node2Id = `waypoint_${pathId}_${i + 1}`;

      // Ensure nodes exist
      if (!nodes[node1Id]) {
        nodes[node1Id] = {
          x: coords[i][0],
          y: coords[i][1],
          type: 'waypoint',
          pathId,
          pathIndex: i,
        };
        adjacency[node1Id] = [];
      }
      if (!nodes[node2Id]) {
        nodes[node2Id] = {
          x: coords[i + 1][0],
          y: coords[i + 1][1],
          type: 'waypoint',
          pathId,
          pathIndex: i + 1,
        };
        adjacency[node2Id] = [];
      }

      const dist = euclideanDistance(
        { x: coords[i][0], y: coords[i][1] },
        { x: coords[i + 1][0], y: coords[i + 1][1] }
      );

      adjacency[node1Id].push({ to: node2Id, weight: dist });
      adjacency[node2Id].push({ to: node1Id, weight: dist });

      // Store exact waypoints for this segment
      pathWaypoints[`${node1Id}-${node2Id}`] = [
        { x: coords[i][0], y: coords[i][1] },
        { x: coords[i + 1][0], y: coords[i + 1][1] }
      ];
    }
  }

  console.log(`🗺️  buildGraphFromPaths: rooms=${roomNodeIds.length}, paths=${Object.keys(pathWaypointMap).length}`);

  return { nodes, adjacency, pathWaypoints };
}

/**
 * Find route menggunakan pathway-based graph (LineString paths)
 * @param {string} fromRoom - nama ruangan awal
 * @param {string} toRoom - nama ruangan tujuan
 * @param {Object} pathsData - GeoJSON dengan LineString paths
 * @param {Object} areaData - GeoJSON dengan area features
 * @returns {Object|null} { waypoints, fromCentroid, toCentroid, routeInfo }
 */
export function findRouteViaPaths(fromRoom, toRoom, pathsData, areaData) {
  if (!pathsData || !areaData) return null;

  const graph = buildGraphFromPaths(pathsData, areaData);
  if (!graph || Object.keys(graph.nodes).length === 0) {
    console.warn('❌ Pathway graph is empty');
    return null;
  }

  // Normalize names untuk matching
  const normalize = (str) => {
    return str.toLowerCase().trim()
      .replace(/\s+/g, ' ')
      .replace(/[^a-z0-9\s]/g, '');
  };

  const fromNorm = normalize(fromRoom);
  const toNorm = normalize(toRoom);

  // Cari room IDs berdasarkan nama
  let fromId = null, toId = null;

  for (const [id, node] of Object.entries(graph.nodes)) {
    if (node.type !== 'room') continue;

    const nodeNorm = normalize(node.name);
    if (nodeNorm === fromNorm) fromId = id;
    if (nodeNorm === toNorm) toId = id;
  }

  if (!fromId || !toId) {
    console.warn(`❌ Room not found: "${fromRoom}" or "${toRoom}"`);
    return null;
  }

  // Run Dijkstra
  const result = dijkstra(graph, fromId, toId);
  if (!result) {
    console.warn(`❌ No path found via pathways from ${fromRoom} to ${toRoom}`);
    return null;
  }

  // Build complete waypoint sequence with actual path coordinates
  let waypoints = [graph.nodes[fromId]];

  for (let i = 0; i < result.path.length - 1; i++) {
    const fromNodeId = result.path[i];
    const toNodeId = result.path[i + 1];
    const edgeKey = `${fromNodeId}-${toNodeId}`;

    if (graph.pathWaypoints[edgeKey]) {
      // Skip first point (already added)
      const edgeWaypoints = graph.pathWaypoints[edgeKey];
      for (let j = 1; j < edgeWaypoints.length; j++) {
        waypoints.push(edgeWaypoints[j]);
      }
    } else {
      // Fallback to direct connection
      waypoints.push(graph.nodes[toNodeId]);
    }
  }

  const fromCentroid = graph.nodes[fromId];
  const toCentroid = graph.nodes[toId];

  // Calculate total distance
  let totalDist = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    totalDist += euclideanDistance(waypoints[i], waypoints[i + 1]);
  }

  const distMeters = localUnitsToMeters(totalDist);
  const time = estimateWalkingTime(distMeters);

  // Generate steps
  const steps = [
    { instruction: `Mulai dari ${fromRoom}`, type: 'start' },
    { instruction: `Ikuti koridor`, type: 'walk' },
    { instruction: `Sampai di ${toRoom}`, type: 'arrive' },
  ];

  return {
    waypoints,
    fromCentroid,
    toCentroid,
    routeInfo: {
      distance: distMeters,
      distanceFormatted: formatDistance(distMeters),
      time,
      timeFormatted: formatTime(time),
      steps,
      path: result.path,
      method: 'pathways', // ✅ Mark that this is pathway-based routing
    },
  };
}
