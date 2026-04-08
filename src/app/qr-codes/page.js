'use client';

import { QRCodeSVG } from 'qrcode.react';

// Data QR Code untuk setiap ruangan
// Koordinat adalah titik tengah area ruangan (dari lantai-1-area.geojson)
const qrCodes = [

    {
        roomId: 'mshl-001',
        name: 'Mushola Utama',
        type: 'mushola',
        floor: 1,
        coords: [2597, 3525], // Titik tengah area mushola
        description: 'Pintu masuk mushola utama lantai 1',
    },
    {
        roomId: 'knt-001',
        name: 'Kantin Utama',
        type: 'kantin',
        floor: 1,
        coords: [1662, 4888], // Titik tengah area kantin utama
        description: 'Pintu masuk kantin utama lantai 1',
    },

    {
        roomId: 'knt-002',
        name: 'Kantin',
        type: 'kantin',
        floor: 1,
        coords: [1610, 5667], // Titik tengah area kantin 2
        description: 'Pintu masuk kantin lantai 1',
    },
];

export default function QRCodesPage() {
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">🏥 QR Code Generator</h1>
                <p className="text-gray-500 mb-6">
                    Print atau tampilkan QR Code ini di layar lain, lalu scan dari aplikasi utama.
                </p>

                <div className="space-y-6">
                    {qrCodes.map((qr) => {
                        const qrData = JSON.stringify(qr);
                        return (
                            <div
                                key={qr.roomId}
                                className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center gap-4"
                            >
                                <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">
                                    <QRCodeSVG
                                        value={qrData}
                                        size={200}
                                        level="M"
                                        includeMargin={true}
                                    />
                                </div>

                                <div className="text-center">
                                    <h2 className="font-bold text-lg text-gray-900">{qr.name}</h2>
                                    <p className="text-sm text-gray-500">{qr.description}</p>
                                    <div className="mt-2 flex gap-2 justify-center">
                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                            {qr.type}
                                        </span>
                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                                            {qr.roomId}
                                        </span>
                                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                            Lantai {qr.floor}
                                        </span>
                                    </div>
                                </div>

                                {/* Data JSON untuk debug */}
                                <details className="w-full">
                                    <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                                        Lihat data QR
                                    </summary>
                                    <pre className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-600 overflow-x-auto">
                                        {JSON.stringify(qr, null, 2)}
                                    </pre>
                                </details>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">📱 Cara Test:</h3>
                    <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                        <li>Buka halaman ini di <strong>layar lain</strong> (HP/monitor/tab browser)</li>
                        <li>Buka aplikasi utama di <a href="/" className="underline font-medium">localhost:3000</a></li>
                        <li>Tekan tombol <strong>📷 Scan QR</strong> (biru) di kanan bawah</li>
                        <li>Arahkan kamera ke salah satu QR Code di atas</li>
                        <li>Posisi user akan muncul di peta!</li>
                    </ol>
                </div>

                <div className="mt-4 text-center">
                    <a href="/" className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                        ← Kembali ke Peta
                    </a>
                </div>
            </div>
        </div>
    );
}
