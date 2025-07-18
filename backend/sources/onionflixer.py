import requests, re
import subprocess
import json

# NO LONGER WORKS DUE TO CLOUDFLARE CHECK

def main(content_type, imdb_id=None, tmdb_id=None, season=None, episode=None):
    if content_type == 'movie': url = f"https://onflix.su/{imdb_id}"
    elif content_type == 'tv': url = f"https://onflix.su/{tmdb_id}-{season}-{episode}"
    
    r = requests.get(url, headers={"referer": "https://onionplay.ch/"}).text
    script = re.findall(r"<script>(.*?)</script>", r, flags=re.DOTALL)[0]
    array_matches = re.findall(r'var\s+(\w+)\s*=\s*(\[.*?\]);', script, flags=re.DOTALL)
    subtractfrom = re.findall(r'String\.fromCharCode\(parseInt\(value\) - (\d+)\);', script, flags=re.DOTALL)[0]

    for var_name, array_str in array_matches:
        array_content = array_str.strip('[]')
        if array_content.strip():
            python_list = [item.strip() for item in array_content.split(',')]
            converted_list = [int(item) for item in python_list]

    page = "".join(chr(item - int(subtractfrom)) for item in converted_list)

    new_url = f"https://{re.search(r'\$\("a\.redirect"\)\.attr\("href","https://([^"]+)"\)', page).group(1)}"
    r2 = requests.get(new_url, headers={"referer": "https://onflix.su/"}).text
    juice_match = re.search(r'JuicyCodes\.Run\(([^)]+)\);', r2).group(1)
    print(f"Juicy parameter: {juice_match}")

    decode_script = f"""
    var atob=function(f){{var g={{}},b=65,d=0,a,c=0,h,e='',k=String.fromCharCode,l=f.length;for(a='';91>b;)a+=k(b++);a+=a.toLowerCase()+'0123456789+/';for(b=0;64>b;b++)g[a.charAt(b)]=b;for(a=0;a<l;a++)for(b=g[f.charAt(a)],d=(d<<6)+b,c+=6;8<=c;)((h=d>>>(c-=8)&255)||a<l-2)&&(e+=k(h));return e}};
    var result=atob({juice_match});
    console.log(result);
    """

    result = subprocess.run(['node', '-e', decode_script], capture_output=True, text=True, timeout=10)
    if result.returncode == 0:
        decoded_result = result.stdout.strip()
        eval_content = re.search(r'eval\((.+?)\)$', decoded_result).group(1)
        
        final_script = f"var result={eval_content}; console.log(JSON.stringify(result));"
        final_result_proc = subprocess.run(['node', '-e', final_script], capture_output=True, text=True, timeout=10)
        
        if final_result_proc.returncode == 0:
            final_result = final_result_proc.stdout.strip()
            print(f"Final result: {final_result}")
            
            player_data = json.loads(final_result)
            m3u8_url = re.search(r'file:\[{.*?"file":"([^"]+)".*?}\]', player_data).group(1)
            return m3u8_url
    
    return None
