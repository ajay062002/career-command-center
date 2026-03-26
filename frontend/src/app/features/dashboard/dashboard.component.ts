import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterModule } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { forkJoin } from 'rxjs';
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
      backgroundColor: [
        'rgba(0,89,179,0.85)',
        'rgba(255,107,0,0.85)',
        'rgba(34,197,94,0.85)',
        'rgba(168,85,247,0.85)',
        'rgba(239,68,68,0.85)',
        'rgba(245,158,11,0.85)',
        'rgba(20,184,166,0.85)',
      ],
      borderWidth: 2,
      borderColor: 'rgba(5,10,20,0.8)',
      hoverOffset: 12,
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
        if (!chartArea) return 'rgba(0,89,179,0.6)';
        const gradient = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
        gradient.addColorStop(0, 'rgba(0,89,179,0.3)');
        gradient.addColorStop(1, 'rgba(0,89,179,0.9)');
        return gradient;
      },
      borderColor: 'rgba(0,89,179,0)',
      borderWidth: 0,
      borderRadius: 10,
      borderSkipped: false,
      hoverBackgroundColor: 'rgba(255,107,0,0.85)',
      barThickness: 28,
    }]
  };
  barChartType: ChartType = 'bar';

  ngOnInit(): void {
    forkJoin({
      summary:   this.dashboardService.getDashboardSummary(),
      jobsStatus: this.dashboardService.getJobsStatus(),
      studyTrend: this.dashboardService.getStudyTrend(),
      reminders:  this.reminderService.getOverdueReminders()
    }).subscribe({
      next: ({ summary, jobsStatus, studyTrend, reminders }) => {
        this.summary = summary;
        this.updatePieChart(jobsStatus);
        this.updateBarChart(studyTrend);
        this.loading = false;

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
      }
    });
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
