import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
    {
        path: '',
        component: MainLayoutComponent,
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            {
                path: 'dashboard',
                loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
            },
            {
                path: 'jobs',
                loadComponent: () => import('./features/jobs/jobs.component').then(m => m.JobsComponent)
            },
            {
                path: 'rtr',
                loadComponent: () => import('./features/rtr/rtr.component').then(m => m.RtrComponent)
            },
            {
                path: 'submissions',
                loadComponent: () => import('./features/submissions/submissions.component').then(m => m.SubmissionsComponent)
            },
            {
                path: 'study',
                loadComponent: () => import('./features/study/study.component').then(m => m.StudyComponent)
            },
            {
                path: 'reminders',
                loadComponent: () => import('./features/reminders/reminders.component').then(m => m.RemindersComponent)
            },
            {
                path: 'analytics',
                loadComponent: () => import('./features/analytics/analytics.component').then(m => m.AnalyticsComponent)
            },
            {
                path: 'resume-profile',
                loadComponent: () => import('./features/resume-profile/resume-profile.component').then(m => m.ResumeProfileComponent)
            },
        ]
    }
];
