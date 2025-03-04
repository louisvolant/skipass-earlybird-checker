# SkiPass Earlybird Checker

A Node.js application designed to monitor ski resort websites for specific ski pass deals.

## Overview

This project uses `node-cron` to schedule regular checks on ski resort websites. It submits queries with specific dates to the resorts' search pages and checks the responses for the presence of certain ski pass deals. When a deal is found, it logs a message and can be configured to perform additional actions.

## Features

- **Scheduled Checks**: Uses `node-cron` to run checks at configurable intervals.
- **Customizable Search**: Allows you to specify the resort, date, and search terms.
- **Flexible Action Handling**: Easily extendable to perform actions when deals are found (e.g., sending notifications).
- **Multi-Resort Support**: Can be configured to monitor multiple ski resorts.

## Requirements

- Node.js (version 16 or higher recommended)
- `node-cron`, `axios`, and `cheerio` packages

## Installation

1. Clone this repository:
```
git clone https://github.com/your-username/SkiPassMonitor.git
```

2. Install dependencies:
```npm install```

3. Configure the search parameters in the script for your desired resorts.

## Usage

1. Run the application:
```node index.js```

2. The application will start checking the configured websites at the specified intervals.

## Configuration

Edit the `config.js` file to set up your desired resorts, search terms, and check intervals.

## Contributing

Contributions are welcome! Feel free to submit pull requests or open issues for enhancements or bug fixes.

## License

[MIT License](https://opensource.org/licenses/MIT)