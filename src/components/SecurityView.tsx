import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Truck, 
  User, 
  Phone, 
  FileText, 
  CheckCircle2, 
  ArrowLeft, 
  Home, 
  Clock, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useWarehouse } from '../context/WarehouseContext';
import { VehicleType, VEHICLE_LEAD_TIMES, UnloadingRecord } from '../types';
import { formatShortTime } from '../utils/timeUtils';

export const SecurityView: React.FC = () => {
  const { addTruckGateIn, records, returnToPortal } = useWarehouse();

  // Form states
  const [supplierName, setSupplierName] = useState('');
  const [driverName, setDriverName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('CDD');
  const [driverPhone, setDriverPhone] = useState('');
  
  // Last submitted record for quick on-screen feedback
  const [lastSubmittedTicket, setLastSubmittedTicket] = useState<UnloadingRecord | null>(null);
  const [isSuccessToast, setIsSuccessToast] = useState(false);

  // Quick Preset Suppliers for rapid Security entry
   const QUICK_SUPPLIERS = [
  'Sorini Agro Asia',
  'Citra Abadi Kemindo',
  'Khamael Berakhah Sejahtera'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim() || !driverName.trim() || !licensePlate.trim()) {
      alert('Mohon lengkapi Nama Supplier, Nama Driver, dan Nomor Plat Kendaraan.');
      return;
    }

    const newRecord = await addTruckGateIn({
      supplierName: supplierName.trim(),
      driverName: driverName.trim(),
      licensePlate: licensePlate.trim().toUpperCase(),
      vehicleType,
      driverPhone: driverPhone.trim() || undefined,
    });

    // Reset Form
    setSupplierName('');
    setDriverName('');
    setLicensePlate('');
    setDriverPhone('');

    // Feedback
    setLastSubmittedTicket(newRecord);
    setIsSuccessToast(true);
    setTimeout(() => setIsSuccessToast(false), 5000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Toast Notification */}
      {isSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-6 h-6 shrink-0 text-white" />
          <div>
            <p className="font-bold text-sm">Gate-In Berhasil Dicatat (T1)!</p>
            <p className="text-xs text-emerald-100">
              Nomor antrean <strong className="underline">{lastSubmittedTicket?.queueNumber}</strong> otomatis diteruskan ke Admin Gudang.
            </p>
          </div>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              onClick={returnToPortal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              title="Kembali ke Portal Utama"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Portal</span>
            </button>
            <span className="p-1 rounded-lg bg-blue-50 text-blue-600">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600">
              POS KEAMANAN &amp; GATE-IN
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Pendaftaran Kedatangan Truk (T1)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Formulir kilat pencatatan kedatangan armada di pos gerbang security.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block">Total Hari Ini</span>
            <span className="text-lg font-black text-slate-900 font-mono">{records.length} Truk</span>
          </div>
          <button
            onClick={returnToPortal}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer border border-slate-200"
          >
            <Home className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Ganti Role</span>
          </button>
        </div>
      </div>

      {/* Success Confirmation Card (if recently submitted) */}
      {lastSubmittedTicket && (
        <div className="bg-emerald-50 border-2 border-emerald-500/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-mono font-black text-lg shadow-sm shrink-0">
              {lastSubmittedTicket.queueNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-emerald-800 tracking-wider">
                  Tiket Antrean Diterbitkan
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold">
                  {formatShortTime(lastSubmittedTicket.t1GateIn)} WIB
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {lastSubmittedTicket.supplierName} • <span className="font-mono">{lastSubmittedTicket.licensePlate}</span>
              </p>
              <p className="text-xs text-slate-600">
                Driver: <strong>{lastSubmittedTicket.driverName}</strong> ({lastSubmittedTicket.vehicleType})
              </p>
            </div>
          </div>

          <div className="text-xs text-emerald-800 bg-white/80 px-3 py-2 rounded-xl border border-emerald-200 text-center sm:text-right w-full sm:w-auto">
            <span className="block font-bold">Status: Menunggu Cek PO Admin</span>
            <span className="text-[11px] text-slate-500">Berikan nomor antrean <strong>{lastSubmittedTicket.queueNumber}</strong> ke supir</span>
          </div>
        </div>
      )}

      {/* Main Single Card Fast-Entry Form */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-xs">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
          <h3 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <span>Formulir Kedatangan Armada</span>
          </h3>
          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200 flex items-center gap-1">
            <Clock className="w-3 h-3 text-blue-600" />
            <span>Auto Timestamp T1</span>
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Quick Supplier Chips */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center justify-between">
              <span>Pilihan Cepat Supplier:</span>
              <span className="text-[10px] text-slate-400 font-normal">Klik untuk mengisi otomatis</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {quickSuppliers.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setSupplierName(s)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg transition cursor-pointer border font-medium ${
                    supplierName === s
                      ? 'bg-blue-600 border-blue-600 text-white font-bold shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {s.replace(/^(PT|CV)\s+/, '')}
                </button>
              ))}
            </div>
          </div>

          {/* 1. Nama Supplier (Required) */}
          <div className="space-y-1.5">
            <label htmlFor="input-supplier-name" className="text-xs sm:text-sm font-bold text-slate-800 flex items-center justify-between">
              <span>Nama Supplier <span className="text-red-500">*</span></span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <FileText className="w-4 h-4" />
              </div>
              <input
                id="input-supplier-name"
                type="text"
                required
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="Contoh: PT Indofood CBP Sukses Makmur"
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
              />
            </div>
          </div>

          {/* 2 & 3. Driver & Plat Nomor (Required) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="input-driver-name" className="text-xs sm:text-sm font-bold text-slate-800">
                Nama Driver <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="input-driver-name"
                  type="text"
                  required
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Nama Lengkap Sopir"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="input-license-plate" className="text-xs sm:text-sm font-bold text-slate-800">
                Nomor Plat Kendaraan <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Truck className="w-4 h-4" />
                </div>
                <input
                  id="input-license-plate"
                  type="text"
                  required
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                  placeholder="B 1234 ABC"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono uppercase tracking-wider placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-bold"
                />
              </div>
            </div>
          </div>

          {/* 4. Jenis Kendaraan / Lead Time (Select) */}
          <div className="space-y-1.5">
            <label htmlFor="select-vehicle-type" className="text-xs sm:text-sm font-bold text-slate-800 flex items-center justify-between">
              <span>Jenis Kendaraan &amp; Standar Lead Time <span className="text-red-500">*</span></span>
              <span className="text-xs text-blue-600 font-mono font-bold">
                SOP Bongkar: {VEHICLE_LEAD_TIMES[vehicleType].minutes} Menit
              </span>
            </label>
            <select
              id="select-vehicle-type"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value as VehicleType)}
              className="w-full px-3.5 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium cursor-pointer"
            >
              <option value="Wingbox 20T">Wingbox 20T — (SOP: 120 Menit / 20 Ton)</option>
              <option value="CDE">CDE (Colt Diesel Engkel / 4 Roda) — (SOP: 60 Menit)</option>
              <option value="CDD">CDD (Colt Diesel Double / 6 Roda) — (SOP: 120 Menit)</option>
              <option value="Tronton">Tronton (Truk Heavy Duty / 10 Roda) — (SOP: 120 Menit)</option>
              <option value="Pick Up">Pick Up / Blind Van — (SOP: 30 Menit)</option>
            </select>
          </div>

          {/* 5. Nomor HP Driver (Optional) */}
          <div className="space-y-1.5">
            <label htmlFor="input-driver-phone" className="text-xs sm:text-sm font-bold text-slate-800">
              Nomor HP Driver <span className="text-slate-400 font-normal">(Opsional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                id="input-driver-phone"
                type="tel"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="Contoh: 0812-3456-7890"
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
              />
            </div>
          </div>

          {/* Action Submit Button */}
          <div className="pt-3">
            <button
              type="submit"
              id="btn-submit-kedatangan"
              className="w-full py-4 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base shadow-sm hover:shadow-md flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.99]"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Submit Kedatangan (T1)</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
            <p className="text-[11px] text-center text-slate-500 mt-2.5">
              Sistem akan otomatis mencatat timestamp T1 dan menerbitkan nomor antrean resmi.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
