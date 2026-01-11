/**
 * Wait for all fonts to be loaded before proceeding
 */
export default async function waitForFonts() {
  if (!document.fonts || !document.fonts.ready) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return;
  }

  // Wait for fonts to load
  await document.fonts.ready;

  // Explicitly load the variants we rely on (regular and bold, normal and italic)
  const variants = [
    '400 12px Exo2',
    '400 italic 12px Exo2',
    '700 12px Exo2',
    '700 italic 12px Exo2',
  ];
  await Promise.all(variants.map(desc => document.fonts.load(desc)));

  // Verify Exo2 is actually loaded by measuring
  const testElement = document.createElement('span');
  testElement.style.cssText = 'position:absolute;left:-9999px;font-size:12px;white-space:nowrap;';
  testElement.style.fontFamily = 'monospace';
  testElement.textContent = 'mmmmmmmmmmlli';
  document.body.appendChild(testElement);
  
  const fallbackWidth = testElement.offsetWidth;
  testElement.style.fontFamily = 'Exo2, monospace';
  
  // Poll until font is loaded (width changes when font loads)
  for (let i = 0; i < 50; i++) {
      if (testElement.offsetWidth !== fallbackWidth) break;
      await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  document.body.removeChild(testElement);
}