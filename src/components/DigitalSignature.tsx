import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface DigitalSignatureProps {
  onSign: (signatureData: string, method: 'digital' | 'typed') => void;
  onCancel: () => void;
  signerName: string;
}

export function DigitalSignature({ onSign, onCancel, signerName }: DigitalSignatureProps) {
  const [method, setMethod] = useState<'digital' | 'typed'>('digital');
  const [typedName, setTypedName] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (canvasRef.current && method === 'digital') {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        context.strokeStyle = '#000000';
        context.lineWidth = 2;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        setCtx(context);
      }
    }
  }, [method]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !ctx) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const handleSubmit = () => {
    if (!agreed) {
      alert('Please agree to the terms before signing');
      return;
    }

    let signatureData = '';

    if (method === 'digital') {
      if (!canvasRef.current) {
        alert('Signature canvas not found');
        return;
      }
      const canvas = canvasRef.current;
      const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      let hasContent = false;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] > 0) {
          hasContent = true;
          break;
        }
      }
      if (!hasContent) {
        alert('Please provide a signature');
        return;
      }
      signatureData = canvas.toDataURL('image/png');
    } else {
      if (!typedName.trim()) {
        alert('Please type your name');
        return;
      }
      signatureData = typedName;
    }

    onSign(signatureData, method);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Sign Agreement</h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Signature Method
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setMethod('digital')}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                  method === 'digital'
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                Draw Signature
              </button>
              <button
                onClick={() => setMethod('typed')}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                  method === 'typed'
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                Type Name
              </button>
            </div>
          </div>

          <div className="mb-6">
            {method === 'digital' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Draw your signature below
                </label>
                <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    className="w-full bg-white cursor-crosshair touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>
                <button
                  onClick={clearSignature}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  Clear Signature
                </button>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type your full name
                </label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-2xl font-serif italic"
                  placeholder={signerName}
                  style={{ fontFamily: 'Brush Script MT, cursive' }}
                />
              </div>
            )}
          </div>

          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                I, <strong>{signerName}</strong>, agree to the terms and conditions of this lease agreement and acknowledge that my electronic signature is legally binding and has the same effect as a handwritten signature. I understand that by signing this document electronically, I am entering into a legally binding contract.
              </span>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!agreed}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Sign Agreement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
