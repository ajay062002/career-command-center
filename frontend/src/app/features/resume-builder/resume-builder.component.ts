import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute } from '@angular/router';
import { ResumeService } from '../../core/services/resume.service';

@Component({
    selector: 'app-resume-builder',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatSnackBarModule,
        MatProgressBarModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './resume-builder.component.html',
    styleUrls: ['./resume-builder.component.scss']
})
export class ResumeBuilderComponent implements OnInit {
    jdText: string = '';
    jsonContent: string = '';
    vendorEmail: string = '';
    uploadedFileName: string = '';

    isGenerating = false;
    isLoading = true;

    constructor(
        private resumeService: ResumeService,
        private snackBar: MatSnackBar,
        private route: ActivatedRoute
    ) { }

    ngOnInit(): void {
        this.loadBaseContent();
        this.route.queryParams.subscribe(params => {
            if (params['jd'] || params['email']) {
                this.jdText = params['jd'] || '';
                this.vendorEmail = params['email'] || '';
                this.snackBar.open('Opportunity data loaded!', 'OK', { duration: 3000 });
            }
        });
    }

    loadBaseContent(): void {
        this.isLoading = true;
        this.resumeService.getBaseContent().subscribe({
            next: (data) => {
                this.jsonContent = JSON.stringify(data, null, 4);
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error loading resume content', err);
                this.snackBar.open('Error loading resume content.', 'Close', { duration: 3000 });
                this.isLoading = false;
            }
        });
    }

    draftEmail(): void {
        this.resumeService.draftEmail(this.jdText).subscribe({
            next: (res) => {
                if (res.status === 'success' || res.url) {
                    window.open(res.url, '_blank');
                    this.snackBar.open('✅ Gmail draft opened!', 'Close', { duration: 3000 });
                }
            },
            error: (err) => {
                console.error('Error drafting email', err);
                this.snackBar.open('❌ Failed to open Gmail draft.', 'Close', { duration: 3000 });
            }
        });
    }

    onJsonFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;
        const file = input.files[0];
        this.uploadedFileName = file.name;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                JSON.parse(text); // validate
                this.jsonContent = text;
                this.snackBar.open(`✅ Loaded ${file.name}`, 'OK', { duration: 3000 });
            } catch {
                this.snackBar.open('❌ Invalid JSON file', 'Close', { duration: 3000 });
                this.uploadedFileName = '';
            }
        };
        reader.readAsText(file);
        input.value = ''; // reset so same file can be re-selected
    }

    generateResume(): void {
        try {
            const parsedContent = JSON.parse(this.jsonContent);
            this.isGenerating = true;
            this.resumeService.generateResume(parsedContent).subscribe({
                next: (blob: Blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'Ajay_Purshotam_Thota.docx';
                    a.click();
                    URL.revokeObjectURL(url);
                    this.snackBar.open('✅ Resume downloaded!', 'Close', { duration: 5000 });
                    this.isGenerating = false;
                },
                error: (err) => {
                    console.error('Error generating resume', err);
                    this.snackBar.open('❌ System Error: Could not generate resume.', 'Close', { duration: 5000 });
                    this.isGenerating = false;
                }
            });
        } catch (e) {
            this.snackBar.open('❌ Invalid JSON format', 'Close', { duration: 3000 });
        }
    }
}
