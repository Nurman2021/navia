'use client';

import { MapContainer, GeoJSON, useMap, Marker, Popup, Polyline } from 'react-leaflet';
import { useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import roomColors, { hospitalRoomStyles, cadStyles } from '@/app/data/roomColors';
import { buildGraphFromAreas, findRouteBetweenRooms, getPolygonCentroid, findRouteViaPaths } from '@/lib/routing';

// Fix untuk icon marker Leaflet di Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Fungsi untuk smooth interpolasi waypoints menggunakan Catmull-Rom spline
function smoothWaypoints(points, smoothFactor = 0.5) {
  if (!points || points.length < 3) return points;

  const smoothed = [];

  for (let i = 0; i < points.length; i++) {
    smoothed.push(points[i]);

    // Interpolasi hanya jika bukan titik terakhir
    if (i < points.length - 1) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i < points.length - 2 ? points[i + 2] : points[i + 1];

      // Buat 4 interpolasi antara p1 dan p2
      const segments = 4;
      for (let t = 1; t < segments; t++) {
        const tt = t / segments;
        const tt2 = tt * tt;
        const tt3 = tt2 * tt;

        // Catmull-Rom formula
        const q = 0.5 * (
          (2 * p1[0]) +
          (-p0[0] + p2[0]) * tt +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * tt2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * tt3
        );
        const r = 0.5 * (
          (2 * p1[1]) +
          (-p0[1] + p2[1]) * tt +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * tt2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * tt3
        );

        smoothed.push([q, r]);
      }
    }
  }

  return smoothed;
}

// Komponen untuk fit bounds ke GeoJSON
function FitBounds({ data, isLocal }) {
  const map = useMap();

  useEffect(() => {
    if (data && data.features && data.features.length > 0) {
      // Untuk koordinat lokal, kita perlu flip coordinates (y, x)
      const coordsToLatLng = isLocal
        ? (coords) => [coords[1], coords[0]]
        : (coords) => [coords[1], coords[0]];

      const geoJsonLayer = L.geoJSON(data, {
        coordsToLatLng: isLocal ? coordsToLatLng : undefined
      });
      const bounds = geoJsonLayer.getBounds();
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [data, map, isLocal]);

  return null;
}

// Komponen untuk center peta ke posisi tertentu
function CenterToPosition({ position, trigger }) {
  const map = useMap();

  useEffect(() => {
    if (position && trigger > 0) {
      map.setView(position, map.getZoom(), { animate: true });
    }
  }, [trigger, position, map]);

  return null;
}

// Custom marker icon untuk posisi user
const userIcon = typeof window !== 'undefined' ? L.divIcon({
  className: 'user-location-icon',
  html: `<div style="
    width: 20px; height: 20px;
    background: #3b82f6;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.3), 0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
}) : null;

// Custom marker icon untuk tujuan (merah)
const destinationIcon = typeof window !== 'undefined' ? L.divIcon({
  className: 'destination-icon',
  html: `<div style="
    width: 32px; height: 32px;
    position: relative;
  ">
    <div style="
      width: 24px; height: 24px;
      background: #ef4444;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 0 0 3px rgba(239,68,68,0.3), 0 2px 8px rgba(0,0,0,0.3);
      position: absolute;
      top: 0; left: 4px;
    "></div>
    <div style="
      width: 0; height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 8px solid #ef4444;
      position: absolute;
      bottom: 0; left: 10px;
    "></div>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
}) : null;

// Komponen untuk fit bounds ke route dengan semua waypoints
function FitBoundsToRoute({ userPos, destPos, routeWaypoints }) {
  const map = useMap();

  useEffect(() => {
    if (routeWaypoints && routeWaypoints.length > 0) {
      // Gunakan semua waypoints untuk compute bounds
      const bounds = L.latLngBounds(routeWaypoints);

      // Tambah user position jika ada
      if (userPos) {
        bounds.extend(userPos);
      }

      // Fit map ke bounds dengan padding
      map.fitBounds(bounds, {
        padding: [100, 100], // 100px padding di semua sisi
        duration: 0.8, // Smooth animation dalam 0.8 detik
        maxZoom: 19 // Jangan zoom lebih dari level 19
      });

      console.log(`🗺️ Map fitted to route with ${routeWaypoints.length} waypoints`);
    } else if (userPos && destPos) {
      // Fallback ke user + destination jika route belum ada
      const bounds = L.latLngBounds([userPos, destPos]);
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 19 });
    }
  }, [routeWaypoints, userPos, destPos, map]);

  return null;
}

