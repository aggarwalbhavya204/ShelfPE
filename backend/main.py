from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os
import datetime
from pydantic import BaseModel, Field
from typing import List, Optional
from ml_logic import predict_demand, generate_reorder_recommendation

app = FastAPI(title="Smart Inventory API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

def load_csv(filename):
    path = os.path.join(DATA_DIR, filename)
    if os.path.exists(path):
        return pd.read_csv(path)
    return pd.DataFrame()

def save_csv(df, filename):
    path = os.path.join(DATA_DIR, filename)
    df.to_csv(path, index=False)

@app.get("/")
def read_root():
    return {"message": "Inventory Management API is running"}

@app.get("/api/dashboard")
def get_dashboard_metrics():
    products_df = load_csv("products.csv")
    batches_df = load_csv("batches.csv")
    waste_df = load_csv("waste_records.csv")
    
    total_products = len(products_df) if not products_df.empty else 0
    total_stock = batches_df['quantity'].sum() if not batches_df.empty else 0
    
    # Check for low stock
    low_stock_alerts = 0
    if not products_df.empty and not batches_df.empty:
        stock_by_product = batches_df.groupby('product_id')['quantity'].sum().reset_index()
        merged = pd.merge(products_df, stock_by_product, left_on='id', right_on='product_id', how='left')
        merged['quantity'] = merged['quantity'].fillna(0)
        low_stock_alerts = len(merged[merged['quantity'] <= merged['min_limit']])
    
    # Check for expiries within 3 days
    expiry_alerts = 0
    today = datetime.datetime.now().date()
    if not batches_df.empty:
        batches_df['exp_date'] = pd.to_datetime(batches_df['exp_date']).dt.date
        three_days_from_now = today + datetime.timedelta(days=3)
        expiring_batches = batches_df[(batches_df['exp_date'] <= three_days_from_now) & (batches_df['quantity'] > 0)]
        expiry_alerts = len(expiring_batches)
        
    # Waste cost calculation
    waste_cost = 0
    if not waste_df.empty and not products_df.empty:
        waste_merged = pd.merge(waste_df, products_df, left_on='product_id', right_on='id')
        waste_cost = (waste_merged['quantity'] * waste_merged['unit_cost']).sum()

    return {
        "total_products": total_products,
        "total_stock": int(total_stock),
        "low_stock_alerts": low_stock_alerts,
        "expiry_alerts": expiry_alerts,
        "estimated_waste_cost": float(waste_cost)
    }

@app.get("/api/products")
def get_products():
    products_df = load_csv("products.csv")
    batches_df = load_csv("batches.csv")
    
    if products_df.empty:
        return []
        
    # Calculate current stock for each product
    if not batches_df.empty:
        stock_by_product = batches_df.groupby('product_id')['quantity'].sum().reset_index()
        products_df = pd.merge(products_df, stock_by_product, left_on='id', right_on='product_id', how='left')
        products_df['quantity'] = products_df['quantity'].fillna(0)
    else:
        products_df['quantity'] = 0
        
    # Determine status
    def get_status(row):
        if row['quantity'] == 0:
            return "Out of Stock"
        elif row['quantity'] <= row['min_limit']:
            return "Low Stock"
        return "In Stock"
        
    products_df['status'] = products_df.apply(get_status, axis=1)
    
    return products_df.fillna("").to_dict(orient="records")

@app.get("/api/products/{product_id}")
def get_product(product_id: int):
    products_df = load_csv("products.csv")
    if products_df.empty or "id" not in products_df.columns:
        raise HTTPException(status_code=404, detail="Product not found")
    product = products_df[products_df['id'] == product_id]
    if product.empty:
        raise HTTPException(status_code=404, detail="Product not found")
    
    batches_df = load_csv("batches.csv")
    product_batches = batches_df[batches_df['product_id'] == product_id]
    
    product_dict = product.iloc[0].to_dict()
    product_dict['batches'] = product_batches.to_dict(orient="records")
    
    # Calculate stock
    current_stock = product_batches['quantity'].sum() if not product_batches.empty else 0
    product_dict['current_stock'] = int(current_stock)
    
    # Reorder Recommendation (ML)
    recommendation = generate_reorder_recommendation(
        product_id=product_id,
        current_stock=current_stock,
        safety_stock=product_dict.get('safety_stock', 0),
        pack_size=product_dict.get('pack_size', 1)
    )
    product_dict['reorder_recommendation'] = recommendation
    
    return product_dict

@app.get("/api/alerts")
def get_alerts():
    alerts = []
    products_df = load_csv("products.csv")
    batches_df = load_csv("batches.csv")
    
    if products_df.empty or batches_df.empty:
        return alerts
        
    today = datetime.datetime.now().date()
    
    # 1. Expiry Alerts (FEFO)
    batches_df['exp_date_obj'] = pd.to_datetime(batches_df['exp_date']).dt.date
    seven_days = today + datetime.timedelta(days=7)
    
    expiring = batches_df[(batches_df['exp_date_obj'] <= seven_days) & (batches_df['quantity'] > 0)].copy()
    expiring = expiring.sort_values(by='exp_date_obj') # FEFO order
    
    for _, batch in expiring.iterrows():
        product = products_df[products_df['id'] == batch['product_id']]
        product_name = product.iloc[0]['name'] if not product.empty else "Unknown"
        
        days_to_expiry = (batch['exp_date_obj'] - today).days
        urgency = "critical" if days_to_expiry <= 0 else "high" if days_to_expiry <= 3 else "medium"
        
        alerts.append({
            "type": "expiry",
            "urgency": urgency,
            "title": f"{product_name} batch expiring",
            "message": f"Batch {batch['batch_number']} (Qty: {batch['quantity']}) expires in {days_to_expiry} days ({batch['exp_date']}). Action needed (FEFO).",
            "product_id": batch['product_id']
        })
        
    # 2. Low Stock Alerts
    stock_by_product = batches_df.groupby('product_id')['quantity'].sum().reset_index()
    merged = pd.merge(products_df, stock_by_product, left_on='id', right_on='product_id', how='left')
    merged['quantity'] = merged['quantity'].fillna(0)
    
    low_stock = merged[merged['quantity'] <= merged['min_limit']]
    for _, product in low_stock.iterrows():
        urgency = "critical" if product['quantity'] == 0 else "high"
        alerts.append({
            "type": "stock",
            "urgency": urgency,
            "title": f"Low stock: {product['name']}",
            "message": f"Current stock ({product['quantity']}) is below minimum limit ({product['min_limit']}).",
            "product_id": product['id']
        })
        
    return sorted(alerts, key=lambda x: 0 if x['urgency'] == 'critical' else 1 if x['urgency'] == 'high' else 2)

@app.get("/api/waste")
def get_waste():
    waste_df = load_csv("waste_records.csv")
    if waste_df.empty:
        return []
    
    products_df = load_csv("products.csv")
    if not products_df.empty:
        waste_df = pd.merge(waste_df, products_df[['id', 'name', 'unit_cost']].rename(columns={'id': 'matched_product_id'}), left_on='product_id', right_on='matched_product_id', how='left')
        waste_df['estimated_loss'] = waste_df['quantity'] * waste_df['unit_cost']
    else:
        waste_df['name'] = 'Unknown'
        waste_df['estimated_loss'] = 0
        
    return waste_df.fillna("").to_dict(orient="records")

class WasteRecord(BaseModel):
    product_id: int
    batch_id: int
    quantity: int = Field(gt=0)
    reason: str = Field(min_length=1)
    date: str

@app.post("/api/waste")
def add_waste(record: WasteRecord):
    waste_df = load_csv("waste_records.csv")
    new_id = 1 if waste_df.empty else int(waste_df['id'].max()) + 1
    
    new_record = {
        'id': new_id,
        'product_id': record.product_id,
        'batch_id': record.batch_id,
        'quantity': record.quantity,
        'reason': record.reason,
        'date': record.date
    }
    
    # Validate the batch before recording waste or changing inventory.
    batches_df = load_csv("batches.csv")
    if batches_df.empty or "id" not in batches_df.columns:
        raise HTTPException(status_code=404, detail="Batch not found")
    batch_idx = batches_df.index[batches_df["id"] == record.batch_id].tolist()
    if not batch_idx:
        raise HTTPException(status_code=404, detail="Batch not found")
    batch_row = batches_df.loc[batch_idx[0]]
    if int(batch_row["product_id"]) != record.product_id:
        raise HTTPException(status_code=400, detail="Batch does not belong to this product")
    if record.quantity > int(batch_row["quantity"]):
        raise HTTPException(status_code=400, detail="Waste quantity exceeds available batch stock")
    batches_df.at[batch_idx[0], "quantity"] = int(batch_row["quantity"]) - record.quantity
    save_csv(batches_df, "batches.csv")
    
    if waste_df.empty:
        waste_df = pd.DataFrame([new_record])
    else:
        waste_df = pd.concat([waste_df, pd.DataFrame([new_record])], ignore_index=True)
        
    save_csv(waste_df, "waste_records.csv")
    return {"message": "Waste recorded successfully", "id": new_id}

class ProductCreate(BaseModel):
    name: str
    category: str
    supplier: str
    unit_cost: float
    min_limit: int
    safety_stock: int
    pack_size: int
    # Optional batch info for initial stock
    batch_quantity: Optional[int] = None
    mfg_date: Optional[str] = None
    exp_date: Optional[str] = None

@app.post("/api/products")
def add_product(product: ProductCreate):
    products_df = load_csv("products.csv")
    new_id = 1 if products_df.empty else int(products_df['id'].max()) + 1

    new_product = {
        'id': new_id,
        'name': product.name,
        'category': product.category,
        'supplier': product.supplier,
        'unit_cost': product.unit_cost,
        'min_limit': product.min_limit,
        'safety_stock': product.safety_stock,
        'pack_size': product.pack_size,
    }

    if products_df.empty:
        products_df = pd.DataFrame([new_product])
    else:
        products_df = pd.concat([products_df, pd.DataFrame([new_product])], ignore_index=True)

    save_csv(products_df, "products.csv")

    # If batch info was provided, create an initial batch
    if product.batch_quantity and product.batch_quantity > 0:
        batches_df = load_csv("batches.csv")
        batch_id = 1 if batches_df.empty else int(batches_df['id'].max()) + 1
        new_batch = {
            'id': batch_id,
            'product_id': new_id,
            'batch_number': f"B-{new_id}{batch_id:03d}",
            'quantity': product.batch_quantity,
            'mfg_date': product.mfg_date or datetime.date.today().isoformat(),
            'exp_date': product.exp_date or (datetime.date.today() + datetime.timedelta(days=30)).isoformat(),
        }
        if batches_df.empty:
            batches_df = pd.DataFrame([new_batch])
        else:
            batches_df = pd.concat([batches_df, pd.DataFrame([new_batch])], ignore_index=True)
        save_csv(batches_df, "batches.csv")

    return {"message": "Product added successfully", "id": new_id}
