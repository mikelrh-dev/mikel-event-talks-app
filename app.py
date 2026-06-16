import os
import re
import urllib.parse
from datetime import datetime
import xml.etree.ElementTree as ET
import requests
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template

app = Flask(__name__)

# Simple in-memory cache
cache = {
    "data": None,
    "last_fetched": None
}

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed():
    try:
        # Fetching release notes
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
        xml_data = response.content
    except Exception as e:
        print(f"Error fetching feed: {e}")
        return None

    try:
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries_data = []
        
        for entry_idx, entry in enumerate(root.findall('atom:entry', ns)):
            title = entry.find('atom:title', ns)
            date_str = title.text.strip() if title is not None else "Unknown Date"
            
            updated = entry.find('atom:updated', ns)
            updated_str = updated.text.strip() if updated is not None else ""
            
            link = entry.find("atom:link[@rel='alternate']", ns)
            href = link.attrib.get('href') if link is not None else ""
            
            content_el = entry.find('atom:content', ns)
            if content_el is None or not content_el.text:
                continue
                
            content_html = content_el.text
            
            # Parse the content to split into individual updates
            soup = BeautifulSoup(content_html, 'html.parser')
            updates = []
            
            current_type = None
            current_html_chunks = []
            
            for element in soup.contents:
                if element.name == 'h3':
                    # Save previous update if it exists
                    if current_type and current_html_chunks:
                        item_html = "".join(str(c) for c in current_html_chunks).strip()
                        item_soup = BeautifulSoup(item_html, 'html.parser')
                        item_text = item_soup.get_text(separator=' ').strip()
                        item_text = re.sub(r'\s+', ' ', item_text)
                        
                        updates.append({
                            'id': f"up-{entry_idx}-{len(updates)}",
                            'type': current_type,
                            'content_html': item_html,
                            'content_text': item_text
                        })
                    current_type = element.get_text().strip()
                    current_html_chunks = []
                elif current_type:
                    current_html_chunks.append(element)
            
            # Save the final update in entry
            if current_type and current_html_chunks:
                item_html = "".join(str(c) for c in current_html_chunks).strip()
                item_soup = BeautifulSoup(item_html, 'html.parser')
                item_text = item_soup.get_text(separator=' ').strip()
                item_text = re.sub(r'\s+', ' ', item_text)
                
                updates.append({
                    'id': f"up-{entry_idx}-{len(updates)}",
                    'type': current_type,
                    'content_html': item_html,
                    'content_text': item_text
                })
                
            # If no h3 was parsed but there is content, wrap everything as General
            if not updates and content_html.strip():
                item_soup = BeautifulSoup(content_html, 'html.parser')
                item_text = item_soup.get_text(separator=' ').strip()
                item_text = re.sub(r'\s+', ' ', item_text)
                updates.append({
                    'id': f"up-{entry_idx}-0",
                    'type': 'General',
                    'content_html': content_html,
                    'content_text': item_text
                })
                
            entries_data.append({
                'date': date_str,
                'updated': updated_str,
                'url': href,
                'updates': updates
            })
            
        return entries_data
    except Exception as e:
        print(f"Error parsing XML: {e}")
        return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    global cache
    # Cache for 15 minutes
    if cache["data"] is not None and cache["last_fetched"] is not None:
        elapsed = (datetime.now() - cache["last_fetched"]).total_seconds()
        if elapsed < 900:  # 15 minutes
            return jsonify({
                "source": "cache",
                "last_fetched": cache["last_fetched"].isoformat(),
                "data": cache["data"]
            })
            
    data = fetch_and_parse_feed()
    if data is None:
        return jsonify({"error": "Failed to fetch or parse release notes."}), 500
        
    cache["data"] = data
    cache["last_fetched"] = datetime.now()
    
    return jsonify({
        "source": "live",
        "last_fetched": cache["last_fetched"].isoformat(),
        "data": data
    })

@app.route('/api/refresh', methods=['POST'])
def force_refresh():
    global cache
    data = fetch_and_parse_feed()
    if data is None:
        return jsonify({"error": "Failed to fetch or parse release notes during refresh."}), 500
        
    cache["data"] = data
    cache["last_fetched"] = datetime.now()
    
    return jsonify({
        "source": "live-refresh",
        "last_fetched": cache["last_fetched"].isoformat(),
        "data": data
    })

if __name__ == '__main__':
    # Flask default running on port 5000
    app.run(debug=True, port=5000)
