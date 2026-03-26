import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReminderService } from '../../core/services/reminder.service';
import { JobService } from '../../core/services/job.service';
import { Reminder, ReminderType } from '../../core/models/reminder.models';
import { Job, JobPage } from '../../core/models/job.models';
import { ReminderDialogComponent } from './reminder-dialog/reminder-dialog.component';

@Component({
  selector: 'app-reminders',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './reminders.component.html',
  styleUrl: './reminders.component.scss'
})
export class RemindersComponent implements OnInit {
  reminders: Reminder[] = [];
  jobs: Job[] = [];
  jobMap: Record<string, string> = {};
  displayedColumns: string[] = ['dueDate', 'type', 'title', 'job', 'actions'];
  isLoading = false;
  viewMode: 'table' | 'cards' = 'table';

  constructor(
    private reminderService: ReminderService,
    private jobService: JobService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadJobs();
    this.loadReminders();
  }

  loadJobs(): void {
    this.jobService.getAllJobs(0, 100).subscribe({
      next: (response: JobPage) => {
        this.jobs = response.content;
        this.jobs.forEach(j => {
          this.jobMap[j.id!] = `${j.jobTitle} - ${j.companyName}`;
        });
      }
    });
  }

  loadReminders(): void {
    this.isLoading = true;
    this.reminderService.getOverdueReminders().subscribe({
      next: (data) => {
        this.reminders = data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('Error loading reminders', 'Close', { duration: 3000 });
      }
    });
  }

  openAddDialog(): void {
    const dialogRef = this.dialog.open(ReminderDialogComponent, {
      width: '500px',
      data: { jobs: this.jobs }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.saveReminder(result);
      }
    });
  }

  saveReminder(reminder: Reminder): void {
    this.reminderService.createReminder(reminder).subscribe({
      next: () => {
        this.snackBar.open('Reminder created!', 'Close', { duration: 3000 });
        this.loadReminders();
      },
      error: () => {
        this.snackBar.open('Error creating reminder', 'Close', { duration: 3000 });
      }
    });
  }

  onComplete(reminder: Reminder): void {
    if (!reminder.id) return;

    this.reminderService.markComplete(reminder.id).subscribe({
      next: () => {
        this.snackBar.open('Reminder completed!', 'Close', { duration: 3000 });
        this.loadReminders();
      },
      error: () => {
        this.snackBar.open('Error completing reminder', 'Close', { duration: 3000 });
      }
    });
  }

  getBadgeClass(dateStr: string): string {
    const due = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    if (due < today) return 'overdue';
    if (due.getTime() === today.getTime()) return 'today';
    return '';
  }

  getBadgeText(dateStr: string): string {
    const badge = this.getBadgeClass(dateStr);
    if (badge === 'overdue') return 'Overdue';
    if (badge === 'today') return 'Due Today';
    return '';
  }
}
