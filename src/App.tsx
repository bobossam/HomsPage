import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dices, RotateCcw, Trash2, Sparkles, MessageSquareHeart } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import confetti from 'canvas-confetti';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const getBallColor = (num: number) => {
  if (num <= 10) return 'bg-yellow-400 text-yellow-950';
  if (num <= 20) return 'bg-blue-500 text-white';
  if (num <= 30) return 'bg-red-500 text-white';
  if (num <= 40) return 'bg-gray-500 text-white';
  return 'bg-green-500 text-white';
};

const generateRandomNumbers = () => {
  const numbers = Array.from({ length: 45 }, (_, i) => i + 1);
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  return numbers.slice(0, 6).sort((a, b) => a - b);
};

const triggerConfetti = () => {
  const duration = 3000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#facc15', '#3b82f6', '#ef4444', '#22c55e']
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#facc15', '#3b82f6', '#ef4444', '#22c55e']
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };
  frame();
};

type HistoryItem = {
  numbers: number[];
  message?: string | null;
};

export default function App() {
  const [currentNumbers, setCurrentNumbers] = useState<number[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationId, setGenerationId] = useState(0);
  
  // New states for AI feature
  const [mode, setMode] = useState<'random' | 'ai'>('random');
  const [dreamInput, setDreamInput] = useState('');
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [inputError, setInputError] = useState(false);

  const handleRandomGenerate = () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setAiMessage(null);
    
    setTimeout(() => {
      const newNumbers = generateRandomNumbers();
      setCurrentNumbers(newNumbers);
      setHistory((prev) => [{ numbers: newNumbers }, ...prev].slice(0, 10));
      setGenerationId(prev => prev + 1);
      setIsGenerating(false);
      triggerConfetti();
    }, 600);
  };

  const handleAIGenerate = async () => {
    if (isGenerating) return;
    if (!dreamInput.trim()) {
      setInputError(true);
      return;
    }
    
    setInputError(false);
    setIsGenerating(true);
    setAiMessage(null);
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `사용자의 꿈 이야기 또는 오늘의 기분: "${dreamInput}". 
        이 내용을 바탕으로 로또 1등 당첨을 기원하는 긍정적이고 재미있는 해몽이나 운세를 2~3문장으로 작성하고, 1부터 45 사이의 중복되지 않는 숫자 6개를 추천해줘.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              message: { type: Type.STRING, description: "재미있는 해몽 또는 운세 멘트" },
              numbers: { 
                type: Type.ARRAY, 
                items: { type: Type.INTEGER }, 
                description: "1~45 사이의 중복 없는 숫자 6개" 
              }
            },
            required: ["message", "numbers"]
          }
        }
      });
      
      if (response.text) {
        const data = JSON.parse(response.text);
        // Ensure valid numbers
        let validNumbers = data.numbers.filter((n: number) => n >= 1 && n <= 45);
        if (validNumbers.length !== 6 || new Set(validNumbers).size !== 6) {
           validNumbers = generateRandomNumbers(); // fallback if AI makes a mistake
        } else {
           validNumbers.sort((a: number, b: number) => a - b);
        }

        setCurrentNumbers(validNumbers);
        setAiMessage(data.message);
        setHistory((prev) => [{ numbers: validNumbers, message: data.message }, ...prev].slice(0, 10));
        setGenerationId(prev => prev + 1);
        triggerConfetti();
      }
    } catch (error) {
      console.error("AI Generation Error:", error);
      // Fallback to random if API fails
      setAiMessage("앗, AI가 해몽을 하는 도중 잠에 빠졌어요! 대신 강력한 랜덤 번호를 뽑아드렸습니다.");
      const fallbackNumbers = generateRandomNumbers();
      setCurrentNumbers(fallbackNumbers);
      setHistory((prev) => [{ numbers: fallbackNumbers, message: "AI 오류로 인한 랜덤 생성" }, ...prev].slice(0, 10));
      setGenerationId(prev => prev + 1);
      triggerConfetti();
    } finally {
      setIsGenerating(false);
    }
  };

  // Initial generation
  useEffect(() => {
    const initialNumbers = generateRandomNumbers();
    setCurrentNumbers(initialNumbers);
    setHistory([{ numbers: initialNumbers }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4 font-sans">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-100 rounded-full mb-2 shadow-inner">
            <Sparkles className="w-10 h-10 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">행운의 로또 번호</h1>
          <p className="text-gray-500 font-medium">당신의 꿈이 현실이 되는 순간!</p>
        </div>

        {/* Mode Selector */}
        <div className="flex p-1 bg-gray-200 rounded-2xl">
          <button
            onClick={() => setMode('random')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${mode === 'random' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            🎲 일반 랜덤 뽑기
          </button>
          <button
            onClick={() => setMode('ai')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${mode === 'ai' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            ✨ AI 꿈 해몽 뽑기
          </button>
        </div>

        {/* Main Display */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center space-y-6">
          
          {/* AI Input Area */}
          {mode === 'ai' && (
            <div className="w-full space-y-3">
              <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                <MessageSquareHeart className="w-4 h-4 text-pink-500" />
                어떤 꿈을 꾸셨나요? (또는 오늘의 기분)
              </label>
              <textarea
                value={dreamInput}
                onChange={(e) => {
                  setDreamInput(e.target.value);
                  if (e.target.value.trim()) setInputError(false);
                }}
                placeholder="예: 어제 밤에 돼지 무리가 집으로 들어오는 꿈을 꿨어요!"
                className={`w-full p-4 bg-gray-50 border rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none h-24 ${inputError ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
              />
              {inputError && <p className="text-xs text-red-500 font-medium px-1">내용을 조금이라도 입력해주세요!</p>}
            </div>
          )}

          {/* AI Message Display */}
          <AnimatePresence mode="wait">
            {aiMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="w-full p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-900 text-sm font-medium leading-relaxed text-center"
              >
                "{aiMessage}"
              </motion.div>
            )}
          </AnimatePresence>

          {/* Numbers */}
          <div className="flex justify-center gap-2 sm:gap-3 w-full h-16 py-2">
            <AnimatePresence mode="popLayout">
              {currentNumbers.map((num, idx) => (
                <motion.div
                  key={`${generationId}-${idx}`}
                  initial={{ opacity: 0, y: -20, scale: 0.5, rotate: -180 }}
                  animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 300, 
                    damping: 15,
                    delay: idx * 0.1 
                  }}
                  className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-base sm:text-xl font-bold shadow-md ${getBallColor(num)}`}
                >
                  {num}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <button
            onClick={mode === 'ai' ? handleAIGenerate : handleRandomGenerate}
            disabled={isGenerating}
            className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            {isGenerating ? (
              <>
                <RotateCcw className="w-5 h-5 animate-spin" />
                {mode === 'ai' ? 'AI가 해몽 분석 중...' : '번호 뽑는 중...'}
              </>
            ) : (
              <>
                {mode === 'ai' ? <Sparkles className="w-5 h-5" /> : <Dices className="w-5 h-5" />}
                {mode === 'ai' ? 'AI 맞춤 번호 받기' : '새로운 번호 뽑기'}
              </>
            )}
          </button>
        </div>

        {/* History */}
        {history.length > 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">최근 생성 내역</h2>
              <button 
                onClick={() => setHistory([{ numbers: currentNumbers, message: aiMessage }])}
                className="text-sm text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1 font-medium"
              >
                <Trash2 className="w-4 h-4" />
                지우기
              </button>
            </div>
            <div className="space-y-3">
              {history.slice(1).map((item, index) => (
                <div key={index} className="flex flex-col p-3 bg-gray-50 rounded-2xl border border-gray-100 gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-400 w-6">{index + 1}</span>
                    <div className="flex gap-1.5 sm:gap-2">
                      {item.numbers.map((num, nIdx) => (
                        <div 
                          key={nIdx} 
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shadow-sm ${getBallColor(num)}`}
                        >
                          {num}
                        </div>
                      ))}
                    </div>
                  </div>
                  {item.message && (
                    <div className="text-xs text-gray-500 bg-white p-2 rounded-xl border border-gray-100">
                      ✨ {item.message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
