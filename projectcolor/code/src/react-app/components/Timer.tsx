import { useState, useEffect } from "react";
import { Clock, Play, Square } from "lucide-react";

interface TimerProps {
  onStart?: (time: string) => void;
  onStop?: (startTime: string, endTime: string, elapsed: number) => void;
}

export default function Timer({ onStart, onStop }: TimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const start = new Date(startTime);
        setElapsed(Math.floor((now.getTime() - start.getTime()) / 1000));
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  const handleStart = () => {
    const now = new Date().toISOString();
    setStartTime(now);
    setIsRunning(true);
    setElapsed(0);
    onStart?.(now);
  };

  const handleStop = () => {
    const now = new Date().toISOString();
    setIsRunning(false);
    if (startTime) {
      onStop?.(startTime, now, elapsed);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 shadow-lg border border-blue-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-gray-700">Temporizador</span>
        </div>
        {isRunning && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-red-600 font-medium">Ativo</span>
          </div>
        )}
      </div>

      <div className="text-center mb-4">
        <div className="text-4xl font-bold text-gray-900 font-mono">
          {formatTime(elapsed)}
        </div>
      </div>

      <div className="flex gap-3">
        {!isRunning ? (
          <button
            onClick={handleStart}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-all transform hover:scale-105 shadow-md"
          >
            <Play className="w-5 h-5" />
            <span>Iniciar</span>
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-all transform hover:scale-105 shadow-md"
          >
            <Square className="w-5 h-5" />
            <span>Parar</span>
          </button>
        )}
      </div>
    </div>
  );
}
