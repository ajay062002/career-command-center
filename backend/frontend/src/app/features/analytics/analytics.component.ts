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

interface JobByStatus {
  status: string;
  count: number;
}

interface StudyTrend {
  date: string;
  totalMinutes: number;
}

interface VendorPerformance {
  vendorCompany: string;
  totalSubmissions: number;
  interviewRate: number;
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">Analytics & Intelligence</h1>
        <div class="header-actions">
           <span class="live-badge">
             <span class="pulsar"></span> Real-time Analysis
           </span>
        </div>
      </div>

      @if (loading) {
        <div class="state-container">
          <mat-spinner diameter="32"></mat-spinner>
          <p>Analyzing pipelines and metrics...</p>
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
              <span class="stat-label">Submissions</span>
              <span class="stat-value">{{ summary?.activeSubmissions ?? 0 }}</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon study">📚</div>
            <div class="stat-info">
              <span class="stat-label">Study Hours</span>
              <span class="stat-value">{{ ((summary?.studyMinutesThisWeek ?? 0) / 60).toFixed(1) }}h</span>
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

        <div class="charts-grid secondary">
          <!-- Jobs by Status -->
          <div class="chart-card">
            <div class="card-title-row">
              <h3>Pipeline Distribution</h3>
            </div>
            @if (jobsByStatus.length === 0) {
              <div class="empty-chart">No data available</div>
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

          <!-- Study Trend -->
          <div class="chart-card">
            <div class="card-title-row">
              <h3>Learning Momentum</h3>
            </div>
            @if (studyTrend.length === 0) {
              <div class="empty-chart">No recent activity</div>
            } @else {
              <div class="trend-chart">
                @for (day of studyTrend; track day.date) {
                  <div class="trend-col">
                    <div class="trend-bar-wrap">
                      <div class="trend-bar"
                           [style.height.%]="getTrendHeight(day.totalMinutes)"
                           [class.active]="day.totalMinutes > 0">
                        <div class="tooltip">{{ day.totalMinutes }} mins</div>
                      </div>
                    </div>
                    <div class="trend-axis">
                      <span class="trend-label">{{ day.date | date:'EEE' }}</span>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Vendor Performance -->
        @if (vendors.length > 0) {
          <div class="chart-card table-section">
            <div class="card-title-row">
              <h3>Vendor Performance Metrics</h3>
              <p class="card-subtitle">Ranking based on submission volume and interview outcomes</p>
            </div>
            <div class="table-container">
              <table class="premium-table">
                <thead>
                  <tr>
                    <th>Vendor Company</th>
                    <th>Volume</th>
                    <th>Effectiveness</th>
                    <th>Health</th>
                  </tr>
                </thead>
                <tbody>
                  @for (v of vendors; track v.vendorCompany) {
                    <tr>
                      <td class="vendor-name-cell">
                        <div class="vendor-avatar">{{ (v.vendorCompany || 'U')[0] }}</div>
                        {{ v.vendorCompany || 'Unknown' }}
                      </td>
                      <td>
                        <div class="count-badge">{{ v.totalSubmissions }} submissions</div>
                      </td>
                      <td>
                        <div class="progress-container">
                           <div class="progress-bar" [style.width.%]="v.interviewRate * 100"></div>
                        </div>
                      </td>
                      <td>
                        <span class="rate-text">{{ (v.interviewRate * 100).toFixed(0) }}% Success</span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 40px; }
    .page-title { font-family: 'Outfit', sans-serif; font-size: 2.25rem; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.02em; }
    
    .live-badge {
      display: flex; align-items: center; gap: 10px; font-size: 0.75rem; font-weight: 800;
      color: #6366f1; background: white; padding: 10px 20px; border-radius: 99px;
      border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
      text-transform: uppercase; letter-spacing: 0.1em;
    }

    .pulsar { width: 10px; height: 10px; background: #6366f1; border-radius: 50%; position: relative; }
    .pulsar::after {
      content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background: #6366f1; border-radius: 50%; animation: pulse-ring 2s infinite;
    }

    @keyframes pulse-ring { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(3); opacity: 0; } }

    /* Stat Cards */
    .card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 40px; }
    .stat-card {
      background: white; border: 1px solid #f1f5f9; border-radius: 24px; padding: 28px;
      display: flex; align-items: center; gap: 20px; transition: all 0.3s;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
    }
    .stat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 20px -5px rgba(0,0,0,0.06); }

    .stat-icon {
      width: 56px; height: 56px; border-radius: 16px; font-size: 1.5rem;
      display: flex; align-items: center; justify-content: center;
    }
    .stat-icon.jobs { background: #eff6ff; color: #2563eb; }
    .stat-icon.submissions { background: #fdf2f8; color: #db2777; }
    .stat-icon.study { background: #f5f3ff; color: #7c3aed; }
    .stat-icon.reminders { background: #fff7ed; color: #ea580c; }
    
    .stat-info { display: flex; flex-direction: column; }
    .stat-label { font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-value { font-family: 'Outfit', sans-serif; font-size: 1.75rem; font-weight: 800; color: #0f172a; }
    .stat-value.warning { color: #ef4444; }

    /* Charts */
    .charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 32px; margin-bottom: 40px; }
    .chart-card {
      background: white; border: 1px solid #f1f5f9; border-radius: 32px; padding: 32px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
    }
    .chart-card h3 { font-family: 'Outfit', sans-serif; font-size: 1.125rem; font-weight: 800; color: #0f172a; margin: 0 0 24px 0; }

    .bar-chart { display: flex; flex-direction: column; gap: 20px; }
    .bar-row { display: flex; align-items: center; gap: 20px; }
    .bar-label { width: 140px; font-size: 0.8125rem; color: #64748b; font-weight: 600; text-transform: capitalize; }
    .bar-track { flex: 1; background: #f8fafc; border-radius: 99px; height: 10px; overflow: hidden; }
    .bar-fill {
      height: 100%; border-radius: 99px; background: linear-gradient(90deg, #6366f1, #a855f7);
      transition: width 1s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .bar-count { font-size: 0.875rem; color: #0f172a; font-weight: 800; font-family: 'Outfit', sans-serif; }

    .trend-chart { display: flex; align-items: flex-end; gap: 16px; height: 220px; padding: 20px 0; }
    .trend-col { display: flex; flex-direction: column; align-items: center; flex: 1; height: 100%; }
    .trend-bar-wrap { flex: 1; display: flex; align-items: flex-end; width: 100%; }
    .trend-bar {
      width: 100%; border-radius: 10px; background: #f1f5f9;
      min-height: 8px; transition: all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      position: relative;
    }
    .trend-bar.active { background: linear-gradient(180deg, #6366f1, #818cf8); box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); }

    .vendor-avatar {
      width: 36px; height: 36px; background: #f8fafc; border-radius: 12px;
      display: flex; align-items: center; justify-content: center; color: #6366f1;
      font-weight: 800; border: 1px solid #e2e8f0;
    }
    
    .progress-container { width: 100%; height: 8px; background: #f1f5f9; border-radius: 99px; overflow: hidden; }
    .progress-bar { height: 100%; background: linear-gradient(90deg, #10b981, #34d399); }
    
    .table-section { margin-top: 32px; padding: 0 !important; overflow: hidden; }
    .card-title-row { padding: 32px 32px 0 32px; margin-bottom: 24px; }
    .card-subtitle { font-size: 0.875rem; color: #64748b; margin-top: 4px; }
    .premium-table { width: 100%; border-collapse: collapse; }
    .premium-table th { padding: 20px 32px; background: #f8fafc; font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #f1f5f9; }
    .premium-table td { padding: 20px 32px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #475569; }
    .vendor-name-cell { display: flex; align-items: center; gap: 16px; color: #0f172a; font-weight: 800; }
  `]
})
export class AnalyticsComponent implements OnInit {
  summary: DashboardSummary | null = null;
  jobsByStatus: JobByStatus[] = [];
  studyTrend: StudyTrend[] = [];
  vendors: VendorPerformance[] = [];
  loading = true;

  private api = environment.apiBaseUrl;
  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.http.get<DashboardSummary>(`${this.api}/analytics/dashboard`).subscribe({
      next: d => { this.summary = d; this.loading = false; }
    });
    this.http.get<JobByStatus[]>(`${this.api}/analytics/jobs-by-status`).subscribe({
      next: d => this.jobsByStatus = d
    });
    this.http.get<StudyTrend[]>(`${this.api}/analytics/study-trend`).subscribe({
      next: d => this.studyTrend = d
    });
    this.http.get<VendorPerformance[]>(`${this.api}/analytics/vendor-performance`).subscribe({
      next: d => this.vendors = d,
      error: () => { }
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
