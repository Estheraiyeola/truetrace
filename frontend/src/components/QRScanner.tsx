// src/components/QRScanner.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QRCodeSVG } from 'qrcode.react';

interface QRScannerProps {
  onScan: (data: { batchId?: string; cartonId?: string; productId?: string }) => void;
}

const QRScanner = ({ onScan }: QRScannerProps) => {
  const [scanResult, setScanResult] = useState<{ batchId?: string; cartonId?: string; productId?: string }>({});
  const [error, setError] = useState('');
  const qrRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5Qrcode('qr-reader');
    scannerRef.current
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => {
          try {
            const parsed = JSON.parse(text);
            const result = {
              batchId: parsed.batchId || '',
              cartonId: parsed.cartonId || '',
              productId: parsed.productId || '',
            };
            setScanResult(result);
            onScan(result);
            setError('');
          } catch (e) {
            setError('Invalid QR code');
          }
        },
        (err) => {
          setError('Error scanning QR code');
          console.error(err);
        }
      )
      .catch((err) => console.error('Failed to start scanner', err));

    return () => {
      scannerRef.current?.stop().catch((err) => console.error('Failed to stop scanner', err));
    };
  }, [onScan]);

  return (
    <div className="space-y-4">
      <div id="qr-reader" style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }} ref={qrRef}></div>
      {error && <p className="text-red-600 text-center">{error}</p>}
      {(scanResult.batchId || scanResult.cartonId || scanResult.productId) && (
        <div className="text-center">
          <p className="text-gray-600">Scanned Data:</p>
          <pre className="text-sm text-gray-800 bg-gray-100 p-2 rounded">
            {JSON.stringify(scanResult, null, 2)}
          </pre>
          <div className="mt-4">
            <QRCodeSVG value={JSON.stringify(scanResult)} size={128} />
          </div>
        </div>
      )}
    </div>
  );
};

export default QRScanner;