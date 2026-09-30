import React, { useState, useEffect } from 'react';
import { Lock, X, KeyRound, AlertCircle, ShieldCheck, Delete } from 'lucide-react';

interface PinLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  requiredPin?: string;
  pinLength?: number;
  title?: string;
  description?: string;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  requiredPin = '442401',
  pinLength,
  title = 'Manager Security Lock',
  description = 'Enter authorization PIN to access confidential records.',
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const expectedLength = pinLength || requiredPin.length || 4;

  // Reset state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(false);
    }
  }, [isOpen, requiredPin]);

  if (!isOpen) return null;

  const handleVerify = (candidatePin: string) => {
    if (candidatePin === requiredPin) {
      setError(false);
      setPin('');
      onSuccess();
    } else {
      setError(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerify(pin);
  };

  const handleKeypadPress = (val: string) => {
    setError(false);
    if (pin.length < expectedLength) {
      const nextPin = pin + val;
      setPin(nextPin);
      if (nextPin.length === expectedLength) {
        handleVerify(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setError(false);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setError(false);
    setPin('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close Security Modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-13 h-13 rounded-2xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center mb-3 shadow-inner">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
            {description}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            {/* Visual PIN Display (Password dots masked) */}
            <div className="flex justify-center items-center gap-2 mb-3">
              {Array.from({ length: expectedLength }).map((_, index) => {
                const isFilled = index < pin.length;
                return (
                  <div
                    key={index}
                    className={`w-9 h-11 rounded-xl border-2 flex items-center justify-center text-lg font-black transition-all ${
                      error
                        ? 'border-rose-400 bg-rose-50 text-rose-700'
                        : isFilled
                        ? 'border-amber-600 bg-amber-50/80 text-amber-950 scale-105 shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-300'
                    }`}
                  >
                    {isFilled ? '●' : ''}
                  </div>
                );
              })}
            </div>

            {/* Hidden / Accessible Keyboard Input */}
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                maxLength={expectedLength}
                autoFocus
                placeholder={`Enter ${expectedLength}-digit PIN`}
                value={pin}
                onChange={(e) => {
                  setError(false);
                  const clean = e.target.value.replace(/\D/g, '').slice(0, expectedLength);
                  setPin(clean);
                  if (clean.length === expectedLength) {
                    handleVerify(clean);
                  }
                }}
                className="w-full pl-9 pr-3 py-2 text-center tracking-widest text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            {/* Error Message without revealing passcode */}
            {error && (
              <p className="text-xs text-rose-600 mt-2 flex items-center gap-1.5 justify-center font-medium animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Incorrect PIN. Please try again.</span>
              </p>
            )}

            {/* Confidential Security Footnote (Passcode is NOT displayed) */}
            <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Confidential • Authorized Personnel Only</span>
            </div>
          </div>

          {/* Touchscreen Numeric Keypad */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadPress(digit)}
                className="py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-base transition-colors cursor-pointer"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-base transition-colors cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Backspace"
            >
              <Delete className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-3 bg-amber-700 hover:bg-amber-800 active:bg-amber-900 text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer"
            >
              Unlock Access
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
