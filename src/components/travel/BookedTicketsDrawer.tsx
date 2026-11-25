import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowRight,
  Bus,
  CheckCircle2,
  Plane,
  Ticket,
  TrainFront,
  Trash2,
  X,
} from 'lucide-react';
import type { BookedETicket } from '../../shared/bookingSchema';

interface BookedTicketsDrawerProps {
  open: boolean;
  tickets: BookedETicket[];
  onClose: () => void;
  onDeleteTicket: (id: string) => void;
}

export function BookedTicketsDrawer({
  open,
  tickets,
  onClose,
  onDeleteTicket,
}: BookedTicketsDrawerProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-slate-900/45 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="My Booked Tickets Drawer"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-[440px] h-full bg-white/95 backdrop-blur-md border-l border-slate-200 text-slate-900 shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-50 via-sky-50 to-amber-50">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">My Booked Tickets</h2>
              <p className="text-[11px] font-mono text-slate-500">
                {tickets.length} confirmed digital boarding {tickets.length === 1 ? 'pass' : 'passes'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close booked tickets drawer"
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-white cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gradient-to-b from-sky-50/30 to-emerald-50/30">
          {tickets.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2">
              <Ticket className="w-8 h-8 text-slate-400 mx-auto" aria-hidden="true" />
              <p className="text-sm font-bold text-slate-800">No booked tickets yet</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Select a destination on the 3D Kerala map, pick your seat inside the 3D Flight,
                IRCTC, or KSRTC cabin, and complete UPI checkout to save digital boarding passes
                here.
              </p>
            </div>
          ) : (
            tickets.map((ticket) => {
              const Icon =
                ticket.channel === 'flight'
                  ? Plane
                  : ticket.channel === 'irctc'
                    ? TrainFront
                    : Bus;
              const iconColor =
                ticket.channel === 'flight'
                  ? 'text-amber-600'
                  : ticket.channel === 'irctc'
                    ? 'text-sky-600'
                    : 'text-emerald-600';

              return (
                <article
                  key={ticket.id}
                  className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${iconColor}`} aria-hidden="true" />
                      <div>
                        <p className="text-xs font-mono font-extrabold text-slate-900">
                          PNR: {ticket.pnr}
                        </p>
                        <p className="text-[10px] font-mono font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                          CONFIRMED · {ticket.classOrTier}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteTicket(ticket.id)}
                      aria-label={`Remove ticket ${ticket.pnr}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <span className="truncate text-emerald-700">{ticket.from}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                    <span className="truncate text-sky-700">{ticket.to}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-dashed border-slate-200">
                    <div className="space-y-0.5 text-[11px] text-slate-600">
                      <p className="font-semibold text-slate-800">
                        {ticket.passengerName} ({ticket.passengerAge}y) · {ticket.passengerCount}{' '}
                        pax
                      </p>
                      <p className="font-mono font-semibold text-amber-700">
                        {ticket.travelDate} · {ticket.seatAssignment}
                      </p>
                      <p className="font-mono font-bold text-emerald-700">
                        Paid ₹{ticket.paidAmountInr}
                        {ticket.isDemoFare ? ' (₹1 Demo)' : ''}
                        {ticket.utrNumber ? ` · UTR ${ticket.utrNumber}` : ''}
                      </p>
                    </div>
                    <div className="p-1.5 rounded-xl bg-white border border-slate-200 shrink-0">
                      <QRCodeSVG
                        value={`CIVICTRIAGE|PNR:${ticket.pnr}|${ticket.from}->${ticket.to}|${ticket.seatAssignment}|${ticket.travelDate}`}
                        size={56}
                        level="M"
                      />
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
