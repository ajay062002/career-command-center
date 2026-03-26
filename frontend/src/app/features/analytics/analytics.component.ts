import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { forkJoin } from 'rxjs';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardSummary, RtrTimelineEntry, VendorPerformance } from '../../core/models/dashboard.models';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatProgressBarModule,
    BaseChartDirective
  ],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss'
})
export class AnalyticsComponent implements OnInit {
  summary?: DashboardSummary;
  vendorData: VendorPerformance[] = [];
  loading = true;
  error = false;
  viewingUserId?: string;
  viewingLabel = 'My Analytics';

  vendorColumns = ['vendorCompany', 'totalRtrs', 'totalSubmissions', 'interviewsOrOffers', 'rate'];

  // ── Doughnut: Vendor Conversion Rate ────────────────────────────────────────
  doughnutOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '55%',
    plugins: {
      legend: {
        display: true,
        position: 'right',
        labels: { color: 'rgba(255, 255, 255, 0.7)', font: { family: 'Inter', size: 11 }, padding: 14 }
      },
      tooltip: {
        backgroundColor: 'rgba(5, 10, 20, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        callbacks: {
          label: (ctx: any) => ` ${ctx.label}: ${ctx.parsed}% conversion`
        }
      }
    }
  };
  doughnutData: ChartData<'doughnut', number[], string> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: ['#FF6B00', '#0059B3', '#4dabff', '#FFA64D', '#004796', '#CC5600', '#4caf50', '#ff6b6b', '#9c27b0', '#00bcd4'],
      borderWidth: 2,
      borderColor: 'rgba(5, 10, 20, 0.8)',
      hoverOffset: 12,
    }]
  };
  doughnutType: ChartType = 'doughnut';

  // ── Bar: RTR & Submission Timeline ─────────────────────────────────────────
  rtrTimelineOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'rgba(255, 255, 255, 0.4)', stepSize: 1 }
      },
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(255, 255, 255, 0.4)', maxRotation: 45 }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { color: 'rgba(255, 255, 255, 0.7)', font: { family: 'Inter', size: 12 }, usePointStyle: true }
      },
      tooltip: {
        backgroundColor: 'rgba(5, 10, 20, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff'
      }
    }
  };
  rtrTimelineData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'RTRs Received',
        backgroundColor: '#FF6B00',
        borderRadius: 6,
        barThickness: 18,
      },
      {
        data: [],
        label: 'Submissions',
        backgroundColor: '#0059B3',
        borderRadius: 6,
        barThickness: 18,
      }
    ]
  };
  rtrTimelineType: ChartType = 'bar';

  // ── Bar: Vendor Performance ───────────────────────────────────────────────
  vendorBarOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'rgba(255, 255, 255, 0.4)', stepSize: 1 }
      },
      y: {
        grid: { display: false },
        ticks: { color: 'rgba(255, 255, 255, 0.6)', font: { size: 12 } }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { color: 'rgba(255, 255, 255, 0.7)', font: { family: 'Inter', size: 12 }, usePointStyle: true }
      },
      tooltip: {
        backgroundColor: 'rgba(5, 10, 20, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff'
      }
    }
  };
  vendorBarData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'RTRs',
        backgroundColor: '#FF6B00',
        borderRadius: 6,
      },
      {
        data: [],
        label: 'Submissions',
        backgroundColor: '#0059B3',
        borderRadius: 6,
      },
      {
        data: [],
        label: 'Interviews/Offers',
        backgroundColor: '#4dabff',
        borderRadius: 6,
      }
    ]
  };
  vendorBarType: ChartType = 'bar';

  constructor(private dashboardService: DashboardService, private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.viewingUserId = params['userId'] || undefined;
      this.viewingLabel = this.viewingUserId ? `User Report` : 'My Analytics';
      this.loadData(this.viewingUserId);
    });
  }

  private loadData(userId?: string): void {
    forkJoin({
      summary: this.dashboardService.getDashboardSummary(userId),
      rtrTimeline: this.dashboardService.getRtrTimeline(userId),
      vendors: this.dashboardService.getVendorPerformance(userId)
    }).subscribe({
      next: ({ summary, rtrTimeline, vendors }) => {
        this.summary = summary;
        this.vendorData = vendors;
        this.buildConversionDoughnut(vendors);
        this.buildRtrTimeline(rtrTimeline);
        this.buildVendorBar(vendors);
        this.loading = false;
      },
      error: err => {
        console.error('Analytics error', err);
        this.error = true;
        this.loading = false;
      }
    });
  }

  private buildConversionDoughnut(vendors: VendorPerformance[]): void {
    const filtered = vendors.filter(v => (v.totalRtrs + v.totalSubmissions) > 0);
    this.doughnutData = {
      ...this.doughnutData,
      labels: filtered.map(v => v.vendorCompany),
      datasets: [{
        ...this.doughnutData.datasets[0],
        data: filtered.map(v => this.conversionRate(v))
      }]
    };
  }

  private buildRtrTimeline(timeline: RtrTimelineEntry[]): void {
    this.rtrTimelineData = {
      labels: timeline.map(t => {
        const d = new Date(t.date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [
        { ...this.rtrTimelineData.datasets[0], data: timeline.map(t => t.rtrs) },
        { ...this.rtrTimelineData.datasets[1], data: timeline.map(t => t.submissions) }
      ]
    };
  }

  private buildVendorBar(vendors: VendorPerformance[]): void {
    this.vendorBarData = {
      labels: vendors.map(v => v.vendorCompany),
      datasets: [
        { ...this.vendorBarData.datasets[0], data: vendors.map(v => v.totalRtrs) },
        { ...this.vendorBarData.datasets[1], data: vendors.map(v => v.totalSubmissions) },
        { ...this.vendorBarData.datasets[2], data: vendors.map(v => v.interviewsOrOffers) }
      ]
    };
  }

  conversionRate(vendor: VendorPerformance): number {
    const rtrs = vendor.totalRtrs || 0;
    const subs = vendor.totalSubmissions || 0;
    const interviews = vendor.interviewsOrOffers || 0;
    
    // Fallback: If no interviews, show RTR-to-Submission conversion
    if (rtrs > 0) {
      return Math.round((interviews > 0 ? interviews : subs) / rtrs * 100);
    }
    
    return 0;
  }
}
