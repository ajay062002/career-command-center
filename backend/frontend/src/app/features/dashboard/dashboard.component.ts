import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { environment } from '../../../environments/environment';

interface DashboardSummary {
  totalJobs: number;
  activeSubmissions: number;
  studyMinutesThisWeek: number;
  overdueReminders: number;
}

interface StudyTrend {
  date: string;
  totalMinutes: number;
}

interface JobByStatus {
  status: string;
  count: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">Dashboard Overview</h1>
        <div class="header-actions">
          <span class="status-indicator">
            <span class="dot"></span> Backend Online
          </span>
        </div>
      </div>

      @if (loading) {
        <div class="state-container">
          <mat-spinner diameter="32"></mat-spinner>
          <p>Syncing your career data...</p>
        </div>
      } @else if (error) {
        <div class="state-container error">
          <span class="icon">📍</span>
          <p>{{ error }}</p>
          <button (click)="loadDashboard()" class="retry-btn">Retry Connection</button>
        </div>
      } @else {
        <div class="card-grid">
          <div class="stat-card">
            <div class="stat-icon jobs">💼</div>
            <div class="stat-info">
              <span class="stat-label">Total Jobs</span>
              <span class="stat-value">{{ summary?.totalJobs ?? 0 }}</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon submissions">📤</div>
            <div class="stat-info">
              <span class="stat-label">Active Submissions</span>
              <span class="stat-value">{{ summary?.activeSubmissions ?? 0 }}</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon study">📚</div>
            <div class="stat-info">
              <span class="stat-label">Study Mins (Week)</span>
              <span class="stat-value">{{ summary?.studyMinutesThisWeek ?? 0 }}</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon reminders">🔔</div>
            <div class="stat-info">
              <span class="stat-label">Overdue</span>
              <span class="stat-value warning">{{ summary?.overdueReminders ?? 0 }}</span>
            </div>
          </div>
        </div>

        <div class="charts-grid">
          <div class="chart-card">
            <h3>Pipelines by Status</h3>
            @if (jobsByStatus.length === 0) {
              <div class="empty-chart">No status data available</div>
            } @else {
              <div class="bar-chart">
                @for (item of jobsByStatus; track item.status) {
                  <div class="bar-row">
                    <span class="bar-label">{{ item.status.replace('_', ' ') }}</span>
                    <div class="bar-track">
                      <div class="bar-fill" [style.width.%]="getBarWidth(item.count)"></div>
                    </div>
                    <span class="bar-count">{{ item.count }}</span>
                  </div>
                }
              </div>
            }
          </div>

          <div class="chart-card">
            <h3>Recent Study Activity</h3>
            @if (studyTrend.length === 0) {
              <div class="empty-chart">No recent activity recorded</div>
            } @else {
              <div class="trend-chart">
                @for (day of studyTrend; track day.date) {
                  <div class="trend-col">
                    <div class="trend-bar-wrap">
                      <div class="trend-bar"
                           [style.height.%]="getTrendHeight(day.totalMinutes)"
                           [class.active]="day.totalMinutes > 0">
                        <div class="tooltip">{{ day.totalMinutes }}m</div>
                      </div>
                    </div>
                    <span class="trend-label">{{ day.date | date:'EEE' }}</span>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .header-actions {
      display: flex;
      gap: 12px;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8125rem;
      font-weight: 500;
      color: #059669;
      background: #ecfdf5;
      padding: 6px 14px;
      border-radius: 99px;
      border: 1px solid #d1fae5;
    }

    .status-indicator .dot {
      width: 6px;
      height: 6px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2);
    }

    .state-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 100px 0;
      gap: 20px;
      color: #64748b;
      font-weight: 500;
      background: white;
      border-radius: 24px;
      border: 1px dashed #e2e8f0;
    }

    .state-container.error {
      color: #dc2626;
      background: #fef2f2;
      border-color: #fee2e2;
    }

    .retry-btn {
      padding: 8px 16px;
      background: #dc2626;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }

    .stat-card {
      flex-direction: row !important;
      align-items: center;
      gap: 20px !important;
    }

    .stat-icon {
      margin-bottom: 0 !important;
      font-size: 1.25rem !important;
    }

    .stat-icon.jobs { background: #eff6ff; color: #2563eb; }
    .stat-icon.submissions { background: #fdf2f8; color: #db2777; }
    .stat-icon.study { background: #f5f3ff; color: #7c3aed; }
    .stat-icon.reminders { background: #fff7ed; color: #ea580c; }

    .stat-info {
      display: flex;
      flex-direction: column;
    }

    .stat-value.warning { color: #dc2626; }

    /* Bar chart refinement */
    .bar-chart { display: flex; flex-direction: column; gap: 16px; }
    .bar-row { display: flex; align-items: center; gap: 16px; }
    .bar-label { width: 140px; font-size: 0.8125rem; color: #64748b; font-weight: 500; text-transform: capitalize; }
    .bar-track { flex: 1; background: #f1f5f9; border-radius: 99px; height: 8px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 99px; background: #6366f1; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1); }
    .bar-count { width: 32px; text-align: right; font-size: 0.875rem; color: #1e293b; font-weight: 700; }

    /* Trend chart refinement */
    .trend-chart { display: flex; align-items: flex-end; gap: 12px; height: 200px; padding: 20px 0; }
    .trend-col { display: flex; flex-direction: column; align-items: center; flex: 1; height: 100%; }
    .trend-bar-wrap { flex: 1; display: flex; align-items: flex-end; width: 100%; }
    .trend-bar {
      width: 100%;
      border-radius: 8px 8px 4px 4px;
      background: #e2e8f0;
      min-height: 8px;
      transition: all 0.5s ease;
      position: relative;
    }
    .trend-bar.active { background: #6366f1; }
    .trend-bar:hover { background: #4f46e5; transform: scaleX(1.1); }
    .trend-label { font-size: 0.75rem; color: #94a3b8; margin-top: 12px; font-weight: 600; text-transform: uppercase; }

    .tooltip {
      position: absolute;
      top: -30px;
      left: 50%;
      transform: translateX(-50%);
      background: #0f172a;
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.7rem;
      opacity: 0;
      transition: opacity 0.2s;
      pointer-events: none;
      white-space: nowrap;
    }
    .trend-bar:hover .tooltip { opacity: 1; }

    .empty-chart {
      height: 160px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-size: 0.875rem;
      background: #f8fafc;
      border-radius: 12px;
      border: 1px dashed #e2e8f0;
    }
  `]
})
export class DashboardComponent implements OnInit {
  summary: DashboardSummary | null = null;
  jobsByStatus: JobByStatus[] = [];
  studyTrend: StudyTrend[] = [];
  loading = true;
  error: string | null = null;

  private api = environment.apiBaseUrl;

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.loading = true;
    this.http.get<DashboardSummary>(`${this.api}/analytics/dashboard`).subscribe({
      next: data => {
        this.summary = data;
        this.loadCharts();
      },
      error: err => {
        this.error = 'Failed to fetch dashboard data. Is the backend running on port 8080?';
        this.loading = false;
      }
    });
  }

  loadCharts() {
    this.http.get<JobByStatus[]>(`${this.api}/analytics/jobs-by-status`).subscribe({
      next: data => this.jobsByStatus = data,
      error: () => { }
    });
    this.http.get<StudyTrend[]>(`${this.api}/analytics/study-trend`).subscribe({
      next: data => { this.studyTrend = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  getBarWidth(count: number): number {
    const max = Math.max(...this.jobsByStatus.map(j => j.count), 1);
    return (count / max) * 100;
  }

  getTrendHeight(minutes: number): number {
    const max = Math.max(...this.studyTrend.map(d => d.totalMinutes), 1);
    return Math.max((minutes / max) * 100, 5);
  }
}
