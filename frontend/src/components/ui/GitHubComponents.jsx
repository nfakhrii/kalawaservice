import React from 'react';
import { NavLink } from 'react-router-dom';
import { X, AlertCircle, CheckCircle2, Inbox } from 'lucide-react';
import { WO_STATUS_STYLES } from '../../utils/formatters';

/**
 * Semantic Status Badge untuk Work Order (Sesuai Bagian 3.4 Spesifikasi)
 */
export function WoStatusBadge({ status }) {
  const key = String(status || 'antre').toLowerCase();
  const cls = WO_STATUS_STYLES[key] || WO_STATUS_STYLES.antre;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
      {key}
    </span>
  );
}

/**
 * Semantic Status Badge untuk Stok Suku Cadang
 */
export function StockStatusBadge({ stokSaatIni, stokMinimum }) {
  const cur = Number(stokSaatIni || 0);
  const min = Number(stokMinimum || 0);

  if (cur === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-300">
        Habis (0)
      </span>
    );
  }
  if (cur <= min) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300">
        Stok Kritis (&le; {min})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-300">
      Aman
    </span>
  );
}

/**
 * Badge Tipe Pelanggan (INDIVIDU / KORPORAT)
 */
export function CustomerTypeBadge({ tipe }) {
  const isCorp = String(tipe || '').toUpperCase() === 'KORPORAT';
  return isCorp ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-300">
      B2B KORPORAT
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-[#d0d7de]">
      B2C INDIVIDU
    </span>
  );
}

/**
 * Underline Navigation Tabs khas repositori GitHub (Bagian 3.3 Spesifikasi)
 */
export function GitHubUnderlineTabs({ tabs }) {
  return (
    <div className="border-b border-[#d0d7de] bg-white px-4">
      <nav className="flex items-center gap-1 overflow-x-auto -mb-px" aria-label="Subnavigation">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 px-3.5 py-2.5 text-sm transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-b-2 border-[#fd8c73] font-semibold text-[#1f2328]'
                    : 'border-b-2 border-transparent text-[#656d76] hover:text-[#1f2328] hover:border-[#d0d7de]'
                }`
              }
            >
              {Icon && <Icon className="w-4 h-4 text-[#656d76]" />}
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count !== null && (
                <span className="bg-slate-200/80 text-slate-700 rounded-full px-2 py-0.5 text-xs font-mono">
                  {tab.count}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

/**
 * Modal Dialog bergaya GitHub Primer
 */
export function ModalDialog({ isOpen, onClose, title, subtitle, children, maxWidth = 'max-w-xl' }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px] p-4 overflow-y-auto">
      <div
        className={`w-full ${maxWidth} bg-white border border-[#d0d7de] rounded-md shadow-xl overflow-hidden my-8`}
      >
        <div className="flex items-center justify-between px-4 py-3 bg-[#f6f8fa] border-b border-[#d0d7de]">
          <div>
            <h3 className="text-sm font-semibold text-[#1f2328]">{title}</h3>
            {subtitle && <p className="text-xs text-[#656d76] mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[#656d76] hover:text-[#1f2328] hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/**
 * Komponen Empty State (GitHub Blankslate)
 */
export function EmptyState({ title, description, action, icon: CustomIcon }) {
  const Icon = CustomIcon || Inbox;
  return (
    <div className="py-12 px-6 text-center bg-white">
      <div className="w-10 h-10 rounded-full bg-[#f6f8fa] border border-[#d0d7de] flex items-center justify-center mx-auto mb-3 text-[#656d76]">
        <Icon className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-semibold text-[#1f2328]">{title}</h4>
      {description && (
        <p className="text-xs text-[#656d76] max-w-md mx-auto mt-1 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/**
 * Alert Banner untuk umpan balik aksi atau error
 */
export function AlertBanner({ type = 'error', title, message, code, onClose }) {
  if (!message && !title) return null;
  const styles =
    type === 'success'
      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
      : type === 'warning'
      ? 'bg-amber-50 border-amber-300 text-amber-800'
      : 'bg-red-50 border-red-300 text-red-800';

  const Icon = type === 'success' ? CheckCircle2 : AlertCircle;

  return (
    <div className={`flex items-start justify-between gap-3 px-4 py-3 rounded-md border text-xs ${styles}`}>
      <div className="flex items-start gap-2.5">
        <Icon className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          {title && (
            <div className="font-semibold flex items-center gap-2">
              <span>{title}</span>
              {code && <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-black/5">{code}</span>}
            </div>
          )}
          {message && <p className={title ? 'mt-0.5' : ''}>{message}</p>}
        </div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-0.5 rounded hover:bg-black/5 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}


/**
 * Popup feedback untuk pesan error atau sukses.
 */
export function FeedbackModal({
  isOpen,
  type = 'error',
  title,
  message,
  onClose,
}) {
  if (!isOpen) return null;

  const isSuccess = type === 'success';

  const styles = isSuccess
    ? {
        icon: 'text-emerald-600 bg-emerald-50',
        button: 'bg-[#1f883d] hover:bg-[#1a7f37]',
      }
    : {
        icon: 'text-red-600 bg-red-50',
        button: 'bg-red-600 hover:bg-red-700',
      };

  const Icon = isSuccess ? CheckCircle2 : AlertCircle;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4"
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        aria-describedby="feedback-modal-message"
        className="w-full max-w-md rounded-lg border border-[#d0d7de] bg-white shadow-2xl"
      >
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${styles.icon}`}
            >
              <Icon className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <h2
                id="feedback-modal-title"
                className="text-base font-semibold text-[#1f2328]"
              >
                {title || (isSuccess ? 'Berhasil' : 'Terjadi Kesalahan')}
              </h2>

              <p
                id="feedback-modal-message"
                className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-[#656d76]"
              >
                {message || 'Silakan coba kembali.'}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup popup"
              className="rounded-md p-1 text-[#656d76] hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className={`rounded-md px-4 py-2 text-sm font-semibold text-white ${styles.button}`}
            >
              Mengerti
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
