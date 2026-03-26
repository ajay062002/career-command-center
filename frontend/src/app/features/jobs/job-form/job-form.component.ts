import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { JobService } from '../../../core/services/job.service';
import { Job, JobStatus, WorkMode } from '../../../core/models/job.models';

@Component({
  selector: 'app-job-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule
  ],
  templateUrl: './job-form.component.html',
  styleUrl: './job-form.component.scss'
})
export class JobFormComponent implements OnInit {
  jobForm: FormGroup;
  isEditMode = false;
  jobId?: string;

  jobStatuses = Object.values(JobStatus);
  workModes = Object.values(WorkMode);

  constructor(
    private fb: FormBuilder,
    private jobService: JobService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.jobForm = this.fb.group({
      jobTitle: ['', Validators.required],
      companyName: ['', Validators.required],
      vendorCompany: [''],
      workMode: [WorkMode.REMOTE, Validators.required],
      status: [JobStatus.APPLIED, Validators.required],
      appliedDate: [new Date()],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.jobId = this.route.snapshot.params['id'];
    if (this.jobId) {
      this.isEditMode = true;
      this.loadJob();
    }
  }

  loadJob(): void {
    this.jobService.getJobById(this.jobId!).subscribe({
      next: (job) => {
        this.jobForm.patchValue({
          ...job,
          appliedDate: job.appliedDate ? new Date(job.appliedDate) : null
        });
      },
      error: (err) => {
        this.snackBar.open('Error loading job details', 'Close', { duration: 3000 });
        this.router.navigate(['/jobs']);
      }
    });
  }

  onSubmit(): void {
    if (this.jobForm.invalid) return;

    const jobData: Job = {
      ...this.jobForm.value,
      appliedDate: this.jobForm.value.appliedDate ? this.formatDate(this.jobForm.value.appliedDate) : null
    };

    const action = this.isEditMode
      ? this.jobService.updateJob(this.jobId!, jobData)
      : this.jobService.createJob(jobData);

    action.subscribe({
      next: () => {
        this.snackBar.open(`Job ${this.isEditMode ? 'updated' : 'created'} successfully`, 'Close', { duration: 3000 });
        this.router.navigate(['/jobs']);
      },
      error: (err) => {
        this.snackBar.open('Error saving job', 'Close', { duration: 3000 });
        console.error(err);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/jobs']);
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  }
}
