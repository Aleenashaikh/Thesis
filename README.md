# Kidney stone detection (research prototype)

Three parts:

| Folder | What it is | Port |
|---|---|---|
| `inference/` | Python (FastAPI) service that loads your two models and returns boxes + probability | 8000 |
| `server/` | Node + Express + MongoDB. Uploads the image to Cloudinary, calls the model service, stores the case and the urologist's review | 5000 |
| `client/` | React page: choose image, preview, analyze, boxes on the image, tick correct/partly/incorrect, notes | 5173 (dev) |

The models are PyTorch, so a Python service is needed next to the Node server. Node never loads the model itself.

## 1. Model service
```bash
cd inference
python -m venv venv && source venv/bin/activate        # Windows: venv\Scripts\activate
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
# copy the 4 files from deploy.zip into inference/models/  (see PUT_MODEL_FILES_HERE.txt)
uvicorn app:app --port 8000
```
Check http://localhost:8000/health. It shows the classifier and detector names it loaded.

## 2. Node server
```bash
cd server
cp .env.example .env     # fill in MONGO_URI, the three CLOUDINARY_ values, LOGIN_PIN
npm install
npm start
```
MongoDB: a free Atlas cluster works. Cloudinary: copy cloud name, API key and secret from the dashboard.

## 3. React client
```bash
cd client
npm install
npm run dev              # http://localhost:5173 (proxies /api to port 5000)
```
Production: `npm run build` in `client/`. The Node server then serves `client/dist` itself, so one domain serves everything.

## Deploying on your domain
- Run the model service and the Node server on the same machine (a small VPS with 2 to 4 GB RAM is enough; it runs on CPU, expect a few seconds per image).
- Keep port 8000 closed to the internet. Only Node talks to it. Put Node behind HTTPS (Caddy or nginx).
- Set `LOGIN_PIN` (e.g. 7860) and give it only to authorized clinical personnel.

## Things to settle before real use
- Ethics approval and consent for storing images. Cloudinary links made here are public but unguessable; use Cloudinary authenticated delivery if your approval needs stricter control.
- Remove names and metadata from images before upload. Only JPG and PNG are accepted (no DICOM).
- The boxes shown are the detector output at the saved operating threshold. The probability shown is calibrated; the "stone suspected" flag uses the saved threshold on the raw score.
- X-ray specificity is about 0.49 on your test set, so expect false alarms on normal X-rays.
