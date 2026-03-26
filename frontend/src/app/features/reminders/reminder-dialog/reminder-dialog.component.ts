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
import { Reminder, ReminderType } from '../../../core/models/reminder.models';
import { Job } from '../../../core/models/job.models';

@Component({
  selector: 'app-reminder-dialog',
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
  templateUrl: './reminder-dialog.component.html',
  styleUrl: './reminder-dialog.component.scss'
})
export class ReminderDialogComponent implements OnInit {
  reminderForm: FormGroup;
  reminderTypes = Object.values(ReminderType);
  jobs: Job[] = [];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ReminderDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { jobs: Job[] }
  ) {
    this.jobs = data.jobs;
    this.reminderForm = this.fb.group({
      jobId: [null],
      type: [ReminderType.FOLLOW_UP, Validators.required],
      title: ['', Validators.required],
      dueDate: [new Date(), Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void { }

  onSave(): void {
    if (this.reminderForm.invalid) return;

    const formValue = this.reminderForm.value;
    const result: Reminder = {
      ...formValue,
      dueDate: this.formatDate(formValue.dueDate),
      completed: false
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
