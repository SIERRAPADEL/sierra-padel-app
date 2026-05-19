import { useRef } from 'react';

export default function PinInput({ value = '', onChange, length = 4 }) {
  const inputRef = useRef(null);

  function handleChange(e) {
    const val = e.target.value.replace(/\D/g, '').slice(0, length);
    onChange(val);
  }

  return (
    <div className="flex gap-3 justify-center relative" onClick={() => inputRef.current?.focus()}>
      {/* Input nativo oculto — dispara teclado numérico en móvil */}
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={handleChange}
        maxLength={length}
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          width: 1,
          height: 1,
          top: 0,
          left: '50%',
        }}
      />
      {Array.from({ length }).map((_, i) => (
        <div
          key={i}
          className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center text-2xl font-bold transition-all cursor-pointer select-none
            ${i < value.length
              ? 'border-sp-green bg-sp-green-light text-sp-green'
              : i === value.length
                ? 'border-sp-green border-2 bg-white'
                : 'border-gray-200 bg-white text-gray-300'
            }`}
        >
          {i < value.length ? '●' : ''}
        </div>
      ))}
    </div>
  );
}
