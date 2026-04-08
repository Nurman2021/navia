'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

// Emoji berdasarkan tipe ruangan
const roomEmoji = {
    kantin: '🍽️',
    mushola: '🕌',
    masjid: '🕌',
    igd: '🚑',
    emergency_room: '🚑',
    patient_room: '🛏️',
    rawat_inap: '🛏️',
    ward: '🛏️',
    operating_room: '🏥',
    operasi: '🏥',
    laboratory: '🔬',
    lab: '🔬',
    pharmacy: '💊',
    farmasi: '💊',
    radiology: '📡',
    xray: '📡',
    waiting_room: '🪑',
    ruang_tunggu: '🪑',
    icu: '❤️‍🩹',
    intensive_care: '❤️‍🩹',
    office: '🏢',
    admin: '🏢',
    bathroom: '🚻',
    toilet: '🚻',
    wc: '🚻',
    stairs: '🪜',
    tangga: '🪜',
    elevator: '🛗',
    lift: '🛗',
};

// Warna badge berdasarkan tipe ruangan
const roomBadgeColor = {
    kantin: 'bg-orange-100 text-orange-700',
    mushola: 'bg-teal-100 text-teal-700',
    masjid: 'bg-teal-100 text-teal-700',
    igd: 'bg-red-100 text-red-700',
    emergency_room: 'bg-red-100 text-red-700',
    patient_room: 'bg-blue-100 text-blue-700',
    rawat_inap: 'bg-blue-100 text-blue-700',
    operating_room: 'bg-green-100 text-green-700',
    operasi: 'bg-green-100 text-green-700',
    laboratory: 'bg-yellow-100 text-yellow-700',
    lab: 'bg-yellow-100 text-yellow-700',
    pharmacy: 'bg-purple-100 text-purple-700',
    farmasi: 'bg-purple-100 text-purple-700',
    icu: 'bg-red-100 text-red-800',
    toilet: 'bg-cyan-100 text-cyan-700',
    bathroom: 'bg-cyan-100 text-cyan-700',
};

export default function RoomSelector({ rooms, onSelect, onClose }) {
    const [search, setSearch] = useState('');

    const filteredRooms = useMemo(() => {
        if (!rooms || rooms.length === 0) return [];
        if (!search.trim()) return rooms;

        const q = search.toLowerCase();
        return rooms.filter(
            (room) =>
                room.name.toLowerCase().includes(q) ||
                room.type.toLowerCase().includes(q) ||
                room.roomnumber.toLowerCase().includes(q)
        );
    }, [rooms, search]);

    return (
        <div className="fixed inset-0 z-2000 flex flex-col">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />

            {/* Bottom Sheet */}
            <div className="mt-auto relative bg-white rounded-t-2xl shadow-2xl max-h-[75vh] flex flex-col">
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-4 pb-3 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-bold text-gray-900">Pilih Tujuan</h2>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <svg
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Cari ruangan..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Room List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {filteredRooms.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-gray-400 text-sm">
                                {rooms && rooms.length > 0
                                    ? 'Tidak ada ruangan yang cocok'
                                    : 'Belum ada data ruangan'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredRooms.map((room) => {
                                const emoji = roomEmoji[room.type] || '📍';
                                const badgeColor = roomBadgeColor[room.type] || 'bg-gray-100 text-gray-600';

                                return (
                                    <button
                                        key={room.id}
                                        onClick={() => onSelect(room)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-3 rounded-xl",
                                            "hover:bg-blue-50 active:bg-blue-100 transition-colors text-left"
                                        )}
                                    >
                                        {/* Icon */}
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                            <span className="text-lg">{emoji}</span>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900 truncate">{room.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", badgeColor)}>
                                                    {room.type}
                                                </span>
                                                <span className="text-xs text-gray-400">{room.roomnumber}</span>
                                            </div>
                                        </div>

                                        {/* Arrow */}
                                        <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
