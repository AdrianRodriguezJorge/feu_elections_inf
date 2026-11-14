# Elecciones FEU — Facultad de Ingeniería Informática

[![CI](https://github.com/AdrianRodriguezJorge/feu_elections_inf/actions/workflows/ci.yml/badge.svg)](https://github.com/AdrianRodriguezJorge/feu_elections_inf/actions/workflows/ci.yml)

Sistema web para la elección del **Secretariado de la Facultad de Ingeniería Informática** de la FEU (Federación Estudiantil Universitaria, Cuba).

## Documentación

La especificación completa está en [`docs/migracion-web/`](docs/migracion-web/):

| Documento | Contenido |
|---|---|
| [`08-marco-legal-feu.md`](docs/migracion-web/08-marco-legal-feu.md) | Análisis del Reglamento de la FEU, reglas `RGF-01`–`RGF-34`, modelo de dominio generalizado, escalabilidad |
| [`09-plan-implementacion-facultad.md`](docs/migracion-web/09-plan-implementacion-facultad.md) | Plan de implementación v1: alcance, estados, roles, arquitectura, fases F0–F8, pruebas |
| [`10-acta-f0-y-matriz-trazabilidad.md`](docs/migracion-web/10-acta-f0-y-matriz-trazabilidad.md) | Acta de F0, decisiones cerradas, alcance congelado y matriz RGF → prueba |
| [`11-decisiones-tecnicas-f1.md`](docs/migracion-web/11-decisiones-tecnicas-f1.md) | Decisiones técnicas de F1: estructura de carpetas, enums, restricciones de base de datos |
| [`../handout-continuidad.md`](docs/handout-continuidad.md) | Handout de continuidad con prompt listo para otra IA |

## Reglas del negocio en una línea

- Los puestos se **derivan**: `N = candidatos − 2`. La demo carga 11 candidatos → 9 puestos.
- Boleta: hasta `N` miembros y **exactamente 1** presidente, que debe estar entre los marcados.
- **No hay voto en blanco.** 0 marcas es inválida; el elector puede confirmarla como anulada en dos pasos.
- Participación = válidas + anuladas. Solo las **válidas** suman votos.
- Quórum: **más del 85 %**. Empate: votos de presidente; si persiste, nueva votación.
- Voto **secreto**: la boleta no guarda identidad del votante.

## Arranque rápido

Requisitos: Node 24 y PostgreSQL (local, instalado como servicio).

```bash
npm install
cp .env.example .env          # ajustar DATABASE_URL y AUTH_SECRET
npm run db:deploy             # aplica las migraciones (esquema, triggers WORM, CHECK)
npm run db:seed               # datos iniciales: proceso en CONVOCADO, nadie activado
npm run dev
```

Todas las cuentas (autoridades incluidas) se **activan** desde la pantalla de inicio con el carnet de identidad, eligiendo una contraseña propia, mientras el proceso está en CONVOCADO.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Migraciones (`prisma migrate deploy`) y compilación de producción |
| `npm run test` | Pruebas del dominio (vitest) |
| `npm run typecheck` | Comprobación de tipos |
| `npm run db:migrate` | Crea una migración nueva en desarrollo |
| `npm run db:deploy` | Aplica las migraciones pendientes |
| `npm run db:seed` | Reinicia la base con los datos iniciales (se niega si hay boletas) |
| `npm run db:reset` | Borra la base, aplica migraciones y siembra (**solo pruebas**) |
| `npm run test:integration` | Tests de la API contra un servidor y una BD de pruebas (CI) |
| `npm run test:e2e` | Jornada completa en el navegador con Playwright (CI) |

Los tests de integración y e2e se ejecutan en **GitHub Actions** en cada push (`.github/workflows/ci.yml`), con un PostgreSQL propio. El informe y las capturas quedan como artefacto `informe-e2e` de cada ejecución.

## Módulo Reglamento

El texto literal de los artículos se extrae del PDF normativo:

```bash
node scripts/extract-regulation.mjs "<ruta>\abc-feu-2019.txt" --part REGLAMENTO
npm run db:seed
```

`prisma/regulation.seed.json` guarda artículo, parte, página y texto literal. **El texto no se reescribe**: proviene del PDF.

## Estructura

```
app/                    Rutas de Next.js (App Router)
src/domain/             Dominio puro y testeable (sin base de datos)
  ├── seats.ts          Derivación de N y reglas de apertura
  ├── ballot.ts         Validación de la boleta
  ├── quorum.ts         Participación y quórum
  ├── tally.ts          Escrutinio, electos, presidente, empate
  └── states.ts         Máquina de estados y permisos por rol
src/server/             Infraestructura (Prisma, auditoría)
prisma/                 Esquema, seed y datos del Reglamento
tests/                  Pruebas unitarias y de propiedad
scripts/                Utilidades (extracción del Reglamento)
docs/migracion-web/     Especificación
Proyecto FEU/           Demo Swing legacy (referencia histórica, no se modifica)
```

## Stack

Next.js 15 · React 19 · PostgreSQL 17 · Prisma · Auth.js · Tailwind CSS 4 · shadcn/ui · Zod · Vitest + fast-check

## Estado

F0 cerrada · F1 en curso. Detalle en `docs/migracion-web/09` §6.
