import React, { useState, useRef, useEffect } from 'react';
import { 
  ClipboardCheck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileCheck, 
  Truck, 
  HardHat, 
  ArrowRight, 
  ArrowLeft,
  Upload, 
  Camera, 
  Image as ImageIcon, 
  X,
  FileText,
  Search,
  Check,
  Home,
  LogOut,
  User,
  HardDrive,
  Bell,
  PackageCheck,
  AlertTriangle,
  Eye,
  Megaphone,
  PauseCircle,
  Play,
  Trash2,
  RefreshCw,
  FlaskConical
} from 'lucide-react';
import { useWarehouse } from '../context/WarehouseContext';
import { UnloadingRecord, GoodsCondition, WAREHOUSE_ZONES } from '../types';
import { formatDateTime, formatShortTime, calculateLeadTime, formatDuration, getLocalDateString, isRecordToday } from '../utils/timeUtils';
import { GoogleDriveModal } from './GoogleDriveModal';

/**
 * Algoritma Kompresi Zero-Crash (Memory Safe) menggunakan createImageBitmap / Canvas
 * Mencegah crash browser "Unable to complete previous operation due to low memory" pada HP:
 * 1. Decode dimensi gambar tanpa memuat resolusi penuh mentah ke RAM
 * 2. Segera bebaskan memori dengan bitmap.close() dan pembersihan canvas
 * 3. Ekspor ke JPEG kualitas 0.5 (ukuran file sangat ringan ~60-120 KB)
 * 4. Kompatibel dengan input type="file" accept="image/*" (dialog pilihan Kamera / Media Galeri)
 */
