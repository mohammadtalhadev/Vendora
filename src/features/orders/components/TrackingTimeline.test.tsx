import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrackingTimeline } from './TrackingTimeline';
import type { SubOrder } from '../../../types/domain';

const mockPhysicalSubOrder: SubOrder = {
  id: 'sub-ord-phys-101',
  orderGroupId: 'ord-grp-999',
  sellerId: 'vendor-tech-1',
  sellerName: 'SoundWave Direct',
  sellerType: 'vendor',
  type: 'physical',
  items: [
    {
      id: 'cart-item-1',
      productId: 'prod-vend-2',
      title: 'KeebCraft Pro Mechanical Keyboard',
      price: 159.0,
      quantity: 1,
      maxStock: 10,
      image: 'https://example.com/keyboard.jpg',
      sellerId: 'vendor-tech-1',
      sellerName: 'SoundWave Direct',
      sellerType: 'vendor',
      type: 'physical',
    },
  ],
  subtotal: 159.0,
  shippingFee: 8.5,
  commissionRate: 0.07,
  commissionAmount: 11.13,
  netPayout: 147.87,
  status: 'shipped',
  riderId: 'rider-express-42',
  deliveryCode: '7821',
  history: [
    {
      status: 'placed',
      timestamp: '2026-10-06T08:00:00Z',
      actor: 'Customer',
      note: 'Order confirmed and paid',
    },
    {
      status: 'confirmed',
      timestamp: '2026-10-06T08:30:00Z',
      actor: 'Vendor',
      note: 'Stock allocated in warehouse',
    },
    {
      status: 'packed',
      timestamp: '2026-10-06T09:15:00Z',
      actor: 'Vendor',
      note: 'Package boxed and sealed',
    },
    {
      status: 'ready_for_pickup',
      timestamp: '2026-10-06T09:45:00Z',
      actor: 'Vendor',
      note: 'Waiting at dispatch station',
    },
    {
      status: 'shipped',
      timestamp: '2026-10-06T10:10:00Z',
      actor: 'Rider',
      note: 'Courier scanned parcel at transit hub',
    },
  ],
  createdAt: '2026-10-06T08:00:00Z',
};

const mockDigitalSubOrder: SubOrder = {
  id: 'sub-ord-digi-202',
  orderGroupId: 'ord-grp-999',
  sellerId: 'vendor-design-1',
  sellerName: 'StudioCraft Assets',
  sellerType: 'vendor',
  type: 'digital',
  items: [
    {
      id: 'cart-item-digi',
      productId: 'prod-digi-1',
      title: 'Vendora Glass UI Kit & Figma Tokens',
      price: 59.0,
      quantity: 1,
      maxStock: 9999,
      image: 'https://example.com/uikit.jpg',
      sellerId: 'vendor-design-1',
      sellerName: 'StudioCraft Assets',
      sellerType: 'vendor',
      type: 'digital',
    },
  ],
  subtotal: 59.0,
  shippingFee: 0,
  commissionRate: 0.15,
  commissionAmount: 8.85,
  netPayout: 50.15,
  status: 'available',
  licenseKey: 'VEN-LIC-FIGMA-8842-PRO',
  history: [
    {
      status: 'placed',
      timestamp: '2026-10-06T08:00:00Z',
      actor: 'Customer',
      note: 'Digital order created',
    },
    {
      status: 'paid',
      timestamp: '2026-10-06T08:01:00Z',
      actor: 'System',
      note: 'Payment captured',
    },
    {
      status: 'available',
      timestamp: '2026-10-06T08:02:00Z',
      actor: 'System',
      note: 'License key issued',
    },
  ],
  createdAt: '2026-10-06T08:00:00Z',
};

