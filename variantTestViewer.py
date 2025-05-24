import json
import os
import sys
import http.server
import socketserver
import webbrowser
from pathlib import Path


def get_source_type(source_id):
    """Return the category of the source (Bitcoin or Science)"""
    if source_id in [
        "6461c2a49eba6c8220bf472d9a504554a0592470f0cdddddb0969e896a1a6ca9i0",
        "b1ff3531357fc4703e14454c8cfc606c79f88f87f908ec0d34a3e7eb02a843adi0",
        "806d80e7cf7f39208eccf59102e0086d6b593dbe3152777ef31dfc869a02340fi0"
    ]:
        return "TOS"
    return "TOB"

def get_image_path_for_source(source_id):
    """Map source ID to an image for testing purposes"""
    # For testing: Map all Bitcoin sources to Bitcoin image, Science sources to Science
    source_type = get_source_type(source_id)
    
    # For testing only - just use one of each type that we know exists
    if source_type == "TOS":
        return "/content/6461c2a49eba6c8220bf472d9a504554a0592470f0cdddddb0969e896a1a6ca9i0.jpg"
    else:
        return "/content/ff08f64a29c957c1f376ca1d35c2ccb5851379da3df9618b8108f55ed65dfb39i0.jpg"
    
    # Production version - uncomment this when all images are available:
    # return f"/content/{source_id}.jpg"


def create_test_html(variation_id, variation_data):
    """Create an HTML file to test a specific variation"""
    source_id = variation_data["sourceId"]
    texture_path = get_image_path_for_source(source_id)
    source_type = get_source_type(source_id)
    
    # Set default wear value if not present in the variation data
    wear_value = variation_data.get("wear", 50)
    
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Variation {variation_id}</title>
  <style>
    body {{ margin: 0; padding: 0; background: #000; }}
    #controls {{
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 10px;
      border-radius: 5px;
      z-index: 1000;
      max-width: 300px;
    }}
    .nav-buttons {{
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 10px;
    }}
    button {{
      padding: 4px 8px;
      background: #444;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      margin: 3px;
    }}
    button:hover {{
      background: #666;
    }}
    .source-type {{
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      margin-left: 5px;
      font-size: 0.8em;
      background: {{"#6b8e23" if source_type == "TOS" else "#4169e1"}};
    }}
    .debug-panel {{
      margin-top: 10px;
      padding: 5px;
      background: rgba(50,50,50,0.5);
      border-radius: 3px;
    }}
  </style>
  
  <!-- Replace the texture in main.js before it loads -->
  <script>
    console.log('Setting up texture override: {texture_path}');
    
    // Store metadata for the getMetadata function to use
    window.getMetadataOverride = {json.dumps(variation_data)};
    console.log('Loaded variation data:', window.getMetadataOverride);
    console.log('Wear from JSON:', window.getMetadataOverride.wear);
    
    // Override the getMetadata function
    window.getMetadata = async function() {{
      console.log('Using variation metadata:', window.getMetadataOverride);
      return window.getMetadataOverride;
    }};
    
    // The most direct approach - monkey patch the texture directly in main.js
    // This creates a getter that will replace the const texture value
    Object.defineProperty(window, 'TEXTURE_PATH_OVERRIDE', {{
      value: '{texture_path}',
      writable: false
    }});
    
    // Simple error handling for missing images
    window.addEventListener('error', function(e) {{
      if (e.target.tagName === 'IMG') {{
        console.error('Image failed to load:', e.target.src);
        // Use a fallback image if available
        e.target.src = '/content/23a6b16fc26b570b1669a9a1efdbab935fe524f2bbcc32504acfc65a1b0fb31bi0.jpg';
      }}
    }}, true);
  </script>
