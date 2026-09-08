export function CameraFrame() {
  return (
    <div className="camera-viewfinder pointer-events-none absolute inset-x-4 bottom-4 top-20 z-10 sm:inset-x-7 sm:bottom-7 sm:top-24 lg:inset-x-10 lg:bottom-10 lg:top-28" aria-hidden="true">
      <span className="camera-corner camera-corner-tl" />
      <span className="camera-corner camera-corner-tr" />
      <span className="camera-corner camera-corner-bl" />
      <span className="camera-corner camera-corner-br" />
      <div className="camera-rec"><span /> REC</div>
      <div className="camera-code">A-CAM&nbsp;&nbsp;00:01:24:08</div>
      <div className="camera-reticle"><span /><span /></div>
      <div className="camera-focus-label">AUTO FOCUS&nbsp;&nbsp;LOCKED</div>
      <div className="camera-scanline" />
    </div>
  );
}
