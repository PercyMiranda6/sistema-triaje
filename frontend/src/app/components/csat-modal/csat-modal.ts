import { Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EncuestaService } from '../../services/encuesta.service';

@Component({
  selector: 'app-csat-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="csat-backdrop" (click)="cerrar()">
      <div class="csat-card" (click)="$event.stopPropagation()">
        <h2>¿Qué tan satisfecho quedó con la atención?</h2>
        <p class="subtitulo">Califique del 1 (muy insatisfecho) al 5 (muy satisfecho)</p>

        <div class="estrellas">
          @for (e of [1, 2, 3, 4, 5]; track e) {
            <button
              type="button"
              (click)="seleccionar(e)"
              [class.seleccionada]="seleccion === e"
              [attr.aria-label]="'Calificación ' + e"
            >
              {{ e }}
            </button>
          }
        </div>

        @if (!seleccion && enviado === false && intentoEnviar) {
          <p class="error">Seleccione una calificación antes de continuar.</p>
        }

        <label class="campo-label">Comentario (opcional)</label>
        <textarea
          [(ngModel)]="comentario"
          placeholder="Comentario (opcional)"
          rows="3"
          class="textarea"
        ></textarea>

        <div class="acciones">
          <button type="button" class="btn-cancelar" (click)="cerrar()">Cancelar</button>
          <button
            type="button"
            class="btn-enviar"
            [disabled]="!seleccion"
            (click)="enviar()"
          >
            Enviar calificación
          </button>
        </div>

        @if (enviado) {
          <div class="exito">
            <p>¡Gracias por calificar la atención!</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .csat-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        padding: 20px;
      }
      .csat-card {
        background: #fff;
        border-radius: 12px;
        padding: 28px;
        min-width: 320px;
        max-width: 460px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        animation: aparecer 0.25s ease-out;
      }
      @keyframes aparecer {
        from { opacity: 0; transform: translateY(-12px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .csat-card h2 {
        margin: 0 0 6px 0;
        font-size: 1.4rem;
        color: #1f2937;
      }
      .subtitulo {
        margin: 0 0 18px 0;
        color: #6b7280;
        font-size: 0.95rem;
      }
      .estrellas {
        display: flex;
        gap: 10px;
        justify-content: center;
        margin-bottom: 20px;
      }
      .estrellas button {
        width: 48px;
        height: 48px;
        border: 2px solid #d1d5db;
        background: #fff;
        color: #374151;
        font-size: 1.25rem;
        font-weight: 600;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .estrellas button:hover {
        border-color: #f59e0b;
        color: #f59e0b;
      }
      .estrellas button.seleccionada {
        border-color: #f59e0b;
        background: #fef3c7;
        color: #f59e0b;
      }
      .error {
        color: #dc2626;
        font-size: 0.85rem;
        margin-bottom: 12px;
        text-align: center;
      }
      .textarea {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-family: inherit;
        font-size: 0.95rem;
        resize: vertical;
        box-sizing: border-box;
      }
      .textarea:focus {
        outline: none;
        border-color: #2563eb;
      }
      .campo-label {
        display: block;
        margin-bottom: 6px;
        font-weight: 600;
        color: #374151;
        font-size: 0.95rem;
      }
      .acciones {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 20px;
      }
      .btn-cancelar {
        padding: 10px 20px;
        border: 1px solid #d1d5db;
        background: #fff;
        color: #374151;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.95rem;
        transition: background 0.2s;
      }
      .btn-cancelar:hover {
        background: #f3f4f6;
      }
      .btn-enviar {
        padding: 10px 24px;
        border: none;
        background: #2563eb;
        color: #fff;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.95rem;
        font-weight: 600;
        transition: background 0.2s;
      }
      .btn-enviar:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .btn-enviar:not(:disabled):hover {
        background: #1d4ed8;
      }
      .exito {
        margin-top: 16px;
        padding: 14px;
        background: #ecfdf5;
        border: 1px solid #a7f3d0;
        border-radius: 8px;
        text-align: center;
      }
      .exito p {
        margin: 0;
        color: #065f46;
        font-weight: 600;
      }
    `,
  ],
})
export class CsatModalComponent {
  readonly #encuestaSvc = inject(EncuestaService);

  ticketId = input.required<number>();
  cerrado = output<boolean>();

  seleccion: number | null = null;
  comentario = '';
  enviado = false;
  intentoEnviar = false;

  seleccionar(valor: number) {
    this.seleccion = valor;
  }

  async enviar() {
    this.intentoEnviar = true;
    if (!this.seleccion) return;

    try {
      await this.#encuestaSvc
        .responderCsat(this.ticketId(), this.seleccion, this.comentario || undefined)
        .toPromise();
      this.enviado = true;
      setTimeout(() => this.cerrado.emit(true), 1200);
    } catch (err: any) {
      alert(err.error?.error || 'No se pudo enviar la encuesta');
    }
  }

  cerrar() {
    this.cerrado.emit(false);
  }
}
