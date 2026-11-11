# Elecciones FEU — Facultad de Ingeniería Informática

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

```bash
# 1. Dependencias
npm install

# 2. Base de datos
docker run -d --name feu-postgres \
  -e POSTGRES_PASSWORD=feu -e POSTGRES_DB=feu -p 5432:5432 postgres:17
cp .env.example .env

# 3. Esquema y datos de ejemplo
npm run db:push
npm run db:seed

# 4. Desarrollo
npm run dev
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm run test` | Pruebas del dominio (vitest) |
| `npm run typecheck` | Comprobación de tipos |
| `npm run lint` | ESLint |
| `npm run db:generate` | Regenera el cliente Prisma |
| `npm run db:push` | Aplica el esquema sin migración |
| `npm run db:migrate` | Crea una migración |
| `npm run db:seed` | Carga datos de ejemplo (11 candidatos → 9 puestos) |
| `npm run db:studio` | Visor de datos |

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
