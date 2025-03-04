# SkiPass EarlyBird Checker

A web application for monitoring ski resort websites and checking for early bird ski pass deals.

## Project Structure

- `/backend`: Node.js server for scheduling checks and interacting with ski resort websites
- `/frontend`: Next.js application for displaying check results and managing the monitoring process

## Features

- Scheduled checks of ski resort websites
- Customizable search parameters (resort, date, search terms)
- User-friendly web interface to view and manage checks
- Dark mode support
- Pagination and sorting of check results
- Filtering of check results by status (found/not found)

## Requirements

- Node.js (version 16 or higher recommended)
- npm (comes with Node.js)

## Installation

### Backend

1. Navigate to the backend directory:
```
cd backend
```

2. Install dependencies:
```
npm install
```

3. Create a `.env` file in the `/backend` directory with the following content:
```
SUPABASE_URL=https://XXXXXXYYYYYYYYYZZZZZZZZ.supabase.co
SUPABASE_ANON_KEY=XXXXXXYYYYYYYYYZZZZZZZZXXXXXXYYYYYYYYYZZZZZZZZXXXXXXYYYYYYYYYZZZZZZZZXXXXXXYYYYYYYYYZZZZZZZZ
PORT=3001
SESSION_COOKIE_KEY=AAAAABBBBBCCCCCCC

CORS_DEV_FRONTEND_URL_AND_PORT=http://localhost:3000
NODE_ENV=DEV

BASE_SKI_RESORT_URL = 'https://www.example-ski-resort.com';
BASE_SKI_RESORT_URL_SHOP = 'https://www.example-ski-resort.com/products/search';
TARGET_DATE = '2026-03-03';
TARGET_LABEL = 'Ski Passes for 6 Days in Example Ski Resort';

```


### Frontend

1. Navigate to the frontend directory:
```
cd ../frontend
```

2. Install dependencies:
```
npm install
```

## Configuration

- Backend: Edit the configuration in `backend/config.js` to set up your desired resorts, search terms, and check intervals.
- Frontend: Adjust the `BACKEND_URL` in `frontend/src/lib/api.ts` if your backend is not running on the default URL.

## Usage

### Starting the Backend

In the `/backend` directory, run:
```
npm run dev
```

### Starting the Frontend

In the `/frontend` directory, run:
```
npm run dev
```

The frontend will be available at `http://localhost:3000` by default.

## Frontend Features

- View recent checks with details (timestamp, HTTP code, target date, price, status)
- Force an immediate check
- Refresh the check list
- Sort checks by various fields
- Filter checks by status (all, found, not found)
- Paginate through check results
- Toggle between light and dark modes

## Development

Before pushing changes, ensure there are no compilation issues:
```
npm run build
npx --no-warnings tsc --noEmit
```

## License

[MIT License](https://opensource.org/licenses/MIT)