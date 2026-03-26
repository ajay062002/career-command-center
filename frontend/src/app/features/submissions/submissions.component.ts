import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { forkJoin } from 'rxjs';
import { SubmissionService } from '../../core/services/submission.service';
import { RtrService } from '../../core/services/rtr.service';
import { JobService } from '../../core/services/job.service';
import { Submission, SubmissionStatus, VendorGroup } from '../../core/models/submission.models';
import { RTR } from '../../core/models/rtr.models';
import { Job } from '../../core/models/job.models';

@Component({
  selector: 'app-submissions',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatExpansionModule,
    MatBadgeModule,
    MatChipsModule,
    MatAutocompleteModule
  ],
  templateUrl: './submissions.component.html',
  styleUrl: './submissions.component.scss'
})
export class SubmissionsComponent implements OnInit {
  allSubmissions: Submission[] = [];
  filteredSubmissions: Submission[] = [];
  vendorGroups: VendorGroup[] = [];
  vendorList: string[] = [];
  selectedVendor: string = 'All';
  selectedStatus: string = 'All';
  isLoading = false;
  showForm = false;
  isEdit = false;
  editingId: string | null = null;
  viewMode: 'grouped' | 'table' = 'grouped';
  allRtrs: RTR[] = [];
  allJobs: Job[] = [];

  displayedColumns: string[] = [
    'submissionDate', 'submissionStatus', 'rtrContext', 'rateSubmitted', 'followUpDate', 'notes', 'actions'
  ];

  groupDisplayedColumns: string[] = [
    'submissionDate', 'submissionStatus', 'rtrContext', 'rateSubmitted', 'followUpDate', 'notes', 'actions'
  ];

  statuses = Object.values(SubmissionStatus);
  allStatuses = ['All', ...Object.values(SubmissionStatus)];

  submissionForm: FormGroup;

