from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import cloudscraper
import re

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Configure requests session with retry strategy and connection pooling
session = requests.Session()
retry_strategy = Retry(
    total=3,
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=["HEAD", "GET", "OPTIONS", "POST"],
    backoff_factor=1
)
adapter = HTTPAdapter(max_retries=retry_strategy, pool_connections=10, pool_maxsize=20)
session.mount("http://", adapter)
session.mount("https://", adapter)

@app.route('/api/proxy', methods=['POST'])
def proxy():
    try:
        data = request.get_json()
        url = data.get('url')
        method = data.get('method', '').upper()
        headers = data.get('headers', {})
        use_cloudscraper = data.get('cf', False)
        
        if not url: return jsonify({'error': 'URL is required'})
        if method not in ['GET', 'POST']: return jsonify({'error': 'Only GET and POST methods are allowed'})

        # Set default timeout
        timeout = data.get('timeout', 30)
        
        # Choose session based on cf parameter
        if use_cloudscraper:
            scraper = cloudscraper.CloudScraper()
            if method == 'GET': 
                response = scraper.get(url, headers=headers, timeout=timeout, stream=True)
                response.raise_for_status()
                return response.content
            else: 
                form_data = data.get('form_data', {})
                response = scraper.post(url, data=form_data, headers=headers, timeout=timeout, stream=True)
                response.raise_for_status()
                return response.content
        else:
            # Use regular session for connection pooling
            if method == 'GET': 
                response = session.get(url, headers=headers, timeout=timeout, stream=True)
                response.raise_for_status()
                return response.content
            else: 
                form_data = data.get('form_data', {})
                response = session.post(url, data=form_data, headers=headers, timeout=timeout, stream=True)
                response.raise_for_status()
                return response.content
            
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred.'}), 500

@app.route('/api/video-proxy', methods=['GET'])
def video_proxy():
    try:
        url = request.args.get('url')
        referer = request.args.get('referer', '')
        use_cloudscraper = request.args.get('cf', 'false').lower() == 'true'
        enable_cache = request.args.get('cache', 'false').lower() == 'true'
        
        if not url: return

        upstream_headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36', 'Accept': '*/*', 'Connection': 'keep-alive', 'Sec-Fetch-Dest': 'video',}
        if referer: upstream_headers['Referer'] = referer
        range_header = request.headers.get('Range')
        if range_header: upstream_headers['Range'] = range_header
        
        if use_cloudscraper:
            scraper = cloudscraper.CloudScraper()
            response = scraper.get(url, headers=upstream_headers, stream=True, timeout=30)
        else: response = session.get(url, headers=upstream_headers, stream=True, timeout=30)
        
        if not response.ok: return jsonify({'error': f'Upstream server returned {response.status_code}'}), response.status_code
        
        response_headers = {}
        headers_to_copy = ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges', 'Last-Modified', 'ETag', 'Cache-Control']
        
        for header in headers_to_copy:
            if header in response.headers:
                response_headers[header] = response.headers[header]
        
        # Set CORS headers
        response_headers['Access-Control-Allow-Origin'] = '*'
        response_headers['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS'
        response_headers['Access-Control-Allow-Headers'] = 'Range, Content-Type, Authorization'
        response_headers['Access-Control-Expose-Headers'] = 'Content-Length, Content-Range, Accept-Ranges'
        
        if 'Accept-Ranges' not in response_headers: response_headers['Accept-Ranges'] = 'bytes'
        if enable_cache:
            response_headers['Cache-Control'] = 'public, max-age=3600, stale-while-revalidate=86400'
            response_headers['Vary'] = 'Range'
        else: response_headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        
        def generate():
            try:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk: yield chunk
            except Exception as e: return jsonify({'error': e}), 500
            finally: response.close()
        
        status_code = response.status_code if range_header and response.status_code == 206 else 200
        
        return Response(generate(), status=status_code, headers=response_headers, direct_passthrough=True)
    except Exception as e: return jsonify({'error': e}), 500

@app.route('/api/video-proxy', methods=['HEAD'])
def video_proxy_head():
    try:
        url = request.args.get('url')
        referer = request.args.get('referer', '')
        use_cloudscraper = request.args.get('cf', 'false').lower() == 'true'
        
        if not url: return
        
        upstream_headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36', 'Accept': '*/*', 'Accept-Language': 'en-US,en;q=0.9', 'Connection': 'keep-alive'}
        
        if referer: upstream_headers['Referer'] = referer
        
        if use_cloudscraper:
            scraper = cloudscraper.CloudScraper()
            response = scraper.head(url, headers=upstream_headers, timeout=10)
        else: response = session.head(url, headers=upstream_headers, timeout=10)
        
        if not response.ok: return '', response.status_code
        
        response_headers = {}
        headers_to_copy = ['Content-Type', 'Content-Length', 'Accept-Ranges', 'Last-Modified', 'ETag', 'Cache-Control']
        
        for header in headers_to_copy:
            if header in response.headers: response_headers[header] = response.headers[header]
        
        response_headers['Access-Control-Allow-Origin'] = '*'
        response_headers['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS'
        response_headers['Access-Control-Allow-Headers'] = 'Range, Content-Type, Authorization'
        response_headers['Access-Control-Expose-Headers'] = 'Content-Length, Content-Range, Accept-Ranges'
        
        response_headers['Accept-Ranges'] = 'bytes'
        
        return Response('', status=200, headers=response_headers)
        
    except Exception as e:
        return jsonify({'error': e}), 500

@app.route('/api/video-proxy', methods=['OPTIONS'])
def video_proxy_options():
    response_headers = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS', 'Access-Control-Allow-Headers': 'Range, Content-Type, Authorization', 'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges', 'Access-Control-Max-Age': '86400'}
    return Response('', status=200, headers=response_headers)

if __name__ == '__main__':
    app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
    app.run(debug=False, port=5001, host='0.0.0.0', threaded=True)
