import React, { useState } from 'react';
import { CheckCircle2, Loader2, MailPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { useAdminActions } from '../hooks/useAdminActions';
import {
  RIDER_VEHICLE_TYPES,
  validateRiderInvite,
  type RiderInviteResult,
} from '../api/logistics';

/**
 * Invite Rider. The desk supplies only who the rider is and
 * how to reach them — the invite itself is sent by the `invite-rider`
 * Edge Function, and the rider sets their own password from the email
 * link. There is deliberately no password field here: a password an
 * admin typed would be a password an admin could share.
 */
export const InviteRiderDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ open, onOpenChange }) => {
  const { inviteRider } = useAdminActions();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState<string>('Motorcycle');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<RiderInviteResult | null>(null);

  const close = (next: boolean) => {
    if (!next) {
      setName('');
      setEmail('');
      setPhone('');
      setVehicle('Motorcycle');
      setError(null);
      setSent(null);
    }
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const input = { email, name, phone, vehicle };
    const refusal = validateRiderInvite(input);
    if (refusal) {
      setError(refusal);
      return;
    }
    try {
      const result = await inviteRider.mutateAsync(input);
      setSent(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'The invite could not be sent.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MailPlus className="h-4 w-4 text-sun-orange" />
            Invite Rider
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            The rider receives an email invite and sets their own password. No password is
            created or shared here.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <div className="text-xs text-emerald-900 space-y-1">
                {sent.alreadyInvited ? (
                  <p>
                    <strong>{email.trim()}</strong> already had an account, so no new invite
                    email was needed — the rider role and fleet row have been applied. They can
                    sign in with their existing password and open the Rider Board.
                  </p>
                ) : (
                  <p>
                    Invite sent to <strong>{email.trim()}</strong>. The rider follows the email
                    link, sets their own password, and lands in the Rider Board. Their fleet
                    status starts as <strong>Offline</strong> until they mark themselves
                    available.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => close(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="invite-rider-name" className="text-xs font-bold text-slate-700">
                Full name *
              </label>
              <Input
                id="invite-rider-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ravi Kumar"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="invite-rider-email" className="text-xs font-bold text-slate-700">
                Email address *
              </label>
              <Input
                id="invite-rider-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rider@example.com"
                autoComplete="off"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="invite-rider-phone" className="text-xs font-bold text-slate-700">
                  Phone (optional)
                </label>
                <Input
                  id="invite-rider-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0300 5550143"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="invite-rider-vehicle" className="text-xs font-bold text-slate-700">
                  Vehicle
                </label>
                <Select value={vehicle} onValueChange={setVehicle}>
                  <SelectTrigger id="invite-rider-vehicle" aria-label="Vehicle type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RIDER_VEHICLE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error ? (
              <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {error}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviteRider.isPending}>
                {inviteRider.isPending ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Sending invite…
                  </span>
                ) : (
                  'Send Invite'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
