import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import { Upload, Trash2, Loader2, ArrowRight } from 'lucide-react';
import { SAMPLE_SCENARIOS, type SampleScenario } from '../data/sampleScenarios';
import {
  fileToImagePayload,
  formatBytes,
  urlToImagePayload,
  type PreparedImagePayload,
} from '../utils/imageEncoding';
import { SafeImage } from './SafeImage';

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
      className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200"
    >
      <div className="p-5 sm:p-6">
        <h1
          id="intake-heading"
          className="text-lg font-semibold text-slate-900 tracking-tight"
        >
          Citizen Report Intake
        </h1>
        <p className="mt-1 text-sm text-slate-600 leading-relaxed">
          Upload a field photograph with the citizen report in English, Malayalam, or Manglish to generate a verified K-SMART triage ticket.
        </p>
      </div>

      <div className="p-4 sm:p-5 bg-slate-50/70">
        <div className="flex items-baseline justify-between gap-2 mb-2.5">
          <span className="text-xs font-semibold text-slate-700">
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
                className={`text-left px-3 py-2 rounded-md border transition-colors duration-150 cursor-pointer disabled:opacity-60 ${
                  isLastOdd ? 'sm:col-span-2' : ''
                } ${
                  isSelected
                    ? 'bg-[#0F5257]/8 border-[#0F5257] text-slate-900'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">{scenario.label}</span>
                  {isLoadingThis ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0F5257] shrink-0" aria-hidden="true" />
                  ) : (
                    <span className="text-[11px] text-slate-500 shrink-0">
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
            className="block text-sm font-medium text-slate-800 mb-2"
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
            <div className="border border-slate-200 rounded-md overflow-hidden bg-slate-50">
              <div className="aspect-[4/3] w-full bg-slate-100 overflow-hidden">
                <SafeImage
                  src={image.previewUrl}
                  alt={`Uploaded civic report photograph: ${image.fileName}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-3 bg-white border-t border-slate-200">
                <div className="min-w-0 text-xs text-slate-600 truncate">
                  <span className="font-medium text-slate-800">{image.fileName}</span>
                  <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{formatBytes(image.sizeBytes)}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="text-xs font-medium text-[#0F5257] hover:underline whitespace-nowrap cursor-pointer disabled:opacity-50"
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
                    className="p-1.5 text-slate-500 hover:text-red-600 rounded transition-colors cursor-pointer disabled:opacity-50"
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
              className={`border border-dashed rounded-md px-5 py-8 text-center transition-colors duration-150 ${
                isDragging
                  ? 'border-[#0F5257] bg-[#0F5257]/5'
                  : 'border-slate-300 bg-slate-50/70 hover:border-slate-400'
              }`}
            >
              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2.5" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-800">
                Drop a field photograph here, or browse files
              </p>
              <p className="mt-1 text-xs text-slate-500">
                JPEG, PNG, or WebP up to 8 MB · Visual evidence overrides exaggerated claims
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
              >
                Choose Photograph
              </button>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-2 mb-1.5">
            <label
              htmlFor="citizen-description"
              className="block text-sm font-medium text-slate-800"
            >
              Citizen Description (English, Malayalam, or Manglish)
            </label>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {description.length}/2000
            </span>
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
            className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0F5257] focus:outline-none focus:ring-2 focus:ring-[#0F5257]/15 leading-relaxed"
          />
        </div>

        <div>
          <label
            htmlFor="local-body-hint"
            className="block text-sm font-medium text-slate-800 mb-1.5"
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
            className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0F5257] focus:outline-none focus:ring-2 focus:ring-[#0F5257]/15"
          />
        </div>

        {validationError && (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800"
          >
            {validationError}
          </div>
        )}

        <div className="pt-1 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            Returns strict K-SMART JSON
          </span>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0F5257] hover:bg-[#0B3F43] disabled:bg-slate-400 rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
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
