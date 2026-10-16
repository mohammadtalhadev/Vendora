import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HandoverVerificationModal } from './HandoverVerificationModal';

const baseProps = {
  isOpen: true,
  customerName: 'Alex Buyer',
  addressLine: '18 Harbour Road',
  onVerify: vi.fn(async () => {}),
};

describe('HandoverVerificationModal photo proof step', () => {
  it('closes on success when no proof handler is wired (the original flow)', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <HandoverVerificationModal {...baseProps} onClose={onClose} submitting={false} />,
    );
    rerender(<HandoverVerificationModal {...baseProps} onClose={onClose} submitting />);
    rerender(<HandoverVerificationModal {...baseProps} onClose={onClose} submitting={false} />);
    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByTestId('proof-step')).not.toBeInTheDocument();
  });

  it('moves to the photo step after a successful code check and attaches a photo', async () => {
    const onClose = vi.fn();
    const onAttachProof = vi.fn(async () => {});
    const props = { ...baseProps, onClose, onAttachProof };
    const { rerender } = render(<HandoverVerificationModal {...props} submitting={false} />);
    rerender(<HandoverVerificationModal {...props} submitting />);
    rerender(<HandoverVerificationModal {...props} submitting={false} />);

    expect(onClose).not.toHaveBeenCalled();
    expect(await screen.findByTestId('proof-step')).toBeInTheDocument();
    expect(screen.getByText(/add photo proof \(recommended\)/i)).toBeInTheDocument();

    const file = new File(['jpeg-bytes'], 'door.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByTestId('proof-file-input'), { target: { files: [file] } });

    await waitFor(() => expect(onAttachProof).toHaveBeenCalledWith(file));
    expect(await screen.findByTestId('proof-attached')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /done/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('surfaces an upload failure and leaves the delivery complete regardless', async () => {
    const onAttachProof = vi.fn(async () => {
      throw new Error('Could not upload the photo: bucket denied');
    });
    const props = { ...baseProps, onClose: vi.fn(), onAttachProof };
    const { rerender } = render(<HandoverVerificationModal {...props} submitting={false} />);
    rerender(<HandoverVerificationModal {...props} submitting />);
    rerender(<HandoverVerificationModal {...props} submitting={false} />);

    const file = new File(['jpeg-bytes'], 'door.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByTestId('proof-file-input'), { target: { files: [file] } });

    expect(await screen.findByTestId('proof-error')).toHaveTextContent(/could not upload the photo/i);
    // The handover itself already succeeded - the step still offers its Done button.
    expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
  });
});