export async function processImageSafe(file: File): Promise<string> {
  const MAX_DIMENSION = 800; // max dimensi 800px sesuai instruksi kompresi ringan (< 150KB)
  
  // 1. Dapatkan dimensi asli tanpa decode bitmap penuh jika didukung
  let bitmap: ImageBitmap | null = null;
  try {
    if (typeof window !== 'undefined' && typeof window.createImageBitmap === 'function') {
      bitmap = await createImageBitmap(file);
    }
  } catch (e) {
    console.warn('createImageBitmap tidak berhasil, beralih ke fallback FileReader:', e);
    bitmap = null;
  }

  if (!bitmap) {
    // Fallback untuk browser lawas
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          if (width > height && width > MAX_DIMENSION) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else if (height > MAX_DIMENSION) {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
          canvas.width = 0;
          canvas.height = 0;
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = ev.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  let { width, height } = bitmap;
  if (width > height && width > MAX_DIMENSION) {
    height = Math.round((height * MAX_DIMENSION) / width);
    width = MAX_DIMENSION;
  } else if (height > MAX_DIMENSION) {
    width = Math.round((width * MAX_DIMENSION) / height);
    height = MAX_DIMENSION;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(bitmap, 0, 0, width, height);
  }
  bitmap.close(); // Bersihkan RAM HP seketika

  const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
  canvas.width = 0;
  canvas.height = 0;
  return dataUrl;
}

// Alias untuk kompatibilitas ke fungsi sebelumnya
export const compressImageUltraLight = processImageSafe;
export const compressImageFile = processImageSafe;

export const AdminView: React.FC = () => {
  const { 
    records, 
    stats,
    verifyPOAndAssignDock, 
    verifyPOAndHold,
    releaseQueueToDock,
    finishUnloading, 
    completeAdminFinalVerification,
    setSelectedRecord,
    setActiveRole,
    returnToPortal,
    logout,
    authUser,
    currentTime
  } = useWarehouse();

  const [isGoogleDriveOpen, setIsGoogleDriveOpen] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Active sub-tab in Admin View
  const [adminTab, setAdminTab] = useState<'step1_po' | 'antri_mundur' | 'step2_final' | 'all_records'>('step1_po');
  const [searchFilter, setSearchFilter] = useState('');
  const [adminDateFilter, setAdminDateFilter] = useState<'TODAY' | 'ALL'>('TODAY');

  // Step 1 Verification Modal / Drawer State
  const [verifyingRecord, setVerifyingRecord] = useState<UnloadingRecord | null>(null);
  const [dockInput, setDockInput] = useState<string>('Gudang BA1 depan');
  const [adminNotes1, setAdminNotes1] = useState('');
  const [adminName1, setAdminName1] = useState(authUser?.name || 'Admin WH CKL');
  const [supplementalPhoto, setSupplementalPhoto] = useState<string | null>(null);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [qcApprovalTime, setQcApprovalTime] = useState('');
  const [qcApprovedBy, setQcApprovedBy] = useState('');

  // Modal State untuk Pelepasan Antre Mundur Khusus Armada Tanki (Input Wajib Jam ACC QC)
  const [tankiReleaseModalRecord, setTankiReleaseModalRecord] = useState<UnloadingRecord | null>(null);
  const [releaseQcTime, setReleaseQcTime] = useState('');
  const [releaseQcBy, setReleaseQcBy] = useState('');
  const [isSubmittingRelease, setIsSubmittingRelease] = useState(false);

  // Backup & Restore State Modal Form ke SessionStorage (Mencegah Kehilangan Input jika OS HP reload tab saat buka kamera)
  const STEP1_FORM_BACKUP_KEY = 'wh_admin_step1_form_backup';

  // Restore form modal jika tab browser HP me-reload saat membuka kamera
  useEffect(() => {
    if (!verifyingRecord && records.length > 0) {
      try {
        const saved = sessionStorage.getItem(STEP1_FORM_BACKUP_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const targetRec = records.find(r => r.id === parsed.recordId);
          if (targetRec && targetRec.status === 'MENUNGGU_VERIFIKASI_PO') {
            setVerifyingRecord(targetRec);
            setDockInput(parsed.dockInput || targetRec.assignedDock || 'Gudang BA1 depan');
            setAdminNotes1(parsed.adminNotes1 || '');
            setAdminName1(parsed.adminName1 || authUser?.name || 'Admin WH CKL');
            setSupplementalPhoto(parsed.supplementalPhoto || targetRec.suratJalanPhoto || null);
            setQcApprovalTime(parsed.qcApprovalTime || targetRec.qcApprovalTime || '');
            setQcApprovedBy(parsed.qcApprovedBy || targetRec.qcApprovedBy || '');
          } else {
            sessionStorage.removeItem(STEP1_FORM_BACKUP_KEY);
          }
        }
      } catch (e) {
        console.warn('Gagal memulihkan backup modal form verifikasi:', e);
      }
    }
  }, [records, verifyingRecord, authUser?.name]);

  // Simpan data input form modal ke sessionStorage secara reaktif
  useEffect(() => {
    if (verifyingRecord) {
      try {
        const backup = {
          recordId: verifyingRecord.id,
          dockInput,
          adminNotes1,
          adminName1,
          supplementalPhoto,
          qcApprovalTime,
          qcApprovedBy,
        };
        sessionStorage.setItem(STEP1_FORM_BACKUP_KEY, JSON.stringify(backup));
      } catch (e) {
        console.warn('Gagal menyimpan backup form verifikasi ke sessionStorage:', e);
      }
    }
  }, [verifyingRecord, dockInput, adminNotes1, adminName1, supplementalPhoto, qcApprovalTime, qcApprovedBy]);

  const handleCloseVerify = () => {
    setVerifyingRecord(null);
    setPhotoError(null);
    try {
      sessionStorage.removeItem(STEP1_FORM_BACKUP_KEY);
    } catch {}
  };

  // Step 2 Finalization Modal / Drawer State
  const [finalizingRecord, setFinalizingRecord] = useState<UnloadingRecord | null>(null);
  const [operatorCount, setOperatorCount] = useState<number | ''>('');
  const [goodsCondition, setGoodsCondition] = useState<GoodsCondition>('Sesuai');
  const [adminFinalNotes, setAdminFinalNotes] = useState('');
  const [adminName2, setAdminName2] = useState(authUser?.name || 'Admin WH CKL');
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [previewPhotoModal, setPreviewPhotoModal] = useState<string | null>(null);
  const [isSubmittingFinalize, setIsSubmittingFinalize] = useState(false);
  const [isCompressingPhoto2, setIsCompressingPhoto2] = useState(false);

  // Refs untuk input Kamera HP langsung (capture="environment") vs Galeri/File HP
  const cameraInputRef1 = useRef<HTMLInputElement>(null);
  const galleryInputRef1 = useRef<HTMLInputElement>(null);

  const cameraInputRef2 = useRef<HTMLInputElement>(null);
  const galleryInputRef2 = useRef<HTMLInputElement>(null);

  // Filtered lists
  const waitingPOList = records.filter(r => r.status === 'MENUNGGU_VERIFIKASI_PO');
  const waitingDockQueueList = records.filter(r => r.status === 'WAITING_DOCK_QUEUE');
  const waitingVerificationList = records.filter(
    r => r.status === 'WAITING_ADMIN_VERIFICATION' || 
         r.status === 'MENUNGGU_VERIFIKASI_ADMIN' ||
         r.status === 'UNLOADING_FINISHED_OPERATOR' ||
         r.status === 'WAITING_FINAL_ADMIN_VERIFICATION'
  );
  const activeUnloadingList = records.filter(r => r.status === 'SEDANG_BONGKAR' || r.status === 'UNLOADING_IN_PROGRESS');
  const readyDockList = records.filter(r => r.status === 'PO_READY_DOCK_ASSIGNED');
  const finishedList = records.filter(
    r => r.status === 'SELESAI_BONGKAR' || 
         r.status === 'FINISHED' || 
         r.status === 'COMPLETED'
  );

  // Handle open verification modal (Step 1)
  const handleOpenVerify = (rec: UnloadingRecord) => {
    setVerifyingRecord(rec);
    // Jika armada jenis Tanki dan belum punya zona khusus, sarankan default ke Tanki Fructose
    if (rec.vehicleType === 'Tanki' && (!rec.assignedDock || (rec.assignedDock !== 'Tanki Fructose' && rec.assignedDock !== 'Tanki Glucose'))) {
      setDockInput('Tanki Fructose');
    } else {
      setDockInput(rec.assignedDock || 'Gudang BA1 depan');
    }
    setAdminNotes1('');
    setSupplementalPhoto(rec.suratJalanPhoto || null);
    setPhotoError(null);
    setQcApprovalTime(rec.qcApprovalTime || '');
    setQcApprovedBy(rec.qcApprovedBy || '');
  };

  // Helper untuk identifikasi armada jenis Tanki atau dialokasikan ke zona Tanki Fructose / Glucose
  const isTankiFleet = (rec?: UnloadingRecord | null, targetDock?: string) => {
    if (!rec) return false;
    const vType = rec.vehicleType;
    const dock = targetDock !== undefined ? targetDock : (rec.assignedDock || '');
    return vType === 'Tanki' || dock === 'Tanki Fructose' || dock === 'Tanki Glucose';
  };

  // Status apakah armada yang sedang diverifikasi di Step 1 adalah Tanki
  const isTankiStep1 = verifyingRecord ? isTankiFleet(verifyingRecord, dockInput) : false;

  const handleSetCurrentQcTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setQcApprovalTime(`${hours}:${minutes} WIB`);
  };

  // Dynamic active workload counter per warehouse zone
  const getZoneWorkload = (zoneName: string) => {
    const activeRecords = records.filter(r => {
      // Exclude current verifying record from counting
      if (verifyingRecord && r.id === verifyingRecord.id) return false;
      const isDockMatch = (r.assignedDock || '').trim().toLowerCase() === zoneName.trim().toLowerCase();
      const isActive = 
        r.status === 'WAITING_DOCK_QUEUE' ||
        r.status === 'PO_READY_DOCK_ASSIGNED' || 
        r.status === 'SEDANG_BONGKAR' || 
        r.status === 'WAITING_ADMIN_VERIFICATION' || 
        r.status === 'MENUNGGU_VERIFIKASI_ADMIN';
      return isDockMatch && isActive;
    });
    return {
      count: activeRecords.length,
      activeRecords,
      isAvailable: activeRecords.length === 0,
    };
  };

  // Handle upload & compress foto Surat Jalan (Step 1 - Opsional)
  const handleSuratJalanPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    // Reset nilai input agar jika user membatalkan/mencoba ulang file yang sama, event onChange tetap tertangkap
    if (e.target) {
      e.target.value = '';
    }
    setPhotoError(null);
    setIsCompressingPhoto(true);

    // Jalankan kompresi secara async tanpa memblokir thread UI utama
    setTimeout(async () => {
      try {
        // Algoritma Kompresi Zero-Crash (Memory Safe) via createImageBitmap / Canvas (maks 900px, JPEG 0.5)
        const compressed = await processImageSafe(file);
        // Hanya simpan string base64 hasil kompresi sangat ringan (~60-120 KB) ke state
        setSupplementalPhoto(compressed);
        setPhotoError(null);
      } catch (err) {
        console.error('Gagal memproses/mengompres foto Surat Jalan:', err);
        const friendlyError = 'Gagal memuat foto, silakan coba ambil ulang dengan resolusi lebih rendah';
        setPhotoError(friendlyError);
        setActionToast(friendlyError);
        setTimeout(() => setActionToast(null), 6000);
      } finally {
        setIsCompressingPhoto(false);
      }
    }, 20);
  };

  const handleRemoveSuratJalanPhoto = () => {
    setSupplementalPhoto(null);
    setPhotoError(null);
    if (cameraInputRef1.current) {
      cameraInputRef1.current.value = '';
    }
    if (galleryInputRef1.current) {
      galleryInputRef1.current.value = '';
    }
  };

  // Step 1 Option A: Direct Unload / Langsung Mundur
  const handleVerifyAndDirect = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!verifyingRecord || !dockInput.trim()) {
      alert('Mohon pilih Zona Gudang Bongkar.');
      return;
    }

    // Armada Tanki TIDAK DIIZINKAN langsung mundur (wajib antri mundur menunggu ACC QC)
    if (isTankiStep1) {
      alert('⚠️ Armada Tanki wajib antri mundur terlebih dahulu menunggu hasil ACC QC.');
      return;
    }

    const queueNum = verifyingRecord.queueNumber;
    const targetDock = dockInput;

    verifyPOAndAssignDock(verifyingRecord.id, {
      assignedDock: targetDock,
      adminNotes: adminNotes1,
      adminName: adminName1,
      suratJalanPhoto: supplementalPhoto ?? '',
      qcApprovalTime: qcApprovalTime.trim() || undefined,
      qcApprovedBy: qcApprovedBy.trim() || undefined,
    });

    setActionToast(`Armada ${queueNum} diverifikasi & diarahkan LANGSUNG MUNDUR ke ${targetDock}.`);
    setTimeout(() => setActionToast(null), 5000);
    handleCloseVerify();
  };

  // Step 1 Option B: Hold / Antri Mundur
  const handleVerifyAndHold = () => {
    if (!verifyingRecord || !dockInput.trim()) {
      alert('Mohon pilih Zona Gudang Bongkar.');
      return;
    }

    const queueNum = verifyingRecord.queueNumber;
    const targetDock = dockInput;

    // Pada tahap 1 (verifikasi awal berkas), Admin BELUM diwajibkan input jam ACC QC untuk armada Tanki
    // Jam ACC QC akan diwajibkan saat armada hendak dipanggil mundur di sub-menu Antri Mundur
    verifyPOAndHold(verifyingRecord.id, {
      assignedDock: targetDock,
      adminNotes: adminNotes1,
      adminName: adminName1,
      suratJalanPhoto: supplementalPhoto ?? '',
      qcApprovalTime: qcApprovalTime.trim() || undefined,
      qcApprovedBy: qcApprovedBy.trim() || undefined,
    });

    setActionToast(`Armada ${queueNum} diverifikasi & masuk ke antrean HOLD MUNDUR (${targetDock}).`);
    setTimeout(() => setActionToast(null), 5000);
    handleCloseVerify();
  };

  // Action from "Antri Mundur" tab: Panggil / Siap Mundur
  const handleCallToDock = (rec: UnloadingRecord) => {
    // Jika armada jenis Tanki (atau zona Tanki Fructose/Glucose), wajib konfirmasi input Jam ACC QC terlebih dahulu
    if (isTankiFleet(rec)) {
      setTankiReleaseModalRecord(rec);
      setReleaseQcTime(rec.qcApprovalTime || '');
      setReleaseQcBy(rec.qcApprovedBy || authUser?.name || '');
    } else {
      // Armada non-tanki: langsung rilis mundur ke dock
      releaseQueueToDock(rec.id);
      setActionToast(`📢 Armada ${rec.queueNumber} dipanggil! Status beralih ke Siap Bongkar di ${rec.assignedDock || 'Dock'}.`);
      setTimeout(() => setActionToast(null), 5000);
    }
  };

  const handleSetReleaseQcCurrentTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setReleaseQcTime(`${hours}:${minutes} WIB`);
  };

  // Konfirmasi Pelepasan Antre Mundur Armada Tanki dengan Jam ACC QC
  const handleConfirmTankiRelease = async () => {
    if (!tankiReleaseModalRecord) return;
    if (!releaseQcTime.trim()) {
      alert('Wajib mengisi Jam ACC QC sebelum mengizinkan armada Tanki mundur ke dock.');
      return;
    }

    try {
      setIsSubmittingRelease(true);
      await releaseQueueToDock(tankiReleaseModalRecord.id, {
        qcApprovalTime: releaseQcTime.trim(),
        qcApprovedBy: releaseQcBy.trim() || undefined,
      });

      setActionToast(
        `📢 Armada Tanki ${tankiReleaseModalRecord.queueNumber} (${tankiReleaseModalRecord.supplierName}) ACC QC: ${releaseQcTime.trim()} — diizinkan mundur ke ${tankiReleaseModalRecord.assignedDock || 'Dock'}!`
      );
      setTimeout(() => setActionToast(null), 5000);
      setTankiReleaseModalRecord(null);
    } catch (err) {
      console.error('Gagal memproses pelepasan armada:', err);
      alert('Gagal memproses pelepasan armada.');
    } finally {
      setIsSubmittingRelease(false);
    }
  };

  // Handle open finalize / physical check modal (Step 2)
  const handleOpenFinalize = (rec: UnloadingRecord) => {
    setFinalizingRecord(rec);
    // Inisialisasi awal input dibuat kosong / null (bukan default angka 1 atau lainnya)
    setOperatorCount(rec.operatorCount && rec.operatorCount > 0 ? rec.operatorCount : '');
    setGoodsCondition(rec.goodsCondition || 'Sesuai');
    setAdminFinalNotes(rec.adminFinalNotes || '');
    setUploadedPhotos(rec.goodsPhotos || rec.operatorPhotos || []);
  };

  // Handle submit Step 2 (Finalize Bongkar -> T4) / Verifikasi Final
  const handleSubmitFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSubmittingFinalize) return;
    if (!finalizingRecord) return;
    if (!operatorCount || Number(operatorCount) <= 0) {
      alert('Mohon masukkan Jumlah Operator Bongkar (Wajib diisi dan minimal 1 orang).');
      return;
    }

    try {
      setIsSubmittingFinalize(true);
      // Pastikan foto sudah dikompresi ringan (< 150KB) sebelum dikirim
      await completeAdminFinalVerification(finalizingRecord.id, {
        goodsCondition,
        operatorCount: Number(operatorCount) || 1,
        adminFinalNotes,
        adminNameStep2: adminName2,
        goodsPhotos: uploadedPhotos.length > 0 ? uploadedPhotos : undefined,
        suratJalanPhoto: finalizingRecord.suratJalanPhoto || '',
        t4UnloadingFinish: new Date().toISOString(),
        status: 'COMPLETED',
      });

      // Tutup modal hanya setelah proses simpan berhasil
      setFinalizingRecord(null);
      alert(`✅ Verifikasi final berhasil disimpan! Antrean ${finalizingRecord.queueNumber} kini berstatus Selesai.`);
      setActionToast(`✅ Verifikasi final ${finalizingRecord.queueNumber} (${finalizingRecord.supplierName}) berhasil disimpan!`);
      setTimeout(() => setActionToast(null), 5000);
    } catch (err) {
      console.error('Gagal menyimpan verifikasi final:', err);
      alert('❌ Gagal menyimpan verifikasi final: ' + (err as Error).message);
    } finally {
      setIsSubmittingFinalize(false);
    }
  };

  const handleFinalSubmit = handleSubmitFinalize;

  // Add sample / camera condition photo
  const handleAddSampleProofPhoto = () => {
    const samples = [
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&auto=format&fit=crop&q=60',
    ];
    const picked = samples[Math.floor(Math.random() * samples.length)];
    setUploadedPhotos(prev => [...prev, picked]);
  };

  const handleFileUpload2 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList: File[] = Array.from(files);
      if (e.target) e.target.value = '';
      setIsCompressingPhoto2(true);
      try {
        for (const file of fileList) {
          const compressed = await processImageSafe(file);
          setUploadedPhotos(prev => [...prev, compressed]);
        }
      } catch (err) {
        console.error('Gagal kompres foto barang:', err);
        setActionToast('Gagal memuat foto, silakan coba ambil ulang dengan resolusi lebih rendah');
        setTimeout(() => setActionToast(null), 6000);
      } finally {
        setIsCompressingPhoto2(false);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Action Toast Feedback */}
      {actionToast && (
        <div className={`p-3.5 rounded-xl shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
          actionToast.includes('Gagal') ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            {actionToast.includes('Gagal') ? (
              <AlertTriangle className="w-5 h-5 text-rose-200 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            )}
            <span>{actionToast}</span>
          </div>
          <button
            onClick={() => setActionToast(null)}
            className="text-white/80 hover:text-white p-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Real-time Notification Alert for Waiting Admin Verification */}
      {waitingVerificationList.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-white animate-bounce" />
            </div>
            <div>
              <div className="font-bold text-sm sm:text-base flex items-center gap-2">
                <span>Pemberitahuan Verifikasi Masuk!</span>
                <span className="px-2 py-0.5 rounded-full bg-white text-orange-700 text-xs font-black">
                  {waitingVerificationList.length} Truk
                </span>
              </div>
              <p className="text-xs text-white/90">
                Operator dock telah menyelesaikan proses bongkar dan mengirim permintaan verifikasi fisik &amp; jumlah.
              </p>
            </div>
          </div>
          <button
            onClick={() => setAdminTab('step2_final')}
            className="px-4 py-2 bg-white hover:bg-orange-50 text-orange-700 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
          >
            <PackageCheck className="w-4 h-4 text-orange-600" />
            <span>Buka Verifikasi Fisik</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              onClick={returnToPortal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer mr-1"
              title="Kembali ke Halaman Utama / Ganti Role"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Portal</span>
            </button>
            <span className="p-1 rounded-lg bg-orange-50 text-orange-600">
              <ClipboardCheck className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-orange-700 font-mono">
              ADMIN GUDANG &amp; INBOUND LOGISTICS
            </span>
            {authUser && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200">
                👤 {authUser.name}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800">
            Verifikasi Kedatangan, Antrean Mundur &amp; Finalisasi Bongkar
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Validasi fisik Surat Jalan, tentukan alokasi zona dock/tanki, kelola antri mundur, dan verifikasi barang pasca bongkar.
          </p>
        </div>

        {/* Quick Tabs in Header */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setAdminTab('step1_po')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                adminTab === 'step1_po'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span>Step 1: Cek PO</span>
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                adminTab === 'step1_po' ? 'bg-white text-orange-600' : 'bg-orange-100 text-orange-700'
              }`}>
                {waitingPOList.length}
              </span>
            </button>

            <button
              onClick={() => setAdminTab('antri_mundur')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                adminTab === 'antri_mundur'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <PauseCircle className="w-3.5 h-3.5" />
              <span>Antri Mundur</span>
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                adminTab === 'antri_mundur' 
                  ? 'bg-white text-amber-700' 
                  : waitingDockQueueList.length > 0 ? 'bg-amber-500 text-white animate-pulse' : 'bg-amber-100 text-amber-800'
              }`}>
                {waitingDockQueueList.length}
              </span>
            </button>

            <button
              onClick={() => setAdminTab('step2_final')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 relative ${
                adminTab === 'step2_final'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span>Step 2: Verifikasi &amp; Selesai</span>
              {waitingVerificationList.length > 0 ? (
                <span className="px-1.5 py-0.2 text-[10px] rounded-full font-bold bg-amber-400 text-slate-900 animate-pulse">
                  {waitingVerificationList.length} Perlu Cek
                </span>
              ) : (
                <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                  adminTab === 'step2_final' ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-700'
                }`}>
                  {activeUnloadingList.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setAdminTab('all_records')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                adminTab === 'all_records'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              Semua ({stats.totalToday} Hari Ini)
            </button>
          </div>

          <button
            onClick={() => setIsGoogleDriveOpen(true)}
            id="btn-admin-gdrive"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold transition cursor-pointer"
            title="Google Drive Storage & Sync Center"
          >
            <HardDrive className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Google Drive</span>
          </button>

          <button
            onClick={logout}
            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition cursor-pointer"
            title="Logout Admin"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* STAGE 1: VERIFIKASI & CEK PO PPIC (T2) */}
      {adminTab === 'step1_po' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500" />
              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                Daftar Truk Menunggu Cek Dokumen PO &amp; Alokasi Dock ({waitingPOList.length})
              </h3>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              T1 tercatat dari Security • Klik &quot;Verifikasi &amp; Cek PO&quot; untuk mencatat T2
            </p>
          </div>

          {waitingPOList.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h4 className="text-slate-800 font-bold text-base">Semua Dokumen Kedatangan Telah Diverifikasi!</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Tidak ada truk yang menunggu verifikasi PO saat ini. Jika ada truk baru masuk gerbang, akan muncul di sini secara otomatis.
              </p>
              <button
                onClick={() => setActiveRole('security')}
                className="mt-2 text-xs px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <span>Input Kedatangan Baru di Security</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {waitingPOList.map((rec) => {
                const leadAnalysis = calculateLeadTime(rec);
                return (
                  <div
                    key={rec.id}
                    className="bg-white border border-slate-200 hover:border-orange-400 rounded-xl p-5 shadow-sm flex flex-col justify-between gap-4 transition"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-orange-100 text-orange-700">
                          {rec.queueNumber}
                        </span>
                        <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          T1: {formatShortTime(rec.t1GateIn)} ({leadAnalysis.waitingPoMinutes}m lalu)
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-900 text-base leading-snug">{rec.supplierName}</h4>
                        <p className="text-xs font-mono text-slate-600 mt-0.5">
                          {rec.licensePlate} • {rec.driverName}
                        </p>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Armada:</span>
                          <span className="font-semibold text-blue-600">{rec.vehicleType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">No. Surat Jalan:</span>
                          <span className="font-mono text-slate-700">{rec.suratJalanNumber || '-'}</span>
                        </div>
                        {rec.suratJalanPhoto && (
                          <div className="pt-1 flex items-center gap-2 text-emerald-600 text-[11px] font-semibold">
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>Foto Surat Jalan terlampir</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleOpenVerify(rec)}
                        id={`btn-verify-po-${rec.id}`}
                        className="w-full py-2.5 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                      >
                        <FileCheck className="w-4 h-4" />
                        <span>Verifikasi &amp; Cek PO PPIC</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* STAGE: ANTRI MUNDUR / HOLD AREA BONGKAR */}
      {adminTab === 'antri_mundur' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                Daftar Armada Antri Mundur / Hold Area ({waitingDockQueueList.length})
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Armada telah verifikasi berkas &amp; dialokasikan zona. Klik &quot;Panggil / Siap Mundur&quot; saat dock/tanki siap menerima.
            </p>
          </div>

          {waitingDockQueueList.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h4 className="text-slate-800 font-bold text-base">Tidak Ada Armada yang Antri Mundur</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Semua armada yang masuk telah langsung diarahkan mundur ke loading dock atau belum diverifikasi berkasnya.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {waitingDockQueueList.map((rec) => {
                const zoneLoad = getZoneWorkload(rec.assignedDock || '');
                return (
                  <div
                    key={rec.id}
                    className="bg-white border-2 border-amber-200 hover:border-amber-400 rounded-xl p-5 shadow-sm flex flex-col justify-between gap-4 transition"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                          <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>{rec.queueNumber}</span>
                        </span>
                        <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          T1: {formatShortTime(rec.t1GateIn)}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-900 text-base leading-snug">{rec.supplierName}</h4>
                        <p className="text-xs font-mono text-slate-600 mt-0.5">
                          {rec.licensePlate} • {rec.driverName}
                        </p>
                      </div>

                      <div className="bg-amber-50/70 rounded-lg p-3 border border-amber-200/80 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 font-medium">Jenis Armada:</span>
                          <span className="font-semibold text-slate-800">{rec.vehicleType}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 font-medium">Target Alokasi:</span>
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {rec.assignedDock || 'Belum Ditentukan'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-amber-200/60">
                          <span className="text-slate-500 text-[11px]">Kondisi Dock Target:</span>
                          {zoneLoad.count === 0 ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              🟢 Dock Kosong / Siap
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                              ⚠️ {zoneLoad.count} Truk Masih Aktif
                            </span>
                          )}
                        </div>
                        {rec.qcApprovalTime && (
                          <div className="flex justify-between items-center text-[11px] bg-amber-100/70 text-amber-950 px-2 py-1 rounded border border-amber-300">
                            <span className="font-semibold flex items-center gap-1">
                              <FlaskConical className="w-3 h-3 text-amber-700" />
                              ACC QC:
                            </span>
                            <span className="font-mono font-bold">{rec.qcApprovalTime} {rec.qcApprovedBy ? `(${rec.qcApprovedBy})` : ''}</span>
                          </div>
                        )}
                        {rec.adminNotes && (
                          <div className="pt-1 text-[11px] text-slate-600 italic">
                            Catatan: &quot;{rec.adminNotes}&quot;
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleCallToDock(rec)}
                        id={`btn-call-dock-${rec.id}`}
                        className={`w-full py-2.5 px-4 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-sm hover:shadow ${
                          isTankiFleet(rec)
                            ? 'bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white'
                            : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white'
                        }`}
                      >
                        {isTankiFleet(rec) ? (
                          <>
                            <FlaskConical className="w-4 h-4" />
                            <span>ACC QC &amp; Panggil Mundur</span>
                          </>
                        ) : (
                          <>
                            <Megaphone className="w-4 h-4" />
                            <span>Supplier Mundur ke Dock</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* STAGE 2: VERIFIKASI FISIK & FINALISASI SELESAI BONGKAR (T4) */}
      {adminTab === 'step2_final' && (
        <div className="space-y-8">
          {/* SECTION 1: PERLU VERIFIKASI FISIK & JUMLAH (PRIORITY) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-500 animate-pulse" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Perlu Verifikasi Fisik &amp; Jumlah ({waitingVerificationList.length})
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                  Selesai Bongkar Operator
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Lakukan pengecekan fisik barang, hitung manpower, dan kunci timestamp T4 Selesai.
              </p>
            </div>

            {waitingVerificationList.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center space-y-2">
                <PackageCheck className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">
                  Tidak ada truk yang sedang menunggu verifikasi fisik dari Admin saat ini.
                </p>
                <p className="text-[11px] text-slate-400">
                  Ketika Operator Dock menekan &quot;Finish Unload&quot;, truk akan langsung masuk ke antrean verifikasi ini.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {waitingVerificationList.map((rec) => {
                  const leadAnalysis = calculateLeadTime(rec, currentTime);
                  const photos = rec.operatorPhotos || rec.goodsPhotos || [];
                  return (
                    <div
                      key={rec.id}
                      className="bg-white border-2 border-amber-400 rounded-xl p-5 shadow-md flex flex-col justify-between gap-4 transition hover:shadow-lg ring-2 ring-amber-100"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-black px-2.5 py-1 rounded-md bg-amber-500 text-white">
                              {rec.queueNumber}
                            </span>
                            <span className="text-xs font-bold text-blue-700 px-2 py-0.5 rounded bg-blue-50 border border-blue-200 font-mono">
                              {rec.assignedDock || 'Dock -'}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                            ⏳ Menunggu Verifikasi
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-slate-900 text-base leading-snug">{rec.supplierName}</h4>
                          <p className="text-xs font-mono text-slate-600 mt-0.5">
                            {rec.licensePlate} • {rec.driverName}
                          </p>
                        </div>

                        {/* Timing & Operator Summary */}
                        <div className="bg-amber-50/70 rounded-lg p-3 border border-amber-200 space-y-1.5 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600">Durasi Bongkar Fisik:</span>
                            <span className="font-mono font-bold text-slate-900">
                              {formatDuration(leadAnalysis.actualUnloadingMinutes)}
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>Mulai (T3): {formatShortTime(rec.t3UnloadingStart)}</span>
                            <span>Selesai (T4 Op): {formatShortTime(rec.t4Operator || rec.t4UnloadingFinish)}</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-600 pt-1 border-t border-amber-200/60">
                            <span>Operator Dock:</span>
                            <span className="font-bold text-slate-800">{rec.operatorName || 'Kru Operator Dock'}</span>
                          </div>
                          {rec.operatorNotes && (
                            <div className="text-[11px] text-slate-700 italic bg-white p-1.5 rounded border border-amber-200 mt-1">
                              &quot;{rec.operatorNotes}&quot;
                            </div>
                          )}
                          {photos.length > 0 && (
                            <div className="pt-1 flex items-center gap-1.5 text-emerald-700 text-[11px] font-bold">
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span>{photos.length} Foto Kondisi Terlampir oleh Operator</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <button
                          onClick={() => handleOpenFinalize(rec)}
                          id={`btn-verify-physical-${rec.id}`}
                          className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                        >
                          <PackageCheck className="w-4 h-4" />
                          <span>Pengecekan Fisik &amp; Jumlah</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: SEDANG PROSES BONGKAR DI DOCK (LIVE) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-600 animate-ping" />
                <h3 className="text-base sm:text-lg font-bold text-slate-800">
                  Sedang Proses Bongkar di Dock ({activeUnloadingList.length})
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Truk yang saat ini sedang aktif dibongkar oleh tim operator dock.
              </p>
            </div>

            {activeUnloadingList.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center space-y-3">
                <Truck className="w-10 h-10 text-blue-500 mx-auto" />
                <h4 className="text-slate-800 font-bold text-base">Tidak Ada Truk yang Sedang Proses Bongkar</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Truk yang dimulai proses bongkarnya di Interface Operator akan muncul di sini secara real-time.
                </p>
                <button
                  onClick={() => setActiveRole('operator')}
                  className="mt-2 text-xs px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                >
                  <span>Buka Interface Operator Dock</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {activeUnloadingList.map((rec) => {
                  const leadAnalysis = calculateLeadTime(rec, currentTime);
                  return (
                    <div
                      key={rec.id}
                      className={`bg-white border rounded-xl p-5 shadow-sm flex flex-col justify-between gap-4 transition ${
                        leadAnalysis.isOverdue 
                          ? 'border-red-300 ring-1 ring-red-200' 
                          : 'border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700">
                              {rec.queueNumber}
                            </span>
                            <span className="text-xs font-bold text-blue-600 px-2 py-0.5 rounded bg-blue-50">
                              {rec.assignedDock || 'Dock -'}
                            </span>
                          </div>
                          
                          {leadAnalysis.isOverdue ? (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-100 text-red-700">
                              Overdue (+{leadAnalysis.varianceMinutes}m)
                            </span>
                          ) : (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                              On-Track
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="font-bold text-slate-900 text-base leading-snug">{rec.supplierName}</h4>
                          <p className="text-xs font-mono text-slate-600 mt-0.5">
                            {rec.licensePlate} • {rec.driverName}
                          </p>
                        </div>

                        {/* Lead Time Gauge */}
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Durasi Berjalan:</span>
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {formatDuration(leadAnalysis.actualUnloadingMinutes)}
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>Standar: {leadAnalysis.standardMinutes} mnt</span>
                            <span>T3 Mulai: {formatShortTime(rec.t3UnloadingStart)}</span>
                          </div>
                          {/* Progress Bar */}
                          <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                leadAnalysis.isOverdue ? 'bg-red-500' : 'bg-blue-600'
                              }`}
                              style={{ width: `${Math.min(100, leadAnalysis.progressPercent)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <button
                          onClick={() => handleOpenFinalize(rec)}
                          id={`btn-finalize-bongkar-${rec.id}`}
                          className="w-full py-2.5 px-4 rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Pengecekan Fisik &amp; Finalisasi T4</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ALL QUEUES & RECENT TABLE TAB */}
      {adminTab === 'all_records' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                {adminDateFilter === 'TODAY' ? 'Antrean Bongkaran Hari Ini' : 'Semua Riwayat Database'} (
                {records.filter(r => (adminDateFilter === 'TODAY' ? isRecordToday(r) : true)).length})
              </h3>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-bold">
                <button
                  onClick={() => setAdminDateFilter('TODAY')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    adminDateFilter === 'TODAY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🟢 Hari Ini
                </button>
                <button
                  onClick={() => setAdminDateFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    adminDateFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📚 Semua Riwayat
                </button>
              </div>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari Supplier / Plat / No Antrean..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-white text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100 font-bold">
                  <tr>
                    <th className="px-4 py-3">Antrean</th>
                    <th className="px-4 py-3">Supplier &amp; Driver</th>
                    <th className="px-4 py-3">Kendaraan</th>
                    <th className="px-4 py-3">Dock</th>
                    <th className="px-4 py-3">T1 Gate In</th>
                    <th className="px-4 py-3">T2 PO Ready</th>
                    <th className="px-4 py-3">T3 Mulai</th>
                    <th className="px-4 py-3">T4 Selesai</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {records
                    .filter(r => {
                      if (adminDateFilter === 'TODAY' && !isRecordToday(r)) return false;
                      const q = searchFilter.toLowerCase();
                      return (
                        r.supplierName.toLowerCase().includes(q) ||
                        r.licensePlate.toLowerCase().includes(q) ||
                        r.queueNumber.toLowerCase().includes(q)
                      );
                    })
                    .map((rec) => (
                      <tr key={rec.id} className="hover:bg-blue-50/30 transition">
                        <td className="px-4 py-3 font-mono font-bold text-blue-600">
                          {rec.queueNumber}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{rec.supplierName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{rec.licensePlate} ({rec.driverName})</div>
                        </td>
                        <td className="px-4 py-3 text-slate-800">{rec.vehicleType}</td>
                        <td className="px-4 py-3 font-mono text-blue-600 font-semibold">{rec.assignedDock || '-'}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{formatShortTime(rec.t1GateIn)}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{formatShortTime(rec.t2PoReady)}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{formatShortTime(rec.t3UnloadingStart)}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{formatShortTime(rec.t4UnloadingFinish)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            rec.status === 'MENUNGGU_VERIFIKASI_PO' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                            rec.status === 'WAITING_DOCK_QUEUE' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                            rec.status === 'PO_READY_DOCK_ASSIGNED' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                            rec.status === 'SEDANG_BONGKAR' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
                            rec.status === 'WAITING_ADMIN_VERIFICATION' || rec.status === 'MENUNGGU_VERIFIKASI_ADMIN' ? 'bg-amber-100 text-amber-900 border border-amber-400' :
                            rec.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                            'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}>
                            {rec.status === 'MENUNGGU_VERIFIKASI_PO' ? 'Menunggu PO' :
                             rec.status === 'WAITING_DOCK_QUEUE' ? 'Antri Mundur' :
                             rec.status === 'PO_READY_DOCK_ASSIGNED' ? 'Ready Dock' :
                             rec.status === 'SEDANG_BONGKAR' ? 'Bongkar' :
                             rec.status === 'WAITING_ADMIN_VERIFICATION' || rec.status === 'MENUNGGU_VERIFIKASI_ADMIN' ? 'Perlu Cek' :
                             rec.status === 'CANCELLED' ? 'Dibatalkan' : 'Selesai'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedRecord(rec)}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                          >
                            Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: VERIFIKASI & CEK DOKUMEN / ALOKASI ZONA (STEP 1 -> T2) */}
      {verifyingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 my-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-orange-50 text-orange-600 border border-orange-200">
                  <FileCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg">Verifikasi Surat Jalan &amp; Alokasi Zona</h3>
                  <p className="text-xs text-slate-500 font-mono">{verifyingRecord.queueNumber} • {verifyingRecord.supplierName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseVerify}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              {/* Truck Info Summary */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Armada:</span>
                  <span className="text-slate-800 font-bold">{verifyingRecord.vehicleType}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">No Polisi:</span>
                  <span className="text-slate-800 font-mono font-bold">{verifyingRecord.licensePlate}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Waktu Masuk (T1):</span>
                  <span className="text-emerald-700 font-mono font-bold">{formatShortTime(verifyingRecord.t1GateIn)} WIB</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Surat Jalan:</span>
                  <span className="text-slate-700 font-medium truncate block">{verifyingRecord.suratJalanNumber || '-'}</span>
                </div>
              </div>

              {/* Alokasi Pintu Loading Dock / Zona Gudang (CHIP GRID SELECTION) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1">
                    <span>Pilih Alokasi Zona Gudang / Tanki Bongkar</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Pilih salah satu zona di bawah:
                  </span>
                </div>

                {/* Direct Chip/Button Grid for all 9 Zones */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {WAREHOUSE_ZONES.map((zone) => {
                    const load = getZoneWorkload(zone);
                    const isSelected = dockInput === zone;
                    return (
                      <button
                        key={zone}
                        type="button"
                        onClick={() => setDockInput(zone)}
                        className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20 font-bold shadow-xs'
                            : 'border-slate-200 bg-slate-50/90 hover:bg-slate-100 hover:border-slate-300 text-slate-700 font-medium'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-xs leading-snug font-semibold">{zone}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                        </div>
                        <div>
                          {load.count === 0 ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold inline-flex items-center gap-1">
                              <span>🟢</span> Kosong / Siap
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold inline-flex items-center gap-1">
                              <span>⚠️</span> {load.count} Truk Aktif
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Visual Guidance for Selected Warehouse Occupancy Status */}
                {(() => {
                  const selectedLoad = getZoneWorkload(dockInput);
                  if (selectedLoad.count === 0) {
                    return (
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-2.5 w-2.5 relative shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                          </span>
                          <span className="text-[11px]">
                            <strong className="text-emerald-900">🟢 Zona Kosong &amp; Siap:</strong> Tidak ada antrean truk aktif di <strong>{dockInput}</strong>. Siap langsung menerima armada.
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold shrink-0">
                          Tersedia
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-bold text-amber-900">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Status Beban: {selectedLoad.count} Truk Sedang Berada di {dockInput}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black uppercase">
                          {selectedLoad.count > 1 ? 'Padat' : 'Terisi'}
                        </span>
                      </div>
                      <div className="text-[11px] text-amber-800/95 space-y-1">
                        <ul className="list-disc space-y-0.5 pl-4 text-slate-700">
                          {selectedLoad.activeRecords.map(rec => (
                            <li key={rec.id}>
                              <span className="font-mono font-bold text-blue-700">{rec.queueNumber}</span> ({rec.supplierName})
                              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-semibold">
                                {rec.status === 'SEDANG_BONGKAR' ? 'Sedang Bongkar' : rec.status === 'PO_READY_DOCK_ASSIGNED' ? 'Ready Dock' : rec.status === 'WAITING_DOCK_QUEUE' ? 'Antri Mundur' : 'Verifikasi Akhir'}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <p className="text-[10px] text-slate-500 pt-0.5">
                          💡 <strong className="text-amber-900">Petunjuk:</strong> Anda dapat memilih tombol <strong>&quot;Verifikasi &amp; Hold (Antri Mundur)&quot;</strong> jika zona ini masih penuh.
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Peringatan Visual Khusus Armada Tanki pada Step 1 */}
              {isTankiStep1 && (
                <div className="p-4 rounded-xl bg-amber-50/90 border-2 border-amber-400 space-y-2.5 text-amber-950 shadow-2xs animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <h5 className="font-bold text-xs sm:text-sm text-amber-950">
                      ⚠️ Armada Tanki wajib antri mundur terlebih dahulu menunggu hasil ACC QC
                    </h5>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-900">
                    Sesuai aturan SOP penerimaan cairan/tangki, armada bertipe <strong>Tanki</strong> (atau zona {dockInput}) 
                    wajib dialokasikan ke status <strong>&quot;Hold (Antri Mundur)&quot;</strong>. 
                    Opsi langsung mundur ke dock dinonaktifkan hingga sampling QC dinyatakan lulus.
                  </p>
                  <div className="p-2.5 rounded-lg bg-amber-100/90 border border-amber-300/80 text-[11px] text-amber-950">
                    ℹ️ <em>Pada tahap ini, Admin <strong>belum diwajibkan input jam ACC QC</strong>. Jam ACC QC wajib diisi saat armada hendak dipanggil mundur ke dock pada sub-menu &quot;Antri Mundur&quot;.</em>
                  </div>

                  {/* Input opsional jika Admin sudah memegang data ACC QC lebih awal */}
                  <div className="pt-2 border-t border-amber-200/80 space-y-2">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span>Jam ACC QC (Opsional pada tahap ini / dapat diisi saat rilis antre mundur)</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={qcApprovalTime}
                          onChange={(e) => setQcApprovalTime(e.target.value)}
                          placeholder="Contoh: 14:30 WIB"
                          className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-slate-900 font-mono text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleSetCurrentQcTime}
                          className="px-2.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold shrink-0 transition cursor-pointer shadow-2xs flex items-center gap-1"
                          title="Isi dengan jam saat ini (WIB)"
                        >
                          <Clock className="w-3 h-3" />
                          <span>Sekarang</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={qcApprovedBy}
                        onChange={(e) => setQcApprovedBy(e.target.value)}
                        placeholder="Petugas QC (Opsional)"
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Catatan / Keterangan Admin */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Catatan Staging / Instruksi Khusus (Opsional)</label>
                <textarea
                  rows={2}
                  value={adminNotes1}
                  onChange={(e) => setAdminNotes1(e.target.value)}
                  placeholder="Contoh: Muatan prioritas lini produksi 1, gunakan palet plastik atau tanki buffer."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              {/* Upload / Foto Fisik Surat Jalan (Opsional) */}
              <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>Foto Dokumen Surat Jalan (Opsional)</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                    Opsional • Kompresi Ultra-Ringan JPEG (~60-120KB)
                  </span>
                </div>

                {/* Error Alert jika pengambilan / kompresi foto gagal */}
                {photoError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-0.5">
                      <p className="font-bold text-rose-900">{photoError}</p>
                      <p className="text-[11px] text-rose-700 leading-relaxed">
                        Tip: Jika memori browser HP penuh, gunakan pemilih foto galeri atau ambil foto dengan resolusi standar kamera.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPhotoError(null)}
                      className="text-rose-500 hover:text-rose-800 p-0.5 cursor-pointer rounded hover:bg-rose-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {supplementalPhoto ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <div className="relative group shrink-0">
                        <img
                          src={supplementalPhoto}
                          alt="Pratinjau Surat Jalan"
                          onClick={() => setPreviewPhotoModal(supplementalPhoto)}
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-slate-300 cursor-pointer hover:opacity-90 transition shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => setPreviewPhotoModal(supplementalPhoto)}
                          className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition cursor-pointer"
                          title="Perbesar foto"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="text-xs font-bold text-slate-800 truncate">Foto Surat Jalan Siap Disimpan</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Format JPEG terkompresi otomatis (&le;800px, 50%) agar hemat RAM HP &amp; cepat terunggah (~60-120 KB).
                        </p>
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              cameraInputRef1.current?.click();
                            }}
                            disabled={isCompressingPhoto}
                            className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold cursor-pointer transition border border-blue-200 disabled:opacity-60 disabled:cursor-not-allowed"
                            title="Ambil foto ulang menggunakan kamera HP"
                          >
                            <Camera className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>Kamera HP</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              galleryInputRef1.current?.click();
                            }}
                            disabled={isCompressingPhoto}
                            className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold cursor-pointer transition border border-slate-200 disabled:opacity-60 disabled:cursor-not-allowed"
                            title="Ganti foto dari galeri atau file"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            <span>Galeri / File</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRemoveSuratJalanPhoto();
                            }}
                            className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-bold cursor-pointer transition border border-red-200"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus Foto</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Dua Opsi Jelas: Kamera HP Langsung vs Galeri HP */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Opsi 1: Kamera HP Langsung */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          cameraInputRef1.current?.click();
                        }}
                        disabled={isCompressingPhoto}
                        id="btn-foto-kamera-sj"
                        className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/80 hover:bg-blue-100/90 text-blue-800 font-bold text-xs sm:text-sm cursor-pointer transition shadow-2xs active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isCompressingPhoto ? (
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
                        ) : (
                          <Camera className="w-4 h-4 text-blue-600 shrink-0" />
                        )}
                        <span>📷 Foto Pakai Kamera HP</span>
                      </button>

                      {/* Opsi 2: Ambil dari Galeri / File */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          galleryInputRef1.current?.click();
                        }}
                        disabled={isCompressingPhoto}
                        id="btn-upload-galeri-sj"
                        className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm cursor-pointer transition shadow-2xs active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isCompressingPhoto ? (
                          <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin shrink-0" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                        <span>🖼️ Pilih dari Galeri / File</span>
                      </button>
                    </div>

                    {isCompressingPhoto && (
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-800 text-xs font-semibold flex items-center justify-center gap-2">
                        <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
                        <span>Sedang mengompresi foto Surat Jalan...</span>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-500 text-center">
                      💡 Pilih <strong>Kamera HP</strong> untuk jepret fisik dokumen langsung, atau <strong>Galeri / File</strong> jika foto sudah tersimpan. Foto otomatis dikompresi (&le;900px, ~60-120 KB).
                    </p>
                  </div>
                )}

                {/* Input khusus KAMERA HP LANGSUNG (capture="environment") */}
                <input
                  type="file"
                  ref={cameraInputRef1}
                  onClick={(e) => e.stopPropagation()}
                  onChange={handleSuratJalanPhotoUpload}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                />

                {/* Input khusus GALERI / FILE HP (tanpa capture) */}
                <input
                  type="file"
                  ref={galleryInputRef1}
                  onClick={(e) => e.stopPropagation()}
                  onChange={handleSuratJalanPhotoUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {/* Nama Admin */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Nama Petugas Admin Verifikasi</label>
                <input
                  type="text"
                  value={adminName1}
                  onChange={(e) => setAdminName1(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseVerify}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer text-xs sm:text-sm order-3 sm:order-1"
                >
                  Batal
                </button>

                {/* Tombol B: Hold / Antri Mundur (Satu-satunya opsi untuk Tanki, atau opsi hold untuk armada non-tanki) */}
                <button
                  type="button"
                  onClick={handleVerifyAndHold}
                  disabled={isCompressingPhoto}
                  id="btn-verify-hold-queue"
                  className={`px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm text-xs sm:text-sm order-2 transition cursor-pointer ${
                    isTankiStep1
                      ? 'bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white ring-2 ring-amber-300'
                      : 'bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={isCompressingPhoto ? "Menunggu proses kompresi foto..." : "Verifikasi berkas dan tempatkan di antrean Antri Mundur"}
                >
                  <PauseCircle className="w-4 h-4" />
                  <span>Verifikasi &amp; Hold (Antri Mundur)</span>
                </button>

                {/* Tombol A: Langsung Mundur (DISEMBUNYIKAN UNTUK ARMADA TANKI) */}
                {!isTankiStep1 && (
                  <button
                    type="button"
                    onClick={handleVerifyAndDirect}
                    disabled={isCompressingPhoto}
                    id="btn-verify-direct-dock"
                    className="px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm text-xs sm:text-sm order-1 sm:order-3 transition bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title={isCompressingPhoto ? "Menunggu proses kompresi foto..." : "Verifikasi dokumen dan langsung izinkan armada mundur ke dock"}
                  >
                    <Check className="w-4 h-4" />
                    <span>Verifikasi &amp; Langsung Mundur</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PENGECEKAN FISIK & JUMLAH (FINALISASI DOKUMEN T4) */}
      {finalizingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 my-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                  <PackageCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg">Pengecekan Fisik &amp; Jumlah</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {finalizingRecord.queueNumber} • {finalizingRecord.supplierName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSubmittingFinalize}
                onClick={() => {
                  if (!isSubmittingFinalize) setFinalizingRecord(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Truck & Unloading Audit Summary Card */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Driver / Plat:</span>
                  <span className="font-bold text-slate-800">{finalizingRecord.driverName} ({finalizingRecord.licensePlate})</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Pintu Dock:</span>
                  <span className="font-mono font-bold text-blue-700">{finalizingRecord.assignedDock}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">No. PO:</span>
                  <span className="font-mono font-bold text-slate-800">{finalizingRecord.poNumber || '-'}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block">T3 Mulai Bongkar:</span>
                  <span className="font-mono font-semibold text-slate-800">{formatShortTime(finalizingRecord.t3UnloadingStart)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">T4 Selesai Operator:</span>
                  <span className="font-mono font-semibold text-amber-700">
                    {formatShortTime(finalizingRecord.t4Operator || finalizingRecord.t4UnloadingFinish || currentTime)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Operator Dock:</span>
                  <span className="font-semibold text-slate-800">{finalizingRecord.operatorName || 'Kru Operator'}</span>
                </div>
              </div>
              {finalizingRecord.operatorNotes && (
                <div className="mt-1 p-2 bg-amber-50/80 rounded border border-amber-200 text-amber-900 text-xs">
                  <span className="font-bold">Catatan Operator: </span>
                  <span>{finalizingRecord.operatorNotes}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmitFinalize} className="space-y-4 text-xs sm:text-sm">
              {/* Jumlah Operator Bongkar (Manpower) */}
              <div className="space-y-1.5">
                <label htmlFor="input-operator-count" className="font-bold text-slate-700 flex items-center justify-between">
                  <span>Jumlah Manpower / Operator Bongkar <span className="text-red-500">*</span></span>
                  <span className="text-xs text-slate-400">Tenaga Kerja / Kuli</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <HardHat className="w-4 h-4" />
                  </div>
                  <input
                    id="input-operator-count"
                    type="number"
                    min="1"
                    max="50"
                    placeholder="Masukkan jumlah operator bongkar (Wajib)"
                    required
                    value={operatorCount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setOperatorCount('');
                      } else {
                        const parsed = parseInt(val, 10);
                        setOperatorCount(isNaN(parsed) ? '' : parsed);
                      }
                    }}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm placeholder:text-slate-400 placeholder:font-sans"
                  />
                </div>
                {(!operatorCount || Number(operatorCount) <= 0) && (
                  <p className="text-[11px] text-amber-600 font-medium">
                    ⚠️ Jumlah operator bongkar wajib diisi (minimal 1) untuk melanjutkan verifikasi final.
                  </p>
                )}
              </div>

              {/* Status Fisik Barang (Radio: Sesuai / Selisih / Rusak) */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700">
                  Status Fisik &amp; Kesesuaian Jumlah <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['Sesuai', 'Selisih', 'Rusak'] as GoodsCondition[]).map((cond) => (
                    <label
                      key={cond}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition cursor-pointer ${
                        goodsCondition === cond
                          ? cond === 'Sesuai'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-xs'
                            : cond === 'Selisih'
                            ? 'bg-amber-50 border-amber-500 text-amber-800 font-bold shadow-xs'
                            : 'bg-rose-50 border-rose-500 text-rose-800 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="goodsCondition"
                        value={cond}
                        checked={goodsCondition === cond}
                        onChange={() => setGoodsCondition(cond)}
                        className="sr-only"
                      />
                      <span className="font-bold text-xs sm:text-sm">{cond}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5 text-center">
                        {cond === 'Sesuai' ? '100% Sesuai' : cond === 'Selisih' ? 'Qty Selisih' : 'Cacat / Rusak'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Catatan / Keterangan Admin */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">
                  Catatan / Keterangan Hasil Verifikasi Fisik
                </label>
                <textarea
                  rows={2}
                  value={adminFinalNotes}
                  onChange={(e) => setAdminFinalNotes(e.target.value)}
                  placeholder="Contoh: Fisik barang diperiksa dalam kondisi baik dan tersegel rapi sesuai PO."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              {/* Foto Kondisi Barang & Bukti Fisik */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700 flex items-center justify-between">
                  <span>Foto Kondisi Barang &amp; Bukti Fisik</span>
                  <button
                    type="button"
                    onClick={handleAddSampleProofPhoto}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3 h-3" /> Tambah Foto Sampel
                  </button>
                </label>

                {uploadedPhotos.length > 0 ? (
                  <div className="flex flex-wrap gap-2.5 py-1">
                    {uploadedPhotos.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={url}
                          alt={`Proof ${idx + 1}`}
                          className="w-16 h-16 object-cover rounded-lg border border-slate-300 shadow-xs cursor-pointer hover:opacity-90"
                          onClick={() => setPreviewPhotoModal(url)}
                        />
                        <button
                          type="button"
                          onClick={() => setUploadedPhotos(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 shadow cursor-pointer"
                          title="Hapus foto"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">Belum ada foto yang diunggah.</p>
                )}

                {isCompressingPhoto2 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold animate-pulse border border-blue-200">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sedang mengompresi foto &lt; 150KB...</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isSubmittingFinalize || isCompressingPhoto2}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      cameraInputRef2.current?.click();
                    }}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 border-dashed border-emerald-400 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 text-xs font-bold cursor-pointer transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Camera className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>📷 Kamera HP</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingFinalize || isCompressingPhoto2}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      galleryInputRef2.current?.click();
                    }}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>🖼️ Galeri / File</span>
                  </button>
                </div>

                {/* Input khusus Kamera HP (capture="environment") */}
                <input
                  type="file"
                  ref={cameraInputRef2}
                  onClick={(e) => e.stopPropagation()}
                  onChange={handleFileUpload2}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                />

                {/* Input khusus Galeri / File (tanpa capture) */}
                <input
                  type="file"
                  ref={galleryInputRef2}
                  onClick={(e) => e.stopPropagation()}
                  onChange={handleFileUpload2}
                  multiple
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {/* Nama Admin */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Nama Petugas Admin Gudang</label>
                <input
                  type="text"
                  value={adminName2}
                  disabled={isSubmittingFinalize}
                  onChange={(e) => setAdminName2(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmittingFinalize}
                  onClick={() => {
                    if (!isSubmittingFinalize) setFinalizingRecord(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  id="btn-confirm-finalize"
                  disabled={
                    isSubmittingFinalize || 
                    isCompressingPhoto2 || 
                    !operatorCount || 
                    Number(operatorCount) <= 0
                  }
                  className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 cursor-pointer shadow-md text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isSubmittingFinalize ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>⏳ Menyimpan &amp; Mengunggah Foto...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verifikasi Final &amp; Tutup Dokumen (T4)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Preview Lightbox Modal */}
      {previewPhotoModal && (
        <div 
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewPhotoModal(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] p-2">
            <button
              onClick={() => setPreviewPhotoModal(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 p-1 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={previewPhotoModal} 
              alt="Preview" 
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl" 
            />
          </div>
        </div>
      )}

      {/* MODAL PELEPASAN ANTRI MUNDUR KHUSUS ARMADA TANKI (WAJIB INPUT JAM ACC QC) */}
      {tankiReleaseModalRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-6 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-100 text-amber-800 border border-amber-300">
                  <FlaskConical className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg">Konfirmasi ACC QC &amp; Panggil Mundur</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Armada Tanki • {tankiReleaseModalRecord.queueNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTankiReleaseModalRecord(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Identitas Armada */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Supplier &amp; Nopol:</span>
                <span className="font-bold text-slate-900">{tankiReleaseModalRecord.supplierName} ({tankiReleaseModalRecord.licensePlate})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Driver:</span>
                <span className="font-mono text-slate-800">{tankiReleaseModalRecord.driverName} {tankiReleaseModalRecord.driverPhone ? `• ${tankiReleaseModalRecord.driverPhone}` : ''}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Jenis Armada / Target:</span>
                <span className="font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded border border-blue-200">
                  {tankiReleaseModalRecord.vehicleType} &rarr; {tankiReleaseModalRecord.assignedDock || 'Dock'}
                </span>
              </div>
            </div>

            {/* Alert SOP */}
            <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Sesuai SOP penerimaan bahan cair/tangki, <strong>armada hanya boleh dipanggil mundur ke loading dock setelah hasil analisa sampling QC dinyatakan LULUS (ACC)</strong>.
              </p>
            </div>

            {/* Input Form Jam ACC QC */}
            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Jam ACC QC <span className="text-red-500 font-bold">*Wajib</span></span>
                  {releaseQcTime.trim() && (
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      ✓ Terisi
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={releaseQcTime}
                      onChange={(e) => setReleaseQcTime(e.target.value)}
                      placeholder="Contoh: 14:30 WIB"
                      className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-slate-900 font-mono text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSetReleaseQcCurrentTime}
                    className="px-3 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold shrink-0 transition cursor-pointer shadow-2xs flex items-center gap-1.5"
                    title="Isi dengan jam saat ini (WIB)"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Isi Jam Sekarang</span>
                  </button>
                </div>
                {!releaseQcTime.trim() && (
                  <p className="text-[11px] text-red-600 font-medium">
                    ⚠️ Jam ACC QC wajib diisi untuk mengaktifkan tombol konfirmasi mundur.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Nama Petugas / Analis QC (Opsional)
                </label>
                <input
                  type="text"
                  value={releaseQcBy}
                  onChange={(e) => setReleaseQcBy(e.target.value)}
                  placeholder="Contoh: Ibu Siti / Lab QC Fructose"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setTankiReleaseModalRecord(null)}
                disabled={isSubmittingRelease}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer text-xs sm:text-sm transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmTankiRelease}
                disabled={!releaseQcTime.trim() || isSubmittingRelease}
                id="btn-confirm-tanki-release"
                className={`px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm text-xs sm:text-sm transition ${
                  !releaseQcTime.trim() || isSubmittingRelease
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-300'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white cursor-pointer'
                }`}
                title={!releaseQcTime.trim() ? "Isi Jam ACC QC terlebih dahulu" : "Konfirmasi armada mundur ke dock"}
              >
                {isSubmittingRelease ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <Megaphone className="w-4 h-4" />
                    <span>Konfirmasi Supplier Mundur</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Drive Storage Modal */}
      <GoogleDriveModal 
        isOpen={isGoogleDriveOpen} 
        onClose={() => setIsGoogleDriveOpen(false)} 
      />
    </div>
  );
};
