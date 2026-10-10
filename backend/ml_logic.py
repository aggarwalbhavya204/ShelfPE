import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
import os
import datetime
from datetime import timedelta

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

def get_product_data(product_id: int):
    # Load historical sales for a specific product
    sales_path = os.path.join(DATA_DIR, "historical_sales.csv")
    if not os.path.exists(sales_path):
        return None
    
    df = pd.read_csv(sales_path)
    df = df[df['product_id'] == product_id].copy()
    if df.empty:
        return None
    
    # Feature engineering
    df['date'] = pd.to_datetime(df['date'])
    df['day_of_week'] = df['date'].dt.dayofweek
    # We can also add lag features or rolling means if needed, but for simplicity:
    return df

def predict_demand(product_id: int, target_date: datetime.date):
    df = get_product_data(product_id)
    if df is None or len(df) < 5:
        # Not enough data for ML, return simple average or 0
        return df['quantity_sold'].mean() if df is not None and not df.empty else 0
    
    # Prepare training data
    # Features: day_of_week
    X = df[['day_of_week']]
    y = df['quantity_sold']
    
    # Use a basic RandomForestRegressor
    model = RandomForestRegressor(n_estimators=50, random_state=42)
    model.fit(X, y)
    
    # Predict for target_date
    target_day_of_week = target_date.weekday()
    prediction = model.predict([[target_day_of_week]])
    
    return max(0, round(prediction[0]))

def generate_reorder_recommendation(product_id: int, current_stock: int, safety_stock: int, pack_size: int, incoming_orders: int = 0):
    # Predict demand for the next 7 days
    today = datetime.date.today() # Note: in real prod, use the current date or provided date. Here we use 2026-10-10 as per prompt logic if we can, but today() will be 2026-10-10 based on environment
    total_predicted_demand = 0
    for i in range(1, 8):
        target_date = today + timedelta(days=i)
        total_predicted_demand += predict_demand(product_id, target_date)
    
    # Calculate needed stock
    needed_stock = total_predicted_demand + safety_stock
    deficit = needed_stock - (current_stock + incoming_orders)
    
    if deficit <= 0:
        return {
            "reorder_needed": False,
            "predicted_7d_demand": total_predicted_demand,
            "recommended_quantity": 0,
            "reason": "Current stock is sufficient to meet predicted demand and safety stock."
        }
    
    # Calculate how many packs to order based on pack_size
    import math
    packs_to_order = math.ceil(deficit / pack_size) if pack_size > 0 else deficit
    reorder_quantity = packs_to_order * pack_size if pack_size > 0 else deficit
    
    return {
        "reorder_needed": True,
        "predicted_7d_demand": total_predicted_demand,
        "recommended_quantity": reorder_quantity,
        "reason": f"Deficit of {deficit} units. Ordering {packs_to_order} packs of size {pack_size}."
    }
