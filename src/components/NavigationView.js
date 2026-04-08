'use client';

import { useState } from 'react';
import { Button } from 'react-aria-components';
import {
  ChevronLeft,
  XClose,
  MarkerPin01,
  NavigationPointer01,
  Menu01,
  User01,
  ZoomIn
} from '@untitledui/icons';
import { cn } from '@/lib/utils';

export default function NavigationView({ destination, onClose, onStart, onZoomToRoute }) {
  const [showSteps, setShowSteps] = useState(false);

  return (
    <div className="fixed inset-0 bg-white z-1001 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-3 flex items-center gap-3">
        <Button
          onPress={onClose}
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            "hover:bg-gray-100 active:bg-gray-200",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          )}
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </Button>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <MarkerPin01 className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Current location</p>
              <p className="text-xs text-gray-500">Floor G</p>
            </div>
          </div>
        </div>

        <Button
          onPress={onClose}
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            "hover:bg-gray-100 active:bg-gray-200",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          )}
        >
          <XClose className="w-5 h-5 text-gray-700" />
        </Button>
      </div>

      {/* Destination Card */}
      <div className="bg-white px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-lg">🚖</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">Taxi</p>
            <p className="text-xs text-gray-500">Floor G</p>
          </div>
          <Button
            onPress={onClose}
            className={cn(
              "p-1 rounded-lg transition-colors",
              "hover:bg-gray-100 active:bg-gray-200",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            )}
          >
            <XClose className="w-5 h-5 text-gray-500" />
          </Button>
        </div>
      </div>

      {/* Map dengan Route */}
      <div className="flex-1 relative bg-blue-50">
        {/* Simulasi peta dengan rute */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-64 h-64 mx-auto" viewBox="0 0 200 200">
              {/* Background buildings */}
              <rect x="20" y="40" width="30" height="40" fill="#e0e0e0" rx="2" />
              <rect x="60" y="30" width="40" height="50" fill="#d0d0d0" rx="2" />
              <rect x="110" y="45" width="35" height="35" fill="#e0e0e0" rx="2" />

              {/* Route path */}
              <path
                d="M 50 150 L 50 120 L 80 120 L 80 80 L 120 80 L 120 60"
                stroke="#1e40af"
                strokeWidth="4"
                strokeDasharray="8,4"
                fill="none"
                strokeLinecap="round"
              />

              {/* Start point */}
              <circle cx="50" cy="150" r="8" fill="#10b981" stroke="white" strokeWidth="2" />

              {/* End point */}
              <circle cx="120" cy="60" r="8" fill="#ef4444" stroke="white" strokeWidth="2" />
            </svg>
            <div className="mt-4 bg-white px-6 py-3 rounded-full inline-block shadow-lg">
              <p className="text-sm">
                <span className="font-bold text-lg">4 min (260 m)</span> to Taxi
              </p>
            </div>
          </div>
        </div>

        {/* Main Floor Button */}
        <Button
          className={cn(
            "absolute bottom-20 left-4 z-10 bg-white px-4 py-2 rounded-full shadow-lg",
            "hover:shadow-xl active:scale-95 transition-all flex items-center gap-2",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          )}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L4 7v10h16V7l-8-5z" />
          </svg>
          <span className="text-sm font-medium">Main Floor</span>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </Button>

        {/* Center Button */}
        <Button
          className={cn(
            "absolute bottom-20 right-4 z-10 bg-white p-3 rounded-full shadow-lg",
            "hover:shadow-xl active:scale-95 transition-all",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          )}
        >
          <NavigationPointer01 className="w-6 h-6 text-gray-700" />
        </Button>
      </div>

      {/* Walking instruction */}
      <div className="bg-white px-4 py-3 border-t flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center shrink-0">
          <User01 className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">Walk 30 m in floor G</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white px-4 py-4 border-t flex gap-3">
        <Button
          onPress={onStart}
          className={cn(
            "flex-1 bg-blue-900 text-white py-3 rounded-full font-semibold",
            "flex items-center justify-center gap-2",
            "hover:bg-blue-800 active:bg-blue-950 transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          )}
        >
          <NavigationPointer01 className="w-5 h-5" />
          Start
        </Button>
        <Button
          onPress={() => setShowSteps(!showSteps)}
          className={cn(
            "px-6 py-3 rounded-full border-2 border-blue-900 text-blue-900 font-semibold",
            "flex items-center justify-center gap-2",
            "hover:bg-blue-50 active:bg-blue-100 transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          )}
        >
          <Menu01 className="w-5 h-5" />
          Steps
        </Button>
        {onZoomToRoute && (
          <Button
            onPress={onZoomToRoute}
            className={cn(
              "px-4 py-3 rounded-full border-2 border-gray-300 text-gray-700 font-semibold",
              "flex items-center justify-center gap-2",
              "hover:bg-gray-50 active:bg-gray-100 transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            )}
            title="Zoom to fit entire route"
          >
            <ZoomIn className="w-5 h-5" />
            Zoom
          </Button>
        )}
      </div>
    </div>
  );
}
