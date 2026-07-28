// Isotipo institucional de Sierra Padel. La silueta viene del arte oficial de la
// diseñadora (public/icons/isotipo-mask.png, monograma en alpha); se pinta con
// background-color usando mask-image → se puede tintar de cualquier color (blanco
// sobre verde, verde sobre blanco, o el color del nivel de lealtad) sin perder la
// forma real. Antes era un SVG recreado a mano que no coincidía con el institucional.
export default function Isotipo({ size = 48, color = '#96C800', className, style }) {
  const px = typeof size === 'number' ? `${size}px` : size;
  const mask = 'url(/icons/isotipo-mask.png)';
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: px,
        height: px,
        backgroundColor: color,
        WebkitMaskImage: mask,
        maskImage: mask,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        ...style,
      }}
    />
  );
}
