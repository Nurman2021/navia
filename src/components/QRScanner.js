'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QRScanner({ onScanSuccess, onClose }) {
    const html5QrCodeRef = useRef(null);
    const isRunningRef = useRef(false);
    const [error, setError] = useState(null);
    const [isStarting, setIsStarting] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const startScanner = async () => {
            try {
                const html5QrCode = new Html5Qrcode('qr-reader');
                html5QrCodeRef.current = html5QrCode;

                await html5QrCode.start(
                    { facingMode: 'environment' },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                    },
                    (decodedText) => {
                        try {
                            const data = JSON.parse(decodedText);
                            if (data.roomId && data.coords) {
                                // Stop dulu baru callback
                                stopScanner().then(() => {
                                    if (!cancelled) onScanSuccess(data);
                                });
                            } else {
                                setError('QR Code tidak valid: format salah');
                            }
                        } catch (e) {
                            setError('QR Code tidak valid: bukan JSON');
                        }
                    },
                    () => { } // Scan gagal - normal
                );

                if (!cancelled) {
                    isRunningRef.current = true;
                    setIsStarting(false);
                }
            } catch (err) {
                console.error('Camera error:', err);
                if (!cancelled) {
                    setError(`Tidak bisa akses kamera: ${err.message || err}`);
                    setIsStarting(false);
                }
            }
        };

        startScanner();

        return () => {
            cancelled = true;
            stopScanner();
        };
    }, []);

    const stopScanner = async () => {
        if (html5QrCodeRef.current && isRunningRef.current) {
            try {
                await html5QrCodeRef.current.stop();
            } catch (e) {
                // Ignore stop errors
            }
            isRunningRef.current = false;
        }
    };

    const handleClose = async () => {
        await stopScanner();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-2000 bg-black flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-black/80">
                <h2 className="text-white font-semibold text-lg">Scan QR Code</h2>
                <button
                    onClick={handleClose}
                    className="text-white p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Scanner Area */}
            <div className="flex-1 flex flex-col items-center justify-center">
                <div id="qr-reader" className="w-full max-w-sm" />

                {isStarting && !error && (
                    <p className="text-white mt-4 text-center">Membuka kamera...</p>
                )}

                {error && (
                    <div className="mt-4 mx-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                        <p className="text-red-300 text-sm text-center">{error}</p>
                        <button
                            onClick={handleClose}
                            className="mt-3 w-full py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                        >
                            Tutup
                        </button>
                    </div>
                )}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-4 bg-black/80">
                <p className="text-white/70 text-sm text-center">
                    Arahkan kamera ke QR Code di pintu ruangan
                </p>
            </div>
        </div>
    );
}