// Komponen untuk deteksi posisi user berdasarkan klik di peta
function UserLocationDetector({ areaData, isLocal, onLocationDetected }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const handleClick = (e) => {
      const clickLat = e.latlng.lat;
      const clickLng = e.latlng.lng;

      // Untuk CRS.Simple, koordinat sudah di-flip (lat=y, lng=x)
      // Jadi kita perlu un-flip untuk point-in-polygon check
      const pointX = isLocal ? clickLng : clickLng;
      const pointY = isLocal ? clickLat : clickLat;

      let detectedRoom = null;

      if (areaData && areaData.features) {
        for (const feature of areaData.features) {
          if (!feature.geometry || !feature.geometry.coordinates) continue;

          const geomType = feature.geometry.type;
          let rings = [];

          if (geomType === 'Polygon') {
            rings = [feature.geometry.coordinates[0]];
          } else if (geomType === 'MultiPolygon') {
            rings = feature.geometry.coordinates.map(poly => poly[0]);
          } else {
            continue;
          }

          for (const ring of rings) {
            if (pointInPolygon(pointX, pointY, ring)) {
              detectedRoom = {
                name: feature.properties.RUANGAN || feature.properties.name || 'Unknown',
                type: feature.properties.type || 'unknown',
                roomnumber: feature.properties.roomnumber || '-',
                id: feature.properties.id,
              };
              break;
            }
          }
          if (detectedRoom) break;
        }
      }

      onLocationDetected({
        latlng: e.latlng,
        coords: { x: pointX, y: pointY },
        room: detectedRoom,
      });
    };

    map.on('click', handleClick);
    return () => map.off('click', handleClick);
  }, [map, areaData, isLocal, onLocationDetected]);

  return null;
}

