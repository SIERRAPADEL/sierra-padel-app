export default function PinInput({ value = '', onChange, length = 4 }) {
  function handleKey(e) {
    if (e.key === 'Backspace') {
      onChange(value.slice(0, -1));
    } else if (/^\d$/.test(e.key) && value.length < length) {
      onChange(value + e.key);
    }
  }

  return (
    <div className="flex gap-3 justify-center" onKeyDown={handleKey} tabIndex={0} style={{ outline: 'none' }}>
      {Array.from({ length }).map((_, i) => (
        <div
          key={i}
          className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center text-2xl font-bold transition-all
            ${i < value.length
              ? 'border-sp-green bg-sp-green/10 text-sp-green'
              : 'border-gray-200 bg-white text-gray-300'
            }`}
        >
          {i < value.length ? '●' : ''}
        </div>
      ))}
    </div>
  );
}
