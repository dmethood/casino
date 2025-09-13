'use client';

import { useState, useCallback, useRef } from 'react';
import { AuthUser } from '@/lib/auth';
import { 
  DocumentCheckIcon, 
  CameraIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpTrayIcon,
  EyeIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface KYCVerificationFlowProps {
  user: AuthUser;
  kycProfile: any;
  jurisdiction: string;
  requiredDocuments: {
    identity: string[];
    address: string[];
    selfie: boolean;
    additionalDocuments: string[];
    requiresEnhancedDD: boolean;
  };
  jurisdictionRestrictions: any;
}

interface UploadedDocument {
  id: string;
  type: string;
  frontFile?: File;
  backFile?: File;
  frontPreview?: string;
  backPreview?: string;
  country: string;
  number?: string;
  expiryDate?: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  error?: string;
}

interface SelfieUpload {
  file?: File;
  preview?: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  error?: string;
  livenessDetected?: boolean;
}

export default function KYCVerificationFlow({ 
  user, 
  kycProfile, 
  jurisdiction, 
  requiredDocuments,
  jurisdictionRestrictions 
}: KYCVerificationFlowProps) {
  const [currentStep, setCurrentStep] = useState(kycProfile?.status === 'NOT_STARTED' ? 0 : 1);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [selfie, setSelfie] = useState<SelfieUpload>({ status: 'pending' });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState<{ id: string; type: 'front' | 'back' } | null>(null);
  
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const webcamRef = useRef<HTMLVideoElement>(null);
  const [webcamActive, setWebcamActive] = useState(false);

  const documentTypes = {
    PASSPORT: { name: 'Passport', needsBack: false, icon: '📘' },
    DRIVING_LICENSE: { name: 'Driving License', needsBack: true, icon: '🪪' },
    NATIONAL_ID: { name: 'National ID Card', needsBack: true, icon: '🆔' },
    UTILITY_BILL: { name: 'Utility Bill', needsBack: false, icon: '📄' },
    BANK_STATEMENT: { name: 'Bank Statement', needsBack: false, icon: '🏦' }
  };

  const getDocumentStatus = () => {
    if (!kycProfile) return null;
    
    switch (kycProfile.status) {
      case 'NOT_STARTED':
        return { color: 'gray', text: 'Not Started', description: 'Complete your identity verification to access all features.' };
      case 'DOCUMENTS_REQUESTED':
        return { color: 'blue', text: 'Documents Requested', description: 'Please upload the required documents below.' };
      case 'DOCUMENTS_SUBMITTED':
        return { color: 'yellow', text: 'Under Review', description: 'Your documents are being reviewed by our team.' };
      case 'UNDER_REVIEW':
        return { color: 'yellow', text: 'Under Review', description: 'Your documents are being reviewed by our compliance team.' };
      case 'ADDITIONAL_INFO_REQUIRED':
        return { color: 'orange', text: 'Additional Information Required', description: 'Please provide additional documents or information.' };
      case 'APPROVED':
        return { color: 'green', text: 'Verified', description: 'Your identity has been successfully verified.' };
      case 'REJECTED':
        return { color: 'red', text: 'Rejected', description: 'Your verification was not successful. Please contact support.' };
      case 'EXPIRED':
        return { color: 'red', text: 'Expired', description: 'Your verification has expired. Please submit new documents.' };
      default:
        return { color: 'gray', text: 'Unknown', description: 'Unknown status.' };
    }
  };

  const handleFileSelect = useCallback((documentId: string, type: 'front' | 'back', files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'];

    if (file.size > maxSize) {
      alert('File size must be less than 10MB');
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a JPEG, PNG, HEIC, or PDF file');
      return;
    }

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setDocuments(prev => prev.map(doc => 
          doc.id === documentId 
            ? { 
                ...doc, 
                [type === 'front' ? 'frontFile' : 'backFile']: file,
                [type === 'front' ? 'frontPreview' : 'backPreview']: e.target?.result as string,
                status: 'pending'
              }
            : doc
        ));
      };
      reader.readAsDataURL(file);
    } else {
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId 
          ? { 
              ...doc, 
              [type === 'front' ? 'frontFile' : 'backFile']: file,
              status: 'pending'
            }
          : doc
      ));
    }
  }, []);

  const addDocument = (type: string) => {
    const newDoc: UploadedDocument = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      country: jurisdiction,
      status: 'pending'
    };
    setDocuments(prev => [...prev, newDoc]);
  };

  const removeDocument = (documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
  };

  const updateDocumentInfo = (documentId: string, field: string, value: string) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === documentId ? { ...doc, [field]: value } : doc
    ));
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } 
      });
      
      if (webcamRef.current) {
        webcamRef.current.srcObject = stream;
        setWebcamActive(true);
      }
    } catch (error) {
      console.error('Error accessing webcam:', error);
      alert('Unable to access camera. Please ensure you have granted camera permissions.');
    }
  };

  const stopWebcam = () => {
    if (webcamRef.current?.srcObject) {
      const stream = webcamRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      webcamRef.current.srcObject = null;
    }
    setWebcamActive(false);
  };

  const captureSelfie = () => {
    if (!webcamRef.current) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = webcamRef.current.videoWidth;
    canvas.height = webcamRef.current.videoHeight;
    context.drawImage(webcamRef.current, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;

      const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
      const preview = canvas.toDataURL('image/jpeg', 0.8);

      setSelfie({
        file,
        preview,
        status: 'uploaded',
        livenessDetected: true // In production, this would use actual liveness detection
      });

      stopWebcam();
    }, 'image/jpeg', 0.8);
  };

  const handleSelfieUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (file.size > maxSize) {
      alert('File size must be less than 10MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setSelfie({
        file,
        preview: e.target?.result as string,
        status: 'uploaded'
      });
    };
    reader.readAsDataURL(file);
  };

  const encryptFile = async (file: File): Promise<string> => {
    // In production, this would use proper client-side encryption
    // For now, we'll simulate the encryption process
    return new Promise((resolve) => {
      setTimeout(() => {
        // Convert file to base64 (in production, would be properly encrypted)
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      }, 1000);
    });
  };

  const submitDocuments = async () => {
    setSubmitting(true);

    try {
      // Validate all required documents are uploaded
      const hasIdentityDoc = documents.some(doc => 
        requiredDocuments.identity.includes(doc.type) && 
        doc.frontFile && 
        (documentTypes[doc.type as keyof typeof documentTypes].needsBack ? doc.backFile : true)
      );

      const hasAddressDoc = documents.some(doc => 
        requiredDocuments.address.includes(doc.type) && doc.frontFile
      );

      if (!hasIdentityDoc) {
        alert('Please upload at least one identity document');
        return;
      }

      if (!hasAddressDoc && requiredDocuments.address.length > 0) {
        alert('Please upload a proof of address document');
        return;
      }

      if (requiredDocuments.selfie && !selfie.file) {
        alert('Please take or upload a selfie');
        return;
      }

      // Encrypt and upload documents
      const uploadedDocuments = [];
      
      for (const doc of documents) {
        if (!doc.frontFile) continue;

        setDocuments(prev => prev.map(d => 
          d.id === doc.id ? { ...d, status: 'uploading' } : d
        ));

        const documentData = {
          type: doc.type,
          country: doc.country,
          number: doc.number,
          expiryDate: doc.expiryDate,
          frontImage: await encryptFile(doc.frontFile),
          backImage: doc.backFile ? await encryptFile(doc.backFile) : null
        };

        uploadedDocuments.push(documentData);
        
        setDocuments(prev => prev.map(d => 
          d.id === doc.id ? { ...d, status: 'uploaded' } : d
        ));
      }

      // Upload selfie
      let selfieData = null;
      if (selfie.file) {
        setSelfie(prev => ({ ...prev, status: 'uploading' }));
        selfieData = await encryptFile(selfie.file);
        setSelfie(prev => ({ ...prev, status: 'uploaded' }));
      }

      // Submit to KYC API
      const response = await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          documents: uploadedDocuments,
          selfie: selfieData,
          jurisdiction,
          metadata: {
            ipAddress: 'client-ip', // Would be handled server-side
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            livenessDetected: selfie.livenessDetected
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit documents');
      }

      const result = await response.json();

      if (result.success) {
        setCurrentStep(2); // Move to confirmation step
      } else {
        throw new Error(result.error || 'Submission failed');
      }

    } catch (error) {
      console.error('Error submitting documents:', error);
      alert('Failed to submit documents. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const status = getDocumentStatus();

  const steps = [
    { id: 0, name: 'Information', description: 'Learn about the verification process' },
    { id: 1, name: 'Upload Documents', description: 'Upload required documents' },
    { id: 2, name: 'Review', description: 'Review and confirm submission' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep >= step.id 
                  ? 'bg-blue-600 border-blue-600 text-white' 
                  : 'border-gray-300 text-gray-400'
              }`}>
                {currentStep > step.id ? (
                  <CheckCircleIcon className="h-6 w-6" />
                ) : (
                  <span className="text-sm font-medium">{step.id + 1}</span>
                )}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  currentStep >= step.id ? 'text-blue-600' : 'text-gray-400'
                }`}>
                  {step.name}
                </p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className={`mx-4 h-px w-20 ${
                  currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Current Status */}
      {status && (
        <div className={`p-4 border rounded-md ${
          status.color === 'green' ? 'bg-green-50 border-green-200' :
          status.color === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
          status.color === 'red' ? 'bg-red-50 border-red-200' :
          status.color === 'blue' ? 'bg-blue-50 border-blue-200' :
          'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center">
            {status.color === 'green' ? (
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
            ) : status.color === 'yellow' ? (
              <ClockIcon className="h-5 w-5 text-yellow-400" />
            ) : status.color === 'red' ? (
              <XCircleIcon className="h-5 w-5 text-red-400" />
            ) : (
              <InformationCircleIcon className="h-5 w-5 text-blue-400" />
            )}
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${
                status.color === 'green' ? 'text-green-800' :
                status.color === 'yellow' ? 'text-yellow-800' :
                status.color === 'red' ? 'text-red-800' :
                status.color === 'blue' ? 'text-blue-800' :
                'text-gray-800'
              }`}>
                {status.text}
              </h3>
              <p className={`text-sm ${
                status.color === 'green' ? 'text-green-700' :
                status.color === 'yellow' ? 'text-yellow-700' :
                status.color === 'red' ? 'text-red-700' :
                status.color === 'blue' ? 'text-blue-700' :
                'text-gray-700'
              }`}>
                {status.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step Content */}
      {currentStep === 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Identity Verification Process</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">What You'll Need</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <DocumentCheckIcon className="h-6 w-6 text-blue-500 mr-2" />
                    <h4 className="font-medium text-gray-900">Identity Document</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">One of the following:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {requiredDocuments.identity.map(docType => (
                      <li key={docType} className="flex items-center">
                        <span className="mr-2">{documentTypes[docType as keyof typeof documentTypes]?.icon}</span>
                        {documentTypes[docType as keyof typeof documentTypes]?.name}
                      </li>
                    ))}
                  </ul>
                </div>

                {requiredDocuments.address.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <DocumentCheckIcon className="h-6 w-6 text-green-500 mr-2" />
                      <h4 className="font-medium text-gray-900">Proof of Address</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">One of the following:</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {requiredDocuments.address.map(docType => (
                        <li key={docType} className="flex items-center">
                          <span className="mr-2">{documentTypes[docType as keyof typeof documentTypes]?.icon}</span>
                          {documentTypes[docType as keyof typeof documentTypes]?.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {requiredDocuments.selfie && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <CameraIcon className="h-6 w-6 text-purple-500 mr-2" />
                      <h4 className="font-medium text-gray-900">Selfie Photo</h4>
                    </div>
                    <p className="text-sm text-gray-600">
                      A clear photo of yourself for identity verification
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <ShieldCheckIcon className="h-5 w-5 text-blue-400" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-800">Security & Privacy</h4>
                  <div className="text-sm text-blue-700 mt-1 space-y-1">
                    <p>• All documents are encrypted before transmission</p>
                    <p>• Your data is stored securely and handled according to GDPR</p>
                    <p>• We use certified identity verification providers</p>
                    <p>• Documents are automatically deleted per retention policy</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800">Important Requirements</h4>
                  <div className="text-sm text-yellow-700 mt-1 space-y-1">
                    <p>• Documents must be in your legal name</p>
                    <p>• Photos must be clear and all text readable</p>
                    <p>• Documents must be current and not expired</p>
                    <p>• Selfie must show your face clearly with good lighting</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setCurrentStep(1)}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              >
                Start Verification
              </button>
            </div>
          </div>
        </div>
      )}

      {currentStep === 1 && (
        <div className="space-y-6">
          
          {/* Identity Documents */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Identity Documents</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload one of the accepted identity documents. Both sides are required for cards.
            </p>

            <div className="space-y-4">
              {documents.filter(doc => requiredDocuments.identity.includes(doc.type)).map(doc => (
                <DocumentUploadCard
                  key={doc.id}
                  document={doc}
                  documentTypes={documentTypes}
                  onFileSelect={handleFileSelect}
                  onRemove={removeDocument}
                  onUpdateInfo={updateDocumentInfo}
                  fileInputRefs={fileInputRefs}
                />
              ))}

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <div className="space-y-2">
                  <DocumentCheckIcon className="mx-auto h-8 w-8 text-gray-400" />
                  <div className="text-sm text-gray-600">
                    <p className="mb-2">Choose your identity document type:</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {requiredDocuments.identity.map(docType => (
                        <button
                          key={docType}
                          onClick={() => addDocument(docType)}
                          className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                        >
                          {documentTypes[docType as keyof typeof documentTypes]?.icon} {documentTypes[docType as keyof typeof documentTypes]?.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Proof of Address */}
          {requiredDocuments.address.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Proof of Address</h3>
              <p className="text-sm text-gray-600 mb-4">
                Upload a document that shows your current address (must be less than 3 months old).
              </p>

              <div className="space-y-4">
                {documents.filter(doc => requiredDocuments.address.includes(doc.type)).map(doc => (
                  <DocumentUploadCard
                    key={doc.id}
                    document={doc}
                    documentTypes={documentTypes}
                    onFileSelect={handleFileSelect}
                    onRemove={removeDocument}
                    onUpdateInfo={updateDocumentInfo}
                    fileInputRefs={fileInputRefs}
                  />
                ))}

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <div className="space-y-2">
                    <DocumentCheckIcon className="mx-auto h-8 w-8 text-gray-400" />
                    <div className="text-sm text-gray-600">
                      <p className="mb-2">Choose your proof of address document:</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {requiredDocuments.address.map(docType => (
                          <button
                            key={docType}
                            onClick={() => addDocument(docType)}
                            className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm"
                          >
                            {documentTypes[docType as keyof typeof documentTypes]?.icon} {documentTypes[docType as keyof typeof documentTypes]?.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Selfie Upload */}
          {requiredDocuments.selfie && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Selfie Verification</h3>
              <p className="text-sm text-gray-600 mb-4">
                Take a clear photo of yourself or upload an existing photo. Make sure your face is clearly visible and well-lit.
              </p>

              {selfie.status === 'pending' && (
                <div className="space-y-4">
                  <div className="flex space-x-4">
                    <button
                      onClick={startWebcam}
                      className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                      <CameraIcon className="h-4 w-4 mr-2" />
                      Take Photo
                    </button>
                    
                    <label className="flex items-center bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 cursor-pointer">
                      <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                      Upload Photo
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleSelfieUpload(e.target.files)}
                      />
                    </label>
                  </div>

                  {webcamActive && (
                    <div className="space-y-4">
                      <video
                        ref={webcamRef}
                        autoPlay
                        playsInline
                        className="w-full max-w-md mx-auto rounded-lg"
                      />
                      <div className="flex justify-center space-x-4">
                        <button
                          onClick={captureSelfie}
                          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                        >
                          Capture
                        </button>
                        <button
                          onClick={stopWebcam}
                          className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selfie.preview && (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <img
                      src={selfie.preview}
                      alt="Selfie"
                      className="w-48 h-48 object-cover rounded-lg border-2 border-gray-300"
                    />
                  </div>
                  
                  {selfie.livenessDetected && (
                    <div className="flex items-center justify-center text-green-600">
                      <CheckCircleIcon className="h-5 w-5 mr-2" />
                      <span className="text-sm">Liveness detected</span>
                    </div>
                  )}
                  
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={() => setSelfie({ status: 'pending' })}
                      className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                    >
                      Retake
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              onClick={() => setCurrentStep(0)}
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400"
            >
              Back
            </button>
            <button
              onClick={submitDocuments}
              disabled={submitting || documents.length === 0}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Documents'}
            </button>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Documents Submitted Successfully</h2>
          <p className="text-gray-600 mb-6">
            Your identity verification documents have been submitted and are being reviewed by our compliance team.
            You will receive an email notification once the review is complete.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
            <div className="flex items-center">
              <ClockIcon className="h-5 w-5 text-blue-400" />
              <div className="ml-3 text-left">
                <h4 className="text-sm font-medium text-blue-800">What happens next?</h4>
                <div className="text-sm text-blue-700 mt-1 space-y-1">
                  <p>• Review typically takes 1-3 business days</p>
                  <p>• You'll receive email updates on progress</p>
                  <p>• Additional documents may be requested if needed</p>
                  <p>• Full account access once approved</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={() => window.location.href = '/account'}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Go to Account
            </button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Document Preview</h3>
              <button
                onClick={() => setShowPreview(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            
            {showPreview && (
              <img
                src={
                  showPreview.type === 'front' 
                    ? documents.find(d => d.id === showPreview.id)?.frontPreview 
                    : documents.find(d => d.id === showPreview.id)?.backPreview
                }
                alt="Document preview"
                className="max-w-full max-h-96 mx-auto"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Document Upload Card Component
function DocumentUploadCard({ 
  document, 
  documentTypes, 
  onFileSelect, 
  onRemove, 
  onUpdateInfo, 
  fileInputRefs 
}: any) {
  const docType = documentTypes[document.type as keyof typeof documentTypes];
  
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-900">
          {docType?.icon} {docType?.name}
        </h4>
        <button
          onClick={() => onRemove(document.id)}
          className="text-red-600 hover:text-red-800"
        >
          <XCircleIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Front Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {docType?.needsBack ? 'Front Side' : 'Document'}
          </label>
          
          {document.frontPreview ? (
            <div className="relative">
              <img
                src={document.frontPreview}
                alt="Document front"
                className="w-full h-32 object-cover rounded border-2 border-gray-300"
              />
              <button
                onClick={() => fileInputRefs.current[`${document.id}_front`]?.click()}
                className="absolute inset-0 bg-black bg-opacity-50 text-white text-sm font-medium rounded flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              >
                Change
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRefs.current[`${document.id}_front`]?.click()}
              className="w-full h-32 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-blue-400"
            >
              <div className="text-center">
                <ArrowUpTrayIcon className="mx-auto h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-600">Click to upload</p>
              </div>
            </div>
          )}
          
          <input
            ref={(el) => { if (el) fileInputRefs.current[`${document.id}_front`] = el; }}
            type="file"
            className="hidden"
            accept="image/*,.pdf"
            onChange={(e) => onFileSelect(document.id, 'front', e.target.files)}
          />
        </div>

        {/* Back Upload (if needed) */}
        {docType?.needsBack && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Back Side</label>
            
            {document.backPreview ? (
              <div className="relative">
                <img
                  src={document.backPreview}
                  alt="Document back"
                  className="w-full h-32 object-cover rounded border-2 border-gray-300"
                />
                <button
                  onClick={() => fileInputRefs.current[`${document.id}_back`]?.click()}
                  className="absolute inset-0 bg-black bg-opacity-50 text-white text-sm font-medium rounded flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                >
                  Change
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRefs.current[`${document.id}_back`]?.click()}
                className="w-full h-32 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-blue-400"
              >
                <div className="text-center">
                  <ArrowUpTrayIcon className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="text-sm text-gray-600">Click to upload</p>
                </div>
              </div>
            )}
            
            <input
              ref={(el) => { if (el) fileInputRefs.current[`${document.id}_back`] = el; }}
              type="file"
              className="hidden"
              accept="image/*,.pdf"
              onChange={(e) => onFileSelect(document.id, 'back', e.target.files)}
            />
          </div>
        )}
      </div>

      {/* Document Info Fields */}
      {document.type !== 'UTILITY_BILL' && document.type !== 'BANK_STATEMENT' && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Number
            </label>
            <input
              type="text"
              value={document.number || ''}
              onChange={(e) => onUpdateInfo(document.id, 'number', e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Enter document number"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiry Date
            </label>
            <input
              type="date"
              value={document.expiryDate || ''}
              onChange={(e) => onUpdateInfo(document.id, 'expiryDate', e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
