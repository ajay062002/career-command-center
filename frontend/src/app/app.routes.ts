import { Routes } from '@angular/router';
import { AuthGuard } from './auth/auth.guard';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
    },
    {
        path: '',
        loadComponent: () => import('./layout/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
        canActivate: [AuthGuard],
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
            },
            {
                path: 'jobs',
                children: [
                    { path: '', loadComponent: () => import('./features/jobs/jobs.component').then(m => m.JobsComponent) },
                    { path: 'add', loadComponent: () => import('./features/jobs/job-form/job-form.component').then(m => m.JobFormComponent) },
                    { path: 'edit/:id', loadComponent: () => import('./features/jobs/job-form/job-form.component').then(m => m.JobFormComponent) }
                ]
            },
            {
                path: 'job-discovery',
                loadComponent: () => import('./features/job-discovery/job-discovery.component').then(m => m.JobDiscoveryComponent)
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
                path: 'resume-builder',
                loadComponent: () => import('./features/resume-builder/resume-builder.component').then(m => m.ResumeBuilderComponent)
            },
            {
                path: 'profile',
                loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
            },
            {
                path: 'f1-game',
                loadComponent: () => import('./features/f1-game/f1-game.component').then(m => m.F1GameComponent)
            },
            {
                path: 'admin',
                loadComponent: () => import('./features/admin/user-management/user-management.component').then(m => m.UserManagementComponent)
            },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
    },
    { path: '**', redirectTo: 'dashboard' }
];
