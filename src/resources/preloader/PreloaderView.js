class PreloaderView {
  constructor(doc) {
    this.doc = doc;
    this.overlayEl = null;
    this.progressBarFillEl = null;
    this.progressPctEl = null;
    this.statusEl = null;
  }

  ensureDom() {
    const d = this.doc;

    // Styles (only once)
    const styleId = 'nr-preloader-style';
    if (!d.getElementById(styleId)) {
      const style = d.createElement('style');
      style.id = styleId;
      style.textContent = `
        #nr-preloader {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(1200px 700px at 50% 40%, rgba(124, 58, 237, 0.10), rgba(0, 0, 0, 0) 60%),
            radial-gradient(900px 520px at 30% 70%, rgba(249, 115, 22, 0.10), rgba(0, 0, 0, 0) 62%),
            radial-gradient(900px 520px at 75% 75%, rgba(34, 211, 238, 0.08), rgba(0, 0, 0, 0) 62%),
            rgba(3, 4, 6, 0.92);
          color: #e5e7eb;
          font-family: Exo2, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }
        #nr-preloader-card {
          width: min(520px, calc(100vw - 48px));
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(17, 24, 39, 0.72);
          box-shadow:
            0 28px 80px rgba(0, 0, 0, 0.55),
            0 0 0 1px rgba(0, 0, 0, 0.30) inset;
          padding: 18px 18px 16px;
        }
        #nr-preloader-logo {
          display: block;
          height: 108px;
          width: auto;
          max-width: 100%;
          margin: 2px auto 22px;
          filter: drop-shadow(0 6px 18px rgba(0, 0, 0, 0.35));
          image-rendering: -webkit-optimize-contrast;
        }
        #nr-preloader-title {
          font-size: 16px;
          font-weight: 600;
          letter-spacing: 0.2px;
          margin: 0 0 14px;
          text-shadow: 0 1px 0 rgba(0, 0, 0, 0.45);
        }
        #nr-preloader-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        #nr-preloader-bar {
          flex: 1;
          height: 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.10);
          box-shadow:
            0 0 0 1px rgba(0, 0, 0, 0.35) inset,
            0 4px 16px rgba(0, 0, 0, 0.30);
          overflow: hidden;
        }
        #nr-preloader-bar-fill {
          height: 100%;
          width: 0%;
          background: linear-gradient(90deg, #f97316 0%, #a855f7 48%, #22d3ee 100%);
          border-radius: 999px;
          box-shadow:
            0 0 18px rgba(249, 115, 22, 0.28),
            0 0 22px rgba(168, 85, 247, 0.20),
            0 0 22px rgba(34, 211, 238, 0.14);
          transition: width 120ms ease-out;
        }
        #nr-preloader-pct {
          width: 44px;
          text-align: right;
          font-size: 12px;
          font-variant-numeric: tabular-nums;
          color: rgba(229, 231, 235, 0.78);
        }
        #nr-preloader-status {
          margin-top: 10px;
          font-size: 12px;
          line-height: 1.35;
          color: rgba(229, 231, 235, 0.70);
          min-height: 16px;
          word-break: break-word;
        }
        #nr-preloader.nr-preloader--hide {
          opacity: 0;
          pointer-events: none;
          transform: translateY(2px);
          transition: opacity 220ms ease-out, transform 220ms ease-out;
        }
      `.trim();
      d.head.appendChild(style);
    }

    // Elements (reused across HMR)
    this.overlayEl = d.getElementById('nr-preloader');
    if (!this.overlayEl) {
      const overlay = d.createElement('div');
      overlay.id = 'nr-preloader';
      overlay.setAttribute('role', 'status');
      overlay.setAttribute('aria-live', 'polite');
      overlay.setAttribute('aria-label', 'Loading');

      const card = d.createElement('div');
      card.id = 'nr-preloader-card';

      const logo = d.createElement('img');
      logo.id = 'nr-preloader-logo';
      logo.src = '/assets/img/nr_logo.png';
      logo.alt = 'Neural Racer';
      logo.draggable = false;
      logo.decoding = 'async';

      const title = d.createElement('div');
      title.id = 'nr-preloader-title';
      title.textContent = 'Loading Neural Racer';

      const row = d.createElement('div');
      row.id = 'nr-preloader-row';

      const bar = d.createElement('div');
      bar.id = 'nr-preloader-bar';
      const fill = d.createElement('div');
      fill.id = 'nr-preloader-bar-fill';
      bar.appendChild(fill);

      const pct = d.createElement('div');
      pct.id = 'nr-preloader-pct';
      pct.textContent = '0%';

      const status = d.createElement('div');
      status.id = 'nr-preloader-status';
      status.textContent = '';

      row.appendChild(bar);
      row.appendChild(pct);
      card.appendChild(logo);
      card.appendChild(title);
      card.appendChild(row);
      card.appendChild(status);
      overlay.appendChild(card);

      (d.body || d.documentElement).appendChild(overlay);
      this.overlayEl = overlay;
    }

    // HMR-safe: add logo if overlay/card were preserved from a previous version.
    const cardEl = d.getElementById('nr-preloader-card');
    const titleEl = d.getElementById('nr-preloader-title');
    if (cardEl && titleEl && !d.getElementById('nr-preloader-logo')) {
      const logo = d.createElement('img');
      logo.id = 'nr-preloader-logo';
      logo.src = '/img/nr_logo.png';
      logo.alt = 'Neural Racer';
      logo.draggable = false;
      logo.decoding = 'async';
      cardEl.insertBefore(logo, titleEl);
    }

    this.progressBarFillEl = d.getElementById('nr-preloader-bar-fill');
    this.progressPctEl = d.getElementById('nr-preloader-pct');
    this.statusEl = d.getElementById('nr-preloader-status');
  }

  show() {
    this.ensureDom();
    this.overlayEl.classList.remove('nr-preloader--hide');
    this.overlayEl.style.display = 'flex';
  }

  hide({ remove = true } = {}) {
    this.ensureDom();
    this.overlayEl.classList.add('nr-preloader--hide');
    const overlay = this.overlayEl;

    const finalize = () => {
      if (!overlay) return;
      if (remove) {
        overlay.remove();
      } else {
        overlay.style.display = 'none';
      }
    };

    // Allow transition to run; also guard if transition doesn't fire.
    setTimeout(finalize, 260);
  }

  setProgress(progressPercent, statusText = '') {
    this.ensureDom();

    const pct = Math.max(0, Math.min(100, Math.round(progressPercent)));
    if (this.progressBarFillEl) this.progressBarFillEl.style.width = `${pct}%`;
    if (this.progressPctEl) this.progressPctEl.textContent = `${pct}%`;
    if (this.statusEl) this.statusEl.textContent = statusText || '';
  }
}

export default PreloaderView;
