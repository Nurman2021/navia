'use client';

import { useState } from 'react';
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
    operating_room: '🏥',
    operasi: '🏥',
    laboratory: '🔬',
    lab: '🔬',
    pharmacy: '💊',
    farmasi: '💊',
    icu: '❤️‍🩹',
    toilet: '🚻',
    bathroom: '🚻',
};

export default function NavigationPanel({
    fromName,
    destination,
    routeInfo,
    onStop,
    onShowSteps,
}) {
    const [showSteps, setShowSteps] = useState(false);

    if (!destination || !routeInfo) return null;

    const emoji = roomEmoji[destination.type] || '📍';

    const handleToggleSteps = () => {
        setShowSteps(!showSteps);
        if (onShowSteps) onShowSteps(!showSteps);
    };

    return (
        <div className="absolute bottom-0 left-0 right-0 z-1000 bg-white rounded-t-2xl shadow-2xl">
            {/* Handle */}
            <div className="flex justify-center pt-2 pb-1">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Route Summary */}
            <div className="px-4 pb-3">
                {/* Jarak & Waktu */}
                <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <span className="text-2xl font-bold text-gray-900">{routeInfo.distanceFormatted}</span>
                    </div>
                    <div className="w-px h-6 bg-gray-200" />
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-lg font-semibold text-gray-700">{routeInfo.timeFormatted}</span>
                    </div>
                </div>

                {/* From → To */}
                <div className="flex items-start gap-3 mb-3">
                    {/* Dots connector */}
                    <div className="flex flex-col items-center gap-0.5 pt-1">
                        <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow" />
                        <div className="w-0.5 h-4 bg-gray-300" />
                        <div className="w-0.5 h-4 bg-gray-300" />
                        <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow" />
                    </div>

                    <div className="flex-1 min-w-0">
                        {/* From */}
                        <div className="mb-2">
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Dari</p>
                            <p className="text-sm font-medium text-gray-700 truncate">{fromName || 'Posisi Anda'}</p>
                        </div>
                        {/* To */}
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Tujuan</p>
                            <p className="text-sm font-semibold text-gray-900 truncate">
                                {emoji} {destination.name}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Steps (expandable) */}
                {showSteps && routeInfo.steps && (
                    <div className="mb-3 bg-gray-50 rounded-xl p-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Langkah-langkah</p>
                        <div className="space-y-2">
                            {routeInfo.steps.map((step, i) => (
                                <div key={i} className="flex items-start gap-2">
                                    <div className={cn(
                                        "w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                                        step.type === 'start' ? 'bg-blue-100 text-blue-600' :
                                            step.type === 'arrive' ? 'bg-green-100 text-green-600' :
                                                'bg-gray-200 text-gray-600'
                                    )}>
                                        {step.type === 'start' ? '🚶' : step.type === 'arrive' ? '🏁' : (i)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-700">{step.instruction}</p>
                                        {step.distance && (
                                            <p className="text-xs text-gray-400 mt-0.5">{step.distance}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onStop}
                        className={cn(
                            "flex-1 bg-red-500 text-white py-3 rounded-full font-semibold",
                            "flex items-center justify-center gap-2",
                            "hover:bg-red-600 active:bg-red-700 transition-colors"
                        )}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Berhenti
                    </button>
                    <button
                        onClick={handleToggleSteps}
                        className={cn(
                            "px-6 py-3 rounded-full border-2 font-semibold",
                            "flex items-center justify-center gap-2 transition-colors",
                            showSteps
                                ? "border-blue-500 bg-blue-50 text-blue-600"
                                : "border-gray-300 text-gray-700 hover:bg-gray-50"
                        )}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                        Langkah
                    </button>
                </div>
            </div>
        </div>
    );
}
