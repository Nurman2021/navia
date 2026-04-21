// Simple color mapping for room name normalization
const roomColors = {
  // Emergency & Urgent
  IGD: '#f09696',           // Salmon Soft
  IGM: '#f0b27a',           // Warm Orange
  IGM_ANAK: '#ffbebe',      // Light Coral
  IGM_TRIASE: '#aa6e78',    // Muted Maroon

  // Inpatient Services
  'R. RAWAT INAP': '#fff5c8',    // Light Cream
  'R. PERAWATAN': '#fff0aa',   // Soft Yellow
  HCU: '#fff5c8',           // Light Cream

  // Operations & Procedures
  operasi: '#e18c8c',       // Soft Red
  r_oprasi: '#e18c8c',      // Soft Red
  bersalin: '#f4aaab',      // Soft Peachy Pink
  r_bersalin: '#f4aaab',    // Soft Peachy Pink
  bayi: '#ffd2dc',          // Light Pinkish
  ruang_bayi: '#ffd2dc',    // Light Pinkish
  menyusui: '#ffd2dc',      // Light Pinkish

  // Facilities & Common Areas
  kantin: '#f5dc82',        // Muted Yellow
  toilet: '#c8ebb8',        // Light Green
  mushola: '#b9d7b9',       // Soft Green Sage
  masjid: '#b9d7b9',        // Soft Green Sage
  lobby: '#e6e6e6',         // Light Grey
  koridor: '#f0f0f0',       // Very Light Grey (Lantai 4)
  selasar: '#e6e6e6',       // Light Grey
  tangga: '#c9b4b4',        // Taupe
  taman: '#b4dcb4',         // Pastel Green

  // Laboratory & Diagnostic
  lab: '#b9c3dc',           // Soft Lavender Blue
  laboratorium: '#b9c3dc',  // Soft Lavender Blue
  labolatorium: '#b9c3dc',  // Soft Lavender Blue
  radiologi: '#b4a0c8',     // Lavender Grey

  // Pharmacy & Medical Storage
  farmasi: '#96c8c3',       // Soft Teal
  apotek: '#98c1aa',        // Sage Green
  bank_darah: '#c8919b',    // Soft Wine
  darah: '#c8919b',         // Soft Wine

  // Administration & Support
  r_dokter: '#788cb4',      // Soft Navy
  r_keunagan: '#8296be',    // Steel Blue
  keuangan: '#8296be',      // Steel Blue
  r_keuangan: '#8296be',    // Steel Blue
  r_triase: '#aa6e78',      // Muted Maroon
  r_mayat: '#aaa0af',       // Soft Ash Mauve
  kamar_mayat: '#aaa0af',   // Soft Ash Mauve
  k3: '#aab478',            // Olive Soft
  k3_kesling: '#aab478',    // Olive Soft
  kesling: '#aab478',       // Olive Soft
  r_rekam_medik: '#aab9c8', // Blue Grey
  rekam_medik: '#aab9c8',   // Blue Grey

  // Specialist Services
  r_it: '#a0c8e6',          // Powder Blue
  r_fisioterapi: '#a0c8e6', // Powder Blue
  fisioterapi: '#a0c8e6',   // Powder Blue

  // Specialized Rooms
  kamar_isolasi: '#beaad2', // Soft Violet
  isolasi: '#beaad2',       // Soft Violet
  r_tunggu: '#beb9aa',      // Warm Taupe Grey
  ruang_tunggu: '#beb9aa',  // Warm Taupe Grey
  waiting_room: '#beb9aa',  // Warm Taupe Grey
  trafo: '#c67878',         // Soft Brick
  tarfo: '#c67878',         // Soft Brick
  r_ganti: '#c8bed2',       // Soft Lilac Grey
  kamar_ganti: '#c8bed2',   // Soft Lilac Grey
  r_cesmix: '#c8aa96',      // Light Mocha
  cesmix: '#c8aa96',        // Light Mocha

  // Infrastructure
  dinding: '#d4d4d4',       // Medium Grey (Walls - Lantai 4)
  pintu: '#c9a878',         // Warm Tan (Doors - Lantai 4)
  parking: '#b4b4b4',       // Cool Grey
  ccsd: '#b4dcd2',          // Soft Mint Blue
  r_cssd: '#b4dcd2',        // Soft Mint Blue
  cssd: '#b4dcd2',          // Soft Mint Blue
  tps: '#b59984',           // Warm Brown
  resepsionis: '#d4a5a5',   // Dusty Rose
  pos_satpam: '#9b9b9b',    // Medium Grey
  gizi: '#fff5c8',          // Light Cream
  r_gizi: '#fff5c8',        // Light Cream
  laundry: '#b4dcb4',       // Pastel Green
  r_laundry: '#b4dcb4',     // Pastel Green
  inst_damkar: '#ff9999',   // Coral Red
  r_ruang_operasi: '#e18c8c', // Soft Red
  ruang_operasi: '#e18c8c', // Soft Red
};

