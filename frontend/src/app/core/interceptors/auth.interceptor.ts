import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const user = authService.getCurrentUser();
    const token = user ? user.token : null;

    if (token) {
        const cloned = req.clone({
            setHeaders: {
                Authorization: `Token ${token}`
            }
        });
        return next(cloned);
    }
    return next(req);
};
