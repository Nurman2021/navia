'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback, useRef } from 'react';
import SearchBar from '@/components/SearchBar';
import CategoryButtons from '@/components/CategoryButtons';
import NavigationView from '@/components/NavigationView';
import QRScanner from '@/components/QRScanner';
import RoomSelector from '@/components/RoomSelector';
import NavigationPanel from '@/components/NavigationPanel';
import { extractRooms, extractRoomsFromPaths, buildGraph, calculateRoute } from '@/lib/routing';
import { MapPin, ScanQrCode, ChevronDown } from 'lucide-react';

// Import Map component dengan dynamic import untuk menghindari SSR issues
const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <p className="text-gray-600">Loading map...</p>
    </div>
  ),
});

export default function Home() {
  const mapRef = useRef(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [view, setView] = useState('list'); // 'map', 'list', 'navigation'
  const [currentFloor, setCurrentFloor] = useState('lantai-1-area');
  const [showFloorSelector, setShowFloorSelector] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [userPosition, setUserPosition] = useState(null); // { latlng, room }
  const [centerTrigger, setCenterTrigger] = useState(0); // Trigger center ke posisi user

  // Routing state
  const [showRoomSelector, setShowRoomSelector] = useState(false);
  const [routeDestination, setRouteDestination] = useState(null); // room dari extractRooms
  const [routeInfo, setRouteInfo] = useState(null); // dari calculateRoute
  const [isNavigating, setIsNavigating] = useState(false);
  const [rooms, setRooms] = useState([]); // daftar ruangan dari areaData
  const [navGraph, setNavGraph] = useState(null); // navigation graph dari paths
  const [routeWaypoints, setRouteWaypoints] = useState(null); // [{x,y}, ...] multi-segment route
  const [areaGeoJSON, setAreaGeoJSON] = useState(null); // GeoJSON dari lantai untuk SearchBar

  // Callback dari QR Scanner
  const handleQRScan = useCallback((qrData) => {
    // qrData: { roomId, name, type, floor, coords: [x, y] }
    setUserPosition({
      coords: qrData.coords,
      room: {
        name: qrData.name,
        type: qrData.type,
        roomnumber: qrData.roomId,
      }
    });
    setShowQRScanner(false);

    // Switch floor jika perlu
    if (qrData.floor) {
      const floorMap = {
        1: 'lantai-1-area',
        2: 'lantai2',
        3: 'lantai3',
        6: 'lantai6',
      };
      if (floorMap[qrData.floor]) {
        setCurrentFloor(floorMap[qrData.floor]);
      }
    }
  }, []);

  // Center peta ke posisi user
  const handleCenterToUser = useCallback(() => {
    if (userPosition) {
      setCenterTrigger(prev => prev + 1);
    }
  }, [userPosition]);

  // Callback ketika areaData loaded dari Map
  const handleAreaDataLoaded = useCallback((areaData) => {
    const roomList = extractRooms(areaData);
    setRooms(roomList);
    setAreaGeoJSON(areaData); // Simpan untuk SearchBar
    console.log(`Rooms extracted: ${roomList.length}`);
  }, []);

  // Callback ketika pathsData loaded dari Map
  const handlePathsDataLoaded = useCallback((pathsGeoJSON) => {
    const graph = buildGraph(pathsGeoJSON);
    setNavGraph(graph);

    // Juga extract rooms dari paths (endpoint data: 60 ruangan)
    const pathRooms = extractRoomsFromPaths(pathsGeoJSON);
    if (pathRooms.length > 0) {
      setRooms(prev => {
        // Merge: area rooms + paths rooms (hapus duplikat by name+coords)
        const existing = new Set(prev.map(r => `${r.name}-${Math.round(r.centroid.x)}`));
        const newRooms = pathRooms.filter(r => !existing.has(`${r.name}-${Math.round(r.centroid.x)}`));
        const merged = [...prev, ...newRooms];
        console.log(`Rooms updated: ${merged.length} (${prev.length} area + ${newRooms.length} paths)`);
        return merged;
      });
    }

    if (graph) {
      console.log(`Nav graph built: ${Object.keys(graph.nodes).length} nodes`);
    }
  }, []);

  // Open room selector (tujuan)
  const handleOpenRoomSelector = useCallback(() => {
    if (rooms.length > 0) {
      setShowRoomSelector(true);
    }
  }, [rooms]);

  // User memilih tujuan dari RoomSelector
  const handleSelectDestination = useCallback((room) => {
    setRouteDestination(room);
    setShowRoomSelector(false);

    // Hitung rute menggunakan graph (atau fallback garis lurus)
    if (userPosition && userPosition.coords) {
      const from = { x: userPosition.coords[0], y: userPosition.coords[1] };
      const to = room.centroid;
      const fromName = userPosition.room?.name || 'Posisi Anda';

      const result = calculateRoute(from, to, navGraph, fromName, room.name, true);
      setRouteWaypoints(result.waypoints);
      setRouteInfo(result.routeInfo);
      setIsNavigating(true);
      setCenterTrigger(prev => prev + 1);
    } else {
      setRouteWaypoints(null);
      setRouteInfo(null);
      setIsNavigating(false);
    }
  }, [userPosition, navGraph]);

  // Berhenti navigasi
  const handleStopNavigation = useCallback(() => {
    setIsNavigating(false);
    setRouteDestination(null);
    setRouteInfo(null);
    setRouteWaypoints(null);
  }, []);

  // Handle pencarian ruangan dari SearchBar
  const handleSearchSelect = useCallback((searchResult) => {
    // searchResult: { roomName, properties, geometry }
    if (searchResult.geometry && searchResult.geometry.type === 'Polygon') {
      // Calculate centroid dari polygon
      const coords = searchResult.geometry.coordinates[0];
      let x = 0, y = 0;
      coords.forEach(coord => {
        x += coord[0];
        y += coord[1];
      });
      const centroid = { x: x / coords.length, y: y / coords.length };

      // Set sebagai destination untuk routing
      setRouteDestination({
        name: searchResult.roomName,
        centroid: centroid,
        properties: searchResult.properties,
      });

      // Trigger center peta ke ruangan ini
      setCenterTrigger(prev => prev + 1);
    } else if (searchResult.geometry && searchResult.geometry.type === 'MultiPolygon') {
      // Handle MultiPolygon
      const coords = searchResult.geometry.coordinates[0][0];
      let x = 0, y = 0;
      coords.forEach(coord => {
        x += coord[0];
        y += coord[1];
      });
      const centroid = { x: x / coords.length, y: y / coords.length };

      setRouteDestination({
        name: searchResult.roomName,
        centroid: centroid,
        properties: searchResult.properties,
      });

      setCenterTrigger(prev => prev + 1);
    }
  }, []);

  const floors = [
    { id: 'lantai-1-area', name: 'Emergency & Penunjang Medis', label: 'L1' },
    { id: 'lantai-2-area', name: 'Rawat Jalan dan Penunjang Klinis', label: 'L2' },
    { id: 'lantai-3-area', name: 'Rawat Inap Pemulihan', label: 'L3' },
    { id: 'lantai-4-area', name: 'Rawat Inap Lanjutan', label: 'L4' },
    { id: 'lantai-5-area', name: 'Rawat Inap Lanjutan', label: 'L5' },
    { id: 'lantai-6-area', name: 'Administrasi Dan K. Konstitusional', label: 'L6' },
  ];

  const currentFloorData = floors.find(f => f.id === currentFloor);

  const handleCategoryClick = (categoryId) => {
    setSelectedCategory(categoryId === selectedCategory ? null : categoryId);
  };

  const handleMenuClick = () => {
    // Toggle untuk demo: map -> list -> navigation -> map
    if (view === 'map') {
      setView('list');
    } else if (view === 'list') {
      setView('navigation');
    } else {
      setView('map');
    }
  };



  if (view === 'navigation') {
    return (
      <NavigationView
        destination="Taxi"
        onClose={() => setView('map')}
        onStart={() => console.log('Navigation started')}
        onZoomToRoute={() => {
          if (mapRef.current?.zoomToRoute) {
            mapRef.current.zoomToRoute();
            console.log('Zoom to route triggered');
          }
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50">
      {/* Header dengan Search Bar */}
      <SearchBar
        mapRef={mapRef}
        onMenuClick={handleMenuClick}
        onSearchSelect={handleSearchSelect}
        floorData={areaGeoJSON}
      />

      {/* Map Container */}
      <main className="flex-1 relative overflow-hidden">
        <Map
          ref={mapRef}
          selectedCategory={selectedCategory}
          currentFloor={currentFloor}
          qrPosition={userPosition}
          centerTrigger={centerTrigger}
          onPositionUpdate={(pos) => setUserPosition(pos)}
          routeDestination={routeDestination}
          isNavigating={isNavigating}
          onAreaDataLoaded={handleAreaDataLoaded}
          onPathsDataLoaded={handlePathsDataLoaded}
          routeWaypoints={routeWaypoints}
        />

        {/* Action Buttons */}
        <div className={`absolute right-4 z-999 flex flex-col gap-2 ${isNavigating ? 'bottom-52' : 'bottom-20'}`}>
          {/* Navigate / Pilih Tujuan Button */}
          <button
            className={`p-3 rounded-full shadow-lg hover:shadow-xl transition-all ${userPosition && rooms.length > 0
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-gray-200 opacity-50 cursor-not-allowed'
              }`}
            aria-label="Navigasi ke tujuan"
            onClick={handleOpenRoomSelector}
            disabled={!userPosition || rooms.length === 0}
          >
            <svg
              className={`w-6 h-6 ${userPosition && rooms.length > 0 ? 'text-white' : 'text-gray-400'}`}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </button>

          {/* Scan QR Code Button */}
          <button
            className="bg-blue-500 p-3 rounded-full shadow-lg hover:shadow-xl hover:bg-blue-600 transition-all"
            aria-label="Scan QR Code"
            onClick={() => setShowQRScanner(true)}
          >
            <ScanQrCode className="w-6 h-6 text-white" />
          </button>

          {/* Center to User Position Button */}
          <button
            className={`p-3 rounded-full shadow-lg hover:shadow-xl transition-all ${userPosition ? 'bg-white hover:bg-gray-50' : 'bg-gray-200 opacity-50 cursor-not-allowed'
              }`}
            aria-label="Center to my position"
            onClick={handleCenterToUser}
            disabled={!userPosition}
          >
            <MapPin className={`w-6 h-6 ${userPosition ? 'text-gray-700' : 'text-gray-400'}`} />
          </button>
        </div>

        {/* QR Scanner Overlay */}
        {showQRScanner && (
          <QRScanner
            onScanSuccess={handleQRScan}
            onClose={() => setShowQRScanner(false)}
          />
        )}

        {/* Room Selector Overlay */}
        {showRoomSelector && (
          <RoomSelector
            rooms={rooms}
            onSelect={handleSelectDestination}
            onClose={() => setShowRoomSelector(false)}
          />
        )}

        {isNavigating && (
          <NavigationPanel
            fromName={userPosition?.room?.name}
            destination={routeDestination}
            routeInfo={routeInfo}
            onStop={handleStopNavigation}
          />
        )}

        <div className="absolute bottom-4 left-4 z-999">
          {showFloorSelector && (
            <div className="mb-2 bg-white rounded-lg shadow-lg overflow-hidden max-w-xl">
              {floors.map((floor) => (
                <button
                  key={floor.id}
                  onClick={() => {
                    setCurrentFloor(floor.id);
                    setShowFloorSelector(false);
                  }}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors ${currentFloor === floor.id ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'
                    }`}
                >
                  {floor.label} | {floor.name}
                </button>
              ))}
            </div>
          )}

          {/* Floor Button */}
          <button
            onClick={() => setShowFloorSelector(!showFloorSelector)}
            className="bg-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2"
            aria-label="Floor Selector"
          >
            <span className="text-sm font-medium">{currentFloorData?.label || 'Select Floor'}</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showFloorSelector ? 'rotate-180' : ''}`}
            />

          </button>
        </div>
      </main>

      {/* Category Buttons di bagian bawah */}
      <CategoryButtons onCategoryClick={handleCategoryClick} mapRef={mapRef} floorData={areaGeoJSON} />
    </div>
  );
}
