import React, { useState, useRef } from 'react';
import { 
  ShieldCheck, 
  Truck, 
  User, 
  Phone, 
  FileText, 
  Camera, 
  CheckCircle2, 
  Printer, 
  QrCode, 
  Upload, 
  X, 
  Info,
  Clock,
  ArrowRight,
  ArrowLeft,
  Home,
  LogOut
} from 'lucide-react';
import { useWarehouse } from '../context/WarehouseContext';
import { VehicleType, VEHICLE_LEAD_TIMES, UnloadingRecord } from '../types';
import { formatDateTime, formatShortTime } from '../utils/timeUtils';

export const SecurityView: React.FC = () => {
  const { addTruckGateIn, records, setSelectedRecord, setActiveRole, returnToPortal } = useWarehouse();

  // Form states
  const [supplierName, setSupplierName] = useState('');
  const [driverName, setDriverName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('CDD');
  const [driverPhone, setDriverPhone] = useState('');
  const [suratJalanNumber, setSuratJalanNumber] = useState('');
  const [suratJalanPhoto, setSuratJalanPhoto] = useState<string | null>(null);
  const [photoFileName, setPhotoFileName] = useState('');
  
  // Last created gate pass ticket for modal display
  const [lastSubmittedTicket, setLastSubmittedTicket] = useState<UnloadingRecord | null>(null);
  const [isSuccessToast, setIsSuccessToast] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick Preset Suppliers for rapid Security entry in fast paced environment
  const quickSuppliers = [
    'PT Indofood CBP Sukses Makmur',
    'PT Unilever Logistics Indonesia',
    'CV Sumber Makmur Carton',
    'PT Mayora Indah Tbk',
    'PT Nestle Indonesia',
    'PT Wings Surya Distribusi'
  ];

  // Handle Photo upload simulation / base64
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSuratJalanPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCaptureSamplePhoto = () => {
    // Sample high-quality document mock
    const samplePhotos = [
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=800&auto=format&fit=crop&q=60',
    ];
    const picked = samplePhotos[Math.floor(Math.random() * samplePhotos.length)];
    setSuratJalanPhoto(picked);
    setPhotoFileName('surat_jalan_camera_capture.jpg');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim() || !driverName.trim() || !licensePlate.trim()) {
      alert('Mohon lengkapi Nama Supplier, Nama Driver, dan Nomor Polisi.');
      return;
    }

    const newRecord = addTruckGateIn({
      supplierName,
      driverName,
      licensePlate,
      vehicleType,
      driverPhone,
      suratJalanNumber: suratJalanNumber || `SJ-${Date.now().toString().slice(-6)}`,
      suratJalanPhoto: suratJalanPhoto || undefined,
    });

    // Reset Form
    setSupplierName('');
    setDriverName('');
    setLicensePlate('');
    setDriverPhone('');
    setSuratJalanNumber('');
    setSuratJalanPhoto(null);
    setPhotoFileName('');

    // Show Success Modal / Ticket
    setLastSubmittedTicket(newRecord);
    setIsSuccessToast(true);
    setTimeout(() => setIsSuccessToast(false), 4000);
  };

  // Recent Gate In List
  const todayEntries = records.slice(0, 8);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast Notification */}
      {isSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-500">
          <CheckCircle2 className="w-5 h-5" />
          <div>
            <p className="font-bold text-sm">Gate-In Berhasil Dicatat (T1)!</p>
            <p className="text-xs text-emerald-100">Nomor antrean dan timestamp otomatis diteruskan ke Admin Gudang.</p>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              onClick={returnToPortal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer mr-1"
              title="Kembali ke Halaman Utama"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Portal</span>
            </button>
            <span className="p-1 rounded-lg bg-blue-50 text-blue-600">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              POS KEAMANAN &amp; PINTU MASUK (GATE-IN)
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800">
            Formulir Pendaftaran Kedatangan Truk Supplier (T1)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Catat timestamp kedatangan pintu gerbang (T1) secara instan. Data otomatis sinkron ke Admin Gudang &amp; Operator.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="text-right">
              <p className="text-xs text-slate-500 font-medium">Total Truk Hari Ini</p>
              <p className="text-2xl font-black text-slate-800 font-mono">{records.length}</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-right">
              <p className="text-xs text-slate-500 font-medium">Standar T1</p>
              <p className="text-xs font-bold text-emerald-600">Auto Timestamp</p>
            </div>
          </div>
          <button
            onClick={returnToPortal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer border border-slate-200"
          >
            <Home className="w-4 h-4 text-blue-600" />
            <span>Ganti Role</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Mobile-Friendly Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-7 shadow-sm">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base sm:text-lg flex items-center gap-2 underline decoration-blue-500 decoration-2 underline-offset-4">
                <Truck className="w-5 h-5 text-blue-600" />
                Input Data Truk &amp; Surat Jalan
              </h3>
              <span className="text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-600 font-semibold">
                1-Click Timestamp
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Quick Supplier Chips */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-600 font-bold uppercase tracking-wider flex items-center justify-between">
                  <span>Pilih Cepat Nama Supplier:</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {quickSuppliers.map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setSupplierName(s)}
                      className={`text-xs px-2.5 py-1 rounded-md transition cursor-pointer border font-medium ${
                        supplierName === s
                          ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {s.split(' ')[1] || s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nama Supplier (Required) */}
              <div className="space-y-1.5">
                <label htmlFor="input-supplier-name" className="text-xs sm:text-sm font-bold text-slate-700 flex items-center justify-between">
                  <span>Nama Supplier <span className="text-red-500">*</span></span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <input
                    id="input-supplier-name"
                    type="text"
                    required
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="Contoh: PT Indofood CBP Sukses Makmur"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Driver & Plat Nomor (Required) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="input-driver-name" className="text-xs sm:text-sm font-bold text-slate-700">
                    Nama Driver <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="input-driver-name"
                      type="text"
                      required
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder="Nama Lengkap Sopir"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="input-license-plate" className="text-xs sm:text-sm font-bold text-slate-700">
                    Plat Nomor Truk <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Truck className="w-4 h-4" />
                    </div>
                    <input
                      id="input-license-plate"
                      type="text"
                      required
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                      placeholder="B 1234 ABC"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono uppercase tracking-wider placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Jenis Kendaraan (Select with Standard Lead Time) */}
              <div className="space-y-1.5">
                <label htmlFor="select-vehicle-type" className="text-xs sm:text-sm font-bold text-slate-700 flex items-center justify-between">
                  <span>Jenis Kendaraan &amp; Standar Lead Time <span className="text-red-500">*</span></span>
                  <span className="text-xs text-blue-600 font-mono font-bold">
                    Std: {VEHICLE_LEAD_TIMES[vehicleType].minutes} Menit
                  </span>
                </label>
                <select
                  id="select-vehicle-type"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm cursor-pointer"
                >
                  <option value="Wingbox 20T">Wingbox 20T [120m] - Truk Wingbox Kapasitas Besar 20 Ton</option>
                  <option value="CDE">CDE [60m] - Colt Diesel Engkel (4 Roda)</option>
                  <option value="CDD">CDD [120m] - Colt Diesel Double (6 Roda)</option>
                  <option value="Tronton">Tronton [120m] - Truk Tronton Heavy Duty (10 Roda)</option>
                  <option value="Pick Up">Pick Up [30m] - Mobil Bak / Blind Van</option>
                </select>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center justify-between">
                  <span>Kapasitas Muatan: <strong className="text-slate-800">{VEHICLE_LEAD_TIMES[vehicleType].capacity}</strong></span>
                  <span>SOP Bongkar: <strong className="text-emerald-600">{VEHICLE_LEAD_TIMES[vehicleType].minutes} Menit</strong></span>
                </div>
              </div>

              {/* No HP Driver & No Surat Jalan (Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="input-driver-phone" className="text-xs sm:text-sm font-bold text-slate-700">
                    No HP / WhatsApp Driver (Opsional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      id="input-driver-phone"
                      type="tel"
                      value={driverPhone}
                      onChange={(e) => setDriverPhone(e.target.value)}
                      placeholder="0812-xxxx-xxxx"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="input-surat-jalan" className="text-xs sm:text-sm font-bold text-slate-700">
                    Nomor Surat Jalan (Opsional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <input
                      id="input-surat-jalan"
                      type="text"
                      value={suratJalanNumber}
                      onChange={(e) => setSuratJalanNumber(e.target.value)}
                      placeholder="SJ-XXXX/2026"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Upload / Foto Surat Jalan (File / Camera Input) */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center justify-between">
                  <span>Foto / Scan Surat Jalan (Opsional)</span>
                  {suratJalanPhoto && (
                    <button
                      type="button"
                      onClick={() => {
                        setSuratJalanPhoto(null);
                        setPhotoFileName('');
                      }}
                      className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" /> Hapus Foto
                    </button>
                  )}
                </label>

                {suratJalanPhoto ? (
                  <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50 p-2 flex items-center gap-3">
                    <img 
                      src={suratJalanPhoto} 
                      alt="Preview Surat Jalan" 
                      className="w-16 h-16 object-cover rounded-lg border border-slate-300"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{photoFileName || 'Surat Jalan Foto'}</p>
                      <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Siap dilampirkan
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Manual Upload */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400 text-slate-600 transition cursor-pointer text-xs font-semibold"
                    >
                      <Upload className="w-4 h-4 text-blue-600" />
                      <span>Upload Dokumen (PDF/JPG)</span>
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handlePhotoUpload} 
                      accept="image/*,.pdf" 
                      className="hidden" 
                    />

                    {/* Camera snapshot simulation */}
                    <button
                      type="button"
                      onClick={handleCaptureSamplePhoto}
                      className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-50 text-blue-700 transition cursor-pointer text-xs font-semibold"
                    >
                      <Camera className="w-4 h-4 text-blue-600" />
                      <span>Gunakan Kamera / Scan Cepat</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Action Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  id="btn-submit-kedatangan"
                  className="w-full py-3.5 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-sm flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.99]"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Submit Kedatangan (Catat T1 Gate-In)</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
                <p className="text-[11px] text-center text-slate-400 mt-2">
                  Timestamp T1 dicatat otomatis dengan waktu server saat ini.
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Digital Gate Pass Preview & Live Gate-In Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Last Submitted Gate Pass Ticket Card */}
          {lastSubmittedTicket ? (
            <div className="bg-white border-2 border-emerald-500/50 rounded-xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    Karcis Antrean Gate-In
                  </span>
                </div>
                <button
                  onClick={() => window.print()}
                  className="text-xs px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition cursor-pointer font-semibold"
                  title="Cetak Karcis"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak</span>
                </button>
              </div>

              <div className="py-4 text-center space-y-1">
                <p className="text-xs text-slate-500 font-medium">Nomor Antrean Bongkaran</p>
                <h4 className="text-4xl font-black text-emerald-600 font-mono tracking-tight">
                  {lastSubmittedTicket.queueNumber}
                </h4>
                <p className="text-xs font-mono text-slate-500">
                  Waktu Masuk (T1): {formatShortTime(lastSubmittedTicket.t1GateIn)} WIB
                </p>
              </div>

              <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Supplier:</span>
                  <span className="font-bold text-slate-800 text-right truncate ml-2">{lastSubmittedTicket.supplierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Driver / No Plat:</span>
                  <span className="font-mono text-slate-700 font-semibold">{lastSubmittedTicket.driverName} ({lastSubmittedTicket.licensePlate})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Jenis Armada:</span>
                  <span className="text-blue-600 font-bold">{lastSubmittedTicket.vehicleType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Lead Time Maksimal:</span>
                  <span className="text-orange-600 font-bold">{VEHICLE_LEAD_TIMES[lastSubmittedTicket.vehicleType].minutes} Menit</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <QrCode className="w-6 h-6 text-slate-400" />
                  <span>Serahkan karcis ini ke Admin Gudang untuk cek PO PPIC.</span>
                </div>
                <button
                  onClick={() => {
                    setActiveRole('admin');
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  Ke Admin <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-dashed border-slate-300 rounded-xl p-6 text-center text-slate-500 space-y-2">
              <QrCode className="w-10 h-10 mx-auto text-slate-400" />
              <p className="text-xs font-medium">Karcis digital akan otomatis muncul di sini setelah Submit Kedatangan.</p>
            </div>
          )}

          {/* Today's Recent Gate Entries List */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-slate-800 text-sm">Daftar Kedatangan Hari Ini</h4>
              </div>
              <span className="text-xs text-slate-500 font-mono font-bold">{records.length} unit</span>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {todayEntries.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => setSelectedRecord(rec)}
                  className="p-3 bg-slate-50 hover:bg-blue-50/40 border border-slate-200 rounded-lg transition cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-xs text-blue-600">
                        {rec.queueNumber}
                      </span>
                      <span className="text-xs text-slate-800 font-bold truncate">
                        {rec.supplierName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="font-mono text-slate-700">{rec.licensePlate}</span>
                      <span>•</span>
                      <span>{rec.vehicleType}</span>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end shrink-0">
                    <span className="text-xs font-mono text-slate-600">
                      {formatShortTime(rec.t1GateIn)}
                    </span>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase mt-1 ${
                      rec.status === 'MENUNGGU_VERIFIKASI_PO'
                        ? 'bg-orange-100 text-orange-700'
                        : rec.status === 'PO_READY_DOCK_ASSIGNED'
                        ? 'bg-blue-100 text-blue-700'
                        : rec.status === 'SEDANG_BONGKAR'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {rec.status === 'MENUNGGU_VERIFIKASI_PO' ? 'Menunggu PO' :
                       rec.status === 'PO_READY_DOCK_ASSIGNED' ? 'Ready Dock' :
                       rec.status === 'SEDANG_BONGKAR' ? 'Bongkar' : 'Selesai'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