</head>
<body>
  <div id="controls">
    <h3>Variation {variation_id} of 332</h3>
    <div>
      Source: {source_id[:8]}...
      <span class="source-type">{source_type}</span>
    </div>
    <div>
      <small>Parameters:</small>
      <pre style="font-size: 0.8em; max-height: 300px; overflow-y: auto;">{{
        radius: {variation_data["radius"]:.3g},
        cOffset: [{variation_data["cOffset"][0]:.2g}, {variation_data["cOffset"][1]:.2g}],
        mOffset: [{variation_data["mOffset"][0]:.2g}, {variation_data["mOffset"][1]:.2g}],
        yOffset: [{variation_data["yOffset"][0]:.2g}, {variation_data["yOffset"][1]:.2g}],
        kOffset: [{int(variation_data["kOffset"][0])}, {int(variation_data["kOffset"][1])}],
        noiseAmp: {variation_data["noiseAmp"]:.3g},
        inkStatus: {variation_data.get("inkStatus", variation_data.get("colorMode", 0))},
        title: {variation_data["title"]},
        wear: {wear_value:.1f}
      }}</pre>
    </div>
    
    <div class="nav-buttons">
      <!-- Enhanced navigation -->
      <button onclick="window.location.href='/test?id=0'">First</button>
      <button onclick="window.location.href='/test?id={max(0, int(variation_id)-100)}'">-100</button>
      <button onclick="window.location.href='/test?id={max(0, int(variation_id)-10)}'">-10</button>
      <button onclick="window.location.href='/test?id={max(0, int(variation_id)-5)}'">-5</button>
      <button onclick="window.location.href='/test?id={max(0, int(variation_id)-1)}'">Prev</button>
      <button onclick="window.location.href='/test?id={min(332, int(variation_id)+1)}'">Next</button>
      <button onclick="window.location.href='/test?id={min(332, int(variation_id)+5)}'">+5</button>
      <button onclick="window.location.href='/test?id={min(332, int(variation_id)+10)}'">+10</button>
      <button onclick="window.location.href='/test?id={min(332, int(variation_id)+100)}'">+100</button>
      <button onclick="window.location.href='/test?id=332'">Last</button>
      <button onclick="window.location.href='/test?id=' + Math.floor(Math.random() * 333)">Random</button>
    </div>
  </div>
  
  <!-- Include main.js with module type -->
  <script type="module" src="/main.js"></script>
</body>
</html>
"""
    
    test_html_path = Path("test_html")
    test_html_path.mkdir(exist_ok=True)
    
    with open(test_html_path / f"variation_{variation_id}.html", "w") as f:
        f.write(html)
    
    return str(test_html_path / f"variation_{variation_id}.html")



def main():
    PORT = 8000
    
    # Create a small modification to main.js to make it easier to override
    main_js_path = Path("main.js")
    if main_js_path.exists():
        with open(main_js_path, "r") as f:
            main_js_content = f.read()
        
        # Check if we need to modify main.js
        if "window.TEXTURE_PATH_OVERRIDE ||" not in main_js_content:
            modified_content = main_js_content.replace(
                "const texture = window.TEXTURE_PATH_OVERRIDE || '/content/23a6b16fc26b570b1669a9a1efdbab935fe524f2bbcc32504acfc65a1b0fb31bi0.jpg';", 
                "const texture = window.TEXTURE_PATH_OVERRIDE || '/content/23a6b16fc26b570b1669a9a1efdbab935fe524f2bbcc32504acfc65a1b0fb31bi0.jpg';"
            ).replace(
                "const texture = '/content/23a6b16fc26b570b1669a9a1efdbab935fe524f2bbcc32504acfc65a1b0fb31bi0.jpg';", 
                "const texture = window.TEXTURE_PATH_OVERRIDE || '/content/23a6b16fc26b570b1669a9a1efdbab935fe524f2bbcc32504acfc65a1b0fb31bi0.jpg';"
            )
            
            # Create backup of original
            with open(main_js_path.with_suffix(".js.bak"), "w") as f:
                f.write(main_js_content)
                
            # Save modified version
            with open(main_js_path, "w") as f:
                f.write(modified_content)
                
            print("Modified main.js to support texture override (backup saved as main.js.bak)")
    
    # Check which image files actually exist in the content directory
    print("Checking for image files...")
    content_dir = Path("content")
    if content_dir.exists():
        jpg_files = list(content_dir.glob("*.jpg"))
        print(f"Found {len(jpg_files)} jpg files:")
        for jpg in jpg_files:
            print(f"  - {jpg.name}")
    
    with socketserver.TCPServer(("", PORT), TestHandler) as httpd:
        print(f"Serving at http://localhost:{PORT}/test?id=0")
        webbrowser.open(f"http://localhost:{PORT}/test?id=0")
        httpd.serve_forever()


class TestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/test') and not self.path.startswith('/test_html'):
            try:
                variation_id = self.path.split('=')[1]
            except IndexError:
                variation_id = "0"
                
            try:
                with open(f"variations/variation_{variation_id}.json", "r") as f:
                    variation_data = json.load(f)
                
                html_path = create_test_html(variation_id, variation_data)
                
                self.send_response(302)
                self.send_header('Location', f'/test_html/variation_{variation_id}.html')
                self.end_headers()
                return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'text/html')
                self.end_headers()
                self.wfile.write(f"Error: {str(e)}".encode())
                return
        
        return super().do_GET()


if __name__ == "__main__":
    main()