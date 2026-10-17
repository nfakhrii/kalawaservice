import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSpreadsheet, CheckCircle2, Plus } from 'lucide-react';
import { api } from '../../services/api';
import { formatRupiah, formatDate, formatDateTime } from '../../utils/formatters';
import { WoStatusBadge, AlertBanner, EmptyState } from '../../components/ui/GitHubComponents';

export default function CollectiveBillingPage() {
  const [invoices, setInvoices] = useState([]);
  const [eligibleWos, setEligibleWos] = useState([]);
  const [selectedCorpId, setSelectedCorpId] = useState('');
  const [alert, setAlert] = useState(null);

  const loadData = async () => {
    try {
      const res = await api.getCollectiveBillings();
      const inv = res.data?.invoices || [];
      const elig = res.data?.eligibleWorkOrders || [];
      setInvoices(inv);
      setEligibleWos(elig);

      if (elig.length > 0 && !selectedCorpId) {
        setSelectedCorpId(elig[0].pelanggan_id);
      }
    } catch (err) {
      setAlert({ type: 'error', title: 'Gagal memuat tagihan kolektif', message: err.message });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateInvoice = async (e) => {
    e.preventDefault();
    if (!selectedCorpId) return;
    setAlert(null);
    try {
      const res = await api.createCollectiveInvoice({
        pelanggan_id: selectedCorpId,
        periode_bulan: 3,
        periode_tahun: 2026,
      });
      await loadData();
      setAlert({
        type: 'success',
        title: `Tagihan Kolektif Diterbitkan (${res.data.nomor_invoice})`,
        message: 'Seluruh Work Order korporat terkait telah dikonsolidasikan ke dalam invoice bulanan.',
      });
    } catch (err) {
      setAlert({
        type: 'error',
        title: `Gagal Menerbitkan Invoice (${err.status || 400})`,
        code: err.code,
        message: err.message,
      });
    }
  };

  const handleSettleInvoice = async (inv) => {
    setAlert(null);
    try {
      const res = await api.settleCollectiveInvoice(inv.id, {
        metode_pelunasan: 'TRANSFER_KORPORAT_VA',
        referensi_pembayaran: `B2B-SETTLE-${inv.nomor_invoice}`,
      });
      await loadData();
      setAlert({
        type: 'success',
        title: `Invoice Kolektif ${inv.nomor_invoice} Lunas!`,
        message: `Stored Procedure sp_lunasi_tagihan_kolektif memulihkan Sisa Plafon menjadi ${formatRupiah(
          res.data.sisa_plafon_baru
        )}.`,
      });
    } catch (err) {
      setAlert({
        type: 'error',
        title: `Pelunasan Ditolak (${err.status || 400})`,
        code: err.code,
        message: err.message,
      });
    }
  };

  // Daftar perusahaan unik yang memiliki WO belum ditagihkan
  const uniqueCorpsWithUnbilled = Array.from(
    new Map(eligibleWos.map((w) => [w.pelanggan_id, w])).values()
  );

  return (
    <div className="space-y-5">
      {alert && (
        <AlertBanner
          type={alert.type}
          title={alert.title}
          code={alert.code}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Top Generator Box: Konsolidasi Work Order Korporat Belum Ditagihkan */}
      <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
        <div className="p-3 bg-[#f6f8fa] border-b border-[#d0d7de] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[#1f2328]">
              Work Order Armada Korporat Siap Konsolidasi Invoice ({eligibleWos.length} WO)
            </h2>
            <p className="text-xs text-[#656d76]">
              Gabungkan beberapa Work Order selesai milik satu perusahaan menjadi satu Tagihan Kolektif akhir bulan.
            </p>
          </div>

          {uniqueCorpsWithUnbilled.length > 0 && (
            <form onSubmit={handleGenerateInvoice} className="flex items-center gap-2 text-xs">
              <select
                value={selectedCorpId}
                onChange={(e) => setSelectedCorpId(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-[#d0d7de] rounded-md"
              >
                {uniqueCorpsWithUnbilled.map((c) => (
                  <option key={c.pelanggan_id} value={c.pelanggan_id}>
                    {c.nama_perusahaan} ({c.kode_pelanggan})
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold bg-[#1f883d] hover:bg-[#1a7f37] text-white cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Terbitkan Tagihan Kolektif</span>
              </button>
            </form>
          )}
        </div>

        {eligibleWos.length === 0 ? (
          <div className="p-4 text-xs text-[#656d76]">
            Seluruh Work Order korporat yang berstatus selesai/dibayar saat ini sudah masuk ke dalam daftar Tagihan Kolektif di bawah.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#d0d7de] bg-[#f6f8fa] text-[11px] font-semibold text-[#656d76] uppercase">
                  <th className="py-2 px-3">Nomor WO</th>
                  <th className="py-2 px-3">Perusahaan Korporat</th>
                  <th className="py-2 px-3">Plat &amp; Kendaraan</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Total Tagihan WO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d0d7de] text-xs">
                {eligibleWos.map((w) => (
                  <tr key={w.id}>
                    <td className="py-2 px-3 font-mono font-semibold text-[#0969da]">
                      <Link to={`/app/operations/work-orders/${w.nomor_wo}`} className="hover:underline">
                        {w.nomor_wo}
                      </Link>
                    </td>
                    <td className="py-2 px-3 font-semibold text-[#1f2328]">{w.nama_perusahaan}</td>
                    <td className="py-2 px-3">
                      <span className="font-mono font-semibold mr-2">{w.plat_nomor}</span>
                      <span className="text-[#656d76]">{w.kendaraan}</span>
                    </td>
                    <td className="py-2 px-3">
                      <WoStatusBadge status={w.status} />
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold tabular-nums">
                      {formatRupiah(w.total_tagihan)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Daftar Invoice Tagihan Kolektif Akhir Bulan (`tagihan_kolektif` & `tagihan_kolektif_detail`) */}
      <div className="space-y-4">
        {invoices.length === 0 ? (
          <EmptyState title="Belum ada Tagihan Kolektif diterbitkan" />
        ) : (
          invoices.map((inv) => {
            const isPaid = inv.status_tagihan === 'LUNAS';
            return (
              <div
                key={inv.id}
                className="bg-white border border-[#d0d7de] rounded-md overflow-hidden"
              >
                <div className="px-4 py-3 bg-[#f6f8fa] border-b border-[#d0d7de] flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center flex-wrap gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-[#0969da]" />
                      <span className="font-mono text-sm font-bold text-[#1f2328]">
                        {inv.nomor_invoice}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-mono font-semibold border ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        {inv.status_tagihan}
                      </span>
                    </div>
                    <div className="text-xs text-[#656d76] mt-1">
                      Perusahaan: <strong className="text-[#1f2328]">{inv.nama_perusahaan}</strong>{' '}
                      &middot; Kontrak: <span className="font-mono">{inv.nomor_kontrak || '-'}</span>{' '}
                      &middot; Jatuh Tempo: <span className="font-mono">{formatDate(inv.tanggal_jatuh_tempo)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[11px] text-[#656d76]">
                        Total Kolektif ({inv.total_wo} Work Order)
                      </div>
                      <div className="font-mono text-base font-bold text-[#1f2328] tabular-nums">
                        {formatRupiah(inv.total_tagihan)}
                      </div>
                    </div>

                    {!isPaid ? (
                      <button
                        type="button"
                        onClick={() => handleSettleInvoice(inv)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#1f883d] hover:bg-[#1a7f37] text-white cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm Collective Payment</span>
                      </button>
                    ) : (
                      <div className="text-right font-mono text-[11px] text-emerald-700">
                        <div>Lunas: {formatDateTime(inv.tanggal_lunas)}</div>
                        <div>Ref: {inv.referensi_pembayaran}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rincian Work Order di dalam Tagihan Kolektif (`tagihan_kolektif_detail`) */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#d0d7de] bg-white text-[11px] font-semibold text-[#656d76] uppercase">
                        <th className="py-2 px-4">Nomor WO</th>
                        <th className="py-2 px-4">Plat &amp; Unit Armada</th>
                        <th className="py-2 px-4">Keluhan Servis</th>
                        <th className="py-2 px-4 text-right">Biaya Jasa</th>
                        <th className="py-2 px-4 text-right">Biaya Part</th>
                        <th className="py-2 px-4 text-right">Diskon</th>
                        <th className="py-2 px-4 text-right">Nominal Ditagihkan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#d0d7de] text-xs">
                      {(inv.details || []).map((det) => (
                        <tr key={det.id} className="hover:bg-[#f6f8fa]/60">
                          <td className="py-2 px-4 font-mono font-semibold text-[#0969da]">
                            <Link
                              to={`/app/operations/work-orders/${det.nomor_wo}`}
                              className="hover:underline"
                            >
                              {det.nomor_wo}
                            </Link>
                          </td>
                          <td className="py-2 px-4">
                            <span className="font-mono font-semibold mr-2">{det.plat_nomor}</span>
                            <span className="text-[#656d76]">{det.kendaraan}</span>
                          </td>
                          <td className="py-2 px-4 text-[#656d76] max-w-md truncate">
                            {det.keluhan}
                          </td>
                          <td className="py-2 px-4 text-right font-mono tabular-nums">
                            {formatRupiah(det.total_biaya_jasa)}
                          </td>
                          <td className="py-2 px-4 text-right font-mono tabular-nums">
                            {formatRupiah(det.total_biaya_part)}
                          </td>
                          <td className="py-2 px-4 text-right font-mono text-emerald-700 tabular-nums">
                            - {formatRupiah(det.diskon)}
                          </td>
                          <td className="py-2 px-4 text-right font-mono font-semibold tabular-nums">
                            {formatRupiah(det.nominal_wo)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

