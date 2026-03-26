import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { JobService } from '../../core/services/job.service';
import { Job, JobStatus } from '../../core/models/job.models';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDialogModule
  ],
  templateUrl: './jobs.component.html',
  styleUrl: './jobs.component.scss'
})
export class JobsComponent implements OnInit {
  displayedColumns: string[] = ['jobTitle', 'companyName', 'vendorCompany', 'status', 'appliedDate', 'actions'];
  dataSource: Job[] = [];
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;
  isLoading = false;

  searchTerm = '';
  statusFilter = '';
  jobStatuses = Object.values(JobStatus);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private jobService: JobService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.loadJobs();
  }

  loadJobs(): void {
    this.isLoading = true;
    this.jobService.getAllJobs(this.pageIndex, this.pageSize).subscribe({
      next: (response) => {
        this.dataSource = response.content;
        this.totalElements = response.totalElements;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.snackBar.open('Error loading jobs', 'Close', { duration: 3000 });
        console.error(err);
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadJobs();
  }

  applyFilter(): void {
    // Note: In a real app, this might be server-side. 
    // For now, we'll just reload if it were server-side, 
    // but the user requested client-side filtering initially.
    // However, since we have server-side pagination, 
    // client-side filtering only works on the current page.
    // I'll implement a simple local filter for the current view.
  }

  get filteredDataSource(): Job[] {
    return this.dataSource.filter(job => {
      const matchesSearch = !this.searchTerm ||
        job.jobTitle.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        job.companyName.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesStatus = !this.statusFilter || job.status === this.statusFilter;
      return matchesSearch && matchesStatus;
    });
  }

  addJob(): void {
    this.router.navigate(['/jobs/add']);
  }

  editJob(job: Job): void {
    this.router.navigate(['/jobs/edit', job.id]);
  }

  deleteJob(job: Job): void {
    if (confirm(`Are you sure you want to delete ${job.jobTitle}?`)) {
      this.jobService.deleteJob(job.id!).subscribe({
        next: () => {
          this.snackBar.open('Job deleted successfully', 'Close', { duration: 3000 });
          this.loadJobs();
        },
        error: (err) => {
          this.snackBar.open('Error deleting job', 'Close', { duration: 3000 });
          console.error(err);
        }
      });
    }
  }
}
