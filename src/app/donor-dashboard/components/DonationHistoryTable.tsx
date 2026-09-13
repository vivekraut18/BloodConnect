'use client';
import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Download, ExternalLink, Search, Filter, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { BloodGroupBadge } from '@/components/ui/Badge';
import { TableRowSkeleton } from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from 'sonner';

type SortField = 'date' | 'hospital' | 'units' | 'status';
type SortDir = 'asc' | 'desc';

interface DonationRecord {
  id: string;
  donationId: string;
  requestId: string;
  date: string;
  hospital: string;
  city: string;
  bloodGroup: string;
  units: number;
  status: 'completed' | 'scheduled' | 'cancelled' | 'no_show' | 'arrived';
  verifiedBy: string;
  certificateAvailable: boolean;
  notes: string;
  hemoglobin: string;
  bloodPressure: string;
}

const STATUS_DISPLAY: Record<DonationRecord['status'], { label: string; icon: React.ElementType; className: string }> = {
  completed: { label: 'Completed', icon: CheckCircle, className: 'text-success' },
  arrived: { label: 'Arrived', icon: Clock, className: 'text-warning' },
  scheduled: { label: 'Scheduled', icon: Clock, className: 'text-primary' },
  cancelled: { label: 'Cancelled', icon: XCircle, className: 'text-muted-foreground' },
  no_show: { label: 'No Show', icon: AlertCircle, className: 'text-error' },
};

