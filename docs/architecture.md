# Architecture Overview

## System Layers

### 1. Data Layer

- CSV-based demographic ingestion for Delhi sample data
- Synthetic feature completion for missing fields
- Repository interfaces for future PostgreSQL persistence

### 2. Simulation Layer

- Clustered `CitizenAgent` objects with personas, state, memory, and influence links
- Discrete-time engine running 6-hour ticks by default
- Event queue for scheduled policy injections and shocks
- Monte Carlo-ready simulation service abstraction

### 3. Knowledge Graph Layer

- NetworkX graph storing citizens, regions, scenarios, and events
- Dynamic `influences`, `lives_in`, and `supports_policy` relationships

### 4. Prediction Layer

- Sentiment forecasting with polynomial regression
- Opinion clustering with K-means
- Protest risk heuristic derived from low-sentiment and low-trust populations
- Natural-language insight generation through an LLM adapter

### 5. Delivery Layer

- FastAPI REST endpoints for run control and scenario management
- WebSocket broadcasting for realtime dashboard updates
- Next.js dashboard with charts, heatmap, and simulation controls
