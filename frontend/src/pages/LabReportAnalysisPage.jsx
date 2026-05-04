import React, { useMemo, useRef, useState } from 'react';
import { FileUp, AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import Button from '../components/ui/Button';
import { analyzeReport } from '../services/api';

const flagLabel = {
  normal: { label: 'Normal', cls: 'text-[#0f803f]', bucket: 'normal' },
  high: { label: 'High', cls: 'text-red-500', bucket: 'high' },
  low: { label: 'Low', cls: 'text-indigo-600', bucket: 'low' },
};

function formatRange(row) {
  const lo = row.ref_low;
  const hi = row.ref_high;
  if (lo == null && hi == null) return '—';
  if (lo != null && hi != null) return `${lo} – ${hi}`;
  if (lo != null) return `≥ ${lo}`;
  return `≤ ${hi}`;
}

const LabReportAnalysisPage = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const rows = useMemo(() => result?.extracted_rows || [], [result]);
  const counts = useMemo(() => {
    const c = { high: 0, low: 0, normal: 0 };
    rows.forEach((r) => {
      if (c[r.flag] != null) c[r.flag] += 1;
    });
    return c;
  }, [rows]);

  const validate = (f) => {
    const ok = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!ok.includes(f.type)) return 'Please upload a JPG, PNG, or PDF.';
    if (f.size > 5 * 1024 * 1024) return 'Max 5 MB.';
    return null;
  };

  const pickFile = () => fileInputRef.current?.click();

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const msg = validate(f);
    if (msg) {
      setError(msg);
      return;
    }
    setFile(f);
    setError('');
    setResult(null);
  };

  const onUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const data = await analyzeReport(fd);
      setResult(data || {});
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Analysis failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pt-2">
      <div>
        <h2 className="text-[22px] font-bold text-[#0B1B2B] mb-1">Lab Report Analysis</h2>
        <p className="text-[14px] font-medium text-gray-500">
          Upload blood test / lab PDFs or images. We parse biomarkers, compare to reference ranges, and write plain-language insights.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 flex flex-col">
            <h3 className="text-[16px] font-bold text-[#0B1B2B] mb-4">Upload lab report</h3>

            <div
              className="flex-1 border-[1.5px] border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={pickFile}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={onFile}
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
              />
              <div className="w-14 h-14 bg-white shadow-sm border border-gray-100 rounded-xl flex items-center justify-center mb-5 text-[#334155]">
                <FileUp strokeWidth={1.5} size={28} />
              </div>
              {file ? (
                <>
                  <h4 className="text-[15px] font-bold text-[#0B1B2B] mb-1">{file.name}</h4>
                  <p className="text-[12px] text-gray-500 mb-4">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="text-[13px] font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-xl"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setResult(null);
                        setError('');
                      }}
                    >
                      <X size={14} className="inline mr-1" /> Remove
                    </button>
                    <button
                      type="button"
                      disabled={uploading}
                      className="bg-[#0f803f] hover:bg-[#0c6b34] text-white text-[13px] font-bold py-2 px-5 rounded-xl disabled:opacity-60"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpload();
                      }}
                    >
                      {uploading ? 'Analysing…' : 'Run analysis'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h4 className="text-[15px] font-bold text-[#0B1B2B] mb-2">
                    Click to choose a file
                  </h4>
                  <p className="text-[13px] text-gray-400 font-medium mb-4">or drop it here</p>
                  <button
                    type="button"
                    className="bg-[#0f803f] hover:bg-[#0c6b34] text-white text-[14px] font-bold py-2.5 px-6 rounded-xl transition-colors shadow-sm mb-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      pickFile();
                    }}
                  >
                    Choose File
                  </button>
                  <p className="text-[12px] font-medium text-gray-400">JPG / PNG / PDF · Max 5MB</p>
                </>
              )}
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 flex flex-col">
            <h3 className="text-[16px] font-bold text-[#0B1B2B] mb-4">Analysis summary</h3>

            {!result ? (
              <div className="border border-gray-100 rounded-2xl p-6 flex-1 flex flex-col items-center justify-center text-center text-gray-400">
                <Info size={32} className="mb-3 opacity-60" />
                <p className="text-sm">
                  Upload a lab PDF or image to see parsed biomarkers and insights.
                </p>
              </div>
            ) : rows.length === 0 ? (
              <div className="border border-gray-100 rounded-2xl p-6 flex-1 flex flex-col items-center justify-center text-center text-gray-500">
                <AlertCircle className="mb-2 text-amber-500" size={22} />
                <p className="text-sm">
                  No recognised biomarkers parsed. Try a clearer page with labelled values (e.g. Hemoglobin 12.5 g/dL).
                </p>
                {result?.ocr_note && (
                  <p className="mt-2 text-xs text-gray-400">{result.ocr_note}</p>
                )}
              </div>
            ) : (
              <div className="border border-gray-100 rounded-2xl p-6 flex-1 flex flex-col">
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="bg-red-50 text-[#0B1B2B] text-[13px] font-bold px-4 py-2 rounded-xl border border-red-100/50 shadow-sm flex items-center gap-1.5">
                    High <span className="text-red-500 text-[14px]">{counts.high}</span>
                  </div>
                  <div className="bg-indigo-50 text-[#0B1B2B] text-[13px] font-bold px-4 py-2 rounded-xl border border-indigo-100/50 shadow-sm flex items-center gap-1.5">
                    Low <span className="text-indigo-600 text-[14px]">{counts.low}</span>
                  </div>
                  <div className="bg-green-50 text-[#0B1B2B] text-[13px] font-bold px-4 py-2 rounded-xl border border-green-100/50 shadow-sm flex items-center gap-1.5">
                    Normal <span className="text-[#0f803f] text-[14px]">{counts.normal}</span>
                  </div>
                </div>

                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-1 py-4 text-[13px] font-bold text-[#0B1B2B] whitespace-nowrap">
                          Parameter
                        </th>
                        <th className="px-4 py-4 text-[13px] font-bold text-[#0B1B2B] whitespace-nowrap">
                          Value
                        </th>
                        <th className="px-4 py-4 text-[13px] font-bold text-[#0B1B2B] whitespace-nowrap">
                          Range
                        </th>
                        <th className="px-4 py-4 text-[13px] font-bold text-[#0B1B2B] whitespace-nowrap">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {rows.map((r, idx) => {
                        const meta = flagLabel[r.flag] || flagLabel.normal;
                        return (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td
                              className={`px-1 py-4 text-[13px] font-bold whitespace-nowrap ${
                                r.flag === 'normal' ? 'text-[#0B1B2B]' : 'text-red-500'
                              }`}
                            >
                              {r.name}
                            </td>
                            <td className="px-4 py-4 text-[13px] font-bold text-[#0B1B2B] whitespace-nowrap">
                              {r.value} {r.unit}
                            </td>
                            <td className="px-4 py-4 text-[13px] font-medium text-[#0B1B2B] whitespace-nowrap">
                              {formatRange(r)} {r.unit}
                            </td>
                            <td className={`px-4 py-4 text-[13px] font-bold whitespace-nowrap ${meta.cls}`}>
                              {meta.label}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {result?.insights && (
              <div className="mt-6 rounded-2xl border border-green-100 bg-green-50/60 p-5 flex items-start gap-3">
                <CheckCircle2 className="shrink-0 mt-0.5 text-green-600" size={20} />
                <div>
                  <p className="text-[14px] font-bold text-[#0B1B2B] mb-1">Plain-language notes</p>
                  <p className="text-[13px] text-[#0B1B2B] whitespace-pre-wrap leading-relaxed">
                    {result.insights}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-2">
                    Informational only — not medical advice.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabReportAnalysisPage;
