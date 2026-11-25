import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import { Upload, Trash2, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { SAMPLE_SCENARIOS, type SampleScenario } from '../data/sampleScenarios';
import {
  fileToImagePayload,
  formatBytes,
  urlToImagePayload,
  type PreparedImagePayload,
} from '../utils/imageEncoding';
import { SafeImage } from './SafeImage';
import { VoiceMicControl } from './VoiceMicControl';

interface TriageIntakeFormProps {
  image: PreparedImagePayload | null;
  description: string;
  localBodyHint: string;
  activeSampleId: string | null;
  isSubmitting: boolean;
  onImageChange: (payload: PreparedImagePayload | null) => void;
  onDescriptionChange: (value: string) => void;
  onLocalBodyHintChange: (value: string) => void;
  onSelectSample: (scenario: SampleScenario, payload: PreparedImagePayload) => void;
  onSubmit: () => void;
}

export function TriageIntakeForm({
  image,
  description,
  localBodyHint,
  activeSampleId,
  isSubmitting,
  onImageChange,
  onDescriptionChange,
  onLocalBodyHintChange,
  onSelectSample,
  onSubmit,
}: TriageIntakeFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingSampleId, setLoadingSampleId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFileSelected = async (file: File) => {
    setValidationError(null);
    try {
      const payload = await fileToImagePayload(file);
      onImageChange(payload);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Unable to process image file.');
    }
  };

  const handleInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileSelected(file);
    }
    e.target.value = '';
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleFileSelected(file);
    }
  };

  const handleLoadSample = async (scenario: SampleScenario) => {
    setValidationError(null);
    setLoadingSampleId(scenario.id);
    try {
      const payload = await urlToImagePayload(scenario.imageUrl, scenario.imageName);
      onSelectSample(scenario, payload);
    } catch (err) {
      setValidationError(
        err instanceof Error ? err.message : 'Unable to load sample field photograph.'
      );
    } finally {
      setLoadingSampleId(null);
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!image) {
      setValidationError('Please upload a civic issue photograph or load a sample case before running triage.');
      return;
    }
    if (!description.trim()) {
      setValidationError('Please enter the citizen description in English, Malayalam, or Manglish.');
      return;
    }
    setValidationError(null);
    onSubmit();
  };

  return (
    <section
      aria-labelledby="intake-heading"
      className="bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-lg shadow-sky-900/[0.04] rounded-2xl overflow-hidden divide-y divide-slate-200/75"
    >
      <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-50/90 via-sky-50/70 to-amber-50/60">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500" />
          <h1
            id="intake-heading"
            className="text-lg font-bold text-slate-900 tracking-tight"
          >
            Citizen Report Intake
          </h1>
        </div>
        <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
          Upload a field photograph with the citizen report in English, Malayalam, or Manglish to generate a verified K-SMART triage ticket &amp; instant officer alert.
        </p>
      </div>

      <div className="p-4 sm:p-5 bg-sky-50/40">
        <div className="flex items-baseline justify-between gap-2 mb-2.5">
          <span className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
            Test Scenarios
          </span>
          <span className="text-xs text-slate-500">
            1-click field photo &amp; report
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SAMPLE_SCENARIOS.map((scenario, idx) => {
            const isSelected = activeSampleId === scenario.id;
            const isLoadingThis = loadingSampleId === scenario.id;
            const isLastOdd =
              SAMPLE_SCENARIOS.length % 2 === 1 && idx === SAMPLE_SCENARIOS.length - 1;
            return (
              <button
                key={scenario.id}
                type="button"
                disabled={isSubmitting || loadingSampleId !== null}
                onClick={() => handleLoadSample(scenario)}
                className={`text-left px-3 py-2.5 rounded-xl border transition-all duration-150 cursor-pointer disabled:opacity-60 ${
                  isLastOdd ? 'sm:col-span-2' : ''
                } ${
                  isSelected
                    ? 'bg-gradient-to-r from-emerald-50 to-sky-50 border-emerald-400 text-slate-900 shadow-xs'
                    : 'bg-white/95 border-slate-200/90 hover:border-sky-300 hover:bg-sky-50/40 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900">{scenario.label}</span>
                  {isLoadingThis ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 shrink-0" aria-hidden="true" />
                  ) : (
                    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-sky-100/80 text-sky-800 shrink-0">
                      {scenario.languageTag}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  {scenario.ruleFocus}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="p-5 sm:p-6 space-y-5" noValidate>
        <div>
          <label
            htmlFor="civic-photo-upload"
            className="block text-sm font-semibold text-slate-800 mb-2"
          >
            Field Photograph
          </label>

          <input
            ref={fileInputRef}
            id="civic-photo-upload"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleInputChange}
            className="sr-only"
          />

          {image ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-xs">
              <div className="aspect-[4/3] w-full bg-slate-100 overflow-hidden">
                <SafeImage
                  src={image.previewUrl}
                  alt={`Uploaded civic report photograph: ${image.fileName}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-3 bg-white border-t border-slate-200">
                <div className="min-w-0 text-xs text-slate-600 truncate">
                  <span className="font-semibold text-slate-800">{image.fileName}</span>
                  <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{formatBytes(image.sizeBytes)}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="text-xs font-semibold text-sky-700 hover:underline whitespace-nowrap cursor-pointer disabled:opacity-50"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onImageChange(null);
                      setValidationError(null);
                    }}
                    disabled={isSubmitting}
                    aria-label="Remove uploaded photograph"
                    className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl px-5 py-8 text-center transition-colors duration-150 ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/70'
                  : 'border-sky-200 bg-gradient-to-b from-sky-50/50 to-emerald-50/30 hover:border-sky-400'
              }`}
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-100 to-sky-100 text-sky-700 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <Upload className="w-5 h-5" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                Drop a field photograph here, or browse files
              </p>
              <p className="mt-1 text-xs text-slate-500">
                JPEG, PNG, or WebP up to 8 MB · Visual evidence overrides exaggerated claims
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-4 py-2 text-xs font-semibold text-sky-800 bg-white border border-sky-200 hover:bg-sky-50 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Choose Photograph
              </button>
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <label
              htmlFor="citizen-description"
              className="block text-sm font-semibold text-slate-800"
            >
              Citizen Description (English, Malayalam, or Manglish)
            </label>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {description.length}/2000
            </span>
          </div>
          <div className="mb-2">
            <VoiceMicControl
              onTranscript={(spoken) => {
                onDescriptionChange(
                  description.trim() ? `${description.trim()} ${spoken}` : spoken
                );
                if (validationError) setValidationError(null);
              }}
              disabled={isSubmitting}
            />
          </div>
          <textarea
            id="citizen-description"
            rows={4}
            maxLength={2000}
            value={description}
            onChange={(e) => {
              onDescriptionChange(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="Describe the civic issue as reported by the citizen (e.g., 'Road-il KSEB wire potti kidakkunnu' or 'മെയിൻ റോഡിൽ വലിയ കുഴി')..."
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 leading-relaxed"
          />
        </div>

        <div>
          <label
            htmlFor="local-body-hint"
            className="block text-sm font-semibold text-slate-800 mb-1.5"
          >
            Municipality / Panchayat &amp; Ward <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <input
            id="local-body-hint"
            type="text"
            maxLength={200}
            value={localBodyHint}
            onChange={(e) => onLocalBodyHintChange(e.target.value)}
            placeholder="e.g., Kochi Corporation — Ward 28 (Near MG Road)"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          />
        </div>

        {validationError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800"
          >
            {validationError}
          </div>
        )}

        <div className="pt-1 flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-slate-500">
            Returns strict K-SMART JSON
          </span>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 hover:from-emerald-600 hover:via-teal-600 hover:to-sky-600 disabled:from-slate-400 disabled:to-slate-400 rounded-xl shadow-md shadow-teal-500/20 transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Analyzing Photo...</span>
              </>
            ) : (
              <>
                <span>Run AI Triage</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
