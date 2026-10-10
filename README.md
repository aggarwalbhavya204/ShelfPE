# ShelfPE Inventory Management System

A production-ready, ML-powered inventory management web application.

## Features
- **Smart Dashboard:** Real-time metrics including total stock, low stock alerts, and waste cost estimation.
- **ML Demand Forecasting:** Uses a Random Forest Regressor to predict upcoming 7-day demand and suggest optimal reorder quantities.
- **FEFO Alerts:** Automatically flags batches approaching expiration so they can be prioritized.
- **Waste & Damage Tracking:** Logs wasted items and calculates financial impact.
- **Modern UI:** Built with React, Tailwind CSS, and Recharts, featuring a premium glassmorphism dark mode design.

## Project Structure
- `/backend` - FastAPI Python server with Scikit-learn ML logic.
- `/frontend` - React/Vite web application.
- `/data` - CSV files serving as the primary data store for this demo.

## Setup Instructions

### 1. Backend Setup
Requires Python 3.9+.

```bash
cd backend
# Create a virtual environment (optional but recommended)
python -m venv venv
venv\Scripts\activate   # On Windows
# source venv/bin/activate # On Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Run the FastAPI server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. 
Interactive API documentation: `http://localhost:8000/docs`.

### 2. Frontend Setup
Requires Node.js 18+.

```bash
cd frontend

# Install dependencies (already installed if using the provided scaffolding)
npm install

# Run the Vite development server
npm run dev
```

The UI will be available at `http://localhost:5173`.

## Architecture Details

- **Level 1 (Rules/Alerts):** Backend routes check `batches.csv` for expiry dates within 3 days and compare current quantities against `min_limit` in `products.csv`.
- **Level 2 (ML Forecasting):** `ml_logic.py` uses `RandomForestRegressor` trained on `historical_sales.csv` using weekday features to predict future daily demand.
- **Level 3 (Reorder Logic):** The backend calculates stock deficits by subtracting current stock from `predicted_7d_demand + safety_stock` and suggests order quantities based on `pack_size`.
