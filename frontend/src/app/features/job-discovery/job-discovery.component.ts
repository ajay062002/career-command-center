import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Inject } from '@angular/core';
import { Router } from '@angular/router';
import { JobDiscoveryService, ScrapedJob } from '../../core/services/job-discovery.service';

@Component({
    selector: 'app-job-info-dialog',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
    template: `
    <div class="glass-dialog-container">
        <div class="dialog-header">
            <h2 mat-dialog-title>{{ data.title }}</h2>
            <div class="header-badges">
                <span class="source-badge">{{ data.source }}</span>
                <span class="location-badge"><mat-icon>place</mat-icon> {{ data.location }}</span>
            </div>
        </div>
        
        <mat-dialog-content class="premium-content">
            <div class="vendor-card">
                <mat-icon color="accent">contact_mail</mat-icon>
                <div class="vendor-info">
                    <strong>Vendor / Recruiter:</strong>
                    <span>{{ data.company }}</span>
                </div>
            </div>

            <div class="jd-section">
                <h3>Full Job Details & Contact Info</h3>
                <div class="jd-text-formatted">{{ data.summary }}</div>
            </div>
        </mat-dialog-content>

        <mat-dialog-actions align="end" class="dialog-footer">
            <button mat-button mat-dialog-close class="cancel-btn">Close</button>
            <button mat-raised-button color="accent" class="apply-btn" (click)="onApply()">
                <mat-icon>mail_outline</mat-icon> Draft Email & Apply
            </button>
        </mat-dialog-actions>
    </div>
    `,
    styles: [`
        .glass-dialog-container { padding: 25px; background: rgba(15, 23, 42, 0.9); }
        .dialog-header h2 { font-weight: 800; font-size: 1.5rem; margin-bottom: 8px; color: #fb923c; }
        .header-badges { display: flex; gap: 10px; margin-bottom: 20px; }
        .source-badge { background: rgba(59, 130, 246, 0.2); color: #60a5fa; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
        .location-badge { color: rgba(255, 255, 255, 0.5); font-size: 0.8rem; display: flex; align-items: center; gap: 4px; }
        .premium-content::-webkit-scrollbar { width: 6px; }
        .premium-content::-webkit-scrollbar-thumb { background: rgba(251, 146, 60, 0.3); border-radius: 10px; }
        .vendor-card { display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 25px; }
        .vendor-info { display: flex; flex-direction: column; }
        .vendor-info strong { font-size: 0.75rem; text-transform: uppercase; color: rgba(255,255,255,0.4); }
        .jd-section h3 { font-size: 1rem; font-weight: 700; margin-bottom: 12px; color: #f1f5f9; }
        .jd-text-formatted { white-space: pre-wrap; font-size: 0.95rem; line-height: 1.8; color: #cbd5e1; background: rgba(0,0,0,0.3); padding: 20px; border-radius: 15px; border: 1px solid rgba(255,255,255,0.05); }
        .dialog-footer { padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.05); }
        .apply-btn { height: 48px; padding: 0 25px; border-radius: 12px; font-weight: 700; box-shadow: 0 4px 14px rgba(251, 146, 60, 0.4); }
        .cancel-btn { color: rgba(255, 255, 255, 0.5); }
    `]
})
export class JobInfoDialogComponent {
    constructor(
        @Inject(MAT_DIALOG_DATA) public data: ScrapedJob,
        private router: Router,
        private dialogRef: MatDialogRef<JobInfoDialogComponent>
    ) { }

    onApply() {
        this.dialogRef.close();
        this.router.navigate(['/resume-builder'], {
            queryParams: { jd: this.data.summary, email: this.data.summary.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] }
        });
    }
}

@Component({
    selector: 'app-job-discovery',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatInputModule,
        MatFormFieldModule,
        FormsModule,
        MatSnackBarModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatDialogModule,
        JobInfoDialogComponent
    ],
    templateUrl: './job-discovery.component.html',
    styleUrl: './job-discovery.component.scss'
})
export class JobDiscoveryComponent implements OnInit {
    jobs: ScrapedJob[] = [];
    keyword: string = 'Java Developer';
    location: string = 'United States';
    isScraping: boolean = false;
    isLoading: boolean = false;

    constructor(
        private jobDiscoveryService: JobDiscoveryService,
        private snackBar: MatSnackBar,
        private dialog: MatDialog,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadJobs();
    }

    loadJobs(): void {
        this.isLoading = true;
        this.jobDiscoveryService.getScrapedJobs().subscribe({
            next: (data) => {
                this.jobs = data.content || data.results || data;
                this.isLoading = false;
            },
            error: (err) => {
                console.error(err);
                this.snackBar.open('Error loading jobs', 'Close', { duration: 3000 });
                this.isLoading = false;
            }
        });
    }

    onRefresh(): void {
        this.isScraping = true;
        this.jobDiscoveryService.scrapeJobs(this.keyword, this.location).subscribe({
            next: (res) => {
                this.isScraping = false;
                this.snackBar.open(`Found ${res.count} jobs. ${res.new_jobs} new items added!`, 'Close', { duration: 5000 });
                this.loadJobs();
            },
            error: (err) => {
                console.error(err);
                this.isScraping = false;
                this.snackBar.open('LinkedIn Scraper failed. Check backend logs.', 'Close', { duration: 5000 });
            }
        });
    }

    promoteToJobTracker(job: ScrapedJob): void {
        this.jobDiscoveryService.promoteJob(job.id).subscribe({
            next: () => {
                this.snackBar.open('Job added to Tracker!', 'View', { duration: 3000 });
            },
            error: (err) => {
                console.error(err);
                this.snackBar.open('Failed to promote job.', 'Close', { duration: 3000 });
            }
        });
    }

    openJobInfo(job: ScrapedJob): void {
        this.dialog.open(JobInfoDialogComponent, {
            data: job,
            width: '600px',
            maxWidth: '95vw',
            panelClass: 'glass-dialog'
        });
    }

    applyJob(job: ScrapedJob): void {
        // Navigate to resume builder with JD and lead info
        this.router.navigate(['/resume-builder'], {
            queryParams: {
                jd: job.summary,
                title: job.title,
                source: job.source,
                link: job.link
            }
        });
    }

    deleteJob(id: string): void {
        this.jobDiscoveryService.deleteJob(id).subscribe({
            next: () => {
                this.jobs = this.jobs.filter(j => j.id !== id);
                this.snackBar.open('Job removed.', 'Close', { duration: 2000 });
            }
        });
    }

    isNew(job: ScrapedJob): boolean {
        const scrapedDate = new Date(job.scrapedAt).getTime();
        const now = new Date().getTime();
        return (now - scrapedDate) < (1000 * 60 * 2); // 2 minutes window
    }

    openLink(url: string): void {
        window.open(url, '_blank');
    }
}
