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
import { MatChipsModule } from '@angular/material/chips';
import { Router } from '@angular/router';
import { RtrService } from '../../core/services/rtr.service';
import { SubmissionService } from '../../core/services/submission.service';
import { RTR, RTRStatus, RtrVendorGroup } from '../../core/models/rtr.models';
import { SubmissionStatus } from '../../core/models/submission.models';

@Component({
  selector: 'app-rtr',
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
    MatChipsModule
  ],
  templateUrl: './rtr.component.html',
  styleUrl: './rtr.component.scss'
})
export class RtrComponent implements OnInit {
  allRTRs: RTR[] = [];
  filteredRTRs: RTR[] = [];
  vendorGroups: RtrVendorGroup[] = [];
  vendorList: string[] = [];
  selectedVendor = 'All';

  /** 'table' = flat sortable table, 'grouped' = vendor cards */
  viewMode: 'table' | 'grouped' = 'table';

  displayedColumns = [
    'date', 'vendorName', 'vendorCompany', 'clientName',
    'vendorPhone', 'vendorEmail', 'rate', 'role', 'location', 'status', 'actions'
  ];

  groupDisplayedColumns = [
    'date', 'vendorName', 'clientName',
    'vendorPhone', 'vendorEmail', 'rate', 'role', 'location', 'status', 'actions'
  ];

  isLoading = false;
  showForm = false;
  isEdit = false;
  editingId: string | null = null;

  /** Track which RTR IDs have already been pushed to submissions */
  pushedRtrIds = new Set<string>();

  statuses = Object.values(RTRStatus);

  rtrForm: FormGroup;

  constructor(
    private rtrService: RtrService,
    private submissionService: SubmissionService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.rtrForm = this.fb.group({
      date: [new Date(), Validators.required],
      vendorName: [''],
      vendorCompany: ['', Validators.required],
      clientName: [''],
      vendorPhone: [''],
      vendorEmail: [''],
      rate: [null],
      role: ['', Validators.required],
      location: [''],
      status: [RTRStatus.RTR, Validators.required]
    });
  }

  ngOnInit(): void { this.loadRTRs(); }

  loadRTRs(): void {
    this.isLoading = true;
    this.rtrService.getAllRTRs().subscribe({
      next: (rtrs: RTR[]) => {
        this.allRTRs = rtrs;
        this.buildVendorList();
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('Error loading RTRs', 'Close', { duration: 3000 });
      }
    });
  }

  buildVendorList(): void {
    const vendors = this.allRTRs
      .map(r => r.vendorCompany)
      .filter(v => v && v.trim() !== '');
    this.vendorList = [...new Set(vendors)].sort();
  }

  onVendorChange(): void { this.applyFilter(); }

  applyFilter(): void {
    this.filteredRTRs = this.selectedVendor === 'All'
      ? [...this.allRTRs]
      : this.allRTRs.filter(r => r.vendorCompany === this.selectedVendor);
    this.buildVendorGroups();
  }

  buildVendorGroups(): void {
    const map = new Map<string, RTR[]>();
    this.filteredRTRs.forEach(r => {
      const key = r.vendorCompany || 'Unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    this.vendorGroups = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([vendorName, rtrs]) => ({ vendorName, rtrs }));
  }

  openAddForm(): void {
    this.isEdit = false;
    this.editingId = null;
    this.rtrForm.reset({ date: new Date(), status: RTRStatus.RTR });
    this.showForm = true;
    setTimeout(() => document.getElementById('rtr-form-top')?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  openEditForm(rtr: RTR): void {
    this.isEdit = true;
    this.editingId = rtr.id!;
    this.rtrForm.patchValue({ ...rtr, date: rtr.date ? new Date(rtr.date) : new Date() });
    this.showForm = true;
    setTimeout(() => document.getElementById('rtr-form-top')?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  cancelForm(): void {
    this.showForm = false;
    this.isEdit = false;
    this.editingId = null;
    this.rtrForm.reset({ date: new Date(), status: RTRStatus.RTR });
  }

  saveRTR(): void {
    if (this.rtrForm.invalid) return;
    const formValue = this.rtrForm.value;
    const payload: Partial<RTR> = {
      ...formValue,
      date: formValue.date ? this.formatDate(formValue.date) : this.formatDate(new Date())
    };
    const action = this.isEdit && this.editingId
      ? this.rtrService.updateRTR(this.editingId, payload)
      : this.rtrService.createRTR(payload);

    action.subscribe({
      next: (savedRtr: RTR) => {
        this.snackBar.open(`RTR ${this.isEdit ? 'updated' : 'added'}`, 'Close', { duration: 2500 });

        // Auto-push to Submissions if status is 'Submitted'
        if (payload.status === RTRStatus.SUBMITTED && !this.isPushed(savedRtr)) {
          this.pushToSubmission(savedRtr);
        }

        this.cancelForm();
        this.loadRTRs();
      },
      error: () => this.snackBar.open('Error saving RTR', 'Close', { duration: 3000 })
    });
  }

  deleteRTR(rtr: RTR): void {
    if (!confirm('Delete this RTR entry?')) return;
    this.rtrService.deleteRTR(rtr.id!).subscribe({
      next: () => {
        this.snackBar.open('RTR deleted', 'Close', { duration: 2500 });
        this.loadRTRs();
      },
      error: () => this.snackBar.open('Error deleting RTR', 'Close', { duration: 3000 })
    });
  }

  /**
   * Push this RTR entry to the Submissions module.
   * Pre-fills vendor, rate, date and encodes role + client in notes.
   */
  pushToSubmission(rtr: RTR): void {
    if (!rtr.id) return;
    const contextNote = [
      rtr.role ? `Role: ${rtr.role}` : '',
      rtr.clientName ? `Client: ${rtr.clientName}` : '',
      rtr.location ? `Location: ${rtr.location}` : '',
    ].filter(Boolean).join(' | ');

    const submissionPayload = {
      submittedByVendor: rtr.vendorCompany || rtr.vendorName || '',
      vendorPhone: rtr.vendorPhone || '',
      vendorEmail: rtr.vendorEmail || '',
      submissionDate: rtr.date || this.formatDate(new Date()),
      submissionStatus: SubmissionStatus.SUBMITTED,
      rateSubmitted: rtr.rate != null ? `$${rtr.rate}/hr` : '',
      notes: contextNote
    };

    this.submissionService.createSubmission(submissionPayload).subscribe({
      next: () => {
        this.pushedRtrIds.add(rtr.id!);
        this.snackBar.open(
          `✅ Pushed to Submissions — ${rtr.vendorCompany}`,
          'View Submissions',
          { duration: 4000 }
        ).onAction().subscribe(() => this.router.navigate(['/submissions']));
      },
      error: () => this.snackBar.open('Error pushing to submissions', 'Close', { duration: 3000 })
    });
  }

  isPushed(rtr: RTR): boolean {
    return rtr.id ? this.pushedRtrIds.has(rtr.id) : false;
  }

  countByVendor(vendor: string): number {
    return this.allRTRs.filter(r => r.vendorCompany === vendor).length;
  }

  getVendorStatuses(rtrs: RTR[]): { label: string; count: number }[] {
    const counts: Record<string, number> = {};
    rtrs.forEach(r => { const k = r.status || 'Unknown'; counts[k] = (counts[k] || 0) + 1; });
    return Object.entries(counts).map(([label, count]) => ({ label, count }));
  }

  statusClass(status: string): string {
    return (status || '').toLowerCase().replace(/\s+/g, '');
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
