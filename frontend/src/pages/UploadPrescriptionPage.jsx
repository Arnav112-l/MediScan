import React, { useState, useRef } from 'react';
import { UploadCloud, FileType, CheckCircle2, AlertCircle, X, Search } from 'lucide-react';
import { uploadPrescription } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Link } from 'react-router-dom';

const UploadPrescriptionPage = () => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const medicines = Array.isArray(result?.medicines) ? result.medicines : [];
  const comparisons = Array.isArray(result?.comparisons) ? result.comparisons : [];

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    validateAndSetFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e) => validateAndSetFile(e.target.files[0]);

  const validateAndSetFile = (selectedFile) => {
    setError(null);
    if (!selectedFile) return;
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Please upload a valid JPG, PNG, or PDF file.');
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size should not exceed 5MB.');
      return;
    }
    setFile(selectedFile);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await uploadPrescription(formData);
      setResult(data || {});
      if (!data?.medicines?.length) {
        setError('OCR completed but no medicines could be parsed. Try a clearer image.');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to process prescription. Please try again.';
      setError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const priceRange = (prices) => {
    if (!Array.isArray(prices) || prices.length === 0) return null;
    const nums = prices.map((p) => Number(p.price)).filter((n) => Number.isFinite(n));
    if (!nums.length) return null;
    const lo = Math.min(...nums);
    const hi = Math.max(...nums);
    return lo === hi ? `₹${lo.toFixed(2)}` : `₹${lo.toFixed(2)} – ₹${hi.toFixed(2)}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Upload Prescription</h2>
        <p className="text-gray-600 mt-1">
          Upload an image or PDF of your prescription. OCR extracts medicines and we fetch live pharmacy prices.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="h-full">
          <Card.Header>
            <h3 className="text-lg font-bold text-gray-900">Upload prescription file</h3>
          </Card.Header>
          <Card.Body className="flex flex-col">
            <div
              className={`flex-1 border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors min-h-[300px]
                ${isDragging ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:bg-gray-50 bg-white'}
                ${file ? 'border-green-500 bg-green-50/50' : ''}
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !file && fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".jpg,.jpeg,.png,.pdf"
                className="hidden"
              />
              {!file ? (
                <>
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <UploadCloud size={32} className="text-gray-500" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Drag & drop your file here</h4>
                  <p className="text-sm text-gray-500 mb-6">or</p>
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    Choose File
                  </Button>
                  <p className="text-xs text-gray-400 mt-6">Supports JPG, PNG, PDF (Max 5MB)</p>
                </>
              ) : (
                <div className="w-full flex flex-col items-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
                    <FileType size={32} />
                  </div>
                  <p className="font-medium text-gray-900 truncate w-full max-w-xs mb-1">{file.name}</p>
                  <p className="text-sm text-gray-500 mb-6">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setResult(null);
                        setError(null);
                      }}
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                    >
                      <X size={16} className="mr-1" /> Remove
                    </Button>
                    <Button
                      variant="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpload();
                      }}
                      disabled={isUploading}
                    >
                      {isUploading ? 'Extracting...' : 'Extract Medicines'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-start gap-2 text-sm">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
          </Card.Body>
        </Card>

        <Card className="h-full bg-gray-50 border-dashed border-gray-200 shadow-none">
          <Card.Header className="bg-transparent border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Extracted medicines</h3>
          </Card.Header>
          <Card.Body>
            {isUploading ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="relative mb-6">
                  <div className="absolute inset-0 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <Search className="text-green-600" size={24} />
                  </div>
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Reading prescription…</h4>
                <p className="text-sm text-gray-500 max-w-xs">
                  OCR extracting text, then checking live pharmacy prices.
                </p>
              </div>
            ) : result ? (
              <div className="space-y-6">
                <div className="bg-green-100 text-green-800 p-4 rounded-lg flex items-start gap-3">
                  <CheckCircle2 className="shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="font-medium">Extracted {medicines.length} medicine{medicines.length === 1 ? '' : 's'}</p>
                    <p className="text-sm mt-1 opacity-90">
                      Live pharmacy prices attempted for top {comparisons.length}. Verify on the source site before buying.
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {medicines.map((med, index) => {
                    const comp = comparisons[index] || {};
                    const range = priceRange(comp.prices);
                    return (
                      <div
                        key={`${med.name}-${index}`}
                        className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between group hover:border-green-300 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900">{med.name || 'Unknown'}</h4>
                            <p className="text-sm text-gray-500">
                              {[med.dosage, med.frequency, med.duration].filter(Boolean).join(' · ') || '—'}
                            </p>
                            {range && (
                              <p className="text-xs font-medium text-green-700 mt-0.5">Live: {range}</p>
                            )}
                          </div>
                        </div>
                        <Link to={`/dashboard/compare?m=${encodeURIComponent(med.name || '')}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            Compare
                          </Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 text-gray-400">
                <FileType size={48} className="mb-4 opacity-50" />
                <p>Upload a prescription to see extracted medicines and live prices here.</p>
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default UploadPrescriptionPage;