// Hospital room styling with full Leaflet properties
export const hospitalRoomStyles = {
  // TOILET - LIGHT GREEN (200,235,200)
  bathroom: { color: '#c8ebb8', weight: 2, fillColor: '#c8ebb8', fillOpacity: 0.6 },
  toilet: { color: '#c8ebb8', weight: 2, fillColor: '#c8ebb8', fillOpacity: 0.6 },
  wc: { color: '#c8ebb8', weight: 2, fillColor: '#c8ebb8', fillOpacity: 0.6 },

  // INST DAMKAR - DUSTY RED (210,130,130)
  'INST. DAMKAR': { color: '#d28282', weight: 2, fillColor: '#d28282', fillOpacity: 0.6 },

  // R GIZI - LIME PASTEL (210,230,160)
  'R. GIZI': { color: '#d2e6a0', weight: 2, fillColor: '#d2e6a0', fillOpacity: 0.6 },

  // LOBBY - SOFT WARM GREY (215,215,205)
  'LOBBY': { color: '#d7d7cd', weight: 2, fillColor: '#d7d7cd', fillOpacity: 0.5 },
  'LOBBY LIFT': { color: '#d7d7cd', weight: 2, fillColor: '#d7d7cd', fillOpacity: 0.5 },

  // R LAUNDRY - SAND (220,200,170)
  'R. LAUNDRY': { color: '#dcc8aa', weight: 2, fillColor: '#dcc8aa', fillOpacity: 0.6 },

  // RESEPSIONIS - SOFT BEIGE (220,205,180)
  'RESEPSIONIS': { color: '#dccdb4', weight: 2, fillColor: '#dccdb4', fillOpacity: 0.5 },

  // RUANG OPERASI - SOFT RED (225,140,140)
  operating_room: { color: '#e18c8c', weight: 2, fillColor: '#e18c8c', fillOpacity: 0.6 },
  operasi: { color: '#e18c8c', weight: 2, fillColor: '#e18c8c', fillOpacity: 0.6 },
  r_oprasi: { color: '#e18c8c', weight: 2, fillColor: '#e18c8c', fillOpacity: 0.6 },
  'R. OPRASI': { color: '#e18c8c', weight: 2, fillColor: '#e18c8c', fillOpacity: 0.6 },

  // IGD - SALMON SOFT (240,150,150)
  igd: { color: '#f09696', weight: 2, fillColor: '#f09696', fillOpacity: 0.6 },
  'IGD': { color: '#f09696', weight: 2, fillColor: '#f09696', fillOpacity: 0.6 },

  // IGM - SOFT ORANGE (240,178,122)
  'IGM': { color: '#f0b27a', weight: 2, fillColor: '#f0b27a', fillOpacity: 0.6 },

  // R BERSALIN - BLUSH (244,170,185)
  bersalin: { color: '#f4aaab', weight: 2, fillColor: '#f4aaab', fillOpacity: 0.6 },
  'R. BERSALIN': { color: '#f4aaab', weight: 2, fillColor: '#f4aaab', fillOpacity: 0.6 },

  // KANTIN - MUTED YELLOW (245,220,130)
  kantin: { color: '#f5dc82', weight: 2, fillColor: '#f5dc82', fillOpacity: 0.5 },

  // IGD ANAK - LIGHT CORAL (255,190,190)
  igm_anak: { color: '#ffbebe', weight: 2, fillColor: '#ffbebe', fillOpacity: 0.6 },
  'IGD ANAK': { color: '#ffbebe', weight: 2, fillColor: '#ffbebe', fillOpacity: 0.6 },

  // R FISIOTERAPI - PEACH (255,200,160)
  'R. PISIOTERAPI': { color: '#ffc8a0', weight: 2, fillColor: '#ffc8a0', fillOpacity: 0.5 },

  // RUANG BAYI - BABY PINK (255,210,220)
  bayi: { color: '#ffd2dc', weight: 2, fillColor: '#ffd2dc', fillOpacity: 0.5 },
  'R. BAYI': { color: '#ffd2dc', weight: 2, fillColor: '#ffd2dc', fillOpacity: 0.5 },

  // R PERAWATAN - CREAM YELLOW (255,240,170)
  perawatan: { color: '#fff0aa', weight: 2, fillColor: '#fff0aa', fillOpacity: 0.5 },
  'R. pERAWATAN': { color: '#fff0aa', weight: 2, fillColor: '#fff0aa', fillOpacity: 0.5 },
  'R. PERAWATAN': { color: '#fff0aa', weight: 2, fillColor: '#fff0aa', fillOpacity: 0.5 },

  // R RAWAT INAP - LIGHT CREAM (255,245,200)
  rawat_inap: { color: '#fff5c8', weight: 2, fillColor: '#fff5c8', fillOpacity: 0.5 },
  'R. RAWAT INAP': { color: '#fff5c8', weight: 2, fillColor: '#fff5c8', fillOpacity: 0.5 },
  ward: { color: '#fff5c8', weight: 2, fillColor: '#fff5c8', fillOpacity: 0.5 },
  hcu: { color: '#fff5c8', weight: 2, fillColor: '#fff5c8', fillOpacity: 0.5 },

  // POS SATPAM - SOFT CHARCOAL (90,90,90)
  'POS SATPAM': { color: '#5a5a5a', weight: 2, fillColor: '#5a5a5a', fillOpacity: 0.5 },
  'pos satpam': { color: '#5a5a5a', weight: 2, fillColor: '#5a5a5a', fillOpacity: 0.5 },
  pos_satpam: { color: '#5a5a5a', weight: 2, fillColor: '#5a5a5a', fillOpacity: 0.5 },

  // Other room types
  patient_room: { color: '#fff5c8', weight: 2, fillColor: '#fff5c8', fillOpacity: 0.5 },
  emergency_room: { color: '#f09696', weight: 2, fillColor: '#f09696', fillOpacity: 0.6 },
  mushola: { color: '#b9d7b9', weight: 2, fillColor: '#b9d7b9', fillOpacity: 0.5 },
  masjid: { color: '#b9d7b9', weight: 2, fillColor: '#b9d7b9', fillOpacity: 0.5 },
  laboratory: { color: '#b9c3dc', weight: 2, fillColor: '#b9c3dc', fillOpacity: 0.5 },
  lab: { color: '#b9c3dc', weight: 2, fillColor: '#b9c3dc', fillOpacity: 0.5 },
  pharmacy: { color: '#a855f7', weight: 2, fillColor: '#a855f7', fillOpacity: 0.5 },
  farmasi: { color: '#96c8c3', weight: 2, fillColor: '#96c8c3', fillOpacity: 0.5 },
  apotek: { color: '#98c1aa', weight: 2, fillColor: '#98c1aa', fillOpacity: 0.5 },
  'FARMASI': { color: '#96c8c3', weight: 2, fillColor: '#96c8c3', fillOpacity: 0.5 },
  radiology: { color: '#b4a0c8', weight: 2, fillColor: '#b4a0c8', fillOpacity: 0.5 },
  xray: { color: '#b4a0c8', weight: 2, fillColor: '#b4a0c8', fillOpacity: 0.5 },
  'RADIOLOGI': { color: '#b4a0c8', weight: 2, fillColor: '#b4a0c8', fillOpacity: 0.5 },
  waiting_room: { color: '#beb9aa', weight: 2, fillColor: '#beb9aa', fillOpacity: 0.4 },
  ruang_tunggu: { color: '#beb9aa', weight: 2, fillColor: '#beb9aa', fillOpacity: 0.4 },
  'RUANG TUNGGU': { color: '#beb9aa', weight: 2, fillColor: '#beb9aa', fillOpacity: 0.4 },
  icu: { color: '#f09696', weight: 2, fillColor: '#f09696', fillOpacity: 0.6 },
  intensive_care: { color: '#f09696', weight: 2, fillColor: '#f09696', fillOpacity: 0.6 },
  office: { color: '#5a5a5a', weight: 2, fillColor: '#5a5a5a', fillOpacity: 0.4 },
  admin: { color: '#a0c8e6', weight: 2, fillColor: '#a0c8e6', fillOpacity: 0.4 },
  r_it: { color: '#a0c8e6', weight: 2, fillColor: '#a0c8e6', fillOpacity: 0.5 },
  'R. IT': { color: '#a0c8e6', weight: 2, fillColor: '#a0c8e6', fillOpacity: 0.5 },
  r_rekam_medik: { color: '#aab9c8', weight: 2, fillColor: '#aab9c8', fillOpacity: 0.5 },
  'R. rekam medik': { color: '#aab9c8', weight: 2, fillColor: '#aab9c8', fillOpacity: 0.5 },
  r_keunagan: { color: '#8296be', weight: 2, fillColor: '#8296be', fillOpacity: 0.5 },
  'R. KEUANGAN': { color: '#8296be', weight: 2, fillColor: '#8296be', fillOpacity: 0.5 },
  keuangan: { color: '#8296be', weight: 2, fillColor: '#8296be', fillOpacity: 0.5 },
  stairs: { color: '#8b6b6b', weight: 2, fillColor: '#8b6b6b', fillOpacity: 0.6 },
  tangga: { color: '#8b6b6b', weight: 2, fillColor: '#8b6b6b', fillOpacity: 0.6 },
  'TANGGA': { color: '#8b6b6b', weight: 2, fillColor: '#8b6b6b', fillOpacity: 0.6 },
  elevator: { color: '#6b21a8', weight: 2, fillColor: '#c084fc', fillOpacity: 0.6 },
  lift: { color: '#6b21a8', weight: 2, fillColor: '#c084fc', fillOpacity: 0.6 },
  corridor: { color: '#d7d7d7', weight: 1, fillColor: '#d7d7d7', fillOpacity: 0.3 },
  hallway: { color: '#d7d7d7', weight: 1, fillColor: '#d7d7d7', fillOpacity: 0.3 },
  koridor: { color: '#d7d7d7', weight: 1, fillColor: '#d7d7d7', fillOpacity: 0.3 },
  'KORIDOR': { color: '#d7d7d7', weight: 1, fillColor: '#d7d7d7', fillOpacity: 0.3 },
  menyusui: { color: '#ffd2dc', weight: 2, fillColor: '#ffd2dc', fillOpacity: 0.5 },
  bank_darah: { color: '#c8919b', weight: 2, fillColor: '#c8919b', fillOpacity: 0.5 },
  'R. BANK DARAH': { color: '#c8919b', weight: 2, fillColor: '#c8919b', fillOpacity: 0.5 },
  r_mayat: { color: '#aaa0af', weight: 2, fillColor: '#aaa0af', fillOpacity: 0.5 },
  'R. MAYAT': { color: '#aaa0af', weight: 2, fillColor: '#aaa0af', fillOpacity: 0.5 },
  r_ganti: { color: '#c8bed2', weight: 2, fillColor: '#c8bed2', fillOpacity: 0.5 },
  'R. GANTI': { color: '#c8bed2', weight: 2, fillColor: '#c8bed2', fillOpacity: 0.5 },
  ganti: { color: '#c8bed2', weight: 2, fillColor: '#c8bed2', fillOpacity: 0.5 },
  r_dokter: { color: '#788cb4', weight: 2, fillColor: '#788cb4', fillOpacity: 0.5 },
  'R. DOKTER': { color: '#788cb4', weight: 2, fillColor: '#788cb4', fillOpacity: 0.5 },
  dokter: { color: '#788cb4', weight: 2, fillColor: '#788cb4', fillOpacity: 0.5 },
  'R. TRIASE': { color: '#aa6e78', weight: 2, fillColor: '#aa6e78', fillOpacity: 0.6 },
  k3: { color: '#aab478', weight: 2, fillColor: '#aab478', fillOpacity: 0.5 },
  kesling: { color: '#aab478', weight: 2, fillColor: '#aab478', fillOpacity: 0.5 },
  'R. K3 & KESLING': { color: '#aab478', weight: 2, fillColor: '#aab478', fillOpacity: 0.5 },
  'KAMAR ISOLASI': { color: '#beaad2', weight: 2, fillColor: '#beaad2', fillOpacity: 0.5 },
  tarfo: { color: '#c67878', weight: 2, fillColor: '#c67878', fillOpacity: 0.5 },
  'R. CESMIX': { color: '#c8aa96', weight: 2, fillColor: '#c8aa96', fillOpacity: 0.5 },
  'PARKING': { color: '#b4b4b4', weight: 2, fillColor: '#b4b4b4', fillOpacity: 0.4 },
  'TAMAN': { color: '#b4dcb4', weight: 1, fillColor: '#b4dcb4', fillOpacity: 0.4 },
  'CCSD': { color: '#b4dcd2', weight: 2, fillColor: '#b4dcd2', fillOpacity: 0.5 },
  'R. CSSD': { color: '#b4dcd2', weight: 2, fillColor: '#b4dcd2', fillOpacity: 0.5 },
  tps: { color: '#b59984', weight: 2, fillColor: '#b59984', fillOpacity: 0.5 },
  'LABOLATORIUM': { color: '#b9c3dc', weight: 2, fillColor: '#b9c3dc', fillOpacity: 0.5 },

  // Default Westport House types
  building_outline: { color: '#1e3a8a', weight: 3, fillColor: '#dbeafe', fillOpacity: 0.2 },
  wall: { color: '#374151', weight: 2, fillColor: '#9ca3af', fillOpacity: 0.5 },
  door: { color: '#059669', weight: 2, fillColor: '#6ee7b7', fillOpacity: 0.6 },
  window: { color: '#0284c7', weight: 1, fillColor: '#7dd3fc', fillOpacity: 0.4 },
  inaccessible_space: { color: '#6b7280', weight: 1, fillColor: '#d1d5db', fillOpacity: 0.7 },
};

// CAD styling
export const cadStyles = {
  'AcDbEntity:AcDbCircle:AcDbArc': { color: '#3b82f6', weight: 2, fillColor: '#93c5fd', fillOpacity: 0.4 },
  'AcDbEntity:AcDbPolyline': { color: '#1f2937', weight: 2, fillColor: '#6b7280', fillOpacity: 0.3 },
  'AcDbEntity:AcDbBlockReference': { color: '#059669', weight: 2, fillColor: '#6ee7b7', fillOpacity: 0.5 },
};

export default roomColors;
