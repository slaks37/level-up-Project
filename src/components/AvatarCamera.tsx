import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import type { Language } from '../types';

interface AvatarCameraProps {
  lang: Language;
  onPhoto: (file: File) => void;
  onClose: () => void;
  onChoose: () => void;
}

export function AvatarCamera({ lang, onPhoto, onClose, onChoose }: AvatarCameraProps) {
  const preview = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [capturing, setCapturing] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const id = lang === 'id';

  useEffect(() => {
    let active = true;
    let stream: MediaStream | undefined;
    const element = video.current;
    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } },
        });
        if (!active || !element) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        element.srcObject = stream;
        await element.play();
      } catch {
        if (active) setFailed(true);
      }
    };
    void start();

    return () => {
      active = false;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    const element = preview.current;
    if (!element) return;
    const closeIfHidden = () => {
      if (document.hidden || !element.clientHeight) onClose();
    };
    const observer = new ResizeObserver(closeIfHidden);
    observer.observe(element);
    document.addEventListener('visibilitychange', closeIfHidden);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', closeIfHidden);
    };
  }, [onClose]);

  const capture = () => {
    const frame = video.current;
    if (!frame?.videoWidth || !frame.videoHeight) return;
    const canvas = document.createElement('canvas');
    canvas.width = frame.videoWidth;
    canvas.height = frame.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    setCapturing(true);
    context.drawImage(frame, 0, 0);
    canvas.toBlob((blob) => {
      if (!preview.current) return;
      if (blob) onPhoto(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
      else setFailed(true);
      setCapturing(false);
    }, 'image/jpeg', 0.9);
  };

  return (
    <div ref={preview} className="absolute inset-0 z-20 flex flex-col bg-slate-900 text-white">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="text-xs">{id ? 'Pastikan kepala hingga kaki terlihat.' : 'Fit your whole body in the frame.'}</span>
        <button type="button" className="rounded p-1 hover:bg-slate-700" aria-label={id ? 'Tutup kamera' : 'Close camera'} onClick={onClose}>
          <X className="size-4" />
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        <video ref={video} autoPlay muted playsInline onCanPlay={() => setReady(true)} className="size-full object-contain" />
        {ready && <div aria-hidden="true" className="pointer-events-none absolute inset-y-2 inset-x-[26%] rounded-2xl border border-dashed border-white/75" />}
        {(!ready || failed) && (
          <div className="absolute inset-0 grid place-items-center p-4 text-center text-sm">
            {failed ? (id ? 'Kamera tidak tersedia. Pilih foto dari galeri.' : 'Camera unavailable. Choose a photo instead.') :
              (id ? 'Membuka kamera…' : 'Opening camera…')}
          </div>
        )}
      </div>
      <div className="flex items-center justify-center gap-3 px-2 py-2">
        <button type="button" disabled={!ready || failed || capturing} onClick={capture}
          className="flex items-center gap-1.5 rounded bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 disabled:opacity-45">
          <Camera className="size-4" /> {id ? 'Ambil foto' : 'Capture photo'}
        </button>
        <button type="button" onClick={onChoose} className="rounded border border-slate-500 px-2.5 py-1.5 text-xs font-bold">
          {id ? 'Pilih foto' : 'Choose photo'}
        </button>
      </div>
    </div>
  );
}
