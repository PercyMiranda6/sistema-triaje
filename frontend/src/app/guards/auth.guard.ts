import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.getToken()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};

export function rolesGuard(...roles: string[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (auth.esRol(...roles)) {
      return true;
    }
    return router.createUrlTree(auth.getToken() ? ['/bandeja'] : ['/login']);
  };
}

function rutaPorRol(usuario: { rol: string } | null): string {
  return usuario?.rol === 'cliente' ? '/nuevo-ticket' : '/bandeja';
}

export function publicGuard(esRegistro = false): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (auth.getToken()) {
      return router.createUrlTree([rutaPorRol(auth.usuario())]);
    }
    return true;
  };
}