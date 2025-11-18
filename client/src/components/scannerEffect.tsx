import React, { useEffect, useState } from 'react';

interface ScannerEffectProps {
  imageUrl: string;
  width?: number;
  height?: number;
  scanDuration?: number; // durata in secondi
  scanDelay?: number; // ritardo prima del prossimo scan
  autoRepeat?: boolean;
  className?: string;
}

export default function ScannerEffect({
  imageUrl,
  width = 300,
  height = 400,
  scanDuration = 3,
  scanDelay = 2,
  autoRepeat = true,
  className = ''
}: ScannerEffectProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanPosition, setScanPosition] = useState(-100);
  const [scanDirection, setScanDirection] = useState(1); // 1 = down, -1 = up

  useEffect(() => {
    if (!autoRepeat) return;

    const startScan = () => {
      setIsScanning(true);
      setScanPosition(-100);
      setScanDirection(1);

      // Animazione dello scanner avanti e indietro
      const scanInterval = setInterval(() => {
        setScanPosition(prev => {
          const speed = (height + 200) / (scanDuration * 60); // 60fps
          
          if (scanDirection === 1) {
            // Andando verso il basso
            if (prev >= height + 50) {
              setScanDirection(-1);
              return height + 50;
            }
            return prev + speed;
          } else {
            // Andando verso l'alto
            if (prev <= -100) {
              clearInterval(scanInterval);
              setIsScanning(false);
              
              // Programma il prossimo scan
              setTimeout(startScan, scanDelay * 1000);
              return -100;
            }
            return prev - speed;
          }
        });
      }, 1000 / 60);

      return () => clearInterval(scanInterval);
    };

    // Primo scan dopo un piccolo ritardo
    const initialTimeout = setTimeout(startScan, 500);

    return () => {
      clearTimeout(initialTimeout);
    };
  }, [height, scanDuration, scanDelay, autoRepeat, scanDirection]);

  const triggerScan = () => {
    if (isScanning) return;
    
    setIsScanning(true);
    setScanPosition(-100);
    setScanDirection(1);

    const scanInterval = setInterval(() => {
      setScanPosition(prev => {
        const speed = (height + 200) / (scanDuration * 60);
        
        if (scanDirection === 1) {
          // Andando verso il basso
          if (prev >= height + 50) {
            setScanDirection(-1);
            return height + 50;
          }
          return prev + speed;
        } else {
          // Andando verso l'alto
          if (prev <= -100) {
            clearInterval(scanInterval);
            setIsScanning(false);
            return -100;
          }
          return prev - speed;
        }
      });
    }, 1000 / 60);
  };

  return (
    <div 
      className={`scanner-container ${className}`}
      style={{
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
        overflow: 'hidden',
        borderRadius: '8px',
        cursor: autoRepeat ? 'default' : 'pointer',
        border: '2px solid rgba(127, 210, 255, 0.3)',
        boxShadow: '0 0 20px rgba(127, 210, 255, 0.2)'
      }}
      onClick={!autoRepeat ? triggerScan : undefined}
    >
      {/* Immagine di base */}
      <img 
        src={imageUrl}
        alt="Scanner target"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block'
        }}
      />
      
      {/* Overlay scuro */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 20, 40, 0.7)',
          pointerEvents: 'none'
        }}
      />
      
      {/* Linea scanner */}
      {isScanning && (
        <>
          {/* Fascio di luce principale */}
          <div 
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: '4px',
              top: `${scanPosition}px`,
              background: scanDirection === 1 
                ? 'linear-gradient(90deg, transparent, #dfffff, #dfffff, #dfffff, transparent)'
                : 'linear-gradient(90deg, transparent, #dfffff, #dfffff, #dfffff, transparent)',
              boxShadow: `0 0 20px ${scanDirection === 1 ? '#dfffff' : '#dfffff'}, 0 0 40px ${scanDirection === 1 ? '#dfffff' : '#dfffff'}`,
              zIndex: 10,
              pointerEvents: 'none'
            }}
          />
          
          {/* Fascio di luce secondario */}
          <div 
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: '2px',
              top: `${scanPosition + 2}px`,
              background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent)',
              zIndex: 11,
              pointerEvents: 'none'
            }}
          />
          
          {/* Area illuminata che segue lo scanner */}
          <div 
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: scanDirection === 1 ? 0 : `${Math.max(0, scanPosition)}px`,
              bottom: scanDirection === 1 ? `${Math.max(0, height - scanPosition - 50)}px` : 0,
              background: scanDirection === 1 
                ? `linear-gradient(to bottom, 
                    rgba(127, 210, 255, 0.15) 0%,
                    rgba(127, 210, 255, 0.1) 70%,
                    rgba(127, 210, 255, 0.05) 90%,
                    transparent 100%)`
                : `linear-gradient(to top, 
                    rgba(127, 210, 255, 0.15) 0%,
                    rgba(127, 210, 255, 0.1) 70%,
                    rgba(127, 210, 255, 0.05) 90%,
                    transparent 100%)`,
              zIndex: 5,
              pointerEvents: 'none'
            }}
          />
          
          {/* Effetto griglia scanner */}
          <div 
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: `${scanPosition - 10}px`,
              height: '20px',
              background: `repeating-linear-gradient(
                90deg,
                transparent,
                transparent 2px,
                rgba(127, 210, 255, 0.1) 2px,
                rgba(127, 210, 255, 0.1) 4px
              )`,
              zIndex: 6,
              pointerEvents: 'none'
            }}
          />
        </>
      )}
      
      {/* Bordo con glow quando scannerizza */}
      {isScanning && (
        <div 
          style={{
            position: 'absolute',
            top: '-2px',
            left: '-2px',
            right: '-2px',
            bottom: '-2px',
            border: '2px solid #dfffff',
            borderRadius: '8px',
            boxShadow: '0 0 30px rgba(223, 255, 255, 0.6), inset 0 0 30px rgba(223, 255, 255, 0.1)',
            pointerEvents: 'none',
            zIndex: 15
          }}
        />
      )}
      
      {/* Indicatore stato */}
      <div 
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: isScanning ? '#dfffff' : '#666',
          boxShadow: isScanning ? '0 0 10px #dfffff' : 'none',
          zIndex: 20
        }}
      />
      
      {/* Testo stato con direzione */}
      <div 
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          color: '#dfffff',
          fontSize: '12px',
          fontFamily: 'monospace',
          textShadow: '0 0 5px rgba(223, 255, 255, 0.5)',
          zIndex: 20,
          pointerEvents: 'none'
        }}
      >
        {isScanning 
          ? `SCANNING ${scanDirection === 1 ? '↓' : '↑'}` 
          : 'READY'
        }
      </div>
    </div>
  );
}