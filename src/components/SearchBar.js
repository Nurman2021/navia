'use client';

import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SearchBar({ mapRef, onSearchSelect, floorData }) {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [allRooms, setAllRooms] = useState([]);

  // Extract semua ruangan dari GeoJSON saat component mount
  useEffect(() => {
    console.log('🔍 SearchBar: floorData changed', floorData); // Debug log

    if (floorData && floorData.features && Array.isArray(floorData.features)) {
      console.log('✅ SearchBar: Found features, count:', floorData.features.length);

      const ignoreRooms = ['0', 'PINTU', 'DINDING'];

      const rooms = floorData.features
        .map((feature, idx) => {
          const ruangan = feature.properties?.RUANGAN || feature.properties?.ruangan || feature.properties?.name || '';
          console.log(`  Room ${idx}:`, ruangan);
          return {
            id: feature.properties?.id || `room_${idx}`,
            name: ruangan,
            properties: feature.properties,
            geometry: feature.geometry,
          };
        })
        .filter((room) => {
          // Filter 1: Hapus nama kosong
          if (!room.name || room.name.trim() === '') return false;
          
          // Filter 2: Hapus ruangan yang diabaikan
          if (ignoreRooms.includes(room.name.toUpperCase().trim())) {
            console.log(`  ⏭️ Skipping ignored room: ${room.name}`);
            return false;
          }
          
          return true;
        });

      console.log('✅ SearchBar: Rooms extracted successfully:', rooms.length, rooms.slice(0, 5)); // Debug log
      setAllRooms(rooms);
    } else {
      console.log('⚠️ SearchBar: No floorData or features'); // Debug log
      setAllRooms([]);
    }
  }, [floorData]);

  // Search logic
  const handleSearch = (value) => {
    setSearchText(value);

    if (value.trim() === '') {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const query = value.toLowerCase();
    console.log('SearchBar: searching for:', query); // Debug
    console.log('SearchBar: total rooms available:', allRooms.length); // Debug

    const results = allRooms.filter((room) =>
      room.name.toLowerCase().includes(query)
    );

    console.log('SearchBar: results found:', results.length, results); // Debug
    setSearchResults(results);
    setShowResults(results.length > 0);
  };

  // Handle room selection
  const handleSelectRoom = (room) => {
    setSearchText(room.name);
    setShowResults(false);

    if (onSearchSelect) {
      onSearchSelect({
        roomName: room.name,
        properties: room.properties,
        geometry: room.geometry,
      });
    }

    // Trigger routing via map ref jika tersedia
    if (mapRef && mapRef.current && mapRef.current.searchRoom) {
      try {
        const result = mapRef.current.searchRoom(room.name, room.properties?.type || 'Room');
        if (result && result.success) {
          console.log(`✅ Route found via SearchBar: ${room.name}`);

          // ✨ NEW: Zoom ke ruangan yang dicari setelah route ditemukan
          // Delay sedikit agar route sudah di-render dulu
          setTimeout(() => {
            if (mapRef.current?.zoomToSearchedRoom) {
              mapRef.current.zoomToSearchedRoom(room.geometry);
              console.log(`🔍 Zoomed to searched room: ${room.name}`);
            }
          }, 100);
        } else {
          console.warn(`⚠️ Route not found or routing unavailable for: ${room.name}`);
        }
      } catch (error) {
        console.error('Error finding route:', error);
      }
    }
  };

  // Clear search
  const handleClear = () => {
    setSearchText('');
    setSearchResults([]);
    setShowResults(false);
  };

  return (
    <div className="fixed top-4 left-4 right-4 z-9999">
      <div className="relative">
        {/* Search Bar */}
        <div className="bg-white shadow-lg px-4 py-3 flex items-center gap-3 rounded-full relative z-9999">
          {/* Search Icon */}
          <Search className="w-5 h-5 text-gray-400 shrink-0" />

          {/* Search Input */}
          <input
            type="text"
            placeholder="Cari ruangan..."
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            className={cn(
              "flex-1 outline-none text-gray-700 placeholder-gray-400 bg-transparent",
              "focus:placeholder-gray-300 transition-colors"
            )}
          />

          {/* Clear Button */}
          {searchText && (
            <button
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white shadow-xl rounded-xl max-h-96 overflow-y-auto z-9999 border border-gray-200">
            <div className="sticky top-0 px-4 py-2 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase">
                {searchResults.length} hasil ditemukan
              </p>
            </div>
            {searchResults.map((room) => (
              <button
                key={room.id}
                onClick={() => handleSelectRoom(room)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b last:border-b-0 border-gray-100",
                  "hover:bg-blue-50 active:bg-blue-100 transition-colors",
                  "flex items-center gap-3"
                )}
              >
                <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center shrink-0">
                  <Search className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-700 font-medium text-sm truncate">{room.name}</p>
                  {room.properties?.id && (
                    <p className="text-gray-400 text-xs">ID: {room.properties.id}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No Results Message */}
        {showResults && searchResults.length === 0 && searchText && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white shadow-lg rounded-lg p-4 z-9999">
            <p className="text-gray-500 text-sm text-center">
              Ruangan "{searchText}" tidak ditemukan
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
