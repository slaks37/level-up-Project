import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Box, Camera, ImagePlus, LoaderCircle, Rotate3D, Trash2, UserRound } from 'lucide-react';
import type { Language } from '../types';
import { tr } from '../data/i18n';
import { AvatarPhotoError, createAvatarPhoto, type AvatarPhotoIssue } from '../services/avatarPhoto';
import { deleteAvatarPhoto, loadAvatarPhoto, saveAvatarPhoto } from '../services/avatarStorage';
import { AvatarCamera } from './AvatarCamera';
import { AvatarStage } from './AvatarStage';

interface ThreeAvatarViewportProps {
  owner: string;
  coreCharge: number;
  lang: Language;
  onExtractOverdrive: () => void;
}

const errors: Record<AvatarPhotoIssue | 'storage', Record<Language, string>> = {
  size: { id: 'Pilih foto di bawah 20 MB.', en: 'Choose a photo under 20 MB.' },
  format: { id: 'Foto tidak bisa dibuka. Coba JPG, PNG, atau WebP.', en: 'Could not open the photo. Try JPG, PNG, or WebP.' },
  fullBody: { id: 'Tubuh belum terlihat lengkap. Coba foto dengan kepala, tangan, dan kaki di dalam bingkai.', en: 'We could not see the whole body. Try a photo with your head, hands, and feet in the frame.' },
  multiple: { id: 'Gunakan foto yang hanya berisi satu orang.', en: 'Use a photo with one person in it.' },
  processing: { id: 'Avatar belum berhasil dibuat. Cek koneksi, lalu coba lagi.', en: 'Could not create the avatar. Check your connection and try again.' },
  storage: { id: 'Penyimpanan perangkat tidak tersedia.', en: 'Device storage is unavailable.' },
};

const primaryButton = 'inline-flex items-center justify-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-sky-900 disabled:opacity-50';
const secondaryButton = 'inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50';

