import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../environments/environment';

interface Job {
  id: string;
  jobTitle: string;
  companyName: string;
  vendorCompany: string;
  location: string;
  workMode: string;
  status: string;
  appliedDate: string;
  notes: string;
}

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [CommonModule, FormsModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">Career Opportunities</h1>
        <div class="header-actions">
          <span class="count-badge">{{ jobs.length }} Jobs Tracked</span>
        </div>
      </div>

      <!-- Search & Quick Filters -->
      <div class="search-section">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input [(ngModel)]="searchQuery" (input)="filterJobs()" placeholder="Search company or title..." />
        </div>
        <div class="status-chips">
          <button class="chip" [class.active]="activeStatus === 'ALL'" (click)="setStatus('ALL')">All</button>
          @for (s of statusOptions; track s) {
            <button class="chip" [class.active]="activeStatus === s" (click)="setStatus(s)">
              {{ s.replace('_', ' ') }}
            </button>
          }
        </div>
      </div>

      @if (loading) {
        <div class="state-container">
          <mat-spinner diameter="32"></mat-spinner>
          <p>Loading your job pipeline...</p>
        </div>
      } @else if (filteredJobs.length === 0) {
        <div class="state-container empty">
          <span class="icon">💼</span>
          <p>No jobs found matching your criteria.</p>
        </div>
      } @else {
        <div class="jobs-grid">
          @for (job of filteredJobs; track job.id) {
            <div class="job-card">
              <div class="job-header">
                <div>
                  <h3 class="job-title">{{ job.jobTitle }}</h3>
                  <p class="company-name">{{ job.companyName }}</p>
                </div>
                <span class="status-badge" [class]="job.status.toLowerCase()">
                  {{ job.status.replace('_', ' ') }}
                </span>
              </div>

              <div class="job-body">
                <div class="meta-item">
                  <span class="label">📍 Location:</span>
                  <span class="value">{{ job.location || '—' }}</span>
                </div>
                <div class="meta-item">
                  <span class="label">🏢 Mode:</span>
                  <span class="value">{{ job.workMode || '—' }}</span>
                </div>
                <div class="meta-item">
                  <span class="label">📅 Applied:</span>
                  <span class="value">{{ job.appliedDate | date:'MMM dd, yyyy' }}</span>
                </div>
              </div>

              @if (job.notes) {
                <div class="job-notes">
                  <p>{{ job.notes }}</p>
                </div>
              }

              <div class="job-footer">
                @if (job.vendorCompany) {
                  <span class="vendor-tag">Via {{ job.vendorCompany }}</span>
                }
                <div class="footer-actions">
                  <button class="btn-outline-sm" (click)="generateResume(job)" [disabled]="generating">
                    {{ generating ? 'Generating...' : '📄 Resume' }}
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
    
    .count-badge {
      font-size: 0.8125rem; font-weight: 600; color: #2563eb; background: #eff6ff;
      padding: 6px 14px; border-radius: 99px; border: 1px solid #dbeafe;
    }

    .search-section {
      display: flex; flex-direction: column; gap: 16px; margin-bottom: 32px;
      padding: 24px; background: white; border-radius: 20px; border: 1px solid #f1f5f9;
    }

    .search-box {
      display: flex; align-items: center; gap: 12px; background: #f8fafc;
      padding: 12px 20px; border-radius: 12px; border: 1px solid #e2e8f0;
    }

    .search-box input {
      border: none; background: transparent; outline: none; width: 100%;
      font-size: 0.9375rem; color: #1e293b; font-weight: 500;
    }

    .status-chips { display: flex; flex-wrap: wrap; gap: 8px; }
    
    .chip {
      padding: 6px 16px; border-radius: 99px; border: 1px solid #e2e8f0;
      background: white; color: #64748b; font-size: 0.8125rem; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
    }

    .chip:hover { border-color: #2563eb; color: #2563eb; }
    .chip.active { background: #2563eb; border-color: #2563eb; color: white; }

    .state-container {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 100px 0; gap: 20px; color: #64748b; font-weight: 500;
      background: white; border-radius: 24px; border: 1px dashed #e2e8f0;
    }

    .jobs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px; }

    .job-card {
      background: white; border: 1px solid #f1f5f9; border-radius: 24px;
      padding: 24px; display: flex; flex-direction: column; gap: 20px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); transition: all 0.3s;
    }

    .job-card:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }

    .job-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .job-title { font-size: 1.125rem; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.3; }
    .company-name { font-size: 0.9375rem; color: #64748b; font-weight: 600; margin: 4px 0 0 0; }

    .status-badge {
      padding: 4px 12px; border-radius: 8px; font-size: 0.75rem; font-weight: 700;
      text-transform: uppercase; background: #f1f5f9; color: #475569; white-space: nowrap;
    }
    .status-badge.offer { background: #ecfdf5; color: #059669; }
    .status-badge.interviewing { background: #eff6ff; color: #2563eb; }
    .status-badge.rejected { background: #fef2f2; color: #dc2626; }
    .status-badge.applied { background: #f0fdfa; color: #0d9488; }

    .job-body { display: flex; flex-direction: column; gap: 10px; }
    .meta-item { display: flex; justify-content: space-between; font-size: 0.8125rem; }
    .meta-item .label { color: #94a3b8; font-weight: 500; }
    .meta-item .value { color: #1e293b; font-weight: 700; }

    .job-notes {
      padding: 12px; background: #f8fafc; border-radius: 12px;
      font-size: 0.8125rem; color: #475569; line-height: 1.5; font-style: italic;
    }

    .job-footer { margin-top: auto; }
    .vendor-tag {
      font-size: 0.75rem; font-weight: 600; color: #6366f1;
      background: #f5f3ff; padding: 4px 10px; border-radius: 6px;
    }

    .footer-actions { margin-top: 12px; display: flex; justify-content: flex-end; }
    .btn-outline-sm {
      background: white; color: #6366f1; border: 1px solid #c7d2fe;
      padding: 6px 12px; border-radius: 8px; font-size: 0.75rem; font-weight: 700;
      cursor: pointer; transition: all 0.2s;
    }
    .btn-outline-sm:hover { background: #6366f1; color: white; border-color: #6366f1; }
  `]
})
export class JobsComponent implements OnInit {
  jobs: Job[] = [];
  filteredJobs: Job[] = [];
  loading = true;
  generating = false;
  searchQuery = '';
  activeStatus = 'ALL';

  statusOptions = ['APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED', 'CLOSED'];

  private api = environment.apiBaseUrl;

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.fetchJobs();
  }

  fetchJobs() {
    this.loading = true;
    // Requesting a large size to avoid pagination complexity for now
    this.http.get<any>(`${this.api}/jobs?size=100`).subscribe({
      next: (res) => {
        this.jobs = res.content || [];
        this.filterJobs();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  setStatus(status: string) {
    this.activeStatus = status;
    this.filterJobs();
  }

  filterJobs() {
    const q = this.searchQuery.toLowerCase();
    this.filteredJobs = this.jobs.filter(j => {
      const matchSearch = j.companyName.toLowerCase().includes(q) ||
        j.jobTitle.toLowerCase().includes(q) ||
        (j.vendorCompany && j.vendorCompany.toLowerCase().includes(q));

      const matchStatus = this.activeStatus === 'ALL' || j.status === this.activeStatus;

      return matchSearch && matchStatus;
    });
  }

  generateResume(job: Job) {
    this.generating = true;
    // First, get the base content
    this.http.get<any>(`${this.api}/automation/base-content`).subscribe({
      next: (content) => {
        // Here we could "tailor" the content based on job notes or title
        // For now, we'll just send it as is for generation
        this.http.post<any>(`${this.api}/automation/generate-resume`, content).subscribe({
          next: (res) => {
            this.generating = false;
            if (res.status === 'success') {
              alert('Resume generated successfully! It should open in File Explorer.');
            } else {
              alert('Error: ' + res.message);
            }
          },
          error: () => {
            this.generating = false;
            alert('Failed to connect to automation service.');
          }
        });
      },
      error: () => {
        this.generating = false;
        alert('Failed to fetch base resume content.');
      }
    });
  }
}
