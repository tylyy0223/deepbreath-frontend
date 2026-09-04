import { MOOD_EMOJIS } from '../../config/constants';

interface MoodInputProps {
  value: number;
  onChange: (score: number) => void;
}

export function MoodInput({ value, onChange }: MoodInputProps) {
  return (
    <div className="flex justify-center gap-3">
      {Object.entries(MOOD_EMOJIS).map(([score, { emoji, label, color }]) => {
        const num = Number(score);
        const isSelected = num === value;
        return (
          <button
            key={score}
            type="button"
            onClick={() => onChange(num)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all
              ${isSelected ? 'scale-110 ring-2 ring-offset-2' : 'opacity-50 hover:opacity-80'}`}
            style={{ ringColor: color, '--tw-ring-color': color } as React.CSSProperties}
          >
            <span className="text-3xl">{emoji}</span>
            <span className="text-xs text-gray-500">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