export function ThreeAvatarViewport({ owner, coreCharge, lang, onExtractOverdrive }: ThreeAvatarViewportProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const active = useRef(false);
  const processing = useRef(false);
  const [photo, setPhoto] = useState<Blob>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const [error, setError] = useState<keyof typeof errors>();
  const id = lang === 'id';
  const charged = coreCharge >= 4;

  useEffect(() => {
    active.current = true;
    let cancelled = false;
    void loadAvatarPhoto(owner).then((stored) => {
      if (!cancelled) setPhoto(stored);
    }).catch(() => {
      if (!cancelled) setError('storage');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
      active.current = false;
    };
  }, [owner]);

  const generate = async (file: File) => {
    if (processing.current || !active.current) return;
    processing.current = true;
    setCameraOpen(false);
    setError(undefined);
    setBusy(true);
    try {
      const avatar = await createAvatarPhoto(file);
      if (!active.current) return;
      try {
        await saveAvatarPhoto(owner, avatar);
      } catch {
        if (active.current) setError('storage');
      }
      if (active.current) {
        setPhoto(avatar);
        setSolid(false);
      }
    } catch (failure) {
      if (active.current) setError(failure instanceof AvatarPhotoError ? failure.issue : 'processing');
    } finally {
      processing.current = false;
      if (active.current) setBusy(false);
    }
  };

  const select = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file) void generate(file);
  };

  const remove = async () => {
    if (processing.current) return;
    processing.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await deleteAvatarPhoto(owner);
      if (active.current) setPhoto(undefined);
    } catch {
      if (active.current) setError('storage');
    } finally {
      processing.current = false;
      if (active.current) setBusy(false);
    }
  };

  const choose = () => {
    setCameraOpen(false);
    fileInput.current?.click();
  };

  return (
    <div className="anime-panel flex h-full min-w-0 flex-col overflow-hidden">
      <div className="blender-bar flex min-h-9 flex-wrap items-center justify-between gap-2 px-3.5 py-1.5">
        <h2 className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-wide text-slate-700">
          <Box className="size-3.5 text-orange-600" aria-hidden="true" /> AVATAR 3D
        </h2>
        {photo && (
          <div className="flex gap-1 font-mono text-[10px] font-bold">
            <button type="button" aria-pressed={!solid} onClick={() => setSolid(false)}
              className={`rounded border px-2 py-0.5 ${!solid ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700'}`}>
              {id ? 'FOTO' : 'PHOTO'}
            </button>
            <button type="button" aria-pressed={solid} onClick={() => setSolid(true)}
              className={`rounded border px-2 py-0.5 ${solid ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700'}`}>
              SOLID
            </button>
          </div>
        )}
      </div>

      <div className="relative flex min-h-[280px] flex-1 flex-col bg-slate-100">
        {photo && <AvatarStage photo={photo} solid={solid} lang={lang} />}
        {!photo && !loading && !busy && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[radial-gradient(ellipse_at_top,#fff_0%,#e8eff6_70%)] px-5 py-6 text-center">
            <div className="grid size-14 place-items-center rounded-xl border border-sky-200 bg-white text-sky-700 shadow-sm">
              <UserRound className="size-7" aria-hidden="true" />
            </div>
            <div className="max-w-[260px] space-y-1.5">
              <p className="font-hud text-lg font-bold text-slate-900">{id ? 'Buat avatar dari fotomu' : 'Create your 3D avatar'}</p>
              <p className="text-xs leading-relaxed text-slate-600">
                {id ? 'Gunakan foto dari depan, dari kepala hingga kaki. Berdiri tegak dengan lengan sedikit renggang.' :
                  'Use a front-facing photo from head to toe. Stand upright with your arms slightly apart.'}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => setCameraOpen(true)} className={primaryButton}>
                <Camera className="size-4" aria-hidden="true" /> {id ? 'Ambil foto' : 'Take photo'}
              </button>
              <button type="button" onClick={choose} className={secondaryButton}>
                <ImagePlus className="size-4" aria-hidden="true" /> {id ? 'Pilih foto' : 'Choose photo'}
              </button>
            </div>
          </div>
        )}
        {(loading || busy) && (
          <div role="status" className="absolute inset-0 z-10 grid place-items-center bg-slate-100/85">
            <span className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
              <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />
              {loading ? (id ? 'Memuat avatar…' : 'Loading avatar…') : (id ? 'Memproses avatar…' : 'Processing avatar…')}
            </span>
          </div>
        )}
        {cameraOpen && <AvatarCamera lang={lang} onPhoto={(file) => void generate(file)} onClose={() => setCameraOpen(false)} onChoose={choose} />}
      </div>

      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" className="hidden" onChange={select} />
      <div className="space-y-2 border-t border-slate-200 bg-white px-3 py-2">
        {error && <p role="alert" className="rounded border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs text-orange-900">{errors[error][lang]}</p>}
        {photo && (
          <p className="flex items-center gap-1.5 font-mono text-[10px] text-slate-600">
            <Rotate3D className="size-3.5" aria-hidden="true" /> {id ? 'Geser untuk memutar' : 'Drag to rotate'}
          </p>
        )}
        {photo && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" disabled={busy} onClick={() => setCameraOpen(true)} className={secondaryButton}>
              <Camera className="size-3.5" aria-hidden="true" /> {id ? 'Ambil ulang' : 'Retake'}
            </button>
            <button type="button" disabled={busy} onClick={choose} className={secondaryButton}>
              <ImagePlus className="size-3.5" aria-hidden="true" /> {id ? 'Ganti foto' : 'Change photo'}
            </button>
            <button type="button" disabled={busy} onClick={() => void remove()}
              className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50">
              <Trash2 className="size-3.5" aria-hidden="true" /> {id ? 'Hapus' : 'Remove'}
            </button>
          </div>
        )}
        <p className="text-[11px] leading-relaxed text-slate-600">
          {photo
            ? (id ? 'Sisi dan belakang adalah perkiraan dari satu foto.' : 'Side and rear views are estimated from one photo.')
            : (id ? 'Foto diproses di browser. Avatar disimpan di perangkat ini.' : 'Photo processing runs in your browser. Your avatar stays on this device.')}
        </p>
        <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2">
          <div className="text-[11px]">
            <span className="font-bold text-slate-700">{tr(lang, 'lblCoreEnergy')} </span>
            <span className={`font-mono font-bold ${charged ? 'text-orange-600' : 'text-sky-700'}`}>{coreCharge} / 4 Node</span>
          </div>
          <button type="button" onClick={onExtractOverdrive}
            className={`btn-anime rounded px-2.5 py-1 font-hud text-[10px] font-bold uppercase tracking-wider transition ${charged ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>
            {tr(lang, 'btnExtractCore')}
          </button>
        </div>
      </div>
    </div>
  );
}
