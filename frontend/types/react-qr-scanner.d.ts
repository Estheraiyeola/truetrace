// types/react-qr-scanner.d.ts
declare module 'react-qr-scanner' {
  import { ComponentType } from 'react';

  interface QrReaderProps {
    delay?: number;
    onError?: (error: any) => void;
    onScan?: (data: { text: string } | null) => void;
    style?: React.CSSProperties;
    facingMode?: 'user' | 'environment';
  }

  const QrReader: ComponentType<QrReaderProps>;
  export default QrReader;
}