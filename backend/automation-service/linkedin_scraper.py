import sys
import json
import requests
import urllib.parse
import re
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor

def extract_contacts(text):
    """Deep search for email and phone numbers."""
    em_p = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
    ph_p = r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
    emails = list(set(re.findall(em_p, text)))
    phones = list(set(re.findall(ph_p, text)))
    res = [e for e in emails if not e.lower().endswith(('.jpg', '.png'))]
    if phones: res.extend(phones)
    return ", ".join(res) if res else "No contacts listed."

def fetch_nv_detail(a_tag, headers):
    """Worker function for parallel detail scraping with keyword filtering."""
    try:
        url = "https://nvoids.com/" + a_tag['href']
        res = requests.get(url, headers=headers, timeout=5)
        soup = BeautifulSoup(res.text, "html.parser")
        content = soup.find("pre") or soup.find("div", id="job_desc") or soup.find("td", align="left")
        full_text = content.get_text("\n", strip=True) if content else "View original for details."
        
        # 🚫 FILTER: NO F2F / In-Person Interviews
        lower_text = full_text.lower()
        exclude_keywords = ["f2f", "in person interview", "in-person interview", "face to face", "onsite interview", "on-site interview"]
        if any(kw in lower_text for kw in exclude_keywords):
            return None
            
        contacts = extract_contacts(full_text)
        title = a_tag.get_text(strip=True)
        vendor = (soup.find("h3") or soup.find("b")).get_text(strip=True) if (soup.find("h3") or soup.find("b")) else "nvoids Vendor"
        
        # 🚫 FILTER: NO HOTLISTS
        if "hotlist" in title.lower() or "hotlist" in vendor.lower() or "hotlist" in lower_text:
            return None

        return {
            "title": title,
            "company": vendor,
            "location": "Remote / USA",
            "link": url,
            "summary": f"CONTACTS: {contacts}\n\nJD SNIPPET:\n{full_text[:500]}...",
            "source": "nvoids"
        }
    except Exception: return None

def scrape_nvoids_jobs(keyword, limit=10):
    """Turbo Scraper that excludes hotlists and in-person interviews."""
    # Append NOT hotlist to query for better results if not present
    search_query = keyword
    if "-hotlist" not in search_query.lower():
        search_query += " -hotlist"
        
    q = urllib.parse.quote(search_query)
    url = f"https://nvoids.com/search_sph.jsp?q={q}"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    
    try:
        r = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(r.text, "html.parser")
        links = [a for a in soup.find_all("a", href=True) if "job_details.jsp" in a["href"]]
        
        # Parallelize the deep-scrape of detail pages
        with ThreadPoolExecutor(max_workers=5) as executor:
            jobs = list(executor.map(lambda a: fetch_nv_detail(a, headers), links[:limit*2])) # Fetch more initially because of filtering
            
        # Return only the ones that passed filters, up to the limit
        final_jobs = [j for j in jobs if j is not None]
        return final_jobs[:limit]
    except Exception: return []

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps([]))
        sys.exit(0)
    kw = sys.argv[1]
    # Execute filtered Turbo Scrape
    print(json.dumps(scrape_nvoids_jobs(kw, limit=10)))
