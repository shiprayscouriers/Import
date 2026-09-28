// Ray's Couriers Device Camera Scanner Component
// Provides instant QR & Barcode scanning via native MediaDevices & BarcodeDetector / ZXing fallback
(function () {
  console.log("[Ray's Couriers] Camera Scanner Integration Active");

  let activeStream = null;
  let scanAnimationId = null;
  let barcodeDetector = null;

  // Initialize BarcodeDetector API if available in browser
  if ('BarcodeDetector' in window) {
    try {
      barcodeDetector = new window.BarcodeDetector({
        formats: [
          'qr_code',
          'code_128',
          'code_39',
          'ean_13',
          'ean_8',
          'upc_a',
          'upc_e',
          'data_matrix'
        ]
      });
      console.log("[Ray's Couriers] Native BarcodeDetector initialized");
    } catch (e) {
      console.warn("Native BarcodeDetector format error, falling back to all formats", e);
      try { barcodeDetector = new window.BarcodeDetector(); } catch(err){}
    }
  }

  // Audio beep for successful scan
  function playScanBeep() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, audioCtx.currentTime); // A6 beep
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch(e) {}
  }

  // Create UI Modal for Camera Scanner
  function openScannerModal(onDetectedCallback, targetInputSelector) {
    // Remove any existing scanner modal
    closeScannerModal();

    const overlay = document.createElement('div');
    overlay.id = 'rays-camera-scanner-modal';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: rgba(10, 15, 25, 0.88);
      backdrop-filter: blur(8px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const card = document.createElement('div');
    card.style.cssText = `
      background: #ffffff;
      width: 100%;
      max-width: 480px;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      border: 1px solid rgba(255, 255, 255, 0.2);
    `;

    card.innerHTML = `
      <div style="background: #1B3A6B; color: #fff; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
              <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
              <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
              <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
              <rect x="7" y="7" width="10" height="10" rx="1"/>
            </svg>
          </div>
          <div>
            <h3 style="margin: 0; font-size: 15px; font-weight: 700; letter-spacing: -0.2px;">Camera QR / Barcode Scanner</h3>
            <p style="margin: 2px 0 0 0; font-size: 11px; opacity: 0.8;">Warehouse Package Rapid Intake</p>
          </div>
        </div>
        <button id="rays-scanner-close-btn" style="background: none; border: none; color: #fff; cursor: pointer; padding: 4px; display: flex;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div style="position: relative; background: #000; width: 100%; aspect-ratio: 4/3; overflow: hidden; display: flex; align-items: center; justify-content: center;">
        <video id="rays-scanner-video" playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>
        
        <!-- Scan target reticle overlay -->
        <div style="position: absolute; width: 230px; height: 230px; border: 2px solid rgba(255, 255, 255, 0.6); border-radius: 16px; pointer-events: none; box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.45); display: flex; align-items: center; justify-content: center;">
          <!-- Laser scanning line -->
          <div id="rays-scanner-laser" style="width: 100%; height: 2px; background: #ef4444; box-shadow: 0 0 8px 2px #ef4444; position: absolute; top: 10%;"></div>
          <!-- Corner brackets -->
          <div style="position: absolute; top: -2px; left: -2px; width: 20px; height: 20px; border-top: 4px solid #38bdf8; border-left: 4px solid #38bdf8; border-top-left-radius: 12px;"></div>
          <div style="position: absolute; top: -2px; right: -2px; width: 20px; height: 20px; border-top: 4px solid #38bdf8; border-right: 4px solid #38bdf8; border-top-right-radius: 12px;"></div>
          <div style="position: absolute; bottom: -2px; left: -2px; width: 20px; height: 20px; border-bottom: 4px solid #38bdf8; border-left: 4px solid #38bdf8; border-bottom-left-radius: 12px;"></div>
          <div style="position: absolute; bottom: -2px; right: -2px; width: 20px; height: 20px; border-bottom: 4px solid #38bdf8; border-right: 4px solid #38bdf8; border-bottom-right-radius: 12px;"></div>
        </div>

        <!-- Camera status / detection banner -->
        <div id="rays-scanner-status" style="position: absolute; bottom: 12px; background: rgba(0, 0, 0, 0.7); color: #fff; padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 6px;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #22c55e; display: inline-block;"></span>
          Aim camera at label QR code or 1D barcode
        </div>
      </div>

      <div style="padding: 16px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; gap: 8px;">
          <input id="rays-scanner-manual-input" type="text" placeholder="Or enter / paste tracking code..." style="flex: 1; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; font-family: monospace;">
          <button id="rays-scanner-manual-submit" style="background: #1B3A6B; color: #fff; border: none; border-radius: 8px; padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer;">Apply</button>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #64748b;">
          <span>Tip: Supports UPS, FedEx, USPS, Amazon & Ray's RC tracking codes</span>
          <button id="rays-scanner-flip-cam" style="background: none; border: 1px solid #cbd5e1; border-radius: 6px; padding: 3px 8px; cursor: pointer; color: #334155; font-size: 11px;">Flip Camera</button>
        </div>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const video = card.querySelector('#rays-scanner-video');
    const laser = card.querySelector('#rays-scanner-laser');
    const statusText = card.querySelector('#rays-scanner-status');
    const closeBtn = card.querySelector('#rays-scanner-close-btn');
    const manualInput = card.querySelector('#rays-scanner-manual-input');
    const manualSubmit = card.querySelector('#rays-scanner-manual-submit');
    const flipCamBtn = card.querySelector('#rays-scanner-flip-cam');

    closeBtn.onclick = closeScannerModal;
    overlay.onclick = (e) => { if (e.target === overlay) closeScannerModal(); };

    // Manual input fallback
    manualSubmit.onclick = () => {
      const val = manualInput.value.trim();
      if (val) {
        handleCodeDetected(val, onDetectedCallback, targetInputSelector);
      }
    };
    manualInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        const val = manualInput.value.trim();
        if (val) handleCodeDetected(val, onDetectedCallback, targetInputSelector);
      }
    };

    // Laser animation
    let laserPos = 10;
    let laserDir = 1;
    function animateLaser() {
      laserPos += laserDir * 1.5;
      if (laserPos >= 85) laserDir = -1;
      if (laserPos <= 10) laserDir = 1;
      if (laser) laser.style.top = laserPos + '%';
      scanAnimationId = requestAnimationFrame(animateLaser);
    }
    animateLaser();

    // Camera access
    let currentFacingMode = 'environment'; // back camera by default for handheld scanning
    function startCamera() {
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
      navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: currentFacingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      }).then(stream => {
        activeStream = stream;
        video.srcObject = stream;
        video.play();
        startScanLoop(video, onDetectedCallback, targetInputSelector);
      }).catch(err => {
        console.warn("Camera access denied or unavailable:", err);
        statusText.innerHTML = `<span style="color:#ef4444;">⚠️ Camera unavailable</span> - Use manual input below`;
      });
    }

    flipCamBtn.onclick = () => {
      currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
      startCamera();
    };

    startCamera();
  }

  // Scan loop detecting barcodes from video frames
  let isScanning = false;
  async function startScanLoop(video, onDetectedCallback, targetInputSelector) {
    if (!video) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const checkFrame = async () => {
      if (!activeStream || video.paused || video.ended) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        // Try native BarcodeDetector if available
        if (barcodeDetector) {
          try {
            const barcodes = await barcodeDetector.detect(video);
            if (barcodes && barcodes.length > 0) {
              const detectedValue = barcodes[0].rawValue;
              if (detectedValue) {
                handleCodeDetected(detectedValue, onDetectedCallback, targetInputSelector);
                return;
              }
            }
          } catch(e) {}
        }
      }

      if (activeStream) {
        requestAnimationFrame(checkFrame);
      }
    };

    requestAnimationFrame(checkFrame);
  }

  function handleCodeDetected(code, onDetectedCallback, targetInputSelector) {
    playScanBeep();
    closeScannerModal();

    // Format code
    const cleanCode = code.trim();

    // If target input selector provided, populate it and trigger React change events
    if (targetInputSelector) {
      const el = document.querySelector(targetInputSelector);
      if (el) {
        el.value = cleanCode;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.focus();
      }
    }

    // Call custom callback if provided
    if (typeof onDetectedCallback === 'function') {
      onDetectedCallback(cleanCode);
    }

    // Show temporary toast notification
    showScanToast(cleanCode);
  }

  function showScanToast(code) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 100000;
      background: #0f172a;
      color: #fff;
      padding: 12px 18px;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
      border-left: 4px solid #22c55e;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
      <div>
        <div style="font-weight: 700; font-size: 13px;">Scanned: ${code}</div>
        <div style="font-size: 11px; color: #94a3b8;">Package detected & applied to form</div>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function closeScannerModal() {
    if (scanAnimationId) {
      cancelAnimationFrame(scanAnimationId);
      scanAnimationId = null;
    }
    if (activeStream) {
      activeStream.getTracks().forEach(t => t.stop());
      activeStream = null;
    }
    const existing = document.getElementById('rays-camera-scanner-modal');
    if (existing) existing.remove();
  }

  // Floating trigger button on scan / warehouse views
  function injectFloatingScanButton() {
    return; // Disabled per user request for physical barcode scanner use
    if (document.getElementById('rays-camera-scan-floating-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'rays-camera-scan-floating-btn';
    btn.title = "Open Camera Barcode / QR Scanner";
    btn.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      background: #1B3A6B;
      color: #ffffff;
      border: 2px solid #38bdf8;
      box-shadow: 0 10px 25px -3px rgba(27, 58, 107, 0.6);
      border-radius: 999px;
      padding: 12px 18px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
        <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
        <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
        <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
        <rect x="7" y="7" width="10" height="10" rx="1"/>
      </svg>
      <span>Scan Barcode / QR</span>
    `;

    btn.onmouseenter = () => { btn.style.transform = 'translateY(-2px) scale(1.02)'; };
    btn.onmouseleave = () => { btn.style.transform = 'translateY(0) scale(1)'; };

    btn.onclick = () => {
      // Find suitable active input on current page (e.g. tracking number, barcode input)
      const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
      const activeInput = inputs.find(i => {
        const ph = (i.placeholder || '').toLowerCase();
        const nm = (i.name || '').toLowerCase();
        const id = (i.id || '').toLowerCase();
        return ph.includes('track') || ph.includes('scan') || ph.includes('barcode') || nm.includes('track') || id.includes('track');
      }) || inputs[0];

      openScannerModal(null, activeInput ? (activeInput.id ? '#' + activeInput.id : 'input[type="text"]') : null);
    };

    document.body.appendChild(btn);
  }

  // Expose API globally
  window.RaysScanner = {
    open: openScannerModal,
    close: closeScannerModal,
    beep: playScanBeep
  };

  // Auto attach to DOM
  if (document.readyState === 'loading') {
    // floating button disabled
  } else {
    // floating button removed per user request: // floating button disabled
  }

  // Also monitor URL changes for single-page routing
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      injectFloatingScanButton();
    }
  }, 1000);
})();
