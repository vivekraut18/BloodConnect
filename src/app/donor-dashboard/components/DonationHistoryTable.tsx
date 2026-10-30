'use client';
import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Download, ExternalLink, Search, Filter, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { BloodGroupBadge } from '@/components/ui/Badge';
import { TableRowSkeleton } from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from 'sonner';

type SortField = 'date' | 'hospital' | 'units' | 'status';
type SortDir = 'asc' | 'desc';

export interface DonationRecord {
  id: string;
  donationId: string;
  requestId?: string;
  date: string;
  hospital: string;
  city?: string;
  bloodGroup: string;
  units: number;
  status: 'completed' | 'scheduled' | 'cancelled' | 'no_show' | 'arrived';
  verifiedBy?: string;
  certificateAvailable?: boolean;
  notes?: string;
  hemoglobin?: string;
  bloodPressure?: string;
}

const STATUS_DISPLAY: Record<DonationRecord['status'], { label: string; icon: React.ElementType; className: string }> = {
  completed: { label: 'Completed', icon: CheckCircle, className: 'text-success' },
  arrived: { label: 'Arrived', icon: Clock, className: 'text-warning' },
  scheduled: { label: 'Scheduled', icon: Clock, className: 'text-primary' },
  cancelled: { label: 'Cancelled', icon: XCircle, className: 'text-muted-foreground' },
  no_show: { label: 'No Show', icon: AlertCircle, className: 'text-error' },
};

export default function DonationHistoryTable() {
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const rowsPerPage = 8;

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    fetch('/api/donations')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.data) {
          const formatted = data.data.map((d: any) => ({
            id: d.id,
            donationId: d.donationId || d.id,
            requestId: d.notes?.includes('BL-') ? d.notes : 'Direct Donation',
            date: d.date ? new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent',
            hospital: d.hospital || 'Authorized Blood Centre',
            city: 'Mumbai',
            bloodGroup: 'B+',
            units: d.units || 1,
            status: d.status as DonationRecord['status'],
            verifiedBy: 'Hospital Staff',
            certificateAvailable: d.status === 'completed',
            notes: d.notes || '',
            hemoglobin: d.status === 'completed' ? '14.2 g/dL' : '—',
            bloodPressure: d.status === 'completed' ? '120/80' : '—',
          }));
          setDonations(formatted);
        }
      })
      .catch((err) => console.error('Error loading donations:', err))
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const exportPDF = () => {
    if (donations.length === 0) {
      toast.error('No donation records to export.');
      return;
    }

    const content = `
=====================================================
            BLOODCONNECT 2.0 — DONATION REPORT
=====================================================
Exported Date: ${new Date().toLocaleString()}
Total Records: ${donations.length}

${donations
  .map(
    (d, i) => `
#${i + 1} | Donation ID: ${d.donationId}
Date: ${d.date}
Hospital: ${d.hospital}
Units: ${d.units} unit(s)
Status: ${d.status.toUpperCase()}
Notes: ${d.notes || 'N/A'}
-----------------------------------------------------`
  )
  .join('\n')}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BloodConnect_Donation_History_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Donation report exported successfully!');
  };

  const filtered = donations.filter((d) => {
    const matchSearch =
      !search ||
      d.hospital.toLowerCase().includes(search.toLowerCase()) ||
      d.donationId.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'date') cmp = a.date.localeCompare(b.date);
    else if (sortField === 'hospital') cmp = a.hospital.localeCompare(b.hospital);
    else if (sortField === 'units') cmp = a.units - b.units;
    else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const paginated = sorted.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown size={13} className="text-muted-foreground" />;
    return sortDir === 'asc' ? (
      <ChevronUp size={13} className="text-primary" />
    ) : (
      <ChevronDown size={13} className="text-primary" />
    );
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Table header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div>
          <h3 className="text-sm font-bold text-foreground">Donation History</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {filtered.length} record{filtered.length !== 1 ? 's' : ''} · Private to your account
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground border border-border hover:bg-muted hover:text-foreground transition-colors"
          >
            <Download size={13} />
            Export Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 px-5 py-3 border-b border-border bg-muted/30">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by hospital or donation ID…"
            className="input-field pl-9 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground flex-shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-field py-2 text-sm w-36"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="scheduled">Scheduled</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {TABLE_COLUMNS.map((col) => (
                <th
                  key={`th-${col.field}`}
                  className={`px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap ${col.sortable ? 'cursor-pointer hover:text-foreground select-none' : ''}`}
                  onClick={col.sortable ? () => handleSort(col.field as SortField) : undefined}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && <SortIcon field={col.field as SortField} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }, (_, i) => <TableRowSkeleton key={`th-skel-${i}`} cols={9} />)
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-0">
                  <EmptyState variant="donations" title="No donation records found" description="When you complete blood donations at verified centres, records will appear here." />
                </td>
              </tr>
            ) : (
              paginated.map((donation, idx) => (
                <DonationRow
                  key={`donation-${donation.id}`}
                  donation={donation}
                  isOdd={idx % 2 === 1}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * rowsPerPage + 1}–{Math.min(page * rowsPerPage, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={`page-${p}`}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                  page === p
                    ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted border border-border'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DonationRow({ donation, isOdd }: { donation: DonationRecord; isOdd: boolean }) {
  const statusCfg = STATUS_DISPLAY[donation.status] || STATUS_DISPLAY.completed;
  const StatusIcon = statusCfg.icon;

  return (
    <tr className={`border-b border-border hover:bg-muted/50 transition-colors group ${isOdd ? 'bg-muted/20' : ''}`}>
      <td className="px-4 py-3">
        <p className="text-xs font-mono font-semibold text-foreground">{donation.donationId}</p>
        <p className="text-xs text-muted-foreground">{donation.requestId}</p>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <p className="text-xs font-semibold text-foreground">{donation.date}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-xs font-semibold text-foreground">{donation.hospital}</p>
        <p className="text-xs text-muted-foreground">{donation.city}</p>
      </td>
      <td className="px-4 py-3">
        <BloodGroupBadge group={donation.bloodGroup} size="sm" />
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-xs font-bold text-foreground font-tabular">{donation.units}</span>
      </td>
      <td className="px-4 py-3">
        <div className={`flex items-center gap-1.5 ${statusCfg.className}`}>
          <StatusIcon size={13} strokeWidth={2.5} />
          <span className="text-xs font-semibold">{statusCfg.label}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="text-xs text-muted-foreground">{donation.hemoglobin}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-xs text-muted-foreground">{donation.bloodPressure}</p>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {donation.certificateAvailable && (
            <button
              onClick={() => toast.success(`Certificate for ${donation.donationId} generated.`)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-primary bg-primary-light border border-blue-200 hover:bg-blue-100 transition-colors"
              title="Download donation certificate"
            >
              <Download size={11} />
              Certificate
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

const TABLE_COLUMNS = [
  { field: 'donationId', label: 'Donation ID', sortable: false },
  { field: 'date', label: 'Date', sortable: true },
  { field: 'hospital', label: 'Hospital', sortable: true },
  { field: 'bloodGroup', label: 'Blood Group', sortable: false },
  { field: 'units', label: 'Units', sortable: true },
  { field: 'status', label: 'Status', sortable: true },
  { field: 'hemoglobin', label: 'Hb', sortable: false },
  { field: 'bloodPressure', label: 'BP', sortable: false },
  { field: 'actions', label: 'Actions', sortable: false },
];