export default function DonationHistoryTable() {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [isLoading] = useState(false);
  const rowsPerPage = 8;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filtered = MOCK_DONATIONS.filter((d) => {
    const matchSearch =
      !search ||
      d.hospital.toLowerCase().includes(search.toLowerCase()) ||
      d.donationId.toLowerCase().includes(search.toLowerCase()) ||
      d.requestId.toLowerCase().includes(search.toLowerCase());
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
            {filtered.length} record{filtered.length !== 1 ? 's' : ''} · All verified by hospital staff
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toast.success('Donation history exported as PDF.')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground border border-border hover:bg-muted hover:text-foreground transition-colors"
          >
            <Download size={13} />
            Export PDF
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
              Array.from({ length: 5 }, (_, i) => <TableRowSkeleton key={`th-skel-${i}`} cols={9} />)
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-0">
                  <EmptyState variant="donations" />
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
                    ? 'bg-primary text-white' :'text-muted-foreground hover:bg-muted border border-border'
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
  const statusCfg = STATUS_DISPLAY[donation.status];
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
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {donation.certificateAvailable && (
            <button
              onClick={() => toast.success(`Certificate for ${donation.donationId} downloaded.`)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-primary bg-primary-light border border-blue-200 hover:bg-blue-100 transition-colors"
              title="Download donation certificate"
            >
              <Download size={11} />
              Certificate
            </button>
          )}
          <button
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="View full donation details"
          >
            <ExternalLink size={13} />
          </button>
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
  { field: 'hemoglobin', label: 'Hb (g/dL)', sortable: false },
  { field: 'bloodPressure', label: 'BP (mmHg)', sortable: false },
  { field: 'actions', label: 'Actions', sortable: false },
];

// Mock data — BACKEND INTEGRATION: GET /api/donations?donorId=me
const MOCK_DONATIONS: DonationRecord[] = [
  {
    id: 'don-001',
    donationId: 'DON-2026-0014',
    requestId: 'BL-2026-04201',
    date: '10 Sep 2026',
    hospital: 'Hinduja Hospital',
    city: 'Mahim, Mumbai',
    bloodGroup: 'B+',
    units: 1,
    status: 'completed',
    verifiedBy: 'Dr. Kavita Nair',
    certificateAvailable: true,
    notes: 'Donation for post-surgery patient. No complications.',
    hemoglobin: '14.2',
    bloodPressure: '118/76',
  },
  {
    id: 'don-002',
    donationId: 'DON-2026-0011',
    requestId: 'BL-2026-03887',
    date: '14 Jun 2026',
    hospital: 'Apollo Hospital',
    city: 'Andheri East, Mumbai',
    bloodGroup: 'B+',
    units: 1,
    status: 'completed',
    verifiedBy: 'Dr. Suresh Iyer',
    certificateAvailable: true,
    notes: 'Emergency donation for road accident victim.',
    hemoglobin: '13.9',
    bloodPressure: '122/80',
  },
  {
    id: 'don-003',
    donationId: 'DON-2026-0009',
    requestId: 'BL-2026-03540',
    date: '11 Mar 2026',
    hospital: 'Lilavati Hospital',
    city: 'Bandra West, Mumbai',
    bloodGroup: 'B+',
    units: 1,
    status: 'completed',
    verifiedBy: 'Dr. Pradeep Joshi',
    certificateAvailable: true,
    notes: 'Thalassemia patient regular transfusion cycle.',
    hemoglobin: '14.5',
    bloodPressure: '116/74',
  },
  {
    id: 'don-004',
    donationId: 'DON-2025-0031',
    requestId: 'BL-2025-09821',
    date: '28 Nov 2025',
    hospital: 'KEM Hospital',
    city: 'Parel, Mumbai',
    bloodGroup: 'B+',
    units: 1,
    status: 'completed',
    verifiedBy: 'Dr. Anjali Kulkarni',
    certificateAvailable: true,
    notes: 'Voluntary camp donation. No specific request.',
    hemoglobin: '13.7',
    bloodPressure: '120/78',
  },
  {
    id: 'don-005',
    donationId: 'DON-2025-0028',
    requestId: 'BL-2025-08934',
    date: '03 Sep 2025',
    hospital: 'Kokilaben Hospital',
    city: 'Andheri West, Mumbai',
    bloodGroup: 'B+',
    units: 1,
    status: 'completed',
    verifiedBy: 'Dr. Ramesh Patil',
    certificateAvailable: true,
    notes: 'Pre-scheduled donation for elective surgery patient.',
    hemoglobin: '14.8',
    bloodPressure: '114/72',
  },
  {
    id: 'don-006',
    donationId: 'DON-2025-0021',
    requestId: 'BL-2025-07112',
    date: '15 Jun 2025',
    hospital: 'Breach Candy Hospital',
    city: 'Breach Candy, Mumbai',
    bloodGroup: 'B+',
    units: 1,
    status: 'completed',
    verifiedBy: 'Dr. Meena Shah',
    certificateAvailable: true,
    notes: 'Emergency request. Donor arrived within 45 minutes.',
    hemoglobin: '13.5',
    bloodPressure: '124/82',
  },
  {
    id: 'don-007',
    donationId: 'DON-2025-0015',
    requestId: 'BL-2025-05489',
    date: '10 Mar 2025',
    hospital: 'Nanavati Hospital',
    city: 'Vile Parle West, Mumbai',
    bloodGroup: 'B+',
    units: 1,
    status: 'completed',
    verifiedBy: 'Dr. Vinod Sharma',
    certificateAvailable: true,
    notes: 'Oncology patient requiring transfusion during chemotherapy.',
    hemoglobin: '14.1',
    bloodPressure: '119/77',
  },
  {
    id: 'don-008',
    donationId: 'DON-2024-0042',
    requestId: 'BL-2024-11204',
    date: '22 Nov 2024',
    hospital: 'Wockhardt Hospital',
    city: 'Mulund, Mumbai',
    bloodGroup: 'B+',
    units: 1,
    status: 'completed',
    verifiedBy: 'Dr. Sunita Rao',
    certificateAvailable: true,
    notes: 'Scheduled donation for dialysis patient.',
    hemoglobin: '13.8',
    bloodPressure: '117/75',
  },
  {
    id: 'don-009',
    donationId: 'DON-2024-0031',
    requestId: 'BL-2024-08821',
    date: '07 Aug 2024',
    hospital: 'Fortis Hospital',
    city: 'Mulund West, Mumbai',
    bloodGroup: 'B+',
    units: 1,
    status: 'cancelled',
    verifiedBy: '—',
    certificateAvailable: false,
    notes: 'Donor arrived but hemoglobin below threshold (11.8 g/dL). Donation deferred.',
    hemoglobin: '11.8 (deferred)',
    bloodPressure: '126/84',
  },
  {
    id: 'don-010',
    donationId: 'DON-2024-0022',
    requestId: 'BL-2024-06341',
    date: '10 May 2024',
    hospital: 'SL Raheja Hospital',
    city: 'Mahim, Mumbai',
    bloodGroup: 'B+',
    units: 1,
    status: 'completed',
    verifiedBy: 'Dr. Leela Menon',
    certificateAvailable: true,
    notes: 'Blood donation camp. Voluntary walk-in.',
    hemoglobin: '14.3',
    bloodPressure: '118/76',
  },
  {
    id: 'don-011',
    donationId: 'DON-2024-0014',
    requestId: 'BL-2024-04102',
    date: '14 Feb 2024',
    hospital: 'Jaslok Hospital',
    city: 'Pedder Road, Mumbai',
    bloodGroup: 'B+',
    units: 1,
    status: 'completed',
    verifiedBy: 'Dr. Arun Desai',
    certificateAvailable: true,
    notes: 'Emergency for gynaecology patient. Night donation.',
    hemoglobin: '14.0',
    bloodPressure: '121/79',
  },
  {
    id: 'don-012',
    donationId: 'DON-2026-0013',
    requestId: 'BL-2026-04490',
    date: '18 Sep 2026',
    hospital: 'Apollo Hospital',
    city: 'Andheri East, Mumbai',
    bloodGroup: 'B+',
    units: 1,
    status: 'scheduled',
    verifiedBy: 'Pending',
    certificateAvailable: false,
    notes: 'Upcoming scheduled appointment. Confirmed by hospital.',
    hemoglobin: '—',
    bloodPressure: '—',
  },
];