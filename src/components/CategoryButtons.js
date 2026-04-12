'use client';

import { useState } from 'react';
import { Button } from 'react-aria-components';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import roomNames from '@/app/data/roomNames';

export default function CategoryButtons({ onCategoryClick }) {
  const [isOpen, setIsOpen] = useState(false);

  const categories = [
    {
      id: 'emergency',
      ...roomNames.emergency,
    },
    {
      id: 'inpatient',
      ...roomNames.inpatient,
    },
    {
      id: 'outpatient',
      ...roomNames.outpatient,
    },
    {
      id: 'support',
      ...roomNames.support,
    },
    {
      id: 'facilities',
      ...roomNames.facilities,
    },
    {
      id: 'specialist',
      ...roomNames.specialist,
    },
  ];

  return (
    <div className={`bg-white shadow-lg border-t ${isOpen ? 'mx-0' : 'mx-4'} rounded-3xl`}>
      {/* Toggle Header */}
      <Button
        onPress={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-4 py-3 flex items-center justify-between",
          "hover:bg-gray-50 active:bg-gray-100 transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
        )}
      >
        <span className="text-sm font-semibold text-gray-700">Kategori Ruangan</span>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-gray-600" />
        ) : (
          <ChevronUp className="w-5 h-5 text-gray-600" />
        )}
      </Button>

      {/* Category Grid with Smooth Animation */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-4 pb-4 pt-2">
          {/* Category Grid */}
          <p className="text-xs font-semibold text-gray-600 mb-2">📁 Kategori Lengkap</p>
          <div className="grid grid-cols-4 gap-4">
            {categories.map((category) => {
              return (
                <Button
                  key={category.id}
                  onPress={() => onCategoryClick(category.id)}
                  className={cn(
                    "flex flex-col items-center gap-2",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-lg",
                    "transition-transform active:scale-95"
                  )}
                >
                  <div className={cn(
                    "rounded-2xl w-10 h-10 flex items-center justify-center",
                    "shadow-md transition-shadow hover:shadow-lg"
                  )}>
                    <img
                      src={category.icon}
                      alt={category.name}
                      className="w-16 h-16 object-contain"
                    />
                  </div>
                  <span className="text-xs text-center text-gray-700 leading-tight font-medium">
                    {category.name}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
