/**
 * Wait for all fonts to be loaded before proceeding
 */
export default async function waitForFonts(onProgress = (progressPercent, statusText) => {}) {
  const report = (pct, text) => {
    try {
      onProgress(Math.max(0, Math.min(100, Math.round(pct))), text);
    } catch {
      // ignore progress callback errors
    }
  };

  report(0, 'Initializing font loading');

  // Older browsers / unusual environments may not support the Font Loading API.
  if (!document.fonts || !document.fonts.ready) {
    report(100, 'Font loading API not available; continuing');
    return;
  }

  // Wait for fonts to load
  report(5, 'Waiting for font subsystem');
  await document.fonts.ready;
  report(20, 'Font subsystem ready');

  // Explicitly load the variants declared in `src/index.css` (@font-face for Exo2)
  const variants = [
    { name: 'Exo2 Light', desc: 'normal 300 12px Exo2' },
    { name: 'Exo2 Regular', desc: 'normal 400 12px Exo2' },
    { name: 'Exo2 Italic', desc: 'italic 400 12px Exo2' },
    { name: 'Exo2 Medium', desc: 'normal 500 12px Exo2' },
    { name: 'Exo2 Bold', desc: 'normal 700 12px Exo2' },
    { name: 'Exo2 Bold Italic', desc: 'italic 700 12px Exo2' },
  ];
  report(20, `Preparing variants: ${variants.map(v => v.name).join(', ')}`);

  for (let i = 0; i < variants.length; i++) {
    const { name, desc } = variants[i];
    // Weight 20..80 across variants
    const before = 20 + (i / variants.length) * 60;
    report(before, `Loading ${name} (${i + 1}/${variants.length})`);
    try {
      await document.fonts.load(desc);
    } catch {
      // If a variant fails to load, still proceed; verification below will catch issues.
    }
    if (!document.fonts.check(desc)) {
      report(before, `Warning: ${name} not yet available after load()`);
    }
    const after = 20 + ((i + 1) / variants.length) * 60;
    report(after, `Loaded ${name} (${i + 1}/${variants.length})`);
  }

  // Verify Exo2 is actually loaded by measuring
  report(85, 'Verifying font rendering');
  const testElement = document.createElement('span');
  testElement.style.cssText = 'position:absolute;left:-9999px;font-size:12px;white-space:nowrap;';
  testElement.style.fontFamily = 'monospace';
  testElement.textContent = 'mmmmmmmmmmlli';
  document.body.appendChild(testElement);
  
  const fallbackWidth = testElement.offsetWidth;
  testElement.style.fontFamily = 'Exo2, monospace';
  
  // Poll until font is loaded (width changes when font loads)
  const maxPolls = 50;
  for (let i = 0; i < maxPolls; i++) {
    const rendered = testElement.offsetWidth !== fallbackWidth;
    if (rendered) break;

    // Weight 85..99 during verification polling
    const pct = 85 + ((i + 1) / maxPolls) * 14;
    report(pct, 'Waiting for Exo2 to render');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  document.body.removeChild(testElement);
  report(100, 'Fonts loaded');
}