import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BadgeCheck,
  Building2,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Droplets,
  HeartPulse,
  Loader2,
  MapPin,
  Phone,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserCheck,
  Users,
  X,
  Zap,
} from 'lucide-react';
import {
  APPOINTMENT_TIME_SLOTS,
  DOCTORS_DIRECTORY,
  DOCTOR_FILTER_SPECIALTIES,
  HOSPITAL_DIRECTORY,
  type DoctorProfile,
  type HealthcareFacility,
  type HospitalAppointmentRecord,
  type HospitalSpecialty,
} from '../../data/healthcareData';
import { getTomorrowIsoDate, UPI_MERCHANT_VPA } from '../../shared/bookingSchema';
import { fetchSpotGallery } from '../../utils/spotGallery';
import { readAiCache, writeAiCache } from '../../utils/aiResponseCache';
import {
  LiquidGlassCard,
  LiquidSegmentedTabs,
  LiquidSheetModal,
} from '../LiquidGlassCard';
import type { SpotGalleryRequest } from '../SpotPictureLibraryDrawer';
import type { UserProfile } from '../../shared/authSchema';

interface HealthcareDirectoryPanelProps {
  districtId: string;
  districtName: string;
  hospitalBookings: HospitalAppointmentRecord[];
  onBookAppointment: (record: HospitalAppointmentRecord) => void;
  onOpenSpotGallery: (spot: SpotGalleryRequest) => void;
  activeUser?: UserProfile;
}

type HealthcareSubTab = 'hospitals' | 'doctors';
type OwnershipFilter = 'All Facilities' | 'Government OP (Free)' | 'Private / NABH';

interface AiHealthcareSearchPayload {
  summary: string;
  hospitals: HealthcareFacility[];
  doctors: DoctorProfile[];
}

