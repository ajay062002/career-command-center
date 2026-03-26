import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { RTR } from '../../../core/models/rtr.models';
import { Job } from '../../../core/models/job.models';

@Component({
  selector: 'app-rtr-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './rtr-dialog.component.html',
  styleUrl: './rtr-dialog.component.scss'
})
export class RtrDialogComponent implements OnInit {
  rtrForm: FormGroup;
  isEdit = false;

  // Status dropdown values
  statuses = ['Submitted', 'Interview', 'Rejected', 'Hold'];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<RtrDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { rtr?: RTR, job?: Job, jobId: string }
  ) {
    this.rtrForm = this.fb.group({
      date: [new Date(), Validators.required],
      vendorName: [''],
      vendorCompany: ['', Validators.required],
      clientName: [''],
      vendorContact: [''],
      rate: [null],
      role: ['', Validators.required],
      location: [''],
      status: ['Submitted', Validators.required]
    });
  }

  ngOnInit(): void {
    if (this.data.rtr) {
      this.isEdit = true;
      this.rtrForm.patchValue({
        ...this.data.rtr,
        date: this.data.rtr.date ? new Date(this.data.rtr.date) : new Date()
      });
    } else if (this.data.job) {
      // Autofill logic for new RTR
      this.autofillFromJob(this.data.job);
    }
  }

  autofillFromJob(job: Job): void {
    this.rtrForm.patchValue({
      role: job.jobTitle,
      location: job.location,
      vendorCompany: job.vendorCompany
    });
  }

  onSave(): void {
    if (this.rtrForm.invalid) return;

    const formValue = this.rtrForm.value;
    const result: RTR = {
      ...formValue,
      id: this.data.rtr?.id,
      jobId: this.data.jobId,
      date: formValue.date ? this.formatDate(formValue.date) : this.formatDate(new Date())
    };

    this.dialogRef.close(result);
  }

  onCancel(): void {
    this.dialogRef.close();
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
