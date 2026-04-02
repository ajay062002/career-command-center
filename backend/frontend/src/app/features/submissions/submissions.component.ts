import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../environments/environment';

interface Submission {
  id: string;
  submittedByVendor: string;
  vendorPhone: string;
  vendorEmail: string;
  rateSubmitted: string;
  submissionDate: string;
  followUpDate: string;
  submissionStatus: string;
  notes: string;
}

@Component({
  selector: 'app-submissions',
  standalone: true,
  imports: [CommonModule, FormsModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Market Submissions</h1>
          <p class="page-subtitle">Track your active applications and outreach performance</p>
        </div>
        <div class="header-actions">
           <span class="count-badge">{{ filteredSubmissions.length }} Applied</span>
        </div>
      </div>

      <div class="filter-section">
        <div class="filter-group">
          <label>By Agency:</label>
          <div class="chip-row">
            <button class="tag" [class.active]="!activeVendor" (click)="setVendor(null)">All Agencies</button>
            @for (v of vendorFilters; track v) {
              <button class="tag" [class.active]="activeVendor === v" (click)="setVendor(v)">{{ v }}</button>
            }
          </div>
        </div>

        <div class="filter-group">
          <label>By Status:</label>
          <div class="chip-row">
            @for (s of statusFilters; track s) {
              <button class="tag" [class.active]="activeStatus === s" (click)="setStatus(s)">{{ s }}</button>
            }
          </div>
        </div>
      </div>

      @if (loading) {
        <div class="state-container">
          <mat-spinner diameter="32"></mat-spinner>
          <p>Analyzing submission pipeline...</p>
        </div>
      } @else if (filteredSubmissions.length === 0) {
        <div class="state-container empty">
           <span class="icon">📤</span>
           <p>No submissions found. Try adjusting your filters.</p>
        </div>
      } @else {
        <div class="table-container">
          <table class="premium-table">
            <thead>
              <tr>
                <th>Agency</th>
                <th>Rate</th>
                <th>Outreach Date</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              @for (sub of filteredSubmissions; track sub.id) {
                <tr>
                  <td>
                    <div class="vendor-cell">
                      <span class="agency-tag">{{ sub.submittedByVendor || 'Direct' }}</span>
                      @if (sub.vendorEmail || sub.vendorPhone) {
                        <div class="contact-info">
                          @if (sub.vendorEmail) { <span class="contact-sub">✉ {{ sub.vendorEmail }}</span> }
                          @if (sub.vendorPhone) { <span class="contact-sub">📞 {{ sub.vendorPhone }}</span> }
                        </div>
                      }
                    </div>
                  </td>
                  <td>
                    <span class="rate-text">{{ sub.rateSubmitted || '—' }}</span>
                  </td>
                  <td class="date-cell">
                    <div class="date-info">
                       <span class="primary">{{ sub.submissionDate | date:'MMM dd, yyyy' }}</span>
                       <span class="secondary">Follow up: {{ sub.followUpDate ? (sub.followUpDate | date:'MMM dd') : '—' }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="status-badge" [class]="sub.submissionStatus.toLowerCase()">
                      {{ sub.submissionStatus.replace('_', ' ') }}
                    </span>
                  </td>
                  <td class="notes-cell">
                    <p class="notes-text" [title]="sub.notes">{{ sub.notes || 'No notes' }}</p>
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
      font-size: 0.8125rem; font-weight: 700; color: #db2777; background: #fdf2f8;
      padding: 8px 16px; border-radius: 99px; border: 1px solid #fbcfe8;
    }

    .filter-section {
      background: white; padding: 24px; border-radius: 20px; border: 1px solid #f1f5f9;
      margin-bottom: 32px; display: flex; flex-direction: column; gap: 20px;
    }
    .filter-group { display: flex; align-items: center; gap: 16px; }
    .filter-group label { font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; width: 100px; }
    .chip-row { display: flex; gap: 8px; flex-wrap: wrap; }
    
    .tag {
      padding: 5px 14px; border-radius: 99px; border: 1px solid #e2e8f0;
      background: white; color: #64748b; font-size: 0.8125rem; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
    }
    .tag:hover { border-color: #db2777; color: #db2777; }
    .tag.active { background: #db2777; border-color: #db2777; color: white; }

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

    .agency-tag {
      font-size: 0.8125rem; font-weight: 600; color: #db2777; background: #fdf2f8;
      padding: 4px 10px; border-radius: 6px; border: 1px solid #fbcfe8;
    }

    .vendor-cell { display: flex; flex-direction: column; gap: 6px; }
    .contact-info { display: flex; flex-direction: column; font-size: 0.75rem; color: #475569; font-weight: 600; }
    .contact-sub { color: #94a3b8; font-family: 'Inter', sans-serif; }

    .rate-text { font-weight: 700; color: #059669; font-size: 0.9375rem; }

    .date-info { display: flex; flex-direction: column; }
    .date-info .primary { font-size: 0.9375rem; font-weight: 700; color: #1e293b; }
    .date-info .secondary { font-size: 0.75rem; color: #94a3b8; font-weight: 500; }

    .status-badge {
      padding: 4px 12px; border-radius: 8px; font-size: 0.75rem; font-weight: 700;
      text-transform: uppercase; background: #f1f5f9; color: #475569; white-space: nowrap;
    }
    .status-badge.submitted { background: #ecfdf5; color: #059669; }
    .status-badge.interview_scheduled { background: #eff6ff; color: #2563eb; }
    .status-badge.rejected { background: #fef2f2; color: #dc2626; }

    .notes-cell { max-width: 300px; }
    .notes-text {
      font-size: 0.8125rem; color: #64748b; margin: 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      font-weight: 500;
    }
  `]
})
export class SubmissionsComponent implements OnInit {
  submissions: Submission[] = [];
  filteredSubmissions: Submission[] = [];
  vendorFilters: string[] = [];
  statusFilters = ['All', 'SUBMITTED', 'SCREENING', 'INTERVIEW_SCHEDULED', 'REJECTED', 'WITHDRAWN'];
  activeVendor: string | null = null;
  activeStatus = 'All';
  loading = true;
  private api = environment.apiBaseUrl;

  constructor(private http: HttpClient) { }

  ngOnInit() { this.loadSubmissions(); }

  loadSubmissions() {
    this.loading = true;
    this.http.get<Submission[]>(`${this.api}/submissions`).subscribe({
      next: data => {
        this.submissions = data;
        this.buildVendorFilters();
        this.applyFilters();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  buildVendorFilters() {
    const vendors = new Set(this.submissions.map(s => s.submittedByVendor).filter(v => v));
    this.vendorFilters = Array.from(vendors).sort();
  }

  setVendor(v: string | null) { this.activeVendor = v; this.applyFilters(); }
  setStatus(s: string) { this.activeStatus = s; this.applyFilters(); }

  applyFilters() {
    this.filteredSubmissions = this.submissions.filter(s => {
      const vendorMatch = !this.activeVendor || s.submittedByVendor === this.activeVendor;
      const statusMatch = this.activeStatus === 'All' || s.submissionStatus === this.activeStatus;
      return vendorMatch && statusMatch;
    });
  }
}
