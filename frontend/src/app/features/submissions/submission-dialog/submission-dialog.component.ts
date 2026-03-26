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
import { Submission, SubmissionStatus } from '../../../core/models/submission.models';

@Component({
    selector: 'app-submission-dialog',
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
    templateUrl: './submission-dialog.component.html',
    styleUrl: './submission-dialog.component.scss'
})
export class SubmissionDialogComponent implements OnInit {
    submissionForm: FormGroup;
    submissionStatuses = Object.values(SubmissionStatus);
    isEdit = false;

    constructor(
        private fb: FormBuilder,
        public dialogRef: MatDialogRef<SubmissionDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { submission?: Submission, jobId: string }
    ) {
        this.submissionForm = this.fb.group({
            submissionStatus: [SubmissionStatus.SUBMITTED, Validators.required],
            submissionDate: [new Date()],
            submittedByVendor: [''],
            rateSubmitted: [''],
            followUpDate: [null],
            notes: ['']
        });
    }

    ngOnInit(): void {
        if (this.data.submission) {
            this.isEdit = true;
            this.submissionForm.patchValue({
                ...this.data.submission,
                submissionDate: this.data.submission.submissionDate ? new Date(this.data.submission.submissionDate) : null,
                followUpDate: this.data.submission.followUpDate ? new Date(this.data.submission.followUpDate) : null
            });
        }
    }

    onSave(): void {
        if (this.submissionForm.invalid) return;

        const formValue = this.submissionForm.value;
        const result: Submission = {
            ...formValue,
            id: this.data.submission?.id,
            jobId: this.data.jobId,
            submissionDate: formValue.submissionDate ? this.formatDate(formValue.submissionDate) : null,
            followUpDate: formValue.followUpDate ? this.formatDate(formValue.followUpDate) : null
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