  constructor(
    private submissionService: SubmissionService,
    private rtrService: RtrService,
    private jobService: JobService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.submissionForm = this.fb.group({
      submittedByVendor: ['', Validators.required],
      submissionDate: [new Date(), Validators.required],
      submissionStatus: [SubmissionStatus.SUBMITTED, Validators.required],
      rateSubmitted: [''],
      followUpDate: [null],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    forkJoin({
      subs: this.submissionService.getAllSubmissions(),
      rtrs: this.rtrService.getAllRTRs(),
      jobs: this.jobService.getAllJobs(0, 100) // Added page/size arguments
    }).subscribe({
      next: ({ subs, rtrs, jobs }) => {
        this.allSubmissions = subs;
        this.allRtrs = rtrs;
        this.allJobs = Array.isArray(jobs) ? jobs : (jobs as any).content || [];
        this.buildVendorList();
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('Error loading data', 'Close', { duration: 3000 });
      }
    });
  }

  buildVendorList(): void {
    const submissionVendors = this.allSubmissions.map(s => s.submittedByVendor || 'Unknown Vendor');
    const rtrVendors = this.allRtrs.map(r => r.vendorCompany).filter(v => !!v);
    const jobVendors = this.allJobs.map(j => j.vendorCompany).filter(v => !!v);

    // Combine and remove falsy/Unknown values
    const combined = [...submissionVendors, ...rtrVendors, ...jobVendors]
      .filter((v): v is string => v != null && v.trim() !== '' && v !== 'Unknown Vendor');

    this.vendorList = [...new Set(combined)].sort();
  }

  applyFilter(): void {
    let filtered = [...this.allSubmissions];
    if (this.selectedVendor !== 'All') {
      filtered = filtered.filter(s => (s.submittedByVendor || 'Unknown Vendor') === this.selectedVendor);
    }
    if (this.selectedStatus !== 'All') {
      filtered = filtered.filter(s => s.submissionStatus === this.selectedStatus);
    }
    this.filteredSubmissions = filtered;
    this.buildVendorGroups();
  }

  buildVendorGroups(): void {
    const grouped = this.filteredSubmissions.reduce((acc, sub) => {
      const vendor = sub.submittedByVendor || 'Unknown Vendor';
      if (!acc[vendor]) acc[vendor] = [];
      acc[vendor].push(sub);
      return acc;
    }, {} as Record<string, Submission[]>);

    this.vendorGroups = Object.keys(grouped).sort().map(vendor => ({
      vendorName: vendor,
      submissions: grouped[vendor]
    }));
  }

  onVendorChange(): void { this.applyFilter(); }
  onStatusChange(): void { this.applyFilter(); }

  clearFilters(): void {
    this.selectedVendor = 'All';
    this.selectedStatus = 'All';
    this.applyFilter();
  }

  get hasActiveFilter(): boolean {
    return this.selectedVendor !== 'All' || this.selectedStatus !== 'All';
  }

  countByVendor(vendor: string): number {
    return this.allSubmissions.filter(s => (s.submittedByVendor || 'Unknown Vendor') === vendor).length;
  }

  countByStatus(status: string): number {
    return this.allSubmissions.filter(s => s.submissionStatus === status).length;
  }

  openAddForm(): void {
    this.isEdit = false;
    this.editingId = null;
    this.submissionForm.reset({ submissionDate: new Date(), submissionStatus: SubmissionStatus.SUBMITTED });
    this.showForm = true;
  }

  openEditForm(sub: Submission): void {
    this.isEdit = true;
    this.editingId = sub.id!;
    this.submissionForm.patchValue({
      ...sub,
      submissionDate: sub.submissionDate ? new Date(sub.submissionDate) : new Date(),
      followUpDate: sub.followUpDate ? new Date(sub.followUpDate) : null
    });
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.isEdit = false;
    this.editingId = null;
    this.submissionForm.reset({ submissionDate: new Date(), submissionStatus: SubmissionStatus.SUBMITTED });
  }

  saveSubmission(): void {
    if (this.submissionForm.invalid) return;
    const fv = this.submissionForm.value;
    const payload: Partial<Submission> = {
      ...fv,
      submissionDate: fv.submissionDate ? this.formatDate(fv.submissionDate) : this.formatDate(new Date()),
      followUpDate: fv.followUpDate ? this.formatDate(fv.followUpDate) : undefined
    };
    const action = this.isEdit && this.editingId
      ? this.submissionService.updateSubmission(this.editingId, payload)
      : this.submissionService.createSubmission(payload);

    action.subscribe({
      next: () => {
        this.snackBar.open(`Submission ${this.isEdit ? 'updated' : 'added'}`, 'Close', { duration: 2500 });
        this.cancelForm();
        this.loadData();
      },
      error: () => this.snackBar.open('Error saving submission', 'Close', { duration: 3000 })
    });
  }

  deleteSubmission(sub: Submission): void {
    if (!confirm('Delete this submission?')) return;
    this.submissionService.deleteSubmission(sub.id!).subscribe({
      next: () => {
        this.snackBar.open('Submission deleted', 'Close', { duration: 2500 });
        this.loadData();
      },
      error: () => this.snackBar.open('Error deleting submission', 'Close', { duration: 3000 })
    });
  }

  getVendorStatuses(subs: Submission[]): { label: string; count: number }[] {
    const counts: Record<string, number> = {};
    subs.forEach(s => {
      const key = s.submissionStatus || 'UNKNOWN';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([label, count]) => ({ label, count }));
  }

  getFollowUpBadge(date?: string, status?: SubmissionStatus): string {
    if (!date || status === SubmissionStatus.REJECTED) return '';
    const followUp = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    followUp.setHours(0, 0, 0, 0);
    if (followUp < today) return 'overdue';
    if (followUp.getTime() === today.getTime()) return 'today';
    return '';
  }

  getRtrContext(sub: Submission): string {
    const notes = sub.notes || '';
    if (notes.includes('Role:') || notes.includes('Client:')) {
      return notes.split('|')[0]?.replace('Role:', '').trim() || '';
    }
    return '';
  }

  isFromRtr(sub: Submission): boolean {
    const notes = sub.notes || '';
    return notes.includes('Role:') || notes.includes('Client:');
  }

  filterByVendor(vendor: string): void {
    this.selectedVendor = vendor;
    this.applyFilter();
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }
}