describe('TrackingTimeline Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Physical Sub-Orders: 7-Stage Stepper', () => {
    it('renders all 7 physical stages in correct order', () => {
      render(<TrackingTimeline subOrder={mockPhysicalSubOrder} />);

      const expectedStages = [
        'stepper-stage-placed',
        'stepper-stage-confirmed',
        'stepper-stage-packed',
        'stepper-stage-ready_for_pickup',
        'stepper-stage-shipped',
        'stepper-stage-out_for_delivery',
        'stepper-stage-delivered',
      ];

      expectedStages.forEach((stageTestId) => {
        const stageEl = screen.getByTestId(stageTestId);
        expect(stageEl).toBeInTheDocument();
      });
    });

    it('highlights the current stage with an active pulse indicator', () => {
      render(<TrackingTimeline subOrder={mockPhysicalSubOrder} />);

      // The status is 'shipped' (5th stage, index 4)
      const pulseIndicator = screen.getByTestId('active-pulse-indicator');
      expect(pulseIndicator).toBeInTheDocument();
      expect(pulseIndicator.className).toContain('animate-ping');

      const shippedStage = screen.getByTestId('stepper-stage-shipped');
      expect(shippedStage).toContainElement(pulseIndicator);
    });

    it('toggles between horizontal and vertical stepper views', () => {
      render(<TrackingTimeline subOrder={mockPhysicalSubOrder} />);

      // Initially horizontal
      expect(screen.getByTestId('horizontal-stepper')).toBeInTheDocument();
      expect(screen.queryByTestId('vertical-stepper')).not.toBeInTheDocument();

      // Click vertical toggle button
      const verticalButton = screen.getByRole('button', { name: /vertical view/i });
      fireEvent.click(verticalButton);

      // Now vertical stepper is visible
      expect(screen.getByTestId('vertical-stepper')).toBeInTheDocument();
      expect(screen.queryByTestId('horizontal-stepper')).not.toBeInTheDocument();
    });

    it('renders rider assignment badge and simulated delivery code', () => {
      render(<TrackingTimeline subOrder={mockPhysicalSubOrder} />);

      // Rider Assignment Card
      const riderCard = screen.getByTestId('rider-assignment-card');
      expect(riderCard).toBeInTheDocument();
      expect(riderCard).toHaveTextContent(/rider-express-42/i);

      // Delivery Code Card with 4 digits
      const deliveryCard = screen.getByTestId('delivery-code-card');
      expect(deliveryCard).toBeInTheDocument();
      expect(screen.getByTestId('delivery-code-digits')).toHaveTextContent('7821');
    });

    it('copies delivery verification code when copy button is clicked', async () => {
      const writeTextMock = vi.fn().mockImplementation(() => Promise.resolve());
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(<TrackingTimeline subOrder={mockPhysicalSubOrder} />);

      const copyButton = screen.getByTestId('copy-delivery-code-button');
      expect(copyButton).toBeInTheDocument();

      fireEvent.click(copyButton);

      expect(writeTextMock).toHaveBeenCalledWith('7821');
      await waitFor(() => {
        expect(screen.getByText('Copied')).toBeInTheDocument();
      });
    });

    it('renders the timestamped event log with actors and notes', () => {
      render(<TrackingTimeline subOrder={mockPhysicalSubOrder} />);

      const eventLog = screen.getByTestId('tracking-event-log');
      expect(eventLog).toBeInTheDocument();

      expect(screen.getByText('Courier scanned parcel at transit hub')).toBeInTheDocument();
      expect(screen.getByText('Stock allocated in warehouse')).toBeInTheDocument();
      expect(screen.getByText('Rider')).toBeInTheDocument();
      expect(screen.getAllByText('Vendor').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Digital Sub-Orders: License Key Card', () => {
    it('renders digital license key card and hides physical stepper', () => {
      render(<TrackingTimeline subOrder={mockDigitalSubOrder} />);

      // Should render digital license card
      const licenseCard = screen.getByTestId('digital-license-card');
      expect(licenseCard).toBeInTheDocument();

      // Should display license key
      const keyEl = screen.getByTestId('license-key-value');
      expect(keyEl).toHaveTextContent('VEN-LIC-FIGMA-8842-PRO');

      // Should NOT render physical stepper
      expect(screen.queryByTestId('horizontal-stepper')).not.toBeInTheDocument();
      expect(screen.queryByTestId('vertical-stepper')).not.toBeInTheDocument();
      expect(screen.queryByTestId('delivery-code-card')).not.toBeInTheDocument();
    });

    it('copies digital license key to clipboard and provides feedback', async () => {
      const writeTextMock = vi.fn().mockImplementation(() => Promise.resolve());
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(<TrackingTimeline subOrder={mockDigitalSubOrder} />);

      const copyKeyButton = screen.getByTestId('copy-key-button');
      expect(copyKeyButton).toBeInTheDocument();
      expect(copyKeyButton).toHaveTextContent('Copy Key');

      fireEvent.click(copyKeyButton);

      expect(writeTextMock).toHaveBeenCalledWith('VEN-LIC-FIGMA-8842-PRO');
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });
  });

  describe('Terminal Statuses', () => {
    it('renders all stages as completed when status is delivered', () => {
      const deliveredSubOrder: SubOrder = {
        ...mockPhysicalSubOrder,
        status: 'delivered',
      };

      render(<TrackingTimeline subOrder={deliveredSubOrder} />);

      const statusBadge = screen.getByTestId('current-status-badge');
      expect(statusBadge).toHaveTextContent('Delivered');
      // No active pulse indicator since delivered is complete
      expect(screen.queryByTestId('active-pulse-indicator')).not.toBeInTheDocument();
    });

    it('renders cancelled notice when subOrder status is cancelled', () => {
      const cancelledSubOrder: SubOrder = {
        ...mockPhysicalSubOrder,
        status: 'cancelled',
        returnReason: 'Customer requested cancellation prior to pickup',
      };

      render(<TrackingTimeline subOrder={cancelledSubOrder} />);

      expect(screen.getByText(/this sub-order was cancelled/i)).toBeInTheDocument();
      expect(
        screen.getByText('Customer requested cancellation prior to pickup'),
      ).toBeInTheDocument();
    });
  });
});
