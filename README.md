# BigQuery Release Insights

A modern, responsive web application built with Python Flask and vanilla HTML, CSS, and JavaScript. It fetches live BigQuery Release Notes from the official Google Cloud feed, groups them by date, parses daily updates into granular individual cards, and enables users to customize and share them directly on X (Twitter).

---

## Core Features

- **Automated XML Processing**: Fetches the official Google Cloud Atom feed and parses daily release items.
- **Granular Update Parsing**: Uses `BeautifulSoup` to split daily release logs by their subheadings (`<h3>`), presenting features, issues, announcements, and changes as separate interactive cards.
- **Advanced Local Filtering**: Filter updates instantly by category (Features, Issues, Changes, Announcements, Breaking) and perform full-text search.
- **Interactive X (Twitter) Composer**: A customized dark-theme mockup that pre-fills and previews tweet drafts, showing exact character counts according to X link rules (counting all HTTP/HTTPS links as 23 characters).
- **Web Intent Integration**: Share updates directly with a single click without requiring database keys, Twitter APIs, or developer accounts.

---

## Getting Started

### Prerequisites

- Python 3.8 or higher installed on your local machine.

### Installation & Run

Follow these steps to run the application locally:

1. **Navigate to the project directory**:
   ```bash
   cd proyectoPrueba
   ```

2. **Create a virtual environment**:
   ```bash
   python -m venv .venv
   ```

3. **Activate the virtual environment**:
   - **On Windows (PowerShell)**:
     ```powershell
     .venv\Scripts\Activate.ps1
     ```
   - **On macOS / Linux**:
     ```bash
     source .venv/bin/activate
     ```

4. **Install the dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

5. **Start the Flask server**:
   ```bash
   python app.py
   ```

6. **Open in your browser**:
   Navigate to [http://127.0.0.1:5000](http://127.0.0.1:5000) to view the application.

---

## Project Structure

```text
proyectoPrueba/
│
├── app.py                # Flask Backend: In-memory cache, RSS fetching, and BeautifulSoup parser
├── requirements.txt      # Python dependencies (Flask, requests, beautifulsoup4)
├── .gitignore            # Git exclusion config
│
├── templates/
│   └── index.html        # App layout and Twitter composer mockup interface
│
└── static/
    ├── css/
    │   └── styles.css    # Premium CSS design tokens, scrollbars, and keyframe animations
    └── js/
        └── app.js        # Frontend logic: feed API integration, custom filters, X character rules, intent sharing
```

---

## Technical Details

- **Backend Cache**: The feed data is cached in-memory for 15 minutes (900 seconds) to avoid rate-limiting or loading delays from the Google Cloud server.
- **Character Budgeting**: Links are calculated as exactly 23 characters inside the JS tracker using a regex replacement logic mimicking X's automatic link shortening (`t.co`).
