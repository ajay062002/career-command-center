import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterModule } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { forkJoin, timer } from 'rxjs';
import { retry, switchMap } from 'rxjs/operators';
import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardSummary, JobStatusCount, StudyTrend } from '../../core/models/dashboard.models';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ReminderService } from '../../core/services/reminder.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    RouterModule,
    BaseChartDirective,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  summary?: DashboardSummary;
  loading = true;
  error = false;
  retrying = false;
  retryCount = 0;
  today = new Date();

  statCards = [
    { key: 'totalJobs',             label: 'Total Jobs',       icon: 'work',                 colorClass: 'blue',   link: '/jobs' },
    { key: 'activeSubmissions',     label: 'Submissions',      icon: 'send',                 colorClass: 'orange', link: '/submissions' },
    { key: 'rtrPending',            label: 'RTRs Active',      icon: 'assignment_turned_in', colorClass: 'purple', link: '/rtr' },
    { key: 'offers',                label: 'Offers',           icon: 'star',                 colorClass: 'green',  link: '/jobs' },
    { key: 'rejected',              label: 'Rejected',         icon: 'cancel',               colorClass: 'red',    link: '/jobs' },
    { key: 'studyMinutesThisWeek',  label: 'Study Min (Week)', icon: 'school',               colorClass: 'blue',   link: '/study' },
    { key: 'overdueReminders',      label: 'Overdue',          icon: 'notifications_active', colorClass: 'yellow', link: '/reminders' },
    { key: 'totalUsers',            label: 'Total Users',      icon: 'people',               colorClass: 'purple', isAdmin: true, link: '/admin' },
  ];

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private reminderService: ReminderService,
    private snackBar: MatSnackBar
  ) { }

  isAdmin(): boolean { return this.authService.isAdmin(); }

  getValue(key: string): number {
    return this.summary ? (this.summary as any)[key] ?? 0 : 0;
  }

  getDisplayValue(key: string): string {
    const v = this.getValue(key);
    if (v >= 1000) return (v / 1000).toFixed(1) + 'k';
    return String(v);
  }

  getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  // ── Pie: Jobs by Status ────────────────────────────────────────────────
  pieChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        display: true,
        position: 'right',
        labels: {
          color: 'rgba(255,255,255,0.65)',
          font: { family: 'Inter', size: 12 },
          padding: 14,
          usePointStyle: true,
          pointStyleWidth: 8,
        }
      },
      tooltip: {
        backgroundColor: 'rgba(5,10,20,0.95)',
        titleColor: '#fff',
        bodyColor: 'rgba(255,255,255,0.75)',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        cornerRadius: 10,
        padding: 12,
      }
    }
  };

  pieChartData: ChartData<'doughnut', number[], string> = {
    labels: [],
    datasets: [{
      data: [],
      // Minecraft item rarity colors
      backgroundColor: [
        'rgba(94,207,223,0.85)',   // diamond blue
        'rgba(254,173,39,0.85)',   // gold
        'rgba(128,201,32,0.85)',   // xp green
        'rgba(192,132,252,0.85)',  // enchant purple
        'rgba(196,30,58,0.85)',    // redstone
        'rgba(45,212,191,0.85)',   // emerald
        'rgba(224,122,16,0.85)',   // orange
      ],
      borderWidth: 2,
      borderColor: '#111317',
      hoverOffset: 8,
    }]
  };
  pieChartType: ChartType = 'doughnut';

  // ── Bar: Study Trend ───────────────────────────────────────────────────
  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 11, family: 'Inter' } },
        border: { display: false }
      },
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 11, family: 'Inter' } },
        border: { display: false }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(5,10,20,0.95)',
        titleColor: '#fff',
        bodyColor: 'rgba(255,255,255,0.75)',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        cornerRadius: 10,
        padding: 12,
      }
    }
  };

  barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{
      data: [],
      label: 'Study Minutes',
      backgroundColor: (ctx: any) => {
        const chart = ctx.chart;
        const { ctx: c, chartArea } = chart;
        if (!chartArea) return 'rgba(94,207,223,0.7)';
        const gradient = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
        gradient.addColorStop(0, 'rgba(94,207,223,0.3)');
        gradient.addColorStop(1, 'rgba(94,207,223,0.9)');
        return gradient;
      },
      borderColor: 'rgba(94,207,223,0)',
      borderWidth: 0,
      borderRadius: 0, // pixel-art: no radius
      borderSkipped: false,
      hoverBackgroundColor: 'rgba(254,173,39,0.9)',
      barThickness: 28,
    }]
  };
  barChartType: ChartType = 'bar';

  loadData(): void {
    this.loading = true;
    this.error = false;
    this.retrying = false;

    forkJoin({
      summary:    this.dashboardService.getDashboardSummary(),
      jobsStatus: this.dashboardService.getJobsStatus(),
      studyTrend: this.dashboardService.getStudyTrend(),
      reminders:  this.reminderService.getOverdueReminders()
    }).pipe(
      retry({
        count: 3,
        delay: (err, attempt) => {
          this.retrying = true;
          this.retryCount = attempt;
          return timer(attempt * 3000); // 3s, 6s, 9s
        }
      })
    ).subscribe({
      next: ({ summary, jobsStatus, studyTrend, reminders }) => {
        this.summary = summary;
        this.updatePieChart(jobsStatus);
        this.updateBarChart(studyTrend);
        this.loading = false;
        this.retrying = false;

        const today = new Date().toDateString();
        const dueToday = reminders.filter(r => new Date(r.dueDate).toDateString() === today);
        if (dueToday.length > 0) {
          this.snackBar.open(
            `${dueToday.length} reminder(s) due today!`,
            'View',
            { duration: 8000, horizontalPosition: 'end', verticalPosition: 'top' }
          );
        }
      },
      error: err => {
        console.error('Dashboard error', err);
        this.error = true;
        this.loading = false;
        this.retrying = false;
      }
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  private updatePieChart(statusCounts: JobStatusCount[]): void {
    this.pieChartData = {
      ...this.pieChartData,
      labels: statusCounts.map(s => s.status),
      datasets: [{ ...this.pieChartData.datasets[0], data: statusCounts.map(s => s.count) }]
    };
  }

  private updateBarChart(trend: StudyTrend[]): void {
    this.barChartData = {
      ...this.barChartData,
      labels: trend.map(t => {
        const d = new Date(t.date);
        return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
      }),
      datasets: [{ ...this.barChartData.datasets[0], data: trend.map(t => t.totalMinutes) }]
    };
  }
}