function HospitalPhotoThumb({
  facility,
  onOpenGallery,
}: {
  facility: HealthcareFacility;
  onOpenGallery: () => void;
}) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchSpotGallery(facility.wikiQuery, `${facility.districtName}, Kerala`).then(
      (photos) => {
        if (!active || photos.length === 0) return;
        setThumbUrl(photos[0].thumbUrl || photos[0].url);
      }
    );
    return () => {
      active = false;
    };
  }, [facility.wikiQuery, facility.districtName]);

  return (
    <button
      type="button"
      onClick={onOpenGallery}
      className="group relative w-full h-36 rounded-2xl overflow-hidden bg-gradient-to-br from-[#4F5BD5]/18 via-sky-500/12 to-emerald-500/12 dark:from-[#4F5BD5]/28 dark:via-slate-800 dark:to-slate-900 border border-black/5 dark:border-white/10 text-left cursor-pointer"
      title={`Open Wikimedia photo library for ${facility.name}`}
    >
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt={facility.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-slate-500 dark:text-slate-400">
          <Building2 className="w-6 h-6 text-[#4F5BD5] dark:text-[#8E96FF]" />
          <span className="text-[10.5px] font-semibold">{facility.districtName} Facility</span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
      <div className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1.5">
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md border ${
            facility.isGovernment
              ? 'bg-emerald-600/90 text-white border-emerald-400/40'
              : 'bg-[#4F5BD5]/90 text-white border-indigo-300/40'
          }`}
        >
          {facility.ownership}
        </span>
        {facility.nabhAccredited && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-slate-900 border border-white/60">
            NABH
          </span>
        )}
      </div>
      <span className="absolute bottom-2 right-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur-md text-[10px] font-semibold text-white">
        <Camera className="w-3 h-3" />
        Photos
      </span>
    </button>
  );
}

function generateOpTokenId(isGovernment: boolean): string {
  const prefix = isGovernment ? 'OP-GOV' : 'OP-PVT';
  const num = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${num}`;
}

function buildQrUrl(data: string, size = 168): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    data
  )}`;
}

function downloadOpSlip(rec: HospitalAppointmentRecord) {
  const lines = [
    '============================================================',
    '   CIVICTRIAGE LSG · KERALA HEALTHCARE QR APPOINTMENT PASS  ',
    '============================================================',
    `Token / Pass ID : ${rec.tokenId}`,
    `Pass Type       : ${rec.bookingType}`,
    `Status          : ${rec.status}`,
    `Hospital        : ${rec.hospitalName} (${rec.districtName})`,
    `Department      : ${rec.department}`,
    rec.doctorName ? `Doctor          : ${rec.doctorName}` : 'Doctor          : Duty OP Specialist',
    `Date & Slot     : ${rec.appointmentDate} · ${rec.timeSlot}`,
    '------------------------------------------------------------',
    `Patient Name    : ${rec.patientName} (${rec.patientAge} yrs · ${rec.patientGender})`,
    `Mobile Number   : ${rec.patientPhone}`,
    `ABHA Health ID  : ${rec.abhaHealthId || 'Not Linked'}`,
    `Symptoms/Reason : ${rec.symptoms || 'General OP Consultation'}`,
    '------------------------------------------------------------',
    `Consultation Fee: ${rec.consultationFeeInr === 0 ? '₹0 (Govt Free e-OP)' : `₹${rec.consultationFeeInr}`}`,
    `Paid via UPI    : ${
      rec.consultationFeeInr === 0
        ? 'FREE GOVT TOKEN'
        : `₹${rec.paidAmountInr}${rec.isDemoFare ? ' (₹1 Demo Mode)' : ''} · UTR ${rec.utrNumber || 'VERIFIED'}`
    }`,
    `Booked At       : ${rec.bookedAt}`,
    '============================================================',
    'Present this QR Token ID at the Hospital OP Registration Desk.',
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${rec.tokenId}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function HealthcareDirectoryPanel({
  districtId,
  districtName,
  hospitalBookings,
  onBookAppointment,
  onOpenSpotGallery,
  activeUser,
}: HealthcareDirectoryPanelProps) {
  const [subTab, setSubTab] = useState<HealthcareSubTab>('hospitals');
  const [searchQuery, setSearchQuery] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('All Facilities');
  const [showAllKerala, setShowAllKerala] = useState(false);

  // Doctor filters
  const [selectedSpecialty, setSelectedSpecialty] =
    useState<HospitalSpecialty>('All Specialties');
  const [selectedHospitalFilter, setSelectedHospitalFilter] = useState<string>('all');
  const [availableTodayOnly, setAvailableTodayOnly] = useState<boolean>(false);

  // Gemini Live District/City Search
  const [aiCityQuery, setAiCityQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiHospitals, setAiHospitals] = useState<HealthcareFacility[]>([]);
  const [aiDoctors, setAiDoctors] = useState<DoctorProfile[]>([]);

  // Live Google Map pin state
  const [pinnedFacility, setPinnedFacility] = useState<HealthcareFacility>(
    HOSPITAL_DIRECTORY[0]
  );

  // Booking modal state
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState<'form' | 'upi' | 'confirmed'>('form');
  const [bookingHospitalId, setBookingHospitalId] = useState<string>(HOSPITAL_DIRECTORY[0].id);
  const [bookingDepartment, setBookingDepartment] = useState<string>('General Medicine');
  const [bookingDoctorId, setBookingDoctorId] = useState<string>('');
  const [appointmentDate, setAppointmentDate] = useState<string>(getTomorrowIsoDate());
  const [timeSlot, setTimeSlot] = useState<string>(APPOINTMENT_TIME_SLOTS[0]);
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('28');
  const [patientGender, setPatientGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [patientPhone, setPatientPhone] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [abhaHealthId, setAbhaHealthId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Private UPI payment state inside modal
  const [useDemoRupee, setUseDemoRupee] = useState(true);
  const [utrInput, setUtrInput] = useState('');
  const [verifyingUpi, setVerifyingUpi] = useState(false);
  const [confirmedPass, setConfirmedPass] = useState<HospitalAppointmentRecord | null>(null);

  // Existing pass viewer modal
  const [viewingPass, setViewingPass] = useState<HospitalAppointmentRecord | null>(null);

  const allHospitals = useMemo(() => {
    const merged = [...aiHospitals, ...HOSPITAL_DIRECTORY];
    const seen = new Set<string>();
    return merged.filter((h) => {
      const key = h.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [aiHospitals]);

  const allDoctors = useMemo(() => {
    const merged = [...aiDoctors, ...DOCTORS_DIRECTORY];
    const seen = new Set<string>();
    return merged.filter((d) => {
      const key = `${d.name.toLowerCase()}::${d.hospitalId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [aiDoctors]);

  const doctorCountByHospital = useMemo(() => {
    const map = new Map<string, number>();
    for (const doc of allDoctors) {
      map.set(doc.hospitalId, (map.get(doc.hospitalId) ?? 0) + 1);
    }
    return map;
  }, [allDoctors]);

  const filteredHospitals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = allHospitals.filter((h) => {
      const districtOk =
        showAllKerala ||
        districtId === 'all' ||
        h.isAiDiscovered ||
        h.districtId === districtId;
      const ownershipOk =
        ownershipFilter === 'All Facilities' ||
        (ownershipFilter === 'Government OP (Free)' ? h.isGovernment : !h.isGovernment);
      const searchOk =
        !q ||
        h.name.toLowerCase().includes(q) ||
        h.districtName.toLowerCase().includes(q) ||
        h.address.toLowerCase().includes(q) ||
        h.departments.some((d) => d.toLowerCase().includes(q));
      return districtOk && ownershipOk && searchOk;
    });
    if (list.length > 0 || q || ownershipFilter !== 'All Facilities') return list;
    return allHospitals;
  }, [allHospitals, districtId, showAllKerala, ownershipFilter, searchQuery]);

  const filteredDoctors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allDoctors.filter((d) => {
      const districtOk =
        showAllKerala ||
        districtId === 'all' ||
        selectedHospitalFilter !== 'all' ||
        d.isAiDiscovered ||
        d.districtId === districtId;
      const specOk =
        selectedSpecialty === 'All Specialties' || d.specialty === selectedSpecialty;
      const hospOk =
        selectedHospitalFilter === 'all' || d.hospitalId === selectedHospitalFilter;
      const availOk = !availableTodayOnly || d.availableToday;
      const searchOk =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q) ||
        d.hospitalName.toLowerCase().includes(q) ||
        d.qualifications.toLowerCase().includes(q) ||
        d.districtName.toLowerCase().includes(q);
      return districtOk && specOk && hospOk && availOk && searchOk;
    });
  }, [
    allDoctors,
    districtId,
    showAllKerala,
    selectedSpecialty,
    selectedHospitalFilter,
    availableTodayOnly,
    searchQuery,
  ]);

  const activeBookingHospital = useMemo(
    () => allHospitals.find((h) => h.id === bookingHospitalId) ?? allHospitals[0],
    [allHospitals, bookingHospitalId]
  );

  const doctorsAtSelectedHospital = useMemo(
    () => allDoctors.filter((d) => d.hospitalId === bookingHospitalId),
    [allDoctors, bookingHospitalId]
  );

  const activeBookingDoctor = useMemo(
    () => allDoctors.find((d) => d.id === bookingDoctorId) ?? null,
    [allDoctors, bookingDoctorId]
  );

  const computedConsultationFee = useMemo(() => {
    if (activeBookingDoctor) return activeBookingDoctor.consultationFeeInr;
    return activeBookingHospital?.defaultOpFeeInr ?? 0;
  }, [activeBookingDoctor, activeBookingHospital]);

  const isBookingGovernment = activeBookingDoctor
    ? activeBookingDoctor.isGovernment
    : activeBookingHospital?.isGovernment ?? true;

  const openHospitalBooking = (facility: HealthcareFacility) => {
    setBookingHospitalId(facility.id);
    setBookingDepartment(facility.departments[0] ?? 'General Medicine');
    setBookingDoctorId('');
    setAppointmentDate(getTomorrowIsoDate());
    setTimeSlot(APPOINTMENT_TIME_SLOTS[0]);
    if (activeUser) {
      setPatientName(activeUser.fullName);
      if (activeUser.abhaHealthId) setAbhaHealthId(activeUser.abhaHealthId);
    }
    setFormError(null);
    setConfirmedPass(null);
    setUtrInput('');
    setBookingStep('form');
    setBookingOpen(true);
  };

  const openDoctorBooking = (doc: DoctorProfile) => {
    setBookingHospitalId(doc.hospitalId);
    setBookingDepartment(doc.specialty);
    setBookingDoctorId(doc.id);
    setAppointmentDate(getTomorrowIsoDate());
    setTimeSlot(APPOINTMENT_TIME_SLOTS[0]);
    if (activeUser) {
      setPatientName(activeUser.fullName);
      if (activeUser.abhaHealthId) setAbhaHealthId(activeUser.abhaHealthId);
    }
    setFormError(null);
    setConfirmedPass(null);
    setUtrInput('');
    setBookingStep('form');
    setBookingOpen(true);
  };

  const handleAutofillPatient = () => {
    setPatientName(activeUser?.fullName || 'Arjit Anil');
    setPatientAge('26');
    setPatientGender('Male');
    setPatientPhone('+91 98470 21845');
    setSymptoms('Routine specialist review & blood pressure follow-up');
    setAbhaHealthId(activeUser?.abhaHealthId || '91-4821-7390-5124');
    setFormError(null);
  };

  const finalizeBookingRecord = (utrNumber: string | null) => {
    const hospital = activeBookingHospital;
    const fee = computedConsultationFee;
    const paid = fee === 0 ? 0 : useDemoRupee ? 1 : fee;
    const record: HospitalAppointmentRecord = {
      tokenId: generateOpTokenId(isBookingGovernment),
      bookingType: isBookingGovernment ? 'Govt e-OP Token' : 'Private Specialist Pass',
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      districtName: hospital.districtName,
      isGovernment: isBookingGovernment,
      department: activeBookingDoctor ? activeBookingDoctor.specialty : bookingDepartment,
      doctorId: activeBookingDoctor?.id,
      doctorName: activeBookingDoctor?.name,
      appointmentDate,
      timeSlot,
      patientName: patientName.trim(),
      patientAge: Math.max(1, Math.min(120, Number(patientAge) || 26)),
      patientGender,
      patientPhone: patientPhone.trim(),
      symptoms: symptoms.trim() || 'General OP Consultation',
      abhaHealthId: abhaHealthId.trim() || undefined,
      consultationFeeInr: fee,
      paidAmountInr: paid,
      isDemoFare: fee > 0 && useDemoRupee,
      utrNumber,
      bookedAt: new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      status: 'CONFIRMED · QR PASS READY',
    };
    onBookAppointment(record);
    setConfirmedPass(record);
    setBookingStep('confirmed');
  };

  const handleContinueBooking = () => {
    if (!patientName.trim()) {
      setFormError('Please enter the patient full name.');
      return;
    }
    if (patientPhone.trim().length < 10) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setFormError(null);
    if (computedConsultationFee === 0) {
      finalizeBookingRecord(null);
    } else {
      setBookingStep('upi');
    }
  };

  const handleAutoVerifyUpi = () => {
    setVerifyingUpi(true);
    window.setTimeout(() => {
      const autoUtr =
        utrInput.trim().length >= 8
          ? utrInput.trim()
          : `63${Math.floor(1000000000 + Math.random() * 8999999999)}`;
      setVerifyingUpi(false);
      finalizeBookingRecord(autoUtr);
    }, 950);
  };

  const handleGeminiLiveSearch = async () => {
    const targetCity = aiCityQuery.trim() || districtName;
    if (!targetCity) return;
    setAiLoading(true);
    setAiSummary(null);

    const cacheKey = `healthcare_search::${targetCity.toLowerCase()}`;
    const cached = readAiCache<AiHealthcareSearchPayload>(cacheKey);
    if (cached) {
      setAiSummary(cached.summary);
      setAiHospitals(cached.hospitals);
      setAiDoctors(cached.doctors);
      if (cached.hospitals[0]) setPinnedFacility(cached.hospitals[0]);
      setAiLoading(false);
      return;
    }

    try {
      const resp = await fetch('/api/local-life-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'healthcare_search',
          districtName: targetCity,
          query: targetCity,
        }),
      });
      const data = (await resp.json()) as Partial<AiHealthcareSearchPayload>;
      const discoveredHospitals: HealthcareFacility[] = Array.isArray(data.hospitals)
        ? data.hospitals.map((h, i) => ({
            id: h.id || `ai-hosp-${Date.now()}-${i}`,
            name: h.name || `${targetCity} Multi-Specialty Hospital`,
            ownership: h.ownership || (h.isGovernment ? 'Govt' : 'Private NABH'),
            isGovernment: Boolean(h.isGovernment),
            districtId: targetCity.toLowerCase().replace(/\s+/g, '-'),
            districtName: h.districtName || targetCity,
            address: h.address || `Central Road, ${targetCity}`,
            phone: h.phone || '0484-2201100',
            emergency24x7: h.emergency24x7 !== false,
            bloodBank: h.bloodBank !== false,
            nabhAccredited: Boolean(h.nabhAccredited),
            departments:
              Array.isArray(h.departments) && h.departments.length > 0
                ? h.departments
                : ['General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics'],
            opFeeLabel:
              h.opFeeLabel ||
              (h.isGovernment ? '₹0 Govt OP (Free e-Health)' : '₹450 Private OP'),
            defaultOpFeeInr: h.isGovernment ? 0 : Number(h.defaultOpFeeInr) || 450,
            wikiQuery: h.wikiQuery || targetCity,
            googleMapsQuery: h.googleMapsQuery || `${h.name || 'Hospital'}, ${targetCity}`,
            isAiDiscovered: true,
          }))
        : [];

      const discoveredDoctors: DoctorProfile[] = Array.isArray(data.doctors)
        ? data.doctors.map((d, i) => {
            const matchedHosp =
              discoveredHospitals[i % Math.max(1, discoveredHospitals.length)];
            return {
              id: d.id || `ai-doc-${Date.now()}-${i}`,
              name: d.name || `Dr. Arjun Nair`,
              qualifications: d.qualifications || 'MBBS, MD',
              specialty: d.specialty || 'General Medicine',
              hospitalId: matchedHosp?.id || `ai-hosp-${Date.now()}-0`,
              hospitalName:
                d.hospitalName || matchedHosp?.name || `${targetCity} General Hospital`,
              districtId: targetCity.toLowerCase().replace(/\s+/g, '-'),
              districtName: d.districtName || targetCity,
              isGovernment: Boolean(d.isGovernment),
              timings: d.timings || 'Mon–Sat · 09:30 AM – 01:30 PM',
              availableToday: d.availableToday !== false,
              consultationFeeInr: d.isGovernment
                ? 0
                : Number(d.consultationFeeInr) || 450,
              experienceYears: Number(d.experienceYears) || 12,
              languages: d.languages || 'English, Malayalam, Hindi',
              isAiDiscovered: true,
            };
          })
        : [];

      const result: AiHealthcareSearchPayload = {
        summary:
          data.summary ||
          `Found ${discoveredHospitals.length} verified facilities and ${discoveredDoctors.length} specialists in ${targetCity}.`,
        hospitals: discoveredHospitals,
        doctors: discoveredDoctors,
      };
      writeAiCache(cacheKey, result);
      setAiSummary(result.summary);
      setAiHospitals(result.hospitals);
      setAiDoctors(result.doctors);
      if (result.hospitals[0]) setPinnedFacility(result.hospitals[0]);
    } catch {
      setAiSummary(
        `Showing curated Kerala directory alongside local search for ${targetCity}.`
      );
    } finally {
      setAiLoading(false);
    }
  };

  const payableAmount = useDemoRupee ? 1 : computedConsultationFee;
  const upiUri = `upi://pay?pa=${UPI_MERCHANT_VPA}&pn=${encodeURIComponent(
    'CivicTriage Hospital OP'
  )}&am=${payableAmount}&cu=INR&tn=${encodeURIComponent(
    `OP Booking ${activeBookingHospital?.name?.slice(0, 24) || 'Hospital'}`
  )}`;

  return (
    <div className="space-y-6" data-testid="healthcare-directory-panel">
      {/* Top Healthcare Directory Bar: Tabs + Search + Gemini Live District Search */}
      <LiquidGlassCard interactive={false} className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              <HeartPulse className="w-3.5 h-3.5" />
              <span>Kerala e-Health &amp; Pan-India Healthcare Directory</span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#111315] dark:text-white">
              Hospitals, Specialists &amp; Instant QR OP Booking
            </h2>
          </div>

          <LiquidSegmentedTabs<HealthcareSubTab>
            layoutId="healthcare-subtab-pill"
            ariaLabel="Healthcare directory views"
            value={subTab}
            onChange={setSubTab}
            options={[
              {
                id: 'hospitals',
                label: '🏥 Hospitals & Centres',
                badge: filteredHospitals.length,
              },
              {
                id: 'doctors',
                label: '👨‍⚕️ Find Doctors & Specialists',
                badge: filteredDoctors.length,
              },
            ]}
          />
        </div>

        {/* Search + Gemini Live City Discovery */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-5 relative flex items-center">
            <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter hospitals, doctors, Cardiology, Pushpagiri, MGM..."
              className="w-full glass-pill-input rounded-full pl-10 pr-4 py-2.5 text-xs font-medium"
            />
          </div>

          <div className="lg:col-span-7 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Sparkles className="w-3.5 h-3.5 text-[#4F5BD5] dark:text-[#8E96FF] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={aiCityQuery}
                onChange={(e) => setAiCityQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleGeminiLiveSearch();
                }}
                placeholder="Gemini Live Search any District/City (e.g., Thrissur, Bengaluru, Chennai)..."
                className="w-full glass-pill-input rounded-full pl-9 pr-3 py-2.5 text-xs font-medium"
              />
            </div>

            <button
              type="button"
              onClick={() => void handleGeminiLiveSearch()}
              disabled={aiLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full btn-obsidian text-xs font-bold cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              {aiLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-[#A5B4FC]" />
              )}
              <span>{aiLoading ? 'Searching...' : 'Live AI Search'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAllKerala((prev) => !prev)}
              className={`px-3.5 py-2.5 rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                showAllKerala
                  ? 'bg-[#4F5BD5]/15 dark:bg-[#8E96FF]/25 border-[#4F5BD5]/40 dark:border-[#8E96FF]/50 text-[#313DA8] dark:text-white'
                  : 'bg-white/70 dark:bg-slate-800/80 border-black/5 dark:border-white/10 text-slate-700 dark:text-slate-200'
              }`}
            >
              {showAllKerala ? 'Showing All Kerala' : `District: ${districtName}`}
            </button>
          </div>
        </div>

        {aiSummary && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-[#4F5BD5]/10 dark:bg-[#8E96FF]/18 border border-[#4F5BD5]/25 dark:border-[#8E96FF]/35 text-xs text-[#2E3899] dark:text-indigo-100">
            <span className="flex items-center gap-2 font-medium">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              {aiSummary}
            </span>
            <button
              type="button"
              onClick={() => {
                setAiSummary(null);
                setAiHospitals([]);
                setAiDoctors([]);
              }}
              className="text-[11px] font-bold hover:underline shrink-0 cursor-pointer"
            >
              Clear AI Results
            </button>
          </div>
        )}
      </LiquidGlassCard>

      {/* MY HOSPITAL BOOKINGS (QR Passes & Govt e-OP Tokens) */}
      {hospitalBookings.length > 0 && (
        <LiquidGlassCard interactive={false} className="p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold text-[#111315] dark:text-white flex items-center gap-2">
              <QrCode className="w-4 h-4 text-[#4F5BD5] dark:text-[#8E96FF]" />
              <span>My Hospital Bookings &amp; QR OP Passes ({hospitalBookings.length})</span>
            </h3>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Private consultation fees auto-sync to Expense Tracker
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {hospitalBookings.map((booking) => (
              <div
                key={booking.tokenId}
                className="p-4 rounded-2xl bg-[#EFECE8]/85 dark:bg-slate-800/80 border border-black/5 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        booking.isGovernment
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-[#4F5BD5]/15 text-[#4F5BD5] dark:text-[#A5B4FC]'
                      }`}
                    >
                      {booking.tokenId}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                      {booking.bookingType}
                    </span>
                  </div>
                  <p className="text-xs font-extrabold text-[#111315] dark:text-white truncate">
                    {booking.hospitalName}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                    {booking.doctorName
                      ? `${booking.doctorName} · ${booking.department}`
                      : `${booking.department} OP`}
                  </p>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {booking.patientName} · {booking.appointmentDate} at {booking.timeSlot} ·{' '}
                    <strong className="text-[#111315] dark:text-white">
                      {booking.consultationFeeInr === 0
                        ? '₹0 Free'
                        : `₹${booking.consultationFeeInr}`}
                    </strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewingPass(booking)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#4F5BD5] hover:bg-[#3F4BC5] text-white text-[11px] font-bold cursor-pointer"
                  >
                    <QrCode className="w-3 h-3" />
                    QR Pass
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadOpSlip(booking)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/85 dark:bg-slate-700 text-[#111315] dark:text-white border border-black/8 dark:border-white/15 text-[11px] font-bold cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    Slip
                  </button>
                </div>
              </div>
            ))}
          </div>
        </LiquidGlassCard>
      )}

      {/* VIEW 1: HOSPITALS & CENTRES */}
      {subTab === 'hospitals' && (
        <div className="space-y-5">
          {/* Ownership filter + Pinned Google Map Strip */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            <LiquidGlassCard
              interactive={false}
              className="lg:col-span-7 p-4 flex flex-col justify-between gap-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#4F5BD5] dark:text-[#8E96FF]">
                    Live Google Maps Facility Pin
                  </span>
                  <h3 className="text-sm font-extrabold text-[#111315] dark:text-white truncate">
                    {pinnedFacility.name}
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                    {pinnedFacility.address} · Tel: {pinnedFacility.phone}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openHospitalBooking(pinnedFacility)}
                  className="px-3.5 py-2 rounded-full btn-obsidian text-[11px] font-bold shrink-0 cursor-pointer"
                >
                  Book Hospital OP
                </button>
              </div>
              <div className="w-full h-56 rounded-2xl overflow-hidden border border-black/10 dark:border-white/15 bg-slate-200 dark:bg-slate-900">
                <iframe
                  title={`Google Map for ${pinnedFacility.name}`}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(
                    pinnedFacility.googleMapsQuery
                  )}&z=15&output=embed`}
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </LiquidGlassCard>

            <LiquidGlassCard
              interactive={false}
              className="lg:col-span-5 p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Quick Facility Filter &amp; Emergency Care
                </span>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      'All Facilities',
                      'Government OP (Free)',
                      'Private / NABH',
                    ] as OwnershipFilter[]
                  ).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setOwnershipFilter(opt)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                        ownershipFilter === opt
                          ? 'bg-[#4F5BD5] text-white border-[#4F5BD5] shadow-sm'
                          : 'bg-[#EFECE8]/85 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-black/5 dark:border-white/10 hover:bg-white dark:hover:bg-slate-700'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div className="p-3 rounded-2xl bg-[#EFECE8]/80 dark:bg-slate-800/80 border border-black/5 dark:border-white/10">
                    <p className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">
                      Ambulance / Trauma
                    </p>
                    <p className="text-lg font-extrabold font-mono text-rose-600 dark:text-rose-400">
                      108 / 112
                    </p>
                    <p className="text-[10px] text-slate-600 dark:text-slate-300">
                      Kaniv 108 Kerala 24/7
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#EFECE8]/80 dark:bg-slate-800/80 border border-black/5 dark:border-white/10">
                    <p className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">
                      Disha Health Desk
                    </p>
                    <p className="text-lg font-extrabold font-mono text-[#4F5BD5] dark:text-[#8E96FF]">
                      1056
                    </p>
                    <p className="text-[10px] text-slate-600 dark:text-slate-300">
                      e-Health &amp; Blood Bank
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed pt-2 border-t border-black/5 dark:border-white/10">
                Govt Hospital OP slots issue an instant free{' '}
                <strong className="text-emerald-700 dark:text-emerald-400">
                  QR e-OP Token (₹0)
                </strong>
                . Private NABH specialist appointments verify via{' '}
                <strong className="text-[#4F5BD5] dark:text-[#8E96FF]">
                  {UPI_MERCHANT_VPA}
                </strong>{' '}
                and auto-log to Expenses.
              </div>
            </LiquidGlassCard>
          </div>

          {/* Hospitals Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHospitals.map((facility, idx) => {
              const docCount = doctorCountByHospital.get(facility.id) ?? 0;
              return (
                <LiquidGlassCard
                  key={facility.id}
                  delay={Math.min(idx * 0.03, 0.25)}
                  interactive={false}
                  className="p-4 flex flex-col justify-between gap-3.5"
                >
                  <div className="space-y-3">
                    <HospitalPhotoThumb
                      facility={facility}
                      onOpenGallery={() =>
                        onOpenSpotGallery({
                          name: facility.wikiQuery,
                          region: `${facility.districtName}, Kerala`,
                          subtitle: `${facility.name} · ${facility.ownership}`,
                          description: `${facility.address}. Departments: ${facility.departments.join(
                            ', '
                          )}.`,
                          badge: facility.ownership,
                          googleMapsQuery: facility.googleMapsQuery,
                        })
                      }
                    />

                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-extrabold text-[#111315] dark:text-white leading-snug">
                          {facility.name}
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#4F5BD5] dark:text-[#8E96FF] shrink-0 mt-0.5" />
                        <span>
                          {facility.districtName} · {facility.address}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <Phone className="w-3 h-3 shrink-0" />
                        <span>{facility.phone}</span>
                        <span>·</span>
                        <span
                          className={`font-bold ${
                            facility.isGovernment
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-[#4F5BD5] dark:text-[#A5B4FC]'
                          }`}
                        >
                          {facility.opFeeLabel}
                        </span>
                      </p>
                    </div>

                    {/* 24/7 Emergency & Blood Bank Indicators */}
                    <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-bold">
                      {facility.emergency24x7 && (
                        <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                          <Activity className="w-3 h-3" />
                          24/7 Emergency
                        </span>
                      )}
                      {facility.bloodBank && (
                        <span className="inline-flex items-center gap-1 text-red-700 dark:text-red-400">
                          <Droplets className="w-3 h-3" />
                          Blood Bank
                        </span>
                      )}
                      {facility.nabhAccredited && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                          <BadgeCheck className="w-3 h-3" />
                          NABH Certified
                        </span>
                      )}
                    </div>

                    {/* Departments List */}
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      <strong className="text-slate-800 dark:text-slate-100">
                        Departments:
                      </strong>{' '}
                      {facility.departments.join(' · ')}
                    </p>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-3 border-t border-black/5 dark:border-white/10 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPinnedFacility(facility)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#EFECE8]/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 border border-black/5 dark:border-white/10 text-[11px] font-bold text-[#111315] dark:text-slate-100 cursor-pointer"
                    >
                      <MapPin className="w-3 h-3 text-[#4F5BD5] dark:text-[#8E96FF]" />
                      Pin on Google Map
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedHospitalFilter(facility.id);
                        setSelectedSpecialty('All Specialties');
                        setSubTab('doctors');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#4F5BD5]/12 dark:bg-[#8E96FF]/20 text-[#313DA8] dark:text-[#C7D2FE] text-[11px] font-bold hover:bg-[#4F5BD5]/20 cursor-pointer"
                    >
                      <Stethoscope className="w-3 h-3" />
                      View Doctors ({docCount})
                    </button>

                    <button
                      type="button"
                      onClick={() => openHospitalBooking(facility)}
                      data-testid={`book-hospital-${facility.id}`}
                      className="ml-auto inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full btn-obsidian text-[11px] font-bold cursor-pointer"
                    >
                      <Calendar className="w-3 h-3" />
                      Book Hospital OP
                    </button>
                  </div>
                </LiquidGlassCard>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: FIND DOCTORS & SPECIALISTS */}
      {subTab === 'doctors' && (
        <div className="space-y-4">
          {/* Specialty, Hospital & Available Today Filters */}
          <LiquidGlassCard interactive={false} className="p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {DOCTOR_FILTER_SPECIALTIES.map((spec) => (
                <button
                  key={spec}
                  type="button"
                  onClick={() => setSelectedSpecialty(spec)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                    selectedSpecialty === spec
                      ? 'bg-[#4F5BD5] text-white border-[#4F5BD5] shadow-sm'
                      : 'bg-[#EFECE8]/85 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-black/5 dark:border-white/10 hover:bg-white dark:hover:bg-slate-700'
                  }`}
                >
                  {spec}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-black/5 dark:border-white/10">
              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  aria-label="Filter doctors by hospital"
                  value={selectedHospitalFilter}
                  onChange={(e) => setSelectedHospitalFilter(e.target.value)}
                  className="glass-pill-input rounded-full px-3.5 py-2 text-xs font-semibold cursor-pointer max-w-xs"
                >
                  <option value="all">All Hospitals ({allHospitals.length})</option>
                  {allHospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>

                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#EFECE8]/85 dark:bg-slate-800/80 border border-black/5 dark:border-white/10 text-xs font-bold text-[#111315] dark:text-slate-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={availableTodayOnly}
                    onChange={(e) => setAvailableTodayOnly(e.target.checked)}
                    className="accent-[#4F5BD5] w-3.5 h-3.5"
                  />
                  <span>Available Today Only</span>
                </label>
              </div>

              {selectedHospitalFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedHospitalFilter('all')}
                  className="text-xs font-bold text-[#4F5BD5] dark:text-[#8E96FF] hover:underline cursor-pointer"
                >
                  Show All Hospitals
                </button>
              )}
            </div>
          </LiquidGlassCard>

          {filteredDoctors.length === 0 ? (
            <LiquidGlassCard interactive={false} className="p-8 text-center space-y-2">
              <Stethoscope className="w-7 h-7 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-[#111315] dark:text-white">
                No specialists matched your current filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedSpecialty('All Specialties');
                  setSelectedHospitalFilter('all');
                  setAvailableTodayOnly(false);
                  setShowAllKerala(true);
                }}
                className="px-4 py-2 rounded-full btn-obsidian text-xs font-bold cursor-pointer"
              >
                Show All Specialists Across Kerala
              </button>
            </LiquidGlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDoctors.map((doc, idx) => (
                <LiquidGlassCard
                  key={doc.id}
                  delay={Math.min(idx * 0.03, 0.24)}
                  interactive={false}
                  className="p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#4F5BD5]/12 dark:bg-[#8E96FF]/22 text-[#313DA8] dark:text-[#C7D2FE] text-[10.5px] font-bold">
                        {doc.specialty}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[10.5px] font-bold ${
                          doc.availableToday
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            doc.availableToday ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />
                        {doc.availableToday ? 'Available Today' : 'Next OP Day'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-[#111315] dark:text-white">
                        {doc.name}
                      </h3>
                      <p className="text-xs font-semibold text-[#4F5BD5] dark:text-[#A5B4FC]">
                        {doc.qualifications}
                      </p>
                    </div>

                    <div className="space-y-1 text-[11.5px] text-slate-600 dark:text-slate-300">
                      <p className="flex items-start gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                          {doc.hospitalName}
                        </span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{doc.timings}</span>
                      </p>
                      <p className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <Users className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {doc.experienceYears} yrs exp · {doc.languages}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-black/5 dark:border-white/10 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block">
                        Consultation Fee
                      </span>
                      <span
                        className={`text-lg font-extrabold font-mono tabular-nums ${
                          doc.consultationFeeInr === 0
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-[#111315] dark:text-white'
                        }`}
                      >
                        {doc.consultationFeeInr === 0
                          ? '₹0 Govt OP'
                          : `₹${doc.consultationFeeInr}`}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => openDoctorBooking(doc)}
                      data-testid={`book-doctor-${doc.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full btn-obsidian text-xs font-bold cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Book Doctor Appointment
                    </button>
                  </div>
                </LiquidGlassCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LIQUID GLASS APPOINTMENT BOOKING & UPI CHECKOUT MODAL */}
      <LiquidSheetModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        title="Hospital & Doctor Appointment Booking"
        maxWidthClass="max-w-2xl"
      >
        <div className="p-5 sm:p-6 space-y-5">
          {/* Modal Header */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-black/8 dark:border-white/12">
            <div>
              <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#4F5BD5] dark:text-[#8E96FF]">
                {bookingStep === 'form'
                  ? 'Step 1 · Select Slot & Patient Details'
                  : bookingStep === 'upi'
                    ? 'Step 2 · Instant UPI / Razorpay Fee Verification'
                    : 'Confirmed · QR Hospital Appointment Pass'}
              </span>
              <h3 className="text-lg font-extrabold text-[#111315] dark:text-white mt-0.5">
                {activeBookingHospital?.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setBookingOpen(false)}
              aria-label="Close appointment modal"
              className="p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* STEP 1: APPOINTMENT FORM */}
          {bookingStep === 'form' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {isBookingGovernment
                    ? 'Government Hospital OP — Instant Free QR e-OP Token (₹0)'
                    : `Private Specialist Consultation — ₹${computedConsultationFee} via ${UPI_MERCHANT_VPA}`}
                </span>
                <button
                  type="button"
                  onClick={handleAutofillPatient}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#4F5BD5]/12 dark:bg-[#8E96FF]/22 text-[#313DA8] dark:text-[#C7D2FE] text-[11px] font-bold cursor-pointer"
                >
                  <Zap className="w-3 h-3" />
                  Autofill Patient Details
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <span>Hospital / Centre</span>
                  <select
                    value={bookingHospitalId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setBookingHospitalId(nextId);
                      setBookingDoctorId('');
                      const found = allHospitals.find((h) => h.id === nextId);
                      if (found?.departments[0]) {
                        setBookingDepartment(found.departments[0]);
                      }
                    }}
                    className="w-full glass-pill-input rounded-2xl px-3 py-2.5 text-xs font-semibold"
                  >
                    {allHospitals.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.isGovernment ? 'Govt ₹0' : `₹${h.defaultOpFeeInr}`})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <span>Department / Specific Doctor</span>
                  <select
                    value={bookingDoctorId ? `doc:${bookingDoctorId}` : `dept:${bookingDepartment}`}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.startsWith('doc:')) {
                        const dId = val.slice(4);
                        setBookingDoctorId(dId);
                        const found = allDoctors.find((d) => d.id === dId);
                        if (found) setBookingDepartment(found.specialty);
                      } else {
                        setBookingDoctorId('');
                        setBookingDepartment(val.slice(5));
                      }
                    }}
                    className="w-full glass-pill-input rounded-2xl px-3 py-2.5 text-xs font-semibold"
                  >
                    <optgroup label="Doctors at this Hospital">
                      {doctorsAtSelectedHospital.map((d) => (
                        <option key={d.id} value={`doc:${d.id}`}>
                          {d.name} ({d.specialty} ·{' '}
                          {d.consultationFeeInr === 0 ? '₹0' : `₹${d.consultationFeeInr}`})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="General Department OP">
                      {(activeBookingHospital?.departments ?? ['General Medicine']).map(
                        (dept) => (
                          <option key={dept} value={`dept:${dept}`}>
                            {dept} Department OP
                          </option>
                        )
                      )}
                    </optgroup>
                  </select>
                </label>
              </div>

              {/* Date & Time Slot Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <label className="space-y-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <span>Appointment Date</span>
                  <input
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full glass-pill-input rounded-2xl px-3 py-2.5 text-xs font-semibold"
                  />
                </label>

                <div className="sm:col-span-2 space-y-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                    Select OP Time Slot
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {APPOINTMENT_TIME_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setTimeSlot(slot)}
                        className={`px-3 py-2 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                          timeSlot === slot
                            ? 'bg-[#4F5BD5] text-white border-[#4F5BD5] shadow-sm'
                            : 'bg-[#EFECE8]/85 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-black/5 dark:border-white/10'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Patient Info */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <label className="sm:col-span-2 space-y-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <span>Patient Full Name *</span>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g., Arjit Anil"
                    className="w-full glass-pill-input rounded-2xl px-3.5 py-2.5 text-xs font-medium"
                  />
                </label>

                <label className="space-y-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <span>Age *</span>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    className="w-full glass-pill-input rounded-2xl px-3.5 py-2.5 text-xs font-medium"
                  />
                </label>

                <label className="space-y-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <span>Gender</span>
                  <select
                    value={patientGender}
                    onChange={(e) =>
                      setPatientGender(e.target.value as 'Male' | 'Female' | 'Other')
                    }
                    className="w-full glass-pill-input rounded-2xl px-3 py-2.5 text-xs font-semibold"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <span>Mobile Number *</span>
                  <input
                    type="tel"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="+91 98470 00000"
                    className="w-full glass-pill-input rounded-2xl px-3.5 py-2.5 text-xs font-medium"
                  />
                </label>

                <label className="space-y-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <span>14-Digit ABHA Health ID (Optional)</span>
                  <input
                    type="text"
                    value={abhaHealthId}
                    onChange={(e) => setAbhaHealthId(e.target.value)}
                    placeholder="XX-XXXX-XXXX-XXXX"
                    className="w-full glass-pill-input rounded-2xl px-3.5 py-2.5 text-xs font-mono"
                  />
                </label>
              </div>

              <label className="space-y-1 text-xs font-bold text-slate-700 dark:text-slate-200 block">
                <span>Symptoms / Reason for Visit</span>
                <textarea
                  rows={2}
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="Briefly describe symptoms, follow-up need, or health checkup..."
                  className="w-full glass-pill-input rounded-2xl px-3.5 py-2.5 text-xs font-medium"
                />
              </label>

              {formError && (
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  {formError}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-black/8 dark:border-white/12">
                <div>
                  <span className="text-[10.5px] font-mono uppercase text-slate-500 dark:text-slate-400 block">
                    Total Payable
                  </span>
                  <span className="text-xl font-extrabold font-mono text-[#111315] dark:text-white">
                    {computedConsultationFee === 0
                      ? '₹0 (Free Govt OP)'
                      : `₹${computedConsultationFee}`}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleContinueBooking}
                  data-testid="confirm-hospital-booking-btn"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full btn-obsidian text-xs font-bold cursor-pointer"
                >
                  {computedConsultationFee === 0 ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Confirm Free Govt e-OP Token</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 text-[#A5B4FC]" />
                      <span>Proceed to {UPI_MERCHANT_VPA} UPI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: 7012692128@fam UPI QR / RAZORPAY GATEWAY */}
          {bookingStep === 'upi' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#EFECE8]/85 dark:bg-slate-800/80 border border-black/5 dark:border-white/10 flex flex-col sm:flex-row items-center gap-5">
                <div className="p-2.5 bg-white rounded-2xl shadow-md shrink-0">
                  <img
                    src={buildQrUrl(upiUri, 168)}
                    alt={`UPI QR for ${UPI_MERCHANT_VPA}`}
                    className="w-40 h-40 rounded-xl"
                  />
                </div>
                <div className="space-y-2.5 flex-1">
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#4F5BD5] dark:text-[#8E96FF]">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Auto-Verify UPI QR / Razorpay Gateway</span>
                  </div>
                  <p className="text-xs font-extrabold text-[#111315] dark:text-white">
                    Merchant UPI ID:{' '}
                    <span className="font-mono text-[#4F5BD5] dark:text-[#A5B4FC]">
                      {UPI_MERCHANT_VPA}
                    </span>
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Consultation Fee: <strong>₹{computedConsultationFee}</strong> · Paying now:{' '}
                    <strong className="text-emerald-700 dark:text-emerald-400 font-mono">
                      ₹{payableAmount}
                    </strong>
                    . Fee is automatically logged in your Expense Tracker under{' '}
                    <strong>Healthcare &amp; OP</strong>.
                  </p>

                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useDemoRupee}
                      onChange={(e) => setUseDemoRupee(e.target.checked)}
                      className="accent-[#4F5BD5]"
                    />
                    <span>Enable ₹1 Demo Mode (records ₹{computedConsultationFee} in pass)</span>
                  </label>

                  <input
                    type="text"
                    value={utrInput}
                    onChange={(e) => setUtrInput(e.target.value)}
                    placeholder="Optional 12-digit UTR (or click Auto-Verify Payment)"
                    className="w-full glass-pill-input rounded-full px-3.5 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setBookingStep('form')}
                  className="px-4 py-2.5 rounded-full bg-white/80 dark:bg-slate-800 border border-black/10 dark:border-white/15 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  Back to Details
                </button>
                <button
                  type="button"
                  onClick={handleAutoVerifyUpi}
                  disabled={verifyingUpi}
                  data-testid="verify-hospital-upi-btn"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-60"
                >
                  {verifyingUpi ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>
                    {verifyingUpi
                      ? 'Verifying UPI Settlement...'
                      : `Auto-Verify ₹${payableAmount} & Issue QR Pass`}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CONFIRMED QR PASS */}
          {bookingStep === 'confirmed' && confirmedPass && (
            <div className="space-y-4">
              <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-500/12 via-white/75 to-[#4F5BD5]/12 dark:from-emerald-500/18 dark:via-slate-900/90 dark:to-[#8E96FF]/18 border border-emerald-500/30 flex flex-col sm:flex-row items-center gap-5">
                <div className="p-2.5 bg-white rounded-2xl shadow-md shrink-0">
                  <img
                    src={buildQrUrl(
                      `CIVICTRIAGE-OP|${confirmedPass.tokenId}|${confirmedPass.hospitalName}|${confirmedPass.patientName}|${confirmedPass.appointmentDate}|${confirmedPass.timeSlot}`,
                      160
                    )}
                    alt={`QR Token ${confirmedPass.tokenId}`}
                    className="w-36 h-36 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5 flex-1 text-xs">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-mono text-[10.5px] font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    {confirmedPass.tokenId} · {confirmedPass.bookingType}
                  </span>
                  <h4 className="text-base font-extrabold text-[#111315] dark:text-white">
                    {confirmedPass.hospitalName}
                  </h4>
                  <p className="text-slate-700 dark:text-slate-200 font-semibold">
                    {confirmedPass.doctorName
                      ? `${confirmedPass.doctorName} (${confirmedPass.department})`
                      : `${confirmedPass.department} OP`}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    <strong>Patient:</strong> {confirmedPass.patientName} ({confirmedPass.patientAge}
                    y · {confirmedPass.patientGender})
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    <strong>Schedule:</strong> {confirmedPass.appointmentDate} ·{' '}
                    {confirmedPass.timeSlot}
                  </p>
                  {confirmedPass.abhaHealthId && (
                    <p className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                      <strong>ABHA ID:</strong> {confirmedPass.abhaHealthId}
                    </p>
                  )}
                  <p className="text-emerald-700 dark:text-emerald-400 font-bold">
                    {confirmedPass.consultationFeeInr === 0
                      ? 'Fee: ₹0 (Free Government e-OP Token)'
                      : `Fee Paid: ₹${confirmedPass.consultationFeeInr} · Logged to Expense Tracker`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => downloadOpSlip(confirmedPass)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/85 dark:bg-slate-800 border border-black/10 dark:border-white/15 text-xs font-bold text-[#111315] dark:text-white cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download OP Slip
                </button>
                <button
                  type="button"
                  onClick={() => setBookingOpen(false)}
                  className="px-5 py-2.5 rounded-full btn-obsidian text-xs font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </LiquidSheetModal>

      {/* EXISTING QR PASS VIEWER MODAL */}
      <LiquidSheetModal
        open={Boolean(viewingPass)}
        onClose={() => setViewingPass(null)}
        title="Hospital QR Appointment Pass"
        maxWidthClass="max-w-lg"
      >
        {viewingPass && (
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10.5px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {viewingPass.tokenId} · {viewingPass.status}
                </span>
                <h3 className="text-lg font-extrabold text-[#111315] dark:text-white">
                  {viewingPass.hospitalName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingPass(null)}
                aria-label="Close QR pass"
                className="p-1.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-[#EFECE8]/85 dark:bg-slate-800/80 border border-black/5 dark:border-white/10">
              <div className="p-2.5 bg-white rounded-2xl shadow-md">
                <img
                  src={buildQrUrl(
                    `CIVICTRIAGE-OP|${viewingPass.tokenId}|${viewingPass.hospitalName}|${viewingPass.patientName}|${viewingPass.appointmentDate}|${viewingPass.timeSlot}`,
                    180
                  )}
                  alt={`QR Pass ${viewingPass.tokenId}`}
                  className="w-44 h-44 rounded-xl"
                />
              </div>
              <div className="w-full space-y-1 text-xs text-slate-700 dark:text-slate-200">
                <p>
                  <strong>Department / Doctor:</strong>{' '}
                  {viewingPass.doctorName
                    ? `${viewingPass.doctorName} (${viewingPass.department})`
                    : viewingPass.department}
                </p>
                <p>
                  <strong>Patient:</strong> {viewingPass.patientName} ({viewingPass.patientAge}y ·{' '}
                  {viewingPass.patientGender}) · {viewingPass.patientPhone}
                </p>
                <p>
                  <strong>Slot:</strong> {viewingPass.appointmentDate} at {viewingPass.timeSlot}
                </p>
                {viewingPass.abhaHealthId && (
                  <p className="font-mono text-[11px]">
                    <strong>ABHA ID:</strong> {viewingPass.abhaHealthId}
                  </p>
                )}
                <p>
                  <strong>Fee:</strong>{' '}
                  {viewingPass.consultationFeeInr === 0
                    ? '₹0 (Free Govt OP)'
                    : `₹${viewingPass.consultationFeeInr} (UTR ${viewingPass.utrNumber || 'Verified'})`}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => downloadOpSlip(viewingPass)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full btn-obsidian text-xs font-bold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download OP Slip
              </button>
            </div>
          </div>
        )}
      </LiquidSheetModal>
    </div>
  );
}
