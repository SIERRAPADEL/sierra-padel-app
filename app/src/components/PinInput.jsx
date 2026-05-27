export default function PinInput({ value = '', onChange, length = 4 }) {
  function handleChange(e) {
    const val = e.target.value.replace(/\D/g, '').slice(0, length);
    onChange(val);
  }

  return (
    <div className="flex gap-3 justify-center relative" style={{ height: '56px' }}>
      {/* Input transparente que cubre todo el area — al tocarlo abre teclado numerico */}
      <input
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={handleChange}
        maxLength={length}
        autoComplete="one-time-code"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: 'pointer',
          zIndex: 10,
          fontSize: '16px',
        }}
      />
      {/* Cuadros visuales (solo decorativos, el input real esta encima) */}
      {Array.from({ length }).map((_, i) => (
        <div
          key={i}
          className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center text-2xl font-bold transition-all select-none
            ${i < value.length
              ? 'border-sp-green bg-sp-green-light text-sp-green'
              : i === value.length
                ? 'border-sp-green bg-white'
                : 'border-gray-200 bg-white text-gray-300'
            }`}
        >
          {i < value.length ? '●' : ''}
        </div>
      ))}
    </div>
  );
}
