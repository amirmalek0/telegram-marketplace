function GlassLayers({ className }: { className: string }) {
  return <svg className={className} viewBox="0 0 420 380" fill="none">
    {[120, 60, 0].map((offset, index) => <path key={offset}
      transform={`translate(0 ${offset})`}
      d="M190 30Q210 18 230 30L370 110Q395 125 370 140L230 220Q210 232 190 220L50 140Q25 125 50 110Z"
      fill={`rgba(255,255,255,${index === 2 ? .32 : .12})`}
      stroke="currentColor" strokeWidth="3" />)}
  </svg>;
}

export function LoginBackdrop() {
  return <div className="admin-login-backdrop" aria-hidden="true">
    <div className="admin-login-grid" />
    <GlassLayers className="admin-login-layers admin-login-layers-top" />
    <GlassLayers className="admin-login-layers admin-login-layers-bottom" />
  </div>;
}
