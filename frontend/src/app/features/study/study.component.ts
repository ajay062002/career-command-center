import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { StudyService } from '../../core/services/study.service';
import { StudySession } from '../../core/models/study.models';

@Component({
  selector: 'app-study',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTableModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './study.component.html',
  styleUrl: './study.component.scss'
})
export class StudyComponent implements OnInit {
  studyForm: FormGroup;
  filterForm: FormGroup;
  sessions: StudySession[] = [];
  displayedColumns: string[] = ['date', 'topic', 'subTopic', 'minutes', 'confidence', 'difficulty', 'actions'];

  // Summary Stats
  totalMinutes = 0;
  studyStreak = 0;
  topTopic = '-';
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private studyService: StudyService,
    private snackBar: MatSnackBar
  ) {
    this.studyForm = this.fb.group({
      date: [new Date(), Validators.required],
      topic: ['', Validators.required],
      subTopic: [''],
      timeSpentMinutes: [null, [Validators.required, Validators.min(1)]],
      source: [''],
      difficulty: [null],
      confidence: [null],
      notes: ['']
    });

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);

    this.filterForm = this.fb.group({
      start: [start, Validators.required],
      end: [end, Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    if (this.filterForm.invalid) return;

    this.isLoading = true;
    const start = this.formatDate(this.filterForm.value.start);
    const end = this.formatDate(this.filterForm.value.end);

    this.studyService.getSessionsBetween(start, end).subscribe({
      next: (sessions) => {
        this.sessions = sessions;
        this.calculateStats();
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.snackBar.open('Error loading study sessions', 'Close', { duration: 3000 });
      }
    });
  }

  onSubmit(): void {
    if (this.studyForm.invalid) return;

    const formValue = this.studyForm.value;
    const dto: StudySession = {
      ...formValue,
      date: this.formatDate(formValue.date)
    };

    this.studyService.createSession(dto).subscribe({
      next: () => {
        this.snackBar.open('Study session logged!', 'Close', { duration: 3000 });
        this.studyForm.reset({
          date: new Date(),
          topic: '',
          subTopic: '',
          timeSpentMinutes: null,
          source: '',
          difficulty: null,
          confidence: null,
          notes: ''
        });
        this.loadData();
      },
      error: (err) => {
        this.snackBar.open('Error saving session', 'Close', { duration: 3000 });
      }
    });
  }

  private calculateStats(): void {
    // Total Minutes
    this.totalMinutes = this.sessions.reduce((acc, s) => acc + s.timeSpentMinutes, 0);

    // Top Topic
    const topicMinutes: Record<string, number> = {};
    this.sessions.forEach(s => {
      topicMinutes[s.topic] = (topicMinutes[s.topic] || 0) + s.timeSpentMinutes;
    });

    let maxMin = 0;
    this.topTopic = '-';
    for (const topic in topicMinutes) {
      if (topicMinutes[topic] > maxMin) {
        maxMin = topicMinutes[topic];
        this.topTopic = topic;
      }
    }

    // Streak Calculation
    // Group minutes by date
    const dailyMinutes: Record<string, number> = {};
    this.sessions.forEach(s => {
      dailyMinutes[s.date] = (dailyMinutes[s.date] || 0) + s.timeSpentMinutes;
    });

    this.studyStreak = this.calculateStreak(dailyMinutes);
  }

  private calculateStreak(dailyMinutes: Record<string, number>): number {
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let checkDate = new Date(today);

    // Check if user studied today OR yesterday to continue streak
    // If they haven't studied today yet, the streak remains from yesterday
    const todayStr = this.formatDate(today);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = this.formatDate(yesterday);

    if (dailyMinutes[todayStr] < 30 && dailyMinutes[yesterdayStr] < 30) {
      return 0;
    }

    // Start checking back from today
    if (dailyMinutes[todayStr] < 30) {
      checkDate.setDate(today.getDate() - 1);
    }

    while (true) {
      const dateStr = this.formatDate(checkDate);
      if (dailyMinutes[dateStr] >= 30) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
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

  get totalHours(): string {
    return (this.totalMinutes / 60).toFixed(1);
  }
}
