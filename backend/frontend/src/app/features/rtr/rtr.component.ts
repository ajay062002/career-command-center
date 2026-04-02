import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../environments/environment';

interface RTR {
  id: string;
  role: string;
  clientName: string;
  vendorCompany: string;
  vendorName: string;
  vendorPhone: string;
  vendorEmail: string;
  rate: number;
  location: string;
  status: string;
  date: string;
  jobId?: string;
}

@Component({
  selector: 'app-rtr',
  standalone: true,
  imports: [CommonModule, FormsModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Rights to Represent</h1>
          <p class="page-subtitle">Manage your vendor relationships and role authorizations</p>
        </div>
        <div class="header-actions">
           <span class="count-badge">{{ filteredRtrs.length }} Records</span>
           <button class="btn-primary" (click)="showForm = !showForm">
             {{ showForm ? '✕ Close' : '+ New RTR' }}
           </button>
        </div>
      </div>

      <!-- Add RTR Form -->
      @if (showForm) {
        <div class="form-card highlight">
          <h2 class="form-title">Authorize New Representation</h2>
          <div class="form-grid">
            <div class="field">
              <label>Target Role *</label>
              <input [(ngModel)]="newRtr.role" placeholder="e.g. Senior Java Engineer" />
            </div>
            <div class="field">
              <label>End Client</label>
              <input [(ngModel)]="newRtr.clientName" placeholder="e.g. Bank of America" />
            </div>
            <div class="field">
              <label>Vendor Agency *</label>
              <input [(ngModel)]="newRtr.vendorCompany" placeholder="e.g. Apex Systems" />
            </div>
            <div class="field">
              <label>Contact Name</label>
              <input [(ngModel)]="newRtr.vendorName" placeholder="e.g. John Doe" />
            </div>
            <div class="field">
              <label>Contact Phone</label>
              <input [(ngModel)]="newRtr.vendorPhone" placeholder="e.g. 555-0101" />
            </div>
            <div class="field">
              <label>Contact Email</label>
              <input [(ngModel)]="newRtr.vendorEmail" placeholder="e.g. john@apex.com" />
            </div>
            <div class="field">
              <label>Hourly Rate ($)</label>
              <input [(ngModel)]="newRtr.rate" type="number" placeholder="75" />
            </div>
            <div class="field">
              <label>Location Preference</label>
              <input [(ngModel)]="newRtr.location" placeholder="e.g. Remote / Hybrid" />
            </div>
            <div class="field">
              <label>Current Status</label>
              <select [(ngModel)]="newRtr.status">
                <option value="PENDING">Pending Approval</option>
                <option value="RTR">RTR Signed</option>
                <option value="SUBMITTED">Submitted to Client</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
          <div class="form-footer">
            @if (formError) { <span class="error-msg">{{ formError }}</span> }
            <button class="btn-save" (click)="addRtr()" [disabled]="saving">
              {{ saving ? 'Saving...' : 'Authorize' }}
            </button>
          </div>
        </div>
      }

      <div class="filter-bar">
        <div class="vendor-filters">
           <button class="tag" [class.active]="!activeVendor" (click)="setVendor(null)">All Agencies</button>
           @for (v of vendorFilters; track v) {
             <button class="tag" [class.active]="activeVendor === v" (click)="setVendor(v)">{{ v }}</button>
           }
        </div>
      </div>

      @if (loading) {
        <div class="state-container">
          <mat-spinner diameter="32"></mat-spinner>
          <p>Retrieving authorizations...</p>
        </div>
      } @else if (filteredRtrs.length === 0) {
        <div class="state-container empty">
           <span class="icon">📋</span>
           <p>No active authorizations found. Start by adding a new RTR.</p>
        </div>
      } @else {
        <div class="table-container">
          <table class="premium-table">
            <thead>
              <tr>
                <th>Role & Client</th>
                <th>Agency & Contact</th>
                <th>Rate</th>
                <th>Status</th>
                <th>Date Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (rtr of filteredRtrs; track rtr.id) {
                <tr>
                  <td>
                    <div class="primary-cell">
                      <span class="main-text">{{ rtr.role }}</span>
                      <span class="sub-text">{{ rtr.clientName || 'Direct' }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="vendor-cell">
                      <span class="agency-tag">{{ rtr.vendorCompany }}</span>
                      @if (rtr.vendorName || rtr.vendorEmail || rtr.vendorPhone) {
                        <div class="contact-info">
                          @if (rtr.vendorName) { <span>{{ rtr.vendorName }}</span> }
                          @if (rtr.vendorEmail) { <span class="contact-sub">✉ {{ rtr.vendorEmail }}</span> }
                          @if (rtr.vendorPhone) { <span class="contact-sub">📞 {{ rtr.vendorPhone }}</span> }
                        </div>
                      }
                    </div>
                  </td>
                  <td>
                    <span class="rate-value">{{ rtr.rate ? '$' + rtr.rate + '/hr' : '—' }}</span>
                  </td>
                  <td>
                    <span class="status-badge" [class]="rtr.status.toLowerCase()">{{ rtr.status }}</span>
                  </td>
                  <td class="date-cell">{{ rtr.date | date:'MMM dd, yyyy' }}</td>
                  <td>
                    <div class="action-group">
                      <button class="btn-action primary" (click)="submitRtr(rtr)" title="Submit to Client">Submit →</button>
                      <button class="btn-icon-action" (click)="openEmailDraft(rtr)" title="Draft Email">✉</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 32px; }
    .page-title { font-size: 1.875rem; font-weight: 800; color: #0f172a; margin: 0; }
    .page-subtitle { color: #64748b; font-size: 0.9375rem; margin: 4px 0 0 0; font-weight: 500; }
    
    .count-badge {
      font-size: 0.8125rem; font-weight: 700; color: #6366f1; background: #eef2ff;
      padding: 8px 16px; border-radius: 99px; border: 1px solid #c7d2fe;
    }

    .btn-primary {
      background: #0f172a; color: white; border: none; padding: 10px 20px;
      border-radius: 12px; font-weight: 600; font-size: 0.875rem; cursor: pointer;
      transition: all 0.2s;
    }

    .form-card {
      background: white; border: 1px solid #e2e8f0; border-radius: 24px;
      padding: 32px; margin-bottom: 32px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
    }
    .form-card.highlight { border-top: 4px solid #6366f1; }
    .form-title { font-size: 1.125rem; font-weight: 800; color: #0f172a; margin-bottom: 24px; }

    .form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 24px; }
    .field { display: flex; flex-direction: column; gap: 8px; }
    .field label { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .field input, .field select {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 12px 16px; font-size: 0.9375rem; color: #1e293b; outline: none; transition: all 0.2s;
    }
    .field input:focus, .field select:focus { background: white; border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99,102,241,0.05); }

    .form-footer { display: flex; justify-content: flex-end; align-items: center; gap: 20px; margin-top: 24px; }
    .btn-save {
      background: #6366f1; color: white; border: none; padding: 12px 28px;
      border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;
    }

    .filter-bar { margin-bottom: 24px; }
    .vendor-filters { display: flex; gap: 8px; flex-wrap: wrap; }
    .tag {
      padding: 6px 14px; border-radius: 99px; border: 1px solid #e2e8f0;
      background: white; color: #64748b; font-size: 0.8125rem; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
    }
    .tag:hover { border-color: #6366f1; color: #6366f1; }
    .tag.active { background: #6366f1; border-color: #6366f1; color: white; }

    .state-container {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 100px 0; gap: 20px; color: #64748b; font-weight: 500;
      background: white; border-radius: 24px; border: 1px dashed #e2e8f0;
    }

    .table-container {
      background: white; border: 1px solid #f1f5f9; border-radius: 24px;
      overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }
    .premium-table { width: 100%; border-collapse: collapse; }
    .premium-table th {
      background: #f8fafc; padding: 16px 24px; text-align: left;
      font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;
      letter-spacing: 0.05em; border-bottom: 1px solid #f1f5f9;
    }
    .premium-table td { padding: 16px 24px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .premium-table tr:last-child td { border-bottom: none; }
    
    .primary-cell { display: flex; flex-direction: column; }
    .main-text { font-size: 0.9375rem; font-weight: 700; color: #1e293b; }
    .sub-text { font-size: 0.8125rem; color: #94a3b8; }

    .agency-tag {
      font-size: 0.8125rem; font-weight: 600; color: #2563eb; background: #eff6ff;
      padding: 4px 10px; border-radius: 6px; border: 1px solid #dbeafe;
    }

    .rate-value { font-weight: 700; color: #059669; font-size: 0.9375rem; }

    .status-badge {
      padding: 4px 12px; border-radius: 8px; font-size: 0.75rem; font-weight: 700;
      text-transform: uppercase; background: #f1f5f9; color: #475569;
    }
    .status-badge.rtr { background: #ecfdf5; color: #059669; }
    .status-badge.pending { background: #fffbeb; color: #d97706; }
    .status-badge.submitted { background: #eff6ff; color: #2563eb; }

    .date-cell { font-size: 0.8125rem; color: #64748b; font-weight: 500; }

    .vendor-cell { display: flex; flex-direction: column; gap: 6px; }
    .contact-info { display: flex; flex-direction: column; font-size: 0.75rem; color: #475569; font-weight: 600; }
    .contact-sub { color: #94a3b8; font-family: 'Inter', sans-serif; }

    .btn-action {
      background: #f1f5f9; color: #1e293b; border: none; padding: 8px 16px;
      border-radius: 8px; font-weight: 700; font-size: 0.8125rem; cursor: pointer;
      transition: all 0.2s;
    }
    .btn-action:hover { background: #e2e8f0; color: #0f172a; }

    .action-group { display: flex; gap: 8px; align-items: center; }
    .btn-icon-action {
      background: #eef2ff; color: #6366f1; border: 1px solid #c7d2fe;
      width: 32px; height: 32px; border-radius: 8px; display: flex;
      align-items: center; justify-content: center; cursor: pointer;
      transition: all 0.2s; font-size: 1.1rem;
    }
    .btn-icon-action:hover { background: #6366f1; color: white; transform: translateY(-2px); }
  `]
})
export class RtrComponent implements OnInit {
  rtrs: RTR[] = [];
  filteredRtrs: RTR[] = [];
  vendorFilters: string[] = [];
  activeVendor: string | null = null;
  loading = true;
  showForm = false;
  saving = false;
  formError: string | null = null;

  newRtr: Partial<RTR> = {
    role: '', clientName: '', vendorCompany: '', vendorName: '',
    vendorPhone: '', vendorEmail: '', rate: undefined, location: '', status: 'PENDING',
    date: new Date().toISOString().split('T')[0]
  };

  private api = environment.apiBaseUrl;
  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit() { this.loadRtrs(); }

  loadRtrs() {
    this.loading = true;
    this.http.get<RTR[]>(`${this.api}/rtrs`).subscribe({
      next: data => {
        this.rtrs = data;
        this.applyFilter();
        this.buildVendorFilters();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  buildVendorFilters() {
    const vendors = new Set(this.rtrs.map(r => r.vendorCompany).filter(v => v));
    this.vendorFilters = Array.from(vendors).sort();
  }

  setVendor(vendor: string | null) {
    this.activeVendor = vendor;
    this.applyFilter();
  }

  applyFilter() {
    this.filteredRtrs = this.activeVendor
      ? this.rtrs.filter(r => r.vendorCompany === this.activeVendor)
      : [...this.rtrs];
  }

  addRtr() {
    if (!this.newRtr.role || !this.newRtr.vendorCompany) {
      this.formError = 'Role and Vendor Company are required.';
      return;
    }
    this.formError = null;
    this.saving = true;
    this.http.post<RTR>(`${this.api}/rtrs`, this.newRtr).subscribe({
      next: created => {
        this.rtrs.unshift(created);
        this.buildVendorFilters();
        this.applyFilter();
        this.showForm = false;
        this.saving = false;
        this.newRtr = {
          role: '', clientName: '', vendorCompany: '', vendorName: '',
          vendorPhone: '', vendorEmail: '', rate: undefined, location: '', status: 'PENDING',
          date: new Date().toISOString().split('T')[0]
        };
      },
      error: () => { this.formError = 'Failed to save RTR. Check backend.'; this.saving = false; }
    });
  }

  submitRtr(rtr: RTR) {
    const submission = {
      submittedByVendor: rtr.vendorCompany,
      vendorPhone: rtr.vendorPhone,
      vendorEmail: rtr.vendorEmail,
      rateSubmitted: rtr.rate ? `$${rtr.rate}/hr` : '',
      submissionDate: new Date().toISOString().split('T')[0],
      submissionStatus: 'SUBMITTED',
      notes: `Submitted from RTR: ${rtr.role} at ${rtr.clientName}`,
      jobId: rtr.jobId || null
    };
    this.http.post(`${this.api}/submissions`, submission).subscribe({
      next: () => this.router.navigate(['/submissions']),
      error: () => this.router.navigate(['/submissions'])
    });
  }

  openEmailDraft(row: any) {
    const params = new URLSearchParams({
      role: row.role,
      email: row.vendorEmail
    });
    this.http.get<{ url: string }>(`${this.api}/automation/followup-draft?${params.toString()}`).subscribe({
      next: (res) => window.open(res.url, '_blank'),
      error: () => alert('Failed to open follow-up draft.')
    });
  }
}
