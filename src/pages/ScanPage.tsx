
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Camera, Check, X, Info, AlertTriangle, Upload } from "lucide-react";
import { 
  saveScan, 
  extractTextFromImage, 
  processTextForAllergens 
} from "@/services/scanService";
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { AllergenWarningDialog } from "@/components/ui/alert-dialog-warning";
import { createWorker } from 'tesseract.js';

const ScanPage = () => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [detectedText, setDetectedText] = useState<string>("");
  const [parsedIngredients, setParsedIngredients] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showWarning, setShowWarning] = useState(false);
  const [scanInterval, setScanInterval] = useState<number | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [uploadHover, setUploadHover] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Check if running on native platform
  const isNative = typeof window !== 'undefined' && 
                  window.Capacitor !== undefined && 
                  window.Capacitor.isNativePlatform();

  // Take photo using native camera
  const takePhotoNative = async () => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        promptLabelHeader: 'Scan Ingredients',
        promptLabelCancel: 'Cancel',
        promptLabelPhoto: 'Take Photo',
      });
      
      setCapturedImage(image.dataUrl || null);
      
      // Process the captured image
      if (image.dataUrl) {
        await processOCROnImage(image.dataUrl);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      toast.error("Failed to take photo. Please try again.");
    }
  };

  // Perform OCR on an image
  const processOCROnImage = async (imageUrl: string) => {
    setLoading(true);
    setOcrProgress(0);
    
    try {
      // Create a worker and show progress
      const worker = await createWorker({
        logger: message => {
          if (message.status === 'recognizing text') {
            setOcrProgress(message.progress * 100);
          }
        }
      });
      
      // Load language data
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      
      // Configure worker to improve OCR for product labels
      await worker.setParameters({
        tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789,.():;%-_\'"/&',
        preserve_interword_spaces: '1',
      });
      
      // Process the image
      const result = await worker.recognize(imageUrl);
      await worker.terminate();
      
      const extractedText = result.data.text || "";
      setDetectedText(extractedText);
      
      // Process the text for ingredients and allergens
      if (currentUser?.allergies && currentUser.allergies.length > 0) {
        const { ingredients, warnings } = processTextForAllergens(extractedText, currentUser.allergies);
        setParsedIngredients(ingredients);
        setWarnings(warnings);
        
        if (warnings.length > 0) {
          setShowWarning(true);
        }
      }
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error("Failed to extract text from image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Start camera for web
  const startCamera = async () => {
    if (isNative) return; // Skip for native platforms
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Create canvas for processing frames
        if (!canvasRef.current) {
          const canvas = document.createElement('canvas');
          canvas.style.display = 'none';
          document.body.appendChild(canvas);
          canvasRef.current = canvas;
        }
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast.error("Failed to access camera. Please check permissions.");
    }
  };

  // Stop camera for web
  const stopCamera = () => {
    if (isNative) return; // Skip for native platforms
    
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach((track) => track.stop());
      streamRef.current = null;
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
    
    if (scanInterval) {
      clearInterval(scanInterval);
      setScanInterval(null);
    }
    
    setScanning(false);
  };

  // Take a photo for web
  const capturePhotoWeb = () => {
    if (!videoRef.current) return;
    
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageDataUrl = canvas.toDataURL("image/jpeg");
      setCapturedImage(imageDataUrl);
      stopCamera();
      
      // Process the captured image with OCR
      processOCROnImage(imageDataUrl);
    }
  };

  // Start real-time OCR scanning
  const startRealtimeScanning = () => {
    if (!videoRef.current || !canvasRef.current || !currentUser) return;
    
    setScanning(true);
    
    // Set a longer interval (3 seconds) to give time for OCR processing
    const interval = window.setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || !currentUser || loading) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      const imageDataUrl = canvas.toDataURL("image/jpeg");
      
      // Process frame with OCR - lightweight mode for real-time
      setLoading(true);
      try {
        const worker = await createWorker();
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        
        // Configure worker to improve OCR for product labels
        await worker.setParameters({
          tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789,.():;%-_\'"/&',
          preserve_interword_spaces: '1',
        });
        
        const result = await worker.recognize(imageDataUrl);
        await worker.terminate();
        
        const extractedText = result.data.text || "";
        setDetectedText(extractedText);
        
        if (currentUser.allergies && currentUser.allergies.length > 0) {
          const { ingredients, warnings } = processTextForAllergens(extractedText, currentUser.allergies);
          setParsedIngredients(ingredients);
          setWarnings(warnings);
          
          if (warnings.length > 0 && !showWarning) {
            setShowWarning(true);
          }
        }
      } catch (error) {
        console.error('Error in real-time scanning:', error);
      } finally {
        setLoading(false);
      }
    }, 3000); // Reduced frequency for better performance
    
    setScanInterval(interval);
    
    return () => {
      clearInterval(interval);
    };
  };

  // Unified capture function
  const capturePhoto = () => {
    if (isNative) {
      takePhotoNative();
    } else {
      capturePhotoWeb();
    }
  };

  // Retake photo
  const retakePhoto = () => {
    setCapturedImage(null);
    setDetectedText("");
    setParsedIngredients([]);
    setWarnings([]);
    
    if (!isNative) {
      startCamera();
    }
  };

  // Process captured image
  const processImage = async () => {
    if (!capturedImage || !currentUser) return;
    
    setLoading(true);
    try {
      const result = await saveScan(currentUser.id, capturedImage, currentUser.allergies);
      navigate(`/scan-result/${result.id}`);
    } catch (error) {
      toast.error("Failed to process image. Please try again.");
      setLoading(false);
    }
  };

  // Toggle real-time scanning
  const toggleRealtimeScanning = () => {
    if (scanning) {
      // Stop scanning
      if (scanInterval) {
        clearInterval(scanInterval);
        setScanInterval(null);
      }
      setScanning(false);
    } else {
      // Start scanning
      startRealtimeScanning();
    }
  };

  // Handle image uploads
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageDataUrl = event.target?.result as string;
      setCapturedImage(imageDataUrl);
      processOCROnImage(imageDataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setUploadHover(true);
  };
  
  const handleDragLeave = () => {
    setUploadHover(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setUploadHover(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const imageDataUrl = event.target?.result as string;
          setCapturedImage(imageDataUrl);
          processOCROnImage(imageDataUrl);
        };
        reader.readAsDataURL(file);
      } else {
        toast.error("Please upload an image file");
      }
    }
  };

  // Initialize camera when component mounts
  useEffect(() => {
    if (!isNative) {
      startCamera();
    }
    
    return () => {
      if (!isNative) {
        stopCamera();
      }
    };
  }, [isNative]);

  return (
    <div className="container mx-auto p-6 max-w-lg">
      <h1 className="text-2xl font-bold mb-6 text-center text-gradient">SafeEats Scanner</h1>
      
      <Card className="overflow-hidden border-none shadow-xl rounded-2xl">
        <CardContent className="p-0">
          {!capturedImage ? (
            // Camera view
            <div className="relative">
              {!isNative && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-[65vh] object-cover bg-black rounded-t-2xl"
                />
              )}
              <div 
                className={`${isNative ? 'h-[65vh] bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center rounded-t-2xl' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {isNative && (
                  <div className="text-center p-6">
                    <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6">
                      <Camera className="w-10 h-10 text-white" />
                    </div>
                    <p className="mb-4 text-white text-lg">Tap the button below to open camera</p>
                  </div>
                )}
                
                {/* Drag & Drop Overlay */}
                {uploadHover && (
                  <div className="absolute inset-0 bg-primary/80 flex items-center justify-center rounded-t-2xl z-30">
                    <div className="text-white text-center">
                      <Upload size={48} className="mx-auto mb-4" />
                      <p className="text-xl font-semibold">Drop image here</p>
                    </div>
                  </div>
                )}
                
                {detectedText && warnings.length > 0 && (
                  <div className="absolute top-4 left-4 right-4 bg-red-600/80 text-white p-3 rounded-lg backdrop-blur-sm z-20 flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span className="text-sm font-medium">Allergen detected! Check details below.</span>
                  </div>
                )}
                
                {!isNative && scanning && (
                  <div className="absolute inset-0 border-4 border-primary/50 rounded-t-2xl z-10">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-primary animate-pulse"></div>
                  </div>
                )}
                
                <div className={`${isNative ? '' : 'absolute bottom-6'} left-0 right-0 flex justify-center gap-4`}>
                  {!isNative && (
                    <Button
                      onClick={toggleRealtimeScanning}
                      variant="secondary"
                      size="icon"
                      className={`rounded-full w-12 h-12 ${scanning ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'} text-white shadow-lg hover:shadow-xl`}
                    >
                      {scanning ? (
                        <X className="w-6 h-6 text-white" />
                      ) : (
                        <AlertTriangle className="w-6 h-6 text-white" />
                      )}
                    </Button>
                  )}
                  
                  <Button
                    onClick={capturePhoto}
                    variant="secondary"
                    size="lg"
                    className="rounded-full w-16 h-16 bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl"
                  >
                    <Camera className="w-8 h-8 text-white" />
                  </Button>
                  
                  <input
                    type="file"
                    id="image-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    ref={fileInputRef}
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="secondary"
                    size="icon"
                    className="rounded-full w-12 h-12 bg-lavender-600 hover:bg-lavender-700 text-white shadow-lg hover:shadow-xl"
                  >
                    <Upload className="h-6 w-6" />
                  </Button>
                </div>
              </div>
              
              {/* Real-time detected text display */}
              {!isNative && scanning && detectedText && (
                <div className="absolute bottom-24 left-4 right-4 bg-black/70 text-white p-3 rounded-lg backdrop-blur-sm max-h-40 overflow-auto">
                  <h3 className="text-xs uppercase mb-1 opacity-70">Detected Text:</h3>
                  <p className="text-sm">{detectedText}</p>
                </div>
              )}
            </div>
          ) : (
            // Captured image view
            <div className="relative">
              <div className="absolute top-4 right-4 z-10 px-3 py-1.5 bg-black/50 text-white text-xs rounded-full">
                Preview
              </div>
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-[65vh] object-contain bg-black rounded-t-2xl"
              />
              
              {/* OCR Progress indicator */}
              {loading && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded-t-2xl">
                  <div className="w-16 h-16 border-4 border-t-transparent border-primary rounded-full animate-spin mb-4"></div>
                  <p className="text-white font-medium">Analyzing image...</p>
                  {ocrProgress > 0 && (
                    <div className="w-64 bg-gray-200 rounded-full h-2.5 mt-2">
                      <div 
                        className="bg-primary h-2.5 rounded-full" 
                        style={{ width: `${ocrProgress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="absolute bottom-6 left-0 right-0 flex justify-center space-x-6">
                <Button
                  onClick={retakePhoto}
                  variant="secondary"
                  size="icon"
                  className="rounded-full w-14 h-14 bg-white hover:bg-gray-100 border border-gray-200 shadow-lg hover:shadow-xl"
                >
                  <X className="w-7 h-7 text-red-500" />
                </Button>
                <Button
                  onClick={processImage}
                  variant="secondary"
                  size="icon"
                  className="rounded-full w-14 h-14 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Check className="w-7 h-7 text-white" />
                  )}
                </Button>
              </div>
              
              {/* Ingredients display */}
              {!loading && parsedIngredients.length > 0 && (
                <div className="absolute top-4 left-4 right-16 bg-black/70 text-white p-3 rounded-lg backdrop-blur-sm max-h-60 overflow-auto">
                  <h3 className="text-xs uppercase mb-1 opacity-70">Extracted Ingredients:</h3>
                  <ul className="text-sm list-disc list-inside">
                    {parsedIngredients.map((ingredient, index) => (
                      <li key={index} className="py-0.5">{ingredient}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          <div className="bg-white p-5 rounded-b-2xl">
            {!capturedImage ? (
              // Upload instructions
              <div className="flex items-start gap-3 text-left">
                <Info className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-gray-700 text-sm mb-2">
                    Position the ingredient list clearly in the frame and take a photo.
                    Make sure there is good lighting for best results.
                  </p>
                  <div 
                    className="p-3 bg-lavender-50 border border-dashed border-lavender-300 rounded-lg cursor-pointer hover:bg-lavender-100 transition-colors text-center"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <Upload className="h-5 w-5 mx-auto mb-2 text-lavender-600" />
                    <p className="text-lavender-700 font-medium text-sm">Tap to upload or drag image here</p>
                  </div>
                </div>
              </div>
            ) : (
              // Extraction results summary
              <div>
                {detectedText && (
                  <div className="mb-3">
                    <h3 className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <Info className="w-4 h-4 mr-1.5" /> Raw Extracted Text
                    </h3>
                    <div className="bg-gray-50 p-2 rounded-md text-xs text-gray-700 max-h-20 overflow-y-auto border border-gray-200">
                      {detectedText}
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-gray-500 text-center">
                  {detectedText ? "Text successfully extracted." : "Processing image..."}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Allergen Warning Dialog */}
      <AllergenWarningDialog 
        open={showWarning} 
        onOpenChange={setShowWarning}
        warnings={warnings}
      />
    </div>
  );
};

export default ScanPage;
