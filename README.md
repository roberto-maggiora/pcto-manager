## PCTO Manager

Backend FastAPI + frontend Next.js per gestione PCTO.

### Quick start

Backend:
```bash
cd backend
python -m venv .venv
. .venv/bin/activate
make install
make migrate
make seed
make dev
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

Apri:
- Frontend: `http://localhost:3000`
- Backend: `http://127.0.0.1:8000`

### Credenziali demo

- Email: `admin@demo.it`
- Password: `admin123!`

### Comandi comuni

Backend:
- `make test`
- `make migrate`
- `make seed`
- `make dev`

Frontend:
- `npm run dev`
- `npm run build`
- `npm run lint`

### Troubleshooting

- **Porta 8000 occupata**: chiudi il processo che usa la porta o avvia su un'altra porta.
- **CORS**: il backend abilita CORS per `http://localhost:3000` e `http://127.0.0.1:3000` in dev.
- **Next.js runtime error / HMR**: chiudi `npm run dev`, elimina `.next` e riavvia.

### Test

```bash
cd backend
make test
```

### Security

- Next.js è fissato a `14.2.35` per evitare breaking changes.
- È presente un advisory high-severity noto che richiede Next 16 (major upgrade).
- L'upgrade verrà valutato quando si passa in produzione.
