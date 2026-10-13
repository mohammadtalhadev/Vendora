import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useSmoothScroll } from './components/SmoothScrollProvider';

export function App() {
  const [healthStatus, setHealthStatus] = useState<string>('Testing MSW...');
  const [modalOpen, setModalOpen] = useState(false);
  const { pauseScroll, resumeScroll } = useSmoothScroll();

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealthStatus(`[OK] MSW active: ${data.service} (${data.status})`))
      .catch((err) => setHealthStatus(`[FAIL] MSW error: ${err.message}`));
  }, []);

  const handleOpenChange = (open: boolean) => {
    setModalOpen(open);
    if (open) {
      pauseScroll();
    } else {
      resumeScroll();
    }
  };

  return (
    <div style={{ minHeight: '200vh', padding: '40px', fontFamily: 'sans-serif', background: '#F4F7FB' }}>
      <header style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <h1 style={{ color: '#14213D', margin: '0 0 12px 0' }}>Vendora Pre-Flight Verification</h1>
        <p style={{ color: '#555', lineHeight: '1.6' }}>
          Testing Spike 1 (MSW Interception) and Spike 2 (Lenis Smooth Scroll + Radix Dialog Scroll-Lock Coordination).
        </p>

        <div style={{ marginTop: '20px', padding: '16px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontWeight: 600 }}>
          {healthStatus}
        </div>

        <div style={{ marginTop: '24px' }}>
          <Dialog.Root open={modalOpen} onOpenChange={handleOpenChange}>
            <Dialog.Trigger asChild>
              <button
                style={{
                  background: 'var(--color-sun-orange)',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '9999px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Open Radix Modal (Test Scroll Lock)
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 50 }} />
              <Dialog.Content
                data-lenis-prevent
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: '#fff',
                  padding: '28px',
                  borderRadius: '20px',
                  maxWidth: '500px',
                  width: '90%',
                  maxHeight: '70vh',
                  overflowY: 'auto',
                  zIndex: 51,
                  boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                }}
              >
                <Dialog.Title style={{ margin: '0 0 8px 0', fontSize: '20px' }}>Scroll Lock & Isolation Verified</Dialog.Title>
                <Dialog.Description style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
                  Lenis scroll is paused while this dialog is open, and <code>data-lenis-prevent</code> isolates internal scrolling.
                </Dialog.Description>
                <div style={{ height: '300px', background: '#f8fafc', padding: '16px', borderRadius: '12px', overflowY: 'scroll', border: '1px solid #e2e8f0' }}>
                  <p>Scrollable inner container test:</p>
                  {Array.from({ length: 15 }).map((_, i) => (
                    <p key={i} style={{ color: '#475569', fontSize: '13px' }}>Modal content row #{i + 1} - scrolling is isolated and doesn't leak to background.</p>
                  ))}
                </div>
                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                  <Dialog.Close asChild>
                    <button style={{ padding: '8px 20px', borderRadius: '9999px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>
                      Close Modal
                    </button>
                  </Dialog.Close>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </header>

      <div style={{ maxWidth: '800px', margin: '40px auto', color: '#94a3b8', textAlign: 'center' }}>
        <p>Scroll down to verify Lenis smooth-scrolling behavior</p>
        <div style={{ height: '800px' }} />
        <p>Bottom of page reached smoothly</p>
      </div>
    </div>
  );
}
export default App;