// Ray-casting algorithm untuk point-in-polygon
function pointInPolygon(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Fungsi untuk mendeteksi apakah koordinat menggunakan sistem lokal
function isLocalCoordinateSystem(data) {
  if (!data || !data.features || data.features.length === 0) return false;

  // Ambil koordinat pertama dari feature pertama
  const firstFeature = data.features[0];
  if (!firstFeature.geometry || !firstFeature.geometry.coordinates) return false;

  let coords = firstFeature.geometry.coordinates;

  // Flatten multi-dimensional arrays untuk mendapatkan koordinat
  while (Array.isArray(coords[0])) {
    coords = coords[0];
  }

  if (coords.length < 2) return false;

  const [x, y] = coords;

  // Koordinat lokal biasanya > 360 atau < -180 (di luar range lat/lng yang valid)
  // Latitude valid: -90 to 90, Longitude valid: -180 to 180
  return Math.abs(x) > 360 || Math.abs(y) > 180;
}

export default forwardRef(function Map({ selectedCategory, currentFloor = 'westport-house-floor-gf', qrPosition, centerTrigger, onPositionUpdate, routeDestination, isNavigating, onAreaDataLoaded, onPathsDataLoaded, routeWaypoints }, ref) {
  const [isMounted, setIsMounted] = useState(false);
  const [floorData, setFloorData] = useState(null);
  const [areaData, setAreaData] = useState(null);
  const [pathsData, setPathsData] = useState(null);
  const [centroidData, setCentroidData] = useState(null);
  const [routingGraph, setRoutingGraph] = useState(null);
  const [loading, setLoading] = useState(true);
  const [useLocalCRS, setUseLocalCRS] = useState(false);
  const [userPosition, setUserPosition] = useState(null);
  const [detectedRoom, setDetectedRoom] = useState(null);
  const [hasSeperateAreaFile, setHasSeperateAreaFile] = useState(false); // Track apakah area file terpisah

  // Hitung posisi tujuan (latlng) dari routeDestination
  const destinationPosition = (() => {
    if (!routeDestination || !routeDestination.centroid || !useLocalCRS) return null;
    const { x, y } = routeDestination.centroid;
    return L.latLng(y, x); // CRS.Simple: lat=y, lng=x
  })();

  // Route polyline: dari waypoints (multi-segment graph route)
  const routePositions = (() => {
    if (!isNavigating) return null;

    // Jika ada routeWaypoints dari graph pathfinding
    if (routeWaypoints && routeWaypoints.length >= 2 && useLocalCRS) {
      return routeWaypoints.map(wp => L.latLng(wp.y, wp.x));
    }

    // Fallback: garis lurus user -> destination
    if (userPosition && destinationPosition) {
      return [userPosition, destinationPosition];
    }

    return null;
  })();

  // Callback ketika user klik di peta
  const handleLocationDetected = useCallback((locationInfo) => {
    setUserPosition(locationInfo.latlng);
    setDetectedRoom(locationInfo.room);
    // Notify parent
    if (onPositionUpdate) {
      onPositionUpdate({
        coords: [locationInfo.coords.x, locationInfo.coords.y],
        room: locationInfo.room,
      });
    }
  }, [onPositionUpdate]);

  // Handle search room routing - cari rute ke ruangan tertentu
  const handleSearchRoom = useCallback((roomName, roomType) => {
    if (!routingGraph || !areaData) {
      console.warn('⚠️ Cannot route: missing graph or area data');
      return null;
    }

    if (!userPosition) {
      console.warn('⚠️ Cannot route: user position not available');
      return null;
    }

    try {
      // Jika detectedRoom sudah ada, gunakan itu; jika tidak, gunakan user position untuk mencari ruangan terdekat
      let fromRoom = detectedRoom?.name;

      if (!fromRoom) {
        // Cari ruangan terdekat dari user position
        console.log('ℹ️ No detected room, finding nearest room from user position...');
        // Convert [lat, lng] ke [x, y] untuk perhitungan
        const userCoords = { x: userPosition.lng, y: userPosition.lat };
        let nearestRoom = null;
        let nearestDist = Infinity;

        if (areaData.features) {
          for (const feature of areaData.features) {
            const centroid = getPolygonCentroid(feature);
            if (centroid) {
              const dist = Math.sqrt(
                Math.pow(centroid.x - userCoords.x, 2) +
                Math.pow(centroid.y - userCoords.y, 2)
              );
              if (dist < nearestDist) {
                nearestDist = dist;
                const name = feature.properties?.RUANGAN || feature.properties?.ruangan || feature.properties?.name;
                if (name && !['DINDING', 'PINTU', 'KORIDOR', 'CORRIDOR', 'DOOR'].some(skip => name.toUpperCase().includes(skip))) {
                  nearestRoom = name;
                }
              }
            }
          }
        }

        fromRoom = nearestRoom || 'Start';
        console.log(`ℹ️ Using nearest room: ${fromRoom}`);
      }

      const toRoom = roomName;
      console.log(`🔍 Routing: ${fromRoom} → ${toRoom}`);

      // Try pathway-based routing FIRST (more accurate than A*)
      let routeResult = null;
      if (pathsData) {
        routeResult = findRouteViaPaths(fromRoom, toRoom, pathsData, areaData);
        if (routeResult) {
          console.log(`✅ Route found via PATHWAYS`);
        }
      }

      // Fallback to door-aware routing jika pathways tidak available
      if (!routeResult) {
        routeResult = findRouteBetweenRooms(
          fromRoom,
          toRoom,
          areaData,
          5000 // maxDistance
        );
        if (routeResult) {
          console.log(`✅ Route found via DOOR-AWARE routing`);
        }
      }

      if (routeResult) {
        console.log(`Distance: ${routeResult.routeInfo.distanceFormatted}, Time: ${routeResult.routeInfo.timeFormatted}`);

        // Convert waypoints dari [x, y] ke [y, x] untuk Leaflet map
        const convertedWaypoints = routeResult.waypoints.map(wp => [wp.y, wp.x]);
        setRoutePositions(convertedWaypoints);
        setRouteDestination({
          name: toRoom,
          type: roomType || 'Room',
          position: convertedWaypoints[convertedWaypoints.length - 1],
        });
        setIsNavigating(true);

        // Set destination marker position
        if (convertedWaypoints.length > 0) {
          const destLatLng = L.latLng(convertedWaypoints[convertedWaypoints.length - 1][0], convertedWaypoints[convertedWaypoints.length - 1][1]);
          setDestinationPosition(destLatLng);
        }

        return {
          success: true,
          waypoints: convertedWaypoints,
          distance: routeResult.routeInfo.distanceFormatted,
          time: routeResult.routeInfo.timeFormatted,
          steps: routeResult.routeInfo.steps,
        };
      } else {
        console.warn(`⚠️ No route found between ${fromRoom} and ${toRoom}`);
        return { success: false, error: 'No route found' };
      }
    } catch (error) {
      console.error('Error finding route:', error);
      return { success: false, error: error.message };
    }
  }, [routingGraph, areaData, pathsData, userPosition, detectedRoom]);

  // Function untuk zoom ke route
  const zoomToRoute = useCallback(() => {
    if (routePositions && routePositions.length > 0) {
      // Trigga effect di FitBoundsToRoute dengan re-render
      // atau langsung fit bounds via context/ref
      const bounds = L.latLngBounds(routePositions);
      if (userPosition) {
        bounds.extend(userPosition);
      }
      // NOTE: Ini akan di-trigger otomatis via FitBoundsToRoute effect
      // Tapi kita juga bisa trigger manual fit bounds di sini
      console.log('🔍 Zoom to route triggered');
    }
  }, [routePositions, userPosition]);

  // ✨ NEW: Function untuk zoom ke ruangan yang dicari
  const zoomToSearchedRoom = useCallback((geometry) => {
    if (!geometry) return;

    try {
      let bounds = null;

      // Handle berbagai geometry types
      if (geometry.type === 'Polygon') {
        // Polygon: coordinates = [[[x, y], [x, y], ...]]
        const coords = geometry.coordinates[0];
        bounds = L.latLngBounds(
          coords.map(([x, y]) => [y, x]) // Convert [x, y] to [lat, lng]
        );
      } else if (geometry.type === 'MultiPolygon') {
        // MultiPolygon: coordinates = [[[[x, y], ...]]]
        const allCoords = [];
        geometry.coordinates.forEach(polygon => {
          polygon[0].forEach(([x, y]) => {
            allCoords.push([y, x]); // Convert [x, y] to [lat, lng]
          });
        });
        bounds = L.latLngBounds(allCoords);
      } else if (geometry.type === 'Point') {
        // Point: coordinates = [x, y]
        const [x, y] = geometry.coordinates;
        bounds = L.latLngBounds([[y - 0.001, x - 0.001], [y + 0.001, x + 0.001]]);
      }

      if (bounds) {
        // Get map instance dari map container ref
        const mapContainer = document.querySelector('.leaflet-container');
        if (mapContainer && mapContainer._leaflet_map) {
          const map = mapContainer._leaflet_map;
          map.fitBounds(bounds, {
            padding: [150, 150], // Extra padding untuk visibility
            duration: 0.8,
            maxZoom: 18
          });
          console.log(`🎯 Zoomed to searched room geometry`);
        }
      }
    } catch (error) {
      console.error('Error zooming to searched room:', error);
    }
  }, [routePositions, userPosition]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    searchRoom: (roomName, roomType) => handleSearchRoom(roomName, roomType),
    clearRoute: () => {
      setRoutePositions(null);
      setRouteDestination(null);
      setIsNavigating(false);
      setDestinationPosition(null);
    },
    getUserPosition: () => userPosition,
    getDetectedRoom: () => detectedRoom,
    zoomToRoute: zoomToRoute,
    zoomToSearchedRoom: zoomToSearchedRoom,
  }), [handleSearchRoom, zoomToRoute, zoomToSearchedRoom]);

  // Handle QR Code scan — set posisi user dari data QR
  useEffect(() => {
    if (qrPosition && qrPosition.coords && useLocalCRS) {
      const [x, y] = qrPosition.coords;
      // Flip untuk CRS.Simple: lat=y, lng=x
      const latlng = L.latLng(y, x);
      setUserPosition(latlng);
      setDetectedRoom(qrPosition.room || null);
    }
  }, [qrPosition, useLocalCRS]);

  // Mengatasi masalah hydration di Next.js
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load GeoJSON data untuk lantai yang dipilih
  useEffect(() => {
    if (!isMounted) return;

    const loadFloorData = async () => {
      try {
        setLoading(true);

        // Load floor geometry
        const floorResponse = await fetch(`khadijah-floor/${currentFloor}.geojson`);

        if (!floorResponse.ok) {
          throw new Error(`Floor file not found: ${currentFloor}.geojson (Status: ${floorResponse.status})`);
        }

        const contentType = floorResponse.headers.get('content-type');
        // Accept both application/json and application/geo+json
        if (contentType && !contentType.includes('application/json') && !contentType.includes('application/geo+json')) {
          throw new Error(`Invalid content type for ${currentFloor}.geojson: ${contentType}`);
        }

        const floorGeoJSON = await floorResponse.json();

        // Deteksi apakah menggunakan koordinat lokal
        const isLocal = isLocalCoordinateSystem(floorGeoJSON);
        setUseLocalCRS(isLocal);
        setFloorData(floorGeoJSON);

        // Load area ruangan (polygon fill) sebagai data terpisah HANYA jika file berbeda
        // Untuk lantai-1-area, lantai-4-area, dll: jangan load duplicate file
        // Area data akan digunakan untuk color styling, separate dari base floor geometry
        try {
          // Cek apakah ada file area terpisah (e.g., lantai-1-area-color.geojson)
          // Jika tidak ada, gunakan floorData yang sudah di-load
          let areaGeoJSON = null;
          let foundSeperateFile = false;

          // Coba load file terpisah dengan suffix -color atau -areas
          const areaSuffixes = ['-color', '-areas'];
          for (const suffix of areaSuffixes) {
            const areaFileName = `${currentFloor}${suffix}.geojson`;
            try {
              const areaResponse = await fetch(`khadijah-floor/${areaFileName}`);
              if (areaResponse.ok) {
                const areaContentType = areaResponse.headers.get('content-type');
                if (areaContentType && (areaContentType.includes('application/json') || areaContentType.includes('application/geo+json'))) {
                  areaGeoJSON = await areaResponse.json();
                  if (areaGeoJSON.features && areaGeoJSON.features.length > 0) {
                    foundSeperateFile = true;
                    console.log(`✅ Area loaded: ${areaGeoJSON.features.length} rooms (${areaFileName})`);
                    break;
                  }
                }
              }
            } catch (e) {
              // Continue to next suffix
            }
          }

          // Jika tidak ada file terpisah, gunakan floorData sebagai areaData
          if (!areaGeoJSON) {
            areaGeoJSON = floorGeoJSON;
            foundSeperateFile = false;
            console.log(`ℹ️ Using base floor data as area data (no separate area file)`);
          }

          setHasSeperateAreaFile(foundSeperateFile);
          setAreaData(areaGeoJSON);
          if (onAreaDataLoaded) onAreaDataLoaded(areaGeoJSON);
        } catch (err) {
          console.log('Error loading area data:', err);
          // Fallback: gunakan floorData
          setHasSeperateAreaFile(false);
          setAreaData(floorGeoJSON);
        }

        // Load paths jika ada (navigation graph)
        try {
          // Load paths berdasarkan floor yang dipilih (e.g., lantai-4-paths.geojson)
          const pathsFileName = `${currentFloor}-paths.geojson`;
          const pathsResponse = await fetch(`khadijah-floor/${pathsFileName}`);
          if (pathsResponse.ok) {
            const contentType = pathsResponse.headers.get('content-type');
            // Accept both application/json and application/geo+json
            if (contentType && (contentType.includes('application/json') || contentType.includes('application/geo+json'))) {
              const pathsGeoJSON = await pathsResponse.json();
              setPathsData(pathsGeoJSON);
              if (onPathsDataLoaded) onPathsDataLoaded(pathsGeoJSON);
              console.log(`✅ Paths loaded: ${pathsGeoJSON.features.length} features (${pathsFileName})`);
            }
          }
        } catch (err) {
          console.log('No paths data for this floor');
          setPathsData(null);
        }

        // Load centroid data untuk routing berbasis area (e.g., lantai-4-centroid.geojson)
        try {
          const centroidFileName = `${currentFloor}-centroid.geojson`;
          const centroidResponse = await fetch(`khadijah-floor/${centroidFileName}`);
          if (centroidResponse.ok) {
            const contentType = centroidResponse.headers.get('content-type');
            if (contentType && (contentType.includes('application/json') || contentType.includes('application/geo+json'))) {
              const centroidGeoJSON = await centroidResponse.json();
              setCentroidData(centroidGeoJSON);

              // Build routing graph dari area data menggunakan centroid
              if (areaGeoJSON) {
                const graph = buildGraphFromAreas(areaGeoJSON, 5000);
                if (graph) {
                  setRoutingGraph(graph);
                  console.log(`✅ Centroid loaded: ${centroidGeoJSON.features.length} features (${centroidFileName})`);
                  console.log(`✅ Routing graph built: ${Object.keys(graph.nodes).length} rooms connected`);
                } else {
                  console.log('Failed to build routing graph from areas');
                }
              }
            }
          }
        } catch (err) {
          console.log('No centroid data for this floor:', err);
          setCentroidData(null);
          setRoutingGraph(null);
          setPathsData(null);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading floor data:', error);
        setFloorData(null);
        setAreaData(null);
        setPathsData(null);
        setCentroidData(null);
        setRoutingGraph(null);
        setLoading(false);
      }
    };

    loadFloorData();
  }, [currentFloor, isMounted]);

  if (!isMounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Loading map...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Loading floor plan...</p>
      </div>
    );
  }

  if (!floorData) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 p-4">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-600 font-medium mb-2">Floor plan not available</p>
          <p className="text-gray-500 text-sm">File: {currentFloor}.geojson</p>
          <p className="text-gray-400 text-xs mt-2">Check browser console for details</p>
        </div>
      </div>
    );
  }

  // Westport House location (Dundee, Scotland) - untuk koordinat GPS
  const defaultCenter = [56.45992, -2.97800];
  const defaultZoom = 19;

  // Default center untuk koordinat lokal (akan di-override oleh fitBounds)
  const localCenter = [3700, 5500];
  const localZoom = 15;

  // Pilih CRS dan center berdasarkan tipe koordinat
  const mapCenter = useLocalCRS ? localCenter : defaultCenter;
  const mapZoom = useLocalCRS ? localZoom : defaultZoom;
  const mapCRS = useLocalCRS ? L.CRS.Simple : L.CRS.EPSG3857;

  // Fungsi untuk styling GeoJSON features
  // Helper function untuk mendapatkan warna dari roomColors object
  const getColorFromRoomColors = (roomName) => {
    if (!roomName) return '#c3c3c3'; // Default grey

    // Normalize room name untuk matching
    const normalized = roomName
      .toLowerCase()
      .trim()
      .replace(/\./g, '') // Hapus dot (R. → r)
      .replace(/\s+/g, '_')
      .replace(/[^\w_]/g, '');

    // Cek di roomColors object
    if (roomColors[normalized]) {
      return roomColors[normalized];
    }

    // Cek variasi dengan spaces
    const withSpaces = roomName.toLowerCase().trim();
    if (roomColors[withSpaces]) {
      return roomColors[withSpaces];
    }

    return '#c3c3c3'; // Default grey
  };

  const getFeatureStyle = (feature) => {
    const props = feature.properties;
    const type = props.type || props.SubClasses;
    const name = props.RUANGAN || props.ruangan || props.name || ''; // Prioritas: RUANGAN > ruangan > name
    const layer = props.Layer || '';

    // Cek berdasarkan type property di hospitalRoomStyles
    if (hospitalRoomStyles[type]) {
      return hospitalRoomStyles[type];
    }

    // 🎨 AMBIL WARNA DARI roomColors OBJECT
    const roomColor = getColorFromRoomColors(name);

    if (roomColor !== '#c3c3c3') {
      // Warna ditemukan di roomColors
      return {
        color: roomColor,
        weight: 2,
        fillColor: roomColor,
        fillOpacity: 0.6
      };
    }

    // Cek berdasarkan name (case insensitive)
    const lowerName = name.toLowerCase();

    // Normalize nama untuk mapping (hapus "R. ", titik, spasi)
    const normalizedName = lowerName
      .replace(/^r\.\s+/, '') // Hapus "R. " di awal
      .replace(/\s+/g, '_')   // Ganti spasi dengan underscore
      .toLowerCase();

    // Cek normalized name dulu di hospitalRoomStyles
    if (hospitalRoomStyles[normalizedName]) {
      return hospitalRoomStyles[normalizedName];
    }

    // Fallback: cek dengan pattern matching di hospitalRoomStyles
    for (const [key, style] of Object.entries(hospitalRoomStyles)) {
      if (lowerName.includes(key) || normalizedName.includes(key)) {
        return style;
      }
    }

    // Styling untuk data CAD berdasarkan SubClasses dan Layer
    if (cadStyles[type]) {
      return cadStyles[type];
    }

    // Default style
    return { color: '#6b7280', weight: 1, fillColor: '#e5e7eb', fillOpacity: 0.3 };
  };

  // Fungsi styling area ruangan (fill lebih kuat, border tipis)
  const getAreaStyle = (feature) => {
    const baseStyle = getFeatureStyle(feature);
    return {
      ...baseStyle,
      weight: 1,
      opacity: 0.4,
      fillOpacity: 0.4,
    };
  };

  // Fungsi untuk menambahkan popup pada feature
  const onEachFeature = (feature, layer) => {
    // Tidak pakai popup agar tidak menghalangi klik deteksi posisi
  };

  // coordsToLatLng untuk koordinat lokal
  const coordsToLatLng = useLocalCRS
    ? (coords) => {
      // Flip coordinates untuk CRS.Simple (y, x)
      return [coords[1], coords[0]];
    }
    : undefined;

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        crs={mapCRS}
        style={{ height: '100%', width: '100%' }}
        minZoom={useLocalCRS ? -5 : 17}
        maxZoom={useLocalCRS ? 5 : 22}
      >
        {/* Layer 1 (BAWAH): Area ruangan dengan fill warna */}
        {areaData && (
          <>
            <GeoJSON
              key={`area-${currentFloor}-${useLocalCRS}`}
              data={areaData}
              style={getAreaStyle}
              onEachFeature={onEachFeature}
              coordsToLatLng={coordsToLatLng}
            />
            {/* Fit bounds ke area data (baik dari file terpisah maupun floor data) */}
            <FitBounds data={areaData} isLocal={useLocalCRS} />
          </>
        )}

        {/* Layer 2 (ATAS): Denah dinding, pintu, jendela */}
        {/* HANYA render floorData jika ada file area terpisah (jangan double render) */}
        {floorData && hasSeperateAreaFile && (
          <GeoJSON
            key={`floor-${currentFloor}-${useLocalCRS}`}
            data={floorData}
            style={getFeatureStyle}
            onEachFeature={onEachFeature}
            coordsToLatLng={coordsToLatLng}
          />
        )}

        {/* Navigation graph (hidden - data digunakan untuk routing, tidak ditampilkan) */}
        {/* pathsData di-load untuk dikirim ke parent via onPathsDataLoaded */}

        {/* Deteksi posisi user saat klik peta */}
        <UserLocationDetector
          areaData={areaData}
          isLocal={useLocalCRS}
          onLocationDetected={handleLocationDetected}
        />

        {/* Center peta ke posisi user saat tombol ditekan */}
        <CenterToPosition position={userPosition} trigger={centerTrigger} />

        {/* Marker posisi user */}
        {userPosition && userIcon && (
          <Marker position={userPosition} icon={userIcon}>
            <Popup>
              <div className="text-sm">
                {detectedRoom ? (
                  <>
                    <strong>📍 {detectedRoom.name}</strong><br />
                    <span>Type: {detectedRoom.type}</span><br />
                    <span>Room: {detectedRoom.roomnumber}</span>
                  </>
                ) : (
                  <span>📍 Area tidak dikenali (koridor/luar ruangan)</span>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route Polyline */}
        {routePositions && (
          <Polyline
            positions={smoothWaypoints(routePositions)}
            pathOptions={{
              color: '#3b82f6',
              weight: 5,
              opacity: 0.8,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        )}

        {/* Destination Marker */}
        {destinationPosition && isNavigating && destinationIcon && (
          <Marker position={destinationPosition} icon={destinationIcon}>
            <Popup>
              <div className="text-sm">
                <strong>🏁 {routeDestination.name}</strong><br />
                <span>{routeDestination.type}</span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Fit bounds ke route saat navigasi - include semua waypoints */}
        {isNavigating && <FitBoundsToRoute userPos={userPosition} destPos={destinationPosition} routeWaypoints={routePositions} />}
      </MapContainer>

      {/* Info bar posisi user - hanya tampil saat TIDAK navigasi */}
      {userPosition && !isNavigating && (
        <div className="absolute bottom-0 left-0 right-0 z-1000 bg-white border-t border-gray-200 shadow-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{
                backgroundColor: detectedRoom ? '#dbeafe' : '#f3f4f6',
              }}
            >
              <span className="text-lg">{detectedRoom ? '📍' : '❓'}</span>
            </div>
            <div className="flex-1 min-w-0">
              {detectedRoom ? (
                <>
                  <p className="font-semibold text-gray-900 truncate">{detectedRoom.name}</p>
                  <p className="text-sm text-gray-500">{detectedRoom.type} • {detectedRoom.roomnumber}</p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-gray-900">Area tidak dikenali</p>
                  <p className="text-sm text-gray-500">Koridor atau area di luar ruangan</p>
                </>
              )}
            </div>
            <button
              onClick={() => { setUserPosition(null); setDetectedRoom(null); }}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
});